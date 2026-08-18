import { expect, test } from '@playwright/test';

const SHELL = ['/', '/research', '/methodology', '/sources', '/about', '/firms'];

test.describe('shell routes', () => {
  for (const path of SHELL) {
    test(`${path} renders without overflow or console exceptions`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
      expect(response?.ok() || response?.status() === 304).toBeTruthy();
      await expect(page.locator('#main')).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${path} horizontal overflow`).toBeLessThanOrEqual(0);
      const robots = await page.locator('meta[name="robots"]').getAttribute('content');
      const host = new URL(page.url()).hostname;
      if (
        host.endsWith('.vercel.app') ||
        !process.env.SITE_INDEXING_ENABLED ||
        process.env.SITE_INDEXING_ENABLED === 'false'
      ) {
        expect(robots ?? '').toMatch(/noindex/i);
      }
      expect(errors, `${path} page errors`).toEqual([]);
    });
  }
});
