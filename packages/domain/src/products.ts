import { z } from 'zod';
import { canonicalIdentifierSchema } from './identifiers';

export const PRODUCT_KINDS = [
  'mutual_fund',
  'etf',
  'private_fund',
  'commodity_pool',
  'structured_product',
  'other',
] as const;

export type ProductKind = (typeof PRODUCT_KINDS)[number];

export const PRODUCT_KIND_LABELS: Record<ProductKind, string> = {
  mutual_fund: 'Mutual fund',
  etf: 'ETF',
  private_fund: 'Private fund',
  commodity_pool: 'Commodity pool',
  structured_product: 'Structured product',
  other: 'Other product',
};

export const productSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1).max(160),
  name: z.string().min(1).max(300),
  kind: z.enum(PRODUCT_KINDS),
  issuerId: z.string().uuid().optional(),
  identifiers: z.array(canonicalIdentifierSchema).default([]),
  isSynthetic: z.boolean(),
});

export type Product = z.infer<typeof productSchema>;
