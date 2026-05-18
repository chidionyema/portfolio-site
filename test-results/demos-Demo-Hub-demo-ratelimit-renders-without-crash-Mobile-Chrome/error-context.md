# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: demos.spec.ts >> Demo Hub >> demo "ratelimit" renders without crash
- Location: tests/e2e/demos.spec.ts:47:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForSelector: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('[data-demo-id]') to be visible
    58 × locator resolved to 13 elements. Proceeding with the first one: <a href="?demo=checkout" data-demo-id="checkout" class="↵                      flex items-center gap-5 px-10 py-5 text-[12px] font-mono font-bold↵                      transition-all duration-75 relative border-l-2↵                      text-secondary/60 border-transparent hover:text-primary hover:bg-white/[0.01]↵                    ">…</a>

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - button "Open cluster status details" [ref=e3] [cursor=pointer]:
    - generic [ref=e5]:
      - generic [ref=e6]:
        - generic [ref=e11]: connecting…
        - generic [ref=e13]: reconnecting
      - img [ref=e16]
  - banner [ref=e18]:
    - generic [ref=e19]:
      - link "Chidi Onyema" [ref=e20] [cursor=pointer]:
        - /url: /
      - generic [ref=e21]:
        - button "Open navigation menu" [ref=e22] [cursor=pointer]:
          - img [ref=e23]
        - link "Hire me" [ref=e25] [cursor=pointer]:
          - /url: /contact
  - main [ref=e26]:
    - generic [ref=e29]:
      - navigation "System modules" [ref=e30]:
        - group [ref=e31]:
          - generic "Reliable transactions" [ref=e32] [cursor=pointer]:
            - generic [ref=e33]: Reliable transactions
            - img [ref=e34]
        - group [ref=e36]:
          - generic "Resilience under load" [ref=e37] [cursor=pointer]:
            - generic [ref=e38]: Resilience under load
            - img [ref=e39]
          - list [ref=e41]:
            - listitem [ref=e42]:
              - link "Circuit breaker" [ref=e43] [cursor=pointer]:
                - /url: "?demo=circuit"
                - generic [ref=e44]:
                  - img [ref=e45]
                  - generic [ref=e47]: Circuit breaker
            - listitem [ref=e48]:
              - link "Idempotency keys" [ref=e49] [cursor=pointer]:
                - /url: "?demo=idempotency"
                - generic [ref=e50]:
                  - img [ref=e51]
                  - generic [ref=e60]: Idempotency keys
            - listitem [ref=e61]:
              - link "Rate limiting" [ref=e62] [cursor=pointer]:
                - /url: "?demo=ratelimit"
                - generic [ref=e63]:
                  - img [ref=e64]
                  - generic [ref=e67]: Rate limiting
        - group [ref=e69]:
          - generic "Cache coherence" [ref=e70] [cursor=pointer]:
            - generic [ref=e71]: Cache coherence
            - img [ref=e72]
        - group [ref=e74]:
          - generic "Saga orchestration" [ref=e75] [cursor=pointer]:
            - generic [ref=e76]: Saga orchestration
            - img [ref=e77]
        - group [ref=e79]:
          - generic "Financial integrity" [ref=e80] [cursor=pointer]:
            - generic [ref=e81]: Financial integrity
            - img [ref=e82]
        - group [ref=e84]:
          - generic "Compliance" [ref=e85] [cursor=pointer]:
            - generic [ref=e86]: Compliance
            - img [ref=e87]
        - group [ref=e89]:
          - generic "Search pipeline" [ref=e90] [cursor=pointer]:
            - generic [ref=e91]: Search pipeline
            - img [ref=e92]
        - group [ref=e94]:
          - generic "Secret lifecycle" [ref=e95] [cursor=pointer]:
            - generic [ref=e96]: Secret lifecycle
            - img [ref=e97]
      - generic [ref=e101]:
        - generic [ref=e102]:
          - generic [ref=e103]:
            - button "polling" [ref=e105]:
              - generic [ref=e107]: polling
            - generic [ref=e108]:
              - generic [ref=e109]:
                - button "System" [pressed] [ref=e110] [cursor=pointer]:
                  - img [ref=e111]
                  - text: System
                - button "Source" [ref=e114] [cursor=pointer]:
                  - img [ref=e115]
                  - text: Source
              - button "INJECT" [ref=e119] [cursor=pointer]:
                - img [ref=e121]
                - generic [ref=e123]: INJECT
          - generic [ref=e124]:
            - img [ref=e126]
            - generic [ref=e129]:
              - generic [ref=e130]:
                - generic [ref=e131]: Resilience under load
                - generic [ref=e132]: One bad client cannot starve everyone else
              - heading "Rate limiting" [level=2] [ref=e133]
              - paragraph [ref=e134]: Fixed-window throttling per session
              - link "View source" [ref=e136] [cursor=pointer]:
                - /url: https://github.com/chidionyema/haworks-platform/blob/main/src/BffWeb/BffWeb.Api/Controllers/DemoController.cs
                - img [ref=e137]
                - generic [ref=e141]: View source
                - img [ref=e142]
        - generic [ref=e146]:
          - generic [ref=e148]:
            - generic [ref=e150]:
              - img [ref=e151]
              - generic [ref=e153]:
                - heading "The Problem" [level=4] [ref=e154]
                - paragraph [ref=e155]: Single users can exhaust system capacity.
            - generic [ref=e157]:
              - img [ref=e158]
              - generic [ref=e169]:
                - heading "The Solution" [level=4] [ref=e170]
                - paragraph [ref=e171]: Fixed-window rate limiting with per-session permits.
          - generic [ref=e172]:
            - generic [ref=e173]:
              - heading "Fixed Window Limiter" [level=2] [ref=e175]:
                - img [ref=e176]
                - text: Fixed Window Limiter
              - generic [ref=e180]:
                - generic [ref=e181]:
                  - generic [ref=e182]:
                    - generic [ref=e183]: Limit Policy
                    - generic [ref=e184]: ACCEPTING
                  - generic [ref=e185]:
                    - generic [ref=e186]:
                      - generic [ref=e187]:
                        - generic [ref=e188]:
                          - text: "5"
                          - generic [ref=e189]: /5
                        - generic [ref=e190]: Available Tokens
                      - generic [ref=e191]:
                        - generic [ref=e192]: 22s
                        - generic [ref=e193]: Window Reset
                    - generic [ref=e203]:
                      - generic [ref=e204]: window start
                      - generic [ref=e205]: reset in 22s
                - generic [ref=e206]:
                  - button "Send Request" [ref=e207] [cursor=pointer]
                  - button "Burst (6x)" [ref=e208] [cursor=pointer]
            - generic [ref=e209]:
              - heading "Traffic Log" [level=2] [ref=e210]:
                - img [ref=e211]
                - text: Traffic Log
              - generic [ref=e213]:
                - table [ref=e215]:
                  - rowgroup [ref=e216]:
                    - row "Timestamp Result Remaining" [ref=e217]:
                      - columnheader "Timestamp" [ref=e218]
                      - columnheader "Result" [ref=e219]
                      - columnheader "Remaining" [ref=e220]
                  - rowgroup [ref=e221]:
                    - row "Send traffic to view results" [ref=e222]:
                      - cell "Send traffic to view results" [ref=e223]
                - generic [ref=e224]: Fixed window rate limiter · 5 req / 60s · ASP.NET Core RateLimiter middleware
          - button "Under the hood" [ref=e226] [cursor=pointer]:
            - generic [ref=e227]:
              - img [ref=e228]
              - text: Under the hood
            - img [ref=e230]
      - generic [ref=e232]:
        - generic [ref=e233]: All commands target endpoints on the local_dev cluster.
        - generic [ref=e234]:
          - 'button "Try next: Circuit breaker" [ref=e235] [cursor=pointer]':
            - generic [ref=e236]: "Try next:"
            - generic [ref=e237]: Circuit breaker
            - img [ref=e238]
          - link "Read the deep dives" [ref=e240] [cursor=pointer]:
            - /url: "#deep-dives"
            - text: Read the deep dives
            - img [ref=e241]
  - button "Toggle live cluster console" [ref=e245] [cursor=pointer]:
    - img [ref=e247]
    - generic [ref=e249]: live
    - generic "BFF process not yet identified" [ref=e250]: bff:…
    - generic [ref=e251]: ·
    - generic "Frontend bundle started 2026-05-18T16:11:34.213Z (1m ago)" [ref=e252]: web:4f9a7e7 1m
    - generic [ref=e253]: ·
    - generic [ref=e254]: "0"
    - img [ref=e256]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | /**
  4   |  * E2E tests for the portfolio site demos.
  5   |  *
  6   |  * Demos use client:only="react" — they render entirely client-side.
  7   |  * Tests must wait for React hydration before asserting on content.
  8   |  *
  9   |  * API smoke tests are skipped when the backend is unavailable.
  10  |  */
  11  | 
  12  | const API_URL = process.env.PUBLIC_API_URL || 'http://localhost:5000';
  13  | const HYDRATION_TIMEOUT = 30_000; // client:only takes time
  14  | 
  15  | const ALL_DEMO_IDS = [
  16  |   'idempotency', 'ratelimit', 'circuit', 'stampede', 'cache',
  17  |   'concurrency', 'events', 'checkout', 'refund', 'ledger',
  18  |   'erasure', 'cdcsearch', 'vault',
  19  | ];
  20  | 
  21  | /** Wait for React to hydrate the demo hub */
  22  | async function waitForDemoHub(page: import('@playwright/test').Page) {
  23  |   // The sidebar renders data-demo-id attributes when React hydrates
> 24  |   await page.waitForSelector('[data-demo-id]', { timeout: HYDRATION_TIMEOUT });
      |              ^ Error: page.waitForSelector: Test timeout of 30000ms exceeded.
  25  | }
  26  | 
  27  | // ─── Demo Hub UI Tests ──────────────────────────────────────────
  28  | 
  29  | test.describe('Demo Hub', () => {
  30  |   test('renders sidebar with all 13 demos after hydration', async ({ page }) => {
  31  |     await page.goto('/demos');
  32  |     await waitForDemoHub(page);
  33  | 
  34  |     for (const id of ALL_DEMO_IDS) {
  35  |       await expect(page.locator(`[data-demo-id="${id}"]`)).toBeAttached();
  36  |     }
  37  |   });
  38  | 
  39  |   test('default demo renders content', async ({ page }) => {
  40  |     await page.goto('/demos');
  41  |     await waitForDemoHub(page);
  42  |     // h2 is the demo title rendered by DemoHubLite
  43  |     await expect(page.locator('h2').first()).toBeVisible({ timeout: HYDRATION_TIMEOUT });
  44  |   });
  45  | 
  46  |   for (const id of ALL_DEMO_IDS) {
  47  |     test(`demo "${id}" renders without crash`, async ({ page }) => {
  48  |       await page.goto(`/demos?demo=${id}`);
  49  |       await waitForDemoHub(page);
  50  | 
  51  |       // Every demo renders at least one h2 or heading
  52  |       await expect(page.locator('h2').first()).toBeVisible({ timeout: HYDRATION_TIMEOUT });
  53  | 
  54  |       // Collect page errors during a brief observation window
  55  |       const errors: string[] = [];
  56  |       page.on('pageerror', err => errors.push(err.message));
  57  |       await page.waitForTimeout(1500);
  58  |       expect(errors).toEqual([]);
  59  |     });
  60  |   }
  61  | 
  62  |   test('sidebar navigation switches demos', async ({ page }) => {
  63  |     await page.goto('/demos?demo=idempotency');
  64  |     await waitForDemoHub(page);
  65  | 
  66  |     // Click circuit breaker in sidebar
  67  |     await page.click('[data-demo-id="circuit"]');
  68  |     await page.waitForTimeout(2000);
  69  | 
  70  |     // URL should update
  71  |     expect(page.url()).toContain('demo=circuit');
  72  |   });
  73  | 
  74  |   test('Under the Hood panel opens', async ({ page }) => {
  75  |     await page.goto('/demos?demo=checkout');
  76  |     await waitForDemoHub(page);
  77  |     await page.waitForTimeout(2000);
  78  | 
  79  |     const hoodBtn = page.getByRole('button', { name: /under the hood/i });
  80  |     if (await hoodBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
  81  |       await hoodBtn.click();
  82  |       await expect(page.getByText('Services involved')).toBeVisible({ timeout: 5000 });
  83  |       await expect(page.getByText('What breaks without this')).toBeVisible();
  84  |     }
  85  |   });
  86  | 
  87  |   test('System/Source view toggle works', async ({ page }) => {
  88  |     await page.goto('/demos');
  89  |     await waitForDemoHub(page);
  90  | 
  91  |     const sourceBtn = page.locator('button:has-text("Source")');
  92  |     if (await sourceBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
  93  |       await sourceBtn.click();
  94  |       await page.waitForTimeout(1000);
  95  |       await expect(page.locator('button:has-text("System")')).toBeVisible();
  96  |     }
  97  |   });
  98  | });
  99  | 
  100 | // ─── Architecture Page ──────────────────────────────────────────
  101 | 
  102 | test.describe('Architecture Page', () => {
  103 |   test('renders all sections', async ({ page }) => {
  104 |     await page.goto('/architecture');
  105 |     // Architecture page uses client:visible — wait for hydration
  106 |     await page.waitForSelector('text=Platform Engineering', { timeout: HYDRATION_TIMEOUT });
  107 | 
  108 |     const sections = [
  109 |       'Roslyn Analyzers',
  110 |       'Architecture Guards',
  111 |       'Double-Entry Ledger',
  112 |       'GDPR',
  113 |       'CDC Pipeline',
  114 |       'Contract Test',
  115 |       'Aspire',
  116 |     ];
  117 | 
  118 |     for (const section of sections) {
  119 |       await expect(page.getByText(section, { exact: false }).first()).toBeVisible({ timeout: 10000 });
  120 |     }
  121 |   });
  122 | 
  123 |   test('analyzer examples show HWK rule IDs', async ({ page }) => {
  124 |     await page.goto('/architecture');
```