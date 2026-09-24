import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GA_PUBLIC_SNAPSHOT, interpretInvestorAskQuery } from '@ith/domain';

describe('GA-INV-001 publication', () => {
  it('publishes /georgia without a local route or a ranking', () => {
    const page = readFileSync('apps/web/src/app/georgia/page.tsx', 'utf8');
    const ui = readFileSync('apps/web/src/components/ga-state-intel.tsx', 'utf8');
    const routes = readFileSync('packages/config/src/routes.ts', 'utf8');
    expect(existsSync('apps/web/src/app/georgia/page.tsx')).toBe(true);
    expect(existsSync('apps/web/src/app/georgia/atlanta')).toBe(false);
    expect(routes).toContain("href: '/georgia'");
    expect(page).toContain("path: '/georgia'");
    expect(ui).toMatch(/Trust Score/);
    expect(ui).not.toMatch(/best adviser|safest adviser/i);
    expect(ui).toMatch(/<h1 id="ga-title">/);
    expect(ui).toContain('aria-labelledby="ga-title"');
    expect(GA_PUBLIC_SNAPSHOT.route).toBe('/georgia');
    expect(GA_PUBLIC_SNAPSHOT.enforcement.index_rows).toBe(57);
  });

  it('keeps Georgia search grains separate', () => {
    const adviser = interpretInvestorAskQuery('investment adviser in Georgia');
    expect(adviser.query.mode).toBe('fail_closed');
    expect(adviser.query.failReason).toMatch(/364/);
    expect(adviser.query.failReason).not.toMatch(/state IA firms, IARs, broker-dealers, and agents were acquired/i);

    const broker = interpretInvestorAskQuery('broker-dealers in Georgia');
    expect(broker.query.mode).toBe('fail_closed');
    expect(broker.query.failReason).toMatch(/not an investment adviser/);

    const orders = interpretInvestorAskQuery('Georgia securities enforcement');
    expect(orders.query.failReason).toMatch(/57/);
    expect(orders.query.failReason).toMatch(/not findings/);

    const atlanta = interpretInvestorAskQuery('investment adviser Atlanta');
    expect(atlanta.query.failReason).toMatch(/not a separate securities regime/);

    const crd = interpretInvestorAskQuery('CRD 105958 Georgia');
    expect(crd.query.mode).toBe('identifier');

    const best = interpretInvestorAskQuery('best investment adviser in Georgia');
    expect(best.query.mode).toBe('fail_closed');
    expect(best.query.failReason).toMatch(/does not rank advisers/);
  });
});
