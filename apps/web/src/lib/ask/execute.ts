import 'server-only';

import {
  AFFILIATION_FIELDS,
  ASK_RAUM_BANDS,
  COMPENSATION_FIELD_NAMES,
  COMPENSATION_METHOD_LABELS,
  INVESTOR_ASK_CONTRACT,
  INVESTOR_ASK_PAGE_SIZE,
  REGION_NAMES,
  V1_SOURCE,
  formatRaum,
  interpretInvestorAskQuery,
  whyThisMatched,
  type CompensationMethodKey,
  type InvestorAskOverrides,
  type InvestorAskSort,
  type InvestorResearchQuery,
  type ParsedInvestorAsk,
} from '@ith/domain';
import { query } from '../db';

export type AskFirmCard = {
  firmId: string;
  slug: string;
  displayName: string;
  legalName: string;
  crd: string;
  firmType: 'ria' | 'era';
  firmTypeLabel: string;
  statusLabel: string;
  principalOffice: string;
  raum: { exact: string; display: string; amount: number } | null;
  compensation: string[];
  filingDate: string | null;
  officialAsOf: string | null;
  href: string | null;
  currentlyIndexable: boolean;
  publicationNote: string | null;
  whyMatched: string;
};

export type AskCountRow = {
  label: string;
  value: number;
  grain: string;
  firmType?: string;
};

export type InvestorAskResult = {
  contract: typeof INVESTOR_ASK_CONTRACT;
  queryText: string;
  parsed: ParsedInvestorAsk;
  resultType: InvestorResearchQuery['mode'];
  results: AskFirmCard[];
  counts: AskCountRow[];
  pagination: { page: number; pageSize: number; total: number; hasMore: boolean };
  provenance: {
    sourceFamily: string;
    dataset: string;
    officialAsOf: string;
    retrievedAt: string;
    geographyMeaning: string;
    metric: string;
    raumUnits: string;
    compensationTaxonomy: string;
    exclusions: string[];
    identifierMethod: string;
  };
  limitations: string[];
  elapsedMs: number;
};

const LIMITATIONS = [
  'Ask does not invent firm facts. Results come from the current SEC/IARD extract.',
  'RIA is not ERA. Counts stay in their class.',
  'Principal office is not client geography.',
  'RAUM is Item 5F(2)(c), not performance.',
  'Item 5.E methods are not fee amounts.',
  'Missing disclosure is not a clean history.',
  'Public firm reports are a publication gate (Wave-1), not a ranking.',
];

function provenance(parsed: ParsedInvestorAsk, metric: string): InvestorAskResult['provenance'] {
  const q = parsed.query;
  return {
    sourceFamily: 'SEC / IARD Form ADV',
    dataset: V1_SOURCE.dataset,
    officialAsOf: V1_SOURCE.publishedAt,
    retrievedAt: V1_SOURCE.retrievedAt,
    geographyMeaning: q.geography?.meaning ?? 'Not geography-filtered',
    metric,
    raumUnits: 'USD as reported on Form ADV Item 5F(2)(c)',
    compensationTaxonomy: 'Form ADV Item 5.E(1)–5.E(7) Y/N methods',
    exclusions: [
      'Do not add RIA + ERA into one adviser quality total.',
      'Do not treat principal office as service territory.',
      '2,155 canonical firms without ADV facts are outside the roster universe.',
    ],
    identifierMethod: q.identifier ? `Labeled CRD ${q.identifier.value}` : 'Not an identifier query',
  };
}

type FirmRow = {
  id: string;
  slug: string;
  display_name: string;
  legal_name: string;
  crd: string;
  dataset_kind: 'ria' | 'era';
  registration_status: string | null;
  source_status_text: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  raum_amount: string | number | null;
  latest_adv_filing_date: Date | string | null;
  retrieved_at: Date | string | null;
  indexable: boolean | null;
};

