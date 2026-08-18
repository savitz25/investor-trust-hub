import { isValidIdentifierValue } from './identifiers';
import { isUsStateCode, type ConsumerFirmClass } from './firm-classification';

export const INDEXABILITY_REASON_CODES = [
  'synthetic',
  'missing_crd',
  'malformed_crd',
  'missing_name',
  'missing_classification',
  'missing_observation',
  'missing_source_release',
  'missing_evidence',
  'missing_snapshot',
  'insufficient_consumer_content',
  'missing_usable_us_state',
] as const;

export type IndexabilityReasonCode = (typeof INDEXABILITY_REASON_CODES)[number];

export interface FirmIndexabilityInput {
  isSynthetic: boolean;
  crd: string | null;
  legalName: string | null;
  displayName: string | null;
  classification: ConsumerFirmClass | null;
  hasCurrentObservation: boolean;
  hasSourceRelease: boolean;
  evidenceCount: number;
  hasSnapshot: boolean;
  region: string | null;
  city: string | null;
  postalCode: string | null;
  secFileNumber: string | null;
  organizationForm: string | null;
  raumAmount: string | number | null;
  website: string | null;
}

export interface FirmIndexabilityResult {
  decision: 'eligible' | 'not_eligible';
  trustReportEligible: boolean;
  geoDiscoveryEligible: boolean;
  reasonCodes: IndexabilityReasonCode[];
}

function hasText(value: string | null | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

function hasAdditionalConsumerFact(input: FirmIndexabilityInput): boolean {
  return (
    hasText(input.city) ||
    isUsStateCode(input.region) ||
    hasText(input.postalCode) ||
    hasText(input.secFileNumber) ||
    hasText(input.organizationForm) ||
    (input.raumAmount !== null && input.raumAmount !== '') ||
    hasText(input.website)
  );
}

/**
 * Indexability means only that the page contains enough sourced information
 * to justify a useful standalone research result. It is not a quality ranking,
 * endorsement, or recommendation.
 */
export function evaluateFirmIndexability(input: FirmIndexabilityInput): FirmIndexabilityResult {
  const reasonCodes: IndexabilityReasonCode[] = [];

  if (input.isSynthetic) {
    reasonCodes.push('synthetic');
  }
  if (!hasText(input.crd)) {
    reasonCodes.push('missing_crd');
  } else if (!isValidIdentifierValue('crd', input.crd as string)) {
    reasonCodes.push('malformed_crd');
  }
  if (!hasText(input.legalName) && !hasText(input.displayName)) {
    reasonCodes.push('missing_name');
  }
  if (!input.classification) {
    reasonCodes.push('missing_classification');
  }
  if (!input.hasCurrentObservation) {
    reasonCodes.push('missing_observation');
  }
  if (!input.hasSourceRelease) {
    reasonCodes.push('missing_source_release');
  }
  if (input.evidenceCount < 1) {
    reasonCodes.push('missing_evidence');
  }
  if (!input.hasSnapshot) {
    reasonCodes.push('missing_snapshot');
  }
  if (!hasAdditionalConsumerFact(input)) {
    reasonCodes.push('insufficient_consumer_content');
  }

  const blocking = reasonCodes.filter((code) => code !== 'missing_usable_us_state');
  const trustReportEligible = blocking.length === 0;
  const geoDiscoveryEligible = trustReportEligible && isUsStateCode(input.region);
  if (trustReportEligible && !geoDiscoveryEligible) {
    reasonCodes.push('missing_usable_us_state');
  }

  return {
    decision: trustReportEligible ? 'eligible' : 'not_eligible',
    trustReportEligible,
    geoDiscoveryEligible,
    reasonCodes,
  };
}

export const INDEXABILITY_IS_NOT = [
  'trusted',
  'approved',
  'recommended',
  'high quality',
  'safe',
  'preferred',
] as const;
