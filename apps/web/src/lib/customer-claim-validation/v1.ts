import "server-only";

import {
  INVESTOR_CLAIM_VALIDATION_CONTRACT,
  INVESTOR_CLAIM_VALIDATION_CONTRACT_FINGERPRINT,
  INVESTOR_CLAIM_VALIDATION_SCHEMA_FINGERPRINT,
  INVESTOR_CLAIM_VALIDATION_VERSION,
  investorClaimValidationRequestSchema,
  type InvestorClaimValidationResultState,
} from "@ith/domain";
import { getFirmForClaimValidation } from "@/lib/firms/repository";
import { getOfficialFirmClaimProfile } from "@/lib/firms/repository";

const PUBLIC_ORIGIN = "https://www.investortrusthub.com";

export type InvestorClaimValidationEnvelope = {
  contract: typeof INVESTOR_CLAIM_VALIDATION_CONTRACT;
  contractVersion: typeof INVESTOR_CLAIM_VALIDATION_VERSION;
  schemaFingerprint: typeof INVESTOR_CLAIM_VALIDATION_SCHEMA_FINGERPRINT;
  contractFingerprint: typeof INVESTOR_CLAIM_VALIDATION_CONTRACT_FINGERPRINT;
  hub: "investor";
  entityType: "firm";
  resultState: InvestorClaimValidationResultState;
  errorCode?: string;
  message?: string;
  nativeProfileId: string | null;
  firmCrd: string | null;
  displayName: string | null;
  publicationState:
    | "PUBLIC_CURRENT"
    | "RESEARCH_ONLY"
    | "UNPUBLISHED"
    | "UNKNOWN";
  current: boolean;
  canonicalProfileUrl: string | null;
  regulatoryStatus: { firmClass: "ria" | "era"; label: string } | null;
  limitations: string[];
};

const LIMITATIONS = [
  "This contract validates an exact public firm profile; it does not verify customer ownership or control.",
  "RIA and ERA are regulatory evidence on one canonical firm identity, not separate customer profiles.",
  "Registration is not endorsement, RAUM is not performance, and compensation method is not an exact fee.",
  "Individual investment-adviser representatives are not claimable.",
];

function base(
  resultState: InvestorClaimValidationResultState,
): InvestorClaimValidationEnvelope {
  return {
    contract: INVESTOR_CLAIM_VALIDATION_CONTRACT,
    contractVersion: INVESTOR_CLAIM_VALIDATION_VERSION,
    schemaFingerprint: INVESTOR_CLAIM_VALIDATION_SCHEMA_FINGERPRINT,
    contractFingerprint: INVESTOR_CLAIM_VALIDATION_CONTRACT_FINGERPRINT,
    hub: "investor",
    entityType: "firm",
    resultState,
    nativeProfileId: null,
    firmCrd: null,
    displayName: null,
    publicationState: "UNKNOWN",
    current: false,
    canonicalProfileUrl: null,
    regulatoryStatus: null,
    limitations: LIMITATIONS,
  };
}

export async function getClaimableInvestorFirm(slug: string) {
  const firm = await getOfficialFirmClaimProfile(slug);
  if (!firm) return null;
  const result = await validateInvestorFirmClaim({
    contract: INVESTOR_CLAIM_VALIDATION_CONTRACT,
    entityType: "firm",
    nativeProfileId: firm.nativeProfileId,
    firmCrd: firm.report.crd,
    canonicalProfileUrl: `${PUBLIC_ORIGIN}/firm/${encodeURIComponent(firm.report.slug)}`,
  });
  return result.resultState === "EXACT_IDENTITY" ? result : null;
}

export function claimValidationError(
  resultState: Exclude<InvestorClaimValidationResultState, "EXACT_IDENTITY">,
  errorCode: string,
  message: string,
): InvestorClaimValidationEnvelope {
  return { ...base(resultState), errorCode, message };
}

function exactCanonicalUrl(slug: string): string {
  return `${PUBLIC_ORIGIN}/firm/${encodeURIComponent(slug)}`;
}

export async function validateInvestorFirmClaim(
  input: unknown,
): Promise<InvestorClaimValidationEnvelope> {
  const parsed = investorClaimValidationRequestSchema.safeParse(input);
  if (!parsed.success) {
    return claimValidationError(
      "INVALID_QUERY",
      "invalid_claim_validation_request",
      parsed.error.issues.map((issue) => issue.message).join(" "),
    );
  }
  const request = parsed.data;
  if (request.entityType === "representative") {
    return claimValidationError(
      "PUBLICATION_RESTRICTED",
      "representative_claim_not_allowed",
      "Investor customer claims are firm-only. Individual representatives are not claimable.",
    );
  }
  const firm = await getFirmForClaimValidation(
    request.nativeProfileId,
    request.firmCrd,
  );
  if (!firm) {
    return claimValidationError(
      "NO_CONFIDENT_MATCH",
      "firm_identity_mismatch",
      "The native firm identity and organization CRD did not resolve to one exact canonical firm.",
    );
  }
  const canonicalProfileUrl = exactCanonicalUrl(firm.report.slug);
  if (request.canonicalProfileUrl !== canonicalProfileUrl) {
    return claimValidationError(
      "NO_CONFIDENT_MATCH",
      "canonical_destination_mismatch",
      "The supplied destination does not match the exact canonical public firm profile.",
    );
  }
  if (!firm.report.currentlyIndexable) {
    return {
      ...claimValidationError(
        "PUBLICATION_RESTRICTED",
        "firm_not_public_current",
        "The exact firm exists, but it is not currently eligible as a public claimable profile.",
      ),
      publicationState: firm.report.observed ? "RESEARCH_ONLY" : "UNPUBLISHED",
    };
  }
  return {
    ...base("EXACT_IDENTITY"),
    nativeProfileId: firm.nativeProfileId,
    firmCrd: firm.report.crd,
    displayName: firm.report.displayName,
    publicationState: "PUBLIC_CURRENT",
    current: firm.report.observed,
    canonicalProfileUrl,
    regulatoryStatus: {
      firmClass:
        firm.report.classification.class === "exempt_reporting_adviser"
          ? "era"
          : "ria",
      label: firm.report.classification.headline,
    },
  };
}
