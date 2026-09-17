import { describe, expect, it } from 'vitest';
import { interpretInvestorAskQuery } from '../src/investor-ask';

/**
 * TH-DISCOVERY-PARITY-001B regression corpus.
 *
 * A production audit against investortrusthub.com found that the direct /ask specialist only
 * resolved geography when a US state name/code was spelled out literally in the question (e.g.
 * "... Boulder Colorado"). A city or county named with no state word either dead-ended on a
 * "needs clarification" question for an ordinary, well-populated market, or -- far worse --
 * silently classified the question as firm discovery with NO office-state filter attached,
 * returning the entire unfiltered ~23,622-row national firm_facts roster as if it were a normal,
 * local answer (verified identical for "financial advisor near Fort Worth", "investment adviser
 * Jersey City", and "financial advisors Palm Beach County" -- same byte-for-byte nationwide dump,
 * no disclosure that the location match failed).
 *
 * The fix is a general US city/county/metro -> state gazetteer (packages/domain/src/us-geography.ts)
 * wired into the interpreter (packages/domain/src/investor-research-plan.ts and
 * packages/domain/src/investor-ask.ts), plus a mandatory structural gate: whenever the question
 * used location language, the interpreter must either resolve it (city, or an honestly disclosed
 * broadening to state) or fail closed and say so -- it must never fall through to an unfiltered
 * "firm discovery" result.
 *
 * Every query below is a fresh phrasing, distinct from the exact strings in the production audit,
 * chosen to exercise the same shapes (state spelled out vs. not; city vs. county vs. metro;
 * in/near/around/no-preposition; singular/plural) across FL, NJ, TX, WA, CA, and CO.
 */

function expectNeverUnfilteredNationalDump(query: string) {
  const parsed = interpretInvestorAskQuery(query);
  const q = parsed.query;
  // The dangerous pattern this ticket closes: an "entity"/discovery-shaped result with a firm
  // type attached and NO geography filter, silently standing in for "the whole database".
  const looksLikeSilentNationalDump =
    q.mode === 'entity' && !!q.firmType && !q.geography && !q.nameQuery && !q.identifier;
  expect(looksLikeSilentNationalDump, `${query} must not silently serve an unfiltered national roster`).toBe(false);
  return parsed;
}

