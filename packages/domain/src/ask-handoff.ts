/**
 * ASK-SEARCH-INVESTOR-002 — InvestorTrustHub Ask handoff (receiving).
 * Allowlisted structured context only. No raw query, no PII, no Ask runtime.
 */

import { isUsStateCode, type UsStateCode } from './firm-classification';
import {
  matchesEntityType,
  matchesPhysicalState,
  type InvestorDiscoveryEntity,
  type InvestorDiscoveryEntityType,
} from './network-discovery';

export const ASK_HANDOFF_KEYS = [
  'src',
  'journey',
  'state',
  'county',
  'intent',
  'entity',
  'category',
  'city',
  'zip',
  'sid',
] as const;

export type AskHandoffKey = (typeof ASK_HANDOFF_KEYS)[number];

/** Forbidden inbound keys — ignored / never persisted / never reflected into URLs. */
export const ASK_HANDOFF_FORBIDDEN_KEYS = [
  'query',
  'q',
  'email',
  'phone',
  'name',
  'street_address',
  'address',
  'account',
  'ssn',
  'income',
  'portfolio',
  'holdings',
  'assets',
  'document',
  'financial_document',
  'next',
  'redirect',
  'returnUrl',
  'return_url',
  'lat',
  'lng',
  'latitude',
  'longitude',
] as const;

export const INVESTOR_ASK_ENTITIES = ['ria', 'era'] as const;
export type InvestorAskEntity = (typeof INVESTOR_ASK_ENTITIES)[number];

export const INVESTOR_ASK_CATEGORIES = ['advisory_firm', 'investment_adviser'] as const;
export type InvestorAskCategory = (typeof INVESTOR_ASK_CATEGORIES)[number];

/** Product / non-adviser entities — fail closed (never substitute RIAs). */
export const UNSUPPORTED_INVESTMENT_PRODUCT_ENTITIES = [
  'stock',
  'equity',
  'fund',
  'mutual_fund',
  'etf',
  'crypto',
  'cryptocurrency',
  'hedge_fund',
  'investment_company',
  'issuer',
  'security',
  'securities',
  'lender',
  'mortgage_lender',
  'investment_property',
] as const;

export type InvestorAskUnsupportedReason =
  | 'investment_product'
  | 'ambiguous_entity'
  | 'invalid_context'
  | 'county_unsupported';

export type InvestorAskSearchContext = {
  source: 'ask';
  entityType?: InvestorAskEntity;
  category?: InvestorAskCategory;
  state?: UsStateCode;
  city?: string;
  zip?: string;
  /** Accepted only if we later gain structured county data; currently always dropped. */
  county?: string;
  intent?: string;
  journey?: string;
  sid?: string;
  unsupported?: InvestorAskUnsupportedReason;
};

export type AskHandoffDestination =
  | {
      kind: 'firms';
      href: string;
      context: InvestorAskSearchContext;
      backLabel: string;
    }
  | {
      kind: 'unsupported';
      href: string;
      context: InvestorAskSearchContext;
      reason: InvestorAskUnsupportedReason;
      backLabel: string;
    };

const FORBIDDEN = new Set<string>(ASK_HANDOFF_FORBIDDEN_KEYS);
const ENTITY_SET = new Set<string>(INVESTOR_ASK_ENTITIES);
const CATEGORY_SET = new Set<string>(INVESTOR_ASK_CATEGORIES);
const PRODUCT_ENTITY_SET = new Set<string>(UNSUPPORTED_INVESTMENT_PRODUCT_ENTITIES);

const US_STATE_NAMES: Record<string, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DC: 'District of Columbia',
  DE: 'Delaware',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  IA: 'Iowa',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  MA: 'Massachusetts',
  MD: 'Maryland',
  ME: 'Maine',
  MI: 'Michigan',
  MN: 'Minnesota',
  MO: 'Missouri',
  MS: 'Mississippi',
  MT: 'Montana',
  NC: 'North Carolina',
  ND: 'North Dakota',
  NE: 'Nebraska',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NV: 'Nevada',
  NY: 'New York',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VA: 'Virginia',
  VT: 'Vermont',
  WA: 'Washington',
  WI: 'Wisconsin',
  WV: 'West Virginia',
  WY: 'Wyoming',
};

function firstParam(v: string | string[] | undefined | null): string | undefined {
  if (v == null) return undefined;
  const s = Array.isArray(v) ? v[0] : v;
  if (typeof s !== 'string') return undefined;
  const t = s.trim();
  return t || undefined;
}

