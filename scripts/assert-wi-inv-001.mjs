import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publicationMetricInputs } from './publication_metric_inputs.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (path) => readFileSync(join(root, path), 'utf8');
const registration = JSON.parse(read('data/wisconsin/wi-inv-001/registration-lenses.json'));
const orders = JSON.parse(read('data/wisconsin/wi-inv-001/securities-orders.json'));
const page = read('apps/web/src/app/wisconsin/page.tsx');
assert(publicationMetricInputs().publishedStateIntelligencePaths.includes('/wisconsin'));
assert(!existsSync(join(root, 'apps/web/src/app/wisconsin/milwaukee')));
assert(page.includes("path: '/wisconsin'"));
assert(page.includes('Wisconsin Department of Financial Institutions'));
assert(!/AggregateRating|ratingValue|Trust Score|best adviser|safest adviser/i.test(page));
for (const lens of ['stateIa', 'federalNotice', 'era']) {
  assert.equal(registration[lens].status, 'NOT_ACQUIRED');
  assert.equal(registration[lens].count, null);
}
assert.equal(registration.principalOffice.count, 211);
assert.equal(registration.principalOffice.sourceAsOf, '2026-08-27');
assert.equal(orders.rowCount, 95);
assert.equal(orders.rows.length, 95);
assert.equal(orders.rowsWithCrdColumn, orders.rows.filter(row => row.crdAsIndexed).length);
assert.equal(orders.rowsWithCrdColumn, 26);
assert.deepEqual(orders.proceduralCounts, { final: 10, summary: 53, settlement: 10, consent: 22 });
assert.equal(orders.exactEnforcementAttachments, 0);
assert.equal(orders.nameOnlyAdverseJoins, 0);
assert.equal(orders.graphWrites, 0);
for (const row of orders.rows) {
  assert(row.issuanceDate >= '2022-01-01' && row.issuanceDate <= '2026-09-29');
  assert.equal(row.profileAttached, false);
  assert.equal(row.respondentGrain, 'unresolved index caption');
  assert(row.sourceDocument?.startsWith('https://dfi.wi.gov/Documents/'));
}
console.log('WI-INV-001 publication, registration grains, order index and attachment safety: PASS');
