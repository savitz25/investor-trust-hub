/**
 * CO-INV-001 — deterministic public snapshot.
 * Colorado state IA is selected by IAPD registration jurisdiction, not address.
 * Do not scrape IAPD/BrokerCheck/DORA search. Do not mint public firm profiles.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalJson } from './co-canonical-json.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const census = JSON.parse(
  readFileSync(join(root, 'data/colorado/co-inv-001/iapd-co-census.json'), 'utf8'),
);
const enforcement = JSON.parse(
  readFileSync(join(root, 'data/colorado/co-inv-001/enforcement-coverage.json'), 'utf8'),
);

const CO_PRINCIPAL_OFFICE = 589;
const ROSTER_WITH_REGION = 17997;
const ROSTER_NULL_REGION = 5625;
const RIA = 17018;
const ERA = 6604;
const TOTAL = 23622;
const STATE_IA_ROWS = census.state.co_state_ia_registration_rows;
const STATE_IA_CRD = census.state.co_state_ia_distinct_crd;
const STATE_IA_APPROVED = census.state.co_state_ia_approved_distinct_crd;
const STATE_IA_TERMREQUEST = census.state.co_state_ia_termrequest_distinct_crd;
const STATE_ERA_ROWS = census.state.co_state_era_registration_rows;
const STATE_ERA_CRD = census.state.co_state_era_distinct_crd;
const STATE_ERA_ACTIVE = census.state.co_state_era_active_distinct_crd;
const NOTICE_FILED = census.sec.co_notice_filed_distinct_crd;
const NOTICE_ROWS = census.sec.co_notice_rows;
const SANCTIONS_ENTRIES = enforcement.sanctionsAgainstLicensees.datedNarrativeEntries;
const SANCTIONS_NAME_ONLY = enforcement.sanctionsAgainstLicensees.entriesNameOnly;

if (census.state.filter.includes('MainAddr/@State=CO') && !/Not MainAddr|not address/i.test(census.state.filter)) {
  throw new Error('Colorado state IA must be selected by registration jurisdiction, not address');
}
if (!String(census.state.filter).includes('Rgltr/@Cd=CO')) {
  throw new Error('Colorado state IA filter must use Rgltr/@Cd=CO');
}

const snapshot = {
  version: 'investor-co-state-intel-v1',
  generatedFrom: {
    nationalRoster: 'packages/domain/src/investor-home-intel.ts V1_ROSTER_PRINCIPAL_OFFICE_STATES + V1_SEC_ROSTER',
    census: 'docs/inv-home-001-census.json principal_office_states CO',
    iapdStateCensus: 'data/colorado/co-inv-001/iapd-co-census.json',
    enforcementCoverage: 'data/colorado/co-inv-001/enforcement-coverage.json',
  },
  asOf: '2026-09-09',
  publicationGate: 'ON',
  publicEligibility: 'state_page',
  route: '/colorado',
  growthClassification: 'INTELLIGENCE_GROWTH_HEAVY',
  nationalOverlay: {
    coPrincipalOfficeSecIardFirms: CO_PRINCIPAL_OFFICE,
    grain: 'SEC IARD roster firm with principal-office region = CO',
    source: 'IA_FIRM_SEC_Feed_08_27_2026',
    sourceAsOf: '2026-08-27',
    publishedAt: '2026-08-27',
    retrievedAt: '2026-08-28',
    snapshotAsOf: '2026-08-27',
    universe: TOTAL,
    resolvedPrincipalOfficeRegions: ROSTER_WITH_REGION,
    unresolvedPrincipalOfficeRegions: ROSTER_NULL_REGION,
    shareOfResolvedRegionsPct: Number(((100 * CO_PRINCIPAL_OFFICE) / ROSTER_WITH_REGION).toFixed(2)),
    searchHref: '/firms?state=CO',
    label: 'SEC/IARD roster firms with a Colorado principal office',
    caveat:
      'This is the national SEC/IARD roster overlay for firms that report a Colorado principal office on the reconciled 23,622-firm geography table (CO = 589). It is not the Colorado state-registered adviser universe, not a federal-covered notice-filing count, and not proof of current Colorado Division of Securities authority. COLORADO PRINCIPAL OFFICE != COLORADO STATE REGISTRATION. These 589 firms already exist in the federal graph and are not net-new organizations. A raw compilation MainAddr=@State=CO count is a different extract and is not this overlay.',
  },
  riaEra: {
    nationalRiaFacts: RIA,
    nationalEraFacts: ERA,
    nationalTotalFacts: TOTAL,
    coPrincipalOfficeSplit: 'SOURCE_NOT_SPLIT',
    caveat:
      'National roster keeps RIA (17,018) and ERA (6,604) separate. Committed geography is on the combined roster. Colorado principal-office counts are not an RIA-only or ERA-only state denominator. ERA is not an RIA. SEC RIA is not a Colorado state RIA.',
  },
  firmMarket: {
    raumBandsByColoradoPrincipalOffice: 'SOURCE_NOT_SPLIT',
    employeeCountsByColoradoPrincipalOffice: 'SOURCE_NOT_SPLIT',
    clientMixByColoradoPrincipalOffice: 'SOURCE_NOT_SPLIT',
    note: 'National RIA RAUM bands and Form ADV attributes exist on the federal spine. This snapshot does not invent a Colorado-only size ranking or treat RAUM as investment performance.',
  },
  stateRia: {
    STATE_RIA_BULK_ROSTER: 'ACQUIRED_IAPD_STATE_COMPILATION',
    access: 'ACQUIRED',
    completeStateRiaCount: STATE_IA_APPROVED,
    registrationRows: STATE_IA_ROWS,
    distinctFirmCrd: STATE_IA_CRD,
    approvedDistinctCrd: STATE_IA_APPROVED,
    termrequestDistinctCrd: STATE_IA_TERMREQUEST,
    filter: 'StateRgstn/Rgltr/@Cd=CO (registration jurisdiction). Not MainAddr/@State.',
    currentness: 'APPROVED = current state IA in this compilation. TERMREQUEST is not approved current.',
    source: 'IA_FIRM_STATE_Feed_08_27_2026',
    sourceAsOf: '2026-08-27',
    publishedAt: '2026-08-27',
    retrievedAt: '2026-08-28',
    snapshotAsOf: '2026-08-27',
    checksumSha256: census.state.sha256,
    releaseLabel: 'IA_FIRM_STATE_Feed_08_27_2026',
    officialUrl:
      'https://reports.adviserinfo.sec.gov/reports/CompilationReports/IA_FIRM_STATE_Feed_08_27_2026.xml.gz',
    coloradoDoraRosterCsv: 'SOURCE_NOT_ACQUIRED',
    verifyUrl: 'https://www.nasaa.org/verify-a-license/',
    securitiesHomeUrl: 'https://securities.colorado.gov/',
    iaRegistrationUrl:
      'https://securities.colorado.gov/investment-advisers-and-investment-adviser-representatives',
    iapdUrl: 'https://adviserinfo.sec.gov/',
    brokercheckUrl: 'https://brokercheck.finra.org/',
    label: 'Colorado state-registered investment-adviser firms',
    caveat:
      'IAPD state compilation firms with Colorado as the registration jurisdiction and status APPROVED. This is not an SEC RIA count, not a federal-covered notice-filing count, not an ERA count, and not the 589 principal-office overlay. Duplicate/multi-jurisdiction rows were collapsed to distinct firm CRD. State-only CRDs were not minted as public SEC firm profiles and were not added to the 23,622 SEC/IARD roster.',
  },
  stateEra: {
    STATE_ERA_REPORTING: 'ACQUIRED_IAPD_STATE_COMPILATION',
    registrationRows: STATE_ERA_ROWS,
    distinctFirmCrd: STATE_ERA_CRD,
    activeDistinctCrd: STATE_ERA_ACTIVE,
    overlapWithStateIa: census.state.ia_era_overlap_distinct_crd,
    filter: 'ERA/Rgltr/@Cd=CO (reporting jurisdiction). Not address. Not StateRgstn.',
    source: 'IA_FIRM_STATE_Feed_08_27_2026',
    sourceAsOf: '2026-08-27',
    retrievedAt: '2026-08-28',
    label: 'Colorado state ERA reporting firms',
    caveat: 'State ERA reporting is not a Colorado state RIA and is not an SEC RIA. Overlap with state IA is zero in this extract.',
  },
  federalNotice: {
    FEDERAL_COVERED_NOTICE_ROSTER: 'ACQUIRED_IAPD_SEC_COMPILATION',
    access: 'ACQUIRED',
    noticeRows: NOTICE_ROWS,
    noticeFiledDistinctCrd: NOTICE_FILED,
    noticeStatus: 'FILED',
    filter: 'NoticeFiled/States/@RgltrCd=CO',
    source: 'IA_FIRM_SEC_Feed_08_27_2026',
    sourceAsOf: '2026-08-27',
    publishedAt: '2026-08-27',
    retrievedAt: '2026-08-28',
    snapshotAsOf: '2026-08-27',
    overlapApprovedStateIa: census.overlaps.state_ia_approved_and_notice_filed,
    overlapApprovedStateIaJoinMethod: census.overlaps.state_ia_approved_and_notice_filed_joinMethod,
    overlapApprovedStateIaCrds: census.overlaps.state_ia_approved_and_notice_filed_crds,
    overlapApprovedStateIaReading:
      'The credential classes are separate but the source populations are not perfectly disjoint; six firm CRDs appear in both source-defined sets in the 2026-08-27 compilations. Exact-CRD inspection shows each CRD is APPROVED in StateRgstn/Rgltr/@Cd=CO and FILED in NoticeFiled/States/@RgltrCd=CO with FirmType=Registered. Several SEC Rgstn dates are 2026 while the corresponding state APPROVED dates are earlier, which is consistent with coexisting official records and possible transition or status lag. Neither classification was discarded.',
    overlapPrincipalOfficeRawMainAddr: census.sec.principal_and_notice_filed,
    filedFirmType: census.sec.co_notice_filed_firm_type,
    label: 'SEC/IARD firms with a Colorado notice filing',
    caveat:
      'Federal-covered / notice-filed is not Colorado state-RIA licensure. Notice-filed is not the 589 principal-office overlay. A Colorado principal office does not prove a current notice filing. The credential classes are separate but the source populations are not perfectly disjoint; six firm CRDs appear in both source-defined sets in the 2026-08-27 compilations.',
  },
  iar: {
    IA_INDVL_FEED: 'ACQUIRED_NATIONAL_FEED',
    coloradoPersonDirectory: 'NOT_PUBLISHED',
    access: 'OPEN_SEARCH_ONLY',
    completeIarCount: 'UNKNOWN',
    grain: 'person CRD (not firm CRD)',
    source: 'IA_INDVL_Feed_08_27_2026',
    sourceAsOf: '2026-08-27',
    publishedAt: '2026-08-27',
    retrievedAt: '2026-08-28',
    verifyUrl: 'https://adviserinfo.sec.gov/',
    ceUrl: 'https://securities.colorado.gov/information-on-new-iar-continuing-education-requirements-faqs',
    iaRegistrationUrl:
      'https://securities.colorado.gov/investment-advisers-and-investment-adviser-representatives',
    caveat:
      'The national IAR compilation exists. This ticket does not publish a Colorado person directory and does not resolve person CRD as firm CRD. IAR is not the firm. IAR is not a salesperson. Search V1 remains firm-focused.',
  },
  brokerDealer: {
    CO_BD_BULK_ROSTER: 'SOURCE_NOT_ACQUIRED',
    CO_SALESPERSON_BULK_ROSTER: 'SOURCE_NOT_ACQUIRED',
    access: 'OPEN_SEARCH_ONLY',
    completeDealerCount: 'UNKNOWN',
    completeSalespersonCount: 'UNKNOWN',
    verifyUrl: 'https://brokercheck.finra.org/',
    licensingUrl: 'https://securities.colorado.gov/broker-dealers-sales-representatives',
    caveat:
      'Broker-dealer is not an investment adviser. Salesperson is not an IAR. Dual registration is possible and does not collapse the credentials. BrokerCheck is not scraped.',
  },
  enforcement: {
    pass: 'bounded_html_index',
    result: 'NARRATIVE_INDEX_PROFILED_NOT_ATTACHED',
    officialIndex: enforcement.officialIndex,
    sanctionsUrl: enforcement.sanctionsUrl,
    coverage: enforcement.enforcementActions.coverage,
    sanctionsCoverage: enforcement.sanctionsAgainstLicensees.coverage,
    indexColumns: [],
    indexRowsExtracted: 0,
    sanctionsNarrativeEntries: SANCTIONS_ENTRIES,
    rowsWithCrdInRespondentText: 0,
    rowsNameOnly: SANCTIONS_NAME_ONLY,
    pdfsDownloaded: 0,
    nativeActionClassColumn: false,
    nativeClassesObservedOnIndex: [],
    doNotCalculateEnforcementRate: true,
    profileAttachments: [],
    identityBar: 'EXACT_FIRM_CRD, EXACT_PERSON_CRD for person grain only, or EXACT_COLORADO_CASE_ORDER_FILE_ID',
    nameOnly: 'UNSAFE',
    namePlusCity: 'REVIEW_REQUIRED',
    peopleDirectoryPublished: false,
    sourceAsOf: null,
    publishedAt: null,
    retrievedAt: enforcement.retrievedAt,
    snapshotAsOf: '2026-09-09',
    caveat:
      'The Division publishes an enforcement-actions table and a sanctions-against-licensees narrative. The table is JS-rendered and was not extracted as bulk rows. Ten dated narrative entries were profiled; none contain CRD/IARD in static HTML. Name-only attachment is unsafe. Action count is not quality. No action found is not a clean record. Complaint is not a violation. Allegation is not a final finding.',
  },
  complaints: {
    publicResearchPath: 'https://securities.colorado.gov/file-a-complaint',
    bulkComplaintDataset: 'SOURCE_NOT_ACQUIRED',
    access: 'PUBLIC_RESEARCH_PATH',
    completeComplaintCount: 'UNKNOWN',
    caveat:
      'A public complaint form is a research path. Complaint volume was not acquired. Complaint is not a violation. Missing complaints are unknown, not zero.',
  },
  issuer: {
    framework:
      'Colorado Securities Act (C.R.S. Title 11, Article 51) administered by the Colorado Division of Securities — investment-adviser and IAR licensure, federally covered adviser notice filing, broker-dealer and salesperson licensing, and securities registration/exemptions/notice filings.',
    professionalsUrl:
      'https://securities.colorado.gov/investment-advisers-and-investment-adviser-representatives',
    securitiesRegistrationUrl: 'https://securities.colorado.gov/registering-securities',
    efdUrl: 'https://nasaaefd.org/',
    statutesUrl: 'https://securities.colorado.gov/statutes-and-rules-2',
    statute: 'C.R.S. Title 11, Article 51',
    bulkIssuerDataset: 'SOURCE_NOT_ACQUIRED',
    coverage: 'OPEN_SEARCH_AND_RULE_TEXT',
    note: 'Federal Form D is not Colorado qualification or approval. EFD/notice filings are not a quality ranking. No statewide issuer bulk denominator was acquired. Issuer is not an adviser.',
  },
  formD: {
    overlay: 'SOURCE_NOT_ACQUIRED',
    efdPath: 'https://nasaaefd.org/',
    coloradoInstruction:
      'https://securities.colorado.gov/division-of-securities-forms-and-fees',
    caveat: 'FORM D / EFD FILING != COLORADO STATE APPROVAL. FORM D FILING != INVESTMENT QUALITY. FORM D FILING != ADVISER.',
  },
  exam: {
    programPage: 'https://securities.colorado.gov/division-of-securities-examinations',
    prioritiesPage:
      'https://securities.colorado.gov/press-release/alert-the-colorado-division-of-securities-announces-2026-investment-adviser',
    cePage: 'https://securities.colorado.gov/information-on-new-iar-continuing-education-requirements-faqs',
    qualifyingExams: ['Series 65', 'Securities Industry Essentials and Series 66'],
    designationWaivers: ['CFP', 'CFA', 'CIC', 'ChFC', 'PFS'],
    currentPublicSampleLikeNj2026: false,
    firmResults: 'SOURCE_NOT_PUBLIC_AT_FIRM_GRAIN',
    passFailMetric: false,
    note: 'Colorado publishes examination-process guidance, 2026 examination priorities, and IAR continuing-education rules. That is qualification and exam-program context, not a public firm-level examination scorecard and not a person exam directory. Exam requirement is not a quality score. CE is not investment performance.',
  },
  investorEducation: {
    url: 'https://securities.colorado.gov/for-consumers/investors-2',
    protectUrl: 'https://protectyourinvestments.colorado.gov/',
    registrationChecksUrl: 'https://www.nasaa.org/verify-a-license/',
    use: 'consumer education / source coverage',
    notFirmAdverseEvidence: true,
  },
  contacts: {
    policy:
      'Official/public business sources only. No internet enrichment. No IAPD/BrokerCheck/DORA search scrape. No person contact publication from this ticket.',
    doraSearchScrape: false,
    federalPrincipalOfficeAddress:
      'Used only as geography for the SEC/IARD overlay; not republished here as a harvested directory.',
  },
  regulatorMatrix: [
    {
      credential: 'SEC-registered investment adviser',
      regulator: 'U.S. Securities and Exchange Commission / IARD',
      identity: 'CRD / IARD firm ID; SEC file number',
      verification: 'IAPD and InvestorTrustHub firm research',
      proves: 'Federal registration category as reported on Form ADV in the cited extract',
      doesNotProve: 'Colorado state-RIA licensure or current Colorado notice-filing status',
    },
    {
      credential: 'Exempt reporting adviser (ERA)',
      regulator: 'SEC / IARD (and Colorado notice/reporting when applicable)',
      identity: 'CRD / IARD firm ID',
      verification: 'IAPD Form ADV reporting status',
      proves: 'ERA reporting status in the cited extract',
      doesNotProve: 'SEC RIA registration or Colorado state-RIA licensure',
    },
    {
      credential: 'Colorado state-registered investment adviser',
      regulator: 'Colorado Division of Securities / IARD',
      identity: 'Firm CRD / IARD',
      verification: 'IAPD state compilation jurisdiction CO + NASAA/IAPD verification — not scraped',
      proves: 'Colorado state-IA registration when the official IARD state record says APPROVED',
      doesNotProve: 'SEC registration. Principal-office geography is not this credential.',
    },
    {
      credential: 'Federally covered / notice-filed investment adviser',
      regulator: 'Colorado Division of Securities (notice) / SEC (federal registration)',
      identity: 'CRD / IARD firm ID',
      verification: 'IAPD NoticeFiled RgltrCd=CO',
      proves: 'Notice-filing posture when the official IARD record says FILED',
      doesNotProve: 'Colorado state-RIA licensure. Notice-filed is not the state-licensed universe.',
    },
    {
      credential: 'Investment adviser representative',
      regulator: 'Colorado Division of Securities / CRD',
      identity: 'Person CRD (not firm CRD)',
      verification: 'IAPD individual search — not scraped here',
      proves: 'Individual representative reporting when official CRD evidence exists',
      doesNotProve: 'Firm registration. IAR is not the firm. IAR is not a salesperson.',
    },
    {
      credential: 'Broker-dealer / securities salesperson',
      regulator: 'Colorado Division of Securities / FINRA / CRD',
      identity: 'Firm or person CRD',
      verification: 'FINRA BrokerCheck — not scraped here',
      proves: 'Broker-dealer or salesperson registration when official evidence exists',
      doesNotProve: 'Investment-adviser registration',
    },
    {
      credential: 'Issuer / securities filing',
      regulator: 'Colorado Division of Securities / NASAA EFD / SEC EDGAR',
      identity: 'Official filing/order number, CIK, accession, or EFD ID when present',
      verification: 'Colorado registering-securities paths and NASAA EFD',
      proves: 'A registration, exemption, or notice-filing posture when the official filing record says so',
      doesNotProve: 'Investment quality, Form D approval, or adviser registration',
    },
    {
      credential: 'CRD / IARD identifier',
      regulator: 'FINRA CRD / IARD infrastructure',
      identity: 'CRD number',
      verification: 'IAPD / BrokerCheck / Colorado Division when returned',
      proves: 'A stable identity key when source-native',
      doesNotProve: 'Current Colorado authority by itself',
    },
  ],
  identityRules: {
    EXACT: [
      'firm CRD/IARD ID',
      'person CRD for person grain only',
      'SEC file number where source-native',
      'exact official Colorado case/order/file ID',
      'CIK/accession/EFD ID for issuer grain',
    ],
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
    note: 'Credential/grain rules. They do not require disjoint CRD sets or unequal counts.',
  },
  profileAttachments: [],
  expansionLedger: {
    PRE_INGEST_COLORADO_PRINCIPAL_OFFICE_FIRMS: CO_PRINCIPAL_OFFICE,
    NET_NEW_CANONICAL_ORGANIZATIONS: 0,
    NET_NEW_PUBLIC_INVESTOR_PROFILES: 0,
    NEW_STATE_IDENTITIES: STATE_IA_CRD + STATE_ERA_CRD,
    EXISTING_ORGANIZATIONS_ENRICHED: 0,
    NEW_STATE_REGISTRATION_ROWS: STATE_IA_ROWS + STATE_ERA_ROWS,
    NEW_FEDERAL_NOTICE_FILING_ROWS: NOTICE_FILED,
    TOTAL_NEW_COLORADO_REGULATORY_OBSERVATION_ROWS: STATE_IA_ROWS + STATE_ERA_ROWS + NOTICE_FILED,
    NEW_ENFORCEMENT_EVIDENCE_ROWS: SANCTIONS_ENTRIES,
    EXACT_ADVERSE_PROFILE_ATTACHMENTS: 0,
    REVIEW_REQUIRED_JOINS: 0,
    REJECTED_UNSAFE_JOINS: SANCTIONS_NAME_ONLY,
    notes: {
      overlay:
        '589 Colorado principal-office firms already existed on the federal SEC/IARD spine. Not new organizations.',
      stateRoster:
        'IAPD state compilation added 741 distinct Colorado state-IA CRDs and 209 distinct Colorado state-ERA CRDs as state-intelligence identities. They were not minted as canonical organizations or public /firm profiles. Exact CRD enrichment did not create duplicate canonical organizations.',
      notice:
        'NEW_FEDERAL_NOTICE_FILING_ROWS = 3,673 is a notice-filing observation count, not extra firms, not extra canonical organizations, and not a Colorado adviser denominator. TOTAL_NEW_COLORADO_REGULATORY_OBSERVATION_ROWS = 4,623 is 950 state IA/ERA rows + 3,673 notice-filing rows. Observation rows are not unique CRDs, firms, or advisers.',
      enforcement:
        '10 sanctions narrative entries were profiled. All 10 are name-only in static HTML and were rejected as unsafe adverse joins. Zero exact attachments.',
    },
  },
  preIngestBaseline: {
    coloradoPrincipalOfficeFirmsAlreadyInFederalGraph: CO_PRINCIPAL_OFFICE,
    coloradoStateIdentitiesAlreadyPresent: 0,
    coloradoStateEvidenceAlreadyAttached: 0,
    note: 'Recomputed from V1_ROSTER_PRINCIPAL_OFFICE_STATES CO = 589 on the reconciled SEC/IARD roster geography table. Do not call these firms new.',
  },
  sourceInventory: [
    {
      authority: 'SEC / IAPD',
      source: 'IA_FIRM_SEC_Feed_08_27_2026',
      grain: 'SEC/IARD firm; principal-office region; NoticeFiled jurisdiction',
      accessMode: 'official bulk compilation',
      coverageStatus: 'ACQUIRED',
      sourceAsOf: '2026-08-27',
      retrievedAt: '2026-08-28',
      count: TOTAL,
      limitation: 'Reconciled public roster is 23,622. Principal-office CO overlay is 589, not state registration.',
    },
    {
      authority: 'IAPD (FINRA-held state compilation)',
      source: 'IA_FIRM_STATE_Feed_08_27_2026',
      grain: 'Firm CRD; StateRgstn/Rgltr/@Cd jurisdiction; ERA/Rgltr/@Cd jurisdiction',
      accessMode: 'official bulk compilation',
      coverageStatus: 'ACQUIRED',
      sourceAsOf: '2026-08-27',
      retrievedAt: '2026-08-28',
      count: STATE_IA_APPROVED,
      limitation:
        'Safe as the current Colorado bulk state-IA layer when labeled as IAPD state compilation APPROVED jurisdiction=CO. Not a Colorado Division CSV. Registration rows and distinct CRD stay separate fields.',
    },
    {
      authority: 'IAPD',
      source: 'IA_INDVL_Feed_08_27_2026',
      grain: 'person CRD / IAR registration',
      accessMode: 'official bulk compilation',
      coverageStatus: 'ACQUIRED_NATIONAL_FEED',
      sourceAsOf: '2026-08-27',
      retrievedAt: '2026-08-28',
      count: null,
      limitation: 'Colorado person extract is not published as a directory. Missing person count is unknown, not zero.',
    },
    {
      authority: 'Colorado Division of Securities',
      source: 'securities.colorado.gov enforcement-actions / sanctions-against-licensees',
      grain: 'HTML index / narrative sanction entry',
      accessMode: 'official public web',
      coverageStatus: 'INDEX_PROFILED_NOT_ATTACHED',
      sourceAsOf: null,
      retrievedAt: '2026-09-09',
      count: SANCTIONS_ENTRIES,
      limitation: 'JS table not extracted. Name-only rows are unsafe. No clean-history inference.',
    },
    {
      authority: 'Colorado Division of Securities',
      source: 'File a Complaint',
      grain: 'public research path',
      accessMode: 'official public web',
      coverageStatus: 'PUBLIC_RESEARCH_PATH',
      sourceAsOf: null,
      retrievedAt: '2026-09-09',
      count: null,
      limitation: 'Bulk complaints SOURCE_NOT_ACQUIRED. Unknown is not zero.',
    },
    {
      authority: 'NASAA EFD / SEC EDGAR',
      source: 'Form D / EFD',
      grain: 'issuer filing',
      accessMode: 'official public web',
      coverageStatus: 'OPEN_SEARCH_ONLY',
      sourceAsOf: null,
      retrievedAt: '2026-09-09',
      count: null,
      limitation: 'No bulk Form D Colorado overlay. Filing is not approval.',
    },
    {
      authority: 'FINRA',
      source: 'BrokerCheck',
      grain: 'broker-dealer / salesperson',
      accessMode: 'official search',
      coverageStatus: 'OPEN_SEARCH_ONLY',
      sourceAsOf: null,
      retrievedAt: null,
      count: null,
      limitation: 'Not scraped. BD != IA. Salesperson != IAR.',
    },
  ],
  gaps: [
    'Colorado Division of Securities does not publish a downloadable state-IA CSV on the public site; the bulk state-IA layer used here is the IAPD state compilation, not a DORA extract.',
    'Complete Colorado IAR person universe is UNKNOWN and is not published as a person directory.',
    'Complete Colorado broker-dealer and salesperson rosters are UNKNOWN (OPEN_SEARCH_ONLY).',
    'The Division enforcement-actions table is JS-rendered and was not extracted as bulk rows.',
    'No Form D / EFD Colorado overlay is in the committed product.',
    'No statewide issuer bulk denominator was acquired.',
    'Committed geography is not split into CO RIA vs CO ERA.',
    'Exact Colorado registration status is not known from DORA HTML for every SEC/IARD firm with a CO principal office.',
    'Prior state pages (NJ/CA/TX/WA/AZ) were not retrofitted onto this IAPD state compilation.',
  ],
  rejectedJoins: [
    {
      join: 'name-only sanctions narrative → public firm profile',
      status: 'REJECTED_UNSAFE',
      count: SANCTIONS_NAME_ONLY,
      reason: 'Name alone is unsafe for adverse attachment.',
    },
    {
      join: 'person CRD → firm CRD',
      status: 'REJECTED_UNSAFE',
      count: 0,
      reason: 'Exact person CRD does not become firm CRD. No person-to-firm promotion was attempted.',
    },
    {
      join: 'Colorado principal-office overlay → state-RIA denominator',
      status: 'REJECTED',
      count: 0,
      reason: '589 is a different grain from 740 approved state-IA firms.',
    },
  ],
  rejectedTotals: [
    {
      total: 'Colorado has 589 investment advisers',
      reason: '589 is SEC/IARD principal-office geography, not a combined Colorado adviser universe.',
    },
    {
      total: '589 + 740 + 3,673 + 209 as Colorado advisers',
      reason: 'Incompatible grains. Principal office, state IA, federal notice, and state ERA must stay separate.',
    },
    {
      total: 'State registration rows as extra SEC/IARD firms',
      reason: 'State rows do not inflate the 23,622 SEC/IARD roster.',
    },
    {
      total: 'IAR people as firms',
      reason: 'Person grain is not firm grain.',
    },
    {
      total: 'Enforcement rows as firms or as an enforcement rate',
      reason: 'Index/narrative rows are not firms and are not quality.',
    },
    {
      total: 'Missing IAR/BD/complaint/issuer counts as zero',
      reason: 'Missing, search-only, and request-only are unknown, not zero.',
    },
    {
      total: 'No Colorado adverse evidence found = clean history',
      reason: 'Missing adverse evidence is not a clean-history finding.',
    },
  ],
  semanticGuardrails: [
    'COLORADO PRINCIPAL OFFICE != STATE REGISTRATION',
    'SEC RIA != COLORADO STATE RIA',
    'STATE RIA != FEDERAL-COVERED NOTICE FILING',
    'RIA != ERA',
    'IAR != FIRM',
    'BROKER-DEALER != IA',
    'SALESPERSON != IAR',
    'FORM ADV FILING != FIRM',
    'RAUM != INVESTMENT PERFORMANCE',
    'FORM D / EFD FILING != COLORADO APPROVAL',
    'ISSUER != ADVISER',
    'COMPLAINT != VIOLATION',
    'ALLEGATION != FINAL FINDING',
    'NAME-ONLY ADVERSE MATCH = UNSAFE',
    'PERSON CRD != FIRM CRD',
    'FEDERAL OVERLAY != ENTITY GROWTH',
    'MISSING != ZERO',
    'NO FAKE COMBINED COLORADO ADVISER DENOMINATOR',
    'NO TRUST SCORE',
    'NO PAID RANKING',
  ],
};

snapshot.fingerprint = createHash('sha256').update(canonicalJson(snapshot)).digest('hex');

const ts = `/** Generated by scripts/build-co-public-snapshot.mjs. Do not edit by hand. */\nexport const CO_PUBLIC_SNAPSHOT = ${JSON.stringify(snapshot, null, 2)} as const;\nexport type CoPublicSnapshot = typeof CO_PUBLIC_SNAPSHOT;\n`;
writeFileSync(join(root, 'packages/domain/src/co-public-snapshot.ts'), ts, 'utf8');
writeFileSync(join(root, 'artifacts/co-inv-001-public-snapshot.json'), `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
console.log(
  JSON.stringify(
    {
      fingerprint: snapshot.fingerprint,
      coPrincipalOffice: CO_PRINCIPAL_OFFICE,
      stateRiaApproved: STATE_IA_APPROVED,
      stateRiaRows: STATE_IA_ROWS,
      stateEra: STATE_ERA_ACTIVE,
      noticeFiled: NOTICE_FILED,
      netNewCanonical: snapshot.expansionLedger.NET_NEW_CANONICAL_ORGANIZATIONS,
      rejectedUnsafe: SANCTIONS_NAME_ONLY,
    },
    null,
    2,
  ),
);
