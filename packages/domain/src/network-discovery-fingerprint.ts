/**
 * Node-only fingerprint helper (uses node:crypto).
 * Do NOT import from client components or the main @ith/domain barrel used by Next client bundles.
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
