import {
  classifyConsumerFirm,
  displayCountry,
  evaluateFirmIndexability,
  firmSlugForCrd,
  formatRaum,
  type ConsumerClassification,
} from '@ith/domain';
import type { FirmRecordRow, FirmSearchHit, FirmTrustReportModel } from './types';

function asIsoDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    return value.toISOString();
  }
  const text = String(value);
  return text.length >= 10 ? text : null;
}

export function mapClassification(row: {
  registration_type: string | null;
  registration_status: string | null;
  source_status_text: string | null;
}): ConsumerClassification | null {
  return classifyConsumerFirm({
    registrationType: row.registration_type,
    registrationStatus: row.registration_status,
    sourceStatusText: row.source_status_text,
  });
}

export function mapFirmReport(row: FirmRecordRow): FirmTrustReportModel | null {
  if (row.is_synthetic) return null;
  const classification = mapClassification(row);
  if (!row.crd || !classification) return null;
  const country = displayCountry(row.country);
  const raum = formatRaum(row.raum_amount);
  const indexability = evaluateFirmIndexability({
    isSynthetic: row.is_synthetic,
    crd: row.crd,
    legalName: row.legal_name,
    displayName: row.display_name,
    classification: classification.class,
    hasCurrentObservation: row.observed === true,
    hasSourceRelease: Boolean(row.release_label),
    evidenceCount: Number(row.evidence_count ?? 0),
    hasSnapshot: Number(row.snapshot_count ?? 0) > 0,
    region: row.region,
    city: row.city,
    postalCode: row.postal_code,
    secFileNumber: row.sec_file_number,
    organizationForm: row.organization_form,
    raumAmount: row.raum_amount,
    website: row.website,
  });
  const hasAnyOffice = Boolean(
    row.address_line_1 || row.city || row.region || row.postal_code || (country.usable && country.code),
  );
  return {
    slug: row.slug || firmSlugForCrd(row.crd),
    displayName: row.display_name,
    legalName: row.legal_name,
    isSynthetic: false,
    classification,
    crd: row.crd,
    secFileNumber: row.sec_file_number,
    office: {
      line1: row.address_line_1,
      line2: row.address_line_2,
      city: row.city,
      region: row.region,
      postalCode: row.postal_code,
      countryCode: country.code,
      countryLabel: country.label,
      countryUsable: country.usable,
      hasAny: hasAnyOffice,
    },
    organizationForm: row.organization_form,
    website: row.website,
    raum: raum ? { exact: raum.exact, display: raum.display } : null,
    datasetKind: row.dataset_kind === 'era' ? 'era' : row.dataset_kind === 'ria' ? 'ria' : null,
    sourceDatasetId: row.source_dataset_id,
    releaseLabel: row.release_label,
    retrievedAt: asIsoDate(row.retrieved_at),
    sourceStatusText: row.source_status_text,
    evidenceCount: Number(row.evidence_count ?? 0),
    hasSnapshot: Number(row.snapshot_count ?? 0) > 0,
    observed: row.observed === true,
    indexability,
    currentlyIndexable: row.search_indexable === true && indexability.trustReportEligible,
    intelligence: null,
  };
}

export function mapSearchHit(row: FirmRecordRow): FirmSearchHit | null {
  const classification = mapClassification(row);
  if (!classification) return null;
  return {
    slug: row.slug,
    displayName: row.display_name,
    legalName: row.legal_name,
    classification,
    crd: row.crd,
    secFileNumber: row.sec_file_number,
    city: row.city,
    region: row.region,
    postalCode: row.postal_code,
    releaseLabel: row.release_label,
    retrievedAt: asIsoDate(row.retrieved_at),
  };
}
