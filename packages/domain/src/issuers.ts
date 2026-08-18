import { z } from 'zod';
import { canonicalIdentifierSchema } from './identifiers';

export const ISSUER_KINDS = [
  'sec_reporting_public_company',
  'registered_investment_company',
  'other_regulated_issuer',
] as const;

export type IssuerKind = (typeof ISSUER_KINDS)[number];

export const ISSUER_KIND_LABELS: Record<IssuerKind, string> = {
  sec_reporting_public_company: 'SEC-reporting public company',
  registered_investment_company: 'Registered investment company',
  other_regulated_issuer: 'Other regulated issuer',
};

export const issuerSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1).max(160),
  legalName: z.string().min(1).max(300),
  displayName: z.string().min(1).max(300),
  kind: z.enum(ISSUER_KINDS),
  identifiers: z.array(canonicalIdentifierSchema).default([]),
  isSynthetic: z.boolean(),
});

export type Issuer = z.infer<typeof issuerSchema>;