function officeLabel(row: Pick<FirmRow, 'city' | 'region' | 'postal_code'>): string {
  const parts = [row.city, row.region, row.postal_code].filter(Boolean);
  return parts.length ? parts.join(', ') : 'Principal office not resolved in this extract';
}

function typeLabel(kind: 'ria' | 'era', status: string | null): string {
  if (kind === 'era') return 'Exempt reporting adviser (ERA)';
  if (status === 'pending') return 'RIA — pending / 120-day';
  return 'Registered investment adviser (RIA)';
}

function isoDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value);
  return text.slice(0, 10);
}

function orderSql(sort: InvestorAskSort | undefined): string {
  switch (sort) {
    case 'raum_desc':
      return 'adv.raum_amount DESC NULLS LAST, crd.identifier_value ASC';
    case 'raum_asc':
      return 'adv.raum_amount ASC NULLS LAST, crd.identifier_value ASC';
    case 'filing_date':
      return 'adv.latest_adv_filing_date DESC NULLS LAST, crd.identifier_value ASC';
    case 'crd':
      return 'crd.identifier_value ASC';
    default:
      return 'f.display_name ASC, crd.identifier_value ASC';
  }
}

function filtersSql(q: InvestorResearchQuery, params: unknown[]): { where: string } {
  const clauses = ['f.is_synthetic = false'];
  if (q.firmType === 'ria') clauses.push(`adv.dataset_kind = 'ria'`);
  if (q.firmType === 'era') clauses.push(`adv.dataset_kind = 'era'`);
  if (q.status === 'registered') {
    clauses.push(`adv.dataset_kind = 'ria'`);
    clauses.push(`r.status = 'registered'`);
  }
  if (q.geography?.type === 'principal_office_state') {
    params.push(q.geography.value);
    clauses.push(`b.region = $${params.length}`);
  }
  if (q.geography?.type === 'principal_office_city') {
    params.push(q.geography.value);
    clauses.push(`lower(b.city) = lower($${params.length})`);
  }
  if (q.geography?.type === 'zip') {
    params.push(q.geography.value);
    clauses.push(`left(replace(coalesce(b.postal_code, ''), ' ', ''), 5) = $${params.length}`);
  }
  if (q.identifier?.type === 'crd') {
    params.push(q.identifier.value);
    clauses.push(`crd.identifier_value = $${params.length}`);
  }
  if (q.nameQuery) {
    params.push(`%${q.nameQuery.replace(/[%_]/g, '\\$&')}%`);
    clauses.push(`(f.display_name ILIKE $${params.length} OR f.legal_name ILIKE $${params.length})`);
  }
  if (q.raum?.equalsZero) {
    clauses.push(`adv.raum_amount = 0`);
  } else if (q.raum) {
    if (q.raum.min != null) {
      params.push(q.raum.min);
      clauses.push(`adv.raum_amount >= $${params.length}`);
    }
    if (q.raum.maxExclusive != null) {
      params.push(q.raum.maxExclusive);
      clauses.push(`adv.raum_amount < $${params.length}`);
    }
    clauses.push(`adv.dataset_kind = 'ria'`);
  }
  const methods = q.compensationMethods ?? [];
  const match = q.compensationMatch === 'all' ? 'AND' : 'OR';
  if (methods.length) {
    const exists = methods.map((key) => {
      params.push(COMPENSATION_FIELD_NAMES[key]);
      return `EXISTS (
        SELECT 1 FROM form_adv_reported_attributes a
        WHERE a.firm_id = f.id
          AND a.field_name = $${params.length}
          AND a.presence_status = 'REPORTED_YES'
          AND a.is_current = true
      )`;
    });
    clauses.push(`(${exists.join(` ${match} `)})`);
    clauses.push(`adv.dataset_kind = 'ria'`);
  }
  if (q.affiliationField) {
    params.push(AFFILIATION_FIELDS[q.affiliationField].field);
    clauses.push(`EXISTS (
      SELECT 1 FROM form_adv_reported_attributes a
      WHERE a.firm_id = f.id
        AND a.field_name = $${params.length}
        AND a.presence_status = 'REPORTED_YES'
        AND a.is_current = true
    )`);
  }
  return { where: clauses.join('\n      AND ') };
}

