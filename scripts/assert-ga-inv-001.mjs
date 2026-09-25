import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publicationMetricInputs } from './publication_metric_inputs.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const snap = JSON.parse(readFileSync(join(root, 'artifacts/ga-inv-001-public-snapshot.json'), 'utf8'));
const pub = publicationMetricInputs();
const routes = readFileSync(join(root, 'packages/config/src/routes.ts'), 'utf8');
const ui = readFileSync(join(root, 'apps/web/src/components/ga-state-intel.tsx'), 'utf8');

assert.equal(snap.version, 'investor-ga-state-intel-v1');
assert.equal(snap.route, '/georgia');
assert.equal(snap.fingerprint, 'f1c44afc81eb7be3d774c91fb3928e01a4a6542511ea5dde0d079b79f41dbea6');
assert(pub.publishedStateIntelligencePaths.includes('/georgia'), 'catalog includes /georgia');
assert.equal(pub.publishedStateIntelligencePaths.length, 16);
assert(!existsSync(join(root, 'apps/web/src/app/georgia/atlanta')), 'no Atlanta folder');
assert(routes.includes("href: '/georgia'"), 'STATE_DISCOVERY_ROUTES');
assert.equal(snap.nationalOverlay.gaPrincipalOfficeSecIardFirms, 364);
assert.equal(snap.enforcement.index_rows, 57);
assert.equal(snap.enforcement.exact_profile_attachments, 0);
assert.equal(snap.complaints.count, null);
assert.equal(snap.expansionLedger.GRAPH_WRITES, 0);
assert.match(ui, /Trust Score/);
assert.doesNotMatch(ui, /best adviser|safest adviser/i);
assert.match(ui, /id="ga-title"/);
console.log('GA-INV-001 publication assert: PASS');
