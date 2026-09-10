/**
 * VA-INV-001 — deterministic public snapshot.
 * Virginia state IA is selected by IAPD registration jurisdiction, not address.
 * Do not scrape IAPD/BrokerCheck/SCC search. Do not mint public firm profiles.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalJson } from './co-canonical-json.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const census = JSON.parse(readFileSync(join(root, 'data/virginia/va-inv-001/iapd-va-census.json'), 'utf8'));
const srf = JSON.parse(readFileSync(join(root, 'data/virginia/va-inv-001/srf-2025-aggregates.json'), 'utf8'));
const activity = JSON.parse(readFileSync(join(root, 'data/virginia/va-inv-001/regulatory-activity.json'), 'utf8'));

const VA_PRINCIPAL_OFFICE = 339;
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
const ACTIVITY_ROWS = activity.observation_rows;
const ACTIVITY_CASES = activity.distinct_case_numbers;

if (!String(census.state.filter).includes('Rgltr/@Cd=VA')) {
  throw new Error('Virginia state IA filter must use Rgltr/@Cd=VA');
}
if (STATE_IA_APPROVED === 4481) {
  throw new Error('Do not use 4,481 activity approvals as the state-IA firm denominator');
}

const snapshot = {
  version: 'investor-va-state-intel-v1',
  generatedFrom: {
    nationalRoster: 'packages/domain/src/investor-home-intel.ts V1_ROSTER_PRINCIPAL_OFFICE_STATES + V1_SEC_ROSTER',
    census: 'docs/inv-home-001-census.json principal_office_states VA',
    iapdStateCensus: 'data/virginia/va-inv-001/iapd-va-census.json',
    srfAnnualReport: 'data/virginia/va-inv-001/srf-2025-aggregates.json',
    regulatoryActivity: 'data/virginia/va-inv-001/regulatory-activity.json',
  },
  asOf: '2026-09-10',
  publicationGate: 'ON',
  publicEligibility: 'state_page',
  route: '/virginia',
  growthClassification: 'INTELLIGENCE_GROWTH_HEAVY',
  nationalOverlay: {
    vaPrincipalOfficeSecIardFirms: VA_PRINCIPAL_OFFICE,
    grain: 'SEC IARD roster firm with principal-office region = VA',
    source: 'IA_FIRM_SEC_Feed_08_27_2026',
    sourceAsOf: '2026-08-27',
    publishedAt: '2026-08-27',
    retrievedAt: '2026-08-28',
    snapshotAsOf: '2026-08-27',
    universe: TOTAL,
    resolvedPrincipalOfficeRegions: ROSTER_WITH_REGION,
    unresolvedPrincipalOfficeRegions: ROSTER_NULL_REGION,
    shareOfResolvedRegionsPct: Number(((100 * VA_PRINCIPAL_OFFICE) / ROSTER_WITH_REGION).toFixed(2)),
    searchHref: '/firms?state=VA',
    rawCompilationMainAddrVa: census.sec.co_principal_office_distinct_crd,
    label: 'SEC/IARD roster firms with a Virginia principal office',
    caveat:
      'This is the national SEC/IARD roster overlay for firms that report a Virginia principal office on the reconciled 23,622-firm geography table (VA = 339). It is not the Virginia state-registered adviser universe, not a federal-covered notice-filing count, and not proof of current Virginia SCC authority. VIRGINIA PRINCIPAL OFFICE != VIRGINIA STATE REGISTRATION. These 339 firms already exist in the federal graph and are not net-new organizations. A raw compilation MainAddr=@State=VA count is a different extract and is not this overlay.',
  },
  riaEra: {
    nationalRiaFacts: RIA,
    nationalEraFacts: ERA,
    nationalTotalFacts: TOTAL,
    vaPrincipalOfficeSplit: 'SOURCE_NOT_SPLIT',
    caveat:
      'National roster keeps RIA (17,018) and ERA (6,604) separate. Committed geography is on the combined roster. Virginia principal-office counts are not an RIA-only or ERA-only state denominator. ERA is not an RIA. SEC RIA is not a Virginia state RIA.',
  },
  firmMarket: {
    raumBandsByVirginiaPrincipalOffice: 'SOURCE_NOT_SPLIT',
    note: 'National RIA RAUM bands and Form ADV attributes exist on the federal spine. This snapshot does not invent a Virginia-only size ranking or treat RAUM as investment performance.',
  },
  stateRia: {
    STATE_RIA_BULK_ROSTER: 'ACQUIRED_IAPD_STATE_COMPILATION',
    access: 'ACQUIRED',
    completeStateRiaCount: STATE_IA_APPROVED,
    registrationRows: STATE_IA_ROWS,
    distinctFirmCrd: STATE_IA_CRD,
    approvedDistinctCrd: STATE_IA_APPROVED,
    termrequestDistinctCrd: STATE_IA_TERMREQUEST,
    filter: 'StateRgstn/Rgltr/@Cd=VA (registration jurisdiction). Not MainAddr/@State.',
    currentness: 'APPROVED = current state IA in this compilation. TERMREQUEST is not approved current. Annual-report 4,481 approvals/renewals/amendments is a 2025 activity count, not this firm universe.',
    source: 'IA_FIRM_STATE_Feed_08_27_2026',
    sourceAsOf: '2026-08-27',
    publishedAt: '2026-08-27',
    retrievedAt: '2026-08-28',
    snapshotAsOf: '2026-08-27',
    checksumSha256: census.state.sha256,
    releaseLabel: 'IA_FIRM_STATE_Feed_08_27_2026',
    officialUrl: 'https://reports.adviserinfo.sec.gov/reports/CompilationReports/IA_FIRM_STATE_Feed_08_27_2026.xml.gz',
    sccSearch: 'OPEN_SEARCH_ONLY',
    verifyUrl: 'https://adviserinfo.sec.gov/',
    sccHomeUrl: 'https://www.scc.virginia.gov/regulated-industries/securities-retail-franchising/',
    sccSearchUrl: 'https://www.scc.virginia.gov/regulated-industries/securities-retail-franchising/',
    iapdUrl: 'https://adviserinfo.sec.gov/',
    brokercheckUrl: 'https://brokercheck.finra.org/',
    label: 'Virginia state-registered investment-adviser firms',
    caveat:
      'IAPD state compilation firms with Virginia as the registration jurisdiction and status APPROVED. This is not an SEC RIA count, not a federal-covered notice-filing count, not an ERA count, and not the 339 principal-office overlay. Duplicate/multi-jurisdiction rows were collapsed to distinct firm CRD. State-only CRDs were not minted as public SEC firm profiles and were not added to the 23,622 SEC/IARD roster.',
  },
  stateEra: {
    STATE_ERA_REPORTING: 'ACQUIRED_IAPD_STATE_COMPILATION',
    registrationRows: STATE_ERA_ROWS,
    distinctFirmCrd: STATE_ERA_CRD,
    activeDistinctCrd: STATE_ERA_ACTIVE,
    overlapWithStateIa: census.state.ia_era_overlap_distinct_crd,
    filter: 'ERA/Rgltr/@Cd=VA (reporting jurisdiction). Not address. Not StateRgstn.',
    source: 'IA_FIRM_STATE_Feed_08_27_2026',
    sourceAsOf: '2026-08-27',
    retrievedAt: '2026-08-28',
    label: 'Virginia state ERA reporting firms',
    caveat: 'State ERA reporting is not a Virginia state RIA and is not an SEC RIA. Overlap with state IA is zero in this extract.',
  },
  federalNotice: {
    FEDERAL_COVERED_NOTICE_ROSTER: 'ACQUIRED_IAPD_SEC_COMPILATION',
    access: 'ACQUIRED',
    noticeRows: NOTICE_ROWS,
    noticeFiledDistinctCrd: NOTICE_FILED,
    noticeStatus: 'FILED',
    filter: 'NoticeFiled/States/@RgltrCd=VA',
    source: 'IA_FIRM_SEC_Feed_08_27_2026',
    sourceAsOf: '2026-08-27',
    publishedAt: '2026-08-27',
    retrievedAt: '2026-08-28',
    snapshotAsOf: '2026-08-27',
    overlapApprovedStateIa: census.overlaps.state_ia_approved_and_notice_filed,
    overlapApprovedStateIaJoinMethod: census.overlaps.state_ia_approved_and_notice_filed_joinMethod,
    overlapApprovedStateIaCrds: census.overlaps.state_ia_approved_and_notice_filed_crds,
    overlapApprovedStateIaReading:
      'The credential classes are separate but the source populations are not perfectly disjoint; four firm CRDs appear in both source-defined sets in the 2026-08-27 compilations. Exact-CRD inspection shows each CRD is APPROVED in StateRgstn/Rgltr/@Cd=VA and FILED in NoticeFiled/States/@RgltrCd=VA with FirmType=Registered. Neither classification was discarded.',
    filedFirmType: census.sec.co_notice_filed_firm_type,
    label: 'SEC/IARD firms with a Virginia notice filing',
    caveat:
      'Federal-covered / notice-filed is not Virginia state-RIA licensure. Notice-filed is not the 339 principal-office overlay. A Virginia principal office does not prove a current notice filing.',
  },
  iar: {
    IA_INDVL_FEED: 'ACQUIRED_NATIONAL_FEED',
    virginiaPersonDirectory: 'NOT_PUBLISHED',
    access: 'OPEN_SEARCH_ONLY',
    completeIarCount: 'UNKNOWN',
    grain: 'person CRD (not firm CRD)',
    source: 'IA_INDVL_Feed_08_27_2026',
    sourceAsOf: '2026-08-27',
    retrievedAt: '2026-08-28',
    verifyUrl: 'https://adviserinfo.sec.gov/',
    caveat:
      'The national IAR compilation exists. This ticket does not publish a Virginia person directory. IAR is not the firm. Search V1 remains firm-focused. SCC 18,946 IAR registrations/renewals approved is a 2025 activity count, not a unique-person universe.',
  },
  brokerDealer: {
    VA_BD_BULK_ROSTER: 'SOURCE_NOT_ACQUIRED',
    VA_AGENT_BULK_ROSTER: 'SOURCE_NOT_ACQUIRED',
    access: 'OPEN_SEARCH_ONLY',
    completeDealerCount: 'UNKNOWN',
    completeAgentCount: 'UNKNOWN',
    scc2025Approvals: srf.headline.broker_dealer_registrations_and_renewals_approved,
    scc2025AgentApprovals: srf.headline.broker_dealer_agent_registrations_and_renewals_approved,
    verifyUrl: 'https://brokercheck.finra.org/',
    caveat:
      'Broker-dealer is not an investment adviser. Agent is not an IAR. 1,859 BD registrations/renewals approved and 308,131 agent registrations/renewals approved are 2025 activity counts, not unique current firms or people. BrokerCheck is not scraped.',
  },
  sccAnnualReport: {
    year: 2025,
    grain: '2025_activity_process_count',
    notCurrentRegistrantUniverse: true,
    sourceUrl: srf.source_url,
    sourceAsOf: '2025',
    retrievedAt: '2026-09-10',
    headline: srf.headline,
    complaints: srf.items
      .filter((row) => row.section === 'TELEPHONE_CALLS_EMAILS_AND_COMPLAINTS' && String(row.label).startsWith('complaints'))
      .map((row) => ({ label: row.label, count: row.count })),
    audits: {
      investmentAdvisorAuditsCompleted: srf.headline.investment_advisor_audits_completed,
      auditViolationDeficienciesResolved: srf.headline.audit_violation_deficiencies_resolved,
      auditNeDiscipline: true,
      deficiencyResolvedNeEnforcementOrder: true,
    },
    caveat:
      'These are 2025 process/activity counts. Do not transform 4,481 investment adviser registrations, renewals, and amendments approved into a current firm universe. Audit is not discipline. Complaint is not a violation. Investigation is not a finding.',
  },
  enforcement: {
    pass: 'bounded_html_table',
    result: 'TABLE_ACQUIRED_NOT_ATTACHED',
    officialIndex: activity.source_url,
    coverage: 'Virginia SCC Securities & Retail Franchising regulatory activity table',
    observationRows: ACTIVITY_ROWS,
    distinctCaseNumbers: ACTIVITY_CASES,
    orderTypeDistribution: activity.order_type_distribution,
    dateMin: activity.date_min,
    dateMax: activity.date_max,
    rowsWithCrd: 0,
    rowsNameOnly: ACTIVITY_ROWS,
    pdfsDownloaded: 0,
    exactCrdCrosswalks: 0,
    doNotCalculateEnforcementRate: true,
    notInvestmentAdviserEnforcementCensus: true,
    profileAttachments: [],
    identityBar: 'EXACT_FIRM_CRD, EXACT_PERSON_CRD for person grain only, or EXACT_VIRGINIA_SCC_CASE_ORDER_ID',
    nameOnly: 'UNSAFE',
    namePlusCity: 'REVIEW_REQUIRED',
    sourceAsOf: null,
    retrievedAt: '2026-09-10',
    snapshotAsOf: '2026-09-10',
    caveat:
      'This is a mixed SCC Securities & Retail Franchising activity table (investment advisers, broker-dealers, individuals, issuers, franchises, and other respondents). Do not call every row investment-adviser enforcement. The table does not expose CRD/SEC IDs. Name-only attachment is unsafe. Case != criminal conviction. Action count is not quality. No action found is not a clean record.',
  },
  complaints: {
    publicResearchPath: 'https://www.scc.virginia.gov/consumers/consumer-investments/file-srf-complaint/',
    bulkComplaintDataset: 'AGGREGATE_ONLY',
    access: 'ANNUAL_REPORT_AGGREGATES',
    completeComplaintCount: 'UNKNOWN',
    categories: srf.items
      .filter((row) => row.section === 'TELEPHONE_CALLS_EMAILS_AND_COMPLAINTS' && String(row.label).startsWith('complaints'))
      .map((row) => ({ label: row.label, count: row.count })),
    investigationsCompleted: srf.headline.investigations_completed,
    caveat:
      '2025 complaint/investigation categories are aggregates. Complaint is not a violation. Investigation is not a finding. Referred is not guilt. No-violation in that category is not a perfect regulatory history. Do not answer firm-specific complaint questions with these totals.',
  },
  issuer: {
    framework: 'Virginia Securities Act (Va. Code §§ 13.1-501 through 13.1-527.3) administered by SCC Division of Securities and Retail Franchising.',
    bulkIssuerDataset: 'SOURCE_NOT_ACQUIRED',
    coverage: 'OPEN_SEARCH_AND_RULE_TEXT',
    note: 'Issuer is not an adviser. Franchise respondents in the activity table are not investment-adviser firms.',
  },
  formD: {
    overlay: 'SOURCE_NOT_ACQUIRED',
    caveat: 'FORM D / EFD FILING != VIRGINIA STATE APPROVAL. FORM D FILING != INVESTMENT QUALITY. FORM D FILING != ADVISER.',
  },
  exam: {
    firmResults: 'SOURCE_NOT_PUBLIC_AT_FIRM_GRAIN',
    passFailMetric: false,
    note: 'SCC 69 investment adviser audits completed is a 2025 activity count, not a firm-level scorecard. Audit is not discipline.',
  },
  investorEducation: {
    url: 'https://www.scc.virginia.gov/consumers/consumer-investments/investor-education-financial-literacy/',
    notFirmAdverseEvidence: true,
  },
  contacts: {
    policy: 'Official/public business sources only. No internet enrichment. No IAPD/BrokerCheck/SCC search scrape. No person contact publication from this ticket.',
    sccSearchScrape: false,
  },
  juiceSqueeze: [
    { decision: 'GRABBED — HIGH YIELD', source: 'Accepted IAPD Virginia firm/registration/notice/ERA slice' },
    { decision: 'GRABBED — HIGH YIELD', source: 'SCC Regulatory Activity table (mixed SRF subjects)' },
    { decision: 'GRABBED — EASY SECONDARY', source: '2025 SCC SRF annual-report aggregates including complaints and audits' },
    { decision: 'LEFT — SEARCH ONLY', source: 'Current SCC Examination/Registration Search (no bulk/export)' },
    { decision: 'LEFT — TOO MUCH WORK FOR CURRENT YIELD', source: 'Deep SCC order-PDF exact-ID census' },
    { decision: 'LEFT — TOO MUCH WORK FOR CURRENT YIELD', source: 'Individual U4/U5 histories and broker-agent current roster' },
    { decision: 'LEFT — SHARED NETWORK BACKLOG', source: 'SCC general corporate entity/officer graph' },
    { decision: 'LEFT — LOCAL / FUTURE', source: 'Fairfax/Arlington/Richmond/Virginia Beach investor pages' },
  ],
  regulatorMatrix: [
    {
      credential: 'SEC-registered investment adviser',
      regulator: 'U.S. SEC / IARD',
      identity: 'CRD / IARD firm ID; SEC file number',
      proves: 'Federal registration category as reported on Form ADV in the cited extract',
      doesNotProve: 'Virginia state-RIA licensure or current Virginia notice-filing status',
    },
    {
      credential: 'Exempt reporting adviser (ERA)',
      regulator: 'SEC / IARD (and Virginia reporting when applicable)',
      identity: 'CRD / IARD firm ID',
      proves: 'ERA reporting status in the cited extract',
      doesNotProve: 'SEC RIA registration or Virginia state-RIA licensure',
    },
    {
      credential: 'Virginia state-registered investment adviser',
      regulator: 'Virginia SCC Division of Securities and Retail Franchising / IARD',
      identity: 'Firm CRD / IARD',
      proves: 'Virginia state-IA registration when the official IARD state record says APPROVED',
      doesNotProve: 'SEC registration. Principal-office geography is not this credential. 4,481 2025 activity approvals are not this universe.',
    },
    {
      credential: 'Federally covered / notice-filed investment adviser',
      regulator: 'Virginia SCC (notice) / SEC (federal registration)',
      identity: 'CRD / IARD firm ID',
      proves: 'Notice-filing posture when the official IARD record says FILED',
      doesNotProve: 'Virginia state-RIA licensure',
    },
    {
      credential: 'Investment adviser representative',
      regulator: 'Virginia SCC / CRD',
      identity: 'Person CRD (not firm CRD)',
      proves: 'Individual representative reporting when official CRD evidence exists',
      doesNotProve: 'Firm registration. IAR is not the firm. IAR is not a broker-dealer agent.',
    },
    {
      credential: 'Broker-dealer / agent',
      regulator: 'Virginia SCC / FINRA / CRD',
      identity: 'Firm or person CRD',
      proves: 'Broker-dealer or agent registration when official evidence exists',
      doesNotProve: 'Investment-adviser registration',
    },
    {
      credential: 'Virginia SCC SRF regulatory activity row',
      regulator: 'Virginia SCC Division of Securities and Retail Franchising',
      identity: 'Exact case number; CRD only if source-native',
      proves: 'A public order/action observation on the official table',
      doesNotProve: 'That every row is an investment-adviser enforcement finding or a criminal conviction',
    },
  ],
  identityRules: {
    EXACT: ['firm CRD/IARD ID', 'person CRD for person grain only', 'SEC file number where source-native', 'exact official Virginia SCC case/order ID'],
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
    ANNUAL_ACTIVITY_IS_NOT_CURRENT_UNIVERSE: true,
    AUDIT_IS_NOT_DISCIPLINE: true,
    COMPLAINT_IS_NOT_VIOLATION: true,
    INVESTIGATION_IS_NOT_FINDING: true,
    REGULATORY_CASE_IS_NOT_CRIMINAL_CONVICTION: true,
    note: 'Credential/grain rules. They do not require disjoint CRD sets or unequal counts.',
  },
  profileAttachments: [],
  expansionLedger: {
    PRE_INGEST_INVESTOR_CANONICAL_FIRMS: CANONICAL,
    VA_PRINCIPAL_OFFICE_FIRMS: VA_PRINCIPAL_OFFICE,
    VA_STATE_IA_REGISTRATION_ROWS: STATE_IA_ROWS,
    VA_STATE_IA_APPROVED_OR_CURRENT_FIRMS: STATE_IA_APPROVED,
    VA_FEDERAL_NOTICE_ROWS: NOTICE_FILED,
    VA_ERA_OR_SOURCE_EXEMPT_ROWS: STATE_ERA_ACTIVE,
    NEW_VA_STATE_IDENTITIES: STATE_IA_CRD + STATE_ERA_CRD,
    NET_NEW_CANONICAL_ORGANIZATIONS: 0,
    NET_NEW_PUBLIC_INVESTOR_PROFILES: 0,
    SCC_2025_AGGREGATE_METRICS_ACQUIRED: true,
    NEW_VA_REGULATORY_ACTIVITY_ROWS: ACTIVITY_ROWS,
    VA_REGULATORY_ACTIVITY_DISTINCT_CASES: ACTIVITY_CASES,
    EXACT_CRD_ADVERSE_CROSSWALKS: 0,
    REVIEW_REQUIRED_CROSSWALKS: 0,
    REJECTED_UNSAFE_CROSSWALKS: ACTIVITY_ROWS,
    EXACT_PROFILE_ATTACHMENTS: 0,
    notes: {
      overlay: '339 Virginia principal-office firms already existed on the federal SEC/IARD spine. Not new organizations.',
      stateRoster:
        'IAPD state compilation added 700 distinct Virginia state-IA CRDs and 107 distinct Virginia state-ERA CRDs as state-intelligence identities. They were not minted as canonical organizations or public /firm profiles.',
      notice: '3,289 notice-filing rows are observations, not extra firms.',
      activity: '146 mixed SRF activity rows / 113 distinct cases were acquired as state-level evidence. Zero exact CRD attachments.',
    },
  },
  preIngestBaseline: {
    virginiaPrincipalOfficeFirmsAlreadyInFederalGraph: VA_PRINCIPAL_OFFICE,
    canonicalFirmsAlreadyPresent: CANONICAL,
    note: 'Recomputed from V1_ROSTER_PRINCIPAL_OFFICE_STATES VA = 339. Do not call these firms new.',
  },
  sourceInventory: [
    { authority: 'SEC / IAPD', source: 'IA_FIRM_SEC_Feed_08_27_2026', coverageStatus: 'ACQUIRED', sourceAsOf: '2026-08-27', retrievedAt: '2026-08-28', count: TOTAL },
    { authority: 'IAPD', source: 'IA_FIRM_STATE_Feed_08_27_2026', coverageStatus: 'ACQUIRED', sourceAsOf: '2026-08-27', retrievedAt: '2026-08-28', count: STATE_IA_APPROVED },
    { authority: 'Virginia SCC SRF', source: '2025 annual report', coverageStatus: 'ACQUIRED', sourceAsOf: '2025', retrievedAt: '2026-09-10', count: srf.items.length },
    { authority: 'Virginia SCC SRF', source: 'Regulatory Activity table', coverageStatus: 'ACQUIRED_NOT_ATTACHED', sourceAsOf: null, retrievedAt: '2026-09-10', count: ACTIVITY_ROWS },
    { authority: 'Virginia SCC', source: 'Examination/Registration Search', coverageStatus: 'OPEN_SEARCH_ONLY', sourceAsOf: null, retrievedAt: '2026-09-10', count: null },
  ],
  gaps: [
    'Current SCC registration search has no bulk/export; live 2026 registrant universe is OPEN_SEARCH_ONLY.',
    'SCC order PDFs were not harvested for exact CRD/SEC IDs.',
    'Complete Virginia IAR person universe is UNKNOWN and is not published as a directory.',
    'Complete Virginia broker-dealer and agent rosters are UNKNOWN.',
    'SCC corporate entity/officer graph is SHARED_NETWORK_BACKLOG.',
    'No Virginia city/county investor pages.',
  ],
  rejectedJoins: [
    { join: 'name-only SCC activity row → public firm profile', status: 'REJECTED_UNSAFE', count: ACTIVITY_ROWS, reason: 'Name alone is unsafe for adverse attachment.' },
    { join: 'person CRD → firm CRD', status: 'REJECTED_UNSAFE', count: 0, reason: 'Exact person CRD does not become firm CRD.' },
    { join: '4,481 2025 IA approvals → current firm universe', status: 'REJECTED', count: 0, reason: 'Activity count is not a current firm denominator.' },
  ],
  rejectedTotals: [
    { total: 'Virginia has 339 investment advisers', reason: '339 is SEC/IARD principal-office geography, not a combined Virginia adviser universe.' },
    { total: '339 + 697 + 3,289 + 107 as Virginia advisers', reason: 'Incompatible grains.' },
    { total: '4,481 registrations/renewals/amendments approved as firms', reason: '2025 activity, not unique current firms.' },
    { total: '18,946 IAR registrations as firms', reason: 'Person activity is not firm grain.' },
    { total: 'Missing IAR/BD/complaint counts as zero', reason: 'Missing and search-only are unknown, not zero.' },
  ],
  semanticGuardrails: [
    'VIRGINIA PRINCIPAL OFFICE != STATE REGISTRATION',
    'SEC RIA != VIRGINIA STATE RIA',
    'STATE RIA != FEDERAL-COVERED NOTICE FILING',
    'RIA != ERA',
    'IAR != FIRM',
    'BROKER-DEALER != IA',
    'AGENT != IAR',
    'RAUM != INVESTMENT PERFORMANCE',
    'COMPLAINT != VIOLATION',
    'INVESTIGATION != FINDING',
    'AUDIT != DISCIPLINE',
    'REGULATORY CASE != CRIMINAL CONVICTION',
    'ANNUAL ACTIVITY != CURRENT UNIVERSE',
    'NAME-ONLY ADVERSE MATCH = UNSAFE',
    'MISSING != ZERO',
    'NO TRUST SCORE',
    'NO PAID RANKING',
  ],
};

snapshot.fingerprint = createHash('sha256').update(canonicalJson(snapshot)).digest('hex');

const ts = `/** Generated by scripts/build-va-public-snapshot.mjs. Do not edit by hand. */\nexport const VA_PUBLIC_SNAPSHOT = ${JSON.stringify(snapshot, null, 2)} as const;\nexport type VaPublicSnapshot = typeof VA_PUBLIC_SNAPSHOT;\n`;
writeFileSync(join(root, 'packages/domain/src/va-public-snapshot.ts'), ts, 'utf8');
writeFileSync(join(root, 'artifacts/va-inv-001-public-snapshot.json'), `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  fingerprint: snapshot.fingerprint,
  stateIa: STATE_IA_APPROVED,
  notice: NOTICE_FILED,
  era: STATE_ERA_ACTIVE,
  overlay: VA_PRINCIPAL_OFFICE,
  activityRows: ACTIVITY_ROWS,
  cases: ACTIVITY_CASES,
}, null, 2));
