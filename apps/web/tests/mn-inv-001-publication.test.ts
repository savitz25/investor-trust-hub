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

const RANKING_REFUSAL =
  'InvestorTrustHub researches adviser regulatory records. It does not rank advisers, predict returns, price advice, or recommend investments or hiring decisions.';

describe('MN-INV-001R ranking refusal', () => {
  it('refuses ranking and recommendation queries before census or name search', () => {
    for (const q of [
      'best adviser Minnesota',
      'safest adviser Minnesota',
      'recommended adviser Minnesota',
      'recommended investment adviser Minnesota',
      'paid ranking Minnesota advisers',
      'sponsored ranking Minnesota advisers',
      'Trust Score Minnesota',
      'AggregateRating Minnesota adviser',
      'top-rated adviser Minnesota',
    ]) {
      const parsed = interpretInvestorAskQuery(q);
      expect(parsed.query.mode, q).toBe('fail_closed');
      expect(parsed.query.failReason, q).toBe(RANKING_REFUSAL);
      expect(parsed.query.failReason, q).not.toMatch(/333/);
      expect(parsed.query.nameQuery, q).toBeUndefined();
    }
  });

  it('still treats performance-based fees as Form ADV compensation, not a ranking', () => {
    const parsed = interpretInvestorAskQuery('firms reporting performance-based fees');
    expect(parsed.query.failReason ?? '').not.toBe(RANKING_REFUSAL);
    expect(parsed.query.compensationMethods).toContain('performance_based_fees');
  });
});

describe('MN-INV-001R Duluth and Rochester geography', () => {
  function place(q: string) {
    const parsed = interpretInvestorAskQuery(q);
    const geo = parsed.query.geography;
    const office = parsed.query.conditions?.find((c) => c.kind === 'office_state');
    const line = parsed.interpretation.find((l) => l.label === 'office state')?.value ?? '';
    const broaden =
      geo?.type === 'principal_office_city' && geo.state && !parsed.query.identifier && !parsed.query.registrationJurisdictions?.length
        ? geo.state
        : null;
    return { parsed, geo, office, line, broaden };
  }

  it('keeps Duluth, Minneapolis, St. Paul, and explicit Rochester on one state', () => {
    for (const [q, state] of [
      ['investment adviser Duluth', 'MN'],
      ['investment adviser Duluth Minnesota', 'MN'],
      ['investment adviser Duluth MN', 'MN'],
      ['investment adviser Minneapolis', 'MN'],
      ['investment adviser St. Paul', 'MN'],
      ['investment adviser Rochester Minnesota', 'MN'],
      ['investment adviser Rochester MN', 'MN'],
    ] as const) {
      const got = place(q);
      expect(got.parsed.query.mode, q).toBe('fail_closed');
      expect(got.parsed.query.failReason, q).toMatch(/city is geography/);
      expect(got.parsed.query.failReason, q).toMatch(/Minnesota/);
      expect(got.geo?.type, q).toBe('principal_office_city');
      expect(got.geo?.state, q).toBe(state);
      expect(got.office?.effective, q).toBe(state);
      expect(got.line, q).toContain(`${state} — APPLIED`);
      expect(got.line, q).not.toMatch(/GA — APPLIED/);
      expect(got.broaden, q).toBe(state);
    }
  });

  it('lets an explicit other state win, and does not turn Rochester New York into Minnesota', () => {
    for (const [q, state] of [
      ['investment adviser Duluth GA', 'GA'],
      ['investment adviser Duluth Georgia', 'GA'],
      ['Duluth GA investment adviser', 'GA'],
      ['investment adviser Rochester New York', 'NY'],
      ['investment adviser Rochester NY', 'NY'],
    ] as const) {
      const got = place(q);
      expect(got.geo?.state, q).toBe(state);
      expect(got.office?.effective, q).toBe(state);
      expect(got.line, q).toContain(`${state} — APPLIED`);
      expect(got.parsed.query.failReason ?? '', q).not.toMatch(/Minnesota city intelligence/);
      expect(got.broaden, q).toBe(state);
    }
    const bare = place('investment adviser Rochester');
    expect(bare.geo?.state).toBe('NY');
    expect(bare.parsed.query.failReason ?? '').not.toMatch(/Minnesota/);
  });
});

describe('MN-INV-001R page disclosures', () => {
  it('labels the five-CRD cross-clock overlap from the snapshot and keeps the lenses separate', () => {
    const ui = readFileSync('apps/web/src/components/mn-state-intel.tsx', 'utf8');
    expect(ui).toContain('overlapApprovedStateIa');
    expect(ui).toContain('overlapApprovedStateIaCrds');
    expect(ui).toMatch(/cross-clock/);
    expect(ui).toMatch(/not a deduped Minnesota adviser total/);
    expect(ui).toMatch(/Do not add state IA \+ ERA \+ notice \+ principal office/);
    expect(MN_PUBLIC_SNAPSHOT.federalNotice.overlapApprovedStateIa).toBe(5);
    expect(MN_PUBLIC_SNAPSHOT.federalNotice.overlapApprovedStateIaCrds).toEqual([
      '106604',
      '131425',
      '173350',
      '299012',
      '313361',
    ]);
    expect(MN_PUBLIC_SNAPSHOT.federalNotice.overlapCrossClock).toBe(true);
  });

  it('states that 42 of 43 order PDFs have no text layer and the remaining one was not read', () => {
    const ui = readFileSync('apps/web/src/components/mn-state-intel.tsx', 'utf8');
    expect(ui).toContain('orderDocumentsWithoutTextLayer');
    expect(ui).toMatch(/no usable text layer/);
    expect(ui).toMatch(/was not read/);
    expect(ui).toMatch(/OCR was not run/);
    expect(ui).not.toMatch(/scanned without a text layer/);
    const withText = MN_PUBLIC_SNAPSHOT.enforcement.actions.filter((a) => a.orderDocumentTextLayer);
    expect(MN_PUBLIC_SNAPSHOT.enforcement.orderDocumentsWithoutTextLayer).toBe(42);
    expect(MN_PUBLIC_SNAPSHOT.enforcement.rows).toBe(43);
    expect(withText.map((a) => a.document)).toEqual(['426525-A']);
  });
});