describe('TH-DISCOVERY-PARITY-001B: general city/county/state geography resolution', () => {
  describe('Florida', () => {
    it('resolves a bare city with a preposition and no state ("in Orlando")', () => {
      const parsed = expectNeverUnfilteredNationalDump('financial adviser in Orlando');
      expect(parsed.query.mode).toBe('entity');
      expect(parsed.query.firmType).toBe('all');
      expect(parsed.query.geography?.type).toBe('principal_office_city');
      expect(parsed.query.geography?.value).toBe('Orlando');
      expect(parsed.query.geography?.state).toBe('FL');
    });

    it('resolves a bare plural city with no preposition and no state ("Tampa")', () => {
      const parsed = expectNeverUnfilteredNationalDump('financial advisers Tampa');
      expect(parsed.query.firmType).toBe('all');
      expect(parsed.query.geography?.value).toBe('Tampa');
      expect(parsed.query.geography?.state).toBe('FL');
    });

    it('broadens a county with no state to state level, honestly disclosed ("Miami-Dade County")', () => {
      const parsed = expectNeverUnfilteredNationalDump('wealth management firms in Miami-Dade County');
      expect(parsed.query.geography?.type).toBe('principal_office_state');
      expect(parsed.query.geography?.value).toBe('FL');
      expect(parsed.query.geography?.meaning).toMatch(/county/i);
      expect(parsed.query.geography?.meaning).toMatch(/not established by this source/i);
    });

    it('broadens "around <city>, <state spelled out>" to state level, not city, and discloses why', () => {
      const parsed = expectNeverUnfilteredNationalDump('advisory firm around Jacksonville Florida');
      expect(parsed.query.geography?.type).toBe('principal_office_state');
      expect(parsed.query.geography?.value).toBe('FL');
      expect(parsed.query.geography?.meaning).toMatch(/cannot establish distance/i);
    });

    it('broadens a bare plural county with no preposition and no state ("Broward County")', () => {
      const parsed = expectNeverUnfilteredNationalDump('financial advisors Broward County');
      expect(parsed.query.geography?.value).toBe('FL');
      expect(parsed.query.geography?.type).toBe('principal_office_state');
    });

    it('broadens an informal FL metro/region name with no state ("South Florida")', () => {
      const parsed = expectNeverUnfilteredNationalDump('financial planning firm South Florida');
      expect(parsed.query.geography?.type).toBe('principal_office_state');
      expect(parsed.query.geography?.value).toBe('FL');
      expect(parsed.query.geography?.meaning).toMatch(/regional\/metro name/i);
    });
  });

  describe('New Jersey', () => {
    it('resolves city + state spelled out, plural, no preposition ("Newark New Jersey")', () => {
      const parsed = expectNeverUnfilteredNationalDump('investment advisers Newark New Jersey');
      expect(parsed.query.geography?.type).toBe('principal_office_city');
      expect(parsed.query.geography?.value).toBe('Newark');
      expect(parsed.query.geography?.state).toBe('NJ');
    });

    it('resolves "in <city>" singular with no state ("Hoboken")', () => {
      const parsed = expectNeverUnfilteredNationalDump('financial planner in Hoboken');
      expect(parsed.query.firmType).toBe('all');
      expect(parsed.query.geography?.value).toBe('Hoboken');
      expect(parsed.query.geography?.state).toBe('NJ');
    });

    it('broadens "near <county>" with no state ("Bergen County")', () => {
      const parsed = expectNeverUnfilteredNationalDump('wealth managers near Bergen County');
      expect(parsed.query.geography?.type).toBe('principal_office_state');
      expect(parsed.query.geography?.value).toBe('NJ');
    });
  });

  describe('Texas', () => {
    it('resolves a bare singular city with no preposition and no state ("Austin")', () => {
      const parsed = expectNeverUnfilteredNationalDump('financial adviser Austin');
      expect(parsed.query.geography?.type).toBe('principal_office_city');
      expect(parsed.query.geography?.value).toBe('Austin');
      expect(parsed.query.geography?.state).toBe('TX');
    });

    it('broadens "around <city>, <state spelled out>" to state level ("Houston Texas")', () => {
      const parsed = expectNeverUnfilteredNationalDump('investment advisers around Houston Texas');
      expect(parsed.query.geography?.type).toBe('principal_office_state');
      expect(parsed.query.geography?.value).toBe('TX');
    });

    it('broadens "in <county>" with no state ("Travis County")', () => {
      const parsed = expectNeverUnfilteredNationalDump('advisory firms in Travis County');
      expect(parsed.query.geography?.value).toBe('TX');
      expect(parsed.query.geography?.type).toBe('principal_office_state');
    });

    // Direct regression for the exact release-blocking DANGEROUS pattern (fresh city, same shape
    // as "financial advisor near Fort Worth"): a "near <city>" question with no state spelled out
    // must resolve to a state filter, never fall through to an unfiltered national roster.
    it('DANGEROUS-shape regression: "near <city>" with no state never serves an unfiltered roster', () => {
      const parsed = expectNeverUnfilteredNationalDump('financial advisor near El Paso');
      expect(parsed.query.mode).toBe('entity');
      expect(parsed.query.geography?.value).toBe('TX');
    });
  });

  describe('Washington', () => {
    it('broadens "near <city>" with no state ("Spokane")', () => {
      const parsed = expectNeverUnfilteredNationalDump('financial advisor near Spokane');
      expect(parsed.query.geography?.type).toBe('principal_office_state');
      expect(parsed.query.geography?.value).toBe('WA');
    });

    it('resolves city + state spelled out, no preposition ("Bellevue Washington")', () => {
      const parsed = expectNeverUnfilteredNationalDump('wealth management firm Bellevue Washington');
      expect(parsed.query.geography?.type).toBe('principal_office_city');
      expect(parsed.query.geography?.value).toBe('Bellevue');
      expect(parsed.query.geography?.state).toBe('WA');
    });

    it('broadens a bare plural county with no preposition and no state ("King County")', () => {
      const parsed = expectNeverUnfilteredNationalDump('financial planners King County');
      expect(parsed.query.geography?.value).toBe('WA');
      expect(parsed.query.geography?.type).toBe('principal_office_state');
    });
  });

  describe('California', () => {
    it('resolves a bare singular city with no preposition and no state ("San Diego")', () => {
      const parsed = expectNeverUnfilteredNationalDump('investment adviser San Diego');
      expect(parsed.query.geography?.type).toBe('principal_office_city');
      expect(parsed.query.geography?.value).toBe('San Diego');
      expect(parsed.query.geography?.state).toBe('CA');
    });

    it('broadens "around <city>, <state spelled out>" ("Fresno California")', () => {
      const parsed = expectNeverUnfilteredNationalDump('financial advisers around Fresno California');
      expect(parsed.query.geography?.type).toBe('principal_office_state');
      expect(parsed.query.geography?.value).toBe('CA');
    });

    it('broadens "in <county>" with no state ("Santa Clara County")', () => {
      const parsed = expectNeverUnfilteredNationalDump('advisory firms in Santa Clara County');
      expect(parsed.query.geography?.value).toBe('CA');
      expect(parsed.query.geography?.type).toBe('principal_office_state');
    });

    it('broadens an informal metro/region name with no state ("Bay Area")', () => {
      const parsed = expectNeverUnfilteredNationalDump('financial advisers Bay Area');
      expect(parsed.query.geography?.type).toBe('principal_office_state');
      expect(parsed.query.geography?.value).toBe('CA');
      expect(parsed.query.geography?.meaning).toMatch(/regional\/metro name/i);
    });

    // DANGEROUS-shape regression, fresh city, same shape as "investment adviser Jersey City":
    // a bare city with NO preposition and NO state must resolve to a filtered, city-level answer,
    // never an unfiltered national roster.
    it('DANGEROUS-shape regression: bare city, no preposition, no state never serves an unfiltered roster', () => {
      const parsed = expectNeverUnfilteredNationalDump('wealth management firm Long Beach');
      expect(parsed.query.mode).toBe('entity');
      expect(parsed.query.geography?.state).toBe('CA');
    });
  });

  describe('Colorado', () => {
    it('resolves city + state spelled out, no preposition ("Fort Collins Colorado")', () => {
      const parsed = expectNeverUnfilteredNationalDump('investment adviser firms Fort Collins Colorado');
      expect(parsed.query.geography?.type).toBe('principal_office_city');
      expect(parsed.query.geography?.value).toBe('Fort Collins');
      expect(parsed.query.geography?.state).toBe('CO');
    });

    it('broadens an ambiguous city name with "around" and discloses both the ambiguity and the radius broadening ("Aurora")', () => {
      const parsed = expectNeverUnfilteredNationalDump('wealth advisor around Aurora');
      expect(parsed.query.geography?.type).toBe('principal_office_state');
      expect(parsed.query.geography?.value).toBe('CO');
      expect(parsed.query.geography?.ambiguous).toBe(true);
      expect(parsed.query.geography?.meaning).toMatch(/more than one state/i);
      expect(parsed.query.geography?.meaning).toMatch(/cannot establish distance/i);
    });

    it('broadens a county with the state also spelled out ("Weld County Colorado")', () => {
      const parsed = expectNeverUnfilteredNationalDump('financial planner Weld County Colorado');
      expect(parsed.query.geography?.value).toBe('CO');
      expect(parsed.query.geography?.type).toBe('principal_office_state');
    });
  });

  describe('unresolvable places fail closed instead of defaulting to an unfiltered roster', () => {
    it('a nonexistent place named with "in" fails closed and names the unresolved place', () => {
      const parsed = interpretInvestorAskQuery('financial adviser in Zzyzxville');
      expect(parsed.query.mode).toBe('fail_closed');
      expect(parsed.query.failReason).toMatch(/zzyzxville/i);
      expect(parsed.query.failReason).toMatch(/not.*substituted/i);
    });

    it('a nonexistent place named with "near" fails closed and names the unresolved place', () => {
      const parsed = interpretInvestorAskQuery('wealth management firm near Blorptown');
      expect(parsed.query.mode).toBe('fail_closed');
      expect(parsed.query.failReason).toMatch(/blorptown/i);
    });
  });

  describe('ordinary provider-category synonyms enter discovery generally, not via a literal allowlist', () => {
    const synonymQueries: Array<[string, string]> = [
      ['financial adviser', 'singular "financial adviser"'],
      ['financial advisors', 'plural "financial advisors"'],
      ['investment adviser', 'singular "investment adviser"'],
      ['investment advisors', 'plural "investment advisors"'],
      ['wealth management firm', '"wealth management firm"'],
      ['wealth management firms', 'plural "wealth management firms"'],
      ['advisory firm', '"advisory firm"'],
      ['financial planning firm', '"financial planning firm"'],
      ['financial planner', '"financial planner"'],
      ['wealth manager', '"wealth manager"'],
    ];
    for (const [q, label] of synonymQueries) {
      it(`recognises ${label} as discovery, not a clarification dead end`, () => {
        const parsed = interpretInvestorAskQuery(q);
        expect(parsed.query.mode, q).toBe('entity');
        expect(parsed.query.firmType, q).toBe('all');
        expect(parsed.query.nameQuery, q).toBeUndefined();
      });
    }
  });

  describe('unsupported fee-model/specialty qualifiers broaden with an honest disclosure, not a dead end', () => {
    it('"retirement planning specialist" (no location) still enters discovery with a disclosure', () => {
      const parsed = interpretInvestorAskQuery('retirement planning specialist');
      expect(parsed.query.mode).toBe('entity');
      expect(parsed.query.firmType).toBe('all');
      expect(parsed.query.unsupportedSpecialtyNote).toMatch(/not a searchable Form ADV field/i);
      expect(JSON.stringify(parsed.interpretation)).toMatch(/not a searchable Form ADV field/i);
    });

    it('"fee-only advisor" (no location) still enters discovery with a disclosure', () => {
      const parsed = interpretInvestorAskQuery('fee-only advisor');
      expect(parsed.query.mode).toBe('entity');
      expect(parsed.query.firmType).toBe('all');
      expect(parsed.query.unsupportedSpecialtyNote).toBeDefined();
    });

    it('combines an unsupported specialty with a resolvable city (no state spelled out)', () => {
      const parsed = expectNeverUnfilteredNationalDump('fee-based retirement planning specialist in Colorado Springs');
      expect(parsed.query.mode).toBe('entity');
      expect(parsed.query.geography?.value).toBe('Colorado Springs');
      expect(parsed.query.geography?.state).toBe('CO');
      expect(parsed.query.unsupportedSpecialtyNote).toBeDefined();
    });
  });

  describe('no-location queries legitimately browse broadly (not the dangerous pattern)', () => {
    it('a bare category phrase with zero location signal has no geography filter and is not a dead end', () => {
      const parsed = interpretInvestorAskQuery('advisory firm');
      expect(parsed.query.mode).toBe('entity');
      expect(parsed.query.firmType).toBe('all');
      expect(parsed.query.geography).toBeUndefined();
    });

    it('a genuinely ambiguous question with no adviser/firm category still asks for clarification', () => {
      const parsed = interpretInvestorAskQuery('investment advice');
      expect(parsed.query.mode).toBe('fail_closed');
    });
  });

  describe('brand-name identity controls resolve by name, unaffected by the geography/category generalization', () => {
    it('"Edward Jones" resolves as an exact firm-name identity lookup', () => {
      const parsed = interpretInvestorAskQuery('Edward Jones');
      expect(parsed.query.mode).toBe('entity');
      expect(parsed.query.nameQuery).toBe('Edward Jones');
      expect(parsed.query.geography).toBeUndefined();
    });

    it('"Fisher Investments" resolves as an exact firm-name identity lookup', () => {
      const parsed = interpretInvestorAskQuery('Fisher Investments');
      expect(parsed.query.mode).toBe('entity');
      expect(parsed.query.nameQuery).toBe('Fisher Investments');
    });

    it('"Vanguard Personal Advisor" resolves as an exact firm-name identity lookup, not a generic adviser-category question', () => {
      const parsed = interpretInvestorAskQuery('Vanguard Personal Advisor');
      expect(parsed.query.mode).toBe('entity');
      expect(parsed.query.nameQuery).toBe('Vanguard Personal Advisor');
      expect(parsed.query.geography).toBeUndefined();
    });
  });

  describe('count mode benefits from the same general geography resolution', () => {
    it('"How many financial advisers are in Austin?" resolves Austin -> TX for a count, not a nationwide count', () => {
      const parsed = interpretInvestorAskQuery('How many financial advisers are in Austin?');
      expect(parsed.query.mode).toBe('count');
      expect(parsed.query.geography?.value).toBe('Austin');
      expect(parsed.query.geography?.state).toBe('TX');
    });
  });

  describe('exact production audit repro strings (verifying the fix directly, not just its generalization)', () => {
    it('FAIL #1: "wealth management firm Denver" resolves to Denver, CO -- not a clarification dead end', () => {
      const parsed = expectNeverUnfilteredNationalDump('wealth management firm Denver');
      expect(parsed.query.mode).toBe('entity');
      expect(parsed.query.firmType).toBe('all');
      expect(parsed.query.geography?.value).toBe('Denver');
      expect(parsed.query.geography?.state).toBe('CO');
    });

    it('FAIL #2: "fee-only financial planner Tacoma" resolves to Tacoma, WA -- not a clarification dead end', () => {
      const parsed = expectNeverUnfilteredNationalDump('fee-only financial planner Tacoma');
      expect(parsed.query.mode).toBe('entity');
      expect(parsed.query.firmType).toBe('all');
      expect(parsed.query.geography?.value).toBe('Tacoma');
      expect(parsed.query.geography?.state).toBe('WA');
    });

    it('FAIL #3: "retirement planning advisor around Sacramento" broadens to CA, disclosed -- not a clarification dead end', () => {
      const parsed = expectNeverUnfilteredNationalDump('retirement planning advisor around Sacramento');
      expect(parsed.query.mode).toBe('entity');
      expect(parsed.query.firmType).toBe('all');
      expect(parsed.query.geography?.type).toBe('principal_office_state');
      expect(parsed.query.geography?.value).toBe('CA');
    });

    it('DANGEROUS #1: "financial advisor near Fort Worth" broadens to TX -- never the unfiltered national roster', () => {
      const parsed = expectNeverUnfilteredNationalDump('financial advisor near Fort Worth');
      expect(parsed.query.mode).toBe('entity');
      expect(parsed.query.geography?.type).toBe('principal_office_state');
      expect(parsed.query.geography?.value).toBe('TX');
    });

    it('DANGEROUS #2: "investment adviser Jersey City" resolves to Jersey City, NJ -- never the unfiltered national roster', () => {
      const parsed = expectNeverUnfilteredNationalDump('investment adviser Jersey City');
      expect(parsed.query.mode).toBe('entity');
      expect(parsed.query.geography?.type).toBe('principal_office_city');
      expect(parsed.query.geography?.value).toBe('Jersey City');
      expect(parsed.query.geography?.state).toBe('NJ');
    });

    it('DANGEROUS #3: "financial advisors Palm Beach County" broadens to FL -- never the unfiltered national roster', () => {
      const parsed = expectNeverUnfilteredNationalDump('financial advisors Palm Beach County');
      expect(parsed.query.mode).toBe('entity');
      expect(parsed.query.geography?.type).toBe('principal_office_state');
      expect(parsed.query.geography?.value).toBe('FL');
    });

    it('control (already worked): "wealth advisor Boulder Colorado" still resolves correctly', () => {
      const parsed = expectNeverUnfilteredNationalDump('wealth advisor Boulder Colorado');
      expect(parsed.query.mode).toBe('entity');
      expect(parsed.query.geography?.state).toBe('CO');
    });
  });

  describe('CRD/SEC and RIA/ERA semantics are unchanged by the broadening/geography fix', () => {
    it('a labeled CRD still resolves as an exact identifier lookup regardless of any location text', () => {
      const parsed = interpretInvestorAskQuery('Find CRD 105958 near Fort Worth.');
      expect(parsed.query.mode).toBe('identifier');
      expect(parsed.query.identifier).toEqual({ type: 'crd', value: '105958' });
    });

    it('RIA and ERA stay separate classes for a resolved bare-city discovery query', () => {
      const ria = interpretInvestorAskQuery('SEC-registered RIAs in Austin');
      expect(ria.query.firmType).toBe('ria');
      expect(ria.query.geography?.state).toBe('TX');
      const era = interpretInvestorAskQuery('exempt reporting advisers in Austin');
      expect(era.query.firmType).toBe('era');
    });
  });
});
