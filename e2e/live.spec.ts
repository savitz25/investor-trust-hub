import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const live = Boolean(process.env.PLAYWRIGHT_BASE_URL);

test.skip(!live, 'Set PLAYWRIGHT_BASE_URL to run live Vercel QA');

const FIRMS = [
  { path: '/firm/sec-crd-105958', expect: /vanguard/i, status: /reported as registered/i },
  { path: '/firm/sec-crd-109691', expect: /smbc/i, status: /pending \/ 120-day/i },
  { path: '/firm/sec-crd-106676', expect: /westcliff/i, status: /exempt reporting adviser/i },
  { path: '/firm/sec-crd-2288', expect: /ingalls/i, status: /sec file number not present/i },
  { path: '/firm/sec-crd-10091', expect: /lesko/i, status: /reported as registered/i },
  { path: '/firm/sec-crd-103705', expect: /rbc securities/i, status: /reported as registered/i },
  { path: '/firm/sec-crd-104529', expect: /money managers/i, status: /reported as registered/i },
  { path: '/firm/sec-crd-104711', expect: /tobias/i, status: /reported as registered/i },
  { path: '/firm/sec-crd-104543', expect: /harding loevner/i, status: /reported as registered/i },
  { path: '/firm/sec-crd-104826', expect: /clean yield/i, status: /reported as registered/i },
  { path: '/firm/sec-crd-104550', expect: /iridian/i, status: /state not provided/i },
  { path: '/firm/sec-crd-105075', expect: /dws international/i, status: /state not provided|country not normalized/i },
  { path: '/firm/sec-crd-104983', expect: /oppenheimer/i, status: /reported as registered/i },
  { path: '/firm/sec-crd-20804', expect: /united planners/i, status: /reported as registered/i },
  { path: '/firm/sec-crd-160241', expect: /pilot/i, status: /state not provided/i },
  { path: '/firm/sec-crd-110459', expect: /sumitomo mitsui/i, status: /state not provided|country not normalized/i },
  { path: '/firm/sec-crd-162511', expect: /d partners/i, status: /exempt reporting adviser/i },
  { path: '/firm/sec-crd-3767', expect: /&partners|& partners/i, status: /reported as registered/i },
];

const SHOT_ROUTES = [
  { route: '/', name: 'home' },
  { route: '/firms', name: 'firms' },
  { route: '/firm/sec-crd-105958', name: 'registered' },
  { route: '/firm/sec-crd-106676', name: 'era' },
  { route: '/firm/sec-crd-109691', name: 'pending' },
];

function shotDir() {
  const dir = path.join('var', 'qa-screenshots');
  mkdirSync(dir, { recursive: true });
  return dir;
}

async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

async function gotoLive(page: Page, route: string) {
  let response = await page.goto(route, { waitUntil: 'domcontentloaded' });
  const body = ((await page.locator('h1').textContent()) ?? '') + (await page.locator('#main').innerText());
  if (/temporarily unavailable|not configured/i.test(body)) {
    await page.waitForTimeout(1500);
    response = await page.goto(route, { waitUntil: 'domcontentloaded' });
  }
  return response;
}

function assertSafeCopy(body: string) {
  expect(body).not.toMatch(/trusted advisor/i);
  expect(body).not.toMatch(/Unknown,\s*USA/);
  expect(body).not.toMatch(/No SEC number exists/i);
  expect(body).not.toMatch(/(?:^|\n)\s*SEC approved\s*(?:\n|$)/i);
  expect(body).toMatch(/has not approved|does not mean[\s\S]{0,120}SEC approved/i);
}

test.describe('live Vercel firm reports', () => {
  for (const firm of FIRMS) {
    test(`${firm.path} identity and overflow`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      const response = await gotoLive(page, firm.path);
      expect(response?.status()).toBe(200);
      await expect(page.locator('h1')).toHaveText(firm.expect);
      await expect(page.locator('#main')).toContainText(firm.status);
      assertSafeCopy(await page.locator('#main').innerText());
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
      const robots = await page.locator('meta[name="robots"]').getAttribute('content');
      expect(robots ?? '').toMatch(/noindex/i);
      expect(errors).toEqual([]);
    });
  }

  test('unknown CRD is 404', async ({ page }) => {
    const response = await page.goto('/firm/sec-crd-999999999', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(404);
    await expect(page.locator('#main')).not.toContainText(/synthetic development data/i);
    await expect(page.locator('h1')).not.toHaveText(/firm trust report/i);
  });
});

