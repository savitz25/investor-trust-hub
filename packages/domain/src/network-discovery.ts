/**
 * ASK-SEARCH-INVESTOR-001 — thin discovery projection helpers.
 * Pure functions (no DB / network). Used by export script + vitest.
 */

import { createHash } from 'node:crypto';
import { isUsStateCode, type ConsumerFirmClass } from './firm-classification';
import { firmSlugForCrd, isOfficialFirmSlug, parseFirmCrdFromSlug } from './firm-slug';
import { isValidIdentifierValue, normalizeIdentifierValue } from './identifiers';

export const ASK_NETWORK_DISCOVERY_SCHEMA = 'ask-network-discovery-v1' as const;
export const INVESTOR_HUB = 'investor' as const;
export const CANONICAL_HOST = 'www.investortrusthub.com';
export const CANONICAL_ORIGIN = `https://${CANONICAL_HOST}`;
export const PILOT_BANNER = 'PILOT / NOT YET CONSUMED BY ASK PRODUCTION';
export const PILOT_TARGET = 200;

export type InvestorDiscoveryEntityType = 'ria' | 'era' | 'advisory_firm';

export type DiscoveryStatus = 'eligible' | 'held' | 'ineligible';

export type InvestorDiscoveryEntity = {
  network_entity_id: string;
  hub: typeof INVESTOR_HUB;
  source_entity_id: string;
  entity_type: InvestorDiscoveryEntityType;
  display_name: string;
  legal_name?: string;
  city?: string;
  state?: string;
  zip?: string;
  categories?: string[];
  regulatory_status_summary?: string;
  trust_report_available: boolean;
  canonical_profile_url: string;
  canonical_search_url?: string;
  search_terms?: string[];
  discovery_status: DiscoveryStatus;
  source_version?: string;
  updated_at?: string;
  /** Physical principal office — never registration geography */
  physical_location?: {
    city: string | null;
    state: string | null;
    postal_code: string | null;
    country: 'US' | null;
  };
  consumer_class?: ConsumerFirmClass;
};

export type FirmDiscoverySourceRow = {
  crd: string;
  slug?: string;
  legalName: string;
  displayName: string;
  consumerClass: ConsumerFirmClass;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  countryCode?: string | null;
  currentlyIndexable?: boolean;
  trustReportEligible?: boolean;
  geoDiscoveryEligible?: boolean;
  isSynthetic?: boolean;
  releaseLabel?: string | null;
};

export type DiscoveryIneligibilityReason =
  | 'synthetic'
  | 'missing_crd'
  | 'malformed_crd'
  | 'missing_name'
  | 'missing_classification'
  | 'not_trust_report_eligible'
  | 'missing_usable_us_state'
  | 'not_wave_indexable'
  | 'invalid_canonical_url'
  | 'duplicate_crd';

export function buildInvestorNetworkId(crd: string): string {
  const n = normalizeIdentifierValue('crd', crd);
  return `investor:crd-${n}`;
}

export function buildCanonicalFirmProfileUrl(crd: string): string {
  return `${CANONICAL_ORIGIN}/firm/${firmSlugForCrd(crd)}`;
}

export function validateCanonicalFirmUrl(url: string): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, reasons: ['malformed_url'] };
  }
  if (parsed.protocol !== 'https:') reasons.push('not_https');
  if (parsed.hostname !== CANONICAL_HOST) reasons.push('wrong_host');
  if (parsed.port) reasons.push('non_default_port');
  if (parsed.username || parsed.password) reasons.push('userinfo');
  if (parsed.search || parsed.hash) reasons.push('query_or_hash');
  const slug = parsed.pathname.replace(/^\/firm\//, '').replace(/\/$/, '');
  if (!parsed.pathname.startsWith('/firm/') || !isOfficialFirmSlug(slug)) {
    reasons.push('malformed_path');
  }
  if (/localhost|127\.0\.0\.1|vercel\.app/i.test(parsed.hostname)) {
    reasons.push('forbidden_host');
  }
  return { ok: reasons.length === 0, reasons };
}

export function mapEntityType(consumerClass: ConsumerFirmClass): InvestorDiscoveryEntityType {
  if (consumerClass === 'exempt_reporting_adviser') return 'era';
  return 'ria';
}

export function regulatoryStatusSummary(consumerClass: ConsumerFirmClass): string {
  if (consumerClass === 'exempt_reporting_adviser') return 'Exempt reporting adviser';
  if (consumerClass === 'pending_120_day') return 'SEC-registered investment adviser (pending / 120-day)';
  return 'SEC-registered investment adviser';
}

export function evaluateDiscoveryEligibility(
  row: FirmDiscoverySourceRow
): { ok: true } | { ok: false; reasons: DiscoveryIneligibilityReason[] } {
  const reasons: DiscoveryIneligibilityReason[] = [];
  if (row.isSynthetic) reasons.push('synthetic');
  if (!row.crd?.trim()) reasons.push('missing_crd');
  else if (!isValidIdentifierValue('crd', row.crd)) reasons.push('malformed_crd');
  if (!row.displayName?.trim() && !row.legalName?.trim()) reasons.push('missing_name');
  if (!row.consumerClass) reasons.push('missing_classification');
  if (row.trustReportEligible === false) reasons.push('not_trust_report_eligible');
  if (row.currentlyIndexable === false) reasons.push('not_wave_indexable');
  const state = (row.region || '').trim().toUpperCase();
  if (!isUsStateCode(state)) reasons.push('missing_usable_us_state');
  if (row.crd && isValidIdentifierValue('crd', row.crd)) {
    const url = buildCanonicalFirmProfileUrl(row.crd);
    if (!validateCanonicalFirmUrl(url).ok) reasons.push('invalid_canonical_url');
  }
  if (reasons.length) return { ok: false, reasons };
  return { ok: true };
}

