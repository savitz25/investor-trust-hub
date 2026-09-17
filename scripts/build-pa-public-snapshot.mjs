/**
 * PA-INV-001 — deterministic public snapshot.
 * Pennsylvania state IA is selected by IAPD registration jurisdiction, not address.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalJson } from './co-canonical-json.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const census = JSON.parse(readFileSync(join(root, 'data/pennsylvania/pa-inv-001/iapd-pa-census.json'), 'utf8'));
const dobs = JSON.parse(readFileSync(join(root, 'data/pennsylvania/pa-inv-001/dobs-enforcement-coverage.json'), 'utf8'));

const PA_PRINCIPAL_OFFICE = 623;
const ROSTER_WITH_REGION = 17997;
const ROSTER_NULL_REGION = 5625;
const RIA = 17018;
const ERA = 6604;
const TOTAL = 23622;
const CANONICAL = 25777;
const STATE_IA_ROWS = census.state.co_state_ia_registration_rows;
const STATE_IA_CRD = census.state.co_state_ia_distinct_crd;
const STATE_IA_APPROVED = census.state.co_state_ia_approved_distinct_crd;
const STATE_IA_TERMREQUEST = census.state.co_state_ia_termrequest_distinct_crd;
const STATE_ERA_ROWS = census.state.co_state_era_registration_rows;
const STATE_ERA_CRD = census.state.co_state_era_distinct_crd;
const STATE_ERA_ACTIVE = census.state.co_state_era_active_distinct_crd;
const NOTICE_FILED = census.sec.co_notice_filed_distinct_crd;
const NOTICE_ROWS = census.sec.co_notice_rows;
const OVERLAP_IA_NOTICE = census.overlaps.state_ia_approved_and_notice_filed;

if (!String(census.state.filter).includes('Rgltr/@Cd=PA')) {
  throw new Error('Pennsylvania state IA filter must use Rgltr/@Cd=PA');
}
if (STATE_IA_APPROVED === PA_PRINCIPAL_OFFICE) {
  throw new Error('Do not use the principal-office overlay as the state-IA firm denominator');
}
if (census.contract !== 'investor-pa-iapd-census-v1') {
  throw new Error('Pennsylvania census contract drifted');
}

const snapshot = {
  version: 'investor-pa-state-intel-v1',
  generatedFrom: {
    nationalRoster: 'packages/domain/src/investor-home-intel.ts V1_ROSTER_PRINCIPAL_OFFICE_STATES + V1_SEC_ROSTER',
    iapdStateCensus: 'data/pennsylvania/pa-inv-001/iapd-pa-census.json',
    dobsEnforcement: 'data/pennsylvania/pa-inv-001/dobs-enforcement-coverage.json',
  },
  asOf: '2026-09-17',
  publicationGate: 'ON',
  publicEligibility: 'state_page',
  route: '/pennsylvania',
  growthClassification: 'INTELLIGENCE_GROWTH_HEAVY',
  uiGrains: {
    stateIa: 'VISIBLE_PUBLIC_METRIC',
    stateEra: 'VISIBLE_PUBLIC_METRIC',
    notice: 'VISIBLE_PUBLIC_METRIC',
    principalOffice: 'VISIBLE_PUBLIC_METRIC',
    overlapApprovedStateIaNotice: 'VISIBLE_SUPPORTING_CONTEXT',
    sosEnforcement: 'VISIBLE_SUPPORTING_CONTEXT',
    iarPersonUniverse: 'INTERNAL_DIAGNOSTIC_ONLY',
  },
  nationalOverlay: {
    paPrincipalOfficeSecIardFirms: PA_PRINCIPAL_OFFICE,
    grain: 'SEC IARD roster firm with principal-office region = PA',
    source: 'IA_FIRM_SEC_Feed_08_27_2026 (reconciled V1 roster geography)',
    sourceAsOf: '2026-08-27',
    publishedAt: '2026-08-27',
    retrievedAt: '2026-08-28',
    snapshotAsOf: '2026-08-27',
    universe: TOTAL,
    resolvedPrincipalOfficeRegions: ROSTER_WITH_REGION,
    unresolvedPrincipalOfficeRegions: ROSTER_NULL_REGION,
    shareOfResolvedRegionsPct: Number(((100 * PA_PRINCIPAL_OFFICE) / ROSTER_WITH_REGION).toFixed(2)),
    searchHref: '/firms?state=PA',
    rawCompilationMainAddrPa: census.sec.co_principal_office_distinct_crd,
    rawCompilationSource: 'IA_FIRM_SEC_Feed_09_17_2026 MainAddr/@State=PA',
    label: 'SEC/IARD roster firms with a Pennsylvania principal office',
    caveat:
      'This is the national SEC/IARD roster overlay for firms that report a Pennsylvania principal office on the reconciled 23,622-firm geography table (PA = 623). It is not the Pennsylvania state-registered adviser universe, not a federal-covered notice-filing count, and not proof of current DoBS authority. PENNSYLVANIA PRINCIPAL OFFICE != PENNSYLVANIA STATE REGISTRATION. These 623 firms already exist in the federal graph and are not net-new organizations. The raw 2026-09-17 compilation MainAddr=@State=PA count is a different extract (628) and is not this overlay.',
  },
  riaEra: {
    nationalRiaFacts: RIA,
    nationalEraFacts: ERA,
    nationalTotalFacts: TOTAL,
    paPrincipalOfficeSplit: 'SOURCE_NOT_SPLIT',
    caveat:
      'National roster keeps RIA (17,018) and ERA (6,604) separate. Committed geography is on the combined roster. Pennsylvania principal-office counts are not an RIA-only or ERA-only state denominator. ERA is not an RIA. SEC RIA is not a Pennsylvania state RIA.',
  },
  firmMarket: {
    raumBandsByPennsylvaniaPrincipalOffice: 'SOURCE_NOT_SPLIT',
    note: 'National RIA RAUM bands exist on the federal spine. This snapshot does not invent a Pennsylvania-only size ranking. A Pennsylvania principal office is not Pennsylvania registration.',
  },
  stateRia: {
    STATE_RIA_BULK_ROSTER: 'ACQUIRED_IAPD_STATE_COMPILATION',
    access: 'ACQUIRED',
    completeStateRiaCount: STATE_IA_APPROVED,
    registrationRows: STATE_IA_ROWS,
    distinctFirmCrd: STATE_IA_CRD,
    approvedDistinctCrd: STATE_IA_APPROVED,
    termrequestDistinctCrd: STATE_IA_TERMREQUEST,
    filter: 'StateRgstn/Rgltr/@Cd=PA (registration jurisdiction). Not MainAddr/@State.',
    currentness: 'APPROVED = current state IA in this compilation. TERMREQUEST is not approved current.',
    source: 'IA_FIRM_STATE_Feed_09_17_2026',
    sourceAsOf: '2026-09-17',
    publishedAt: '2026-09-17',
    retrievedAt: '2026-09-17T15:15:00Z',
    snapshotAsOf: '2026-09-17',
    checksumSha256: census.state.sha256,
    releaseLabel: 'IA_FIRM_STATE_Feed_09_17_2026',
    officialUrl: 'https://reports.adviserinfo.sec.gov/reports/CompilationReports/IA_FIRM_STATE_Feed_09_17_2026.xml.gz',
    sosSearch: 'OPEN_SEARCH_ONLY',
    verifyUrl: 'https://adviserinfo.sec.gov/',
    sosHomeUrl: 'https://www.pa.gov/agencies/dobs/securities',
    sosRegistrationSearchUrl: 'https://pa.gov/agencies/dobs/securities/securities-registration-office',
    sosAdminActionsUrl: 'https://www.pa.gov/agencies/dobs/enforcement-orders',
    iapdUrl: 'https://adviserinfo.sec.gov/',
    brokercheckUrl: 'https://brokercheck.finra.org/',
    label: 'Pennsylvania state-registered investment-adviser firms',
    caveat:
      'IAPD state compilation firms with Pennsylvania as the registration jurisdiction and status APPROVED. This is IARD-derived state registration evidence used by DoBS. It is not an SEC RIA count, not a federal-covered notice-filing count, not an ERA count, not a broker-dealer count, and not the 623 principal-office overlay. Duplicate/multi-jurisdiction rows were collapsed to distinct firm CRD. State-only CRDs were not minted as public SEC firm profiles. DoBS mixed securities-class totals exceeding 200,000 are not this grain.',
  },
  stateEra: {
    STATE_ERA_REPORTING: 'ACQUIRED_IAPD_STATE_COMPILATION',
    registrationRows: STATE_ERA_ROWS,
    distinctFirmCrd: STATE_ERA_CRD,
    activeDistinctCrd: STATE_ERA_ACTIVE,
    overlapWithStateIa: census.state.ia_era_overlap_distinct_crd,
    filter: 'ERA/Rgltr/@Cd=PA (reporting jurisdiction). Not address. Not StateRgstn.',
    source: 'IA_FIRM_STATE_Feed_09_17_2026',
    sourceAsOf: '2026-09-17',
    retrievedAt: '2026-09-17T15:15:00Z',
    label: 'Pennsylvania state ERA reporting firms',
    caveat: 'State ERA reporting is not a Pennsylvania state RIA and is not an SEC RIA. Overlap with state IA is zero in this extract.',
  },
  federalNotice: {
    FEDERAL_COVERED_NOTICE_ROSTER: 'ACQUIRED_IAPD_SEC_COMPILATION',
    access: 'ACQUIRED',
    noticeRows: NOTICE_ROWS,
    noticeFiledDistinctCrd: NOTICE_FILED,
    noticeStatus: 'FILED',
    filter: 'NoticeFiled/States/@RgltrCd=PA',
    source: 'IA_FIRM_SEC_Feed_09_17_2026',
    sourceAsOf: '2026-09-17',
    publishedAt: '2026-09-17',
    retrievedAt: '2026-09-17T15:15:00Z',
    snapshotAsOf: '2026-09-17',
    overlapApprovedStateIa: OVERLAP_IA_NOTICE,
    overlapApprovedStateIaJoinMethod: census.overlaps.state_ia_approved_and_notice_filed_joinMethod,
    overlapApprovedStateIaCrds: census.overlaps.state_ia_approved_and_notice_filed_crds,
    overlapApprovedStateIaReading:
      'Credential classes remain separate. Exact firm CRDs that appear in both APPROVED Pennsylvania StateRgstn and FILED Pennsylvania NoticeFiled are listed; neither grain is discarded or summed.',
    overlapEraNotice: census.overlaps.state_era_and_notice_filed,
    filedFirmType: census.sec.co_notice_filed_firm_type,
    label: 'SEC/IARD firms with a Pennsylvania notice filing',
    caveat:
      'Federal-covered / notice-filed is not Pennsylvania state-RIA licensure. Notice-filed is not the 623 principal-office overlay. A Pennsylvania principal office does not prove a current notice filing.',
  },
  iar: {
    IA_INDVL_FEED: 'ACQUIRED_NATIONAL_FEED',
    pennsylvaniaPersonDirectory: 'NOT_PUBLISHED',
    PA_IAR_ROSTER_STATUS: 'OPEN_SEARCH_ONLY',
    access: 'OPEN_SEARCH_ONLY',
    completeIarCount: 'UNKNOWN',
    grain: 'person CRD (not firm CRD)',
    source: 'IA_INDVL_Feed_08_27_2026',
    sourceAsOf: '2026-08-27',
    retrievedAt: '2026-08-28',
    verifyUrl: 'https://adviserinfo.sec.gov/',
    caveat:
      'The national IAR compilation exists. This ticket does not publish a Pennsylvania person directory. IAR is not the firm. Search V1 remains firm-focused. Complete Pennsylvania IAR universe is UNKNOWN, not zero.',
  },
  brokerDealer: {
    PA_BD_BULK_ROSTER: 'SOURCE_NOT_ACQUIRED',
    PA_AGENT_BULK_ROSTER: 'SOURCE_NOT_ACQUIRED',
    access: 'OPEN_SEARCH_ONLY',
    completeDealerCount: 'UNKNOWN',
    completeAgentCount: 'UNKNOWN',
    verifyUrl: 'https://brokercheck.finra.org/',
    caveat:
      'Broker-dealer is not an investment adviser. Registered representative is not an IAR. DoBS also licenses broker-dealers and agents; those classes are not added to IA counts. BrokerCheck is not scraped. Search-only is not zero.',
  },
  sosFramework: {
    regulator: 'Pennsylvania Department of Banking and Securities (DoBS)',
    notDfi: true,
    ruleCitation: 'Pennsylvania Securities Act of 1972, 70 P.S. § 1-101 et seq.; 10 Pa. Code',
    officialHomeUrl: 'https://www.pa.gov/agencies/dobs/securities',
    officialRegistrationSearchUrl: 'https://pa.gov/agencies/dobs/securities/securities-registration-office',
    officialAdminActionsUrl: 'https://www.pa.gov/agencies/dobs/enforcement-orders',
    clientThresholdNote:
      'DoBS issues Investment Adviser, Investment Adviser Representative, Broker-Dealer, and Broker-Dealer Agent licenses/registrations and processes federally covered adviser notice filings through CRD/IARD. A mixed DoBS securities-class total exceeding 200,000 is not an investment-adviser count. This page is research evidence, not legal advice about whether a specific firm was required to register. Verify the current official record.',
    notLegalAdvice: true,
    mixedDoBsSecuritiesClassTotalIsNotIa: true,
    retrievedAt: '2026-09-17',
  },
  dobsPortal: {
    coverage: 'NOT_A_PUBLIC_FIRM_ROSTER',
    officialUrl: 'https://www.pa.gov/agencies/dobs/dobs-portal',
    caveat: 'The DoBS Portal is for compliance/examination communications. Portal accounts are not registrations.',
  },
  exams: {
    PA_IA_EXAM_RESULTS: 'NOT_PUBLICLY_ACQUIRED',
    PA_IA_EXAM_RESULT_ROWS: null,
    caveat:
      'DoBS Bureau of Securities Compliance and Examinations examines investment advisers and broker-dealers. Public guidance is process guidance, not a list of exam findings. Examination guidance is not inspections, violations, or disciplinary matters.',
  },
  offerings: {
    coverage: 'LEFT_FUTURE',
    caveat: 'Registered securities offerings are an issuer/offering grain, not an adviser-firm registration grain.',
  },
  enforcement: {
    pass: 'dobs_coveo_enforcement_orders_hub',
    result: 'ACQUIRED_CURRENT_SNAPSHOT',
    officialIndex: 'https://www.pa.gov/agencies/dobs/enforcement-orders',
    officialSearch: 'https://www.pa.gov/agencies/dobs/enforcement-orders',
    coverage: 'DoBS Enforcement Orders Coveo search hub DOBS-Enforcement Orders',
    REGULATORY_ACTIVITY_COVERAGE: 'ACQUIRED_CURRENT_SNAPSHOT',
    COMPLETE_REGULATORY_ACTIVITY_COUNT: 'UNKNOWN',
    PA_DOBS_ENFORCEMENT_CATALOG_STATUS: dobs.PA_DOBS_ENFORCEMENT_CATALOG_STATUS,
    PA_DOBS_ALL_ORDER_DOCUMENTS_AUDITED: dobs.PA_DOBS_ALL_ORDER_DOCUMENTS_AUDITED,
    PA_DOBS_SECURITIES_ORDER_DOCUMENTS: null,
    PA_DOBS_SECURITIES_UNIQUE_MATTERS: null,
    PA_DOBS_IA_EXACT_CLASS_DOCUMENTS: null,
    PA_DOBS_IAR_EXACT_CLASS_DOCUMENTS: null,
    PA_DOBS_BD_EXACT_CLASS_DOCUMENTS: null,
    PA_DOBS_OTHER_SECURITIES_DOCUMENTS: null,
    PA_DOBS_EXACT_CRD_DOCUMENTS: 0,
    PA_DOBS_EXACT_CRD_ATTACHMENTS: 0,
    observationRows: dobs.PA_DOBS_ALL_ORDER_DOCUMENTS_AUDITED,
    distinctCaseNumbers: null,
    rowsWithCrd: 0,
    rowsNameOnly: dobs.PA_DOBS_NAME_ONLY_ROWS,
    ROWS_ACQUIRED_BY_THIS_TICKET: dobs.PA_DOBS_ALL_ORDER_DOCUMENTS_AUDITED,
    pdfsDownloaded: 0,
    exactCrdCrosswalks: 0,
    doNotCalculateEnforcementRate: true,
    notInvestmentAdviserEnforcementCensus: true,
    mixedCatalogNotSecuritiesOnly: true,
    catalogHasSourceNativeSecuritiesFacet: false,
    profileAttachments: [],
    identityBar: 'EXACT_FIRM_CRD, EXACT_PERSON_CRD for person grain only, or exact source-native DoBS docket/matter identifier',
    nameOnly: 'UNSAFE',
    namePlusCity: 'REVIEW_REQUIRED',
    documentTypeFromFilename: dobs.documentTypeFromFilename,
    sourceAsOf: null,
    retrievedAt: dobs.retrievedAt,
    snapshotAsOf: '2026-09-17',
    caveat: dobs.note,
  },
  complaints: {
    publicResearchPath: 'https://www.pa.gov/services/dobs/file-a-complaint-about-a-financial-entity-or-professional',
    bulkComplaintDataset: 'SOURCE_NOT_ACQUIRED',
    access: 'OPEN_INTAKE',
    PA_IA_COMPLAINT_ROWS: null,
    PA_IA_COMPLAINT_COVERAGE: 'OPEN_INTAKE',
    completeComplaintCount: 'UNKNOWN',
    caveat:
      'DoBS Consumer Help Center is an intake channel. No public adviser-specific complaint bulk dataset was acquired. Intake capability is not a complaint total. Complaint is not an enforcement order.',
  },
  formD: {
    overlay: 'SOURCE_NOT_ACQUIRED',
    caveat: 'FORM D / EFD FILING != PENNSYLVANIA STATE APPROVAL. FORM D FILING != INVESTMENT QUALITY. FORM D FILING != ADVISER.',
  },
  contacts: {
    policy: 'Official/public business sources only. No internet enrichment. No IAPD/BrokerCheck search scrape. No person contact publication from this ticket.',
    sosSearchScrape: false,
  },
  juiceSqueeze: [
    { decision: 'GRABBED — HIGH YIELD', source: 'IAPD Pennsylvania state IA registration slice (jurisdiction=PA)' },
    { decision: 'GRABBED — HIGH YIELD', source: 'IAPD Pennsylvania ERA slice' },
    { decision: 'GRABBED — HIGH YIELD', source: 'IAPD Pennsylvania federal notice slice' },
    { decision: 'GRABBED — HIGH YIELD', source: 'Existing PA principal-office overlay (V1_ROSTER_PRINCIPAL_OFFICE_STATES = 623)' },
    { decision: 'GRABBED — HIGH YIELD', source: 'DoBS Enforcement Orders Coveo catalog (1,525 mixed PDF documents)' },
    { decision: 'GRABBED — EASY SECONDARY', source: 'DoBS Securities Registration Office and Consumer Help Center official paths' },
    { decision: 'LEFT — SEARCH ONLY', source: 'Current IAPD/BrokerCheck/DoBS Portal interactive verification' },
    { decision: 'LEFT — TOO MUCH WORK FOR CURRENT YIELD', source: 'Mass OCR of 1,525 DoBS enforcement PDFs for CRD/docket extraction' },
    { decision: 'LEFT — TOO MUCH WORK FOR CURRENT YIELD', source: 'Individual U4/U5 histories and IAR public directory' },
    { decision: 'LEFT — REQUEST ONLY', source: 'FOIA / structured securities-only export if later published' },
    { decision: 'LEFT — SHARED / FUTURE', source: 'Registered securities offerings; Form D issuer intelligence' },
    { decision: 'LEFT — LOCAL / FUTURE', source: 'Philadelphia / Pittsburgh / counties / cities' },
  ],
  regulatorMatrix: [
    {
      credential: 'SEC-registered investment adviser',
      regulator: 'U.S. SEC / IARD',
      identity: 'CRD / IARD firm ID; SEC file number',
      proves: 'Federal registration category as reported on Form ADV in the cited extract',
      doesNotProve: 'Pennsylvania state-RIA licensure or current Pennsylvania notice-filing status',
    },
    {
      credential: 'Exempt reporting adviser (ERA)',
      regulator: 'SEC / IARD (and Pennsylvania reporting when applicable)',
      identity: 'CRD / IARD firm ID',
      proves: 'ERA reporting status in the cited extract',
      doesNotProve: 'SEC RIA registration or Pennsylvania state-RIA licensure',
    },
    {
      credential: 'Pennsylvania state-registered investment adviser',
      regulator: 'Pennsylvania Department of Banking and Securities (DoBS) / IARD',
      identity: 'Firm CRD / IARD',
      proves: 'Pennsylvania state-IA registration when the official IARD state record says APPROVED',
      doesNotProve: 'SEC registration. Principal-office geography is not this credential.',
    },
    {
      credential: 'Federally covered / notice-filed investment adviser',
      regulator: 'DoBS (notice) / SEC (federal registration)',
      identity: 'CRD / IARD firm ID',
      proves: 'Notice-filing posture when the official IARD record says FILED',
      doesNotProve: 'Pennsylvania state-RIA licensure',
    },
    {
      credential: 'Investment adviser representative',
      regulator: 'DoBS / CRD',
      identity: 'Person CRD (not firm CRD)',
      proves: 'Individual representative reporting when official CRD evidence exists',
      doesNotProve: 'Firm registration. IAR is not the firm.',
    },
    {
      credential: 'Broker-dealer / registered representative',
      regulator: 'DoBS / FINRA / CRD',
      identity: 'Firm or person CRD',
      proves: 'Broker-dealer or representative registration when official evidence exists',
      doesNotProve: 'Investment-adviser registration',
    },
    {
      credential: 'DoBS enforcement order document',
      regulator: 'Pennsylvania Department of Banking and Securities',
      identity: 'Exact source-native docket/matter identifier; CRD only if source-native',
      proves: 'A public DoBS enforcement-order PDF exists in the official catalog',
      doesNotProve: 'That the document is an investment-adviser matter, a unique regulatory matter, or a criminal conviction',
    },
  ],
  identityRules: {
    EXACT: ['firm CRD/IARD ID', 'person CRD for person grain only', 'SEC file number where source-native', 'exact official DoBS docket/matter identifier'],
    HIGH_CONFIDENCE: 'exact legal name + exact official address for non-adverse descriptive review only',
    REVIEW_REQUIRED: 'name + city, DBA, name variants, address-only',
    UNSAFE: 'name alone — not used for adverse profile attachment',
  },
  semanticGrainRules: {
    STATE_RIA_IS_DISTINCT_CREDENTIAL_FROM_SEC_RIA: true,
    STATE_RIA_IS_DISTINCT_CREDENTIAL_FROM_NOTICE_FILING: true,
    STATE_RIA_IS_DISTINCT_CREDENTIAL_FROM_STATE_ERA: true,
    PRINCIPAL_OFFICE_IS_NOT_REGISTRATION: true,
    REGISTRATION_ROW_IS_DISTINCT_GRAIN_FROM_DISTINCT_FIRM_CRD: true,
    BROKER_DEALER_IS_NOT_INVESTMENT_ADVISER: true,
    AGENT_IS_NOT_IAR: true,
    FIRM_IS_NOT_INDIVIDUAL: true,
    DOBS_ORDER_IS_NOT_IA_DISCIPLINARY_CENSUS: true,
    MIXED_DOBS_SECURITIES_CLASS_TOTAL_IS_NOT_IA: true,
    COMPLAINT_IS_NOT_VIOLATION: true,
    RAUM_IS_NOT_PERFORMANCE: true,
    note: 'Credential/grain rules. They do not require disjoint CRD sets or unequal counts.',
  },
  profileAttachments: [],
  expansionLedger: {
    PRE_INGEST_CANONICAL_FIRMS: CANONICAL,
    PA_PRINCIPAL_OFFICE_OVERLAY: PA_PRINCIPAL_OFFICE,
    PA_PRINCIPAL_OFFICE_DISTINCT_CRDS: PA_PRINCIPAL_OFFICE,
    PA_STATE_IA_ROWS: STATE_IA_ROWS,
    PA_STATE_IA_DISTINCT_CRDS: STATE_IA_CRD,
    PA_STATE_IA_APPROVED_CURRENT: STATE_IA_APPROVED,
    PA_STATE_IA_OTHER_STATUS_ROWS: STATE_IA_TERMREQUEST,
    PA_STATE_ERA_ROWS: STATE_ERA_ROWS,
    PA_STATE_ERA_DISTINCT_CRDS: STATE_ERA_CRD,
    PA_NOTICE_FILING_ROWS: NOTICE_ROWS,
    PA_NOTICE_FILING_DISTINCT_CRDS: NOTICE_FILED,
    PA_NOTICE_FILED_CURRENT: NOTICE_FILED,
    PA_IA_NOTICE_OVERLAP_EXACT_CRDS: OVERLAP_IA_NOTICE,
    PA_ERA_NOTICE_OVERLAP_EXACT_CRDS: census.overlaps.state_era_and_notice_filed,
    PA_IA_ERA_OVERLAP_EXACT_CRDS: census.state.ia_era_overlap_distinct_crd,
    PA_PRINCIPAL_OFFICE_STATE_IA_OVERLAP: census.overlaps.state_ia_approved_and_principal_office,
    PA_IAR_ROSTER_STATUS: 'OPEN_SEARCH_ONLY',
    NET_NEW_STATE_RESEARCH_IDENTITIES: STATE_IA_CRD + STATE_ERA_CRD,
    NET_NEW_STATE_RESEARCH_IDENTITIES_DEFINITION:
      'distinct firm CRDs in IAPD StateRgstn/Rgltr/@Cd=PA plus distinct firm CRDs in ERA/Rgltr/@Cd=PA (overlap 0 in this extract). Not new companies, not public profiles, not a combined Pennsylvania adviser universe.',
    NET_NEW_CANONICAL_ORGANIZATIONS: 0,
    NET_NEW_PUBLIC_INVESTOR_PROFILES: 0,
    EXISTING_ORGANIZATIONS_ENRICHED: 0,
    PRE_EXISTING_PA_PRINCIPAL_OFFICE_OVERLAY: PA_PRINCIPAL_OFFICE,
    GRAPH_WRITES: 0,
    PA_DOBS_ENFORCEMENT_ROWS: dobs.PA_DOBS_ALL_ORDER_DOCUMENTS_AUDITED,
    PA_DOBS_UNIQUE_REGULATORY_MATTERS: null,
    PA_SECURITIES_COMPLAINT_OBSERVATIONS: null,
    CLAIM_ELIGIBILITY_BROADENED: false,
    REGULATORY_ACTIVITY_COVERAGE: 'ACQUIRED_CURRENT_SNAPSHOT',
    EXACT_ENFORCEMENT_FIRM_ASSOCIATIONS: 0,
    REVIEW_REQUIRED_ASSOCIATIONS: 0,
    REJECTED_NAME_ONLY_ASSOCIATIONS: 0,
    EXACT_PROFILE_ATTACHMENTS: 0,
    notes: {
      overlay:
        '623 Pennsylvania principal-office firms already existed on the federal SEC/IARD spine before PA-INV-001. EXISTING_ORGANIZATIONS_ENRICHED = 0. GRAPH_WRITES = 0. Raw 2026-09-17 MainAddr=@State=PA = 628 is a different grain.',
      stateRoster:
        'IAPD state compilation added 864 distinct Pennsylvania state-IA CRDs and 99 distinct Pennsylvania state-ERA CRDs as state-intelligence identities. They were not minted as canonical organizations or public /firm profiles.',
      notice: '3,411 notice-filing rows are observations, not extra firms.',
      activity:
        'Acquired 1,525 mixed DoBS enforcement-order PDFs from the official Coveo catalog. The catalog has no source-native securities facet and no docket field. Securities-only and IA-only counts remain UNKNOWN. Zero profile attachments.',
    },
  },
  preIngestBaseline: {
    pennsylvaniaPrincipalOfficeFirmsAlreadyInFederalGraph: PA_PRINCIPAL_OFFICE,
    canonicalFirmsAlreadyPresent: CANONICAL,
    note: 'Recomputed from V1_ROSTER_PRINCIPAL_OFFICE_STATES PA = 623. Do not call these firms new.',
  },
  localWorkNeededNow: 'NO',
  rejectedTotals: [
    { total: 'Pennsylvania investment advisers', reason: 'State IA, ERA, notice, and principal office are incompatible grains.' },
    { total: 'DoBS 200,000+ securities-class total as advisers', reason: 'Mixed broker-dealer, agent, IA, IAR, and notice-filer population.' },
    { total: 'DoBS enforcement documents = IA actions', reason: 'Catalog has no source-native securities facet. Mixed banking/mortgage/securities PDFs.' },
    { total: 'DoBS regulatory activity rows = 0', reason: 'Search-only or unacquired is unknown, not zero. Catalog has 1,525 documents.' },
  ],
  semanticGuardrails: [
    'STATE IA != NOTICE',
    'ERA != RIA',
    'PRINCIPAL OFFICE != REGISTRATION',
    'IAR != FIRM',
    'BROKER-DEALER != IA',
    'DOBS MIXED CLASS TOTAL != IA CENSUS',
    'ORDER != CONVICTION',
    'ORDER TO SHOW CAUSE != FINAL FINDING',
    'CONSENT != ADMISSION UNLESS SOURCE SAYS SO',
    'DOCUMENT != UNIQUE MATTER',
    'COMPLAINT != ENFORCEMENT ORDER',
    'EXAM GUIDANCE != EXAM FINDING',
    'NAME-ONLY ADVERSE MATCH = UNSAFE',
    'MISSING != ZERO',
    'SEARCH-ONLY != ZERO',
    'NO TRUST SCORE',
    'NO PAID RANKING',
  ],
};

snapshot.fingerprint = createHash('sha256').update(canonicalJson(snapshot)).digest('hex');

const ts = `/** Generated by scripts/build-pa-public-snapshot.mjs. Do not edit by hand. */\nexport const PA_PUBLIC_SNAPSHOT = ${JSON.stringify(snapshot, null, 2)} as const;\nexport type PaPublicSnapshot = typeof PA_PUBLIC_SNAPSHOT;\n`;
writeFileSync(join(root, 'packages/domain/src/pa-public-snapshot.ts'), ts, 'utf8');
writeFileSync(join(root, 'artifacts/pa-inv-001-public-snapshot.json'), `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  fingerprint: snapshot.fingerprint,
  stateIa: STATE_IA_APPROVED,
  notice: NOTICE_FILED,
  era: STATE_ERA_ACTIVE,
  overlay: PA_PRINCIPAL_OFFICE,
  overlap: OVERLAP_IA_NOTICE,
}, null, 2));
