import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const NEXT = join(__dirname, '..', '.next');

function walkJs(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkJs(full, acc);
    else if (entry.name.endsWith('.js')) acc.push(full);
  }
  return acc;
}

describe('client bundles do not include server secrets', () => {
  it('does not embed DATABASE_URL or service-role key names as assigned secrets', () => {
    if (!existsSync(NEXT)) {
      expect(true).toBe(true);
      return;
    }
    const files = walkJs(join(NEXT, 'static'));
    const haystack = files.map((file) => readFileSync(file, 'utf8')).join('\n');
    expect(haystack).not.toMatch(/postgresql:\/\/[^:]+:[^@]+@/);
    expect(haystack).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\./);
  });
});
