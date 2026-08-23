import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  FAIL_CLOSED_INVESTMENT_PRODUCT_QUERIES,
  buildAskBackLabel,
  buildAskFirmsHref,
  buildCanonicalFirmProfileUrl,
  filterDiscoveryEntitiesForAsk,
  firmHrefWithAskContext,
  parseInvestorAskSearchContext,
  parseFirmSearchInput,
  physicalCityMatches,
  physicalZipMatches,
  resolveAskHandoffDestination,
  serializeAskSearchContext,
  sortAskFirmResultsByName,
  type InvestorDiscoveryEntity,
} from '../src';

function loadPilotEntities(): InvestorDiscoveryEntity[] {
  const path = resolve(__dirname, '../../../data/network-discovery/investor-discovery-pilot.v1.json');
  const json = JSON.parse(readFileSync(path, 'utf8')) as {
    entities: InvestorDiscoveryEntity[];
  };
  return json.entities;
}

describe('ASK-SEARCH-INVESTOR-002 ask handoff', () => {
  it('requires src=ask and ignores forbidden PII/query keys', () => {
    expect(parseInvestorAskSearchContext({})).toBeNull();
    expect(parseInvestorAskSearchContext({ src: 'move' })).toBeNull();

    const ok = parseInvestorAskSearchContext({
      src: 'ask',
      entity: 'ria',
      state: 'FL',
      city: 'Boca Raton',
      zip: '33431',
      journey: 'directory',
      sid: 'abc123',
      query: 'SHOULD_IGNORE',
      q: 'also ignore',
      email: 'x@y.com',
      phone: '555',
      name: 'Jane',
      ssn: '123',
      portfolio: 'secret',
      next: 'https://evil.com',
      redirect: '//evil.com',
      returnUrl: 'https://evil.example',
    });
    expect(ok?.source).toBe('ask');
    expect(ok?.entityType).toBe('ria');
    expect(ok?.state).toBe('FL');
    expect(ok?.city).toBe('boca-raton');
    expect(ok?.zip).toBe('33431');
    expect((ok as { query?: string }).query).toBeUndefined();
    const ser = serializeAskSearchContext(ok!);
    expect(ser).not.toContain('evil');
    expect(ser).not.toContain('email');
    expect(ser).not.toContain('q=');
    expect(ser).not.toContain('query');
  });

  it('rejects XSS / path injection / malformed values safely', () => {
    expect(parseInvestorAskSearchContext({ src: 'ask', state: 'XX' })?.state).toBeUndefined();
    expect(parseInvestorAskSearchContext({ src: 'ask', zip: 'abc' })?.zip).toBeUndefined();
    expect(parseInvestorAskSearchContext({ src: 'ask', city: '<script>alert(1)</script>' })?.city).toBeUndefined();
    expect(parseInvestorAskSearchContext({ src: 'ask', city: '../../etc' })?.city).toBeUndefined();
    expect(
      parseInvestorAskSearchContext({ src: 'ask', entity: 'javascript:alert(1)' })?.unsupported
    ).toBe('ambiguous_entity');
    expect(
      parseInvestorAskSearchContext({ src: 'ask', category: '../../' })?.unsupported
    ).toBe('ambiguous_entity');
    const sid = parseInvestorAskSearchContext({ src: 'ask', sid: '<img onerror=1>' });
    expect(sid?.sid).toBeUndefined();
    const dest = resolveAskHandoffDestination(
      parseInvestorAskSearchContext({ src: 'ask', entity: 'ria', state: 'FL' })!
    );
    expect(dest.href.startsWith('/')).toBe(true);
    expect(dest.href).not.toContain('://');
  });

  it('fail-closes investment products and investment_company', () => {
    for (const label of FAIL_CLOSED_INVESTMENT_PRODUCT_QUERIES) {
      void label;
    }
    expect(
      parseInvestorAskSearchContext({ src: 'ask', entity: 'stock' })?.unsupported
    ).toBe('investment_product');
    expect(
      parseInvestorAskSearchContext({ src: 'ask', entity: 'etf' })?.unsupported
    ).toBe('investment_product');
    expect(
      parseInvestorAskSearchContext({ src: 'ask', entity: 'crypto' })?.unsupported
    ).toBe('investment_product');
    expect(
      parseInvestorAskSearchContext({ src: 'ask', entity: 'hedge_fund' })?.unsupported
    ).toBe('investment_product');
    expect(
      parseInvestorAskSearchContext({ src: 'ask', entity: 'lender' })?.unsupported
    ).toBe('investment_product');
    expect(
      parseInvestorAskSearchContext({ src: 'ask', entity: 'mutual_fund' })?.unsupported
    ).toBe('investment_product');
    expect(
      parseInvestorAskSearchContext({ src: 'ask', entity: 'investment_company' })?.unsupported
    ).toBe('investment_product');
    expect(
      resolveAskHandoffDestination(
        parseInvestorAskSearchContext({ src: 'ask', entity: 'investment_company' })!
      ).kind
    ).toBe('unsupported');
  });

  it('drops county (unsupported — never fabricates)', () => {
    const ctx = parseInvestorAskSearchContext({
      src: 'ask',
      entity: 'ria',
      state: 'FL',
      county: 'palm-beach',
    });
    expect(ctx?.county).toBeUndefined();
    expect(serializeAskSearchContext(ctx!)).not.toContain('county');
  });

  it('builds View More /firms href without free-text q', () => {
    const dest = resolveAskHandoffDestination(
      parseInvestorAskSearchContext({
        src: 'ask',
        entity: 'ria',
        state: 'FL',
        city: 'boca-raton',
      })!
    );
    expect(dest.kind).toBe('firms');
    expect(dest.href).toContain('/firms?');
    expect(dest.href).toContain('src=ask');
    expect(dest.href).toContain('entity=ria');
    expect(dest.href).toContain('state=FL');
    expect(dest.href).toContain('city=boca-raton');
    expect(dest.href).not.toContain('q=');
  });

  it('preserves RIA ≠ ERA hard separation on pilot cohort', () => {
    const entities = loadPilotEntities();
    const riaBoca = filterDiscoveryEntitiesForAsk(
      entities,
      parseInvestorAskSearchContext({
        src: 'ask',
        entity: 'ria',
        state: 'FL',
        city: 'boca-raton',
      })!
    );
    expect(riaBoca.length).toBeGreaterThan(0);
    expect(riaBoca.every((e) => e.entity_type === 'ria')).toBe(true);
    expect(riaBoca.every((e) => physicalCityMatches(e.city, 'boca-raton'))).toBe(true);
    expect(riaBoca.every((e) => e.state === 'FL')).toBe(true);

    const flRia = filterDiscoveryEntitiesForAsk(
      entities,
      parseInvestorAskSearchContext({ src: 'ask', entity: 'ria', state: 'FL' })!
    );
    expect(flRia.every((e) => e.entity_type === 'ria')).toBe(true);
    expect(flRia.some((e) => e.entity_type === 'era')).toBe(false);

    const eraNy = filterDiscoveryEntitiesForAsk(
      entities,
      parseInvestorAskSearchContext({ src: 'ask', entity: 'era', state: 'NY' })!
    );
    expect(eraNy.every((e) => e.entity_type === 'era')).toBe(true);
    expect(eraNy.some((e) => e.entity_type === 'ria')).toBe(false);

    const austin = filterDiscoveryEntitiesForAsk(
      entities,
      parseInvestorAskSearchContext({
        src: 'ask',
        entity: 'ria',
        state: 'TX',
        city: 'austin',
      })!
    );
    expect(austin.every((e) => e.entity_type === 'ria')).toBe(true);
    expect(austin.every((e) => physicalCityMatches(e.city, 'austin'))).toBe(true);

    const nj = filterDiscoveryEntitiesForAsk(
      entities,
      parseInvestorAskSearchContext({
        src: 'ask',
        category: 'investment_adviser',
        state: 'NJ',
      })!
    );
    expect(nj.every((e) => e.state === 'NJ')).toBe(true);

    const miami = filterDiscoveryEntitiesForAsk(
      entities,
      parseInvestorAskSearchContext({
        src: 'ask',
        category: 'advisory_firm',
        state: 'FL',
        city: 'miami',
      })!
    );
    expect(miami.every((e) => physicalCityMatches(e.city, 'miami'))).toBe(true);
    // Broad search may include ria or era — status remains accurate per row
    for (const e of miami) {
      expect(['ria', 'era']).toContain(e.entity_type);
    }
  });

  it('does not treat FL registration as Boca Raton (physical only)', () => {
    const entities = loadPilotEntities();
    const flOnly = filterDiscoveryEntitiesForAsk(
      entities,
      parseInvestorAskSearchContext({ src: 'ask', entity: 'ria', state: 'FL' })!
    );
    const orlandoLike = flOnly.filter((e) => !physicalCityMatches(e.city, 'boca-raton'));
    expect(orlandoLike.length).toBeGreaterThan(0);
    const boca = filterDiscoveryEntitiesForAsk(
      entities,
      parseInvestorAskSearchContext({
        src: 'ask',
        entity: 'ria',
        state: 'FL',
        city: 'boca-raton',
      })!
    );
    expect(boca.every((e) => physicalCityMatches(e.city, 'boca-raton'))).toBe(true);
    expect(boca.length).toBeLessThan(flOnly.length);
  });

  it('ZIP is principal-office exact only', () => {
    expect(physicalZipMatches('33431-1234', '33431')).toBe(true);
    expect(physicalZipMatches('10001', '33431')).toBe(false);
    const entities = loadPilotEntities();
    const withZip = entities.find((e) => e.zip);
    expect(withZip).toBeTruthy();
    const matched = filterDiscoveryEntitiesForAsk(
      entities,
      parseInvestorAskSearchContext({
        src: 'ask',
        zip: withZip!.zip!,
        state: withZip!.state,
      })!
    );
    expect(matched.every((e) => physicalZipMatches(e.zip, withZip!.zip))).toBe(true);
  });

  it('Back to Results labels and firm href retain Ask context; canonical CRD URL clean', () => {
    const ctx = parseInvestorAskSearchContext({
      src: 'ask',
      entity: 'ria',
      state: 'FL',
      city: 'boca-raton',
    })!;
    expect(buildAskBackLabel(ctx)).toMatch(/RIAs/i);
    expect(buildAskBackLabel(ctx)).toMatch(/Boca Raton/i);
    expect(buildAskBackLabel(ctx)).toMatch(/Florida/i);
    expect(buildAskFirmsHref(ctx)).toContain('src=ask');
    const href = firmHrefWithAskContext('sec-crd-110819', ctx);
    expect(href.startsWith('/firm/sec-crd-110819?')).toBe(true);
    expect(href).toContain('src=ask');
    expect(buildCanonicalFirmProfileUrl('110819')).toBe(
      'https://www.investortrusthub.com/firm/sec-crd-110819'
    );
    expect(buildAskBackLabel({ source: 'ask', entityType: 'era', state: 'NY' })).toMatch(/ERAs/i);
    expect(
      buildAskBackLabel({ source: 'ask', category: 'investment_adviser', state: 'NJ' })
    ).toMatch(/investment advisers/i);
  });

  it('parseFirmSearchInput ignores q when src=ask and forces indexableOnly', () => {
    const parsed = parseFirmSearchInput({
      src: 'ask',
      entity: 'ria',
      state: 'FL',
      city: 'miami',
      q: 'SHOULD_NOT_APPLY',
    });
    expect(parsed.fromAsk).toBe(true);
    expect(parsed.q).toBe('');
    expect(parsed.indexableOnly).toBe(true);
    expect(parsed.entityType).toBe('ria');
    expect(parsed.city).toBe('miami');
  });

  it('ordinary firm search unchanged without src=ask', () => {
    const parsed = parseFirmSearchInput({ q: 'Vanguard', state: 'PA' });
    expect(parsed.fromAsk).toBe(false);
    expect(parsed.indexableOnly).toBe(false);
    expect(parsed.q.toLowerCase()).toContain('vanguard');
    expect(parsed.state).toBe('PA');
  });

  it('sortAskFirmResultsByName ignores RAUM-like fields', () => {
    const sorted = sortAskFirmResultsByName([
      { display_name: 'Zeta', raum: 999 },
      { display_name: 'Alpha', raum: 1 },
    ] as Array<{ display_name: string; raum: number }>);
    expect(sorted.map((r) => r.display_name)).toEqual(['Alpha', 'Zeta']);
  });

  it('held/ineligible discovery rows never pass Ask filter', () => {
    const held: InvestorDiscoveryEntity = {
      network_entity_id: 'investor:crd-1',
      hub: 'investor',
      source_entity_id: 'crd-1',
      entity_type: 'ria',
      display_name: 'Held Firm',
      city: 'Miami',
      state: 'FL',
      trust_report_available: false,
      canonical_profile_url: 'https://www.investortrusthub.com/firm/sec-crd-1',
      discovery_status: 'held',
    };
    const out = filterDiscoveryEntitiesForAsk([held], {
      source: 'ask',
      entityType: 'ria',
      state: 'FL',
    });
    expect(out).toEqual([]);
  });
});
