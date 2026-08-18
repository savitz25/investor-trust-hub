import { describe, expect, it } from 'vitest';
import { INDEXABLE_PATHS, PRIMARY_ROUTES, shouldNoIndex } from '@ith/config';

describe('route architecture', () => {
  it('includes the required public shell routes', () => {
    const hrefs = PRIMARY_ROUTES.map((route) => route.href);
    expect(hrefs).toEqual([
      '/',
      '/professionals',
      '/firms',
      '/research',
      '/tools',
      '/methodology',
      '/sources',
      '/about',
    ]);
  });

  it('keeps synthetic and reserved routes out of the sitemap contract', () => {
    expect(INDEXABLE_PATHS).not.toContain('/professional/jordan-p-elmwood');
    expect(shouldNoIndex('/professional/jordan-p-elmwood')).toBe(true);
    expect(shouldNoIndex('/firm/northbridge-ledger-advisors')).toBe(true);
    expect(shouldNoIndex('/compare')).toBe(true);
    expect(shouldNoIndex('/my-investor-trust-hub')).toBe(true);
    expect(shouldNoIndex('/')).toBe(false);
  });
});
