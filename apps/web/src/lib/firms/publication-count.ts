/** Count eligibility for the September IAPD firm cohort; legacy firms keep their prior rule. */
export const SEPTEMBER_IAPD_RELEASE_ID = 'a89165b8-b60a-4b31-9009-8b2a0291f8f8';
const RELEASE_SHA = '23cdfeba5d68d8dce93137ec76e91e26960abc2edaca1d57852373ef8e5f9a5c';
export const B1_STATE_RELEASE_ID = SEPTEMBER_IAPD_RELEASE_ID;

/** Exact, current, firm-grain IAPD state registration eligible for publication. */
export function publishedStateRegistrationSql(alias: string, firmAlias = 'f'): string {
  return `${alias}.firm_id = ${firmAlias}.id
    AND ${alias}.source_release_id = '${SEPTEMBER_IAPD_RELEASE_ID}'::uuid
    AND ${alias}.source_dataset_id = 'iapd_state_compilation'
    AND ${alias}.registration_type = 'STATE_REGISTERED_IA'
    AND ${alias}.subject_kind = 'firm'
    AND ${alias}.person_id IS NULL
    AND ${alias}.status = 'APPROVED'
    AND ${alias}.identity_confidence = 'CONFIRMED'
    AND ${alias}.is_current = true
    AND ${alias}.publication_allowed = true
    AND EXISTS (SELECT 1 FROM firm_identifiers b1_crd
      WHERE b1_crd.firm_id = ${firmAlias}.id
        AND b1_crd.identifier_type = 'crd'
        AND b1_crd.identifier_value = ${alias}.raw->>'firm_crd')
    AND EXISTS (SELECT 1 FROM source_releases b1_release
      WHERE b1_release.id = ${alias}.source_release_id
        AND b1_release.release_label = 'IA_FIRM_STATE_Feed_09_30_2026'
        AND b1_release.checksum_sha256 = '${RELEASE_SHA}')`;
}

export function publicFirmCountWhere(firm = 'f'): string {
  return `${firm}.is_synthetic = false AND (
    NOT EXISTS (
      SELECT 1 FROM jurisdiction_registrations batch_firm
      WHERE batch_firm.firm_id = ${firm}.id
        AND batch_firm.source_release_id = '${SEPTEMBER_IAPD_RELEASE_ID}'::uuid
        AND batch_firm.source_dataset_id = 'iapd_state_compilation'
        AND batch_firm.raw->>'b1_created_firm' = 'true'
    )
    OR EXISTS (
      SELECT 1 FROM jurisdiction_registrations batch_public
      JOIN source_releases batch_release ON batch_release.id = batch_public.source_release_id
      JOIN firm_identifiers batch_crd ON batch_crd.firm_id = ${firm}.id
        AND batch_crd.identifier_type = 'crd'
        AND batch_crd.identifier_value = batch_public.raw->>'firm_crd'
      WHERE batch_public.firm_id = ${firm}.id
        AND batch_public.source_release_id = '${SEPTEMBER_IAPD_RELEASE_ID}'::uuid
        AND batch_public.source_dataset_id = 'iapd_state_compilation'
        AND batch_public.registration_type = 'STATE_REGISTERED_IA'
        AND batch_public.subject_kind = 'firm'
        AND batch_public.person_id IS NULL
        AND batch_public.status = 'APPROVED'
        AND batch_public.identity_confidence = 'CONFIRMED'
        AND batch_public.is_current = true
        AND batch_public.publication_allowed = true
        AND batch_release.release_label = 'IA_FIRM_STATE_Feed_09_30_2026'
        AND batch_release.checksum_sha256 = '${RELEASE_SHA}'
    )
  )`;
}

export const publicFirmSql = publicFirmCountWhere;

/** Exclude the held batch from the consumer-facing "latest sourced release" summary. */
export function publicReleaseWhere(release = 'rel'): string {
  return `${release}.id <> '${SEPTEMBER_IAPD_RELEASE_ID}'::uuid OR (
    ${release}.release_label = 'IA_FIRM_STATE_Feed_09_30_2026'
    AND ${release}.checksum_sha256 = '${RELEASE_SHA}'
    AND EXISTS (
    SELECT 1 FROM jurisdiction_registrations j
    JOIN firms f ON f.id = j.firm_id
    WHERE j.source_release_id = ${release}.id
      AND j.source_dataset_id = 'iapd_state_compilation'
      AND j.registration_type = 'STATE_REGISTERED_IA'
      AND j.subject_kind = 'firm'
      AND j.person_id IS NULL
      AND j.status = 'APPROVED'
      AND j.identity_confidence = 'CONFIRMED'
      AND j.is_current = true
      AND j.publication_allowed = true
      AND ${publicFirmCountWhere()}
    )
  )`;
}
