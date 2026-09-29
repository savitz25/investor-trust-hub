import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publicationMetricInputs } from './publication_metric_inputs.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (path) => readFileSync(join(root, path), 'utf8');
const lenses = JSON.parse(read('data/indiana/in-inv-001/iapd-in-lenses.json'));
const orders = JSON.parse(read('data/indiana/in-inv-001/securities-orders.json'));
const page = read('apps/web/src/app/indiana/page.tsx');
assert(publicationMetricInputs().publishedStateIntelligencePaths.includes('/indiana'));
assert(!existsSync(join(root, 'apps/web/src/app/indiana/indianapolis')));
assert(page.includes("path: '/indiana'"));
assert(page.includes('Indiana Secretary of State, Securities Division'));
assert(!/AggregateRating|ratingValue|Trust Score|best adviser|safest adviser/i.test(page));

// Lenses are distinct firm-CRD sets from the hash-pinned accepted compilation; no combined total.
assert.equal(lenses.stateFeed.sourceAsOf, '2026-09-17');
const lists = lenses.identifierLists;
assert.equal(lenses.stateIa.approvedDistinctFirmCrd, lists.stateIaApprovedFirmCrds.length);
assert.equal(lenses.era.activeDistinctFirmCrd, lists.eraActiveFirmCrds.length);
assert.equal(lenses.federalNotice.filedDistinctFirmCrd, lists.noticeFiledFirmCrds.length);
assert.equal(lenses.principalOffice.distinctFirmCrd, lists.principalOfficeFirmCrds.length);
assert.deepEqual([lists.stateIaApprovedFirmCrds.length, lists.eraActiveFirmCrds.length, lists.noticeFiledFirmCrds.length, lists.principalOfficeFirmCrds.length], [369, 22, 2008, 160]);
for (const values of Object.values(lists)) assert.equal(new Set(values).size, values.length);
const set = (xs) => new Set(xs);
const inter = (a, b) => [...set(a)].filter((x) => set(b).has(x)).sort((x, y) => x - y);
assert.deepEqual(lenses.exactCrdIntersections.stateIaApprovedAndNoticeFiled, inter(lists.stateIaApprovedFirmCrds, lists.noticeFiledFirmCrds));
assert.deepEqual(lenses.exactCrdIntersections.principalAndNoticeFiled, inter(lists.principalOfficeFirmCrds, lists.noticeFiledFirmCrds));
assert.equal(lenses.dedupedIndianaAdvisers, null);
assert.equal(lenses.graphWrites, 0);

// Administrative-action index: bounded window, index labels kept, exact firm links only.
assert.equal(orders.rowCount, 65);
assert.equal(orders.rows.length, 65);
assert.equal(orders.indexRowsAtRetrieval, 1747);
assert.deepEqual(orders.entityTagCounts, { securities_investment: 63, loan_broker_iusa_cited: 2 });
assert.equal(orders.rowsWithTextLayer + orders.scannedRowsIdentifiersNotAcquired, orders.rowCount);
assert.equal(orders.exactFirmCrdLinks, orders.rows.reduce((n, r) => n + r.exactIapdFirmCrdLinks.length, 0));
assert.equal(orders.exactFirmCrdLinks, 5);
assert.equal(orders.exactSecFileLinks, 0);
assert.equal(orders.exactEnforcementAttachments, 0);
assert.equal(orders.nameOnlyAdverseJoins, 0);
assert.equal(orders.graphWrites, 0);
const allLensCrds = new Set(Object.values(lists).flat());
for (const row of orders.rows) {
  assert(row.issuanceDate >= '2022-01-01' && row.issuanceDate <= '2026-09-29');
  assert.equal(row.profileAttached, false);
  assert(row.actionTypesAsIndexed.length > 0);
  assert.equal(row.respondentGrain, row.exactIapdFirmCrdLinks.length ? 'firm-linked caption' : 'unresolved index caption');
  for (const crd of row.exactIapdFirmCrdLinks) assert(row.textLayer, 'links only from text-layer orders');
  for (const crd of row.inAcceptedIndianaLens) assert(allLensCrds.has(crd));
  assert(!('printedCrdCandidates' in row), 'unconfirmed (possibly person) CRDs are not published');
}
assert(!('publishedPersonCrds' in orders));
console.log('IN-INV-001 publication, IAPD lenses, action index and attachment safety: PASS');