test.describe('live search', () => {
  test('exact CRD ranks Vanguard first', async ({ page }) => {
    await gotoLive(page, '/firms');
    await expect(page.locator('#main')).toContainText(/23,622/);
    await expect(page.locator('#main')).toContainText(/16,783/);
    await expect(page.locator('#main')).toContainText(/235/);
    await expect(page.locator('#main')).toContainText(/6,604/);
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

  test('exact name, SEC number, partial, ZIP, and state filters', async ({ page }) => {
    await gotoLive(page, '/firms?q=801-11953');
    await expect(page.locator('article h2 a').first()).toContainText(/vanguard/i);

    await gotoLive(page, '/firms?q=The+Vanguard+Group');
    await expect(page.locator('article h2 a').first()).toContainText(/vanguard/i);

    await gotoLive(page, '/firms?q=vangua');
    await expect(page.locator('#main')).toContainText(/vanguard/i);

    await gotoLive(page, '/firms?q=19355');
    await expect(page.locator('#main')).toContainText(/19355|malvern|vanguard|sourced firm/i);

    await gotoLive(page, '/firms?state=FL');
    await expect(page.locator('#main')).toContainText(/sourced firm/i);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/i);

    await gotoLive(page, '/firms?q=tobias&state=FL');
    await expect(page.locator('article h2 a').first()).toContainText(/tobias/i);

    await gotoLive(page, '/firms?state=_none');
    await expect(page.locator('#main')).toContainText(/state not provided|sourced firm/i);
  });

  test('empty, SQL-like, and very long input stay stable', async ({ page }) => {
    const empty = await gotoLive(page, '/firms');
    expect(empty?.ok()).toBeTruthy();
    await expect(page.locator('#main')).toContainText(/23,622 sourced firms/i);

    await gotoLive(page, "/firms?q=%27%3B+drop+table+firms%3B--");
    await expect(page.locator('#main')).toContainText(/sourced firm|no sourced firms matched/i);

    const long = await gotoLive(page, `/firms?q=${'x'.repeat(400)}`);
    expect(long?.status()).toBe(200);
    await expect(page.locator('#main')).toContainText(/sourced firm|no sourced firms matched/i);
  });
});

test.describe('evidence interaction', () => {
  test('accordion opens with mouse and keyboard', async ({ page }) => {
    await page.goto('/firm/sec-crd-105958', { waitUntil: 'domcontentloaded' });
    const summary = page.locator('summary', { hasText: 'Source, dataset, and retrieval' });
    await summary.click();
    await expect(page.locator('details').first()).toHaveAttribute('open', '');
    await summary.focus();
    await expect(summary).toBeFocused();
    await summary.press('Enter');
    await expect(page.locator('#main')).toContainText(/IARD/);
    await summary.press('Space');
    await expect(page.locator('#main')).toContainText(/Regulatory assets under management/);
  });
});

test.describe('accessibility and secrets', () => {
  test('search form and firm report a11y smoke', async ({ page }) => {
    await page.goto('/firms', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('label[for="firm-q"]')).toBeVisible();
    await expect(page.locator('label[for="firm-state"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Search' })).toBeVisible();
    await page.locator('#firm-q').focus();
    await expect(page.locator('#firm-q')).toBeFocused();

    await gotoLive(page, '/firm/sec-crd-105958');
    await expect(page.locator('h1')).toHaveText(/vanguard/i);
    await expect(page.getByRole('heading', { name: 'Regulatory assets under management' })).toBeVisible();
    const html = await page.content();
    expect(html).not.toMatch(/postgres(?:ql)?:\/\/[^/\s:]+:[^@\s]+@/i);
    expect(html.toLowerCase()).not.toContain('service_role');
    expect(html).not.toMatch(/eyJhbGciOiJ[^"'\s]{20,}\.[A-Za-z0-9_-]+\./);
  });
});

test.describe('live screenshots and timings', () => {
  test('homepage, directory, and status-class reports', async ({ page }, testInfo) => {
    for (const item of SHOT_ROUTES) {
      await page.goto(item.route, { waitUntil: 'domcontentloaded' });
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
      await page.screenshot({
        path: path.join(shotDir(), `${testInfo.project.name}-${item.name}.png`),
        fullPage: true,
      });
    }
  });

  test('android-class overflow on key routes', async ({ page }) => {
    await page.setViewportSize({ width: 412, height: 915 });
    for (const route of ['/', '/firms', '/firm/sec-crd-105958', '/firm/sec-crd-20804', '/firm/sec-crd-110459']) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(await horizontalOverflow(page), route).toBeLessThanOrEqual(0);
    }
  });

  test('record live navigation timings on desktop', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop-only timing sample');
    const routes = [
      '/',
      '/firms',
      '/firms?q=105958',
      '/firm/sec-crd-105958',
      '/firm/sec-crd-106676',
      '/firm/sec-crd-109691',
    ];
    const rows: Array<{ route: string; status: number | undefined; coldMs: number; warmMs: number }> = [];
    for (const route of routes) {
      const coldStart = Date.now();
      const first = await page.goto(route, { waitUntil: 'domcontentloaded' });
      const coldMs = Date.now() - coldStart;
      const warmStart = Date.now();
      await page.reload({ waitUntil: 'domcontentloaded' });
      rows.push({ route, status: first?.status(), coldMs, warmMs: Date.now() - warmStart });
    }
    writeFileSync(path.join(shotDir(), 'live-timings.json'), `${JSON.stringify(rows, null, 2)}\n`);
    for (const row of rows) {
      expect(row.status, row.route).toBe(200);
    }
  });
});

test.describe('internal links', () => {
  test('header and footer destinations respond', async ({ page, request }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const hrefs = await page.$$eval('a[href^="/"]', (anchors) =>
      [...new Set(anchors.map((anchor) => anchor.getAttribute('href') || '').filter(Boolean))],
    );
    const sample = hrefs.filter((href) => !href.startsWith('/firm/sec-crd-')).slice(0, 20);
    for (const href of sample) {
      const response = await request.get(href);
      expect(response.status(), href).toBeLessThan(400);
    }
  });
});
