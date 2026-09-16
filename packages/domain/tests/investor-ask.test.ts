import { describe, expect, it } from 'vitest';
import {
  INVESTOR_ASK_CAPABILITY,
  INVESTOR_ASK_CONTRACT,
  interpretInvestorAskQuery,
  whyThisMatched,
} from '../src/investor-ask';

describe('investor-ask-v1 interpreter', () => {
  it('exposes execute capability without ranking language', () => {
    expect(INVESTOR_ASK_CONTRACT).toBe('investor-ask-v1');
    expect(INVESTOR_ASK_CAPABILITY.federatedExecution).toBe('execute');
    expect(INVESTOR_ASK_CAPABILITY.identifier).toBe('labeled_firm_crd_or_sec_file_number');
    expect(JSON.stringify(INVESTOR_ASK_CAPABILITY)).not.toMatch(/best adviser/i);
  });

  it('parses labeled CRD and fails closed on bare digits', () => {
    const labeled = interpretInvestorAskQuery('Find CRD 123456.');
    expect(labeled.query.mode).toBe('identifier');
    expect(labeled.query.identifier).toEqual({ type: 'crd', value: '123456' });
    const bare = interpretInvestorAskQuery('123456');
    expect(bare.query.mode).toBe('fail_closed');
    expect(bare.query.failReason).toMatch(/labeled CRD/i);
  });

  it('does not treat Colorado state RIAs as the 589 principal-office overlay', () => {
    const parsed = interpretInvestorAskQuery('Colorado state RIAs');
    expect(parsed.query.mode).toBe('fail_closed');
    expect(parsed.query.failReason).toMatch(/does not treat the 589/i);
    const hq = interpretInvestorAskQuery('RIA principal offices in Colorado');
    expect(hq.query.geography?.value).toBe('CO');
    expect(hq.query.geography?.type).toBe('principal_office_state');
    expect(hq.query.mode).not.toBe('fail_closed');
  });

  it('does not treat New York state RIAs as the 3,152 principal-office overlay', () => {
    const parsed = interpretInvestorAskQuery('investment advisers registered in New York');
    expect(parsed.query.mode).toBe('fail_closed');
    expect(parsed.query.failReason).toMatch(/does not treat the 3,152/i);
    const hq = interpretInvestorAskQuery('RIA principal offices in New York');
    expect(hq.query.geography?.value).toBe('NY');
    expect(hq.query.geography?.type).toBe('principal_office_state');
    expect(hq.query.mode).not.toBe('fail_closed');
    const era = interpretInvestorAskQuery('New York ERA');
    expect(era.query.mode).toBe('fail_closed');
    expect(era.query.failReason).toMatch(/ERA is not an RIA/i);
    const complaints = interpretInvestorAskQuery('complaints against investment advisers in New York');
    expect(complaints.query.mode).toBe('fail_closed');
    expect(complaints.query.failReason).toMatch(/not a firm-specific/i);
  });

  it('does not treat Virginia state RIAs as the 339 principal-office overlay', () => {
    const parsed = interpretInvestorAskQuery('licensed investment advisers in Virginia');
    expect(parsed.query.mode).toBe('fail_closed');
    expect(parsed.query.failReason).toMatch(/does not treat the 339/i);
    const hq = interpretInvestorAskQuery('RIA principal offices in Virginia');
    expect(hq.query.geography?.value).toBe('VA');
    expect(hq.query.geography?.type).toBe('principal_office_state');
    expect(hq.query.mode).not.toBe('fail_closed');
    const complaints = interpretInvestorAskQuery('complaints against investment advisers in Virginia');
    expect(complaints.query.mode).toBe('fail_closed');
    expect(complaints.query.failReason).toMatch(/not firm-specific/i);
  });

  it('interprets Florida RIAs as principal-office geography', () => {
    const parsed = interpretInvestorAskQuery('Show SEC-registered RIAs in Florida.');
    expect(parsed.query.mode).toBe('entity');
    expect(parsed.query.firmType).toBe('ria');
    expect(parsed.query.status).toBe('registered');
    expect(parsed.query.geography?.type).toBe('principal_office_state');
    expect(parsed.query.geography?.value).toBe('FL');
    expect(parsed.query.geography?.meaning).toMatch(/Principal office/i);
    expect(parsed.query.geography?.meaning).not.toMatch(/serves Florida/i);
  });

  it('does not treat serves-Florida as client geography', () => {
    const parsed = interpretInvestorAskQuery('Show advisers serving Florida.');
    expect(parsed.query.geography?.value).toBe('FL');
    expect(parsed.query.geography?.ambiguous).toBe(true);
    expect(parsed.query.geography?.meaning).toMatch(/not client geography/i);
  });

  it('parses RAUM $1B–$10B as Item 5F range on RIAs', () => {
    const parsed = interpretInvestorAskQuery(
      'Show Florida RIAs reporting between $1 billion and $10 billion in regulatory assets under management.',
    );
    expect(parsed.query.mode).toBe('entity');
    expect(parsed.query.firmType).toBe('ria');
    expect(parsed.query.geography?.value).toBe('FL');
    expect(parsed.query.raum?.min).toBe(1_000_000_000);
    expect(parsed.query.raum?.maxExclusive).toBe(10_000_000_000);
    expect(parsed.query.sort).toBe('raum_desc');
  });

  it('fails closed when ERA is asked for RAUM', () => {
    const parsed = interpretInvestorAskQuery('Show ERAs with more than $1 billion RAUM.');
    expect(parsed.query.mode).toBe('fail_closed');
    expect(parsed.query.failReason).toMatch(/do not file/i);
  });

  it('parses compensation methods as Item 5.E, not fee amounts', () => {
    const asset = interpretInvestorAskQuery('Show firms reporting asset-based fees.');
    expect(asset.query.compensationMethods).toEqual(['percentage_of_assets']);
    expect(asset.query.firmType).toBe('ria');
    const both = interpretInvestorAskQuery('Show firms reporting both asset-based and hourly fees.');
    expect(both.query.compensationMethods).toEqual(['percentage_of_assets', 'hourly_charges']);
    expect(both.query.compensationMatch).toBe('all');
    expect(JSON.stringify(asset.interpretation)).not.toMatch(/1%/);
  });

  it('keeps RIA and ERA counts separate', () => {
    const ria = interpretInvestorAskQuery('How many RIAs are currently indexed?');
    expect(ria.query.mode).toBe('count');
    expect(ria.query.firmType).toBe('ria');
    const era = interpretInvestorAskQuery('How many ERAs are currently indexed?');
    expect(era.query.firmType).toBe('era');
    const both = interpretInvestorAskQuery('How many investment adviser firms are currently indexed?');
    expect(both.query.firmType).toBe('all');
    expect(JSON.stringify(both.interpretation)).toMatch(/RIA \+ ERA/);
  });

  it('distinguishes observation grain from firm grain', () => {
    const parsed = interpretInvestorAskQuery('How many Form ADV observations are indexed?');
    expect(parsed.query.mode).toBe('count');
    expect(parsed.query.aggregateMetric).toBe('observation_count');
  });

  it('defines RAUM without calling it performance', () => {
    const parsed = interpretInvestorAskQuery('What does RAUM mean?');
    expect(parsed.query.mode).toBe('definition');
    expect(parsed.query.definitionId).toBe('raum');
  });

  it('fails closed on recommendation, performance, fee, and hiring questions', () => {
    const questions = [
      'Who is the best financial adviser?',
      'Which adviser will make me the most money?',
      'Which adviser has the best performance?',
      'Which adviser is safest?',
      'Which adviser is most trustworthy?',
      'Which adviser has the lowest fees?',
      'Which RIA has the best returns?',
      'Which adviser should I hire?',
      'What stocks should I buy?',
      'Which adviser will give me the best returns?',
      'Who is the highest-performing adviser?',
      'Which RIA is most profitable?',
    ];
    for (const q of questions) {
      const parsed = interpretInvestorAskQuery(q);
      expect(parsed.query.mode, q).toBe('fail_closed');
      expect(parsed.query.failReason, q).toMatch(/does not rank|does not/i);
    }
  });

  it('fails closed on Form ADV what-changed', () => {
    const parsed = interpretInvestorAskQuery('What changed in this firm’s Form ADV?');
    expect(parsed.query.mode).toBe('fail_closed');
    expect(parsed.query.failReason).toMatch(/not supported/i);
  });

  it('compares Florida and Texas as principal-office counts', () => {
    const parsed = interpretInvestorAskQuery('Compare Florida and Texas RIA counts by principal-office state.');
    expect(parsed.query.mode).toBe('comparison');
    expect(parsed.query.geography?.value).toBe('FL');
    expect(parsed.query.compareGeography?.value).toBe('TX');
    expect(parsed.query.firmType).toBe('ria');
  });

  it('builds deterministic why-this-matched language', () => {
    const text = whyThisMatched({
      firmType: 'ria',
      geography: {
        type: 'principal_office_state',
        value: 'FL',
        meaning: 'Principal office in Florida',
      },
      raum: { min: 1_000_000_000, maxExclusive: 10_000_000_000, bandId: 'from1bTo10b' },
    });
    expect(text).toMatch(/classified as an RIA/i);
    expect(text).toMatch(/principal office in Florida/i);
    expect(text).toMatch(/RAUM/i);
    expect(text).not.toMatch(/better|trusted|recommend/i);
  });

  // TH-DISCOVERY-RESET-001 (production certification fix): "financial advisers in Miami" named
  // no state at all -- this parser only recognizes state names/codes, not cities -- and dead-ended
  // asking "Which state is Miami in?" even though real, current SEC/IARD registered firms in
  // Miami, FL are one query away. Miami is not genuinely ambiguous with any other jurisdiction
  // this source would apply to.
  it('resolves a bare "Miami" city to its recorded Florida principal office without a jurisdiction dead end', () => {
    const parsed = interpretInvestorAskQuery('financial advisers in Miami');
    expect(parsed.query.mode).toBe('entity');
    expect(parsed.query.geography?.type).toBe('principal_office_city');
    expect(parsed.query.geography?.value).toBe('Miami');
    expect(parsed.query.geography?.state).toBe('FL');
    expect(parsed.query.conditions?.some((c) => c.kind === 'office_city' && c.outcome === 'APPLIED')).toBe(true);
    expect(parsed.query.conditions?.some((c) => c.kind === 'office_state' && c.outcome === 'APPLIED')).toBe(true);
    // The exclusion list that decides whether a whole descriptive query becomes a literal
    // simpleFirmName search only matched singular "adviser" -- \badviser\b never matches inside
    // "advisers" -- so this real geography filter used to be silently ANDed with a nonexistent
    // literal firm name ("financial advisers in Miami"), always returning zero rows.
    expect(parsed.query.nameQuery).toBeUndefined();
  });

  // TH-DISCOVERY-GEN-001: "financial adviser" is an ordinary consumer provider-category phrase,
  // not a company name and not a request needing clarification. detectFirmType() only recognized
  // "investment adviser(s)"/"adviser firm(s)"/"advisory firm(s)" and RIA/ERA keywords, so a bare
  // "financial adviser" (no geography) fell through with no firm type and no geography --
  // planInvestorResearch's catch-all reads that combination as "no signal at all" and asked
  // "What would you like to research?" instead of defaulting to discovery.
  it('a bare "financial adviser" category phrase defaults to discovery, not a clarification dead end', () => {
    const parsed = interpretInvestorAskQuery('financial adviser');
    expect(parsed.query.mode).toBe('entity');
    expect(parsed.query.firmType).toBe('all');
    expect(parsed.query.nameQuery).toBeUndefined();
  });

  it('"financial adviser in Dallas Texas" is DISCOVERY with firm type and geography, not a literal name', () => {
    const parsed = interpretInvestorAskQuery('financial adviser in Dallas Texas');
    expect(parsed.query.mode).toBe('entity');
    expect(parsed.query.firmType).toBe('all');
    expect(parsed.query.geography?.type).toBe('principal_office_city');
    expect(parsed.query.geography?.value).toBe('Dallas');
    expect(parsed.query.geography?.state).toBe('TX');
    expect(parsed.query.nameQuery).toBeUndefined();
  });
});
