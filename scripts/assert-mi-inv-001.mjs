import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publicationMetricInputs } from './publication_metric_inputs.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (path) => readFileSync(join(root, path), 'utf8');
const lenses = JSON.parse(read('data/michigan/mi-inv-001/iapd-mi-lenses.json'));
const orders = JSON.parse(read('data/michigan/mi-inv-001/securities-orders.json'));
const page = read('apps/web/src/app/michigan/page.tsx');
const paths = publicationMetricInputs().publishedStateIntelligencePaths;

assert(paths.includes('/michigan'));
assert.equal(paths.length, 19);
assert.deepEqual(readdirSync(join(root, 'apps/web/src/app/michigan')), ['page.tsx']);
assert(!existsSync(join(root, 'apps/web/src/app/michigan/detroit')));
assert(page.includes("path: '/michigan'"));
assert(page.includes('Michigan LARA'));
assert(!/AggregateRating|ratingValue|Trust Score|best adviser|safest adviser/i.test(page));
assert.equal(lenses.stateFeed.sourceAsOf, '2026-09-17');
assert.equal(lenses.secFeed.sourceAsOf, '2026-09-17');
assert.equal(lenses.stateIa.rows, 583);
assert.equal(lenses.stateIa.approvedDistinctFirmCrd, 574);
assert.equal(lenses.stateIa.statusRows.TERMREQUEST, 9);
assert.equal(lenses.era.activeDistinctFirmCrd, 75);
assert.equal(lenses.federalNotice.filedDistinctFirmCrd, 2453);
assert.equal(lenses.principalOffice.distinctFirmCrd, 332);
assert.equal(lenses.exactCrdIntersections.stateIaApprovedAndNoticeFiled.length, 5);
assert.equal(lenses.dedupedMichiganAdvisers, null);
assert.equal(orders.rows.length, 107);
assert.equal(orders.exactFirmCrdCrosswalks, 2);
assert.equal(orders.exactFirmEvidenceAttachments, 0);
assert.equal(orders.nameOnlyAttachments, 0);
assert.equal(orders.graphWrites, 0);
assert(orders.rows.every((row) => row.indexYear >= 2022 && row.indexYear <= 2026));
const firmCrds = new Set(Object.values(lenses.identifierLists).flat());
for (const row of orders.rows) {
  if (row.exactIapdFirmCrdLink) {
    assert.equal(row.respondentGrain, 'firm');
    assert.equal(row.exactIapdFirmCrdLink, row.captionFirmCrd);
    assert(firmCrds.has(row.exactIapdFirmCrdLink));
  }
  assert.equal(row.profileEvidenceAttached, false);
}
console.log('MI-INV-001 publication, grains, identifier crosswalk and graph safety: PASS');
