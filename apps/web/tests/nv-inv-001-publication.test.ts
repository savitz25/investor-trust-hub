import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NV_PUBLIC_SNAPSHOT, interpretInvestorAskQuery } from '@ith/domain';

const ask = (q: string) => interpretInvestorAskQuery(q).query;

describe('NV-INV-001 publication', () => {
  it('publishes /nevada with the ticket sections and without a local route or a ranking', () => {
    const page = readFileSync('apps/web/src/app/nevada/page.tsx', 'utf8');
    const ui = readFileSync('apps/web/src/components/nv-state-intel.tsx', 'utf8');
    const routes = readFileSync('packages/config/src/routes.ts', 'utf8');
    for (const city of ['las-vegas', 'reno', 'henderson', 'clark-county']) {
      expect(existsSync(`apps/web/src/app/nevada/${city}`)).toBe(false);
    }
    expect(routes).toContain("href: '/nevada'");
    expect(page).toContain("path: '/nevada'");
    for (const heading of [
      'State Investment Advisers',
      'ERA',
      'Federal Notice Filings',
      'Principal Office',
      'IAR / Broker-Dealer',
      'Securities Division',
      'Enforcement',
      'Complaints',
      'Limitations',
    ]) {
      expect(ui, heading).toContain(`">${heading}</h2>`);
    }
    expect(ui).toMatch(/Trust Score/);
    expect(ui).not.toMatch(/best adviser|safest|top broker|recommended adviser/i);
    expect(ui).not.toMatch(/aggregateRating|ratingValue/);
    expect(NV_PUBLIC_SNAPSHOT.route).toBe('/nevada');
  });

  it('answers each registration lens with its own denominator', () => {
    for (const q of ['investment adviser Nevada', 'RIA Nevada', 'state registered investment adviser Nevada']) {
      const r = ask(q);
      expect(r.mode, q).toBe('fail_closed');
      expect(r.failReason, q).toMatch(/271 APPROVED Nevada state investment-adviser/);
      expect(r.failReason, q).toMatch(/Do not add the classes/);
    }
    expect(ask('exempt reporting adviser Nevada').failReason).toMatch(/83 exempt reporting advisers/);
    for (const q of ['SEC adviser Nevada', 'Nevada notice filing']) {
      expect(ask(q).failReason, q).toMatch(/1,982 SEC-registered advisers/);
    }
    expect(ask('investment advisers headquartered Nevada').failReason).toMatch(/99 firms with a Nevada principal office/);
    expect(ask('investment adviser representative Nevada').failReason).toMatch(/person/);
    expect(ask('broker dealer Nevada').failReason).toMatch(/BrokerCheck/);
    expect(ask('securities representative Nevada').failReason).toMatch(/sales representative is a person/);
  });

  it('keeps enforcement honest, cities as geography and identifiers first', () => {
    for (const q of ['Nevada securities enforcement', 'Nevada investment adviser discipline', 'Nevada securities order']) {
      const r = ask(q);
      expect(r.mode, q).toBe('fail_closed');
      expect(r.failReason, q).toMatch(/no Nevada order listing was acquired/);
      expect(r.failReason, q).toMatch(/Other Nevada regulators are not substituted/);
    }
    expect(ask('securities complaints Nevada').failReason).toMatch(/complaint is not an enforcement order/);
    for (const q of ['investment adviser Las Vegas', 'investment adviser Reno', 'investment adviser Henderson']) {
      expect(ask(q).failReason, q).toMatch(/city is geography/);
    }
    expect(ask('investment adviser Henderson Kentucky').failReason ?? '').not.toMatch(/Nevada/);
    expect(ask('CRD 105958 Nevada').mode).toBe('identifier');
    expect(ask('SEC 801-12345 Nevada').mode).toBe('identifier');
    const best = ask('best investment adviser Nevada');
    expect(best.mode).toBe('fail_closed');
    expect(best.failReason).not.toMatch(/271/);
    expect(ask('investment adviser Tennessee').failReason).toMatch(/327 APPROVED Tennessee/);
  });
});
