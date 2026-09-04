/**
 * TX-INV-001 — deterministic public snapshot from committed SEC/IARD roster geography.
 * Do not invent a Texas state-RIA denominator. Do not scrape SSB/BrokerCheck/CRD.
 */
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const TX_PRINCIPAL_OFFICE = 1302;
const ROSTER_WITH_REGION = 17997;
const ROSTER_NULL_REGION = 5625;
const RIA = 17018;
const ERA = 6604;
const TOTAL = 23622;

const snapshot = {
  version: 'investor-tx-state-intel-v1',
  generatedFrom: {
    nationalRoster: 'packages/domain/src/investor-home-intel.ts V1_ROSTER_PRINCIPAL_OFFICE_STATES + V1_SEC_ROSTER',
    census: 'docs/inv-home-001-census.json principal_office_states TX',
  },
  asOf: '2026-09-04',
  publicationGate: 'ON',
  publicEligibility: 'state_page',
  route: '/texas',
  nationalOverlay: {
    txPrincipalOfficeSecIardFirms: TX_PRINCIPAL_OFFICE,
    grain: 'SEC IARD roster firm with principal-office region = TX',
    source: 'IA_FIRM_SEC_Feed_08_27_2026',
    sourceDate: '2026-08-27',
    retrievedAt: '2026-08-28',
    universe: TOTAL,
    resolvedPrincipalOfficeRegions: ROSTER_WITH_REGION,
    unresolvedPrincipalOfficeRegions: ROSTER_NULL_REGION,
    shareOfResolvedRegionsPct: Number(((100 * TX_PRINCIPAL_OFFICE) / ROSTER_WITH_REGION).toFixed(2)),
    searchHref: '/firms?state=TX',
    label: 'SEC/IARD roster firms with a Texas principal office',
    caveat:
      'This is the national SEC/IARD roster overlay for firms that report a Texas principal office. It is not the Texas state-registered adviser universe, not a complete Texas adviser count, and not proof of current Texas State Securities Board authority. TX PRINCIPAL OFFICE != TEXAS STATE REGISTRATION.',
  },
  riaEra: {
    nationalRiaFacts: RIA,
    nationalEraFacts: ERA,
    nationalTotalFacts: TOTAL,
    txPrincipalOfficeSplit: 'SOURCE_NOT_SPLIT',
    caveat:
      'National roster keeps RIA (17,018) and ERA (6,604) separate. Committed geography is on the combined roster. Texas principal-office counts are not an RIA-only or ERA-only state denominator. ERA is not an RIA. SEC RIA is not a Texas state RIA.',
  },
  firmMarket: {
    raumBandsByTexasPrincipalOffice: 'SOURCE_NOT_SPLIT',
    employeeCountsByTexasPrincipalOffice: 'SOURCE_NOT_SPLIT',
    clientMixByTexasPrincipalOffice: 'SOURCE_NOT_SPLIT',
    note: 'National RIA RAUM bands and Form ADV attributes exist on the federal spine. This snapshot does not invent a Texas-only size ranking from those national tables.',
  },
  stateRia: {
    STATE_RIA_BULK_ROSTER: 'SOURCE_NOT_ACQUIRED',
    access: 'OPEN_SEARCH_ONLY',
    completeStateRiaCount: 'UNKNOWN',
    verifyUrl: 'https://www.ssb.texas.gov/securities-professionals/certificate-search',
    registrationChecksUrl: 'https://www.ssb.texas.gov/investors/registration-checks',
    ssbHomeUrl: 'https://www.ssb.texas.gov/',
    iapdUrl: 'https://adviserinfo.sec.gov/',
    brokercheckUrl: 'https://brokercheck.finra.org/',
    searchFields: 'Firm CRD/IARD number or TX file number',
    caveat:
      'No official Texas state-RIA bulk CSV/XLSX/API was acquired. Certificate search is official and search-only. Do not estimate the missing state roster from SEC principal-office geography. Do not scrape the search.',
  },
  enforcement: {
    pass: 'bounded_easy_win',
    result: 'NO_BULK_ACQUIRED',
    officialIndex: 'https://www.ssb.texas.gov/news-publications/enforcement-actions-administrative',
    cryptoIndex: 'https://www.ssb.texas.gov/cryptocurrency-enforcement',
    penaltyMatrix: 'https://www.ssb.texas.gov/penalty-matrix',
    coverage: 'PAGINATED_HTML_NEWS_INDEX_AND_PDF_ORDERS',
    nativeClassesObservedOnIndex: [
      'consent order',
      'emergency cease and desist',
      'reprimand / fine',
      'suspension',
      'revocation',
      'notice of hearing',
    ],
    doNotCalculateEnforcementRate: true,
    profileAttachments: [],
    identityBar: 'EXACT CRD, exact Texas file number, or exact order/docket-to-identity relationship',
    nameOnly: 'UNSAFE',
    namePlusCity: 'REVIEW_REQUIRED',
    caveat:
      'SSB publishes a paginated HTML administrative-action index and PDF orders. That is not a structured bulk CSV/JSON extract and was not harvested page-by-page. Notice of hearing is not a final disposition. Accusation is not a final finding. Order count is not quality. Name-only attachment is unsafe. Missing is unknown, not zero.',
  },
  issuer: {
    framework:
      'Texas Securities Act (Texas Government Code Title 12) administered by the Texas State Securities Board — securities registration, exemptions, notice filings, dealer/agent registration, and investment-adviser/IAR registration.',
    professionalsUrl: 'https://www.ssb.texas.gov/securities-professionals',
    rulesUrl: 'https://www.ssb.texas.gov/texas-securities-act-and-board-rules',
    rulebookPdf: 'https://www.ssb.texas.gov/sites/default/files/2026-03/2026-03-26_TSSB%20Electronic%20Rulebook.pdf',
    rulebookDate: '2026-03-26',
    privateFundExemption: 'Board Rule §139.23 private-fund adviser exemption; ERA/Texas notice via Form ADV Item 2.C when applicable.',
    bulkIssuerDataset: 'SOURCE_NOT_ACQUIRED',
    coverage: 'OPEN_SEARCH_AND_RULE_TEXT',
    note: 'Federal Form D is not Texas qualification or approval. Notice filings and exemptions are not a quality ranking. No statewide issuer bulk denominator was acquired.',
  },
  formD: {
    overlay: 'SOURCE_NOT_ACQUIRED',
    caveat: 'FORM D FILING != TEXAS STATE APPROVAL. FORM D FILING != INVESTMENT QUALITY.',
  },
  exam: {
    programPage: 'https://www.ssb.texas.gov/securities-professionals/dealer-adviser-registration/waiver-examination-requirements',
    evepAsOf: '2025-03-13',
    currentPublicSampleLikeNj2026: false,
    firmResults: 'SOURCE_NOT_PUBLIC_AT_FIRM_GRAIN',
    passFailMetric: false,
    note: 'Texas publishes qualification-exam rules (Series 65/66 and related waivers, including NASAA EVEP recognized March 13, 2025) and a current electronic rulebook. That is individual qualification guidance, not a public firm-level examination scorecard. Guidance is not enforcement and is not a quality score.',
  },
  investorEducation: {
    url: 'https://www.ssb.texas.gov/news-publications',
    registrationChecksUrl: 'https://www.ssb.texas.gov/investors/registration-checks',
    use: 'consumer education / source coverage',
    notFirmAdverseEvidence: true,
  },
  contacts: {
    policy: 'Official/public business sources only. No internet enrichment. No SSB search scrape. No person contact publication.',
    ssbSearchScrape: false,
    federalPrincipalOfficeAddress: 'Used only as geography for the SEC/IARD overlay; not republished here as a harvested directory.',
    phoneEmailWebsiteFromSsbSearch: 'NOT_SCRAPED',
  },
  regulatorMatrix: [
    {
      credential: 'SEC-registered investment adviser',
      regulator: 'U.S. Securities and Exchange Commission / IARD',
      proves: 'Federal registration category as reported on Form ADV in the cited extract',
      doesNotProve: 'Texas State Securities Board state-RIA registration or current Texas notice-filing status',
    },
    {
      credential: 'Exempt reporting adviser (ERA)',
      regulator: 'SEC / IARD (and Texas notice under Board Rule §139.23 when applicable)',
      proves: 'ERA reporting status in the cited extract',
      doesNotProve: 'SEC RIA registration or Texas state-RIA registration',
    },
    {
      credential: 'Texas state-registered investment adviser',
      regulator: 'Texas State Securities Board',
      proves: 'Texas investment-adviser certificate when the official SSB record says so',
      doesNotProve: 'SEC registration. Principal-office geography is not this credential.',
    },
    {
      credential: 'Investment adviser representative',
      regulator: 'Texas State Securities Board / CRD',
      proves: 'Individual representative reporting when official CRD/SSB evidence exists',
      doesNotProve: 'Firm certificate. Person CRD is not firm CRD.',
    },
    {
      credential: 'Broker-dealer / securities agent',
      regulator: 'Texas State Securities Board / FINRA / CRD',
      proves: 'Broker-dealer or agent registration when official evidence exists',
      doesNotProve: 'Investment-adviser registration',
    },
    {
      credential: 'Issuer / securities filing',
      regulator: 'Texas State Securities Board',
      proves: 'A registration, exemption, or notice-filing posture when the official filing record says so',
      doesNotProve: 'Investment quality or Form D approval',
    },
    {
      credential: 'CRD / IARD identifier',
      regulator: 'FINRA CRD / IARD infrastructure',
      proves: 'A stable identity key when source-native',
      doesNotProve: 'Current Texas authority by itself',
    },
  ],
  identityRules: {
    EXACT: ['CRD', 'SEC file number', 'Texas file number', 'official docket/order ID'],
    HIGH_CONFIDENCE: 'exact legal name + exact official address for non-adverse descriptive data only',
    REVIEW_REQUIRED: 'name + city, DBA, name variants',
    UNSAFE: 'name alone — not used for adverse attachment',
  },
  profileAttachments: [],
  gaps: [
    'Complete Texas state-RIA denominator is UNKNOWN.',
    'Complete Texas IAR universe is UNKNOWN.',
    'Complete Texas broker-dealer state roster is UNKNOWN.',
    'Exact SSB registration status is not known for every SEC/IARD firm with a TX principal office.',
    'Committed geography is not split into TX RIA vs TX ERA.',
    'No structured SSB enforcement bulk extract was acquired.',
    'No Form D Texas overlay is in the committed product.',
    'No statewide issuer bulk denominator was acquired.',
  ],
  semanticGuardrails: [
    'TX PRINCIPAL OFFICE != TX STATE REGISTRATION',
    'SEC RIA != STATE RIA',
    'ERA != REGISTERED RIA',
    'CRD IDENTITY != CURRENT TEXAS AUTHORITY',
    'BROKER-DEALER != INVESTMENT ADVISER',
    'FORM D != TEXAS APPROVAL',
    'FORM D != INVESTMENT QUALITY',
    'ORDER COUNT != QUALITY',
    'MISSING != ZERO',
    'NO TRUST SCORE',
    'NO PAID RANKING',
  ],
};

const canonical = JSON.stringify(snapshot, Object.keys(snapshot).sort());
snapshot.fingerprint = createHash('sha256').update(canonical).digest('hex');

const ts = `/** Generated by scripts/build-tx-public-snapshot.mjs. Do not edit by hand. */\nexport const TX_PUBLIC_SNAPSHOT = ${JSON.stringify(snapshot, null, 2)} as const;\nexport type TxPublicSnapshot = typeof TX_PUBLIC_SNAPSHOT;\n`;
writeFileSync(join(root, 'packages/domain/src/tx-public-snapshot.ts'), ts, 'utf8');
writeFileSync(join(root, 'artifacts/tx-inv-001-public-snapshot.json'), `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
console.log(
  JSON.stringify(
    {
      fingerprint: snapshot.fingerprint,
      txPrincipalOffice: TX_PRINCIPAL_OFFICE,
      share: snapshot.nationalOverlay.shareOfResolvedRegionsPct,
      ria: RIA,
      era: ERA,
      stateRia: snapshot.stateRia.STATE_RIA_BULK_ROSTER,
    },
    null,
    2,
  ),
);