export function mapFirmToDiscovery(
  row: FirmDiscoverySourceRow,
  opts?: { sourceVersion?: string; updatedAt?: string }
): InvestorDiscoveryEntity {
  const crd = normalizeIdentifierValue('crd', row.crd);
  const entity_type = mapEntityType(row.consumerClass);
  const state = isUsStateCode(row.region) ? row.region!.trim().toUpperCase() : undefined;
  const city = row.city?.trim() || undefined;
  const zip = row.postalCode?.trim().replace(/\s+/g, '') || undefined;
  const categories = new Set<string>(['advisory_firm', 'investment_adviser']);
  if (entity_type === 'ria') categories.add('ria');
  if (entity_type === 'era') categories.add('era');
  if (row.consumerClass === 'pending_120_day') categories.add('pending');
  if (row.consumerClass === 'reported_as_registered') categories.add('registered');

  const search_terms = [
    row.displayName,
    row.legalName,
    entity_type,
    ...categories,
    city,
    state,
    `crd ${crd}`,
  ]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase());

  return {
    network_entity_id: buildInvestorNetworkId(crd),
    hub: INVESTOR_HUB,
    source_entity_id: `crd-${crd}`,
    entity_type,
    display_name: (row.displayName || row.legalName).trim(),
    legal_name: row.legalName?.trim() || undefined,
    city,
    state,
    zip,
    categories: [...categories].sort(),
    regulatory_status_summary: regulatoryStatusSummary(row.consumerClass),
    trust_report_available: row.trustReportEligible !== false,
    canonical_profile_url: buildCanonicalFirmProfileUrl(crd),
    canonical_search_url: state
      ? `${CANONICAL_ORIGIN}/firms?state=${encodeURIComponent(state)}`
      : `${CANONICAL_ORIGIN}/firms`,
    search_terms: [...new Set(search_terms)],
    discovery_status: 'eligible',
    source_version: opts?.sourceVersion,
    updated_at: opts?.updatedAt,
    physical_location: {
      city: city ?? null,
      state: state ?? null,
      postal_code: zip ?? null,
      country: row.countryCode === 'US' || state ? 'US' : null,
    },
    consumer_class: row.consumerClass,
  };
}

/** Deterministic cohort: sort by network_entity_id, take first N. No RAUM/size/popularity. */
export function selectPilotCohort(
  eligible: InvestorDiscoveryEntity[],
  target = PILOT_TARGET
): InvestorDiscoveryEntity[] {
  const sorted = [...eligible].sort((a, b) =>
    a.network_entity_id.localeCompare(b.network_entity_id)
  );
  return sorted.slice(0, Math.min(target, sorted.length));
}

export function contentFingerprint(entities: InvestorDiscoveryEntity[]): string {
  const normalized = entities.map((e) => {
    const { updated_at: _u, ...rest } = e;
    return rest;
  });
  return createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

export function rejectDuplicateCrds(entities: InvestorDiscoveryEntity[]): {
  ok: boolean;
  duplicates: string[];
} {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const e of entities) {
    const crd = parseFirmCrdFromSlug(e.canonical_profile_url.split('/firm/')[1] || '') ||
      e.source_entity_id.replace(/^crd-/, '');
    if (seen.has(crd)) duplicates.push(crd);
    seen.add(crd);
  }
  return { ok: duplicates.length === 0, duplicates };
}

/** Query readiness helpers — physical city only for exact city queries. */
export function matchesPhysicalCity(
  entity: InvestorDiscoveryEntity,
  city: string,
  state?: string
): boolean {
  const want = city.trim().toLowerCase();
  const have = (entity.city || entity.physical_location?.city || '').trim().toLowerCase();
  if (!want || !have || have !== want) return false;
  if (state) {
    const st = state.trim().toUpperCase();
    return (entity.state || entity.physical_location?.state || '') === st;
  }
  return true;
}

export function matchesPhysicalState(entity: InvestorDiscoveryEntity, state: string): boolean {
  return (entity.state || entity.physical_location?.state || '') === state.trim().toUpperCase();
}

export function matchesEntityType(
  entity: InvestorDiscoveryEntity,
  wanted: 'ria' | 'era' | 'advisory_firm'
): boolean {
  if (wanted === 'advisory_firm') return true;
  return entity.entity_type === wanted;
}

/** Fail-closed: investment products must not match advisory firms. */
export const UNSUPPORTED_INVESTMENT_PRODUCT_QUERIES = [
  'Apple stock',
  'S&P 500 fund',
  'ETF Florida',
  'crypto investment',
  'investment property lender',
  'hedge fund performance',
] as const;

export function investmentProductQueryMatchesFirm(_query: string): never[] {
  // Advisory-firm discovery must never substitute for securities/products.
  return [];
}
