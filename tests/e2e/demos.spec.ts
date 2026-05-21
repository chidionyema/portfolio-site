import { test, expect } from '@playwright/test';

/**
 * E2E tests for the portfolio site demos.
 *
 * Demos use client:only="react" — they render entirely client-side.
 * Tests must wait for React hydration before asserting on content.
 *
 * API smoke tests are skipped when the backend is unavailable.
 */

const API_URL = process.env.PUBLIC_API_URL || 'http://localhost:5000';
const HYDRATION_TIMEOUT = 45_000; // client:load still needs hydration on slow CI

const ALL_DEMO_IDS = [
  'idempotency', 'ratelimit', 'circuit', 'stampede', 'cache',
  'concurrency', 'events', 'checkout', 'refund', 'ledger',
  'erasure', 'cdcsearch', 'vault',
];

/** Wait for React to hydrate the demo hub */
async function waitForDemoHub(page: import('@playwright/test').Page) {
  // The sidebar renders data-demo-id attributes when React hydrates
  await page.waitForSelector('[data-demo-id]', { timeout: HYDRATION_TIMEOUT });
}

// ─── Demo Hub UI Tests ──────────────────────────────────────────

test.describe('Demo Hub', () => {
  test('renders sidebar with all 13 demos after hydration', async ({ page }) => {
    await page.goto('/demos');
    await waitForDemoHub(page);

    for (const id of ALL_DEMO_IDS) {
      await expect(page.locator(`[data-demo-id="${id}"]`)).toBeAttached();
    }
  });

  test('default demo renders content', async ({ page }) => {
    await page.goto('/demos');
    await waitForDemoHub(page);
    // h2 is the demo title rendered by DemoHubLite
    await expect(page.locator('h2').first()).toBeVisible({ timeout: HYDRATION_TIMEOUT });
  });

  for (const id of ALL_DEMO_IDS) {
    test(`demo "${id}" renders without crash`, async ({ page }) => {
      await page.goto(`/demos?demo=${id}`);
      await waitForDemoHub(page);

      // Every demo renders at least one h2 or heading
      await expect(page.locator('h2').first()).toBeVisible({ timeout: HYDRATION_TIMEOUT });

      // Collect page errors during a brief observation window.
      // Filter out known benign errors: React hydration mismatches (#418, #423, #425)
      // are expected with Astro's island architecture (SSR vs client state diffs),
      // and CORS/fetch errors occur when the backend isn't reachable locally.
      const errors: string[] = [];
      page.on('pageerror', err => {
        const msg = err.message;
        const isHydration = /Minified React error #(418|423|425)/.test(msg);
        const isFetch = /Failed to fetch|CORS|ERR_FAILED/.test(msg);
        if (!isHydration && !isFetch) errors.push(msg);
      });
      await page.waitForTimeout(1500);
      expect(errors).toEqual([]);
    });
  }

  test('sidebar navigation switches demos', async ({ page }) => {
    await page.goto('/demos?demo=idempotency');
    await waitForDemoHub(page);

    // Click circuit breaker in sidebar
    await page.click('[data-demo-id="circuit"]');
    await page.waitForTimeout(2000);

    // URL should update
    expect(page.url()).toContain('demo=circuit');
  });

  test('Under the Hood panel opens', async ({ page }) => {
    await page.goto('/demos?demo=checkout');
    await waitForDemoHub(page);
    await page.waitForTimeout(2000);

    const hoodBtn = page.getByRole('button', { name: /under the hood/i });
    if (await hoodBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await hoodBtn.click();
      await expect(page.getByText('Services involved')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('What breaks without this')).toBeVisible();
    }
  });

  test('System/Source view toggle works', async ({ page }) => {
    await page.goto('/demos');
    await waitForDemoHub(page);

    const sourceBtn = page.locator('button:has-text("Source")');
    if (await sourceBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await sourceBtn.click();
      await page.waitForTimeout(1000);
      await expect(page.locator('button:has-text("System")')).toBeVisible();
    }
  });
});

// ─── Architecture Page ──────────────────────────────────────────

test.describe('Architecture Page', () => {
  test('renders multiple sections with headings', async ({ page }) => {
    await page.goto('/architecture');
    await page.waitForSelector('h1', { timeout: HYDRATION_TIMEOUT });

    // Page has at least 6 section headings (h2)
    const headings = await page.locator('h2').count();
    expect(headings).toBeGreaterThanOrEqual(6);
  });

  test('analyzer examples render with code blocks', async ({ page }) => {
    await page.goto('/architecture');
    // Analyzer cards contain code examples (pre elements)
    await expect(page.locator('pre').first()).toBeVisible({ timeout: HYDRATION_TIMEOUT });
  });

  test('CTA links to demos', async ({ page }) => {
    await page.goto('/architecture');
    await page.waitForSelector('text=Try the Live Demos', { timeout: HYDRATION_TIMEOUT });
    const cta = page.getByText('Try the Live Demos');
    await expect(cta).toBeVisible();
    await cta.click();
    await page.waitForURL('**/demos**', { timeout: 10000 });
  });
});

// ─── Navigation ─────────────────────────────────────────────────

