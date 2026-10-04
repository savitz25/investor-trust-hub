/**
 * Investor publication authority for a My TrustHub Save.
 *
 * The source is the production firms table read by the same publication rule
 * that renders /firm/<slug> (publicFirmCountWhere) and mapped by the same
 * function that decides whether an official Firm Trust Report exists
 * (mapFirmReport). Nothing is copied or attested separately.
 *
 * A parent identity exists only when ALL hold:
 *   1. the requested class is official_firm;
 *   2. the slug is exactly sec-crd-<CRD>;
 *   3. exactly one published firm row carries that CRD;
 *   4. that row's own slug is the same canonical slug;
 *   5. an official Firm Trust Report maps from the row with the same CRD
 *      (a state-adviser-only profile does not: that is another grain).
 * Anything else is device Save only. No name, no UUID, no fuzzy lookup.
 */
import { cleanCrd, crdFromNativeId, firmReturnPath, investorNativeId, INVESTOR_PROFILE_CLASS } from './identity';

export type PublishedFirmRow = {
  slug: string;
  crd: string;
  /** True when an official SEC/IARD Firm Trust Report maps from this row. */
  officialReport: boolean;
};

/** Narrow read port over the production publication source. */
export type FirmPublicationPort = {
  /** Published firm rows that carry this exact CRD. At most three are read. */
  byCrd(crd: string): Promise<PublishedFirmRow[]>;
};

export type OfficialFirmPublication =
  | { ok: true; slug: string; crd: string; nativeId: string; returnPath: string; profileClass: typeof INVESTOR_PROFILE_CLASS }
  | { ok: false; reason: 'wrong_class' | 'missing_crd' | 'unpublished' | 'ambiguous' | 'noncanonical' | 'unsupported_class' | 'unavailable' };

const OFFICIAL_SLUG = /^sec-crd-([1-9][0-9]{0,9})$/;

export async function assessOfficialFirm(
  slug: string,
  profileClass: string,
  port: FirmPublicationPort,
): Promise<OfficialFirmPublication> {
  if (profileClass !== INVESTOR_PROFILE_CLASS) return { ok: false, reason: 'wrong_class' };
  const crd = cleanCrd(OFFICIAL_SLUG.exec(slug)?.[1]);
  const nativeId = investorNativeId(crd);
  if (!crd || !nativeId) return { ok: false, reason: 'missing_crd' };
  let rows: PublishedFirmRow[];
  try {
    rows = await port.byCrd(crd);
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
  if (rows.length === 0) return { ok: false, reason: 'unpublished' };
  if (rows.length > 1) return { ok: false, reason: 'ambiguous' };
  const row = rows[0]!;
  if (row.crd !== crd || row.slug !== slug) return { ok: false, reason: 'noncanonical' };
  if (!row.officialReport) return { ok: false, reason: 'unsupported_class' };
  return { ok: true, slug, crd, nativeId, returnPath: firmReturnPath(slug), profileClass: INVESTOR_PROFILE_CLASS };
}

export type InvestorPublication = {
  identity: { hub: 'investor'; nativeId: string; profileClass: typeof INVESTOR_PROFILE_CLASS };
  canonicalSlug: string;
  publicationState: 'PUBLISHABLE';
  reviewedClass: typeof INVESTOR_PROFILE_CLASS;
  checkedAt: number;
};

/** Publication by signed identity. A posted slug, name or network id is not consulted. */
export async function investorPublication(
  nativeId: string,
  port: FirmPublicationPort,
  now = Date.now(),
): Promise<InvestorPublication | null> {
  const crd = crdFromNativeId(nativeId);
  if (!crd) return null;
  const assessed = await assessOfficialFirm(`sec-crd-${crd}`, INVESTOR_PROFILE_CLASS, port);
  if (!assessed.ok || assessed.nativeId !== nativeId) return null;
  return {
    identity: { hub: 'investor', nativeId, profileClass: INVESTOR_PROFILE_CLASS },
    canonicalSlug: assessed.slug,
    publicationState: 'PUBLISHABLE',
    reviewedClass: INVESTOR_PROFILE_CLASS,
    checkedAt: now,
  };
}
