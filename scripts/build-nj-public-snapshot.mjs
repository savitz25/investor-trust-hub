/**
 * NJ-INV-003 — deterministic public snapshot from committed artifacts.
 * Do not type disconnected page constants. Re-run after source artifacts change.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const TOPIC_LABELS = {
  ADVERTISING_MARKETING: 'Advertising and marketing',
  ARTIFICIAL_INTELLIGENCE: 'Artificial intelligence',
  AUM_OR_ASSETS: 'Assets under management',
  CLIENT_COUNTS: 'Client counts',
  COMPLAINTS: 'Complaints',
  COMPLIANCE_POLICIES: 'Compliance policies',
  CONFLICTS_OF_INTEREST: 'Conflicts of interest',
  CRYPTOCURRENCY: 'Cryptocurrency',
  CUSTODY: 'Custody',
  CYBERSECURITY: 'Cybersecurity',
  DIGITAL_ASSETS: 'Digital assets',
  DISCRETION: 'Discretion',
  FINANCIAL_CONDITION: 'Financial condition',
  FIRM_ORGANIZATION: 'Firm organization',
  INVESTMENT_CONCENTRATION: 'Investment concentration',
  NFT: 'Non-fungible tokens (NFTs)',
  OTHER: 'Other examination topics',
  OUTSIDE_BUSINESS_ACTIVITIES: 'Outside business activities',
  REPRESENTATIVE_OVERSIGHT: 'Representative oversight',
  VENDOR_DUE_DILIGENCE: 'Vendor / third-party platforms',
  VULNERABLE_ADULTS: 'Vulnerable adults / senior investors',
};

const FILING_LABELS = {
  PRIVATE_PLACEMENT_REPORT: 'Private placement report of sale',
  SCOR_REGISTRATION: 'Small corporate offering registration (SCOR)',
  INVESTMENT_COMPANY_NOTICE: 'Investment-company notice filing (covered securities)',
  FORM_D_NOTICE: 'Federal Form D copy when a NJ private-placement report includes it',
  CROWDFUNDING_EXEMPTION: 'Intrastate crowdfunding exemption',
  CROWDFUNDING_INVESTOR_CERTIFICATION: 'Crowdfunding investor certification form (not ingested as PII)',
  CROWDFUNDING_INVESTOR_LEGEND: 'Crowdfunding investor legend',
  INTERNET_SITE_OPERATOR: 'Internet Site Operator registration',
  ISO_AMENDMENT: 'Internet Site Operator amendment',
  ISSUER_AGENT_REGISTRATION: 'Agent of the issuer registration',
  RESCISSION_OFFER: 'Rescission-offer procedure',
  SECURITIES_REGISTRATION_U1: 'Uniform application to register securities (Form U-1)',
};

function classifyFilename(name) {
  const n = name.toLowerCase();
  if (n.includes('complaint')) return 'civil_complaint';
  if (n.includes('consent')) return 'consent_order';
  if (n.includes('candd') || n.includes('cease')) return 'cease_and_desist';
  if (n.includes('revoc') || n.includes('revorder') || n.includes('revocation')) return 'revocation';
  if (n.includes('bar')) return 'bar';
  if (n.includes('final')) return 'final_order';
  if (n.includes('summary')) return 'summary_order';
  return 'other_bureau_document';
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(',');
  return lines.slice(1).map((line) => {
    const cols = [];
    let cur = '';
    let q = false;
    for (const ch of line) {
      if (ch === '"') q = !q;
      else if (ch === ',' && !q) {
        cols.push(cur);
        cur = '';
      } else cur += ch;
    }
    cols.push(cur);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] ?? '';
    });
    return row;
  });
}

const audited = JSON.parse(readFileSync(join(root, 'artifacts/nj-inv-002-audited-state-snapshot.json'), 'utf8'));
const coverage = parseCsv(readFileSync(join(root, 'artifacts/nj-inv-001c-enforcement-coverage.csv'), 'utf8'));

const uniqueUrls = [...new Set(coverage.map((r) => r.official_pdf_url))];
const byYear = {};
const byClass = {};
for (const row of coverage) {
  const year = row.source_year || 'unknown';
  byYear[year] = (byYear[year] || 0) + 1;
  const klass = classifyFilename(row.document_title || row.official_pdf_url);
  byClass[klass] = (byClass[klass] || 0) + 1;
}

const timeline = (audited.annual_exam.topic_timeline || [])
  .filter((row) => row.topic !== 'OTHER')
  .map((row) => ({
    topic: row.topic,
    label: TOPIC_LABELS[row.topic] || row.topic,
    firstYear: row.first_year,
    yearsPresent: row.years_present,
    sourceSupport: row.source_support,
  }));

const years = [2022, 2023, 2024, 2025, 2026];
const timelineByYear = years.map((year) => ({
  year,
  topics: timeline.filter((t) => t.yearsPresent.includes(year)).map((t) => t.label),
  caveat:
    year < 2026
      ? 'Themes are taken from official Bureau/NJOAG announcements. A missing sample questionnaire is not evidence that a topic was removed.'
      : 'Themes are taken from the official 2026 public sample examination PDF.',
}));

const payload = {
  version: 'nj-inv-003-public-v1',
  generatedFrom: {
    auditedSnapshot: 'artifacts/nj-inv-002-audited-state-snapshot.json',
    coverageManifest: 'artifacts/nj-inv-001c-enforcement-coverage.csv',
    nationalRoster: 'packages/domain/src/investor-home-intel.ts V1_ROSTER_PRINCIPAL_OFFICE_STATES',
  },
  asOf: audited.as_of,
  publicationGate: 'ON',
  publicEligibility: 'state_page',
  route: '/new-jersey',
  nationalOverlay: {
    njPrincipalOfficeSecIardFirms: 438,
    grain: 'SEC IARD roster firm with principal-office region = NJ',
    source: 'IA_FIRM_SEC_Feed_08_27_2026',
    sourceDate: '2026-08-27',
    retrievedAt: '2026-08-28',
    universe: 23622,
    caveat:
      'This is the national SEC/IARD roster overlay. It is not the New Jersey state-registered adviser universe and does not include ERAs or state-only firms unless they appear in that roster with a NJ principal office.',
    searchHref: '/firms?state=NJ',
  },
  enforcement: {
    acquiredDocuments: uniqueUrls.length,
    uniqueHashes: new Set(coverage.map((r) => r.content_sha256).filter(Boolean)).size,
    coverage: 'ACQUIRED_PARTIAL_HISTORY',
    earliest: audited.enforcement.earliest,
    latest: '2026-02-25',
    latestNote: 'Patel/Arya International summary cease-and-desist hosted by NJOAG, February 25, 2026.',
    byYear,
    byClass,
    coverageLabel:
      "Partial historical corpus — the Bureau's live action index is access-blocked and the acquired documents do not establish the complete universe of actions.",
    doNotCalculateEnforcementRate: true,
  },
  exam: {
    years: audited.annual_exam.years,
    currentYear: 2026,
    deadline: audited.annual_exam.deadline,
    questionCount2026: audited.annual_exam.question_count_2026,
    passFailMetric: false,
    firmResults: 'SOURCE_NOT_PUBLIC_AT_FIRM_GRAIN',
    roundedPopulationContext: audited.identity.rounded_press_context_only,
    timeline,
    timelineByYear,
    consumerSafeStatement:
      'The written examination is not a public firm rating or pass/fail credential. Firm answers are not public.',
  },
  issuer: {
    filingClasses: (audited.issuer_exemption.filing_classes || []).map((id) => ({
      id,
      label: FILING_LABELS[id] || id,
    })),
    publicIndex: false,
    exemptionIsEndorsement: false,
    caveat:
      'An exemption category or filing class is not approval, endorsement, or a finding that an offering is safe.',
  },
  policy: {
    modeledCurrent: audited.general_orders.modeled_current,
    libraryCoverage: audited.general_orders.library_coverage,
    isFirmEnforcement: false,
    instruments: [
      {
        title: 'IAR continuing education requirement',
        effectiveOn: '2025-01-01',
        affected: 'Investment adviser representatives',
        note: '12 annual credits as described on the Bureau IAR CE FAQ. This is policy, not a person directory.',
      },
      {
        title: 'IAR examination waiver designations',
        effectiveOn: null,
        affected: 'Investment adviser representatives',
        note: 'Bureau examination-requirements page describes designation-based waivers. Not firm enforcement.',
      },
    ],
  },
  gaps: [
    'A complete current New Jersey state-registered investment adviser firm roster is pending an official records request.',
    "A complete historical Bureau enforcement index is unavailable through the current public HTML library (access-blocked).",
    'Public firm-level annual examination answers are not available.',
    'A complete public issuer / crowdfunding / Internet Site Operator filing index is not downloadable.',
    'Orders of general application HTML library remains access-blocked; two policy instruments are modeled from official public descriptions.',
  ],
  profileAttachments: [],
  profileRule:
    'Attach Bureau evidence to a firm profile only on exact CRD/SEC file match or deterministic legal-name+address+class match. Name-only, DBA-only, review-required, unresolved, and synthetic matches are withheld.',
};

const canonical = JSON.stringify(payload);
payload.fingerprint = createHash('sha256').update(canonical).digest('hex');

const json = `${JSON.stringify(payload, null, 2)}\n`;
mkdirSync(join(root, 'packages/domain/src/data'), { recursive: true });
writeFileSync(join(root, 'artifacts/nj-inv-003-public-snapshot.json'), json);
writeFileSync(
  join(root, 'packages/domain/src/nj-public-snapshot.ts'),
  `/** Generated by scripts/build-nj-public-snapshot.mjs. Do not edit by hand. */\nexport const NJ_PUBLIC_SNAPSHOT = ${JSON.stringify(payload, null, 2)} as const;\nexport type NjPublicSnapshot = typeof NJ_PUBLIC_SNAPSHOT;\n`,
);
console.log('wrote snapshot', payload.enforcement.acquiredDocuments, 'docs', payload.exam.questionCount2026, 'questions', payload.fingerprint);
