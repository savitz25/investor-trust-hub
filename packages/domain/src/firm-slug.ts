import { isValidIdentifierValue, normalizeIdentifierValue } from './identifiers';

export const FIRM_SLUG_PREFIX = 'sec-crd-';

export function firmSlugForCrd(crd: string): string {
  const normalized = normalizeIdentifierValue('crd', crd);
  return `${FIRM_SLUG_PREFIX}${normalized}`;
}

export function parseFirmCrdFromSlug(slug: string): string | null {
  const trimmed = slug.trim().toLowerCase();
  if (!trimmed.startsWith(FIRM_SLUG_PREFIX)) {
    return null;
  }
  const crd = trimmed.slice(FIRM_SLUG_PREFIX.length);
  if (!isValidIdentifierValue('crd', crd)) {
    return null;
  }
  return normalizeIdentifierValue('crd', crd);
}

export function isOfficialFirmSlug(slug: string): boolean {
  return parseFirmCrdFromSlug(slug) !== null;
}
