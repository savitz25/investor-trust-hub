import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MN_PUBLIC_SNAPSHOT, interpretInvestorAskQuery } from '@ith/domain';

const ask = (q: string) => interpretInvestorAskQuery(q).query;

describe('MN-INV-001 publication', () => {
  it('publishes /minnesota with the ticket sections and without a local route or a ranking', () => {
    const page = readFileSync('apps/web/src/app/minnesota/page.tsx', 'utf8');
    const ui = readFileSync('apps/web/src/components/mn-state-intel.tsx', 'utf8');
    const routes = readFileSync('packages/config/src/routes.ts', 'utf8');
    for (const city of ['minneapolis', 'st-paul', 'saint-paul', 'rochester', 'duluth', 'hennepin-county']) {
      expect(existsSync(`apps/web/src/app/minnesota/${city}`)).toBe(false);
    }
    expect(routes).toContain("href: '/minnesota'");
    expect(page).toContain("path: '/minnesota'");
    for (const heading of [
      'Minnesota State Investment Advisers',
      'Exempt Reporting Advisers',
      'Federal Notice Filings',
      'Principal Office',
      'IAR',
      'Broker-Dealers / Agents',
      'Minnesota Commerce Securities Unit',
      'Enforcement',
      'Complaints',
      'Limitations',
    ]) {
      expect(ui, heading).toContain(`">${heading}</h2>`);
    }
    expect(ui).toMatch(/Trust Score/);
    expect(ui).not.toMatch(/best adviser|safest|top broker|recommended adviser/i);
    expect(ui).not.toMatch(/aggregateRating|ratingValue/);
    expect(MN_PUBLIC_SNAPSHOT.route).toBe('/minnesota');
  });

  it('answers each registration lens with its own denominator', () => {
    for (const q of ['investment adviser Minnesota', 'RIA Minnesota', 'state registered investment adviser Minnesota']) {
      const r = ask(q);
      expect(r.mode, q).toBe('fail_closed');
      expect(r.failReason, q).toMatch(/333 APPROVED Minnesota state investment-adviser/);
      expect(r.failReason, q).toMatch(/Do not add the classes/);
    }
    expect(ask('exempt reporting adviser Minnesota').failReason).toMatch(/53 exempt reporting advisers/);
    for (const q of ['SEC adviser Minnesota', 'Minnesota notice filing']) {
      expect(ask(q).failReason, q).toMatch(/2,075 SEC-registered advisers/);
    }
    expect(ask('investment advisers headquartered Minnesota').failReason).toMatch(/293 firms with a Minnesota principal office/);
    expect(ask('investment adviser representative Minnesota').failReason).toMatch(/is a person/);
    expect(ask('broker dealer Minnesota').failReason).toMatch(/BrokerCheck/);
    expect(ask('securities agent Minnesota').failReason).toMatch(/an agent is a person/);
  });

  it('answers enforcement from CARDS, keeps cities as geography and identifiers first', () => {
    for (const q of ['Minnesota securities enforcement', 'investment adviser discipline Minnesota', 'broker dealer enforcement Minnesota']) {
      const r = ask(q);
      expect(r.mode, q).toBe('fail_closed');
      expect(r.failReason, q).toMatch(/43 actions under the Securities industry type/);
      expect(r.failReason, q).toMatch(/nothing is attached to a firm or person by name/);
    }
    expect(ask('securities complaints Minnesota').failReason).toMatch(/A complaint is not an order/);
    for (const q of ['investment adviser Minneapolis', 'investment adviser St Paul', 'investment adviser Rochester Minnesota', 'investment adviser Duluth']) {
      expect(ask(q).failReason, q).toMatch(/city is geography/);
    }
    expect(ask('investment adviser Rochester New York').failReason ?? '').not.toMatch(/Minnesota/);
    expect(ask('investment adviser Rochester').failReason ?? '').not.toMatch(/Minnesota/);
    expect(ask('CRD 105958 Minnesota').mode).toBe('identifier');
    expect(ask('SEC 801-12345 Minnesota').mode).toBe('identifier');
    const best = ask('best investment adviser Minnesota');
    expect(best.mode).toBe('fail_closed');
    expect(best.failReason).not.toMatch(/333/);
    expect(ask('investment adviser Nevada').failReason).toMatch(/271 APPROVED Nevada/);
    expect(ask('investment adviser Tennessee').failReason).toMatch(/327 APPROVED Tennessee/);
  });
});
