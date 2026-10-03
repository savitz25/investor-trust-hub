import { NextResponse } from 'next/server';
import { firmPublicationPort } from '@/lib/my-investor/publication-port';
import { productionHandoffDeps, productionParentGate, stageParentHandoff, type StageDeps } from '@/lib/my-investor/signed-handoff';
import type { HandoffIntent } from '@/lib/my-investor/handoff-form';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Robots-Tag': 'noindex, nofollow' };

/** Production parent sync stays off. The canary constant is not an environment flag. */
export async function POST(request: Request) {
  const gate = productionParentGate();
  let slug = '';
  let intent: HandoffIntent = 'save';
  let pageOpen = false;
  let signedIn = false;
  let claimedCrd: string | null = null;
  let claimedReturnPath: string | null = null;
  let claimedEntityId: string | null = null;
  let claimedName: string | null = null;
  try {
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.slug === 'string') slug = body.slug;
    if (body.intent === 'save' || body.intent === 'save_signin' || body.intent === 'unsave') intent = body.intent;
    pageOpen = body.pageOpen === true;
    signedIn = body.signedIn === true;
    if (typeof body.crd === 'string') claimedCrd = body.crd;
    if (typeof body.returnPath === 'string') claimedReturnPath = body.returnPath;
    if (typeof body.entityId === 'string') claimedEntityId = body.entityId;
    if (typeof body.name === 'string') claimedName = body.name;
  } catch {
    return NextResponse.json({ parentSync: 'off', state: 'local_only', broad: gate.broad, canary: gate.canary, watchCreated: false }, { headers });
  }
  const deps: StageDeps = { publication: firmPublicationPort };
  if (gate.canary && !gate.broad) Object.assign(deps, productionHandoffDeps());
  const staged = await stageParentHandoff({
    slug, intent, pageOpen, signedIn, gate, claimedCrd, claimedReturnPath, claimedEntityId, claimedName,
  }, deps);
  if (staged.state !== 'continue') {
    return NextResponse.json({
      parentSync: 'off',
      state: 'local_only',
      reason: staged.reason,
      broad: gate.broad,
      canary: gate.canary,
      watchCreated: false,
    }, { headers });
  }
  return NextResponse.json({
    parentSync: 'staged',
    state: 'continue',
    target: staged.target,
    continuationRef: staged.continuationRef,
    intent: staged.intent,
    broad: gate.broad,
    canary: gate.canary,
    watchCreated: false,
  }, { headers });
}
