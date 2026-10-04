import type { AssertionKey, NonceStore } from '@/lib/my-investor/investor-assertion';
import { firmPublicationPort } from '@/lib/my-investor/publication-port';
import { handleInvestorSource } from '@/lib/my-investor/source-callback';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const seen = new Map<string, number>();
const nonces: NonceStore = {
  async claim(key, expiresAt) {
    const now = Date.now();
    for (const [id, exp] of seen) if (exp <= now) seen.delete(id);
    if (seen.has(key)) return false;
    seen.set(key, expiresAt);
    return true;
  },
};

/** No Ask verify key is configured while parent sync is off: every call answers 503. */
function askVerifyKey(): AssertionKey | null {
  const kid = process.env.MY_TRUSTHUB_V23_ASK_KEY_ID?.trim() ?? '';
  const pem = process.env.MY_TRUSTHUB_V23_ASK_VERIFY_PUBLIC_KEY_PEM ?? '';
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(kid) || !pem.includes('PUBLIC KEY')) return null;
  return { kid, pem };
}

export async function POST(request: Request) {
  return handleInvestorSource(request, { publication: firmPublicationPort, key: askVerifyKey(), nonces });
}
