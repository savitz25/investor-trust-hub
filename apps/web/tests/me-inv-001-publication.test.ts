import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

describe('Maine securities publication', () => {
  it('keeps regulator populations and missing source rows explicit', () => {
    const page = fs.readFileSync('apps/web/src/app/maine/page.tsx', 'utf8');
    expect(page).toContain("path: '/maine'");
    expect(page).toContain('NOT_ACQUIRED');
    expect(page).toContain('Federal covered adviser / notice filing');
    expect(page).toContain('Exempt reporting adviser (ERA)');
    expect(page).toContain('Investment adviser representative (IAR)');
    expect(page).toContain('Broker-dealer');
    expect(page).toContain('Agent');
    expect(page).toContain('Branch office');
    expect(page).toContain('Orders and enforcement');
    expect(page).toContain('IAPD');
    expect(page).toContain('BrokerCheck');
    expect(page).not.toContain('combined total: 0');
  });
});
