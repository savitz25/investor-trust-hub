import "server-only";

import type { ParsedFirmSearch } from "@ith/domain";
import { query } from "../db";
import { mapFirmReport, mapSearchHit } from "./map-report";
import { loadFirmProfileIntelligence } from "./profile-intelligence";
import type {
  ClaimValidationFirm,
  FirmDirectoryMetrics,
  FirmRecordRow,
  FirmSearchHit,
  FirmTrustReportModel,
} from "./types";

const FIRM_SELECT = `
  SELECT
    f.id,
    f.slug,
    f.legal_name,
    f.display_name,
    f.is_synthetic,
    f.current_as_of,
    crd.identifier_value AS crd,
    sec.identifier_value AS sec_file_number,
    r.registration_type,
    r.status AS registration_status,
    r.source_status_text,
    b.address_line_1,
    b.address_line_2,
    b.city,
    b.region,
    b.postal_code,
    b.country,
    adv.organization_form,
    adv.website,
    adv.raum_amount,
    adv.disclosure_indicator,
    adv.dataset_kind,
    adv.source_dataset_id,
    rel.release_label,
    rel.retrieved_at,
    (
      SELECT count(*) FROM evidence_records e
      WHERE e.subject_id = f.id AND e.subject_kind = 'firm'
    ) AS evidence_count,
    (
      SELECT count(*) FROM source_snapshots s
      WHERE s.subject_id = f.id AND s.subject_kind = 'firm'
    ) AS snapshot_count,
    obs.observed,
    sd.indexable AS search_indexable
  FROM firms f
  LEFT JOIN firm_identifiers crd
    ON crd.firm_id = f.id AND crd.identifier_type = 'crd'
  LEFT JOIN firm_identifiers sec
    ON sec.firm_id = f.id AND sec.identifier_type = 'sec_file_number'
  LEFT JOIN registrations r
    ON r.firm_id = f.id AND r.subject_kind = 'firm'
  LEFT JOIN branches b
    ON b.firm_id = f.id AND b.is_main_office
  LEFT JOIN form_adv_firm_facts adv
    ON adv.firm_id = f.id
  LEFT JOIN source_releases rel
    ON rel.id = adv.source_release_id
  LEFT JOIN firm_source_observations obs
    ON obs.firm_id = f.id AND obs.source_release_id = adv.source_release_id
  LEFT JOIN search_documents sd
    ON sd.entity_id = f.id AND sd.entity_kind = 'firm'
`;

export async function getOfficialFirmIndexable(slug: string): Promise<boolean> {
  const result = await query<{ indexable: boolean }>(
    `
    SELECT sd.indexable
    FROM firms f
    JOIN search_documents sd ON sd.entity_id = f.id AND sd.entity_kind = 'firm'
    WHERE f.slug = $1 AND f.is_synthetic = false
    LIMIT 1
    `,
    [slug],
  );
  return result.rows[0]?.indexable === true;
}

export async function getOfficialFirmBySlug(
  slug: string,
): Promise<FirmTrustReportModel | null> {
  const result = await query<FirmRecordRow>(
    `${FIRM_SELECT} WHERE f.slug = $1 AND f.is_synthetic = false LIMIT 1`,
    [slug],
  );
  const row = result.rows[0];
  const report = row ? mapFirmReport(row) : null;
  if (!report || !row) return report;
  if (!report.currentlyIndexable) return report;
  try {
    report.intelligence = await loadFirmProfileIntelligence({
      firmId: row.id,
      crd: report.crd,
      slug: report.slug,
      disclosureIndicator: row.disclosure_indicator,
    });
  } catch (error) {
    console.error(
      "profile_intelligence_failed",
      report.slug,
      error instanceof Error ? error.message : error,
    );
  }
  return report;
}

export async function getFirmForClaimValidation(
  nativeProfileId: string,
  firmCrd: string,
): Promise<ClaimValidationFirm | null> {
  const result = await query<FirmRecordRow>(
    `${FIRM_SELECT}
     WHERE f.id = $1::uuid
       AND crd.identifier_value = $2
       AND f.is_synthetic = false
     LIMIT 1`,
    [nativeProfileId, firmCrd],
  );
  const row = result.rows[0];
  if (!row) return null;
  const report = mapFirmReport(row);
  return report ? { nativeProfileId: row.id, report } : null;
}

export async function getOfficialFirmClaimProfile(
  slug: string,
): Promise<ClaimValidationFirm | null> {
  const result = await query<FirmRecordRow>(
    `${FIRM_SELECT} WHERE f.slug = $1 AND f.is_synthetic = false LIMIT 1`,
    [slug],
  );
  const row = result.rows[0];
  if (!row) return null;
  const report = mapFirmReport(row);
  return report ? { nativeProfileId: row.id, report } : null;
}

