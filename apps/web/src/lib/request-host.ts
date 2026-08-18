import { headers } from 'next/headers';
import { normalizeRequestHost } from '@ith/config';

export async function readRequestHost(): Promise<string> {
  try {
    const incoming = await headers();
    return normalizeRequestHost(incoming.get('x-forwarded-host') ?? incoming.get('host'));
  } catch {
    return '';
  }
}
