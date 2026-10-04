import { createHash } from 'node:crypto';
import { firmReturnPath, INVESTOR_PROFILE_CLASS } from './identity';

/** Positional digest for v2-3/selected-profiles/3. Field order matches Ask. */
export const TRANSFER_VERSION_V3 = 'v2-3/selected-profiles/3' as const;
export const RUNTIME_VERSION = 'v2-3/parent-runtime/1' as const;
export const PARENT_ORIGIN = 'https://www.asktrusthub.com';
export const INVESTOR_ORIGIN = 'https://www.investortrusthub.com';
export const PARENT_API_PATH = '/api/my-trusthub/profile-save';
export const PARENT_FORM_PATH = '/my/profile-save';
export const SOURCE_PATH = PARENT_API_PATH + '/source';

type Profile = { hub: 'investor'; nativeId: string; profileClass: typeof INVESTOR_PROFILE_CLASS };

export type InvestorManifest = {
  version: typeof TRANSFER_VERSION_V3;
  sourceHub: 'investor';
  audience: 'ask';
  selected: Array<{ localItemId: string; revision: string; digest: string; profile: Profile }>;
  returnTask: { kind: 'profile'; hub: 'investor'; canonicalSlug: string; profile: Profile; returnPath: string };
};

export function investorItemDigest(nativeId: string, returnPath: string): string {
  return createHash('sha256').update(JSON.stringify([nativeId, returnPath])).digest('hex');
}

export function investorManifest(slug: string, nativeId: string): InvestorManifest {
  const returnPath = firmReturnPath(slug);
  const profile: Profile = { hub: 'investor', nativeId, profileClass: INVESTOR_PROFILE_CLASS };
  return {
    version: TRANSFER_VERSION_V3,
    sourceHub: 'investor',
    audience: 'ask',
    selected: [{ localItemId: slug, revision: '1', digest: investorItemDigest(nativeId, returnPath), profile }],
    returnTask: { kind: 'profile', hub: 'investor', canonicalSlug: slug, profile, returnPath },
  };
}

export function manifestDigest(v: InvestorManifest): string {
  const profileKey = (p: { hub: string; nativeId: string; profileClass: string }) => JSON.stringify([p.hub, p.nativeId, p.profileClass]);
  const task = [v.returnTask.kind, v.returnTask.hub, v.returnTask.canonicalSlug, v.returnTask.returnPath, profileKey(v.returnTask.profile)];
  return createHash('sha256').update(JSON.stringify([
    v.version, v.sourceHub, v.audience,
    v.selected.map((i) => [i.localItemId, i.revision, i.digest, i.profile.hub, i.profile.nativeId, i.profile.profileClass]),
    task,
  ])).digest('hex');
}
