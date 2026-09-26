import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publicationMetricInputs } from './publication_metric_inputs.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
execFileSync(process.platform === 'win32' ? 'python' : 'python3', ['-X', 'utf8', join(root, 'scripts/nevada/freeze_nv_inv_snapshot.py'), '--check'], { stdio: 'inherit' });
const snap = JSON.parse(readFileSync(join(root, 'artifacts/nv-inv-001-public-snapshot.json'), 'utf8'));
const pub = publicationMetricInputs();
const routes = readFileSync(join(root, 'packages/config/src/routes.ts'), 'utf8');
const ui = readFileSync(join(root, 'apps/web/src/components/nv-state-intel.tsx'), 'utf8');
const src = join(root, 'data/nevada/nv-inv-001');

assert.equal(snap.version, 'investor-nv-state-intel-v1');
assert.equal(snap.route, '/nevada');
assert.equal(snap.fingerprint, '951496e8f1ef02f7b2777455e965b0768c0a89c610dbe8d2a3b4ed192661f6f6');
assert(pub.publishedStateIntelligencePaths.includes('/nevada'), 'catalog includes /nevada');
assert.equal(pub.publishedStateIntelligencePaths.length, 18);
assert.deepEqual(readdirSync(join(root, 'apps/web/src/app/nevada')), ['page.tsx'], 'no Nevada sub-routes');
assert(routes.includes("href: '/nevada'"), 'STATE_DISCOVERY_ROUTES');
assert.equal(snap.stateRia.approvedDistinctCrd, 271);
assert.equal(
  snap.stateRia.approvedDistinctCrd + snap.stateRia.condrestDistinctCrd + snap.stateRia.termrequestDistinctCrd,
  snap.stateRia.distinctFirmCrd,
);
assert.equal(snap.stateEra.activeDistinctCrd, 83);
assert.equal(snap.federalNotice.noticeFiledDistinctCrd, 1982);
assert.equal(snap.nationalOverlay.nvPrincipalOfficeSecIardFirms, 99);
assert.equal(snap.stateRia.sourceAsOf, '2026-09-17');
assert.equal(snap.federalNotice.sourceAsOf, '2026-09-18');
assert.equal(snap.asOf, null, 'no unified Nevada clock');
assert.equal(snap.reconciliation.do_not_sum, true);
assert.equal(snap.enforcement.NV_SECURITIES_ORDER_INDEX_STATUS, 'NOT_ACQUIRED_BOT_DEFENSE');
assert.deepEqual(snap.enforcement.exactCrdLinks, []);
assert.deepEqual(snap.enforcement.profileAttachments, []);
assert.equal(snap.enforcement.nameOnly, 'UNSAFE');
assert.equal(snap.enforcement.otherRegulatorsSubstituted, false);
assert.equal(snap.iar.NV_IAR_ROWS, null);
assert.equal(snap.complaints.NV_SECURITIES_COMPLAINT_ROWS, null);
assert.equal(snap.expansionLedger.GRAPH_WRITES, 0);
assert.equal(snap.capabilities.combined_investment_professional_count, 'UNSUPPORTED');
assert.match(ui, /Trust Score/);
assert.doesNotMatch(ui, /best adviser|safest adviser/i);
assert.doesNotMatch(ui, /aggregateRating|ratingValue/, 'no rating schema keys');

// Committed Nevada data holds counts, firm CRD numbers and statute text only: no firm or person names, no contact data.
const committed = readdirSync(src)
  .map((f) => readFileSync(join(src, f), 'utf8'))
  .join('\n');
assert.doesNotMatch(committed, /"(bus|legal|BusNm|LegalNm)"\s*:/, 'no firm names');
assert.doesNotMatch(committed, /[\w.+-]+@[\w-]+\.[\w.]+/, 'no email addresses');
assert.doesNotMatch(committed, /\(\d{3}\) ?\d{3}-\d{4}|\b\d{3}-\d{3}-\d{4}\b/, 'no phone numbers');
assert(!existsSync(join(src, 'nrs-090.html')), 'raw statute capture stays out of the committed folder');
console.log('NV-INV-001 publication assert: PASS');