const FROM_SQL = `
  FROM form_adv_firm_facts adv
  JOIN firms f ON f.id = adv.firm_id
  JOIN firm_identifiers crd ON crd.firm_id = f.id AND crd.identifier_type = 'crd'
  LEFT JOIN registrations r ON r.firm_id = f.id AND r.subject_kind = 'firm'
  LEFT JOIN branches b ON b.firm_id = f.id AND b.is_main_office
  LEFT JOIN search_documents sd ON sd.entity_id = f.id AND sd.entity_kind = 'firm'
  LEFT JOIN source_releases rel ON rel.id = adv.source_release_id
`;

const SELECT_SQL = `
  SELECT
    f.id,
    f.slug,
    f.display_name,
    f.legal_name,
    crd.identifier_value AS crd,
    adv.dataset_kind,
    r.status AS registration_status,
    r.source_status_text,
    b.city,
    b.region,
    b.postal_code,
    adv.raum_amount,
    adv.latest_adv_filing_date,
    rel.retrieved_at,
    sd.indexable
`;

async function loadCompensation(firmIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (!firmIds.length) return map;
  const result = await query<{ firm_id: string; field_name: string }>(
    `
    SELECT firm_id, field_name
    FROM form_adv_reported_attributes
    WHERE firm_id = ANY($1::uuid[])
      AND field_name = ANY($2::text[])
      AND presence_status = 'REPORTED_YES'
      AND is_current = true
    `,
    [firmIds, Object.values(COMPENSATION_FIELD_NAMES)],
  );
  const reverse = Object.fromEntries(
    (Object.entries(COMPENSATION_FIELD_NAMES) as Array<[CompensationMethodKey, string]>).map(([k, v]) => [v, k]),
  );
  for (const row of result.rows) {
    const key = reverse[row.field_name] as CompensationMethodKey | undefined;
    const label = (key ? COMPENSATION_METHOD_LABELS[key] : undefined) ?? row.field_name;
    const list = map.get(row.firm_id) ?? [];
    list.push(label);
    map.set(row.firm_id, list);
  }
  return map;
}

function toCard(row: FirmRow, parsed: ParsedInvestorAsk, compensation: string[]): AskFirmCard {
  const kind = row.dataset_kind === 'era' ? 'era' : 'ria';
  const raum = formatRaum(row.raum_amount);
  const indexable = row.indexable === true;
  return {
    firmId: row.id,
    slug: row.slug,
    displayName: row.display_name,
    legalName: row.legal_name,
    crd: row.crd,
    firmType: kind,
    firmTypeLabel: typeLabel(kind, row.registration_status),
    statusLabel: row.source_status_text || row.registration_status || kind.toUpperCase(),
    principalOffice: officeLabel(row),
    raum: raum ? { exact: raum.exact, display: raum.display, amount: raum.amount } : null,
    compensation,
    filingDate: isoDate(row.latest_adv_filing_date),
    officialAsOf: isoDate(row.retrieved_at) ?? V1_SOURCE.retrievedAt,
    href: indexable ? `/firm/${row.slug}` : null,
    currentlyIndexable: indexable,
    publicationNote: indexable
      ? null
      : 'Research identity — public firm report not currently published.',
    whyMatched: whyThisMatched({
      firmType: parsed.query.firmType === 'all' ? kind : parsed.query.firmType,
      geography: parsed.query.geography,
      raum: parsed.query.raum,
      compensationMethods: parsed.query.compensationMethods,
      identifier: parsed.query.identifier,
      nameQuery: parsed.query.nameQuery,
      affiliationField: parsed.query.affiliationField,
    }),
  };
}

