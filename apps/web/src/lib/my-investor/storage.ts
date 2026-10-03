/**
 * My Investor device store. Saved firms live in this browser only
 * (localStorage). One row per profile slug. Saving never creates a Watch.
 */

export const SAVED_FIRMS_KEY = 'ith:my-investor:saved-firms:v1';
export const STORE_EVENT = 'ith-my-investor-store';
export const MAX_SAVED_FIRMS = 200;

export type SavedFirmKind = 'official_firm' | 'state_adviser_firm';

export type SavedFirm = {
  slug: string;
  name: string;
  /** Display copy of the firm CRD. The parent identity is re-derived on the server. */
  crd: string | null;
  kind: SavedFirmKind;
  profilePath: string;
  savedAt: string;
};

export type SaveFirmInput = {
  slug: string;
  name: string;
  crd?: string | null;
  kind: SavedFirmKind;
};

export type SaveFirmResult =
  | { ok: true; alreadySaved: boolean; row: SavedFirm }
  | { ok: false; reason: 'unavailable' | 'invalid' | 'full'; error: string };

const SLUG = /^[a-z0-9][a-z0-9-]{0,159}$/;

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function isRow(value: unknown): value is SavedFirm {
  if (!value || typeof value !== 'object') return false;
  const row = value as SavedFirm;
  return typeof row.slug === 'string' && SLUG.test(row.slug) && typeof row.name === 'string' &&
    (row.crd === null || typeof row.crd === 'string') &&
    (row.kind === 'official_firm' || row.kind === 'state_adviser_firm') &&
    row.profilePath === `/firm/${row.slug}` && typeof row.savedAt === 'string';
}

export function listSavedFirms(): SavedFirm[] {
  const store = storage();
  if (!store) return [];
  try {
    const parsed = JSON.parse(store.getItem(SAVED_FIRMS_KEY) ?? '[]') as unknown;
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    return parsed.filter(isRow).filter((row) => (seen.has(row.slug) ? false : (seen.add(row.slug), true)));
  } catch {
    return [];
  }
}

function write(rows: SavedFirm[]): boolean {
  const store = storage();
  if (!store) return false;
  try {
    store.setItem(SAVED_FIRMS_KEY, JSON.stringify(rows));
  } catch {
    return false;
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(STORE_EVENT));
  return true;
}

export function isFirmSaved(slug: string): boolean {
  return listSavedFirms().some((row) => row.slug === slug);
}

export function saveFirm(input: SaveFirmInput): SaveFirmResult {
  const slug = input.slug.trim();
  const name = input.name.trim().slice(0, 300);
  if (!SLUG.test(slug) || !name) return { ok: false, reason: 'invalid', error: 'This profile cannot be saved.' };
  const rows = listSavedFirms();
  const existing = rows.find((row) => row.slug === slug);
  if (existing) return { ok: true, alreadySaved: true, row: existing };
  if (rows.length >= MAX_SAVED_FIRMS) {
    return { ok: false, reason: 'full', error: `You can keep up to ${MAX_SAVED_FIRMS} saved firms on this device.` };
  }
  const row: SavedFirm = {
    slug,
    name,
    crd: input.crd?.trim() || null,
    kind: input.kind,
    profilePath: `/firm/${slug}`,
    savedAt: new Date().toISOString(),
  };
  if (!write([...rows, row])) {
    return { ok: false, reason: 'unavailable', error: 'This browser is not allowing saved firms right now.' };
  }
  return { ok: true, alreadySaved: false, row };
}

export function removeSavedFirm(slug: string): boolean {
  const rows = listSavedFirms();
  const next = rows.filter((row) => row.slug !== slug);
  if (next.length === rows.length) return false;
  return write(next);
}
