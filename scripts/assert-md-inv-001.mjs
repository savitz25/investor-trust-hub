import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publicationMetricInputs } from './publication_metric_inputs.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (path) => readFileSync(join(root, path), 'utf8');
const registration = JSON.parse(read('data/maryland/md-inv-001/registration-lenses.json'));
const actions = JSON.parse(read('data/maryland/md-inv-001/securities-actions.json'));
const page = read('apps/web/src/app/maryland/page.tsx');
assert(publicationMetricInputs().publishedStateIntelligencePaths.includes('/maryland'));
assert(!existsSync(join(root, 'apps/web/src/app/maryland/baltimore')));
assert(page.includes("path: '/maryland'"));
assert(page.includes('Maryland Office of the Attorney General'));
assert(!/AggregateRating|ratingValue|Trust Score|best adviser|safest adviser/i.test(page));
for (const lens of ['stateIa', 'federalNotice', 'era', 'principalOffice']) {
  assert.equal(registration[lens].status, 'NOT_ACQUIRED');
  assert.equal(registration[lens].count, null);
}
assert.equal(actions.rows.length, 142);
assert.equal(actions.exactEnforcementAttachments, 0);
assert.equal(actions.nameOnlyAttachments, 0);
assert.equal(actions.graphWrites, 0);
for (const row of actions.rows) {
  assert(row.actionDateAsIndexed >= '2022-01-01' && row.actionDateAsIndexed <= '2026-12-31');
  assert.equal(row.profileEvidenceAttached, false);
  assert.equal(row.exactFirmCrdCrosswalk, null);
  assert.equal(row.exactSecFileCrosswalk, null);
  if (row.orderStatus === 'show_cause_or_summary') assert(!/final/i.test(row.orderTypeAsIndexed));
}
console.log('MD-INV-001 publication, grains, action status and attachment safety: PASS');
