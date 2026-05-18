# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: demos.spec.ts >> Demo Hub >> demo "cache" renders without crash
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
        - group [ref=e41]:
          - generic "Cache coherence" [ref=e42] [cursor=pointer]:
            - generic [ref=e43]: Cache coherence
            - img [ref=e44]
          - list [ref=e46]:
            - listitem [ref=e47]:
              - link "Multi-tier cache" [ref=e48] [cursor=pointer]:
                - /url: "?demo=stampede"
                - generic [ref=e49]:
                  - img [ref=e50]
                  - generic [ref=e54]: Multi-tier cache
            - listitem [ref=e55]:
              - link "Pub/sub invalidation" [ref=e56] [cursor=pointer]:
                - /url: "?demo=cache"
                - generic [ref=e57]:
                  - img [ref=e58]
                  - generic [ref=e63]: Pub/sub invalidation
        - group [ref=e65]:
          - generic "Saga orchestration" [ref=e66] [cursor=pointer]:
            - generic [ref=e67]: Saga orchestration
            - img [ref=e68]
        - group [ref=e70]:
          - generic "Financial integrity" [ref=e71] [cursor=pointer]:
            - generic [ref=e72]: Financial integrity
            - img [ref=e73]
        - group [ref=e75]:
          - generic "Compliance" [ref=e76] [cursor=pointer]:
            - generic [ref=e77]: Compliance
            - img [ref=e78]
        - group [ref=e80]:
          - generic "Search pipeline" [ref=e81] [cursor=pointer]:
            - generic [ref=e82]: Search pipeline
            - img [ref=e83]
        - group [ref=e85]:
          - generic "Secret lifecycle" [ref=e86] [cursor=pointer]:
            - generic [ref=e87]: Secret lifecycle
            - img [ref=e88]
      - generic [ref=e92]:
        - generic [ref=e93]:
          - generic [ref=e94]:
            - button "polling" [ref=e96]:
              - generic [ref=e98]: polling
            - generic [ref=e99]:
              - generic [ref=e100]:
                - button "System" [pressed] [ref=e101] [cursor=pointer]:
                  - img [ref=e102]
                  - text: System
                - button "Source" [ref=e105] [cursor=pointer]:
                  - img [ref=e106]
                  - text: Source
              - button "INJECT" [ref=e110] [cursor=pointer]:
                - img [ref=e112]
                - generic [ref=e114]: INJECT
          - generic [ref=e115]:
            - img [ref=e117]
            - generic [ref=e122]:
              - generic [ref=e123]:
                - generic [ref=e124]: Cache coherence
                - generic [ref=e125]: Updates show up everywhere within ms
              - heading "Pub/sub invalidation" [level=2] [ref=e126]
              - paragraph [ref=e127]: Real-time cache coherence across nodes
              - link "View source" [ref=e129] [cursor=pointer]:
                - /url: https://github.com/chidionyema/haworks-platform/blob/main/src/Catalog/Catalog.Application/Commands/UpdateProductCommand.cs
                - img [ref=e130]
                - generic [ref=e134]: View source
                - img [ref=e135]
        - generic [ref=e139]:
          - generic [ref=e141]:
            - generic [ref=e143]:
              - img [ref=e144]
              - generic [ref=e146]:
                - heading "The Problem" [level=4] [ref=e147]
                - paragraph [ref=e148]: Multi-node clusters serve stale cached data.
            - generic [ref=e150]:
              - img [ref=e151]
              - generic [ref=e162]:
                - heading "The Solution" [level=4] [ref=e163]
                - paragraph [ref=e164]: Pub/sub messages drop stale local copies.
          - generic [ref=e165]:
            - generic [ref=e166]:
              - heading "Pub/Sub Invalidation" [level=2] [ref=e168]:
                - img [ref=e169]
                - text: Pub/Sub Invalidation
              - generic [ref=e176]:
                - generic [ref=e177]:
                  - generic [ref=e178]:
                    - generic [ref=e179]: Catalog Service
                    - generic [ref=e180]: SYNCED
                  - generic [ref=e182]:
                    - generic [ref=e183]:
                      - generic [ref=e184]: Widget Pro
                      - generic [ref=e185]: $49.99
                    - generic [ref=e186]:
                      - generic [ref=e187]: V1
                      - generic [ref=e188]:
                        - img [ref=e189]
                        - text: CACHED
                - generic [ref=e194]:
                  - button "Update DB" [ref=e195] [cursor=pointer]:
                    - img [ref=e196]
                    - text: Update DB
                  - button "Simulate Event" [disabled]:
                    - img
                    - text: Simulate Event
                - button "Read from Cache" [ref=e199] [cursor=pointer]:
                  - img [ref=e200]
                  - text: Read from Cache
            - generic [ref=e203]:
              - heading "Event Log" [level=2] [ref=e204]:
                - img [ref=e205]
                - text: Event Log
              - table [ref=e210]:
                - rowgroup [ref=e211]:
                  - row "Action Message" [ref=e212]:
                    - columnheader "Action" [ref=e213]
                    - columnheader "Message" [ref=e214]
                - rowgroup [ref=e215]:
                  - row "Waiting for cache events..." [ref=e216]:
                    - cell "Waiting for cache events..." [ref=e217]
          - button "Under the hood" [ref=e219] [cursor=pointer]:
            - generic [ref=e220]:
              - img [ref=e221]
              - text: Under the hood
            - img [ref=e223]
      - generic [ref=e225]:
        - generic [ref=e226]: All commands target endpoints on the local_dev cluster.
        - generic [ref=e227]:
          - 'button "Try next: Optimistic locking" [ref=e228] [cursor=pointer]':
            - generic [ref=e229]: "Try next:"
            - generic [ref=e230]: Optimistic locking
            - img [ref=e231]
          - link "Read the deep dives" [ref=e233] [cursor=pointer]:
            - /url: "#deep-dives"
            - text: Read the deep dives
            - img [ref=e234]
  - button "Toggle live cluster console" [ref=e238] [cursor=pointer]:
    - img [ref=e240]
    - generic [ref=e242]: live
    - generic "BFF process not yet identified" [ref=e243]: bff:…
    - generic [ref=e244]: ·
    - generic "Frontend bundle started 2026-05-18T16:11:34.213Z (1m ago)" [ref=e245]: web:4f9a7e7 1m
    - generic [ref=e246]: ·
    - generic [ref=e247]: "0"
    - img [ref=e249]
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