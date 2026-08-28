import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildInvestorHomeIntelV1 } from '@ith/domain';

const here = dirname(fileURLToPath(import.meta.url));

function read(rel: string): string {
  return readFileSync(join(here, '..', rel), 'utf8');
}

describe('INV-HOME-002 homepage surface', () => {
  it('does not advertise live professional research on /', () => {
    const page = [read('src/app/page.tsx'), read('src/components/home-intel.tsx'), read('src/components/home-hero.tsx')].join(
      '\n',
    );
    expect(page.toLowerCase()).not.toContain('research a professional');
    expect(page).toContain('Research an investment firm');
    expect(page).toContain('/firms');
    expect(page).not.toContain('Loading investor intelligence');
  });

  it('keeps 5.E as independent bars, not a pie', async () => {
    const ui = read('src/components/home-intel.tsx').toLowerCase();
    expect(ui).not.toContain('pie');
    expect(ui).toContain('independent');
    const intel = await buildInvestorHomeIntelV1('2026-08-28T00:00:00.000Z');
    expect(intel.findings).toHaveLength(3);
  });
});
