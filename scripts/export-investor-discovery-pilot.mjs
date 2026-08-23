/**
 * ASK-SEARCH-INVESTOR-001 — read-only discovery pilot export.
 *
 * Primary: DATABASE_URL (official firms + search_documents.indexable)
 * Fallback: production Wave 1 sitemap + published firm pages on
 *           https://www.investortrusthub.com (already-ingested public research)
 *
 * No Google Places / LLM / geocoding / Ask runtime.
 *
 *   node scripts/export-investor-discovery-pilot.mjs
 */

import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ORIGIN = 'https://www.investortrusthub.com';
const PILOT_TARGET = 200;
const SCHEMA = 'ask-network-discovery-v1';
const BANNER = 'PILOT / NOT YET CONSUMED BY ASK PRODUCTION';

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    if (process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

loadEnvFile(resolve(ROOT, '.env.local'));
loadEnvFile(resolve(ROOT, '.env'));
loadEnvFile(resolve(ROOT, 'apps/web/.env.local'));

function get(url) {
  return new Promise((resolvePromise, reject) => {
    https
      .get(url, { headers: { 'user-agent': 'InvestorTrustHub-discovery-pilot/1.0' } }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          get(res.headers.location).then(resolvePromise, reject);
          return;
        }
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => resolvePromise({ status: res.statusCode || 0, body: d }));
      })
      .on('error', reject);
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function firmSlugForCrd(crd) {
  return `sec-crd-${String(crd).replace(/\D/g, '')}`;
}

function networkId(crd) {
  return `investor:crd-${String(crd).replace(/\D/g, '')}`;
}

function profileUrl(crd) {
  return `${ORIGIN}/firm/${firmSlugForCrd(crd)}`;
}

function stripTags(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseConsumerClass(text) {
  // Prefer the earliest consumer headline — page explainers also mention ERA/RIA later.
  const patterns = [
    { re: /Reported as registered/i, cls: 'reported_as_registered' },
    { re: /Pending\s*\/\s*120-Day Approval/i, cls: 'pending_120_day' },
    { re: /Exempt Reporting Adviser/i, cls: 'exempt_reporting_adviser' },
  ];
  let best = null;
  for (const p of patterns) {
    const idx = text.search(p.re);
    if (idx < 0) continue;
    if (!best || idx < best.idx) best = { idx, cls: p.cls };
  }
  return best?.cls || null;
}

const US_STATES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DC','DE','FL','GA','HI','IA','ID','IL','IN','KS','KY','LA','MA','MD','ME','MI','MN','MO','MS','MT','NC','ND','NE','NH','NJ','NM','NV','NY','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VA','VT','WA','WI','WV','WY',
]);

function parsePrincipalOffice(text) {
  const block =
    text.match(/Principal office\s+(.+?)(?:Current as of|Retrieved|Source effective)/i)?.[1]?.trim() ||
    '';
  if (!block || /state not provided/i.test(block)) {
    return { city: null, state: null, zip: null };
  }
  // CITY, ST, ZIP at end of principal-office line
  const m = block.match(/,\s*([A-Z]{2}),\s*(\d{5})(?:-\d{4})?\s*$/);
  if (!m) return { city: null, state: null, zip: null };
  const state = m[1].toUpperCase();
  if (!US_STATES.has(state)) return { city: null, state: null, zip: null };
  const zip = m[2];
  const before = block.slice(0, m.index).trim();
  let city = extractCityFromAddress(before);
  return { city: city || null, state, zip };
}

const STREET_TOKENS = new Set(
  'BLVD,BOULEVARD,AVE,AVENUE,STREET,ST,ROAD,RD,DRIVE,DR,LANE,LN,WAY,COURT,CT,SQUARE,SQ,TRAIL,TRL,HWY,HIGHWAY,PKWY,PARKWAY,PLACE,PL,CIRCLE,CIR,BROADWAY,NORTH,SOUTH,EAST,WEST,NW,NE,SW,SE,FLOOR,FL,SUITE,STE,BUILDING,BLDG'
    .split(',')
);

