import { z } from 'zod';
import { canonicalIdentifierSchema, type CanonicalIdentifier } from './identifiers';

export const FIRM_KINDS = [
  'registered_investment_adviser',
  'broker_dealer',
  'dual_ria_broker_dealer',
  'commodity_trading_adviser',
  'commodity_pool_operator',
  'futures_commission_merchant',
  'introducing_broker',
] as const;

export type FirmKind = (typeof FIRM_KINDS)[number];

export const FIRM_KIND_LABELS: Record<FirmKind, string> = {
  registered_investment_adviser: 'Registered investment adviser',
  broker_dealer: 'Broker-dealer',
  dual_ria_broker_dealer: 'Dual RIA / broker-dealer',
  commodity_trading_adviser: 'Commodity trading adviser',
  commodity_pool_operator: 'Commodity pool operator',
  futures_commission_merchant: 'Futures commission merchant',
  introducing_broker: 'Introducing broker',
};

export const branchSchema = z.object({
  id: z.string().uuid(),
  firmId: z.string().uuid(),
  name: z.string().max(300).optional(),
  addressLine1: z.string().max(200).optional(),
  addressLine2: z.string().max(200).optional(),
  city: z.string().max(120).optional(),
  region: z.string().max(80).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().max(2).default('US'),
  isMainOffice: z.boolean().default(false),
  isSynthetic: z.boolean(),
});

export type Branch = z.infer<typeof branchSchema>;

export const firmSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1).max(160),
  legalName: z.string().min(1).max(300),
  displayName: z.string().min(1).max(300),
  dbaNames: z.array(z.string().max(300)).default([]),
  kinds: z.array(z.enum(FIRM_KINDS)).min(1),
  identifiers: z.array(canonicalIdentifierSchema).default([]),
  isSynthetic: z.boolean(),
  currentAsOf: z.string().datetime().optional(),
});

export type Firm = z.infer<typeof firmSchema>;

export function firmSearchHaystack(
  firm: Pick<Firm, 'legalName' | 'displayName' | 'dbaNames' | 'identifiers'>,
): string {
  const ids = firm.identifiers.map((id: CanonicalIdentifier) => id.value).join(' ');
  return `${firm.legalName} ${firm.displayName} ${firm.dbaNames.join(' ')} ${ids}`.toLowerCase();
}
