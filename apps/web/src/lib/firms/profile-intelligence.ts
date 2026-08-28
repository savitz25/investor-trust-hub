import 'server-only';

import {
  TIER1_PUBLIC_FIELDS,
  buildTrustReportV2Snapshot,
  type AdvAttributeRowInput,
  type AdvCrsRow,
  type AdvFilingSummaryRow,
  type AdvFundRowInput,
  type AdvOfficeRowInput,
  type AdvOwnerRowInput,
  type AdvProviderRowInput,
  type AdvRelatedRowInput,
  type AdvRelyingRowInput,
  type AdvWithdrawalRow,
  type TrustReportV2Snapshot,
} from '@ith/domain';
import { getPool } from '../db';

function isoDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value);
  return text.length >= 10 ? text.slice(0, 10) : text;
}

const ATTR_FIELDS = Object.keys(TIER1_PUBLIC_FIELDS);

export async function loadFirmProfileIntelligence(input: {
  firmId: string;
  crd: string;
  slug: string;
  disclosureIndicator: string | null;
}): Promise<TrustReportV2Snapshot> {
  const firmId = input.firmId;
  const client = await getPool().connect();
  try {
    const attributes = await client.query<{
      field_name: string;
      reported_yn: string | null;
      numeric_value: string | number | null;
      text_value: string | null;
      presence_status: string;
      as_of_date: Date | string | null;
    }>(
      `
      SELECT field_name, reported_yn, numeric_value, text_value, presence_status, as_of_date
      FROM form_adv_reported_attributes
      WHERE firm_id = $1 AND is_current = true
        AND field_name = ANY($2::text[])
      `,
      [firmId, ATTR_FIELDS],
    );
    const owners = await client.query<{
      schedule: string;
      owner_kind: string;
      full_legal_name: string | null;
      owner_id: string | null;
      title_or_status: string | null;
      ownership_code: string | null;
      control_person: string | null;
      identity_confidence: string;
      is_current: boolean;
      date_submitted: Date | string | null;
      filing_id: string | null;
      dataset_kind: string | null;
    }>(
      `
      SELECT r.schedule, r.owner_kind, r.full_legal_name, r.owner_id, r.title_or_status,
             r.ownership_code, r.control_person, r.identity_confidence, r.is_current,
             f.date_submitted, f.filing_id, f.dataset_kind
      FROM form_adv_filings f
      JOIN form_adv_schedule_ab_rows r ON r.filing_uuid = f.id
      WHERE f.firm_id = $1 AND f.is_current AND r.is_current
        AND r.identity_confidence IN ('CONFIRMED', 'HIGH_CONFIDENCE')
        AND r.full_legal_name IS NOT NULL AND btrim(r.full_legal_name) <> ''
      LIMIT 200
      `,
      [firmId],
    );
    const related = await client.query<{
      legal_name: string | null;
      related_crd: string | null;
      related_slug: string | null;
      identity_confidence: string;
      is_current: boolean;
      date_submitted: Date | string | null;
      filing_id: string | null;
      dataset_kind: string | null;
    }>(
      `
      SELECT r.legal_name, r.related_crd, rf.slug AS related_slug, r.identity_confidence,
             r.is_current, f.date_submitted, f.filing_id, f.dataset_kind
      FROM form_adv_filings f
      JOIN form_adv_related_person_rows r ON r.filing_uuid = f.id
      LEFT JOIN firms rf ON rf.id = r.related_firm_id AND rf.is_synthetic = false
      WHERE f.firm_id = $1 AND f.is_current AND r.is_current
        AND r.identity_confidence = 'CONFIRMED'
        AND r.related_crd IS NOT NULL AND btrim(r.related_crd) <> ''
        AND r.legal_name IS NOT NULL AND btrim(r.legal_name) <> ''
      LIMIT 100
      `,
      [firmId],
    );
    const funds = await client.query<{
      fund_name: string | null;
      fund_id: string | null;
      state: string | null;
      country: string | null;
      product_id: string | null;
      identity_confidence: string;
      is_current: boolean;
      date_submitted: Date | string | null;
    }>(
      `
      SELECT r.fund_name, r.fund_id, r.state, r.country, r.product_id::text,
             r.identity_confidence, r.is_current, f.date_submitted
      FROM form_adv_filings f
      JOIN form_adv_private_fund_rows r ON r.filing_uuid = f.id
      WHERE f.firm_id = $1 AND f.is_current AND r.is_current
        AND r.identity_confidence = 'CONFIRMED'
        AND r.product_id IS NOT NULL
        AND r.fund_id ~* '^805-[0-9]+$'
        AND r.fund_name IS NOT NULL AND btrim(r.fund_name) <> ''
      LIMIT 100
      `,
      [firmId],
    );
    const providers = await client.query<{
      provider_role: string;
      provider_name: string | null;
      provider_crd: string | null;
      identity_confidence: string;
      is_current: boolean;
      date_submitted: Date | string | null;
    }>(
      `
      SELECT r.provider_role, r.provider_name, r.provider_crd, r.identity_confidence,
             r.is_current, f.date_submitted
      FROM form_adv_filings f
      JOIN form_adv_fund_service_provider_rows r ON r.filing_uuid = f.id
      WHERE f.firm_id = $1 AND f.is_current AND r.is_current
        AND r.identity_confidence IN ('CONFIRMED', 'HIGH_CONFIDENCE')
        AND r.provider_name IS NOT NULL AND btrim(r.provider_name) <> ''
      LIMIT 150
      `,
      [firmId],
    );
    const offices = await client.query<{
      city: string | null;
      region: string | null;
      postal_code: string | null;
      country: string | null;
      branch_number: string | null;
      identity_confidence: string;
      is_current: boolean;
      date_submitted: Date | string | null;
    }>(
      `
      SELECT r.city, r.region, r.postal_code, r.country, r.branch_number,
             r.identity_confidence, r.is_current, f.date_submitted
      FROM form_adv_filings f
      JOIN form_adv_other_office_rows r ON r.filing_uuid = f.id
      WHERE f.firm_id = $1 AND f.is_current AND r.is_current
        AND r.identity_confidence = 'HIGH_CONFIDENCE'
        AND r.branch_number IS NOT NULL AND btrim(r.branch_number) <> ''
      LIMIT 50
      `,
      [firmId],
    );
    const relying = await client.query<{
      legal_name: string | null;
      relying_crd: string | null;
      relying_slug: string | null;
      identity_confidence: string;
      is_current: boolean;
      date_submitted: Date | string | null;
    }>(
      `
      SELECT r.legal_name, r.relying_crd, rf.slug AS relying_slug, r.identity_confidence,
             r.is_current, f.date_submitted
      FROM form_adv_filings f
      JOIN form_adv_relying_adviser_rows r ON r.filing_uuid = f.id
      LEFT JOIN firms rf ON rf.id = r.relying_firm_id AND rf.is_synthetic = false
      WHERE f.firm_id = $1 AND f.is_current AND r.is_current
        AND r.identity_confidence = 'CONFIRMED'
        AND r.relying_crd IS NOT NULL AND btrim(r.relying_crd) <> ''
      LIMIT 50
      `,
      [firmId],
    );
    const filings = await client.query<{
      filing_id: string;
      dataset_kind: string;
      date_submitted: Date | string | null;
      filing_types: string[] | null;
      form_version: string | null;
      is_current: boolean;
    }>(
      `
      SELECT filing_id, dataset_kind, date_submitted, filing_types, form_version, is_current
      FROM form_adv_filings
      WHERE firm_id = $1
      ORDER BY date_submitted DESC NULLS LAST
      LIMIT 12
      `,
      [firmId],
    );
    const filingCounts = await client.query<{ total: number; ria: number; era: number }>(
      `
      SELECT count(*)::int AS total,
             count(*) FILTER (WHERE dataset_kind = 'ria')::int AS ria,
             count(*) FILTER (WHERE dataset_kind = 'era')::int AS era
      FROM form_adv_filings
      WHERE firm_id = $1
      `,
      [firmId],
    );
    const withdrawals = await client.query<{
      filing_id: string;
      filing_type: string | null;
      filing_date: Date | string | null;
    }>(
      `
      SELECT filing_id, filing_type, filing_date
      FROM form_adv_withdrawals
      WHERE firm_id = $1
      ORDER BY filing_date DESC NULLS LAST
      LIMIT 10
      `,
      [firmId],
    );
    const crs = await client.query<{
      official_document_id: string | null;
      official_file_name: string | null;
      submitted_on: Date | string | null;
      source_url: string | null;
    }>(
      `
      SELECT official_document_id, official_file_name, submitted_on, source_url
      FROM form_adv_documents
      WHERE firm_id = $1
        AND document_kind = 'form_crs'
        AND mapped = true
        AND identity_confidence = 'CONFIRMED'
      ORDER BY submitted_on DESC NULLS LAST
      LIMIT 8
      `,
      [firmId],
    );
    const part2a = await client.query<{ n: number }>(
      `
      SELECT count(*)::int AS n
      FROM form_adv_documents
      WHERE firm_id = $1 AND document_kind = 'part2a_brochure' AND mapped = true
      `,
      [firmId],
    );

    const ownerRows: AdvOwnerRowInput[] = owners.rows.map((row) => ({
      schedule: row.schedule,
      ownerKind: row.owner_kind,
      fullLegalName: row.full_legal_name,
      ownerId: row.owner_id,
      titleOrStatus: row.title_or_status,
      ownershipCode: row.ownership_code,
      controlPerson: row.control_person,
      identityConfidence: row.identity_confidence,
      isCurrent: row.is_current,
      dateSubmitted: isoDate(row.date_submitted),
      filingId: row.filing_id,
      datasetKind: row.dataset_kind,
    }));
    const relatedRows: AdvRelatedRowInput[] = related.rows.map((row) => ({
      legalName: row.legal_name,
      relatedCrd: row.related_crd,
      relatedFirmSlug: row.related_slug,
      identityConfidence: row.identity_confidence,
      isCurrent: row.is_current,
      dateSubmitted: isoDate(row.date_submitted),
      filingId: row.filing_id,
      datasetKind: row.dataset_kind,
    }));
    const fundRows: AdvFundRowInput[] = funds.rows.map((row) => ({
      fundName: row.fund_name,
      fundId: row.fund_id,
      state: row.state,
      country: row.country,
      productId: row.product_id,
      identityConfidence: row.identity_confidence,
      isCurrent: row.is_current,
      dateSubmitted: isoDate(row.date_submitted),
    }));
    const providerRows: AdvProviderRowInput[] = providers.rows.map((row) => ({
      role: row.provider_role,
      providerName: row.provider_name,
      providerCrd: row.provider_crd,
      identityConfidence: row.identity_confidence,
      isCurrent: row.is_current,
      dateSubmitted: isoDate(row.date_submitted),
    }));
    const officeRows: AdvOfficeRowInput[] = offices.rows.map((row) => ({
      city: row.city,
      region: row.region,
      postalCode: row.postal_code,
      country: row.country,
      branchNumber: row.branch_number,
      identityConfidence: row.identity_confidence,
      isCurrent: row.is_current,
      dateSubmitted: isoDate(row.date_submitted),
    }));
    const relyingRows: AdvRelyingRowInput[] = relying.rows.map((row) => ({
      legalName: row.legal_name,
      relyingCrd: row.relying_crd,
      relyingFirmSlug: row.relying_slug,
      identityConfidence: row.identity_confidence,
      isCurrent: row.is_current,
      dateSubmitted: isoDate(row.date_submitted),
    }));
    const attrRows: AdvAttributeRowInput[] = attributes.rows.map((row) => ({
      fieldName: row.field_name,
      reportedYn: row.reported_yn,
      numericValue: row.numeric_value,
      textValue: row.text_value,
      presenceStatus: row.presence_status,
      asOfDate: isoDate(row.as_of_date),
    }));
    const filingRows: AdvFilingSummaryRow[] = filings.rows.map((row) => ({
      filingId: row.filing_id,
      datasetKind: row.dataset_kind,
      dateSubmitted: isoDate(row.date_submitted),
      filingTypes: row.filing_types ?? [],
      formVersion: row.form_version,
      isCurrent: row.is_current,
    }));
    const withdrawalRows: AdvWithdrawalRow[] = withdrawals.rows.map((row) => ({
      filingId: row.filing_id,
      filingType: row.filing_type,
      filingDate: isoDate(row.filing_date),
    }));
    const crsRows: AdvCrsRow[] = crs.rows.map((row) => ({
      officialDocumentId: row.official_document_id,
      officialFileName: row.official_file_name,
      submittedOn: isoDate(row.submitted_on),
      sourceUrl: row.source_url,
    }));
    const counts = filingCounts.rows[0];

    return buildTrustReportV2Snapshot({
      crd: input.crd,
      slug: input.slug,
      wave1: true,
      disclosureIndicator: input.disclosureIndicator,
      attributes: attrRows,
      owners: ownerRows,
      related: relatedRows,
      funds: fundRows,
      providers: providerRows,
      offices: officeRows,
      relying: relyingRows,
      filings: filingRows,
      filingsTotal: counts?.total ?? 0,
      filingsRia: counts?.ria ?? 0,
      filingsEra: counts?.era ?? 0,
      withdrawals: withdrawalRows,
      crs: crsRows,
      part2aCount: part2a.rows[0]?.n ?? 0,
      hiddenReviewRequired: { owners: 0, related: 0, funds: 0, serviceProviders: 0 },
    });
  } finally {
    client.release();
  }
}