async function listFirms(parsed: ParsedInvestorAsk): Promise<{ rows: FirmRow[]; total: number }> {
  const params: unknown[] = [];
  const { where } = filtersSql(parsed.query, params);
  const page = parsed.query.page;
  const offset = (page - 1) * INVESTOR_ASK_PAGE_SIZE;
  const count = await query<{ n: number }>(
    `SELECT count(*)::int AS n ${FROM_SQL} WHERE ${where}`,
    params,
  );
  const listParams = [...params, INVESTOR_ASK_PAGE_SIZE, offset];
  const list = await query<FirmRow>(
    `${SELECT_SQL} ${FROM_SQL}
     WHERE ${where}
     ORDER BY ${orderSql(parsed.query.sort)}
     LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
    listParams,
  );
  return { rows: list.rows, total: count.rows[0]?.n ?? 0 };
}

async function countRoster(parsed: ParsedInvestorAsk): Promise<AskCountRow[]> {
  const q = parsed.query;
  if (q.aggregateMetric === 'observation_count') {
    const result = await query<{ n: number }>(`SELECT count(*)::int AS n FROM form_adv_reported_attributes`);
    return [
      {
        label: 'Normalized Form ADV observations',
        value: result.rows[0]?.n ?? 0,
        grain: 'form_adv_reported_attributes rows — not firms',
      },
    ];
  }
  if (q.compensationMethods?.length || q.raum || q.affiliationField) {
    const params: unknown[] = [];
    const filtered = { ...parsed.query, firmType: parsed.query.firmType ?? 'ria' };
    const { where } = filtersSql(filtered, params);
    const result = await query<{ n: number }>(`SELECT count(*)::int AS n ${FROM_SQL} WHERE ${where}`, params);
    return [
      {
        label: 'Matching firm facts',
        value: result.rows[0]?.n ?? 0,
        grain: 'form_adv_firm_facts rows matching structured filters',
        firmType: filtered.firmType,
      },
    ];
  }
  const types: Array<'ria' | 'era'> =
    q.firmType === 'ria' ? ['ria'] : q.firmType === 'era' ? ['era'] : ['ria', 'era'];
  const rows: AskCountRow[] = [];
  for (const kind of types) {
    const params: unknown[] = [kind];
    const extra: string[] = ['adv.dataset_kind = $1', 'f.is_synthetic = false'];
    if (q.geography?.type === 'principal_office_state') {
      params.push(q.geography.value);
      extra.push(`b.region = $${params.length}`);
    }
    const result = await query<{ n: number }>(
      `SELECT count(*)::int AS n
       ${FROM_SQL}
       WHERE ${extra.join(' AND ')}`,
      params,
    );
    rows.push({
      label: kind === 'ria' ? 'RIA firm facts' : 'ERA firm facts',
      value: result.rows[0]?.n ?? 0,
      grain: 'form_adv_firm_facts (one current roster row per CRD)',
      firmType: kind,
    });
  }
  return rows;
}

async function aggregate(parsed: ParsedInvestorAsk): Promise<AskCountRow[]> {
  const q = parsed.query;
  if (q.aggregateMetric === 'raum_bands') {
    const params: unknown[] = [];
    const extra = [`adv.dataset_kind = 'ria'`, 'f.is_synthetic = false'];
    if (q.geography?.type === 'principal_office_state') {
      params.push(q.geography.value);
      extra.push(`b.region = $${params.length}`);
    }
    const result = await query<{ band: string; n: number }>(
      `SELECT
         CASE
           WHEN adv.raum_amount = 0 THEN 'zero'
           WHEN adv.raum_amount > 0 AND adv.raum_amount < 25000000 THEN 'under25m'
           WHEN adv.raum_amount >= 25000000 AND adv.raum_amount < 100000000 THEN 'from25mTo100m'
           WHEN adv.raum_amount >= 100000000 AND adv.raum_amount < 1000000000 THEN 'from100mTo1b'
           WHEN adv.raum_amount >= 1000000000 AND adv.raum_amount < 10000000000 THEN 'from1bTo10b'
           WHEN adv.raum_amount >= 10000000000 THEN 'atLeast10b'
           ELSE 'null'
         END AS band,
         count(*)::int AS n
       ${FROM_SQL}
       WHERE ${extra.join(' AND ')}
       GROUP BY 1`,
      params,
    );
    return ASK_RAUM_BANDS.map((band) => ({
      label: band.label,
      value: result.rows.find((r) => r.band === band.id)?.n ?? 0,
      grain: 'RIA firm facts (Item 5F(2)(c))',
      firmType: 'ria',
    }));
  }
  if (q.aggregateMetric === 'compensation_methods') {
    const result = await query<{ field_name: string; n: number }>(
      `SELECT field_name, count(*)::int AS n
       FROM form_adv_reported_attributes
       WHERE field_name = ANY($1::text[])
         AND presence_status = 'REPORTED_YES'
         AND is_current = true
       GROUP BY field_name`,
      [Object.values(COMPENSATION_FIELD_NAMES)],
    );
    return (Object.entries(COMPENSATION_FIELD_NAMES) as Array<[CompensationMethodKey, string]>).map(([key, field]) => ({
      label: `${field} · ${COMPENSATION_METHOD_LABELS[key]}`,
      value: result.rows.find((r) => r.field_name === field)?.n ?? 0,
      grain: 'Independent Item 5.E YES counts among RIA filers (methods overlap; not a fee amount)',
      firmType: 'ria',
    }));
  }
  if (q.aggregateMetric === 'principal_office_state') {
    const kind = q.firmType === 'era' ? 'era' : 'ria';
    const result = await query<{ region: string; n: number }>(
      `SELECT coalesce(nullif(btrim(b.region), ''), '_none') AS region, count(*)::int AS n
       ${FROM_SQL}
       WHERE f.is_synthetic = false AND adv.dataset_kind = $1
       GROUP BY 1
       ORDER BY n DESC, region ASC
       LIMIT 60`,
      [kind],
    );
    return result.rows.map((r) => ({
      label: r.region === '_none' ? 'Unresolved principal-office region' : `${r.region} · ${REGION_NAMES[r.region] ?? r.region}`,
      value: r.n,
      grain: `${kind.toUpperCase()} firm facts by principal-office region`,
      firmType: kind,
    }));
  }
  return countRoster(parsed);
}

async function compare(parsed: ParsedInvestorAsk): Promise<AskCountRow[]> {
  const a = parsed.query.geography?.value;
  const b = parsed.query.compareGeography?.value;
  if (!a || !b) return [];
  const left = { ...parsed, query: { ...parsed.query, geography: parsed.query.geography, compareGeography: undefined } };
  const rightGeo = parsed.query.compareGeography
    ? { ...parsed.query.geography!, value: b, meaning: parsed.query.compareGeography.meaning }
    : undefined;
  const right = { ...parsed, query: { ...parsed.query, geography: rightGeo, compareGeography: undefined } };
  if (parsed.query.aggregateMetric === 'raum_bands') {
    const [la, lb] = await Promise.all([aggregate(left), aggregate(right)]);
    return [
      ...la.map((row) => ({ ...row, label: `${a} · ${row.label}` })),
      ...lb.map((row) => ({ ...row, label: `${b} · ${row.label}` })),
    ];
  }
  const [ca, cb] = await Promise.all([countRoster(left), countRoster(right)]);
  return [
    ...ca.map((row) => ({ ...row, label: `${a} · ${row.label}` })),
    ...cb.map((row) => ({ ...row, label: `${b} · ${row.label}` })),
  ];
}

export async function executeInvestorAsk(raw: string, overrides: InvestorAskOverrides = {}): Promise<InvestorAskResult> {
  const started = Date.now();
  const parsed = interpretInvestorAskQuery(raw, overrides);
  const q = parsed.query;
  const emptyCards: AskFirmCard[] = [];
  const pagination = { page: q.page, pageSize: INVESTOR_ASK_PAGE_SIZE, total: 0, hasMore: false };

  if (q.mode === 'fail_closed' || q.mode === 'definition') {
    return {
      contract: INVESTOR_ASK_CONTRACT,
      queryText: parsed.raw,
      parsed,
      resultType: q.mode,
      results: emptyCards,
      counts: [],
      pagination,
      provenance: provenance(parsed, q.mode),
      limitations: LIMITATIONS,
      elapsedMs: Date.now() - started,
    };
  }

  if (q.mode === 'count') {
    const counts = await countRoster(parsed);
    return {
      contract: INVESTOR_ASK_CONTRACT,
      queryText: parsed.raw,
      parsed,
      resultType: 'count',
      results: emptyCards,
      counts,
      pagination: { ...pagination, total: counts.reduce((s, r) => s + r.value, 0) },
      provenance: provenance(parsed, 'firm count'),
      limitations: LIMITATIONS,
      elapsedMs: Date.now() - started,
    };
  }

  if (q.mode === 'aggregate') {
    const counts = await aggregate(parsed);
    return {
      contract: INVESTOR_ASK_CONTRACT,
      queryText: parsed.raw,
      parsed,
      resultType: 'aggregate',
      results: emptyCards,
      counts,
      pagination,
      provenance: provenance(parsed, q.aggregateMetric ?? 'aggregate'),
      limitations: LIMITATIONS,
      elapsedMs: Date.now() - started,
    };
  }

  if (q.mode === 'comparison') {
    const counts = await compare(parsed);
    return {
      contract: INVESTOR_ASK_CONTRACT,
      queryText: parsed.raw,
      parsed,
      resultType: 'comparison',
      results: emptyCards,
      counts,
      pagination,
      provenance: provenance(parsed, 'same-class principal-office comparison'),
      limitations: LIMITATIONS,
      elapsedMs: Date.now() - started,
    };
  }

  const { rows, total } = await listFirms(parsed);
  const compensation = await loadCompensation(rows.map((r) => r.id));
  const results = rows.map((row) => toCard(row, parsed, compensation.get(row.id) ?? []));
  return {
    contract: INVESTOR_ASK_CONTRACT,
    queryText: parsed.raw,
    parsed,
    resultType: q.mode,
    results,
    counts: [{ label: 'Matching firm facts', value: total, grain: 'form_adv_firm_facts rows matching filters' }],
    pagination: {
      page: q.page,
      pageSize: INVESTOR_ASK_PAGE_SIZE,
      total,
      hasMore: q.page * INVESTOR_ASK_PAGE_SIZE < total,
    },
    provenance: provenance(parsed, q.mode === 'identifier' ? 'CRD identity' : 'entity list'),
    limitations: LIMITATIONS,
    elapsedMs: Date.now() - started,
  };
}

export function publicAskPayload(result: InvestorAskResult) {
  return {
    contract: result.contract,
    interpretation: result.parsed.interpretation,
    query: {
      mode: result.parsed.query.mode,
      firmType: result.parsed.query.firmType,
      geography: result.parsed.query.geography,
      identifier: result.parsed.query.identifier,
      raum: result.parsed.query.raum,
      compensationMethods: result.parsed.query.compensationMethods,
      sort: result.parsed.query.sort,
      page: result.parsed.query.page,
      failReason: result.parsed.query.failReason,
      alternatives: result.parsed.query.alternatives,
      definitionId: result.parsed.query.definitionId,
    },
    resultType: result.resultType,
    results: result.results.map((row) => ({
      crd: row.crd,
      firmName: row.displayName,
      firmType: row.firmType,
      principalOffice: row.principalOffice,
      raum: row.raum?.display ?? null,
      compensationMethods: row.compensation,
      filingDate: row.filingDate,
      href: row.href,
      publicationNote: row.publicationNote,
      whyMatched: row.whyMatched,
    })),
    counts: result.counts,
    pagination: result.pagination,
    provenance: result.provenance,
    limitations: result.limitations,
    elapsedMs: result.elapsedMs,
  };
}
