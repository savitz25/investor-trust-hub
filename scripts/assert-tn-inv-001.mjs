import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publicationMetricInputs } from './publication_metric_inputs.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
execFileSync(process.platform === 'win32' ? 'python' : 'python3', ['-X', 'utf8', join(root, 'scripts/tennessee/freeze_tn_inv_snapshot.py'), '--check'], { stdio: 'inherit' });
const snap = JSON.parse(readFileSync(join(root, 'artifacts/tn-inv-001-public-snapshot.json'), 'utf8'));
const pub = publicationMetricInputs();
const routes = readFileSync(join(root, 'packages/config/src/routes.ts'), 'utf8');
const ui = readFileSync(join(root, 'apps/web/src/components/tn-state-intel.tsx'), 'utf8');

assert.equal(snap.version, 'investor-tn-state-intel-v1');
assert.equal(snap.route, '/tennessee');
assert.equal(snap.fingerprint, 'a2332c25eb07803d5e126c0a1935c3e8e0d9268d2fd9f3790e90fce65545f54e');
assert(pub.publishedStateIntelligencePaths.includes('/tennessee'), 'catalog includes /tennessee');
assert.equal(pub.publishedStateIntelligencePaths.length, 16);
assert(!existsSync(join(root, 'apps/web/src/app/tennessee/boston')), 'no Boston folder');
assert(routes.includes("href: '/tennessee'"), 'STATE_DISCOVERY_ROUTES');
assert.equal(snap.stateRia.approvedDistinctCrd, 327);
assert.equal(
  snap.stateRia.approvedDistinctCrd + snap.stateRia.condrestDistinctCrd + snap.stateRia.termrequestDistinctCrd,
  snap.stateRia.distinctFirmCrd,
);
assert.equal(snap.stateEra.activeDistinctCrd, 38);
assert.equal(snap.federalNotice.noticeFiledDistinctCrd, 2685);
assert.equal(snap.nationalOverlay.tnPrincipalOfficeSecIardFirms, 264);
assert.equal(snap.reconciliation.do_not_sum, true);
assert.deepEqual(snap.enforcement.profileAttachments, []);
assert.equal(snap.enforcement.nameOnly, 'UNSAFE');
assert.equal(snap.iar.TN_IAR_ROWS, null);
assert.equal(snap.complaints.TN_SECURITIES_COMPLAINT_ROWS, null);
assert.equal(snap.expansionLedger.GRAPH_WRITES, 0);
assert.equal(snap.capabilities.combined_investment_professional_count, 'UNSUPPORTED');
assert.match(ui, /Trust Score/);
assert.doesNotMatch(ui, /best adviser|safest adviser/i);
assert.match(ui, /id="tn-title"/);
assert.equal(snap.enforcement.consentOrders.listings, 273);
assert.equal(snap.enforcement.ceaseAndDesistOrders.listings, 52);
assert.equal(snap.enforcement.TN_ENFORCEMENT_EXACT_CRD_LINKS, 3);
console.log('TN-INV-001 publication assert: PASS');
