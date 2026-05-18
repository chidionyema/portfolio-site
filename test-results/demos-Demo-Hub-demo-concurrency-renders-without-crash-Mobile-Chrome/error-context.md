# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: demos.spec.ts >> Demo Hub >> demo "concurrency" renders without crash
- Location: tests/e2e/demos.spec.ts:47:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForSelector: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('[data-demo-id]') to be visible
    55 × locator resolved to 13 elements. Proceeding with the first one: <a href="?demo=checkout" data-demo-id="checkout" class="↵                      flex items-center gap-5 px-10 py-5 text-[12px] font-mono font-bold↵                      transition-all duration-75 relative border-l-2↵                      text-secondary/60 border-transparent hover:text-primary hover:bg-white/[0.01]↵                    ">…</a>

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
          - list [ref=e36]:
            - listitem [ref=e37]:
              - link "Distributed saga" [ref=e38] [cursor=pointer]:
                - /url: "?demo=checkout"
                - generic [ref=e39]:
                  - img [ref=e40]
                  - generic [ref=e43]: Distributed saga
            - listitem [ref=e44]:
              - link "Transactional outbox" [ref=e45] [cursor=pointer]:
                - /url: "?demo=events"
                - generic [ref=e46]:
                  - img [ref=e47]
                  - generic [ref=e50]: Transactional outbox
            - listitem [ref=e51]:
              - link "Optimistic locking" [ref=e52] [cursor=pointer]:
                - /url: "?demo=concurrency"
                - generic [ref=e53]:
                  - img [ref=e54]
                  - generic [ref=e60]: Optimistic locking
        - group [ref=e62]:
          - generic "Resilience under load" [ref=e63] [cursor=pointer]:
            - generic [ref=e64]: Resilience under load
            - img [ref=e65]
        - group [ref=e67]:
          - generic "Cache coherence" [ref=e68] [cursor=pointer]:
            - generic [ref=e69]: Cache coherence
            - img [ref=e70]
        - group [ref=e72]:
          - generic "Saga orchestration" [ref=e73] [cursor=pointer]:
            - generic [ref=e74]: Saga orchestration
            - img [ref=e75]
        - group [ref=e77]:
          - generic "Financial integrity" [ref=e78] [cursor=pointer]:
            - generic [ref=e79]: Financial integrity
            - img [ref=e80]
        - group [ref=e82]:
          - generic "Compliance" [ref=e83] [cursor=pointer]:
            - generic [ref=e84]: Compliance
            - img [ref=e85]
        - group [ref=e87]:
          - generic "Search pipeline" [ref=e88] [cursor=pointer]:
            - generic [ref=e89]: Search pipeline
            - img [ref=e90]
        - group [ref=e92]:
          - generic "Secret lifecycle" [ref=e93] [cursor=pointer]:
            - generic [ref=e94]: Secret lifecycle
            - img [ref=e95]
      - generic [ref=e99]:
        - generic [ref=e100]:
          - generic [ref=e101]:
            - button "polling" [ref=e103]:
              - generic [ref=e105]: polling
            - generic [ref=e106]:
              - generic [ref=e107]:
                - button "System" [pressed] [ref=e108] [cursor=pointer]:
                  - img [ref=e109]
                  - text: System
                - button "Source" [ref=e112] [cursor=pointer]:
                  - img [ref=e113]
                  - text: Source
              - button "INJECT" [ref=e117] [cursor=pointer]:
                - img [ref=e119]
                - generic [ref=e121]: INJECT
          - generic [ref=e122]:
            - img [ref=e124]
            - generic [ref=e130]:
              - generic [ref=e131]:
                - generic [ref=e132]: Reliable transactions
                - generic [ref=e133]: Two edits never overwrite each other
              - heading "Optimistic locking" [level=2] [ref=e134]
              - paragraph [ref=e135]: Pre-emptive conflict detection in Postgres
              - link "View source" [ref=e137] [cursor=pointer]:
                - /url: https://github.com/chidionyema/haworks-platform/blob/main/src/Catalog/Catalog.Api/Controllers/DemoConcurrencyController.cs
                - img [ref=e138]
                - generic [ref=e142]: View source
                - img [ref=e143]
        - generic [ref=e147]:
          - generic [ref=e149]:
            - generic [ref=e151]:
              - img [ref=e152]
              - generic [ref=e154]:
                - heading "The Problem" [level=4] [ref=e155]
                - paragraph [ref=e156]: Concurrent edits cause silent data overwrites.
            - generic [ref=e158]:
              - img [ref=e159]
              - generic [ref=e170]:
                - heading "The Solution" [level=4] [ref=e171]
                - paragraph [ref=e172]: Version tracking prevents stale updates.
          - generic [ref=e173]:
            - generic [ref=e174]:
              - generic [ref=e175]:
                - generic [ref=e176]:
                  - generic [ref=e177]:
                    - img [ref=e179]
                    - generic [ref=e182]: User A
                  - generic [ref=e184]: Ready
                - generic [ref=e185]:
                  - generic [ref=e186]:
                    - generic [ref=e187]: Product
                    - generic [ref=e188]: prod_demo_widget
                  - generic [ref=e189]:
                    - generic [ref=e190]: Quantity
                    - generic [ref=e191]:
                      - button "−" [ref=e192] [cursor=pointer]
                      - generic [ref=e193]: "10"
                      - button "+" [ref=e194] [cursor=pointer]
                  - generic [ref=e195]:
                    - generic [ref=e196]: xmin version
                    - generic [ref=e197]: v1
                - button "Save — User A" [ref=e198] [cursor=pointer]
              - generic [ref=e199]:
                - generic [ref=e200]:
                  - generic [ref=e201]:
                    - img [ref=e203]
                    - generic [ref=e206]: User B
                  - generic [ref=e208]: Ready
                - generic [ref=e209]:
                  - generic [ref=e210]:
                    - generic [ref=e211]: Product
                    - generic [ref=e212]: prod_demo_widget
                  - generic [ref=e213]:
                    - generic [ref=e214]: Quantity
                    - generic [ref=e215]:
                      - button "−" [ref=e216] [cursor=pointer]
                      - generic [ref=e217]: "25"
                      - button "+" [ref=e218] [cursor=pointer]
                  - generic [ref=e219]:
                    - generic [ref=e220]: xmin version
                    - generic [ref=e221]: v1
                - button "Save — User B" [ref=e222] [cursor=pointer]
            - generic [ref=e223]:
              - generic [ref=e224]:
                - img [ref=e225]
                - paragraph [ref=e228]: EF Core uses a hidden xmin column as a concurrency token. Updates check "WHERE id = X AND xmin = Y". The second writer to reach Postgres receives a 409.
              - button "Race 3 Workers" [ref=e229] [cursor=pointer]:
                - img [ref=e230]
                - text: Race 3 Workers
            - generic [ref=e232]:
              - generic [ref=e233]:
                - heading "Commit Log" [level=2] [ref=e234]:
                  - img [ref=e235]
                  - text: Commit Log
                - table [ref=e239]:
                  - rowgroup [ref=e240]:
                    - row "Worker Status" [ref=e241]:
                      - columnheader "Worker" [ref=e242]
                      - columnheader "Status" [ref=e243]
                  - rowgroup [ref=e244]:
                    - row "Trigger an update to view results" [ref=e245]:
                      - cell "Trigger an update to view results" [ref=e246]
              - generic [ref=e247]:
                - heading "Version Timeline" [level=2] [ref=e248]:
                  - img [ref=e249]
                  - text: Version Timeline
                - generic [ref=e251]:
                  - generic [ref=e253]: No commits yet
                  - generic [ref=e254]:
                    - generic [ref=e255]: Current xmin
                    - generic [ref=e256]: v1
          - button "Under the hood" [ref=e258] [cursor=pointer]:
            - generic [ref=e259]:
              - img [ref=e260]
              - text: Under the hood
            - img [ref=e262]
      - generic [ref=e264]:
        - generic [ref=e265]: All commands target endpoints on the local_dev cluster.
        - generic [ref=e266]:
          - 'button "Try next: Transactional outbox" [ref=e267] [cursor=pointer]':
            - generic [ref=e268]: "Try next:"
            - generic [ref=e269]: Transactional outbox
            - img [ref=e270]
          - link "Read the deep dives" [ref=e272] [cursor=pointer]:
            - /url: "#deep-dives"
            - text: Read the deep dives
            - img [ref=e273]
  - button "Toggle live cluster console" [ref=e277] [cursor=pointer]:
    - img [ref=e279]
    - generic [ref=e281]: live
    - generic "BFF process not yet identified" [ref=e282]: bff:…
    - generic [ref=e283]: ·
    - generic "Frontend bundle started 2026-05-18T16:11:34.213Z (1m ago)" [ref=e284]: web:4f9a7e7 1m
    - generic [ref=e285]: ·
    - generic [ref=e286]: "0"
    - img [ref=e288]
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