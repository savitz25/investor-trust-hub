import { describe, expect, it } from 'vitest';
import {
  isOrganizationNameShape,
  normalizeFirmNamePresentation,
  normalizedNameMatchSql,
  resolveBareNameCandidate,
} from '../src/firm-name-match';

describe('firm-name-match: isOrganizationNameShape', () => {
  it.each([
    'CINCINNATI ASSET MANAGEMENT',
    'CINCINNATI ASSET MANAGEMENT, INC',
    'CINCINNATI ASSET MANAGEMENT INC.',
    'CAPITAL ASSET MANAGEMENT, INC.',
    'Vanguard',
    '1ST GLOBAL CAPITAL CORP',
    '3 Sigma Global Asset Management',
    '180 Degree Capital Corp',
    "O'Brien & Sons",
  ])('organization-shaped: %s', (raw) => {
    expect(isOrganizationNameShape(raw)).toBe(true);
  });

  it.each(['123456', '2026', '1', '3', '801-11953', '   ', '', 'a', '12 34', '- - -'])(
    'not organization-shaped (ambiguous identifier / too short / no letter): %j',
    (raw) => {
      expect(isOrganizationNameShape(raw)).toBe(false);
    },
  );
});

describe('firm-name-match: normalizeFirmNamePresentation', () => {
  it.each([
    ['CINCINNATI ASSET MANAGEMENT', 'cincinnati asset management'],
    ['CINCINNATI ASSET MANAGEMENT, INC', 'cincinnati asset management inc'],
    ['CINCINNATI ASSET MANAGEMENT INC.', 'cincinnati asset management inc'],
    ['CINCINNATI ASSET MANAGEMENT INC', 'cincinnati asset management inc'],
    ['CAPITAL ASSET MANAGEMENT, INC.', 'capital asset management inc'],
    ['  Multiple   Spaces  ', 'multiple spaces'],
    ["O'Brien & Sons, LLC.", 'o brien sons llc'],
    ['Smith AND Jones', 'smith and jones'],
    ['Smith & Jones', 'smith jones'], // "&" folds to a separator, NOT to the word "and" (no
    // existing accepted source-name equivalence for that was found elsewhere in Investor)
  ])('%s -> %s', (raw, expected) => {
    expect(normalizeFirmNamePresentation(raw)).toBe(expected);
  });

  it('every punctuation-only-different presentation of the same name normalizes identically', () => {
    const forms = [
      'CINCINNATI ASSET MANAGEMENT, INC',
      'CINCINNATI ASSET MANAGEMENT INC.',
      'CINCINNATI ASSET MANAGEMENT INC',
      'cincinnati asset management inc',
      '  CINCINNATI   ASSET   MANAGEMENT,  INC.  ',
    ];
    const normalized = new Set(forms.map(normalizeFirmNamePresentation));
    expect(normalized.size).toBe(1);
  });
});

describe('firm-name-match: normalizedNameMatchSql byte-identity (mutation guard)', () => {
  it('produces the exact expected SQL fragment for a column reference', () => {
    expect(normalizedNameMatchSql('f.display_name')).toBe(
      "btrim(regexp_replace(lower(f.display_name), '[^a-z0-9]+', ' ', 'g'))",
    );
  });
});

describe('firm-name-match: resolveBareNameCandidate', () => {
  it('classifies a real organization name as a candidate', () => {
    expect(resolveBareNameCandidate('CINCINNATI ASSET MANAGEMENT, INC')).toEqual({
      kind: 'name',
      nameQuery: 'CINCINNATI ASSET MANAGEMENT, INC',
    });
  });
  it.each(['123456', '2026', '801-11953'])('classifies a bare/unlabeled identifier shape as ambiguous: %s', (raw) => {
    const r = resolveBareNameCandidate(raw);
    expect(r.kind).toBe('ambiguous_identifier');
  });
  it('classifies empty input as not a name', () => {
    expect(resolveBareNameCandidate('   ').kind).toBe('not_a_name');
  });
});
