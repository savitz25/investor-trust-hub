export const PRIMARY_ROUTES = [
  { href: '/', label: 'Home' },
  { href: '/ask', label: 'Ask' },
  { href: '/firms', label: 'Firms' },
  { href: '/research', label: 'Research' },
  { href: '/tools', label: 'Tools' },
  { href: '/methodology', label: 'Methodology' },
  { href: '/sources', label: 'Sources' },
  { href: '/about', label: 'About' },
] as const;

export const FUTURE_ROUTES = [
  { href: '/professional/[slug]', label: 'Professional Trust Report', status: 'shell' },
  { href: '/firm/[slug]', label: 'Firm Trust Report', status: 'shell' },
  { href: '/fund/[slug]', label: 'Fund research', status: 'reserved' },
  { href: '/company/[slug]', label: 'Company / issuer research', status: 'reserved' },
  { href: '/compare', label: 'Compare', status: 'reserved' },
  { href: '/my-investor-trust-hub', label: 'My InvestorTrustHub', status: 'reserved' },
] as const;

export const LEGAL_ROUTES = [
  { href: '/disclaimer', label: 'Disclaimer' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
] as const;

export const STATE_DISCOVERY_ROUTES = [
  { href: '/new-jersey', label: 'New Jersey' },
  { href: '/california', label: 'California' },
  { href: '/texas', label: 'Texas' },
  { href: '/washington', label: 'Washington' },
] as const;

export const INDEXABLE_PATHS = [
  '/',
  '/firms',
  '/research',
  '/tools',
  '/methodology',
  '/sources',
  '/about',
  '/new-jersey',
  '/california',
  '/texas',
  '/washington',
  '/disclaimer',
  '/privacy',
  '/terms',
] as const;

/** Synthetic fixture pages must stay noindex until replaced by sourced records. */
export const NOINDEX_ROUTE_PREFIXES = [
  '/ask',
  '/api/ask',
  '/professionals',
  '/professional/',
  '/firm/',
  '/fund/',
  '/company/',
  '/compare',
  '/my-investor-trust-hub',
  '/internal/',
] as const;

export function shouldNoIndex(pathname: string): boolean {
  return NOINDEX_ROUTE_PREFIXES.some((prefix) =>
    prefix.endsWith('/') ? pathname.startsWith(prefix) : pathname === prefix,
  );
}
