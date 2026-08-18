import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const live = Boolean(process.env.PLAYWRIGHT_BASE_URL);

test.skip(!live, 'Set PLAYWRIGHT_BASE_URL to run live Vercel QA');

const FIRMS = [
  { path: '/firm/sec-crd-105958', expect: /vanguard/i, status: /reported as registered/i },
  { path: '/firm/sec-crd-109691', expect: /smbc/i, status: /pending \/ 120-day/i },
  { path: '/firm/sec-crd-106676', expect: /westcliff/i, status: /exempt reporting adviser/i },
  { path: '/firm/sec-crd-2288', expect: /ingalls/i, status: /sec file number not present/i },
  { path: '/firm/sec-crd-104510', expect: /edelman|financial engines/i, status: /reported as registered/i },
  { path: '/firm/sec-crd-104536', expect: /kayne anderson/i, status: /reported as registered/i },
  { path: '/firm/sec-crd-104711', expect: /tobias/i, status: /reported as registered/i },
  { path: '/firm/sec-crd-104543', expect: /harding loevner/i, status: /reported as registered/i },
  { path: '/firm/sec-crd-104804', expect: /clariti|schiavi/i, status: /reported as registered/i },
  { path: '/firm/sec-crd-104550', expect: /iridian/i, status: /state not provided/i },
  { path: '/firm/sec-crd-105075', expect: /dws international/i, status: /country not normalized|state not provided/i },
  { path: '/firm/sec-crd-162511', expect: /d partners/i, status: /exempt reporting adviser/i },
];

function shotDir() {
  const dir = path.join('var', 'qa-screenshots');
  mkdirSync(dir, { recursive: true });
  return dir;
}

test.describe('live Vercel firm reports', () => {
  for (const firm of FIRMS) {
    test(`${firm.path} identity and overflow`, async ({ page }, testInfo) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      const response = await page.goto(firm.path, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBe(200);
      await expect(page.locator('h1')).toHaveText(firm.expect);
      await expect(page.locator('#main')).toContainText(firm.status);
      await expect(page.locator('#main')).not.toContainText(/SEC approved/i);
      await expect(page.locator('#main')).not.toContainText(/trusted advisor/i);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
      const robots = await page.locator('meta[name="robots"]').getAttribute('content');
      expect(robots ?? '').toMatch(/noindex/i);
      if (testInfo.project.name === 'desktop' || testInfo.project.name === 'mobile') {
        const file = path.join(shotDir(), `${testInfo.project.name}-${firm.path.replaceAll('/', '_')}.png`);
        await page.screenshot({ path: file, fullPage: true });
      }
      expect(errors).toEqual([]);
    });
  }

  test('unknown CRD is 404', async ({ page }) => {
    const response = await page.goto('/firm/sec-crd-999999999', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(404);
    await expect(page.locator('#main')).not.toContainText(/synthetic development data/i);
  });
});

test.describe('live search', () => {
  test('exact CRD ranks Vanguard first', async ({ page }) => {
    await page.goto('/firms', { waitUntil: 'domcontentloaded' });
    await page.locator('#firm-q').fill('105958');
    await page.getByRole('button', { name: 'Search' }).click();
    await page.waitForURL(/q=105958/);
    const first = page.locator('article h2 a').first();
    await expect(first).toContainText(/vanguard/i);
    await first.click();
    await expect(page).toHaveURL(/\/firm\/sec-crd-105958/);
    await page.goBack();
    await expect(page).toHaveURL(/q=105958/);
  });

  test('exact SEC number and state filter work', async ({ page }) => {
    await page.goto('/firms?q=801-11953', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('article h2 a').first()).toContainText(/vanguard/i);
    await page.goto('/firms?state=FL', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#main')).toContainText(/sourced firms/i);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/i);
  });

  test('SQL-like input is treated as text', async ({ page }) => {
    await page.goto("/firms?q=%27%3B+drop+table+firms%3B--", { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#main')).toContainText(/sourced firms|no sourced firms matched/i);
  });
});

test.describe('evidence interaction', () => {
  test('accordion opens with mouse and keyboard', async ({ page }) => {
    await page.goto('/firm/sec-crd-105958', { waitUntil: 'domcontentloaded' });
    const summary = page.locator('summary', { hasText: 'Source, dataset, and retrieval' });
    await summary.click();
    await expect(page.locator('details').first()).toHaveAttribute('open', '');
    await summary.press('Enter');
    await expect(page.locator('#main')).toContainText(/IARD/);
  });
});

test.describe('live screenshots', () => {
  test('homepage and firms directory', async ({ page }, testInfo) => {
    for (const route of ['/', '/firms']) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await page.screenshot({
        path: path.join(shotDir(), `${testInfo.project.name}${route.replaceAll('/', '_') || '_home'}.png`),
        fullPage: true,
      });
    }
  });
});
