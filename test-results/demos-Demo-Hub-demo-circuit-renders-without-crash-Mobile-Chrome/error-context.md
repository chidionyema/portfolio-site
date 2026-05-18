# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: demos.spec.ts >> Demo Hub >> demo "circuit" renders without crash
- Location: tests/e2e/demos.spec.ts:47:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForSelector: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('[data-demo-id]') to be visible
    57 × locator resolved to 13 elements. Proceeding with the first one: <a href="?demo=checkout" data-demo-id="checkout" class="↵                      flex items-center gap-5 px-10 py-5 text-[12px] font-mono font-bold↵                      transition-all duration-75 relative border-l-2↵                      text-secondary/60 border-transparent hover:text-primary hover:bg-white/[0.01]↵                    ">…</a>

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
            - listitem [ref=e49]:
              - link "Idempotency keys" [ref=e50] [cursor=pointer]:
                - /url: "?demo=idempotency"
                - generic [ref=e51]:
                  - img [ref=e52]
                  - generic [ref=e61]: Idempotency keys
            - listitem [ref=e62]:
              - link "Rate limiting" [ref=e63] [cursor=pointer]:
                - /url: "?demo=ratelimit"
                - generic [ref=e64]:
                  - img [ref=e65]
                  - generic [ref=e68]: Rate limiting
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
            - generic [ref=e128]:
              - generic [ref=e129]:
                - generic [ref=e130]: Resilience under load
                - generic [ref=e131]: Stops a slow dep from taking everyone down
              - heading "Circuit breaker" [level=2] [ref=e132]
              - paragraph [ref=e133]: Fail-fast and graceful recovery pipeline
              - link "View source" [ref=e135] [cursor=pointer]:
                - /url: https://github.com/chidionyema/haworks-platform/blob/main/src/BffWeb/BffWeb.Api/Controllers/DemoController.cs
                - img [ref=e136]
                - generic [ref=e140]: View source
                - img [ref=e141]
        - generic [ref=e145]:
          - generic [ref=e147]:
            - generic [ref=e149]:
              - img [ref=e150]
              - generic [ref=e152]:
                - heading "The Problem" [level=4] [ref=e153]
                - paragraph [ref=e154]: Slow dependencies cascade into total system failure.
            - generic [ref=e156]:
              - img [ref=e157]
              - generic [ref=e168]:
                - heading "The Solution" [level=4] [ref=e169]
                - paragraph [ref=e170]: Fail-fast circuit state with automatic probes.
          - generic [ref=e171]:
            - generic [ref=e172]:
              - generic [ref=e173]:
                - generic [ref=e174]:
                  - img [ref=e175]
                  - generic [ref=e178]: Closed
                - paragraph [ref=e179]: All traffic flows normally
              - generic [ref=e181]:
                - generic [ref=e182]:
                  - img [ref=e183]
                  - generic [ref=e187]: Open
                - paragraph [ref=e188]: Requests rejected instantly
              - generic [ref=e189]:
                - generic [ref=e190]:
                  - img [ref=e191]
                  - generic [ref=e193]: Half-Open
                - paragraph [ref=e194]: Probing with single request
            - generic [ref=e195]:
              - generic [ref=e198]:
                - generic [ref=e199]:
                  - generic [ref=e200]:
                    - img [ref=e201]
                    - generic [ref=e203]:
                      - generic [ref=e204]: No fault
                      - generic [ref=e205]: All upstreams healthy
                  - button "Inject" [ref=e206] [cursor=pointer]
                - generic [ref=e207]:
                  - button "Request" [ref=e208] [cursor=pointer]:
                    - img [ref=e209]
                    - text: Request
                  - button "Spike 5x" [ref=e212] [cursor=pointer]:
                    - img [ref=e213]
                    - text: Spike 5x
                  - button "Reset" [ref=e215] [cursor=pointer]:
                    - img [ref=e216]
                    - text: Reset
                - generic [ref=e219]:
                  - generic [ref=e220]:
                    - generic [ref=e221]: "0"
                    - generic [ref=e222]: Success
                  - generic [ref=e223]:
                    - generic [ref=e224]: "0"
                    - generic [ref=e225]: Failed
                  - generic [ref=e226]:
                    - generic [ref=e227]: "0"
                    - generic [ref=e228]: Rejected
              - generic [ref=e229]:
                - heading "Traffic Log" [level=2] [ref=e230]:
                  - img [ref=e231]
                  - text: Traffic Log
                - generic [ref=e233]:
                  - table [ref=e235]:
                    - rowgroup [ref=e236]:
                      - row "Status Latency Circuit" [ref=e237]:
                        - columnheader "Status" [ref=e238]
                        - columnheader "Latency" [ref=e239]
                        - columnheader "Circuit" [ref=e240]
                    - rowgroup [ref=e241]:
                      - row "Send traffic to view results" [ref=e242]:
                        - cell "Send traffic to view results" [ref=e243]
                  - generic [ref=e244]: Polly AsyncCircuitBreakerPolicy · 2 failures → open 6s · auto probe on half-open
          - button "Under the hood" [ref=e246] [cursor=pointer]:
            - generic [ref=e247]:
              - img [ref=e248]
              - text: Under the hood
            - img [ref=e250]
      - generic [ref=e252]:
        - generic [ref=e253]: All commands target endpoints on the local_dev cluster.
        - generic [ref=e254]:
          - 'button "Try next: Multi-tier cache" [ref=e255] [cursor=pointer]':
            - generic [ref=e256]: "Try next:"
            - generic [ref=e257]: Multi-tier cache
            - img [ref=e258]
          - link "Read the deep dives" [ref=e260] [cursor=pointer]:
            - /url: "#deep-dives"
            - text: Read the deep dives
            - img [ref=e261]
  - button "Toggle live cluster console" [ref=e265] [cursor=pointer]:
    - img [ref=e267]
    - generic [ref=e269]: live
    - generic "BFF process not yet identified" [ref=e270]: bff:…
    - generic [ref=e271]: ·
    - generic "Frontend bundle started 2026-05-18T16:11:34.213Z (1m ago)" [ref=e272]: web:4f9a7e7 1m
    - generic [ref=e273]: ·
    - generic [ref=e274]: "0"
    - img [ref=e276]
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