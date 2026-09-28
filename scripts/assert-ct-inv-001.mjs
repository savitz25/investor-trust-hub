import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publicationMetricInputs } from './publication_metric_inputs.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (path) => readFileSync(join(root, path), 'utf8');
const registration = JSON.parse(read('data/connecticut/ct-inv-001/registration-lenses.json'));
const orders = JSON.parse(read('data/connecticut/ct-inv-001/securities-orders.json'));
const page = read('apps/web/src/app/connecticut/page.tsx');
const paths = publicationMetricInputs().publishedStateIntelligencePaths;

assert(paths.includes('/connecticut'));
assert.deepEqual(readdirSync(join(root, 'apps/web/src/app/connecticut')), ['page.tsx']);
assert(!existsSync(join(root, 'apps/web/src/app/connecticut/hartford')));
assert(page.includes("path: '/connecticut'"));
assert(page.includes('Connecticut Department of Banking'));
assert(!/AggregateRating|ratingValue|Trust Score|best adviser|safest adviser/i.test(page));
assert.equal(registration.regulatorLists.stateIa.sourceUpdated, '10/22/2025');
assert.equal(registration.iapd.sourceAsOf, '2026-09-17');
assert.equal(registration.regulatorLists.stateIa.rows, 442);
assert.equal(registration.regulatorLists.federalNotice.rows, 2709);
assert.equal(registration.regulatorLists.era.rows, 236);
assert.equal(registration.iapd.stateIa.approvedFirmCrds, 398);
assert.equal(registration.iapd.federalNotice.filedFirmCrds, 2745);
assert.equal(registration.iapd.era.activeFirmCrds, 255);
assert.equal(registration.iapd.principalOffice.firmCrds, 591);
assert.equal(registration.dedupedConnecticutAdvisers, null);
assert.equal(registration.graphWrites, 0);
assert.equal(registration.claimChanges, 0);
assert.equal(orders.rows.length, 138);
assert.equal(orders.pdfsChecked, 137);
assert.equal(orders.exactFirmCrdCrosswalks, 16);
assert.equal(orders.exactEnforcementAttachments, 0);
assert.equal(orders.nameOnlyAttachments, 0);
assert.equal(orders.graphWrites, 0);
const known = new Set(Object.values(registration.iapd.identifierLists).flat());
for (const row of orders.rows) {
  if (row.exactIapdFirmCrdCrosswalk) {
    assert.equal(row.exactIapdFirmCrdCrosswalk, row.printedFirmCrd);
    assert.equal(row.respondentGrain, 'organization caption');
    assert(known.has(row.exactIapdFirmCrdCrosswalk));
  }
  assert.equal(row.profileEvidenceAttached, false);
}
console.log('CT-INV-001 publication, grains, identifiers, enforcement and graph safety: PASS');
