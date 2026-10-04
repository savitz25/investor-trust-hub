import { generateKeyPairSync } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { profileSaveLabel, MY_TRUSTHUB_ACCOUNT_ENTRY_HREF, investorMyTrustHubAccountEntryEnabled } from '@/lib/my-investor/account-presentation';
import { handoffForm, markHandoffSent, readHandoff, rememberHandoff, resumeDecision, type StoredHandoff } from '@/lib/my-investor/handoff-form';
import { investorNativeId, resolveOfficialFirmIdentity } from '@/lib/my-investor/identity';
import { ASSERTION_HEADER, signInvestorAssertion, verifyInvestorAssertion } from '@/lib/my-investor/investor-assertion';
import { INVESTOR_ORIGIN, PARENT_API_PATH, PARENT_ORIGIN, SOURCE_PATH, investorManifest, manifestDigest } from '@/lib/my-investor/manifest';
import { deviceFirstProfileSave, deviceFirstProfileUnsave, listPendingParentOps, PRODUCTION_PARENT_SYNC } from '@/lib/my-investor/parent-adapter';
import { assessOfficialFirm, investorPublication, type FirmPublicationPort, type PublishedFirmRow } from '@/lib/my-investor/publication';
import {
  INVESTOR_CANARIES, INVESTOR_CANARY_ACTIVE, INVESTOR_PARENT_SYNC_BROAD,
  productionHandoffDeps, productionParentGate, stageParentHandoff, type ParentResponse,
} from '@/lib/my-investor/signed-handoff';
import { handleInvestorSource } from '@/lib/my-investor/source-callback';
import { SAVED_FIRMS_KEY, isFirmSaved, listSavedFirms } from '@/lib/my-investor/storage';

const SRC = join(__dirname, '..', 'src');
const source = (path: string) => readFileSync(join(SRC, path), 'utf8');

const CANARY = INVESTOR_CANARIES[0];
const FIRM = { slug: CANARY.slug, name: CANARY.name, crd: CANARY.crd, kind: 'official_firm' as const };
const STATE_ONLY = { slug: 'sec-crd-7770001', name: 'Fixture State Adviser LLC', crd: '7770001', kind: 'state_adviser_firm' as const };
const gate = { broad: false, canary: true };
const browser = 'b'.repeat(43);

/** Fixture publication source: the rows a production read would return per CRD. */
function publication(extra: Record<string, PublishedFirmRow[]> = {}): FirmPublicationPort & { reads: string[] } {
  const rows: Record<string, PublishedFirmRow[]> = {
    ...Object.fromEntries(INVESTOR_CANARIES.map((c) => [c.crd, [{ slug: c.slug, crd: c.crd, officialReport: true }]])),
    '7770001': [{ slug: 'sec-crd-7770001', crd: '7770001', officialReport: false }],
    '7770002': [
      { slug: 'sec-crd-7770002', crd: '7770002', officialReport: true },
      { slug: 'another-profile', crd: '7770002', officialReport: true },
    ],
    '7770003': [{ slug: 'legacy-slug', crd: '7770003', officialReport: true }],
    ...extra,
  };
  const reads: string[] = [];
  return { reads, byCrd: async (crd) => { reads.push(crd); return rows[crd] ?? []; } };
}

function keys(kid: string) {
  const pair = generateKeyPairSync('ed25519');
  return {
    privateKey: { kid, pem: pair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString() },
    publicKey: { kid, pem: pair.publicKey.export({ type: 'spki', format: 'pem' }).toString() },
  };
}

function nonces() {
  const seen = new Set<string>();
  return { claim: async (key: string) => { if (seen.has(key)) return false; seen.add(key); return true; } };
}

/** Stand-in for Ask's staging API. It verifies the Investor assertion like Ask would. */
function parentMock(now: number, verifyKey: { kid: string; pem: string }) {
  const calls: Array<{ operation: string; body: string; assertion: string }> = [];
  const seen = nonces();
  return {
    calls,
    parent: async (call: { operation: string; body: string; assertion: string }): Promise<ParentResponse> => {
      calls.push(call);
      const request = new Request(PARENT_ORIGIN + PARENT_API_PATH, { method: 'POST', headers: { [ASSERTION_HEADER]: call.assertion }, body: call.body });
      try { await verifyInvestorAssertion(request, Buffer.from(call.body), verifyKey, 'investor', 'transfer:stage', seen, now); } catch { return { ok: false }; }
      const body = JSON.parse(call.body) as { operation: string; input: never };
      if (body.operation === 'prepareGuestProfileTransfer') {
        return { ok: true, operation: body.operation, result: { transferRef: 't'.repeat(43), manifestDigest: manifestDigest(body.input), expiresAt: now + 60_000 } };
      }
      return { ok: true, operation: body.operation, result: { continuationRef: 'c'.repeat(43), expiresAt: now + 60_000 } };
    },
  };
}

