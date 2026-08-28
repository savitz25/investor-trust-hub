import type { ConsumerClassification, FirmIndexabilityResult, TrustReportV2Snapshot } from '@ith/domain';

export interface FirmRecordRow {
  id: string;
  slug: string;
  legal_name: string;
  display_name: string;
  is_synthetic: boolean;
  current_as_of: Date | string | null;
  crd: string | null;
  sec_file_number: string | null;
  registration_type: string | null;
  registration_status: string | null;
  source_status_text: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  country: string | null;
  organization_form: string | null;
  website: string | null;
  raum_amount: string | number | null;
  disclosure_indicator: string | null;
  dataset_kind: string | null;
  source_dataset_id: string | null;
  release_label: string | null;
  retrieved_at: Date | string | null;
  evidence_count: number | string;
  snapshot_count: number | string;
  observed: boolean | null;
  search_indexable: boolean | null;
}

export interface FirmSearchHit {
  slug: string;
  displayName: string;
  legalName: string;
  classification: ConsumerClassification;
  crd: string | null;
  secFileNumber: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  releaseLabel: string | null;
  retrievedAt: string | null;
}

export interface FirmDirectoryMetrics {
  officialFirms: number;
  riaRegistered: number;
  riaPending: number;
  eraReporting: number;
  latestReleaseLabel: string | null;
  latestRetrievedAt: string | null;
}

export interface FirmTrustReportModel {
  slug: string;
  displayName: string;
  legalName: string;
  isSynthetic: boolean;
  classification: ConsumerClassification;
  crd: string;
  secFileNumber: string | null;
  office: {
    line1: string | null;
    line2: string | null;
    city: string | null;
    region: string | null;
    postalCode: string | null;
    countryCode: string | null;
    countryLabel: string;
    countryUsable: boolean;
    hasAny: boolean;
  };
  organizationForm: string | null;
  website: string | null;
  raum: { exact: string; display: string } | null;
  datasetKind: 'ria' | 'era' | null;
  sourceDatasetId: string | null;
  releaseLabel: string | null;
  retrievedAt: string | null;
  sourceStatusText: string | null;
  evidenceCount: number;
  hasSnapshot: boolean;
  observed: boolean;
  indexability: FirmIndexabilityResult;
  currentlyIndexable: boolean;
  intelligence: TrustReportV2Snapshot | null;
}