/** Strip control chars / angle brackets — never reflect raw HTML. */
export function sanitizeAskToken(raw: string, max = 64): string | undefined {
  const cleaned = raw
    .replace(/[<>`"\\]/g, '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, max);
  return cleaned || undefined;
}

export function normalizeAskZip(raw?: string): string | undefined {
  if (!raw) return undefined;
  const digits = raw.replace(/\D/g, '');
  if (digits.length !== 5) return undefined;
  return digits;
}

/** Opaque correlation id — alphanumeric / _- only (no HTML / XSS vectors). */
export function normalizeAskSid(raw?: string): string | undefined {
  if (!raw) return undefined;
  const cleaned = sanitizeAskToken(raw, 64);
  if (!cleaned || !/^[a-zA-Z0-9_-]+$/.test(cleaned)) return undefined;
  return cleaned;
}

/** City slug for URL/context — rejects traversal / protocols. */
export function normalizeAskCity(raw?: string): string | undefined {
  if (!raw) return undefined;
  const cleaned = sanitizeAskToken(raw, 64);
  if (!cleaned) return undefined;
  if (/:\/\//.test(cleaned) || cleaned.includes('..') || cleaned.includes('/')) {
    return undefined;
  }
  return (
    cleaned
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-|-$/g, '') || undefined
  );
}

export function slugifyCityToken(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function physicalCityMatches(
  providerCity: string | null | undefined,
  wantedCity: string | null | undefined
): boolean {
  if (!wantedCity?.trim() || !providerCity?.trim()) return false;
  const a = slugifyCityToken(providerCity);
  const b = slugifyCityToken(wantedCity);
  return Boolean(a && b && a === b);
}

export function physicalZipMatches(
  providerZip: string | null | undefined,
  wantedZip: string | null | undefined
): boolean {
  if (!wantedZip || !providerZip) return false;
  const a = providerZip.replace(/\D/g, '').slice(0, 5);
  const b = wantedZip.replace(/\D/g, '').slice(0, 5);
  return a.length === 5 && a === b;
}

/**
 * Parse inbound searchParams into allowlisted Ask context.
 * Requires src=ask. Forbidden keys are ignored (never accepted).
 */
export function parseInvestorAskSearchContext(
  input: URLSearchParams | Record<string, string | string[] | undefined> | null | undefined
): InvestorAskSearchContext | null {
  if (!input) return null;

  const get = (key: string): string | undefined => {
    if (input instanceof URLSearchParams) return firstParam(input.get(key));
    return firstParam(input[key]);
  };

  for (const bad of FORBIDDEN) {
    void get(bad);
  }

  const src = get('src')?.toLowerCase();
  if (src !== 'ask') return null;

  const entityRaw = sanitizeAskToken(get('entity')?.toLowerCase() ?? '', 48);
  const categoryRaw = sanitizeAskToken(get('category')?.toLowerCase() ?? '', 48);
  const stateRaw = sanitizeAskToken(get('state') ?? '', 32);
  const state =
    stateRaw && isUsStateCode(stateRaw) ? (stateRaw.trim().toUpperCase() as UsStateCode) : undefined;

  const entity =
    entityRaw && ENTITY_SET.has(entityRaw) ? (entityRaw as InvestorAskEntity) : undefined;
  const category =
    categoryRaw && CATEGORY_SET.has(categoryRaw)
      ? (categoryRaw as InvestorAskCategory)
      : undefined;

  // County: Investor-001 found county unsupported — never invent; drop inbound county.
  void get('county');

  const ctx: InvestorAskSearchContext = {
    source: 'ask',
    entityType: entity,
    category,
    state,
    city: normalizeAskCity(get('city')),
    zip: normalizeAskZip(get('zip')),
    intent: sanitizeAskToken(get('intent')?.toLowerCase() ?? '', 32),
    journey: sanitizeAskToken(get('journey')?.toLowerCase() ?? '', 32),
    sid: normalizeAskSid(get('sid')),
  };

  if (entityRaw && PRODUCT_ENTITY_SET.has(entityRaw)) {
    ctx.unsupported = 'investment_product';
  } else if (entityRaw && !entity) {
    // e.g. investment_company, javascript:, script — do not default to RIA
    ctx.unsupported = 'ambiguous_entity';
  } else if (categoryRaw && !category) {
    ctx.unsupported = 'ambiguous_entity';
  } else if (stateRaw && !state && !ctx.zip && !ctx.city) {
    ctx.unsupported = 'invalid_context';
  }

  return ctx;
}

export function serializeAskSearchContext(ctx: InvestorAskSearchContext): string {
  const p = new URLSearchParams();
  p.set('src', 'ask');
  if (ctx.journey) p.set('journey', ctx.journey);
  if (ctx.state) p.set('state', ctx.state);
  if (ctx.intent) p.set('intent', ctx.intent);
  if (ctx.entityType) p.set('entity', ctx.entityType);
  if (ctx.category) p.set('category', ctx.category);
  if (ctx.city) p.set('city', ctx.city);
  if (ctx.zip) p.set('zip', ctx.zip);
  if (ctx.sid) p.set('sid', ctx.sid);
  // county intentionally omitted
  return p.toString();
}

export function withAskContext(path: string, ctx: InvestorAskSearchContext): string {
  const q = serializeAskSearchContext(ctx);
  if (!q) return path;
  const base = path.split('?')[0] || path;
  if (!base.startsWith('/')) return path;
  return `${base}?${q}`;
}

function titleCaseSlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function entityPhrase(ctx: InvestorAskSearchContext): string {
  if (ctx.entityType === 'ria') return 'RIAs';
  if (ctx.entityType === 'era') return 'ERAs';
  return 'investment advisers';
}

function placePhrase(ctx: InvestorAskSearchContext): string | null {
  const stateName = ctx.state ? US_STATE_NAMES[ctx.state] || ctx.state : null;
  const city = ctx.city ? titleCaseSlug(ctx.city) : null;
  if (city && stateName) return `${city}, ${stateName}`;
  if (city) return city;
  if (ctx.zip && stateName) return `${ctx.zip}, ${stateName}`;
  if (ctx.zip) return ctx.zip;
  if (stateName) return stateName;
  return null;
}

/** e.g. "← Back to RIAs in Boca Raton, Florida" */
export function buildAskBackLabel(ctx: InvestorAskSearchContext): string {
  const entity = entityPhrase(ctx);
  const place = placePhrase(ctx);
  if (place) return `← Back to ${entity} in ${place}`;
  return `← Back to ${entity}`;
}

export function buildAskBackShortLabel(ctx: InvestorAskSearchContext): string {
  return buildAskBackLabel(ctx).replace(/^←\s*Back to\s+/i, '');
}

/**
 * Preloaded /firms href from Ask context.
 * Never sets free-text q. Preserves allowlisted Ask params only.
 */
export function buildAskFirmsHref(ctx: InvestorAskSearchContext): string {
  const p = new URLSearchParams();
  p.set('src', 'ask');
  if (ctx.state) p.set('state', ctx.state);
  if (ctx.city) p.set('city', ctx.city);
  if (ctx.zip) p.set('zip', ctx.zip);
  if (ctx.entityType) p.set('entity', ctx.entityType);
  if (ctx.category) p.set('category', ctx.category);
  if (ctx.journey) p.set('journey', ctx.journey);
  if (ctx.intent) p.set('intent', ctx.intent);
  if (ctx.sid) p.set('sid', ctx.sid);
  return `/firms?${p.toString()}`;
}

export function firmHrefWithAskContext(slug: string, ctx: InvestorAskSearchContext): string {
  const q = serializeAskSearchContext(ctx);
  const path = `/firm/${encodeURIComponent(slug)}`;
  return q ? `${path}?${q}` : path;
}

export function resolveAskHandoffDestination(
  ctx: InvestorAskSearchContext
): AskHandoffDestination {
  const backLabel = buildAskBackLabel(ctx);

  if (ctx.unsupported) {
    return {
      kind: 'unsupported',
      href: `/from-ask/unsupported?reason=${ctx.unsupported}`,
      context: ctx,
      reason: ctx.unsupported,
      backLabel,
    };
  }

  return {
    kind: 'firms',
    href: buildAskFirmsHref(ctx),
    context: ctx,
    backLabel,
  };
}

/** Whether an entity row matches Ask entity filter (RIA ≠ ERA hard separation). */
export function askEntityMatchesFirm(
  entityType: InvestorDiscoveryEntityType,
  askEntity?: InvestorAskEntity
): boolean {
  if (!askEntity) return true; // broad adviser search
  return matchesEntityType(
    { entity_type: entityType } as InvestorDiscoveryEntity,
    askEntity
  );
}

export function filterDiscoveryEntitiesForAsk(
  entities: InvestorDiscoveryEntity[],
  ctx: InvestorAskSearchContext
): InvestorDiscoveryEntity[] {
  return entities.filter((e) => {
    if (e.discovery_status !== 'eligible') return false;
    if (!askEntityMatchesFirm(e.entity_type, ctx.entityType)) return false;
    if (ctx.state && !matchesPhysicalState(e, ctx.state)) return false;
    if (ctx.city && !physicalCityMatches(e.city ?? e.physical_location?.city, ctx.city)) {
      return false;
    }
    if (ctx.zip && !physicalZipMatches(e.zip ?? e.physical_location?.postal_code, ctx.zip)) {
      return false;
    }
    return true;
  });
}

/** Ranking safety: Ask results sort by display name only — never RAUM/size/premium. */
export function sortAskFirmResultsByName<T extends { display_name?: string; displayName?: string }>(
  rows: T[]
): T[] {
  return [...rows].sort((a, b) => {
    const an = (a.display_name || a.displayName || '').toLowerCase();
    const bn = (b.display_name || b.displayName || '').toLowerCase();
    return an.localeCompare(bn);
  });
}

export const FAIL_CLOSED_INVESTMENT_PRODUCT_QUERIES = [
  'Apple stock',
  'S&P 500 fund',
  'ETF Florida',
  'crypto investment',
  'hedge fund performance',
  'investment property lender',
  'mutual fund New York',
] as const;