const memory = new Map<string, string>();
const fakeStorage = {
  getItem: (key: string) => (memory.has(key) ? memory.get(key)! : null),
  setItem: (key: string, value: string) => { memory.set(key, String(value)); },
  removeItem: (key: string) => { memory.delete(key); },
};
let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  memory.clear();
  fetchSpy = vi.fn(async () => { throw new Error('network is not allowed in this test'); });
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('localStorage', fakeStorage);
  vi.stubGlobal('fetch', fetchSpy);
});
afterEach(() => {
  // N. Nothing in this suite may reach any network, Ask production included.
  expect(fetchSpy).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('device Save toggle', () => {
  it('A/B/C/D: Save -> Saved -> Save, one local row, no Watch', () => {
    expect(profileSaveLabel(isFirmSaved(FIRM.slug))).toBe('♡ Save');
    const first = deviceFirstProfileSave(FIRM);
    expect(first.device.ok && !first.device.alreadySaved).toBe(true);
    expect(first.watchCreated).toBe(false);
    expect(profileSaveLabel(isFirmSaved(FIRM.slug))).toBe('♥ Saved');
    // A repeated Save (double click, second tab) never makes a second row.
    const again = deviceFirstProfileSave(FIRM);
    expect(again.device.ok && again.device.alreadySaved).toBe(true);
    expect(listSavedFirms().filter((row) => row.slug === FIRM.slug)).toHaveLength(1);
    expect(listSavedFirms()[0]).toMatchObject({ slug: FIRM.slug, crd: FIRM.crd, profilePath: `/firm/${FIRM.slug}`, kind: 'official_firm' });
    const removed = deviceFirstProfileUnsave(FIRM);
    expect(removed).toMatchObject({ removed: true, watchCreated: false });
    expect(profileSaveLabel(isFirmSaved(FIRM.slug))).toBe('♡ Save');
    expect(listSavedFirms()).toHaveLength(0);
    expect(deviceFirstProfileUnsave(FIRM)).toMatchObject({ removed: false, parent: { ok: false, reason: 'not_saved' } });
    // Nothing anywhere in device storage mentions a Watch.
    expect([...memory.keys()].join() + [...memory.values()].join()).not.toMatch(/"watch"|watchId|watch:/i);
    expect(JSON.stringify(first) + JSON.stringify(removed)).not.toMatch(/"watchCreated":true/);
  });

  it('pending Save/Unsave state is queued by exact CRD and parent sync stays off', () => {
    expect(PRODUCTION_PARENT_SYNC).toBe(false);
    const saved = deviceFirstProfileSave(FIRM);
    expect(saved.parent).toMatchObject({ ok: true, pendingSync: true, parentSync: 'off', identity: { nativeId: `crd-${FIRM.crd}`, namespace: 'sec.crd', jurisdiction: 'US', profileClass: 'official_firm', returnPath: `/firm/${FIRM.slug}` } });
    expect(listPendingParentOps()).toMatchObject([{ action: 'save', nativeId: `crd-${FIRM.crd}`, namespace: 'sec.crd' }]);
    deviceFirstProfileUnsave(FIRM);
    expect(listPendingParentOps()).toMatchObject([{ action: 'unsave', nativeId: `crd-${FIRM.crd}` }]);
  });

  it('F/G: missing identity and unsupported class are saved on the device only', () => {
    const noCrd = deviceFirstProfileSave({ ...FIRM, crd: null });
    expect(noCrd.device.ok).toBe(true);
    expect(noCrd.parent).toMatchObject({ ok: false, reason: 'identity_unresolved', pendingSync: false });
    deviceFirstProfileUnsave({ ...FIRM, crd: null });
    const wrongSlug = deviceFirstProfileSave({ ...FIRM, slug: 'some-other-slug' });
    expect(wrongSlug.device.ok).toBe(true);
    expect(wrongSlug.parent).toMatchObject({ ok: false, reason: 'identity_unresolved' });
    const stateOnly = deviceFirstProfileSave(STATE_ONLY);
    expect(stateOnly.device.ok).toBe(true);
    expect(stateOnly.parent).toMatchObject({ ok: false, reason: 'unsupported_class', pendingSync: false });
    expect(listPendingParentOps()).toHaveLength(0);
    expect(listSavedFirms().map((row) => row.slug).sort()).toEqual(['sec-crd-7770001', 'some-other-slug']);
  });

  it('identity is the exact CRD; a name, UUID or foreign slug never resolves', () => {
    expect(investorNativeId('106176')).toBe('crd-106176');
    for (const bad of ['', '0', '0123', '12a', ' 1 2', '12345678901', null, undefined]) expect(investorNativeId(bad)).toBeNull();
    expect(resolveOfficialFirmIdentity({ slug: 'sec-crd-106176', crd: '106176' })?.nativeId).toBe('crd-106176');
    expect(resolveOfficialFirmIdentity({ slug: 'sec-crd-106176', crd: '104571' })).toBeNull();
    expect(resolveOfficialFirmIdentity({ slug: 'weinberger-asset-management', crd: '106176' })).toBeNull();
    expect(resolveOfficialFirmIdentity({ slug: 'sec-crd-106176' })).toBeNull();
  });
});

describe('publication eligibility', () => {
  it('E/F/G/H: only one published official firm for the exact CRD is eligible', async () => {
    const port = publication();
    expect(await assessOfficialFirm(CANARY.slug, 'official_firm', port)).toEqual({
      ok: true, slug: CANARY.slug, crd: CANARY.crd, nativeId: `crd-${CANARY.crd}`, returnPath: `/firm/${CANARY.slug}`, profileClass: 'official_firm',
    });
    expect(await assessOfficialFirm(CANARY.slug, 'representative', port)).toEqual({ ok: false, reason: 'wrong_class' });
    expect(await assessOfficialFirm('northbridge-ledger-advisors', 'official_firm', port)).toEqual({ ok: false, reason: 'missing_crd' });
    expect(await assessOfficialFirm('sec-crd-9999999', 'official_firm', port)).toEqual({ ok: false, reason: 'unpublished' });
    expect(await assessOfficialFirm('sec-crd-7770001', 'official_firm', port)).toEqual({ ok: false, reason: 'unsupported_class' });
    expect(await assessOfficialFirm('sec-crd-7770002', 'official_firm', port)).toEqual({ ok: false, reason: 'ambiguous' });
    expect(await assessOfficialFirm('sec-crd-7770003', 'official_firm', port)).toEqual({ ok: false, reason: 'noncanonical' });
    const down: FirmPublicationPort = { byCrd: async () => { throw new Error('db'); } };
    expect(await assessOfficialFirm(CANARY.slug, 'official_firm', down)).toEqual({ ok: false, reason: 'unavailable' });
    expect(await investorPublication(`crd-${CANARY.crd}`, port, 5)).toEqual({
      identity: { hub: 'investor', nativeId: `crd-${CANARY.crd}`, profileClass: 'official_firm' },
      canonicalSlug: CANARY.slug, publicationState: 'PUBLISHABLE', reviewedClass: 'official_firm', checkedAt: 5,
    });
    for (const bad of [CANARY.slug, CANARY.name, 'crd-0', 'crd-7770001', 'crd-7770002', 'crd-7770003', 'usdot-106176', '11111111-1111-4111-8111-111111111111']) {
      expect(await investorPublication(bad, port)).toBeNull();
    }
  });

  it('the production port reads the profile page publication rule by exact CRD only', () => {
    const port = source('lib/my-investor/publication-port.ts');
    expect(port).toContain("crd.identifier_value = $1 AND ${publicFirmCountWhere()}");
    expect(port).toContain("crd.identifier_type = 'crd'");
    expect(port).toContain('mapClassification(row) !== null');
    expect(port).not.toMatch(/display_name|legal_name|LIKE|similarity|f\.id\s*=/);
  });
});

describe('signed handoff staging', () => {
  it('production gate is closed: nothing is read, signed or sent', async () => {
    expect([INVESTOR_PARENT_SYNC_BROAD, INVESTOR_CANARY_ACTIVE]).toEqual([false, false]);
    expect(productionParentGate()).toEqual({ broad: false, canary: false });
    const port = publication();
    const key = keys('investor-test');
    const parent = parentMock(Date.now(), key.publicKey);
    const result = await stageParentHandoff({ slug: CANARY.slug, intent: 'save', pageOpen: true, signedIn: true, gate: productionParentGate() },
      { publication: port, key: key.privateKey, parent: parent.parent });
    expect(result).toEqual({ state: 'local_only', reason: 'sync_off', watchCreated: false, parentSync: 'off' });
    expect(port.reads).toHaveLength(0);
    expect(parent.calls).toHaveLength(0);
    // No signing key or parent client is configured by default either.
    expect(productionHandoffDeps({} as NodeJS.ProcessEnv)).toEqual({});
    expect(productionHandoffDeps({ MY_TRUSTHUB_V23_INVESTOR_KEY_ID: 'k', MY_TRUSTHUB_V23_INVESTOR_SIGNING_PRIVATE_KEY_PEM: key.privateKey.pem, MY_TRUSTHUB_V23_PARENT_ORIGIN: 'https://evil.example' } as unknown as NodeJS.ProcessEnv)).toEqual({});
    const route = source('app/api/my-investor/profile-save/route.ts');
    expect(route).toContain('const gate = productionParentGate();');
    expect(route).not.toMatch(/canary:\s*true|process\.env/);
  });

  it('E/J: an exact supported firm stages a server-derived, Ed25519-signed manifest', async () => {
    const now = Date.now();
    const key = keys('investor-test');
    const parent = parentMock(now, key.publicKey);
    const result = await stageParentHandoff({ slug: CANARY.slug, intent: 'save', pageOpen: true, signedIn: true, gate },
      { publication: publication(), key: key.privateKey, parent: parent.parent, now: () => now, browserBinding: browser });
    expect(result).toEqual({ state: 'continue', target: 'https://www.asktrusthub.com/my/profile-save', continuationRef: 'c'.repeat(43), intent: 'save', watchCreated: false, parentSync: 'staged' });
    expect(parent.calls.map((c) => c.operation)).toEqual(['prepareGuestProfileTransfer', 'prepareProfileSaveContinuation']);
    const staged = JSON.parse(parent.calls[0]!.body) as { version: string; input: ReturnType<typeof investorManifest> };
    expect(staged.version).toBe('v2-3/parent-runtime/1');
    expect(staged.input).toEqual(investorManifest(CANARY.slug, `crd-${CANARY.crd}`));
    expect(staged.input.returnTask).toEqual({
      kind: 'profile', hub: 'investor', canonicalSlug: CANARY.slug, returnPath: `/firm/${CANARY.slug}`,
      profile: { hub: 'investor', nativeId: `crd-${CANARY.crd}`, profileClass: 'official_firm' },
    });
    // The manifest carries no name, UUID, email or Watch.
    expect(parent.calls[0]!.body).not.toMatch(/WEINBERGER|@|watch|[0-9a-f]{8}-[0-9a-f]{4}-4/i);
    const claims = JSON.parse(Buffer.from(parent.calls[0]!.assertion.split('.')[1]!, 'base64url').toString()) as Record<string, unknown>;
    expect(claims).toMatchObject({
      iss: 'urn:trusthub:v23:qvvxvbcdmbjzrgvwjatw:investor', sub: 'svc:trusthub:investor:v23:production',
      aud: 'https://www.asktrusthub.com/api/my-trusthub/profile-save', scope: 'transfer:stage', method: 'POST',
      ask_origin: 'https://www.asktrusthub.com', investor_origin: 'https://www.investortrusthub.com', browser,
    });
    expect(JSON.parse(Buffer.from(parent.calls[0]!.assertion.split('.')[0]!, 'base64url').toString())).toEqual({ alg: 'EdDSA', typ: 'trusthub-v23+jws', kid: 'investor-test' });
  });

  it('J: the signed assertion verifies, and any change to body, key, target or replay is refused', async () => {
    const now = Date.now();
    const key = keys('investor-test');
    const other = keys('investor-test');
    const body = Buffer.from(JSON.stringify({ hello: 'world' }));
    const target = PARENT_ORIGIN + PARENT_API_PATH;
    const assertion = signInvestorAssertion(key.privateKey, 'investor', target, 'transfer:stage', body, browser, null, null, now);
    const request = () => new Request(target, { method: 'POST', headers: { [ASSERTION_HEADER]: assertion }, body });
    const store = nonces();
    await expect(verifyInvestorAssertion(request(), body, key.publicKey, 'investor', 'transfer:stage', store, now)).resolves.toMatchObject({ browser });
    await expect(verifyInvestorAssertion(request(), body, key.publicKey, 'investor', 'transfer:stage', store, now)).rejects.toThrow('unauthorized'); // replay
    await expect(verifyInvestorAssertion(request(), Buffer.from('{}'), key.publicKey, 'investor', 'transfer:stage', nonces(), now)).rejects.toThrow('unauthorized');
    await expect(verifyInvestorAssertion(request(), body, other.publicKey, 'investor', 'transfer:stage', nonces(), now)).rejects.toThrow('unauthorized');
    await expect(verifyInvestorAssertion(request(), body, key.publicKey, 'investor', 'source:read', nonces(), now)).rejects.toThrow('unauthorized');
    await expect(verifyInvestorAssertion(request(), body, key.publicKey, 'investor', 'transfer:stage', nonces(), now + 31_000)).rejects.toThrow('unauthorized');
    const elsewhere = new Request('https://www.asktrusthub.com/api/other', { method: 'POST', headers: { [ASSERTION_HEADER]: assertion }, body });
    await expect(verifyInvestorAssertion(elsewhere, body, key.publicKey, 'investor', 'transfer:stage', nonces(), now)).rejects.toThrow('unauthorized');
    // Exact source origin: Investor never signs toward any origin but the pinned parent.
    expect(() => signInvestorAssertion(key.privateKey, 'investor', 'https://evil.example/api/my-trusthub/profile-save', 'transfer:stage', body, browser)).toThrow();
    const rsa = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    expect(() => signInvestorAssertion({ kid: 'x', pem: rsa }, 'investor', target, 'transfer:stage', body, browser)).toThrow();
  });

  it('F/G/H/I: unresolved, unsupported, ambiguous and tampered requests stay device-only and never reach the parent', async () => {
    const now = Date.now();
    const key = keys('investor-test');
    const cases: Array<[Record<string, unknown>, string]> = [
      [{ slug: 'sec-crd-9999999' }, 'sync_off'], // not a canary: closed before any read
      [{ slug: CANARY.slug, profileClass: 'representative' }, 'wrong_class'],
      [{ slug: CANARY.slug, claimedCrd: '104571' }, 'tampered_crd'],
      [{ slug: CANARY.slug, claimedReturnPath: '/firm/sec-crd-104571' }, 'tampered_return'],
      [{ slug: CANARY.slug, claimedEntityId: '11111111-1111-4111-8111-111111111111' }, 'tampered_identity'],
      [{ slug: CANARY.slug, claimedName: 'WEINBERGER ASSET MANAGEMENT, INC' }, 'tampered_name'],
      [{ slug: CANARY.slug, pageOpen: false }, 'page_closed'],
    ];
    for (const [patch, reason] of cases) {
      const parent = parentMock(now, key.publicKey);
      const result = await stageParentHandoff({ slug: CANARY.slug, intent: 'save', pageOpen: true, signedIn: true, gate, ...patch } as never,
        { publication: publication(), key: key.privateKey, parent: parent.parent, now: () => now, browserBinding: browser });
      expect(result, reason).toEqual({ state: 'local_only', reason, watchCreated: false, parentSync: 'off' });
      expect(parent.calls, reason).toHaveLength(0);
    }
    // A canary whose publication changed (state-only, ambiguous, renamed, unpublished) is refused at stage time.
    for (const [rows, reason] of [
      [[{ slug: CANARY.slug, crd: CANARY.crd, officialReport: false }], 'unsupported_class'],
      [[{ slug: CANARY.slug, crd: CANARY.crd, officialReport: true }, { slug: 'twin', crd: CANARY.crd, officialReport: true }], 'ambiguous'],
      [[{ slug: 'renamed', crd: CANARY.crd, officialReport: true }], 'noncanonical'],
      [[], 'unpublished'],
    ] as Array<[PublishedFirmRow[], string]>) {
      const parent = parentMock(now, key.publicKey);
      const result = await stageParentHandoff({ slug: CANARY.slug, intent: 'save', pageOpen: true, signedIn: true, gate },
        { publication: publication({ [CANARY.crd]: rows }), key: key.privateKey, parent: parent.parent, now: () => now, browserBinding: browser });
      expect(result, reason).toMatchObject({ state: 'local_only', reason });
      expect(parent.calls).toHaveLength(0);
    }
    // No key, a parent that answers for another manifest, or an expired stage: device-only.
    expect(await stageParentHandoff({ slug: CANARY.slug, intent: 'save', pageOpen: true, signedIn: true, gate }, { publication: publication() }))
      .toMatchObject({ state: 'local_only', reason: 'unsigned' });
    const lying = async (call: { operation: string }): Promise<ParentResponse> => ({ ok: true, operation: call.operation, result: { transferRef: 't'.repeat(43), manifestDigest: 'f'.repeat(64), expiresAt: now + 60_000 } });
    expect(await stageParentHandoff({ slug: CANARY.slug, intent: 'save', pageOpen: true, signedIn: true, gate }, { publication: publication(), key: key.privateKey, parent: lying, now: () => now }))
      .toMatchObject({ state: 'local_only', reason: 'unavailable' });
    // A parent that cannot verify the signature (wrong key) refuses, so nothing is staged.
    const stranger = parentMock(now, keys('investor-test').publicKey);
    expect(await stageParentHandoff({ slug: CANARY.slug, intent: 'save', pageOpen: true, signedIn: true, gate }, { publication: publication(), key: key.privateKey, parent: stranger.parent, now: () => now }))
      .toMatchObject({ state: 'local_only', reason: 'unavailable' });
  });

  it('K: a signed-out Save continues as save_signin through the same top-level form', async () => {
    const now = Date.now();
    const key = keys('investor-test');
    const parent = parentMock(now, key.publicKey);
    const deps = { publication: publication(), key: key.privateKey, parent: parent.parent, now: () => now, browserBinding: browser };
    const result = await stageParentHandoff({ slug: CANARY.slug, intent: 'save', pageOpen: true, signedIn: false, gate }, deps);
    expect(result).toMatchObject({ state: 'continue', intent: 'save_signin' });
    const unsave = await stageParentHandoff({ slug: CANARY.slug, intent: 'unsave', pageOpen: true, signedIn: false, gate }, deps);
    expect(unsave).toMatchObject({ state: 'continue', intent: 'unsave' });
    if (result.state !== 'continue') throw new Error('unreachable');
    expect(handoffForm(result.target, result.continuationRef, result.intent)).toEqual({ action: 'https://www.asktrusthub.com/my/profile-save', continuationRef: 'c'.repeat(43), intent: 'save_signin' });
    // Top-level Ask handoff only: any other origin, path, query or reference shape is refused.
    for (const target of ['https://evil.example/my/profile-save', 'https://www.asktrusthub.com/my/other', 'https://www.asktrusthub.com/my/profile-save?x=1', 'http://www.asktrusthub.com/my/profile-save', 'https://user@www.asktrusthub.com/my/profile-save']) {
      expect(handoffForm(target, 'c'.repeat(43), 'save')).toBeNull();
    }
    expect(handoffForm('https://www.asktrusthub.com/my/profile-save', 'short', 'save')).toBeNull();
    expect(handoffForm('https://www.asktrusthub.com/my/profile-save', 'c'.repeat(43), 'watch')).toBeNull();
  });

  it('L: an abandoned handoff resumes once when the page is visible; sent and expired tickets do not', () => {
    const tickets = new Map<string, string>();
    const store = { getItem: (k: string) => tickets.get(k) ?? null, setItem: (k: string, v: string) => { tickets.set(k, v); }, removeItem: (k: string) => { tickets.delete(k); } };
    const ticket: StoredHandoff = { slug: CANARY.slug, target: 'https://www.asktrusthub.com/my/profile-save', continuationRef: 'c'.repeat(43), intent: 'save', phase: 'staged', expiresAt: 10_000 };
    rememberHandoff(store, ticket);
    // Keep-page-open protection: a hidden page never submits.
    expect(resumeDecision(readHandoff(store, CANARY.slug, 1_000), 'hidden')).toBe('hold');
    expect(resumeDecision(readHandoff(store, CANARY.slug, 1_000), 'visible')).toBe('submit');
    markHandoffSent(store, ticket);
    expect(resumeDecision(readHandoff(store, CANARY.slug, 1_000), 'visible')).toBe('hold');
    expect(readHandoff(store, 'sec-crd-104571', 1_000)).toBeNull();
    expect(readHandoff(store, CANARY.slug, 10_000)).toBeNull(); // expired tickets are dropped
    expect(tickets.size).toBe(0);
    store.setItem('ith:investor-handoff:v1:' + CANARY.slug, JSON.stringify({ ...ticket, target: 'https://evil.example/my/profile-save' }));
    expect(readHandoff(store, CANARY.slug, 1_000)).toBeNull();
    store.setItem('ith:investor-handoff:v1:' + CANARY.slug, '{broken');
    expect(readHandoff(store, CANARY.slug, 1_000)).toBeNull();
    expect(resumeDecision(null, 'visible')).toBe('hold');
  });
});

describe('Ask -> Investor source channel', () => {
  const sourceUrl = INVESTOR_ORIGIN + SOURCE_PATH;
  function call(askKey: { kid: string; pem: string }, payload: unknown, scope: 'source:read' | 'source:ack', now: number, sign = true) {
    const body = Buffer.from(JSON.stringify(payload));
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (sign) headers[ASSERTION_HEADER] = signInvestorAssertion(askKey, 'ask', sourceUrl, scope, body, browser, null, null, now);
    return new Request(sourceUrl, { method: 'POST', headers, body });
  }

  it('answers 503 without the Ask verify key (the production state) and never reads publication', async () => {
    const port = publication();
    const response = await handleInvestorSource(new Request(sourceUrl, { method: 'POST', body: '{}' }), { publication: port, key: null, nonces: nonces() });
    expect(response.status).toBe(503);
    expect(port.reads).toHaveLength(0);
    const route = source('app/api/my-trusthub/profile-save/source/route.ts');
    expect(route).toContain('MY_TRUSTHUB_V23_ASK_VERIFY_PUBLIC_KEY_PEM');
  });

  it('resolve, source and acknowledge only succeed for an Ask-signed call about the exact published firm', async () => {
    const now = Date.now();
    const ask = keys('ask-test');
    const options = { publication: publication(), key: ask.publicKey, nonces: nonces(), now: () => now };
    const profile = { hub: 'investor', nativeId: `crd-${CANARY.crd}`, profileClass: 'official_firm' };
    const resolved = await handleInvestorSource(call(ask.privateKey, { action: 'resolve', profile }, 'source:read', now), options);
    expect(resolved.status).toBe(200);
    expect(await resolved.json()).toMatchObject({ ok: true, result: { identity: profile, canonicalSlug: CANARY.slug, publicationState: 'PUBLISHABLE', reviewedClass: 'official_firm' } });
    expect((await handleInvestorSource(call(ask.privateKey, { action: 'resolve', profile }, 'source:read', now, false), options)).status).toBe(403);
    expect((await handleInvestorSource(call(keys('ask-test').privateKey, { action: 'resolve', profile }, 'source:read', now), options)).status).toBe(403);
    for (const bad of [{ ...profile, nativeId: 'crd-7770001' }, { ...profile, nativeId: 'crd-7770002' }, { ...profile, nativeId: CANARY.slug }, { ...profile, profileClass: 'representative' }, { ...profile, hub: 'lender' }]) {
      expect((await handleInvestorSource(call(ask.privateKey, { action: 'resolve', profile: bad }, 'source:read', now), options)).status).toBe(503);
    }
    const manifest = investorManifest(CANARY.slug, `crd-${CANARY.crd}`);
    const digest = manifestDigest(manifest);
    const sourceBody = { action: 'source', continuationRef: 'c'.repeat(43), transferRef: 't'.repeat(43), manifest, manifestDigest: digest, expiresAt: now + 60_000 };
    const sourced = await handleInvestorSource(call(ask.privateKey, sourceBody, 'source:read', now), options);
    expect(sourced.status).toBe(200);
    expect(await sourced.json()).toMatchObject({ ok: true, result: { manifest, manifestDigest: digest, browserProof: browser, requestPrefix: browser } });
    // I. A manifest whose identity was altered in transit does not match the rebuilt one.
    const forged = { ...manifest, returnTask: { ...manifest.returnTask, profile: { ...manifest.returnTask.profile, nativeId: 'crd-104571' } } };
    expect((await handleInvestorSource(call(ask.privateKey, { ...sourceBody, manifest: forged }, 'source:read', now), options)).status).toBe(403);
    expect((await handleInvestorSource(call(ask.privateKey, { ...sourceBody, manifestDigest: 'f'.repeat(64) }, 'source:read', now), options)).status).toBe(403);
    expect((await handleInvestorSource(call(ask.privateKey, { ...sourceBody, expiresAt: now + 700_000 }, 'source:read', now), options)).status).toBe(403);
    // Acknowledgement-only success: Investor accepts an account outcome only from a signed receipt.
    const receipt = { requestKey: browser + ':1', localCopy: 'keep', parent: { outcome: 'saved' }, item: manifest.selected[0] };
    const ack = { action: 'acknowledge', continuationRef: 'c'.repeat(43), receipts: [receipt] };
    const acknowledged = await handleInvestorSource(call(ask.privateKey, ack, 'source:ack', now), options);
    expect(acknowledged.status).toBe(200);
    expect(await acknowledged.json()).toEqual({ ok: true, result: { watchCreated: false } });
    expect((await handleInvestorSource(call(ask.privateKey, ack, 'source:read', now), options)).status).toBe(403); // wrong scope
    expect((await handleInvestorSource(call(ask.privateKey, { ...ack, receipts: [{ ...receipt, watch: { id: 'w' } }] }, 'source:ack', now), options)).status).toBe(403);
    expect((await handleInvestorSource(call(ask.privateKey, { ...ack, receipts: [{ ...receipt, requestKey: 'x'.repeat(43) + ':1' }] }, 'source:ack', now), options)).status).toBe(403);
    expect((await handleInvestorSource(call(ask.privateKey, { ...ack, receipts: [{ ...receipt, parent: { outcome: 'failed' } }] }, 'source:ack', now), options)).status).toBe(403);
    expect((await handleInvestorSource(call(ask.privateKey, { ...ack, receipts: [{ ...receipt, item: { ...receipt.item, profile: { ...profile, nativeId: 'crd-7770001' } } }] }, 'source:ack', now), options)).status).toBe(403);
  });
});

describe('one-account presentation and existing behaviour', () => {
  it('My TrustHub entry is a plain Ask link, hideable by flag; Save and Watch stay separate', () => {
    expect(MY_TRUSTHUB_ACCOUNT_ENTRY_HREF).toBe('https://www.asktrusthub.com/my');
    expect(investorMyTrustHubAccountEntryEnabled()).toBe(true);
    vi.stubEnv('NEXT_PUBLIC_INVESTOR_MY_TRUSTHUB_ACCOUNT_ENTRY', '0');
    expect(investorMyTrustHubAccountEntryEnabled()).toBe(false);
    const button = source('components/my-investor/save-firm-button.tsx');
    expect(button).toContain('onClick={saved ? onUnsave : onSave}');
    expect(button.match(/<button/g)).toHaveLength(1); // one toggle, no separate Unsave / Keep / Confirm control
    expect(button).not.toMatch(/Keep this in|Confirm Save|>\s*Unsave\s*</);
    for (const file of ['components/my-investor/save-firm-button.tsx', 'components/my-investor/saved-firms.tsx', 'lib/my-investor/storage.ts', 'lib/my-investor/parent-adapter.ts']) {
      expect(source(file)).not.toMatch(/createWatch|\/watch|watchlist/i);
    }
  });

  it('M: the firm route, directory and search code paths are untouched; the toggle is additive', () => {
    expect(source('components/firm-trust-report.tsx')).toContain('<SaveFirmButton slug={report.slug} name={report.displayName} crd={report.crd} kind="official_firm" parentHandoff />');
    expect(source('components/state-adviser-report.tsx')).toContain('<SaveFirmButton slug={adviser.slug} name={adviser.displayName} crd={adviser.crd} kind="state_adviser_firm" />');
    // Synthetic firms, professionals and reserved routes get no Save control.
    for (const file of ['components/firm-report.tsx', 'components/professional-report.tsx', 'app/company/[slug]/page.tsx', 'app/fund/[slug]/page.tsx', 'app/firms/page.tsx', 'components/firm-search.tsx']) {
      expect(source(file)).not.toContain('SaveFirmButton');
    }
    expect(source('app/firm/[slug]/page.tsx')).not.toContain('my-investor');
    expect(memory.has(SAVED_FIRMS_KEY)).toBe(false);
  });
});
