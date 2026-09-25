import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publicationMetricInputs } from './publication_metric_inputs.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
execFileSync(process.platform === 'win32' ? 'python' : 'python3', ['-X', 'utf8', join(root, 'scripts/massachusetts/freeze_ma_inv_snapshot.py'), '--check'], { stdio: 'inherit' });
const snap = JSON.parse(readFileSync(join(root, 'artifacts/ma-inv-001-public-snapshot.json'), 'utf8'));
const pub = publicationMetricInputs();
const routes = readFileSync(join(root, 'packages/config/src/routes.ts'), 'utf8');
const ui = readFileSync(join(root, 'apps/web/src/components/ma-state-intel.tsx'), 'utf8');

assert.equal(snap.version, 'investor-ma-state-intel-v1');
assert.equal(snap.route, '/massachusetts');
assert.equal(snap.fingerprint, '014fb959166d135153618b9781fd099322e0f1d4eec38d3bd3470dd282ee1930');
assert(pub.publishedStateIntelligencePaths.includes('/massachusetts'), 'catalog includes /massachusetts');
assert.equal(pub.publishedStateIntelligencePaths.length, 16);
assert(!existsSync(join(root, 'apps/web/src/app/massachusetts/boston')), 'no Boston folder');
assert(routes.includes("href: '/massachusetts'"), 'STATE_DISCOVERY_ROUTES');
assert.equal(snap.stateRia.approvedDistinctCrd, 773);
assert.equal(
  snap.stateRia.approvedDistinctCrd + snap.stateRia.condrestDistinctCrd + snap.stateRia.termrequestDistinctCrd,
  snap.stateRia.distinctFirmCrd,
);
assert.equal(snap.stateEra.activeDistinctCrd, 351);
assert.equal(snap.federalNotice.noticeFiledDistinctCrd, 3272);
assert.equal(snap.nationalOverlay.maPrincipalOfficeSecIardFirms, 803);
assert.equal(snap.reconciliation.do_not_sum, true);
assert.equal(snap.enforcement.announcements, 144);
assert.equal(snap.enforcement.observationRows, 181);
assert.equal(snap.enforcement.pre2012, 'REQUEST_ONLY');
assert.deepEqual(snap.enforcement.profileAttachments, []);
assert.equal(snap.enforcement.nameOnly, 'UNSAFE');
assert.equal(snap.iar.MA_IAR_ROWS, null);
assert.equal(snap.complaints.MA_SECURITIES_COMPLAINT_ROWS, null);
assert.equal(snap.expansionLedger.GRAPH_WRITES, 0);
assert.equal(snap.capabilities.combined_investment_professional_count, 'UNSUPPORTED');
assert.match(ui, /Trust Score/);
assert.doesNotMatch(ui, /best adviser|safest adviser/i);
assert.match(ui, /id="ma-title"/);
console.log('MA-INV-001 publication assert: PASS');
