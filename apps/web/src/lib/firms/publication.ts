/** September 30 IAPD state-firm release. Legacy firms retain their existing gate. */
export const B1_STATE_RELEASE_ID = 'a89165b8-b60a-4b31-9009-8b2a0291f8f8';
export const B1_STATE_SOURCE_SHA = '23cdfeba5d68d8dce93137ec76e91e26960abc2edaca1d57852373ef8e5f9a5c';

function certifiedStateRegistration(alias: string, firmAlias: string): string {
  return `${alias}.firm_id = ${firmAlias}.id
    AND ${alias}.source_release_id = '${B1_STATE_RELEASE_ID}'::uuid
    AND ${alias}.source_dataset_id = 'iapd_state_compilation'
    AND ${alias}.registration_type = 'STATE_REGISTERED_IA'
    AND ${alias}.subject_kind = 'firm'
    AND ${alias}.person_id IS NULL
    AND ${alias}.status = 'APPROVED'
    AND ${alias}.identity_confidence = 'CONFIRMED'
    AND EXISTS (
      SELECT 1 FROM firm_identifiers b1_crd
      WHERE b1_crd.firm_id = ${firmAlias}.id
        AND b1_crd.identifier_type = 'crd'
        AND b1_crd.identifier_value = ${alias}.raw->>'firm_crd'
    )
    AND EXISTS (
      SELECT 1 FROM source_releases b1_release
      WHERE b1_release.id = ${alias}.source_release_id
        AND b1_release.release_label = 'IA_FIRM_STATE_Feed_09_30_2026'
        AND b1_release.checksum_sha256 = '${B1_STATE_SOURCE_SHA}'
    )`;
}

export function publishedStateRegistrationSql(alias: string, firmAlias = 'f'): string {
  return `${certifiedStateRegistration(alias, firmAlias)}
    AND ${alias}.publication_allowed = true
    AND ${alias}.is_current = true`;
}

/** Keep all legacy non-synthetic firms; gate only the B1-created cohort. */
export function publicFirmSql(firmAlias = 'f'): string {
  return `${firmAlias}.is_synthetic = false AND (
    NOT EXISTS (
      SELECT 1 FROM jurisdiction_registrations b1_marker
      WHERE b1_marker.firm_id = ${firmAlias}.id
        AND b1_marker.source_release_id = '${B1_STATE_RELEASE_ID}'::uuid
        AND b1_marker.source_dataset_id = 'iapd_state_compilation'
        AND b1_marker.raw->>'b1_created_firm' = 'true'
    )
    OR EXISTS (
      SELECT 1 FROM jurisdiction_registrations b1_public
      WHERE ${publishedStateRegistrationSql('b1_public', firmAlias)}
        AND b1_public.raw->>'b1_created_firm' = 'true'
    )
  )`;
}