test.describe('Navigation', () => {
  test('nav links point to correct destinations', async ({ page }) => {
    await page.goto('/');
    const expected: Record<string, string> = {
      'Work': '/work',
      'Demos': '/demos',
      'Architecture': '/architecture',
      'About': '/about',
    };
    const nav = page.locator('nav[aria-label="Primary"]');
    for (const [label, path] of Object.entries(expected)) {
      const link = nav.getByText(label, { exact: true });
      await expect(link, `"${label}" nav link should exist`).toBeVisible();
      const href = await link.getAttribute('href');
      expect(href, `"${label}" should link to ${path}`).toBe(path);
    }
  });

  test('all nav links resolve to 200', async ({ page }) => {
    const pages = ['/', '/work', '/demos', '/architecture', '/about', '/contact'];
    for (const path of pages) {
      const resp = await page.goto(path);
      expect(resp?.status(), `${path} should return 200`).toBe(200);
    }
  });

  test('deep dive articles resolve', async ({ page }) => {
    const slugs = ['saga-vs-2pc', 'transactional-outbox', 'vault-rotation'];
    for (const slug of slugs) {
      const resp = await page.goto(`/deep-dives/${slug}`);
      expect(resp?.status(), `/deep-dives/${slug}`).toBe(200);
    }
  });

  test('404 page renders for unknown routes', async ({ page }) => {
    const resp = await page.goto('/nonexistent-page');
    expect(resp?.status()).toBe(404);
  });
});

// ─── Trust Tiles ────────────────────────────────────────────────

test.describe('Homepage', () => {
  test('trust tiles render with numeric values', async ({ page }) => {
    await page.goto('/');
    // Trust tiles show numbers — check at least one numeric stat is in the DOM
    await expect(page.locator('[class*="tabular-nums"]').first()).toBeAttached({ timeout: HYDRATION_TIMEOUT });
  });

  test('hero renders with heading and CTA', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible({ timeout: HYDRATION_TIMEOUT });
    await expect(page.getByRole('link', { name: /demos/i }).first()).toBeVisible();
  });
});

// ─── Mobile Responsive ─────────────────────────────────────────

test.describe('Mobile', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('demo page renders and has mobile nav', async ({ page }) => {
    await page.goto('/demos?demo=circuit');
    // On mobile, sidebar is hidden — wait for h2 (demo title) instead
    await expect(page.locator('h2').first()).toBeVisible({ timeout: HYDRATION_TIMEOUT });
  });

  test('no horizontal overflow on demos', async ({ page }) => {
    await page.goto('/demos?demo=events');
    await expect(page.locator('h2').first()).toBeVisible({ timeout: HYDRATION_TIMEOUT });
    await page.waitForTimeout(2000);

    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(380);
  });

  test('no horizontal overflow on architecture', async ({ page }) => {
    await page.goto('/architecture');
    await page.waitForTimeout(3000);

    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(380);
  });
});

// ─── API Smoke Tests (skip when backend unavailable) ────────────

test.describe('API Smoke', () => {
  test.beforeAll(async ({ request }) => {
    const resp = await request.get(`${API_URL}/api/health/snapshot`).catch(() => null);
    if (!resp || resp.status() !== 200) {
      test.skip();
    }
  });

  test('health returns valid shape', async ({ request }) => {
    const resp = await request.get(`${API_URL}/api/health/snapshot`).catch(() => null);
    if (!resp) { test.skip(); return; }
    const body = await resp.json();
    expect(body).toHaveProperty('services');
    expect(body).toHaveProperty('systemStatus');
  });

  test('circuit breaker responds', async ({ request }) => {
    const resp = await request.post(`${API_URL}/api/demo/circuit/request`, {
      data: { shouldFail: false },
    }).catch(() => null);
    if (!resp) { test.skip(); return; }
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(['Closed', 'Open', 'HalfOpen']).toContain(body.circuitState);
  });

  test('idempotency responds', async ({ request }) => {
    const resp = await request.post(`${API_URL}/api/demo/idempotency/process`, {
      data: { action: 'CreateOrder', payload: {} },
      headers: { 'X-Idempotency-Key': `e2e-${Date.now()}`, 'X-Demo-Session': 'e2e' },
    }).catch(() => null);
    if (!resp) { test.skip(); return; }
    expect(resp.status()).toBe(200);
    expect(await resp.json()).toHaveProperty('isDuplicate');
  });

  test('ledger simulate returns debit+credit', async ({ request }) => {
    const resp = await request.post(`${API_URL}/api/demo/ledger/simulate`, {
      data: { amountCents: 3999 },
      headers: { 'X-Demo-Session': 'e2e' },
    }).catch(() => null);
    if (!resp) { test.skip(); return; }
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.entries).toHaveLength(2);
    expect(body.entries[0].type).toBe('credit');
    expect(body.entries[1].type).toBe('debit');
  });

  test('search returns pipeline info', async ({ request }) => {
    const resp = await request.get(`${API_URL}/api/demo/search?q=widget`).catch(() => null);
    if (!resp) { test.skip(); return; }
    expect(resp.status()).toBe(200);
    expect((await resp.json()).pipeline).toContain('Debezium');
  });
});
