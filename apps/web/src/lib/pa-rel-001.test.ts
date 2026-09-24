import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { normalizedPublishedStatePath } from './published-state-path.ts';

const here = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(join(here, rel), 'utf8');

test('PA-REL-001 mixed-case statewide paths normalize', () => {
  assert.equal(normalizedPublishedStatePath('/Pennsylvania'), '/pennsylvania');
  assert.equal(normalizedPublishedStatePath('/PENNSYLVANIA'), '/pennsylvania');
  assert.equal(normalizedPublishedStatePath('/PeNnSyLvAnIa'), '/pennsylvania');
  assert.equal(normalizedPublishedStatePath('/pennsylvania'), null);
  assert.equal(normalizedPublishedStatePath('/Pennsylvania/philadelphia'), null);
  assert.equal(normalizedPublishedStatePath('/Ohio'), '/ohio');
  assert.equal(normalizedPublishedStatePath('/OHIO'), '/ohio');
  assert.equal(normalizedPublishedStatePath('/oHiO'), '/ohio');
  assert.equal(normalizedPublishedStatePath('/ohio'), null);
  assert.equal(normalizedPublishedStatePath('/ohio/columbus'), null);
  assert.equal(normalizedPublishedStatePath('/Georgia'), '/georgia');
  assert.equal(normalizedPublishedStatePath('/GEORGIA'), '/georgia');
  assert.equal(normalizedPublishedStatePath('/georgia'), null);
  assert.equal(normalizedPublishedStatePath('/Georgia/atlanta'), null);
});

test('PA-REL-001 middleware issues 308', () => {
  const mw = read('../middleware.ts');
  assert.match(mw, /normalizedPublishedStatePath/);
  assert.match(mw, /308/);
});
