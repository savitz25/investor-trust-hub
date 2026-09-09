import { createHash } from 'node:crypto';

/**
 * Recursive semantic canonicalization for Colorado accepted snapshots.
 * Object keys are sorted at every depth. Array order is preserved.
 * The top-level `fingerprint` field is excluded from the hash input.
 */
export function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item));
  }
  const source = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(source).sort()) {
    out[key] = canonicalize(source[key]);
  }
  return out;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function fingerprintSemanticSnapshot(snapshot: Record<string, unknown>): string {
  const rest: Record<string, unknown> = {};
  for (const key of Object.keys(snapshot)) {
    if (key === 'fingerprint') continue;
    rest[key] = snapshot[key];
  }
  return createHash('sha256').update(canonicalJson(rest)).digest('hex');
}
