import { expect, test } from '@playwright/test';

const crds = (process.env.WAVE_QA_CRDS ?? '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

test.skip(crds.length === 0, 'Set WAVE_QA_CRDS to run Wave sample QA');

for (const crd of crds) {
  test(`/firm/sec-crd-${crd} wave sample`, async ({ page }) => {
    const response = await page.goto(`/firm/sec-crd-${crd}`, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).not.toHaveText(/temporarily unavailable/i);
    await expect(page.locator('#main')).not.toContainText(/synthetic development data/i);
    await expect(page.locator('#main')).toContainText(/Firm Trust Report|Regulatory assets under management|SEC\/IARD/i);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const host = new URL(page.url()).hostname;
    const robots = await page.locator('meta[name="robots"]').getAttribute('content');
    if (host.endsWith('.vercel.app')) {
      expect(robots ?? '').toMatch(/noindex/i);
    }
  });
}
