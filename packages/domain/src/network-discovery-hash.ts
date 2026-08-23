/**
 * Node-only fingerprint helper. Do not import from client components
 * or from the @ith/domain barrel (webpack cannot bundle node:crypto).
 */
import { createHash } from 'node:crypto';
import type { InvestorDiscoveryEntity } from './network-discovery';

export function contentFingerprint(entities: InvestorDiscoveryEntity[]): string {
  const normalized = entities.map((e) => {
    const { updated_at: _u, ...rest } = e;
    return rest;
  });
  return createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}