export async function searchOfficialFirms(
  parsed: ParsedFirmSearch,
  pageSize = 20,
): Promise<{ hits: FirmSearchHit[]; total: number; elapsedMs: number }> {
  const started = performance.now();
  const offset = (parsed.page - 1) * pageSize;
  const q = parsed.q;
  const like = q ? `%${q.replace(/[%_]/g, "\\$&")}%` : "%";
  const prefix = q ? `${q.replace(/[%_]/g, "\\$&")}%` : "%";
  const params: unknown[] = [
    q,
    like,
    prefix,
    parsed.exactCrd,
    parsed.exactSecFile,
    parsed.state,
    parsed.stateNone,
  ];
  const where = `
    f.is_synthetic = false
    AND (
      $1::text = ''
      OR crd.identifier_value = $4::text
      OR sec.identifier_value = $5::text
      OR lower(f.display_name) LIKE lower($2::text)
      OR lower(f.legal_name) LIKE lower($2::text)
      OR lower(coalesce(b.city, '')) LIKE lower($2::text)
      OR replace(coalesce(b.postal_code, ''), ' ', '') = replace($1::text, ' ', '')
      OR ($1::text <> '' AND f.display_name % $1::text)
    )
    AND (
      $6::text IS NULL AND $7::boolean = false
      OR ($7::boolean = true AND (b.region IS NULL OR btrim(b.region) = ''))
      OR ($6::text IS NOT NULL AND b.region = $6::text)
    )
    AND length($3::text) >= 0
  `;
  const countSql = `
    SELECT count(*)::int AS n
    FROM firms f
    LEFT JOIN firm_identifiers crd ON crd.firm_id = f.id AND crd.identifier_type = 'crd'
    LEFT JOIN firm_identifiers sec ON sec.firm_id = f.id AND sec.identifier_type = 'sec_file_number'
    LEFT JOIN branches b ON b.firm_id = f.id AND b.is_main_office
    WHERE ${where}
  `;
  const listSql = `
    ${FIRM_SELECT}
    WHERE ${where}
    ORDER BY
      CASE
        WHEN $4::text IS NOT NULL AND crd.identifier_value = $4::text THEN 0
        WHEN $5::text IS NOT NULL AND sec.identifier_value = $5::text THEN 1
        WHEN $1::text <> '' AND lower(f.display_name) = lower($1::text) THEN 2
        WHEN $1::text <> '' AND lower(f.legal_name) = lower($1::text) THEN 2
        WHEN $1::text <> '' AND lower(f.display_name) LIKE lower($3::text) THEN 3
        WHEN $1::text <> '' AND lower(f.legal_name) LIKE lower($3::text) THEN 3
        ELSE 4
      END,
      CASE WHEN $1::text <> '' THEN similarity(f.display_name, $1::text) ELSE 0 END DESC,
      f.display_name ASC
    LIMIT ${pageSize} OFFSET ${offset}
  `;
  const countResult = await query<{ n: number }>(countSql, params);
  const listResult = await query<FirmRecordRow>(listSql, params);
  const hits = listResult.rows
    .map((row) => mapSearchHit(row))
    .filter((hit): hit is FirmSearchHit => hit !== null);
  return {
    hits,
    total: countResult.rows[0]?.n ?? 0,
    elapsedMs: Math.round(performance.now() - started),
  };
}

export async function getFirmDirectoryMetrics(): Promise<FirmDirectoryMetrics> {
  const result = await query<{
    official_firms: number;
    ria_registered: number;
    ria_pending: number;
    era_reporting: number;
    latest_release_label: string | null;
    latest_retrieved_at: Date | string | null;
  }>(`
    SELECT
      (SELECT count(*)::int FROM firms WHERE is_synthetic = false) AS official_firms,
      (SELECT count(*)::int FROM registrations
        WHERE is_synthetic = false AND registration_type = 'registered_investment_adviser' AND status = 'registered')
        AS ria_registered,
      (SELECT count(*)::int FROM registrations
        WHERE is_synthetic = false AND registration_type = 'registered_investment_adviser' AND status = 'pending')
        AS ria_pending,
      (SELECT count(*)::int FROM registrations
        WHERE is_synthetic = false AND registration_type = 'exempt_reporting_adviser')
        AS era_reporting,
      (SELECT release_label FROM source_releases ORDER BY retrieved_at DESC NULLS LAST LIMIT 1) AS latest_release_label,
      (SELECT retrieved_at FROM source_releases ORDER BY retrieved_at DESC NULLS LAST LIMIT 1) AS latest_retrieved_at
  `);
  const row = result.rows[0];
  const retrieved = row?.latest_retrieved_at;
  return {
    officialFirms: row?.official_firms ?? 0,
    riaRegistered: row?.ria_registered ?? 0,
    riaPending: row?.ria_pending ?? 0,
    eraReporting: row?.era_reporting ?? 0,
    latestReleaseLabel: row?.latest_release_label ?? null,
    latestRetrievedAt:
      retrieved instanceof Date
        ? retrieved.toISOString()
        : retrieved
          ? String(retrieved)
          : null,
  };
}

export async function listIndexableFirmSlugs(
  limit = 10_000,
  offset = 0,
): Promise<string[]> {
  const result = await query<{ slug: string }>(
    `
    SELECT f.slug
    FROM firms f
    JOIN search_documents sd ON sd.entity_id = f.id AND sd.entity_kind = 'firm'
    WHERE f.is_synthetic = false AND sd.indexable = true
    ORDER BY f.slug
    LIMIT $1 OFFSET $2
    `,
    [limit, offset],
  );
  return result.rows.map((row) => row.slug);
}

export async function countIndexableFirms(): Promise<number> {
  const result = await query<{ n: number }>(`
    SELECT count(*)::int AS n
    FROM firms f
    JOIN search_documents sd ON sd.entity_id = f.id AND sd.entity_kind = 'firm'
    WHERE f.is_synthetic = false AND sd.indexable = true
  `);
  return result.rows[0]?.n ?? 0;
}
