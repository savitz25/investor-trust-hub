/**
 * Ask -> Investor source channel (resolve / source / acknowledge). Every call
 * must carry an Ask-signed Ed25519 assertion. Without the Ask verify key the
 * channel answers 503, which is the production state while parent sync is off.
 */
import { INVESTOR_PROFILE_CLASS } from './identity';
import { verifyInvestorAssertion, type AssertionKey, type NonceStore } from './investor-assertion';
import { INVESTOR_ORIGIN, SOURCE_PATH, investorManifest, manifestDigest, type InvestorManifest } from './manifest';
import { assessOfficialFirm, investorPublication, type FirmPublicationPort } from './publication';

const headers = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
};
const reply = (body: unknown, status: number) => Response.json(body, { status, headers });
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const exact = (v: Record<string, unknown>, keys: string[]) => Object.keys(v).length === keys.length && keys.every((k) => Object.hasOwn(v, k));
const opaque = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9_-]{43}$/.test(v);

function sameManifest(posted: unknown, rebuilt: InvestorManifest): boolean {
  if (!object(posted)) return false;
  try { return manifestDigest(posted as InvestorManifest) === manifestDigest(rebuilt); } catch { return false; }
}

export async function handleInvestorSource(
  request: Request,
  options: { publication: FirmPublicationPort; key: AssertionKey | null; nonces: NonceStore; now?: () => number },
): Promise<Response> {
  if (!options.key) return reply({ ok: false, error: 'unavailable' }, 503);
  const url = new URL(request.url);
  if (request.method !== 'POST') return reply({ ok: false, error: 'invalid' }, 405);
  if (url.origin !== INVESTOR_ORIGIN || url.pathname !== SOURCE_PATH || url.search) return reply({ ok: false, error: 'invalid' }, 400);
  if (request.headers.get('content-type')?.split(';')[0]?.trim() !== 'application/json') return reply({ ok: false, error: 'invalid' }, 400);
  const bytes = Buffer.from(await request.arrayBuffer());
  if (bytes.length > 131072) return reply({ ok: false, error: 'invalid' }, 413);
  let body: unknown;
  try { body = JSON.parse(bytes.toString('utf8')); } catch { return reply({ ok: false, error: 'invalid' }, 400); }
  if (!object(body) || typeof body.action !== 'string') return reply({ ok: false, error: 'invalid' }, 400);
  const now = options.now?.() ?? Date.now();
  const proof = new Request(request.url, { method: 'POST', headers: request.headers, body: bytes });
  try {
    if (body.action === 'resolve' && exact(body, ['action', 'profile']) && object(body.profile) && exact(body.profile, ['hub', 'nativeId', 'profileClass'])) {
      await verifyInvestorAssertion(proof, bytes, options.key, 'ask', 'source:read', options.nonces, now);
      if (body.profile.hub !== 'investor' || body.profile.profileClass !== INVESTOR_PROFILE_CLASS || typeof body.profile.nativeId !== 'string') {
        return reply({ ok: false, error: 'unavailable' }, 503);
      }
      const result = await investorPublication(body.profile.nativeId, options.publication, now);
      return result ? reply({ ok: true, result }, 200) : reply({ ok: false, error: 'unavailable' }, 503);
    }
    if (body.action === 'source' && exact(body, ['action', 'continuationRef', 'transferRef', 'manifest', 'manifestDigest', 'expiresAt'])) {
      const claims = await verifyInvestorAssertion(proof, bytes, options.key, 'ask', 'source:read', options.nonces, now);
      if (!opaque(body.continuationRef) || !opaque(body.transferRef) || typeof body.manifestDigest !== 'string') return reply({ ok: false, error: 'unauthorized' }, 403);
      if (typeof body.expiresAt !== 'number' || body.expiresAt <= now || body.expiresAt > now + 600_000) return reply({ ok: false, error: 'unauthorized' }, 403);
      const posted = body.manifest;
      if (!object(posted) || !object(posted.returnTask) || typeof posted.returnTask.canonicalSlug !== 'string') return reply({ ok: false, error: 'unauthorized' }, 403);
      // The manifest is rebuilt from the publication source; the posted copy only has to agree.
      const assessed = await assessOfficialFirm(posted.returnTask.canonicalSlug, INVESTOR_PROFILE_CLASS, options.publication);
      if (!assessed.ok) return reply({ ok: false, error: 'unauthorized' }, 403);
      const rebuilt = investorManifest(assessed.slug, assessed.nativeId);
      if (!sameManifest(posted, rebuilt) || manifestDigest(rebuilt) !== body.manifestDigest) return reply({ ok: false, error: 'unauthorized' }, 403);
      return reply({
        ok: true,
        result: {
          continuationRef: body.continuationRef,
          transferRef: body.transferRef,
          manifest: rebuilt,
          manifestDigest: body.manifestDigest,
          browserProof: claims.browser,
          expiresAt: body.expiresAt,
          requestPrefix: claims.browser,
        },
      }, 200);
    }
    if (body.action === 'acknowledge' && exact(body, ['action', 'continuationRef', 'receipts']) && Array.isArray(body.receipts)) {
      const claims = await verifyInvestorAssertion(proof, bytes, options.key, 'ask', 'source:ack', options.nonces, now);
      if (!opaque(body.continuationRef) || body.receipts.length !== 1) return reply({ ok: false, error: 'unauthorized' }, 403);
      const receipt = body.receipts[0];
      if (!object(receipt) || receipt.localCopy !== 'keep' || !object(receipt.parent) || !object(receipt.item)) return reply({ ok: false, error: 'unauthorized' }, 403);
      if (!['saved', 'already_saved', 'local_only'].includes(String(receipt.parent.outcome))) return reply({ ok: false, error: 'unauthorized' }, 403);
      if (typeof receipt.requestKey !== 'string' || !receipt.requestKey.startsWith(claims.browser + ':')) return reply({ ok: false, error: 'unauthorized' }, 403);
      const item = receipt.item;
      if (!object(item.profile) || typeof item.profile.nativeId !== 'string' || !(await investorPublication(item.profile.nativeId, options.publication, now))) {
        return reply({ ok: false, error: 'unauthorized' }, 403);
      }
      if ('watch' in receipt || 'watchCreated' in receipt) return reply({ ok: false, error: 'unauthorized' }, 403);
      return reply({ ok: true, result: { watchCreated: false } }, 200);
    }
    return reply({ ok: false, error: 'invalid' }, 400);
  } catch {
    return reply({ ok: false, error: 'unauthorized' }, 403);
  }
}
