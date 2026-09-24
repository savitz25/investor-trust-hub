import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MA_PUBLIC_SNAPSHOT, interpretInvestorAskQuery } from '@ith/domain';

const ask = (q: string) => interpretInvestorAskQuery(q).query;

describe('MA-INV-001 publication', () => {
  it('publishes /massachusetts without a local route or a ranking', () => {
    const page = readFileSync('apps/web/src/app/massachusetts/page.tsx', 'utf8');
    const ui = readFileSync('apps/web/src/components/ma-state-intel.tsx', 'utf8');
    const routes = readFileSync('packages/config/src/routes.ts', 'utf8');
    expect(existsSync('apps/web/src/app/massachusetts/boston')).toBe(false);
    expect(existsSync('apps/web/src/app/massachusetts/worcester')).toBe(false);
    expect(routes).toContain("href: '/massachusetts'");
    expect(page).toContain("path: '/massachusetts'");
    expect(ui).toMatch(/Trust Score/);
    expect(ui).not.toMatch(/best adviser|safest adviser|top broker/i);
    expect(ui).not.toMatch(/aggregateRating|ratingValue/);
    expect(ui).toMatch(/<h1 id="ma-title">/);
    expect(ui).toContain('aria-labelledby="ma-title"');
    expect(ui).toMatch(/not a finding/);
    expect(MA_PUBLIC_SNAPSHOT.route).toBe('/massachusetts');
  });

  it('answers each registration lens with its own denominator', () => {
    for (const q of [
      'investment advisers Massachusetts',
      'state registered investment advisers Massachusetts',
      'registered investment adviser Massachusetts',
      'RIA Massachusetts',
    ]) {
      const r = ask(q);
      expect(r.mode).toBe('fail_closed');
      expect(r.failReason).toMatch(/773 APPROVED Massachusetts state-registered/);
      expect(r.failReason).toMatch(/Do not add the classes/);
    }
    expect(ask('ERA Massachusetts').failReason).toMatch(/351 exempt reporting advisers/);
    expect(ask('Massachusetts notice filing advisers').failReason).toMatch(/3,272 SEC-registered advisers/);
    expect(ask('advisers headquartered Massachusetts').failReason).toMatch(/803 firms with a Massachusetts principal office/);
    expect(ask('investment adviser representative Massachusetts').failReason).toMatch(/person/);
    expect(ask('IAR Massachusetts').failReason).toMatch(/not a firm/);
    for (const q of ['broker dealer Massachusetts', 'broker Massachusetts', 'securities agent Massachusetts']) {
      expect(ask(q).failReason).toMatch(/BrokerCheck/);
    }
  });

  it('keeps complaints, orders and exact identifiers distinct', () => {
    for (const q of [
      'Massachusetts securities enforcement',
      'Massachusetts adviser enforcement',
      'Securities Division consent orders Massachusetts',
      'securities complaints Massachusetts',
    ]) {
      const r = ask(q);
      expect(r.failReason).toMatch(/144 announcements/);
      expect(r.failReason).toMatch(/not a finding/);
      expect(r.failReason).toMatch(/before 2012/);
    }
    expect(ask('CRD 105958 Massachusetts').mode).toBe('identifier');
    expect(ask('SEC 801-12345 Massachusetts').mode).toBe('identifier');
    expect(ask('investment adviser Boston').failReason).toMatch(/not a separate securities regime/);
    expect(ask('investment adviser Worcester').failReason).toMatch(/Boston or Worcester/);
    const best = ask('best investment adviser in Massachusetts');
    expect(best.mode).toBe('fail_closed');
    expect(best.failReason).not.toMatch(/773/);
  });
});
