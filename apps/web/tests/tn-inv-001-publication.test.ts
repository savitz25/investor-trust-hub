import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TN_PUBLIC_SNAPSHOT, interpretInvestorAskQuery } from '@ith/domain';

const ask = (q: string) => interpretInvestorAskQuery(q).query;

describe('TN-INV-001 publication', () => {
  it('publishes /tennessee without a local route or a ranking', () => {
    const page = readFileSync('apps/web/src/app/tennessee/page.tsx', 'utf8');
    const ui = readFileSync('apps/web/src/components/tn-state-intel.tsx', 'utf8');
    const routes = readFileSync('packages/config/src/routes.ts', 'utf8');
    for (const city of ['nashville', 'memphis', 'knoxville', 'chattanooga']) {
      expect(existsSync(`apps/web/src/app/tennessee/${city}`)).toBe(false);
    }
    expect(routes).toContain("href: '/tennessee'");
    expect(page).toContain("path: '/tennessee'");
    expect(ui).toMatch(/Trust Score/);
    expect(ui).not.toMatch(/best adviser|safest|top broker|recommended adviser/i);
    expect(ui).not.toMatch(/aggregateRating|ratingValue/);
    expect(ui).toMatch(/<h1 id="tn-title">/);
    expect(ui).toMatch(/id="tn-consent-title"/);
    expect(ui).toMatch(/id="tn-cd-title"/);
    expect(TN_PUBLIC_SNAPSHOT.route).toBe('/tennessee');
  });

  it('answers each registration lens with its own denominator', () => {
    for (const q of ['investment adviser Tennessee', 'state registered adviser Tennessee', 'RIA Tennessee']) {
      const r = ask(q);
      expect(r.mode, q).toBe('fail_closed');
      expect(r.failReason, q).toMatch(/327 APPROVED Tennessee state-registered/);
      expect(r.failReason, q).toMatch(/Do not add the classes/);
    }
    for (const q of ['exempt reporting adviser Tennessee', 'ERA Tennessee']) {
      expect(ask(q).failReason, q).toMatch(/38 exempt reporting advisers/);
    }
    for (const q of ['SEC adviser Tennessee', 'Tennessee notice filing']) {
      expect(ask(q).failReason, q).toMatch(/2,685 SEC-registered advisers/);
    }
    expect(ask('investment advisers headquartered Tennessee').failReason).toMatch(/264 firms with a Tennessee principal office/);
    for (const q of ['investment adviser Nashville', 'investment adviser Memphis']) {
      expect(ask(q).failReason, q).toMatch(/city is geography/);
    }
    expect(ask('investment adviser representative Tennessee').failReason).toMatch(/person/);
    expect(ask('broker dealer Tennessee').failReason).toMatch(/BrokerCheck/);
    expect(ask('securities agent Tennessee').failReason).toMatch(/agent is a person/);
  });

  it('keeps Consent and Cease and Desist Orders distinct and exact identifiers first', () => {
    for (const q of [
      'Tennessee securities enforcement',
      'Tennessee Consent Order',
      'Tennessee Cease and Desist Order',
      'adviser discipline Tennessee',
    ]) {
      const r = ask(q);
      expect(r.failReason, q).toMatch(/273 Consent Order listings and 52 Cease and Desist Order listings/);
      expect(r.failReason, q).toMatch(/not one violation count/);
    }
    expect(ask('securities complaints Tennessee').failReason).toMatch(/not derived from the order archives/);
    expect(ask('CRD 105958 Tennessee').mode).toBe('identifier');
    expect(ask('SEC 801-12345 Tennessee').mode).toBe('identifier');
    const best = ask('best investment adviser in Tennessee');
    expect(best.mode).toBe('fail_closed');
    expect(best.failReason).not.toMatch(/327/);
    expect(ask('investment advisers Massachusetts').failReason).toMatch(/773 APPROVED Massachusetts/);
  });
});
