import { z } from 'zod';
import { canonicalIdentifierSchema, type CanonicalIdentifier } from './identifiers';

export const PERSON_KINDS = [
  'broker',
  'investment_adviser_representative',
  'dual_registrant',
  'commodity_associated_person',
  'other_regulated_financial_professional',
] as const;

export type PersonKind = (typeof PERSON_KINDS)[number];

export const PERSON_KIND_LABELS: Record<PersonKind, string> = {
  broker: 'Broker / registered representative',
  investment_adviser_representative: 'Investment adviser representative',
  dual_registrant: 'Dual registrant',
  commodity_associated_person: 'Commodity associated person',
  other_regulated_financial_professional: 'Other regulated financial professional',
};

export const personSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1).max(160),
  displayName: z.string().min(1).max(300),
  givenName: z.string().max(120).optional(),
  familyName: z.string().max(120).optional(),
  middleName: z.string().max(120).optional(),
  nameSuffix: z.string().max(40).optional(),
  kinds: z.array(z.enum(PERSON_KINDS)).min(1),
  identifiers: z.array(canonicalIdentifierSchema).default([]),
  isSynthetic: z.boolean(),
  currentAsOf: z.string().datetime().optional(),
});

export type Person = z.infer<typeof personSchema>;

export function personSearchHaystack(person: Pick<Person, 'displayName' | 'identifiers'>): string {
  const ids = person.identifiers.map((id: CanonicalIdentifier) => id.value).join(' ');
  return `${person.displayName} ${ids}`.toLowerCase();
}