function extractCityFromAddress(before) {
  let seg = before.includes(',') ? before.split(',').pop().trim() : before.trim();
  seg = seg
    .replace(/\b\d{1,4}(?:ST|ND|RD|TH)?\s+FLOOR\b/gi, ' ')
    .replace(/\bFLOOR\s+\d+\b/gi, ' ')
    .replace(/\b(?:SUITE|STE\.?)\s+\S+\b/gi, ' ')
    .replace(/#\S+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = seg.split(/\s+/).filter(Boolean);
  const cityWords = [];
  for (let i = words.length - 1; i >= 0 && cityWords.length < 3; i--) {
    const w = words[i].replace(/[.,]/g, '');
    if (!w || /^\d/.test(w)) break;
    if (STREET_TOKENS.has(w.toUpperCase())) break;
    cityWords.unshift(w);
  }
  // Prefer multi-word known patterns when truncated
  const joined = cityWords.join(' ').trim();
  if (/^(YORK|ANTONIO|ANGELES|DIEGO|JOSE|FRANCISCO|PASO|WORTH)$/i.test(joined)) {
    // incomplete — try previous token from seg
    const idx = words.findIndex((w) => w.replace(/[.,]/g, '').toUpperCase() === joined.toUpperCase());
    if (idx > 0) {
      const prev = words[idx - 1].replace(/[.,]/g, '');
      if (prev && !STREET_TOKENS.has(prev.toUpperCase()) && !/^\d/.test(prev)) {
        return `${prev} ${joined}`.trim();
      }
    }
  }
  return joined;
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function parseDisplayName(html, crd) {
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1] || '';
  const cleaned = decodeEntities(title)
    .replace(/\s*[—–|-].*InvestorTrustHub.*/i, '')
    .replace(/\s*[—–].*SEC\/IARD.*/i, '')
    .replace(/\s*-\s*SEC\/IARD.*/i, '')
    .trim();
  if (cleaned && !/^firm not found/i.test(cleaned)) return cleaned;
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) {
    const t = decodeEntities(stripTags(h1[1]));
    if (t) return t;
  }
  return `CRD ${crd}`;
}

function mapEntity(row) {
  const crd = String(row.crd).replace(/\D/g, '');
  const entity_type = row.consumerClass === 'exempt_reporting_adviser' ? 'era' : 'ria';
  const categories = new Set(['advisory_firm', 'investment_adviser', entity_type]);
  if (row.consumerClass === 'pending_120_day') categories.add('pending');
  if (row.consumerClass === 'reported_as_registered') categories.add('registered');
  const summary =
    row.consumerClass === 'exempt_reporting_adviser'
      ? 'Exempt reporting adviser'
      : row.consumerClass === 'pending_120_day'
        ? 'SEC-registered investment adviser (pending / 120-day)'
        : 'SEC-registered investment adviser';
  const search_terms = [
    row.displayName,
    row.legalName,
    entity_type,
    ...categories,
    row.city,
    row.state,
    `crd ${crd}`,
  ]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase());
  return {
    network_entity_id: networkId(crd),
    hub: 'investor',
    source_entity_id: `crd-${crd}`,
    entity_type,
    display_name: row.displayName,
    legal_name: row.legalName || undefined,
    city: row.city || undefined,
    state: row.state || undefined,
    zip: row.zip || undefined,
    categories: [...categories].sort(),
    regulatory_status_summary: summary,
    trust_report_available: true,
    canonical_profile_url: profileUrl(crd),
    canonical_search_url: row.state
      ? `${ORIGIN}/firms?state=${encodeURIComponent(row.state)}`
      : `${ORIGIN}/firms`,
    search_terms: [...new Set(search_terms)],
    discovery_status: 'eligible',
    source_version: row.sourceVersion,
    updated_at: row.updatedAt,
    physical_location: {
      city: row.city || null,
      state: row.state || null,
      postal_code: row.zip || null,
      country: row.state ? 'US' : null,
    },
    consumer_class: row.consumerClass,
  };
}

