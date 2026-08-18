import { describe, expect, it } from 'vitest';
import {
  formatIdentifierLabel,
  isSyntheticIdentifierValue,
  isValidIdentifierValue,
  normalizeIdentifierValue,
  parseIdentifier,
} from '../src/identifiers';

describe('regulatory identifiers', () => {
  it('accepts synthetic identifiers with SYN- prefix', () => {
    expect(isValidIdentifierValue('crd', 'SYN-CRD-P2001')).toBe(true);
    expect(isSyntheticIdentifierValue('SYN-CRD-P2001')).toBe(true);
    expect(parseIdentifier('crd', 'syn-crd-p2001').value).toBe('SYN-CRD-P2001');
  });

  it('validates official-format CRD, SEC file, CIK, LEI', () => {
    expect(isValidIdentifierValue('crd', '123456')).toBe(true);
    expect(isValidIdentifierValue('sec_file_number', '801-12345')).toBe(true);
    expect(normalizeIdentifierValue('cik', '320193')).toBe('0000320193');
    expect(isValidIdentifierValue('cik', '320193')).toBe(true);
    expect(isValidIdentifierValue('lei', '5493001KJTIIGC8Y1R12')).toBe(true);
  });

  it('rejects malformed official identifiers', () => {
    expect(isValidIdentifierValue('crd', 'ABC')).toBe(false);
    expect(isValidIdentifierValue('sec_file_number', 'not-a-file')).toBe(false);
    expect(isValidIdentifierValue('lei', 'short')).toBe(false);
    expect(() => parseIdentifier('crd', 'nope')).toThrow();
  });

  it('does not embed identifier type in casual display strings', () => {
    expect(formatIdentifierLabel('crd')).toBe('CRD');
    expect(formatIdentifierLabel('sec_file_number')).toBe('SEC number');
    expect(formatIdentifierLabel('nfa_id')).toBe('NFA ID');
  });
});
