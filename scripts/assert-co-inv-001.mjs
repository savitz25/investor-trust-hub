/**
 * CO-INV-001 grain / publication gates.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publicationMetricInputs } from './publication_metric_inputs.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');
const failures = [];
const assert = (c, m) => {
  if (!c) failures.push(m);
};

const snap = JSON.parse(
  read('packages/domain/src/co-public-snapshot.ts')
    .replace(/^[\s\S]*export const CO_PUBLIC_SNAPSHOT = /, '')
    .replace(/\s+as const;[\s\S]*$/, ''),
);
const pub = publicationMetricInputs();
const routes = read('packages/config/src/routes.ts');
const page = read('apps/web/src/components/co-state-intel.tsx');
const intel = read('packages/domain/src/co-public-intel.ts');

assert(snap.version === 'investor-co-state-intel-v1', 'contract');
assert(typeof snap.fingerprint === 'string' && snap.fingerprint.length === 64, 'fingerprint');
assert(intel.includes(snap.fingerprint), 'intel fingerprint matches snapshot');
assert(snap.route === '/colorado', 'route');
assert(pub.publishedStateIntelligencePaths.includes('/colorado'), 'catalog includes /colorado');
assert(pub.publishedStateIntelligencePaths.length === 6, 'state pages 5 → 6');
assert(
  JSON.stringify(pub.publishedStateIntelligencePaths) ===
    JSON.stringify(['/new-jersey', '/california', '/texas', '/washington', '/arizona', '/colorado']),
  'prior five routes plus Colorado',
);
assert(!pub.publishedStateIntelligencePaths.includes('/florida'), 'no Florida');
assert(!pub.indexablePaths.includes('/colorado/denver'), 'no Denver path');
assert(!existsSync(join(root, 'apps/web/src/app/colorado/denver')), 'no Denver folder');
assert(routes.includes("href: '/colorado'"), 'STATE_DISCOVERY_ROUTES');
assert(snap.nationalOverlay.coPrincipalOfficeSecIardFirms === 589, '589 overlay');
assert(snap.stateRia.completeStateRiaCount === 740, '740 approved state IA');
assert(snap.stateRia.completeStateRiaCount !== snap.nationalOverlay.coPrincipalOfficeSecIardFirms, 'state RIA != overlay');
assert(snap.stateRia.completeStateRiaCount !== snap.federalNotice.noticeFiledDistinctCrd, 'state RIA != notice');
assert(snap.stateEra.activeDistinctCrd === 209, 'state ERA');
assert(snap.stateRia.completeStateRiaCount !== snap.stateEra.activeDistinctCrd, 'RIA != ERA');
assert(snap.stateRia.filter.includes('jurisdiction'), 'jurisdiction filter');
assert(/not MainAddr|not address/i.test(snap.stateRia.filter), 'not address filter');
assert(snap.expansionLedger.NET_NEW_CANONICAL_ORGANIZATIONS === 0, 'no new canonical orgs');
assert(snap.expansionLedger.NET_NEW_PUBLIC_INVESTOR_PROFILES === 0, 'no new public profiles');
assert(snap.expansionLedger.EXACT_ADVERSE_PROFILE_ATTACHMENTS === 0, 'no exact adverse attach');
assert(snap.expansionLedger.REJECTED_UNSAFE_JOINS === 10, 'name-only rejected');
assert(snap.profileAttachments.length === 0, 'empty attachments');
assert(snap.nationalOverlay.sourceAsOf === '2026-08-27', 'IAPD sourceAsOf');
assert(snap.nationalOverlay.retrievedAt === '2026-08-28', 'IAPD retrievedAt');
assert(snap.nationalOverlay.sourceAsOf !== snap.asOf, 'sourceAsOf != snapshot asOf');
assert(snap.enforcement.sourceAsOf === null, 'web sourceAsOf not invented');
assert(snap.enforcement.retrievedAt === '2026-09-09', 'web retrievedAt');
assert(!JSON.stringify(snap).includes('2026-09-09T'), 'no future ISO retrieval clock');
assert(page.includes('WebPage') && page.includes('Dataset'), 'JSON-LD');
assert(!page.includes('AggregateRating'), 'no AggregateRating');
assert(!/trust score is/i.test(page), 'no Trust Score is');
assert(!/best adviser|top adviser/i.test(page), 'no ranking language');
assert(!/\bvetted\b/i.test(page), 'no vetted');
assert(!/Colorado has \d+ investment advisers/i.test(page), 'no fake combined headline');
assert(snap.iar.coloradoPersonDirectory === 'NOT_PUBLISHED', 'no IAR directory');
assert(snap.complaints.completeComplaintCount === 'UNKNOWN', 'complaints unknown');
assert(snap.formD.overlay === 'SOURCE_NOT_ACQUIRED', 'no Form D overlay');

if (failures.length) {
  console.error('CO-INV-001 FAIL');
  for (const f of failures) console.error(' -', f);
  process.exit(1);
}
console.log('CO-INV-001 PASS Colorado grain, clocks, routing, and identity gates');
