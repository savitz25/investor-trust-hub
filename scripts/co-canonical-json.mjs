/**
 * Recursive semantic canonicalization. Object keys sorted at every depth.
 * Array order preserved. Callers exclude `fingerprint` before hashing.
 */
export function canonicalize(value, { stripFingerprint = false } = {}) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((item) => canonicalize(item));
  const out = {};
  for (const key of Object.keys(value).sort()) {
    if (stripFingerprint && key === 'fingerprint') continue;
    out[key] = canonicalize(value[key]);
  }
  return out;
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value, { stripFingerprint: true }));
}
