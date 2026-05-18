# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: demos.spec.ts >> Demo Hub >> Under the Hood panel opens
- Location: tests/e2e/demos.spec.ts:74:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForSelector: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('[data-demo-id]') to be visible
    60 × locator resolved to 13 elements. Proceeding with the first one: <a aria-current="page" href="?demo=checkout" data-demo-id="checkout" class="↵                      flex items-center gap-5 px-10 py-5 text-[12px] font-mono font-bold↵                      transition-all duration-75 relative border-l-2↵                      bg-white/[0.04] text-primary border-accent shadow-[inset_10px_0_30px_-10px_rgba(99,102,241,0.2)]↵                    ">…</a>

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
            - listitem [ref=e45]:
              - link "Transactional outbox" [ref=e46] [cursor=pointer]:
                - /url: "?demo=events"
                - generic [ref=e47]:
                  - img [ref=e48]
                  - generic [ref=e51]: Transactional outbox
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
                - generic [ref=e130]: Stops orders from being half-charged
              - heading "Distributed saga" [level=2] [ref=e131]
              - paragraph [ref=e132]: Transaction orchestration across Fly.io nodes
              - generic [ref=e133]:
                - link "Read the spec" [ref=e134] [cursor=pointer]:
                  - /url: /deep-dives/saga-vs-2pc
                  - img [ref=e135]
                  - generic [ref=e137]: Read the spec
                  - img [ref=e138]
                - link "View source" [ref=e140] [cursor=pointer]:
                  - /url: https://github.com/chidionyema/haworks-platform/blob/main/src/CheckoutOrchestrator/CheckoutOrchestrator.Application/Sagas/CheckoutSaga.cs
                  - img [ref=e141]
                  - generic [ref=e145]: View source
                  - img [ref=e146]
        - generic [ref=e150]:
          - generic [ref=e152]:
            - generic [ref=e154]:
              - img [ref=e155]
              - generic [ref=e157]:
                - heading "The Problem" [level=4] [ref=e158]
                - paragraph [ref=e159]: Cross-service crashes leave data inconsistent.
            - generic [ref=e161]:
              - img [ref=e162]
              - generic [ref=e173]:
                - heading "The Solution" [level=4] [ref=e174]
                - paragraph [ref=e175]: Chained local commits with rollback logic.
          - generic [ref=e177]:
            - generic [ref=e178]:
              - heading "Your order" [level=3] [ref=e179]
              - generic [ref=e182]:
                - radiogroup "Saga scenario" [ref=e183]:
                  - radio "Pay" [checked] [ref=e184] [cursor=pointer]
                  - radio "Sold out" [ref=e185] [cursor=pointer]
                  - radio "Card declined" [ref=e186] [cursor=pointer]
                  - radio "Two browsers, one item" [ref=e187] [cursor=pointer]
                - generic [ref=e190]:
                  - generic [ref=e191]:
                    - heading "Demo Widget" [level=4] [ref=e192]
                    - generic [ref=e193]: £39.99
                  - paragraph [ref=e194]: Qty 1
                - generic [ref=e195]:
                  - generic [ref=e196]:
                    - generic [ref=e197]: Subtotal
                    - generic [ref=e198]: £39.99
                  - generic [ref=e199]:
                    - generic [ref=e200]: Tax
                    - generic [ref=e201]: £0.00
                  - generic [ref=e202]:
                    - generic [ref=e203]: Total
                    - generic [ref=e204]: £39.99
                - button "Pay £39.99" [ref=e205] [cursor=pointer]
            - generic [ref=e206]:
              - heading "Behind the scenes · CheckoutSaga.cs" [level=3] [ref=e207]
              - generic [ref=e208]:
                - generic [ref=e210]:
                  - generic [ref=e211]:
                    - heading "Choreography · cross-service event flow" [level=4] [ref=e212]
                    - paragraph [ref=e213]: Each row is one message — direct HTTP at the top, RabbitMQ events between services after that. No central transaction.
                  - generic [ref=e215]:
                    - generic [ref=e216]:
                      - generic [ref=e217]: Browser
                      - generic [ref=e218]: bff-web
                      - generic [ref=e219]: checkout-orchestrator
                      - generic [ref=e220]: catalog-svc
                      - generic [ref=e221]: payments-svc
                    - generic [ref=e222]:
                      - generic [ref=e223]:
                        - generic [ref=e228]:
                          - generic [ref=e229]: → POST /api/demo/saga/start
                          - generic [ref=e230]: Visitor clicks Pay
                        - generic [ref=e234]: ►
                      - generic [ref=e238]:
                        - generic [ref=e244]:
                          - generic [ref=e245]: → POST /api/checkouts
                          - generic [ref=e246]: BFF proxies to checkout-orchestrator
                        - generic [ref=e250]: ►
                      - generic [ref=e253]:
                        - generic [ref=e260]:
                          - generic [ref=e261]: StockReservationRequested
                          - generic [ref=e262]: "Saga: Initial → Initiated · publish via RabbitMQ"
                        - generic [ref=e266]: ►
                      - generic [ref=e268]:
                        - generic [ref=e274]: ◄
                        - generic [ref=e279]:
                          - generic [ref=e280]: StockReserved
                          - generic [ref=e281]: "Catalog: Product.ReserveStock + outbox publish"
                      - generic [ref=e283]:
                        - generic [ref=e290]:
                          - generic [ref=e291]: PaymentSessionRequested
                          - generic [ref=e292]: "Saga: Initiated → StockReserved · publish"
                        - generic [ref=e299]: ►
                      - generic [ref=e300]:
                        - generic [ref=e306]: ◄
                        - generic [ref=e314]:
                          - generic [ref=e315]: PaymentSessionCreated
                          - generic [ref=e316]: "Payments: create Stripe session + outbox publish"
                      - generic [ref=e317]:
                        - generic [ref=e323]: ◄
                        - generic [ref=e331]:
                          - generic [ref=e332]: PaymentCompleted
                          - generic [ref=e333]: "On Stripe webhook · saga: → Completed (final)"
                    - generic [ref=e334]:
                      - generic [ref=e335]: http = direct HTTP call · event = published via RabbitMQ outbox
                      - generic [ref=e336]: compensation = saga's failure-recovery path (red rows)
                - generic [ref=e337]:
                  - generic [ref=e339]: Bridge Events Log
                  - table [ref=e341]:
                    - rowgroup [ref=e342]:
                      - row "Time Event Status" [ref=e343]:
                        - columnheader "Time" [ref=e344]
                        - columnheader "Event" [ref=e345]
                        - columnheader "Status" [ref=e346]
                    - rowgroup [ref=e347]:
                      - row "Awaiting saga initiation..." [ref=e348]:
                        - cell "Awaiting saga initiation..." [ref=e349]
                - generic [ref=e350]:
                  - heading "Inject failure" [level=4] [ref=e351]
                  - button "Kill Inventory Mid-Saga" [ref=e353] [cursor=pointer]:
                    - generic [ref=e354]:
                      - img [ref=e355]
                      - generic [ref=e357]: Kill Inventory Mid-Saga
          - button "Under the hood" [ref=e359] [cursor=pointer]:
            - generic [ref=e360]:
              - img [ref=e361]
              - text: Under the hood
            - img [ref=e363]
      - generic [ref=e365]:
        - generic [ref=e366]: All commands target endpoints on the local_dev cluster.
        - generic [ref=e367]:
          - 'button "Try next: Refund saga" [ref=e368] [cursor=pointer]':
            - generic [ref=e369]: "Try next:"
            - generic [ref=e370]: Refund saga
            - img [ref=e371]
          - link "Read the deep dives" [ref=e373] [cursor=pointer]:
            - /url: "#deep-dives"
            - text: Read the deep dives
            - img [ref=e374]
  - button "Toggle live cluster console" [ref=e378] [cursor=pointer]:
    - img [ref=e380]
    - generic [ref=e382]: live
    - generic "BFF process not yet identified" [ref=e383]: bff:…
    - generic [ref=e384]: ·
    - generic "Frontend bundle started 2026-05-18T16:11:34.213Z (2m ago)" [ref=e385]: web:4f9a7e7 2m
    - generic [ref=e386]: ·
    - generic [ref=e387]: "0"
    - img [ref=e389]
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