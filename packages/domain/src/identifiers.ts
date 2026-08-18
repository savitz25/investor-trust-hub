import { z } from 'zod';

/**
 * Regulatory identifiers are first-class values, never display-string fragments.
 *
 * Synthetic development identifiers MUST use the SYN- prefix so they cannot
 * be mistaken for official numbers in fixtures, logs, or UI.
 */

export const IDENTIFIER_TYPES = [
  'crd',
  'sec_file_number',
  'cik',
  'iard',
  'nfa_id',
  'lei',
  'fund_series',
  'fund_class',
  'cusip',
  'isin',
  'ticker',
  'other',
] as const;

export type IdentifierType = (typeof IDENTIFIER_TYPES)[number];

export const SYNTHETIC_IDENTIFIER_PREFIX = 'SYN-';

export interface CanonicalIdentifier {
  type: IdentifierType;
  value: string;
  issuingAuthorityId?: string;
  isPrimary?: boolean;
}

const CRD_RE = /^\d{1,10}$/;
const SEC_FILE_RE = /^(801|802|8|803)-\d{1,8}$/i;
const CIK_RE = /^\d{1,10}$/;
const NFA_RE = /^\d{1,10}$/;
const LEI_RE = /^[A-Z0-9]{20}$/;
const ISIN_RE = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;
const CUSIP_RE = /^[A-Z0-9]{9}$/;
const SYNTHETIC_RE = /^SYN-[A-Z0-9][A-Z0-9\-]*$/i;

export function isSyntheticIdentifierValue(value: string): boolean {
  return value.toUpperCase().startsWith(SYNTHETIC_IDENTIFIER_PREFIX);
}

export function normalizeIdentifierValue(type: IdentifierType, value: string): string {
  const trimmed = value.trim();
  if (isSyntheticIdentifierValue(trimmed)) {
    return trimmed.toUpperCase();
  }

  switch (type) {
    case 'crd':
    case 'nfa_id':
    case 'iard':
      return trimmed.replace(/\s+/g, '');
    case 'cik':
      return trimmed.replace(/\D/g, '').padStart(10, '0');
    case 'sec_file_number':
      return trimmed.replace(/\s+/g, '').toUpperCase();
    case 'lei':
    case 'isin':
    case 'cusip':
    case 'ticker':
    case 'fund_series':
    case 'fund_class':
      return trimmed.replace(/\s+/g, '').toUpperCase();
    default:
      return trimmed;
  }
}

export function isValidIdentifierValue(type: IdentifierType, value: string): boolean {
  const normalized = normalizeIdentifierValue(type, value);
  if (!normalized) return false;
  if (isSyntheticIdentifierValue(normalized)) {
    return SYNTHETIC_RE.test(normalized);
  }

  switch (type) {
    case 'crd':
    case 'iard':
      return CRD_RE.test(normalized);
    case 'sec_file_number':
      return SEC_FILE_RE.test(normalized);
    case 'cik':
      return CIK_RE.test(normalized.replace(/^0+/, '') || '0') && normalized.length === 10;
    case 'nfa_id':
      return NFA_RE.test(normalized);
    case 'lei':
      return LEI_RE.test(normalized);
    case 'isin':
      return ISIN_RE.test(normalized);
    case 'cusip':
      return CUSIP_RE.test(normalized);
    case 'ticker':
    case 'fund_series':
    case 'fund_class':
    case 'other':
      return normalized.length >= 1 && normalized.length <= 64;
    default:
      return false;
  }
}

export const canonicalIdentifierSchema = z
  .object({
    type: z.enum(IDENTIFIER_TYPES),
    value: z.string().min(1).max(64),
    issuingAuthorityId: z.string().min(1).optional(),
    isPrimary: z.boolean().optional(),
  })
  .superRefine((id, ctx) => {
    if (!isValidIdentifierValue(id.type, id.value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['value'],
        message: `Invalid ${id.type} identifier: ${id.value}`,
      });
    }
  });

export function parseIdentifier(type: IdentifierType, value: string): CanonicalIdentifier {
  const normalized = normalizeIdentifierValue(type, value);
  const parsed = canonicalIdentifierSchema.parse({ type, value: normalized });
  return parsed;
}

export function formatIdentifierLabel(type: IdentifierType): string {
  switch (type) {
    case 'crd':
      return 'CRD';
    case 'sec_file_number':
      return 'SEC number';
    case 'cik':
      return 'CIK';
    case 'iard':
      return 'IARD';
    case 'nfa_id':
      return 'NFA ID';
    case 'lei':
      return 'LEI';
    case 'fund_series':
      return 'Fund series';
    case 'fund_class':
      return 'Fund class';
    case 'cusip':
      return 'CUSIP';
    case 'isin':
      return 'ISIN';
    case 'ticker':
      return 'Ticker';
    case 'other':
      return 'Identifier';
  }
}
