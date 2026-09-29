import { describe, expect, it } from 'vitest';
import { assertMarylandPublicIntel, MD_REGISTRATION_LENSES, MD_SECURITIES_ACTIONS, interpretInvestorAskQuery } from '../src';

const ask = (value: string) => interpretInvestorAskQuery(value).query;

describe('MD-INV-001 Maryland securities evidence', () => {
  it('keeps missing registration lenses and enforcement attachments separate', () => {
    expect(assertMarylandPublicIntel().actions.rows).toHaveLength(142);
    for (const lens of [MD_REGISTRATION_LENSES.stateIa, MD_REGISTRATION_LENSES.federalNotice, MD_REGISTRATION_LENSES.era]) {
      expect(lens.status).toBe('NOT_ACQUIRED');
      expect(lens.count).toBeNull();
    }
    expect(MD_REGISTRATION_LENSES.principalOffice.count).toBe(263);
    expect(MD_SECURITIES_ACTIONS.statusCounts).toEqual({ other_or_unresolved: 1, consent: 72, show_cause_or_summary: 46, final: 23 });
    expect(MD_SECURITIES_ACTIONS.exactEnforcementAttachments).toBe(0);
    expect(MD_SECURITIES_ACTIONS.nameOnlyAttachments).toBe(0);
  });

  it('routes Maryland classes and cities to state evidence', () => {
    for (const q of ['investment adviser Maryland', 'RIA Maryland', 'state registered adviser Maryland', 'federal covered adviser Maryland', 'ERA Maryland']) {
      expect(ask(q).failReason, q).toMatch(/counts and exact CRD overlaps were not acquired/);
    }
    expect(ask('principal office adviser Maryland').failReason).toMatch(/263 Maryland principal-office firm records/);
    expect(ask('broker dealer Maryland').failReason).toMatch(/separate firm and person grains/);
    expect(ask('Maryland securities enforcement').failReason).toMatch(/142 dated action documents/);
    expect(ask('Maryland securities complaints').failReason).toMatch(/complaint is not a finding/);
    expect(ask('Maryland securities examination').failReason).toMatch(/provider-level outcomes were not acquired/);
    for (const city of ['Baltimore', 'Annapolis', 'Frederick', 'Rockville']) {
      expect(ask(`investment adviser ${city}`).failReason, city).toMatch(/no city securities route/);
    }
  });

  it('prioritizes labeled identifiers, closes bare digits and refuses ranking', () => {
    expect(ask('CRD 309666 Maryland insurance').identifier).toEqual({ type: 'crd', value: '309666' });
    expect(ask('SEC 801-12345 Maryland contractor').identifier).toEqual({ type: 'sec_file_number', value: '801-12345' });
    expect(ask('309666').mode).toBe('fail_closed');
    for (const q of ['best adviser Maryland', 'safest adviser Maryland', 'recommended adviser Maryland', 'most trustworthy adviser Maryland', 'top-rated adviser Maryland', 'highest-rated adviser Maryland', '#1 adviser Maryland', 'Trust Score Maryland adviser', 'AggregateRating Maryland adviser', 'ratingValue Maryland adviser', 'paid ranking Maryland adviser', 'sponsored ranking Maryland adviser']) {
      expect(ask(q).failReason, q).toMatch(/does not rank advisers/);
    }
  });
});
