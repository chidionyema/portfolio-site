# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: demos.spec.ts >> Demo Hub >> demo "cdcsearch" renders without crash
- Location: tests/e2e/demos.spec.ts:47:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForSelector: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('[data-demo-id]') to be visible
    59 × locator resolved to 13 elements. Proceeding with the first one: <a href="?demo=checkout" data-demo-id="checkout" class="↵                      flex items-center gap-5 px-10 py-5 text-[12px] font-mono font-bold↵                      transition-all duration-75 relative border-l-2↵                      text-secondary/60 border-transparent hover:text-primary hover:bg-white/[0.01]↵                    ">…</a>

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
        - group [ref=e46]:
          - generic "Saga orchestration" [ref=e47] [cursor=pointer]:
            - generic [ref=e48]: Saga orchestration
            - img [ref=e49]
        - group [ref=e51]:
          - generic "Financial integrity" [ref=e52] [cursor=pointer]:
            - generic [ref=e53]: Financial integrity
            - img [ref=e54]
        - group [ref=e56]:
          - generic "Compliance" [ref=e57] [cursor=pointer]:
            - generic [ref=e58]: Compliance
            - img [ref=e59]
        - group [ref=e61]:
          - generic "Search pipeline" [ref=e62] [cursor=pointer]:
            - generic [ref=e63]: Search pipeline
            - img [ref=e64]
          - list [ref=e66]:
            - listitem [ref=e67]:
              - link "CDC search" [ref=e68] [cursor=pointer]:
                - /url: "?demo=cdcsearch"
                - generic [ref=e69]:
                  - img [ref=e70]
                  - generic [ref=e73]: CDC search
        - group [ref=e75]:
          - generic "Secret lifecycle" [ref=e76] [cursor=pointer]:
            - generic [ref=e77]: Secret lifecycle
            - img [ref=e78]
      - generic [ref=e82]:
        - generic [ref=e83]:
          - generic [ref=e84]:
            - button "polling" [ref=e86]:
              - generic [ref=e88]: polling
            - generic [ref=e89]:
              - generic [ref=e90]:
                - button "System" [pressed] [ref=e91] [cursor=pointer]:
                  - img [ref=e92]
                  - text: System
                - button "Source" [ref=e95] [cursor=pointer]:
                  - img [ref=e96]
                  - text: Source
              - button "INJECT" [ref=e100] [cursor=pointer]:
                - img [ref=e102]
                - generic [ref=e104]: INJECT
          - generic [ref=e105]:
            - img [ref=e107]
            - generic [ref=e110]:
              - generic [ref=e111]:
                - generic [ref=e112]: Search pipeline
                - generic [ref=e113]: Product changes appear in search within seconds
              - heading "CDC search" [level=2] [ref=e114]
              - paragraph [ref=e115]: WAL-driven search index via Debezium + Kafka
              - link "View source" [ref=e117] [cursor=pointer]:
                - /url: https://github.com/chidionyema/haworks-platform/blob/main/src/Search/Search.Application/Consumers/ProductCacheInvalidatedConsumer.cs
                - img [ref=e118]
                - generic [ref=e122]: View source
                - img [ref=e123]
        - generic [ref=e127]:
          - generic [ref=e129]:
            - generic [ref=e131]:
              - img [ref=e132]
              - generic [ref=e134]:
                - heading "The Problem" [level=4] [ref=e135]
                - paragraph [ref=e136]: Polling-based indexing is stale and wastes DB resources.
            - generic [ref=e138]:
              - img [ref=e139]
              - generic [ref=e150]:
                - heading "The Solution" [level=4] [ref=e151]
                - paragraph [ref=e152]: WAL-driven CDC keeps indexes current with zero polling.
          - generic [ref=e153]:
            - generic [ref=e154]:
              - generic [ref=e155]: CDC pipeline
              - generic [ref=e156]:
                - generic [ref=e158]:
                  - img [ref=e159]
                  - generic [ref=e163]: PostgreSQL
                  - generic [ref=e164]: WAL source
                - generic [ref=e167]:
                  - img [ref=e168]
                  - generic [ref=e170]: Debezium
                  - generic [ref=e171]: CDC connector
                - generic [ref=e174]:
                  - img [ref=e175]
                  - generic [ref=e177]: Kafka
                  - generic [ref=e178]: event stream
                - generic [ref=e181]:
                  - img [ref=e182]
                  - generic [ref=e185]: Elasticsearch
                  - generic [ref=e186]: search index
              - generic [ref=e187]: Product writes in Postgres emit WAL events → Debezium captures changes → Kafka streams to consumers → Elasticsearch index updated within seconds
            - generic [ref=e188]:
              - generic [ref=e189]:
                - heading "Search" [level=2] [ref=e190]:
                  - img [ref=e191]
                  - text: Search
                - generic [ref=e195]:
                  - generic [ref=e196]:
                    - generic [ref=e197]:
                      - img [ref=e198]
                      - textbox "Search products…" [ref=e201]: widget
                    - button "Search" [ref=e202] [cursor=pointer]
                  - generic [ref=e203]:
                    - generic [ref=e204]: What happens
                    - list [ref=e205]:
                      - listitem [ref=e206]: Product updated in Postgres (any write)
                      - listitem [ref=e207]: Debezium reads the WAL change event
                      - listitem [ref=e208]: Event published to Kafka topic
                      - listitem [ref=e209]: Consumer syncs Elasticsearch index
                      - listitem [ref=e210]: Search reflects change within seconds
              - generic [ref=e211]:
                - heading "Results" [level=2] [ref=e212]:
                  - img [ref=e213]
                  - text: Results
                - generic [ref=e217]:
                  - generic [ref=e219]: Enter a query and press Search
                  - generic [ref=e220]: Debezium → Kafka → Elasticsearch · sub-second propagation · zero polling
          - button "Under the hood" [ref=e222] [cursor=pointer]:
            - generic [ref=e223]:
              - img [ref=e224]
              - text: Under the hood
            - img [ref=e226]
      - generic [ref=e228]:
        - generic [ref=e229]: All commands target endpoints on the local_dev cluster.
        - generic [ref=e230]:
          - 'button "Try next: Dynamic credentials" [ref=e231] [cursor=pointer]':
            - generic [ref=e232]: "Try next:"
            - generic [ref=e233]: Dynamic credentials
            - img [ref=e234]
          - link "Read the deep dives" [ref=e236] [cursor=pointer]:
            - /url: "#deep-dives"
            - text: Read the deep dives
            - img [ref=e237]
  - button "Toggle live cluster console" [ref=e241] [cursor=pointer]:
    - img [ref=e243]
    - generic [ref=e245]: live
    - generic "BFF process not yet identified" [ref=e246]: bff:…
    - generic [ref=e247]: ·
    - generic "Frontend bundle started 2026-05-18T16:11:34.213Z (2m ago)" [ref=e248]: web:4f9a7e7 2m
    - generic [ref=e249]: ·
    - generic [ref=e250]: "0"
    - img [ref=e252]
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