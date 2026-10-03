/**
 * Investor parent Save identity. Client-safe: no database, no signing material.
 *
 * Grain: one official SEC/IARD firm profile at /firm/sec-crd-<CRD>. The firm
 * CRD is the identity. The slug is the return path only, the firms row UUID is
 * never an identity, and a name is never consulted.
 *
 * Not this grain, so device Save only:
 *   - state-adviser-only firm profiles (IAPD state-registration observations
 *     rendered on the same route when no SEC/IARD firm record maps);
 *   - synthetic development firms and professionals;
 *   - reserved /company and /fund routes;
 *   - individual advisers, branches and notice filings (no public profile).
 */
export const INVESTOR_HUB = 'investor' as const;
/** Ask's approved class for the Investor hub (v2-3/selected-profiles/3). */
export const INVESTOR_PROFILE_CLASS = 'official_firm' as const;
export const INVESTOR_IDENTIFIER_NAMESPACE = 'sec.crd' as const;
export const INVESTOR_JURISDICTION = 'US' as const;
export const INVESTOR_PUBLICATION_SOURCE = 'investor_trust_hub_firms' as const;
export const INVESTOR_PUBLICATION_GRAIN = 'firm_crd' as const;

const CRD = /^[1-9][0-9]{0,9}$/;
const NATIVE_ID = /^crd-([1-9][0-9]{0,9})$/;

export type OfficialFirmSaveIdentity = {
  profileClass: typeof INVESTOR_PROFILE_CLASS;
  namespace: typeof INVESTOR_IDENTIFIER_NAMESPACE;
  nativeId: string;
  crd: string;
  jurisdiction: typeof INVESTOR_JURISDICTION;
  publicationSource: typeof INVESTOR_PUBLICATION_SOURCE;
  publicationGrain: typeof INVESTOR_PUBLICATION_GRAIN;
  canonicalSlug: string;
  returnPath: string;
};

export function cleanCrd(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim();
  return CRD.test(trimmed) ? trimmed : null;
}

export function investorNativeId(crd: string | null | undefined): string | null {
  const clean = cleanCrd(crd);
  return clean ? `crd-${clean}` : null;
}

export function crdFromNativeId(nativeId: string): string | null {
  return NATIVE_ID.exec(nativeId)?.[1] ?? null;
}

export function firmReturnPath(slug: string): string {
  return `/firm/${slug}`;
}

/**
 * The canonical slug of an official firm is exactly sec-crd-<CRD>. A missing
 * CRD, or a slug that names a different CRD, fails closed.
 */
export function resolveOfficialFirmIdentity(input: {
  slug: string;
  crd?: string | null;
}): OfficialFirmSaveIdentity | null {
  const crd = cleanCrd(input.crd);
  const slug = input.slug.trim();
  if (!crd || slug !== `sec-crd-${crd}`) return null;
  return {
    profileClass: INVESTOR_PROFILE_CLASS,
    namespace: INVESTOR_IDENTIFIER_NAMESPACE,
    nativeId: `crd-${crd}`,
    crd,
    jurisdiction: INVESTOR_JURISDICTION,
    publicationSource: INVESTOR_PUBLICATION_SOURCE,
    publicationGrain: INVESTOR_PUBLICATION_GRAIN,
    canonicalSlug: slug,
    returnPath: firmReturnPath(slug),
  };
}