function fingerprint(entities) {
  const normalized = entities.map((e) => {
    const { updated_at: _u, ...rest } = e;
    return rest;
  });
  return createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

async function loadWave1CrdsFromSitemap() {
  const { status, body } = await get(`${ORIGIN}/sitemap.xml`);
  if (status !== 200) throw new Error(`sitemap HTTP ${status}`);
  const crds = [...body.matchAll(/\/firm\/sec-crd-(\d+)/g)].map((m) => m[1]);
  return [...new Set(crds)].sort((a, b) => Number(a) - Number(b));
}

async function fetchFirmRow(crd, sourceVersion, updatedAt) {
  const url = profileUrl(crd);
  const { status, body } = await get(url);
  if (status !== 200) return { ok: false, reason: `http_${status}`, crd };
  const text = stripTags(body);
  const consumerClass = parseConsumerClass(text);
  if (!consumerClass) return { ok: false, reason: 'missing_classification', crd };
  const office = parsePrincipalOffice(text);
  if (!office.state || !/^[A-Z]{2}$/.test(office.state)) {
    return { ok: false, reason: 'missing_usable_us_state', crd };
  }
  const displayName = parseDisplayName(body, crd);
  return {
    ok: true,
    row: {
      crd,
      displayName,
      legalName: displayName,
      consumerClass,
      city: office.city,
      state: office.state,
      zip: office.zip,
      sourceVersion,
      updatedAt,
    },
  };
}

async function loadFromDatabase() {
  const url = process.env.DATABASE_URL || process.env.INGESTION_DATABASE_URL;
  if (!url) return null;
  const require = createRequire(import.meta.url);
  let pg;
  try {
    pg = require('pg');
  } catch {
    return null;
  }
  const client = new pg.Client({
    connectionString: url,
    ssl: url.includes('supabase') || url.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  try {
    const result = await client.query(`
      SELECT
        f.slug,
        f.legal_name,
        f.display_name,
        f.is_synthetic,
        crd.identifier_value AS crd,
        r.registration_type,
        r.status AS registration_status,
        r.source_status_text,
        b.city,
        b.region,
        b.postal_code,
        b.country,
        sd.indexable AS search_indexable,
        rel.release_label,
        (
          SELECT count(*) FROM evidence_records e
          WHERE e.subject_id = f.id AND e.subject_kind = 'firm'
        ) AS evidence_count,
        (
          SELECT count(*) FROM source_snapshots s
          WHERE s.subject_id = f.id AND s.subject_kind = 'firm'
        ) AS snapshot_count,
        obs.observed
      FROM firms f
      JOIN firm_identifiers crd ON crd.firm_id = f.id AND crd.identifier_type = 'crd'
      JOIN search_documents sd ON sd.entity_id = f.id AND sd.entity_kind = 'firm' AND sd.indexable = true
      LEFT JOIN registrations r ON r.firm_id = f.id AND r.subject_kind = 'firm'
      LEFT JOIN branches b ON b.firm_id = f.id AND b.is_main_office
      LEFT JOIN form_adv_firm_facts adv ON adv.firm_id = f.id
      LEFT JOIN source_releases rel ON rel.id = adv.source_release_id
      LEFT JOIN firm_source_observations obs
        ON obs.firm_id = f.id AND obs.source_release_id = adv.source_release_id
      WHERE f.is_synthetic = false
      ORDER BY crd.identifier_value::bigint NULLS LAST, crd.identifier_value
    `);
    return result.rows;
  } finally {
    await client.end();
  }
}

function classifyDbRow(row) {
  const type = row.registration_type || '';
  const status = row.registration_status || '';
  const source = (row.source_status_text || '').toLowerCase();
  if (type === 'exempt_reporting_adviser') return 'exempt_reporting_adviser';
  if (type === 'registered_investment_adviser') {
    if (status === 'pending' || source === '120-day approval') return 'pending_120_day';
    if (status === 'registered') return 'reported_as_registered';
  }
  return null;
}

async function main() {
  const t0 = performance.now();
  const timings = {};
  const generatedAt = new Date().toISOString();
  const outDir = resolve(ROOT, 'data', 'network-discovery');
  mkdirSync(outDir, { recursive: true });

  let sourceMode = 'production_sitemap_pages';
  let sourceVersion = '';
  let considered = 0;
  const ineligibleReasons = {};
  const eligibleEntities = [];

  const tLoad = performance.now();
  const dbRows = await loadFromDatabase();
  timings.load_ms = Number((performance.now() - tLoad).toFixed(3));

  if (dbRows && dbRows.length) {
    sourceMode = 'database_wave_indexable';
    sourceVersion = `db:wave-indexable#n=${dbRows.length}`;
    considered = dbRows.length;
    const tElig = performance.now();
    for (const row of dbRows) {
      const consumerClass = classifyDbRow(row);
      if (!consumerClass) {
        ineligibleReasons.missing_classification = (ineligibleReasons.missing_classification || 0) + 1;
        continue;
      }
      const state = (row.region || '').trim().toUpperCase();
      if (!/^[A-Z]{2}$/.test(state)) {
        ineligibleReasons.missing_usable_us_state =
          (ineligibleReasons.missing_usable_us_state || 0) + 1;
        continue;
      }
      if (!row.crd) {
        ineligibleReasons.missing_crd = (ineligibleReasons.missing_crd || 0) + 1;
        continue;
      }
      eligibleEntities.push(
        mapEntity({
          crd: row.crd,
          displayName: row.display_name,
          legalName: row.legal_name,
          consumerClass,
          city: row.city,
          state,
          zip: row.postal_code ? String(row.postal_code).slice(0, 5) : null,
          sourceVersion,
          updatedAt: generatedAt,
        })
      );
    }
    timings.eligibility_ms = Number((performance.now() - tElig).toFixed(3));
  } else {
    // Fallback: Wave 1 from public sitemap + published firm pages
    const tSitemap = performance.now();
    const waveCrds = await loadWave1CrdsFromSitemap();
    timings.load_ms = Number((performance.now() - tSitemap).toFixed(3));
    considered = waveCrds.length;
    sourceVersion = `wave1-sitemap+firm-pages#n=${waveCrds.length};origin=${ORIGIN}`;
    const tElig = performance.now();
    // Deterministic: fetch all Wave 1 CRDs (sorted), then take first 200 eligible by network id.
    const concurrency = 10;
    for (let i = 0; i < waveCrds.length; i += concurrency) {
      const batch = waveCrds.slice(i, i + concurrency);
      const results = await Promise.all(
        batch.map((crd) => fetchFirmRow(crd, sourceVersion, generatedAt))
      );
      for (const result of results) {
        if (!result.ok) {
          ineligibleReasons[result.reason] = (ineligibleReasons[result.reason] || 0) + 1;
        } else {
          eligibleEntities.push(mapEntity(result.row));
        }
      }
      process.stderr.write(`fetched ${Math.min(i + concurrency, waveCrds.length)}/${waveCrds.length} wave firms\n`);
      await sleep(80);
    }
    timings.eligibility_ms = Number((performance.now() - tElig).toFixed(3));
  }

  timings.normalize_ms = timings.eligibility_ms;

  // Deduplicate by network id
  const byId = new Map();
  for (const e of eligibleEntities) {
    if (byId.has(e.network_entity_id)) {
      ineligibleReasons.duplicate_crd = (ineligibleReasons.duplicate_crd || 0) + 1;
      continue;
    }
    byId.set(e.network_entity_id, e);
  }
  const uniqueEligible = [...byId.values()].sort((a, b) =>
    a.network_entity_id.localeCompare(b.network_entity_id)
  );

  const pilot = uniqueEligible.slice(0, PILOT_TARGET);

  const tVal = performance.now();
  // Validation
  const ids = new Set();
  for (const e of pilot) {
    if (ids.has(e.network_entity_id)) throw new Error(`duplicate ${e.network_entity_id}`);
    ids.add(e.network_entity_id);
    if (e.hub !== 'investor') throw new Error('hub');
    if (!e.canonical_profile_url.startsWith(`${ORIGIN}/firm/sec-crd-`)) {
      throw new Error(`bad url ${e.canonical_profile_url}`);
    }
    if (!['ria', 'era'].includes(e.entity_type)) throw new Error('entity_type');
    if (e.raum || e.premium || e.trust_score) throw new Error('forbidden field');
  }
  timings.validation_ms = Number((performance.now() - tVal).toFixed(3));

  const fp = fingerprint(pilot);
  const again = fingerprint(pilot);
  if (fp !== again) throw new Error('fingerprint unstable');

  // Query readiness on pilot + eligible
  function audit(entities) {
    const boca = entities.filter(
      (e) =>
        e.entity_type === 'ria' &&
        (e.city || '').toLowerCase() === 'boca raton' &&
        e.state === 'FL'
    ).length;
    const flRia = entities.filter((e) => e.entity_type === 'ria' && e.state === 'FL').length;
    const miami = entities.filter(
      (e) => (e.city || '').toLowerCase() === 'miami' && e.state === 'FL'
    ).length;
    const austin = entities.filter(
      (e) =>
        e.entity_type === 'ria' &&
        (e.city || '').toLowerCase() === 'austin' &&
        e.state === 'TX'
    ).length;
    const nj = entities.filter((e) => e.state === 'NJ').length;
    const eraNy = entities.filter((e) => e.entity_type === 'era' && e.state === 'NY').length;
    return {
      'RIA Boca Raton': { exact_physical: boca },
      'registered investment advisers Florida': { physical_state_ria: flRia },
      'investment advisory firms Miami FL': { physical_city: miami },
      'RIA Austin TX': { exact_physical: austin },
      'investment advisers New Jersey': { physical_state: nj },
      'ERA New York': { era_physical_ny: eraNy },
    };
  }

  const typeCounts = {};
  const stateCounts = {};
  let withCity = 0;
  let withZip = 0;
  for (const e of pilot) {
    typeCounts[e.entity_type] = (typeCounts[e.entity_type] || 0) + 1;
    if (e.state) stateCounts[e.state] = (stateCounts[e.state] || 0) + 1;
    if (e.city) withCity++;
    if (e.zip) withZip++;
  }

  const feed = {
    schema_version: SCHEMA,
    hub: 'investor',
    generated_at: generatedAt,
    source_version: sourceVersion,
    source_mode: sourceMode,
    entity_count: pilot.length,
    fingerprint: fp,
    banner: BANNER,
    pilot_label: BANNER,
    eligibility: {
      considered,
      eligible: uniqueEligible.length,
      ineligible: considered - uniqueEligible.length,
      ineligible_reasons: ineligibleReasons,
      pilot_selected: pilot.length,
    },
    entity_type_breakdown: typeCounts,
    geography: { physical_states: stateCounts, with_city: withCity, with_zip: withZip },
    query_readiness: {
      pilot: audit(pilot),
      full_eligible: audit(uniqueEligible),
    },
    fail_closed_investment_products: [
      'Apple stock',
      'S&P 500 fund',
      'ETF Florida',
      'crypto investment',
      'investment property lender',
      'hedge fund performance',
    ],
    ranking_safety: {
      raum: 0,
      firm_size: 0,
      premium: 0,
      payment: 0,
      popularity: 0,
      review_ranking: 0,
    },
    external_calls: {
      google_places: 0,
      llm: 0,
      external_geocoding: 0,
      new_enrichment_apis: 0,
      note:
        sourceMode === 'production_sitemap_pages'
          ? 'Read-only HTTPS GETs to www.investortrusthub.com sitemap + firm pages (own Hub published research).'
          : 'Postgres read of official Wave-indexable firms only.',
    },
    entities: pilot,
  };

  const tExport = performance.now();
  const feedPath = resolve(outDir, 'investor-discovery-pilot.v1.json');
  writeFileSync(feedPath, `${JSON.stringify(feed, null, 2)}\n`, 'utf8');
  timings.export_ms = Number((performance.now() - tExport).toFixed(3));
  timings.total_ms = Number((performance.now() - t0).toFixed(3));

  // Dual-run fingerprint on in-memory pilot
  const stability = {
    membership_drift: 0,
    identity_drift: 0,
    content_fingerprint_drift: fp === fingerprint(pilot) ? 0 : 1,
    fingerprint: fp,
  };

  const report = {
    banner: BANNER,
    feed_path: 'data/network-discovery/investor-discovery-pilot.v1.json',
    source_mode: sourceMode,
    source_version: sourceVersion,
    counts: feed.eligibility,
    entity_type_breakdown: typeCounts,
    geography: feed.geography,
    query_readiness: feed.query_readiness,
    fingerprint: fp,
    stability,
    timings,
    external_calls: feed.external_calls,
  };
  writeFileSync(
    resolve(outDir, 'investor-discovery-pilot.report.json'),
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8'
  );

  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
