/**
 * OR-INV-001 — deterministic public snapshot.
 * Oregon state IA is selected by IAPD registration jurisdiction, not address.
 * Do not scrape IAPD/BrokerCheck/DFR search. Do not mint public firm profiles.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalJson } from './co-canonical-json.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const census = JSON.parse(readFileSync(join(root, 'data/oregon/or-inv-001/iapd-or-census.json'), 'utf8'));

const OR_PRINCIPAL_OFFICE = 167;
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

if (!String(census.state.filter).includes('Rgltr/@Cd=OR')) {
  throw new Error('Oregon state IA filter must use Rgltr/@Cd=OR');
}
if (STATE_IA_APPROVED === OR_PRINCIPAL_OFFICE) {
  throw new Error('Do not use the principal-office overlay as the state-IA firm denominator');
}
if (census.contract !== 'investor-or-iapd-census-v1') {
  throw new Error('Oregon census contract drifted');
}

const snapshot = {
  version: 'investor-or-state-intel-v1',
  generatedFrom: {
    nationalRoster: 'packages/domain/src/investor-home-intel.ts V1_ROSTER_PRINCIPAL_OFFICE_STATES + V1_SEC_ROSTER',
    iapdStateCensus: 'data/oregon/or-inv-001/iapd-or-census.json',
  },
  asOf: '2026-09-16',
  publicationGate: 'ON',
  publicEligibility: 'state_page',
  route: '/oregon',
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
    orPrincipalOfficeSecIardFirms: OR_PRINCIPAL_OFFICE,
    grain: 'SEC IARD roster firm with principal-office region = OR',
    source: 'IA_FIRM_SEC_Feed_08_27_2026 (reconciled V1 roster geography)',
    sourceAsOf: '2026-08-27',
    publishedAt: '2026-08-27',
    retrievedAt: '2026-08-28',
    snapshotAsOf: '2026-08-27',
    universe: TOTAL,
    resolvedPrincipalOfficeRegions: ROSTER_WITH_REGION,
    unresolvedPrincipalOfficeRegions: ROSTER_NULL_REGION,
    shareOfResolvedRegionsPct: Number(((100 * OR_PRINCIPAL_OFFICE) / ROSTER_WITH_REGION).toFixed(2)),
    searchHref: '/firms?state=OR',
    rawCompilationMainAddrOr: census.sec.co_principal_office_distinct_crd,
    rawCompilationSource: 'IA_FIRM_SEC_Feed_09_10_2026 MainAddr/@State=OR',
    label: 'SEC/IARD roster firms with an Oregon principal office',
    caveat:
      'This is the national SEC/IARD roster overlay for firms that report an Oregon principal office on the reconciled 23,622-firm geography table (OR = 167). It is not the Oregon state-registered adviser universe, not a federal-covered notice-filing count, and not proof of current Oregon DFR authority. OREGON PRINCIPAL OFFICE != OREGON STATE REGISTRATION. These 167 firms already exist in the federal graph and are not net-new organizations. The raw 2026-09-10 compilation MainAddr=@State=OR count is a different extract (165) and is not this overlay.',
  },
  riaEra: {
    nationalRiaFacts: RIA,
    nationalEraFacts: ERA,
    nationalTotalFacts: TOTAL,
    ilPrincipalOfficeSplit: 'SOURCE_NOT_SPLIT',
    caveat:
      'National roster keeps RIA (17,018) and ERA (6,604) separate. Committed geography is on the combined roster. Oregon principal-office counts are not an RIA-only or ERA-only state denominator. ERA is not an RIA. SEC RIA is not an Oregon state RIA.',
  },
  firmMarket: {
    raumBandsByOregonPrincipalOffice: 'SOURCE_NOT_SPLIT',
    note: 'National RIA RAUM bands and Form ADV attributes exist on the federal spine. This snapshot does not invent an Oregon-only size ranking or treat RAUM as investment performance. An Oregon principal office is not Oregon registration.',
  },
  stateRia: {
    STATE_RIA_BULK_ROSTER: 'ACQUIRED_IAPD_STATE_COMPILATION',
    access: 'ACQUIRED',
    completeStateRiaCount: STATE_IA_APPROVED,
    registrationRows: STATE_IA_ROWS,
    distinctFirmCrd: STATE_IA_CRD,
    approvedDistinctCrd: STATE_IA_APPROVED,
    termrequestDistinctCrd: STATE_IA_TERMREQUEST,
    filter: 'StateRgstn/Rgltr/@Cd=OR (registration jurisdiction). Not MainAddr/@State.',
    currentness: 'APPROVED = current state IA in this compilation. TERMREQUEST is not approved current.',
    source: 'IA_FIRM_STATE_Feed_09_10_2026',
    sourceAsOf: '2026-09-10',
    publishedAt: '2026-09-10',
    retrievedAt: '2026-09-16T18:30:00Z',
    snapshotAsOf: '2026-09-10',
    checksumSha256: census.state.sha256,
    releaseLabel: 'IA_FIRM_STATE_Feed_09_10_2026',
    officialUrl: 'https://reports.adviserinfo.sec.gov/reports/CompilationReports/IA_FIRM_STATE_Feed_09_10_2026.xml.gz',
    sosSearch: 'OPEN_SEARCH_ONLY',
    verifyUrl: 'https://adviserinfo.sec.gov/',
    sosHomeUrl: 'https://dfr.oregon.gov/business/licensing/financial/securities/pages/investment-advisers.aspx',
    sosRegistrationSearchUrl: 'https://www4.cbs.state.or.us/ex/dfcs/dfcslic/adviser/search/index.cfm?fuseaction=show_search_name',
    sosAdminActionsUrl: 'https://dfr.oregon.gov/laws-rules/Pages/notices-orders.aspx',
    sosAdminActionsSearchUrl: 'https://dfr.oregon.gov/laws-rules/Pages/notices-orders.aspx',
    dfrDownloadUrl: 'https://www4.cbs.state.or.us/ex/dfcs/dfcslic/adviser/search/index.cfm?fuseaction=show_download',
    iapdUrl: 'https://adviserinfo.sec.gov/',
    brokercheckUrl: 'https://brokercheck.finra.org/',
    label: 'Oregon state-registered investment-adviser firms',
    caveat:
      'IAPD state compilation firms with Oregon as the registration jurisdiction and status APPROVED. This is IARD-derived state registration evidence. The DFR current download uses Oregon license numbers (IA-xxxx), not firm CRDs, and mixes DFCS-jurisdiction and SEC-jurisdiction rows. IAPD approved state IA is not that DFR download, not an SEC RIA count, not a federal-covered notice-filing count, not an ERA count, and not the 167 principal-office overlay. Duplicate/multi-jurisdiction rows were collapsed to distinct firm CRD. State-only CRDs were not minted as public SEC firm profiles.',
  },
  stateEra: {
    STATE_ERA_REPORTING: 'ACQUIRED_IAPD_STATE_COMPILATION',
    registrationRows: STATE_ERA_ROWS,
    distinctFirmCrd: STATE_ERA_CRD,
    activeDistinctCrd: STATE_ERA_ACTIVE,
    overlapWithStateIa: census.state.ia_era_overlap_distinct_crd,
    filter: 'ERA/Rgltr/@Cd=OR (reporting jurisdiction). Not address. Not StateRgstn.',
    source: 'IA_FIRM_STATE_Feed_09_10_2026',
    sourceAsOf: '2026-09-10',
    retrievedAt: '2026-09-16T18:30:00Z',
    label: 'Oregon state ERA reporting firms',
    caveat: 'State ERA reporting is not an Oregon state RIA and is not an SEC RIA. Overlap with state IA is zero in this extract.',
  },
  federalNotice: {
    FEDERAL_COVERED_NOTICE_ROSTER: 'ACQUIRED_IAPD_SEC_COMPILATION',
    access: 'ACQUIRED',
    noticeRows: NOTICE_ROWS,
    noticeFiledDistinctCrd: NOTICE_FILED,
    noticeStatus: 'FILED',
    filter: 'NoticeFiled/States/@RgltrCd=OR',
    source: 'IA_FIRM_SEC_Feed_09_10_2026',
    sourceAsOf: '2026-09-10',
    publishedAt: '2026-09-10',
    retrievedAt: '2026-09-16T18:30:00Z',
    snapshotAsOf: '2026-09-10',
    overlapApprovedStateIa: OVERLAP_IA_NOTICE,
    overlapApprovedStateIaJoinMethod: census.overlaps.state_ia_approved_and_notice_filed_joinMethod,
    overlapApprovedStateIaCrds: census.overlaps.state_ia_approved_and_notice_filed_crds,
    overlapApprovedStateIaReading:
      'The credential classes are separate but the source populations are not perfectly disjoint; one firm CRD appears in both source-defined sets in the 2026-08-27 compilations. Exact-CRD inspection shows CRD 290683 is APPROVED in StateRgstn/Rgltr/@Cd=OR and FILED in NoticeFiled/States/@RgltrCd=OR with FirmType=Registered. Neither classification was discarded.',
    overlapEraNotice: census.overlaps.state_era_and_notice_filed,
    filedFirmType: census.sec.co_notice_filed_firm_type,
    label: 'SEC/IARD firms with an Oregon notice filing',
    caveat:
      'Federal-covered / notice-filed is not Oregon state-RIA licensure. Notice-filed is not the 167 principal-office overlay. An Oregon principal office does not prove a current notice filing.',
  },
  iar: {
    IA_INDVL_FEED: 'ACQUIRED_NATIONAL_FEED',
    oregonPersonDirectory: 'NOT_PUBLISHED',
    access: 'OPEN_SEARCH_ONLY',
    completeIarCount: 'UNKNOWN',
    grain: 'person CRD (not firm CRD)',
    source: 'IA_INDVL_Feed_08_27_2026',
    sourceAsOf: '2026-08-27',
    retrievedAt: '2026-08-28',
    verifyUrl: 'https://adviserinfo.sec.gov/',
    caveat:
      'The national IAR compilation exists. This ticket does not publish an Oregon person directory. IAR is not the firm. Search V1 remains firm-focused. Complete Oregon IAR universe is UNKNOWN, not zero.',
  },
  brokerDealer: {
    OR_BD_BULK_ROSTER: 'SOURCE_NOT_ACQUIRED',
    IL_AGENT_BULK_ROSTER: 'SOURCE_NOT_ACQUIRED',
    access: 'OPEN_SEARCH_ONLY',
    completeDealerCount: 'UNKNOWN',
    completeAgentCount: 'UNKNOWN',
    verifyUrl: 'https://brokercheck.finra.org/',
    caveat:
      'Broker-dealer is not an investment adviser. Registered representative is not an IAR. Oregon DFR Securities Department also regulates securities dealers; FINRA-member firms use CRD. BrokerCheck is not scraped. Search-only is not zero.',
  },
  sosFramework: {
    regulator: 'Oregon Division of Financial Regulation (DFR), Department of Consumer and Business Services — Securities',
    notDfi: true,
    ruleCitation: 'Oregon Securities Law, ORS 59.005–59.451; OAR chapter 441',
    officialHomeUrl: 'https://dfr.oregon.gov/business/licensing/financial/securities/pages/investment-advisers.aspx',
    officialRegistrationSearchUrl: 'https://www4.cbs.state.or.us/ex/dfcs/dfcslic/adviser/search/index.cfm?fuseaction=show_search_name',
    officialAdminActionsUrl: 'https://dfr.oregon.gov/laws-rules/Pages/notices-orders.aspx',
    officialDownloadUrl: 'https://www4.cbs.state.or.us/ex/dfcs/dfcslic/adviser/search/index.cfm?fuseaction=show_download',
    clientThresholdNote:
      'In general, investment advisers and firms operating in Oregon must be licensed, subject to federal/state thresholds, exemptions, and notice-filing rules. A firm managing less than $100 million with an Oregon location generally licenses with DFR; federally covered advisers notice-file. This page is research evidence, not legal advice about whether a specific firm was required to register. Verify the current official record.',
    notLegalAdvice: true,
    retrievedAt: '2026-09-16',
  },
  dfrNativeLicenseFile: {
    coverage: 'ACQUIRED_CURRENT_SNAPSHOT',
    rows: 2677,
    distinctLicenseNumbers: 2676,
    duplicateLicenseNumbers: 1,
    jurisdictionDfcs: 348,
    jurisdictionSec: 2329,
    grain: 'Oregon DFR current investment-adviser download row (IA-xxxx license number; jurisdiction SEC or DFCS)',
    officialUrl: 'https://www4.cbs.state.or.us/ex/dfcs/dfcslic/adviser/search/index.cfm?fuseaction=show_download',
    sourceAsOf: null,
    retrievedAt: '2026-09-16',
    caveat:
      'DFR publishes a current tab-delimited download of firms it treats as licensed to do business in Oregon. License number is not firm CRD. DFCS jurisdiction is not the IAPD Oregon state-IA APPROVED set. SEC jurisdiction is not the IAPD Oregon notice-filed set. Do not add DFCS + SEC as Oregon advisers. The page copy saying approximately 1,120 firms is stale relative to this 2,677-row file.',
  },
  enforcement: {
    pass: 'dfr_adminorders_s_prefix',
    result: 'ACQUIRED_CURRENT_SNAPSHOT',
    officialIndex: 'https://dfr.oregon.gov/laws-rules/Pages/notices-orders.aspx',
    officialSearch: 'https://dfr.oregon.gov/laws-rules/Pages/notices-orders.aspx',
    coverage: 'DFR SharePoint AdminOrders document library, FSObjType=0, DFRCaseNumber prefix S- (securities)',
    REGULATORY_ACTIVITY_COVERAGE: 'ACQUIRED_CURRENT_SNAPSHOT',
    COMPLETE_REGULATORY_ACTIVITY_COUNT: 'UNKNOWN',
    observationRows: 431,
    distinctCaseNumbers: 394,
    dateMin: '1988-03-22',
    dateMax: '2026-06-02',
    rowsWithCrd: 0,
    rowsNameOnly: 431,
    nameContainsCrdText: 8,
    ROWS_ACQUIRED_BY_THIS_TICKET: 431,
    pdfsDownloaded: 0,
    exactCrdCrosswalks: 0,
    doNotCalculateEnforcementRate: true,
    notInvestmentAdviserEnforcementCensus: true,
    mixedSecuritiesNotIaOnly: true,
    profileAttachments: [],
    identityBar: 'EXACT_FIRM_CRD, EXACT_PERSON_CRD for person grain only, or exact source-native Oregon DFR case number',
    nameOnly: 'UNSAFE',
    namePlusCity: 'REVIEW_REQUIRED',
    sourceAsOf: null,
    sourceModifiedAt: '2026-09-15T21:18:58Z',
    retrievedAt: '2026-09-16',
    snapshotAsOf: '2026-09-16',
    caveat:
      'Acquired 431 DFR document rows / 394 distinct S- case numbers from the official AdminOrders list. S- is the source-native securities case prefix. Document rows are not unique matters. This is mixed Oregon securities administrative activity (issuers, sales, unlicensed activity, advisers, individuals) and is not an investment-adviser disciplinary census. All DFR insurance/mortgage/nondepository folders were excluded by the S- filter. No PDFs were downloaded. No exact CRD profile attachments. Name-only is unsafe. Eight document titles mention CRD text and remain REVIEW_REQUIRED. Complete Oregon IA-discipline count is UNKNOWN. Missing is not zero. No order found is not a clean history. Proposed is not final. Consent is not an admission unless the source says so.',
  },
  complaints: {
    publicResearchPath: 'https://www.dfr.oregon.gov/business/licensing/financial/securities/pages/investment-advisers.aspx',
    bulkComplaintDataset: 'SOURCE_NOT_ACQUIRED',
    access: 'OPEN_SEARCH_ONLY',
    completeComplaintCount: 'UNKNOWN',
    caveat:
      'No structured Oregon securities-complaint dataset was acquired. Complaint is not a violation. Investigation is not a finding. Do not answer firm-specific complaint questions with statewide administrative-action libraries.',
  },
  formD: {
    overlay: 'SOURCE_NOT_ACQUIRED',
    caveat: 'FORM D / EFD FILING != OREGON STATE APPROVAL. FORM D FILING != INVESTMENT QUALITY. FORM D FILING != ADVISER.',
  },
  contacts: {
    policy: 'Official/public business sources only. No internet enrichment. No IAPD/BrokerCheck/DFR search scrape. No person contact publication from this ticket.',
    sosSearchScrape: false,
  },
  juiceSqueeze: [
    { decision: 'GRABBED — HIGH YIELD', source: 'IAPD Oregon state IA registration slice (jurisdiction=IL)' },
    { decision: 'GRABBED — HIGH YIELD', source: 'IAPD Oregon ERA slice' },
    { decision: 'GRABBED — HIGH YIELD', source: 'IAPD Oregon federal notice slice' },
    { decision: 'GRABBED — HIGH YIELD', source: 'Existing OR principal-office overlay (V1_ROSTER_PRINCIPAL_OFFICE_STATES = 167)' },
    { decision: 'GRABBED — HIGH YIELD', source: 'DFR AdminOrders S- prefix securities document metadata (431 rows / 394 cases)' },
    { decision: 'GRABBED — EASY SECONDARY', source: 'DFR current investment-adviser download (IA-xxxx; DFCS vs SEC jurisdiction)' },
    { decision: 'GRABBED — EASY SECONDARY', source: 'Oregon DFR Securities Department official verification and administrative-actions paths' },
    { decision: 'LEFT — SEARCH ONLY', source: 'Current IAPD/BrokerCheck/DFR interactive verification systems' },
    { decision: 'LEFT — TOO MUCH WORK FOR CURRENT YIELD', source: 'Oregon DFR Administrative Actions monthly PDF census and CRD extraction' },
    { decision: 'LEFT — TOO MUCH WORK FOR CURRENT YIELD', source: 'Individual U4/U5 histories and broker-agent current roster' },
    { decision: 'LEFT — REQUEST ONLY', source: 'FOIA' },
    { decision: 'LEFT — SHARED / FUTURE', source: 'Broad IL corporate entity graph; Form D issuer intelligence' },
    { decision: 'LEFT — LOCAL / FUTURE', source: 'Portland / Cook / counties / cities' },
  ],
  regulatorMatrix: [
    {
      credential: 'SEC-registered investment adviser',
      regulator: 'U.S. SEC / IARD',
      identity: 'CRD / IARD firm ID; SEC file number',
      proves: 'Federal registration category as reported on Form ADV in the cited extract',
      doesNotProve: 'Oregon state-RIA licensure or current Oregon notice-filing status',
    },
    {
      credential: 'Exempt reporting adviser (ERA)',
      regulator: 'SEC / IARD (and Oregon reporting when applicable)',
      identity: 'CRD / IARD firm ID',
      proves: 'ERA reporting status in the cited extract',
      doesNotProve: 'SEC RIA registration or Oregon state-RIA licensure',
    },
    {
      credential: 'Oregon state-registered investment adviser',
      regulator: 'Oregon Division of Financial Regulation (DFR) / IARD',
      identity: 'Firm CRD / IARD',
      proves: 'Oregon state-IA registration when the official IARD state record says APPROVED',
      doesNotProve: 'SEC registration. Principal-office geography is not this credential.',
    },
    {
      credential: 'Federally covered / notice-filed investment adviser',
      regulator: 'Oregon DFR Securities Department (notice) / SEC (federal registration)',
      identity: 'CRD / IARD firm ID',
      proves: 'Notice-filing posture when the official IARD record says FILED',
      doesNotProve: 'Oregon state-RIA licensure',
    },
    {
      credential: 'Investment adviser representative',
      regulator: 'Oregon DFR Securities Department / CRD',
      identity: 'Person CRD (not firm CRD)',
      proves: 'Individual representative reporting when official CRD evidence exists',
      doesNotProve: 'Firm registration. IAR is not the firm. IAR is not a broker-dealer registered representative.',
    },
    {
      credential: 'Broker-dealer / registered representative',
      regulator: 'Oregon DFR / FINRA / CRD',
      identity: 'Firm or person CRD',
      proves: 'Broker-dealer or representative registration when official evidence exists',
      doesNotProve: 'Investment-adviser registration',
    },
    {
      credential: 'Oregon DFR administrative action',
      regulator: 'Oregon Division of Financial Regulation (DFR)',
      identity: 'Exact source-native matter identifier; CRD only if source-native',
      proves: 'A public Oregon DFR administrative-action observation when attached by exact identity',
      doesNotProve: 'That every DFR matter is an investment-adviser disciplinary finding or a criminal conviction',
    },
  ],
  identityRules: {
    EXACT: ['firm CRD/IARD ID', 'person CRD for person grain only', 'SEC file number where source-native', 'exact official Oregon DFR matter identifier'],
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
    DFR_ACTION_IS_NOT_IA_DISCIPLINARY_CENSUS: true,
    COMPLAINT_IS_NOT_VIOLATION: true,
    RAUM_IS_NOT_PERFORMANCE: true,
    note: 'Credential/grain rules. They do not require disjoint CRD sets or unequal counts.',
  },
  profileAttachments: [],
  expansionLedger: {
    PRE_INGEST_CANONICAL_FIRMS: CANONICAL,
    OR_PRINCIPAL_OFFICE_FIRMS: OR_PRINCIPAL_OFFICE,
    OR_STATE_IA_ROWS: STATE_IA_ROWS,
    OR_STATE_IA_DISTINCT_CRDS: STATE_IA_CRD,
    OR_STATE_IA_CURRENT_FIRMS: STATE_IA_APPROVED,
    OR_STATE_ERA_ROWS: STATE_ERA_ROWS,
    OR_STATE_ERA_DISTINCT_CRDS: STATE_ERA_CRD,
    OR_FEDERAL_NOTICE_ROWS: NOTICE_ROWS,
    OR_FEDERAL_NOTICE_DISTINCT_CRDS: NOTICE_FILED,
    EXACT_STATE_IA_ERA_OVERLAPS: census.state.ia_era_overlap_distinct_crd,
    EXACT_STATE_IA_NOTICE_OVERLAPS: OVERLAP_IA_NOTICE,
    EXACT_ERA_NOTICE_OVERLAPS: census.overlaps.state_era_and_notice_filed,
    OR_IAR_ROWS: null,
    NET_NEW_STATE_RESEARCH_IDENTITIES: STATE_IA_CRD + STATE_ERA_CRD,
    NET_NEW_STATE_RESEARCH_IDENTITIES_DEFINITION:
      'distinct firm CRDs in IAPD StateRgstn/Rgltr/@Cd=OR plus distinct firm CRDs in ERA/Rgltr/@Cd=OR (overlap 0 in this extract). Not new companies, not public profiles, not a combined Oregon adviser universe.',
    NET_NEW_CANONICAL_ORGANIZATIONS: 0,
    NET_NEW_PUBLIC_INVESTOR_PROFILES: 0,
    EXISTING_ORGANIZATIONS_ENRICHED: 0,
    PRE_EXISTING_OR_PRINCIPAL_OFFICE_OVERLAY: OR_PRINCIPAL_OFFICE,
    GRAPH_WRITES: 0,
    OR_DFR_ENFORCEMENT_ROWS: 431,
    OR_DFR_UNIQUE_REGULATORY_MATTERS: 394,
    OR_SECURITIES_COMPLAINT_OBSERVATIONS: null,
    OR_IAR_DISTINCT_PERSON_CRDS: null,
    OR_STATE_IA_APPROVED_DISTINCT_CRDS: STATE_IA_APPROVED,
    OR_STATE_ERA_ACTIVE_DISTINCT_CRDS: STATE_ERA_ACTIVE,
    OR_FEDERAL_NOTICE_FILED_DISTINCT_CRDS: NOTICE_FILED,
    EXACT_STATE_IA_TO_PRINCIPAL_OFFICE_CROSSWALKS: census.overlaps.state_ia_approved_and_principal_office,
    EXACT_STATE_ERA_TO_PRINCIPAL_OFFICE_CROSSWALKS: census.overlaps.state_era_and_principal_office,
    EXACT_NOTICE_TO_PRINCIPAL_OFFICE_CROSSWALKS: census.overlaps.notice_filed_and_principal_office,
    CLAIM_ELIGIBILITY_BROADENED: false,
    REGULATORY_ACTIVITY_COVERAGE: 'ACQUIRED_CURRENT_SNAPSHOT',
    EXACT_ENFORCEMENT_FIRM_ASSOCIATIONS: 0,
    REVIEW_REQUIRED_ASSOCIATIONS: 8,
    REJECTED_NAME_ONLY_ASSOCIATIONS: 0,
    EXACT_PROFILE_ATTACHMENTS: 0,
    notes: {
      overlay:
        '167 Oregon principal-office firms already existed on the federal SEC/IARD spine before OR-INV-001. This ticket reused the existing canonical overlay. It did not write new principal-office enrichment into those organizations. EXISTING_ORGANIZATIONS_ENRICHED = 0. GRAPH_WRITES = 0. Raw 2026-09-10 MainAddr=@State=OR = 165 is a different grain.',
      stateRoster:
        'IAPD state compilation added 340 distinct Oregon state-IA CRDs and 26 distinct Oregon state-ERA CRDs as state-intelligence identities. They were not minted as canonical organizations or public /firm profiles.',
      notice: '2,262 notice-filing rows are observations, not extra firms.',
      activity:
        'Acquired 431 S- prefix DFR document rows / 394 distinct case numbers. That is mixed securities administrative activity, not an IA-only disciplinary census. Complete IA-discipline count remains UNKNOWN. Zero profile attachments.',
    },
  },
  preIngestBaseline: {
    oregonPrincipalOfficeFirmsAlreadyInFederalGraph: OR_PRINCIPAL_OFFICE,
    canonicalFirmsAlreadyPresent: CANONICAL,
    note: 'Recomputed from V1_ROSTER_PRINCIPAL_OFFICE_STATES OR = 167. Do not call these firms new.',
  },
  sourceInventory: [
    { authority: 'SEC / IAPD', source: 'IA_FIRM_SEC_Feed_08_27_2026', coverageStatus: 'ACQUIRED', sourceAsOf: '2026-08-27', retrievedAt: '2026-08-28', count: TOTAL },
    { authority: 'IAPD', source: 'IA_FIRM_STATE_Feed_08_27_2026', coverageStatus: 'ACQUIRED', sourceAsOf: '2026-08-27', retrievedAt: '2026-08-28', count: STATE_IA_APPROVED },
    { authority: 'Oregon DFR Securities Department', source: 'department home / IA via IARD', coverageStatus: 'ACQUIRED_CONTEXT', sourceAsOf: null, retrievedAt: '2026-09-12', count: null },
    { authority: 'Oregon DFR', source: 'AdminOrders S- prefix documents', coverageStatus: 'ACQUIRED', sourceAsOf: null, retrievedAt: '2026-09-16', count: 431 },
    { authority: 'IAPD / BrokerCheck / DFR records', source: 'interactive verification', coverageStatus: 'OPEN_SEARCH_ONLY', sourceAsOf: null, retrievedAt: '2026-09-12', count: null },
  ],
  gaps: [
    'Live DFR/IAPD/BrokerCheck verification is OPEN_SEARCH_ONLY; search-only is not zero.',
    'Complete Oregon IAR person universe is UNKNOWN and is not published as a directory.',
    'Complete Oregon broker-dealer and agent rosters are UNKNOWN.',
    'Oregon DFR enforcement is a mixed monthly-PDF library, not a bounded IA census.',
    'No Oregon city/county investor pages.',
    'Form D overlay not acquired.',
  ],
  rejectedJoins: [
    { join: 'name-only DFR matter → public firm profile', status: 'REJECTED_UNSAFE', count: 0, reason: 'Name alone is unsafe for adverse attachment. No bulk DFR table was acquired.' },
    { join: 'person CRD → firm CRD', status: 'REJECTED_UNSAFE', count: 0, reason: 'Exact person CRD does not become firm CRD.' },
    { join: '167 principal-office firms → Oregon state IA universe', status: 'REJECTED', count: 0, reason: 'Principal office is geography, not registration.' },
  ],
  rejectedTotals: [
    { total: 'Oregon has 167 investment advisers', reason: '167 is SEC/IARD principal-office geography, not a combined Oregon adviser universe.' },
    { total: '167 + 335 + 26 + 2,262 as Oregon advisers', reason: 'Incompatible grains.' },
    { total: 'Missing IAR/BD/complaint counts as zero', reason: 'Missing and search-only are unknown, not zero.' },
    { total: 'Oregon DFR regulatory activity rows = 0', reason: 'S- document rows were acquired (431/394). That is not zero, and it is not a combined adverse total with complaints or Form ADV disclosures.' },
  ],
  semanticGuardrails: [
    'ILLINOIS PRINCIPAL OFFICE != STATE REGISTRATION',
    'SEC RIA != ILLINOIS STATE RIA',
    'STATE RIA != FEDERAL-COVERED NOTICE FILING',
    'RIA != ERA',
    'IAR != FIRM',
    'BROKER-DEALER != IA',
    'REGISTERED REPRESENTATIVE != IAR',
    'RAUM != INVESTMENT PERFORMANCE',
    'COMPLAINT != VIOLATION',
    'DFR ACTION != IA DISCIPLINARY CENSUS',
    'NAME-ONLY ADVERSE MATCH = UNSAFE',
    'MISSING != ZERO',
    'SEARCH-ONLY != ZERO',
    'NO TRUST SCORE',
    'NO PAID RANKING',
  ],
};

snapshot.fingerprint = createHash('sha256').update(canonicalJson(snapshot)).digest('hex');

const ts = `/** Generated by scripts/build-or-public-snapshot.mjs. Do not edit by hand. */\nexport const OR_PUBLIC_SNAPSHOT = ${JSON.stringify(snapshot, null, 2)} as const;\nexport type OrPublicSnapshot = typeof OR_PUBLIC_SNAPSHOT;\n`;
writeFileSync(join(root, 'packages/domain/src/or-public-snapshot.ts'), ts, 'utf8');
writeFileSync(join(root, 'artifacts/or-inv-001-public-snapshot.json'), `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  fingerprint: snapshot.fingerprint,
  stateIa: STATE_IA_APPROVED,
  notice: NOTICE_FILED,
  era: STATE_ERA_ACTIVE,
  overlay: OR_PRINCIPAL_OFFICE,
  overlap: OVERLAP_IA_NOTICE,
}, null, 2));
