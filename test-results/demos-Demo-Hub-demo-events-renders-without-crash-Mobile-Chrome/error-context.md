# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: demos.spec.ts >> Demo Hub >> demo "events" renders without crash
- Location: tests/e2e/demos.spec.ts:47:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForSelector: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('[data-demo-id]') to be visible
    56 × locator resolved to 13 elements. Proceeding with the first one: <a href="?demo=checkout" data-demo-id="checkout" class="↵                      flex items-center gap-5 px-10 py-5 text-[12px] font-mono font-bold↵                      transition-all duration-75 relative border-l-2↵                      text-secondary/60 border-transparent hover:text-primary hover:bg-white/[0.01]↵                    ">…</a>

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
            - listitem [ref=e52]:
              - link "Optimistic locking" [ref=e53] [cursor=pointer]:
                - /url: "?demo=concurrency"
                - generic [ref=e54]:
                  - img [ref=e55]
                  - generic [ref=e61]: Optimistic locking
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
            - generic [ref=e127]:
              - generic [ref=e128]:
                - generic [ref=e129]: Reliable transactions
                - generic [ref=e130]: Never silently drops a published event
              - heading "Transactional outbox" [level=2] [ref=e131]
              - paragraph [ref=e132]: Atomic event persistence and broker relay
              - generic [ref=e133]:
                - link "Read the spec" [ref=e134] [cursor=pointer]:
                  - /url: /deep-dives/transactional-outbox
                  - img [ref=e135]
                  - generic [ref=e137]: Read the spec
                  - img [ref=e138]
                - link "View source" [ref=e140] [cursor=pointer]:
                  - /url: https://github.com/chidionyema/haworks-platform/blob/main/src/Payments/Payments.Application/Consumers/PaymentSessionRequestedConsumer.cs
                  - img [ref=e141]
                  - generic [ref=e145]: View source
                  - img [ref=e146]
        - generic [ref=e150]:
          - generic [ref=e152]:
            - generic [ref=e154]:
              - img [ref=e155]
              - generic [ref=e157]:
                - heading "The Problem" [level=4] [ref=e158]
                - paragraph [ref=e159]: Publishing events can fail after database commits.
            - generic [ref=e161]:
              - img [ref=e162]
              - generic [ref=e173]:
                - heading "The Solution" [level=4] [ref=e174]
                - paragraph [ref=e175]: Atomic outbox table + background relay.
          - generic [ref=e176]:
            - generic [ref=e178]:
              - generic [ref=e179]: Event pipeline
              - generic [ref=e180]:
                - generic [ref=e181]:
                  - generic [ref=e182]:
                    - img [ref=e184]
                    - generic [ref=e186]: Application
                    - generic [ref=e187]: Business logic
                  - generic [ref=e189]: →
                - generic [ref=e190]:
                  - generic [ref=e191]:
                    - img [ref=e193]
                    - generic [ref=e197]: Outbox Table
                    - generic [ref=e198]: Postgres
                  - generic [ref=e200]: →
                - generic [ref=e201]:
                  - generic [ref=e202]:
                    - img [ref=e204]
                    - generic [ref=e210]: Message Broker
                    - generic [ref=e211]: RabbitMQ
                  - generic [ref=e213]: →
                - generic [ref=e215]:
                  - img [ref=e217]
                  - generic [ref=e220]: Consumer
                  - generic [ref=e221]: MassTransit
            - generic [ref=e222]:
              - generic [ref=e223]:
                - generic [ref=e224]:
                  - heading "Transactional outbox" [level=2] [ref=e225]:
                    - img [ref=e226]
                    - text: Transactional outbox
                  - generic [ref=e230]: Relay live
                - generic [ref=e232]:
                  - paragraph [ref=e233]:
                    - text: Atomic persistence for business events.
                    - text: Guarantees [At-Least-Once] delivery to RabbitMQ Cluster.
                  - generic [ref=e234]:
                    - button "Commit event" [ref=e235] [cursor=pointer]:
                      - img [ref=e236]
                      - text: Commit event
                    - button "Pause relay" [ref=e239] [cursor=pointer]:
                      - img [ref=e240]
                      - text: Pause relay
                  - generic [ref=e243]:
                    - generic [ref=e244]: Outbox table
                    - table [ref=e246]:
                      - rowgroup [ref=e247]:
                        - row "Event ID Status TS" [ref=e248]:
                          - columnheader "Event ID" [ref=e249]
                          - columnheader "Status" [ref=e250]
                          - columnheader "TS" [ref=e251]
                      - rowgroup [ref=e252]:
                        - row "Waiting for commit..." [ref=e253]:
                          - cell "Waiting for commit..." [ref=e254]
              - generic [ref=e255]:
                - heading "Message broker" [level=3] [ref=e256]:
                  - img [ref=e257]
                  - text: Message broker
                - generic [ref=e263]:
                  - generic [ref=e264]:
                    - generic [ref=e265]:
                      - img [ref=e267]
                      - generic [ref=e271]:
                        - generic [ref=e272]: RabbitMQ_Primary
                        - generic [ref=e273]: HEALTH_OPTIMAL
                    - generic [ref=e276]:
                      - text: Queue depth
                      - generic [ref=e277]:
                        - generic [ref=e279]:
                          - generic [ref=e280]: orders.v1
                          - generic [ref=e281]: 00 MSG
                        - generic [ref=e284]:
                          - generic [ref=e285]: inventory.v1
                          - generic [ref=e286]: 00 MSG
                    - paragraph [ref=e290]: "Relay_Active // ID: RL_8F2B // Lock: Node_local_dev"
                  - generic [ref=e291]:
                    - generic [ref=e292]: "Cluster: cloudamqp_local_dev"
                    - generic [ref=e293]: Synchronized
          - button "Under the hood" [ref=e296] [cursor=pointer]:
            - generic [ref=e297]:
              - img [ref=e298]
              - text: Under the hood
            - img [ref=e300]
      - generic [ref=e302]:
        - generic [ref=e303]: All commands target endpoints on the local_dev cluster.
        - generic [ref=e304]:
          - 'button "Try next: Distributed saga" [ref=e305] [cursor=pointer]':
            - generic [ref=e306]: "Try next:"
            - generic [ref=e307]: Distributed saga
            - img [ref=e308]
          - link "Read the deep dives" [ref=e310] [cursor=pointer]:
            - /url: "#deep-dives"
            - text: Read the deep dives
            - img [ref=e311]
  - button "Toggle live cluster console" [ref=e315] [cursor=pointer]:
    - img [ref=e317]
    - generic [ref=e319]: live
    - generic "BFF process not yet identified" [ref=e320]: bff:…
    - generic [ref=e321]: ·
    - generic "Frontend bundle started 2026-05-18T16:11:34.213Z (1m ago)" [ref=e322]: web:4f9a7e7 1m
    - generic [ref=e323]: ·
    - generic [ref=e324]: "0"
    - img [ref=e326]
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