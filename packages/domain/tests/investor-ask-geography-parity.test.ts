import { describe, expect, it } from 'vitest';
import { interpretInvestorAskQuery } from '../src/investor-ask';
import { US_STATE_CODES, isNationwideScope } from '../src/us-geography';

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

  describe('TH-DISCOVERY-PARITY-001B-REVIEW finding 1: benign prepositions with no place-like token never fail closed', () => {
    const benignQueries: Array<[string, string]> = [
      ['financial advisers who specialize in retirement planning', '"in" + ordinary lowercase words'],
      ['financial advisors who work across multiple asset classes', '"across" + ordinary lowercase words'],
      ['advisory firms operating within fiduciary standards', '"within" + ordinary lowercase words'],
      ['financial advisers who report throughout the year', '"throughout" + ordinary lowercase words'],
      ['financial advisors who charge by AUM', '"by" + all-caps acronym (AUM), not a place attempt'],
    ];
    for (const [q, label] of benignQueries) {
      it(`does not fail closed on ${label} ("${q}")`, () => {
        const parsed = interpretInvestorAskQuery(q);
        expect(parsed.query.mode, q).not.toBe('fail_closed');
        expect(parsed.query.geography, q).toBeUndefined();
      });
    }

    it('still fails closed for a genuine unresolved place attempt after a benign-looking preposition ("in Fakeburg")', () => {
      const parsed = interpretInvestorAskQuery('financial advisers who specialize in Fakeburg retirement planning');
      expect(parsed.query.mode).toBe('fail_closed');
    });
  });

  describe('TH-DISCOVERY-PARITY-001B-REVIEW finding 2: common-word city names require real evidence', () => {
    it('lowercase ordinary usage of "independence" is not read as a city', () => {
      const parsed = interpretInvestorAskQuery(
        'financial advisers who value independence and self-direction for their clients',
      );
      expect(parsed.query.mode).not.toBe('fail_closed');
      expect(parsed.query.geography).toBeUndefined();
    });

    it('lowercase ordinary usage of "liberty" is not read as a city', () => {
      const parsed = interpretInvestorAskQuery('financial advisors who champion liberty and personal choice');
      expect(parsed.query.mode).not.toBe('fail_closed');
      expect(parsed.query.geography).toBeUndefined();
    });

    it('lowercase ordinary usage of "mobile" is not read as a city', () => {
      const parsed = interpretInvestorAskQuery('financial advisors with a mobile app for account access');
      expect(parsed.query.mode).not.toBe('fail_closed');
      expect(parsed.query.geography).toBeUndefined();
    });

    // TH-DISCOVERY-PARITY-001B-REVIEW2 finding B: the previous fix required curated common-word
    // cities specifically to carry a preposition/state, on top of capitalization, before accepting
    // them -- a per-name exception on top of a per-name list. That is exactly what finding B replaced
    // with one general rule: capitalization is itself the deterministic place-context signal, applied
    // identically to every city ("wealth management firm Denver" and "financial advisor Liberty" are
    // now the same shape and resolve the same way). This is an intentional behavior change from the
    // prior partial fix, not a regression -- see the parity requirement that ordinary bare-city
    // discovery ("wealth management firm Denver") keeps resolving with zero extra evidence.
    it('a bare capitalized common-word city resolves the same as any other bare capitalized city ("Liberty")', () => {
      const parsed = expectNeverUnfilteredNationalDump('financial advisor Liberty');
      expect(parsed.query.mode).not.toBe('fail_closed');
      expect(parsed.query.geography?.type).toBe('principal_office_city');
      expect(parsed.query.geography?.value).toBe('Liberty');
      expect(parsed.query.geography?.state).toBe('MO');
    });

    it('resolves "independence" as a city when prepositioned and state-qualified ("in Independence, Missouri")', () => {
      const parsed = expectNeverUnfilteredNationalDump('financial advisor in Independence, Missouri');
      expect(parsed.query.geography?.type).toBe('principal_office_city');
      expect(parsed.query.geography?.value).toBe('Independence');
      expect(parsed.query.geography?.state).toBe('MO');
    });

    it('resolves "independence" to the other real state when explicitly qualified ("in Independence, Kentucky")', () => {
      const parsed = expectNeverUnfilteredNationalDump('financial advisor in Independence, Kentucky');
      expect(parsed.query.geography?.type).toBe('principal_office_city');
      expect(parsed.query.geography?.value).toBe('Independence');
      expect(parsed.query.geography?.state).toBe('KY');
    });

    it('recognises "liberty" as real geography evidenced by a preposition alone, no state needed ("near Liberty")', () => {
      // "near <place>" is radius phrasing (same convention as "financial advisor near Fort Worth"
      // above), so this honestly broadens to state level rather than a city-level match -- the
      // point here is that "Liberty" was accepted as evidenced geography at all, not filtered out.
      const parsed = expectNeverUnfilteredNationalDump('wealth manager near Liberty');
      expect(parsed.query.geography?.type).toBe('principal_office_state');
      expect(parsed.query.geography?.value).toBe('MO');
      expect(parsed.query.geography?.meaning).toMatch(/Liberty/);
    });

    it('resolves "mobile" as a city, prepositioned and state-qualified ("in Mobile, Alabama")', () => {
      const parsed = expectNeverUnfilteredNationalDump('financial advisor in Mobile, Alabama');
      expect(parsed.query.geography?.type).toBe('principal_office_city');
      expect(parsed.query.geography?.value).toBe('Mobile');
      expect(parsed.query.geography?.state).toBe('AL');
    });

    it('recognises "mobile" as real geography evidenced by a preposition and a bare state code ("near Mobile AL")', () => {
      // Same radius-phrasing convention as above ("near" broadens to state, honestly disclosed) --
      // this confirms "Mobile" was accepted as evidenced geography, not silently dropped.
      const parsed = expectNeverUnfilteredNationalDump('financial advisor near Mobile AL');
      expect(parsed.query.geography?.type).toBe('principal_office_state');
      expect(parsed.query.geography?.value).toBe('AL');
      expect(parsed.query.geography?.meaning).toMatch(/Mobile/);
    });

    it('resolves a common-word city + state combo with no preposition ("Liberty Missouri")', () => {
      const parsed = expectNeverUnfilteredNationalDump('financial advisor Liberty Missouri');
      expect(parsed.query.geography?.value).toBe('Liberty');
      expect(parsed.query.geography?.state).toBe('MO');
    });

    it('resolves a common-word city + state combo with no preposition ("Mobile Alabama")', () => {
      const parsed = expectNeverUnfilteredNationalDump('financial advisor Mobile Alabama');
      expect(parsed.query.geography?.value).toBe('Mobile');
      expect(parsed.query.geography?.state).toBe('AL');
    });

    it('the mechanism generalizes to other gazetteer common-word collisions ("normal")', () => {
      const lowercase = interpretInvestorAskQuery('advisory firms that operate under normal market conditions');
      expect(lowercase.query.geography).toBeUndefined();
      const resolved = expectNeverUnfilteredNationalDump('financial advisor in Normal, Illinois');
      expect(resolved.query.geography?.value).toBe('Normal');
      expect(resolved.query.geography?.state).toBe('IL');
    });
  });

  describe('TH-DISCOVERY-PARITY-001B-REVIEW finding 3: nationwide-scope phrasing browses broadly, not a resolution failure', () => {
    const nationwideQueries: Array<[string, string]> = [
      ['financial advisors in the US', '"US"'],
      ['financial advisors in the U.S.', '"U.S."'],
      ['financial advisors in the USA', '"USA"'],
      ['investment advisers in the United States', '"United States"'],
      ['investment advisers in the United States of America', '"United States of America"'],
    ];
    for (const [q, label] of nationwideQueries) {
      it(`recognises ${label} as a deliberate nationwide request, not an unresolved place`, () => {
        const parsed = interpretInvestorAskQuery(q);
        expect(parsed.query.mode, q).toBe('entity');
        expect(parsed.query.firmType, q).toBe('all');
        expect(parsed.query.geography, q).toBeUndefined();
        expect(parsed.query.failReason, q).toBeUndefined();
      });
    }

    it('does not confuse the lowercase pronoun "us" with the nationwide alias (case-sensitive match)', () => {
      // "us" here is a pronoun, not the country -- isNationwideScope() only matches "US"/"USA"
      // case-sensitively so this is never silently read as nationwide scope. Whatever this phrasing
      // resolves to, it must never be the dangerous silent-nationwide-dump pattern.
      expectNeverUnfilteredNationalDump('financial advisor near us please');
    });

    it('a state code is never confused with the nationwide alias (no US_STATE_CODES collision)', () => {
      expect(US_STATE_CODES.includes('US')).toBe(false);
    });
  });

  describe('TH-DISCOVERY-PARITY-001B-REVIEW2 finding A: nationwide scope generalizes beyond US/USA/United States', () => {
    const aliasQueries: Array<[string, string]> = [
      ['investment advisers in the country', '"in the country"'],
      ['financial advisors across the country', '"across the country"'],
      ['wealth management firms in the nation', '"in the nation"'],
      ['financial advisers nationwide', '"nationwide"'],
      ['investment advisers across the nation', '"across the nation"'],
      ['financial advisors in America', '"in America"'],
      ['wealth management firms across America', '"across America"'],
    ];
    for (const [q, label] of aliasQueries) {
      it(`recognises ${label} as a deliberate nationwide request, not an unresolved place`, () => {
        expect(isNationwideScope(q), q).toBe(true);
        const parsed = interpretInvestorAskQuery(q);
        expect(parsed.query.mode, q).toBe('entity');
        expect(parsed.query.firmType, q).toBe('all');
        expect(parsed.query.geography, q).toBeUndefined();
        expect(parsed.query.failReason, q).toBeUndefined();
      });
    }

    // Negative controls: "country"/"nation"/"America" used in ways that are NOT a nationwide-scope
    // request must never be misread as one -- same preposition-evidence discipline as the rest of
    // this module, never a bare keyword match anywhere in the sentence. Every entry here is checked
    // directly against isNationwideScope(), which is the precise unit under test for this finding.
    const nonNationwideQueries: Array<[string, string]> = [
      ['financial advisers who focus on nation-building strategies for emerging markets', 'bare "nation" (nation-building), no "the nation" phrase'],
      ['wealth managers who advise country club members', '"country club" is a venue, not nationwide scope'],
      ["financial advisers who work in the nation's capital", "\"the nation's\" is a possessive naming a specific place (DC), not nationwide scope"],
      ['advisers who help clients understand the country of Meridonia tax treaty', '"the country of <name>" names some other country, not US-nationwide scope'],
      ['investment advisers investing in America First Fund holdings', '"America" immediately followed by another capitalized word (part of a longer proper noun), not the bare country name'],
      ['Nationwide Financial investment advisers assisting policyholders with retirement planning', '"Nationwide Financial" is a company name, not the nationwide-scope adverb'],
    ];
    for (const [q, label] of nonNationwideQueries) {
      it(`does not misread ${label} as nationwide scope ("${q}")`, () => {
        expect(isNationwideScope(q), q).toBe(false);
      });
    }

    // A subset of the negative controls above are also clean enough (no fictional/company proper
    // noun left over for the fail-closed backstop to honestly flag) to confirm end-to-end: not only
    // is this not nationwide scope, the interpreter does not fail closed on it either.
    const nonNationwideCleanQueries: Array<[string, string]> = [
      ['financial advisers who focus on nation-building strategies for emerging markets', 'nation-building'],
      ['wealth managers who advise country club members', 'country club'],
      ['Nationwide Financial investment advisers assisting policyholders with retirement planning', 'Nationwide Financial'],
    ];
    for (const [q, label] of nonNationwideCleanQueries) {
      it(`does not fail closed on ordinary prose using ${label} ("${q}")`, () => {
        const parsed = interpretInvestorAskQuery(q);
        expect(parsed.query.mode, q).not.toBe('fail_closed');
        expect(parsed.query.geography, q).toBeUndefined();
      });
    }

    // The remaining negative controls above ("the nation's capital", "the country of Meridonia",
    // "America First Fund") still carry a residual, unresolved trailing phrase once the nationwide
    // misdetection is correctly excluded (a possessive naming a specific place, a fictional country, a
    // fund name) -- ending the sentence right after the preposition, which is what this codebase's
    // existing unresolved-place detection keys off. The honest and expected outcome for all three is a
    // safe, disclosed fail-closed -- never nationwide scope, and never a silent nationwide dump either.
    it('fails closed safely (not as nationwide scope) for "in the nation\'s capital"', () => {
      const parsed = interpretInvestorAskQuery("financial advisers who work in the nation's capital");
      expect(parsed.query.mode).toBe('fail_closed');
      expect(parsed.query.failReason).toMatch(/nation/i);
    });
  });

  describe('TH-DISCOVERY-PARITY-001B-REVIEW2 finding B: bare-city evidence gate applies to every gazetteer entry, not a curated list', () => {
    // Six ordinary-English words that are also real, incorporated US cities -- beyond the previous
    // fix's curated six (independence, liberty, mobile, normal, enterprise, superior). None of these
    // appear on any name-based list anywhere in the matching logic; they are handled purely by the
    // general capitalization/evidence gate in resolveUsPlaces().
    const nonGeographicUses: Array<[string, string]> = [
      ['financial advisers focused on reading reports', 'lowercase "reading" (Reading, PA collision)'],
      ['investment firms offering sunrise strategies', 'lowercase "sunrise" (Sunrise, FL collision)'],
      ['financial planners who manage orange portfolios', 'lowercase "orange" (Orange, CA collision)'],
      ['financial advisers who study commerce trends for clients', 'lowercase "commerce" (Commerce, CA collision)'],
      ['financial planners who track industry benchmarks closely', 'lowercase "industry" (Industry, CA collision)'],
      ['financial advisers who help retirees dream of paradise every winter', 'lowercase "paradise" (Paradise, CA collision)'],
      // Not anchored at the very end of the sentence -- see the existing "value independence and
      // self-direction" control above for why: unresolvedPlaceCandidate() only treats a preposition's
      // trailing phrase as an unresolved-place attempt when it runs to the end of the question, so a
      // trailing lowercase phrase after "in" here would exercise a different (and already-correct)
      // code path rather than this finding's city-matching gate specifically.
      ['financial advisers who help clients build financial independence over time', 'lowercase "independence" not immediately preceded by a preposition'],
      ['mobile financial advisers', 'lowercase "mobile" used as an adjective, not a place'],
    ];
    for (const [q, label] of nonGeographicUses) {
      it(`does not read ${label} as geography ("${q}")`, () => {
        const parsed = interpretInvestorAskQuery(q);
        expect(parsed.query.mode, q).not.toBe('fail_closed');
        expect(parsed.query.geography, q).toBeUndefined();
      });
    }

    // The same six words, written as genuine places (capitalized, state-qualified) -- must resolve
    // correctly, proving the general evidence gate (not a blacklist) is what is doing the work.
    it('resolves "Reading" as a city when capitalized and state-qualified ("advisers in Reading Pennsylvania")', () => {
      const parsed = expectNeverUnfilteredNationalDump('advisers in Reading Pennsylvania');
      expect(parsed.query.geography?.type).toBe('principal_office_city');
      expect(parsed.query.geography?.value).toBe('Reading');
      expect(parsed.query.geography?.state).toBe('PA');
    });

    it('resolves "Sunrise" as real geography, broadened honestly by "near" radius phrasing ("firms near Sunrise Florida")', () => {
      const parsed = expectNeverUnfilteredNationalDump('firms near Sunrise Florida');
      expect(parsed.query.geography?.type).toBe('principal_office_state');
      expect(parsed.query.geography?.value).toBe('FL');
      expect(parsed.query.mode).toBe('entity');
    });

    it('resolves "Orange" as a city when capitalized and state-qualified ("financial advisors in Orange California")', () => {
      const parsed = expectNeverUnfilteredNationalDump('financial advisors in Orange California');
      expect(parsed.query.geography?.type).toBe('principal_office_city');
      expect(parsed.query.geography?.value).toBe('Orange');
      expect(parsed.query.geography?.state).toBe('CA');
    });

    it('resolves "Commerce" as a city when capitalized and state-qualified ("planners in Commerce California")', () => {
      const parsed = expectNeverUnfilteredNationalDump('planners in Commerce California');
      expect(parsed.query.geography?.type).toBe('principal_office_city');
      expect(parsed.query.geography?.value).toBe('Commerce');
      expect(parsed.query.geography?.state).toBe('CA');
    });

    it('resolves "Industry" as a city when capitalized and state-qualified ("firms in Industry California")', () => {
      const parsed = expectNeverUnfilteredNationalDump('firms in Industry California');
      expect(parsed.query.geography?.type).toBe('principal_office_city');
      expect(parsed.query.geography?.value).toBe('Industry');
      expect(parsed.query.geography?.state).toBe('CA');
    });

    it('resolves "Paradise" as a city when capitalized and state-qualified ("advisers in Paradise California")', () => {
      const parsed = expectNeverUnfilteredNationalDump('advisers in Paradise California');
      expect(parsed.query.geography?.type).toBe('principal_office_city');
      expect(parsed.query.geography?.value).toBe('Paradise');
      expect(parsed.query.geography?.state).toBe('CA');
    });

    // Ticket-literal "must still resolve" controls beyond the six word-collision cities.
    it('resolves "Mobile Alabama" via "advisers in Mobile Alabama"', () => {
      const parsed = expectNeverUnfilteredNationalDump('advisers in Mobile Alabama');
      expect(parsed.query.geography?.value).toBe('Mobile');
      expect(parsed.query.geography?.state).toBe('AL');
    });

    it('broadens "planners near Independence Missouri" to MO, honestly disclosed', () => {
      const parsed = expectNeverUnfilteredNationalDump('planners near Independence Missouri');
      expect(parsed.query.geography?.type).toBe('principal_office_state');
      expect(parsed.query.geography?.value).toBe('MO');
    });

    // True city+state controls unrelated to the word-collision set, confirming ordinary resolution
    // is unaffected by the generalized evidence gate.
    it('resolves an ordinary city + state control ("investment advisers in Nashville Tennessee")', () => {
      const parsed = expectNeverUnfilteredNationalDump('investment advisers in Nashville Tennessee');
      expect(parsed.query.geography?.type).toBe('principal_office_city');
      expect(parsed.query.geography?.value).toBe('Nashville');
      expect(parsed.query.geography?.state).toBe('TN');
    });

    it('resolves a bare ordinary city control with no preposition or state ("financial adviser Portland")', () => {
      const parsed = expectNeverUnfilteredNationalDump('financial adviser Portland');
      expect(parsed.query.geography?.type).toBe('principal_office_city');
      expect(parsed.query.geography?.value).toBe('Portland');
      expect(parsed.query.geography?.state).toBe('OR');
    });

    // Genuine unresolved-place controls: real fail-closed behavior must be unaffected by either fix.
    it('still fails closed for a genuine unresolved place named with "in" ("Freedomville")', () => {
      const parsed = interpretInvestorAskQuery('financial adviser in Freedomville');
      expect(parsed.query.mode).toBe('fail_closed');
      expect(parsed.query.failReason).toMatch(/freedomville/i);
    });

    it('still fails closed for a genuine unresolved place named with "near" ("Nowhereton")', () => {
      const parsed = interpretInvestorAskQuery('wealth manager near Nowhereton');
      expect(parsed.query.mode).toBe('fail_closed');
      expect(parsed.query.failReason).toMatch(/nowhereton/i);
    });

    it('fails closed honestly for "the country of <fictional place>" instead of silently reading it as nationwide scope', () => {
      // This exercises the finding-A "the country of <name>" exclusion from the opposite direction:
      // once it is correctly NOT read as nationwide scope, it must still resolve safely -- an honest
      // fail-closed naming the unresolved place, never an unfiltered nationwide dump.
      const parsed = interpretInvestorAskQuery('financial advisers in the country of Meridonia');
      expect(parsed.query.mode).toBe('fail_closed');
      expect(parsed.query.failReason).toMatch(/meridonia/i);
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
