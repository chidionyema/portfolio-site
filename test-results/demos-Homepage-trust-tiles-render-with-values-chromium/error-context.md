# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: demos.spec.ts >> Homepage >> trust tiles render with values
- Location: tests/e2e/demos.spec.ts:168:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Microservices')
Expected: visible
Error: strict mode violation: getByText('Microservices') resolved to 3 elements:
    1) <p class="text-xl md:text-2xl text-secondary leading-relaxed max-w-3xl mb-12 font-normal">Specializing in high-throughput microservices, re…</p> aka getByText('Specializing in high-')
    2) <div class="text-[9px] font-black uppercase tracking-[0.25em] text-muted">Microservices</div> aka getByText('Microservices', { exact: true })
    3) <p class="text-lg text-secondary leading-relaxed">This isn't a mock. Trigger a checkout to see a re…</p> aka getByText('This isn\'t a mock. Trigger a')

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('Microservices')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - button "Open cluster status details" [ref=e3] [cursor=pointer]:
    - generic [ref=e5]:
      - generic [ref=e6]:
        - generic [ref=e11]: connecting…
        - generic [ref=e13]: reconnecting
      - generic [ref=e16]: waiting for snapshot…
      - img [ref=e18]
  - banner:
    - generic:
      - link "Chidi Onyema":
        - /url: /
      - navigation "Primary":
        - link "Work":
          - /url: /work
        - link "Demos":
          - /url: /demos
        - link "Architecture":
          - /url: /architecture
        - link "Deep Dives":
          - /url: /#deep-dives
        - link "About":
          - /url: /about
      - generic:
        - link "Hire me":
          - /url: /contact
  - main [ref=e20]:
    - generic [ref=e22]:
      - generic [ref=e26]: "cluster: unknown"
      - generic [ref=e30]:
        - paragraph [ref=e31]: Senior .NET Engineer
        - heading "I build distributed systems that survive production." [level=1] [ref=e32]
        - paragraph [ref=e33]: Specializing in high-throughput microservices, resilient sagas, and zero-downtime infrastructure. Currently based in London.
        - generic [ref=e34]:
          - link "See the work" [ref=e35] [cursor=pointer]:
            - /url: /demos
            - text: See the work
            - img [ref=e36]
          - link "Contact me" [ref=e38] [cursor=pointer]:
            - /url: /contact
          - generic [ref=e39]:
            - link "LinkedIn" [ref=e40] [cursor=pointer]:
              - /url: https://linkedin.com/in/chidionyema
              - img [ref=e41]
            - link "GitHub" [ref=e43] [cursor=pointer]:
              - /url: https://github.com/chidionyema
              - img [ref=e44]
    - generic [ref=e48]:
      - generic [ref=e50]:
        - img [ref=e51]
        - generic [ref=e54]: "16"
        - generic [ref=e55]: Microservices
      - generic [ref=e57]:
        - img [ref=e58]
        - generic [ref=e60]: "159"
        - generic [ref=e61]: Architecture Guards
      - generic [ref=e63]:
        - img [ref=e64]
        - generic [ref=e66]: "13"
        - generic [ref=e67]: CI Test Suites
      - generic [ref=e69]:
        - img [ref=e70]
        - generic [ref=e72]: "50"
        - generic [ref=e73]: Roslyn Analyzers
    - generic [ref=e78]:
      - generic [ref=e79]:
        - heading "Evidence" [level=2] [ref=e80]
        - heading "A live .NET 9 cluster, running in your browser." [level=2] [ref=e81]
        - paragraph [ref=e82]: This isn't a mock. Trigger a checkout to see a real MassTransit saga state machine orchestrate across four microservices. Click 'Inject Fault' to see the cluster automatically compensate.
      - generic [ref=e85]:
        - generic [ref=e86]:
          - heading "Your order" [level=3] [ref=e87]
          - generic [ref=e90]:
            - radiogroup "Saga scenario" [ref=e91]:
              - radio "Pay" [checked] [ref=e92] [cursor=pointer]
              - radio "Sold out" [ref=e93] [cursor=pointer]
              - radio "Card declined" [ref=e94] [cursor=pointer]
              - radio "Two browsers, one item" [ref=e95] [cursor=pointer]
            - generic [ref=e98]:
              - generic [ref=e99]:
                - heading "Demo Widget" [level=4] [ref=e100]
                - generic [ref=e101]: £39.99
              - paragraph [ref=e102]: Qty 1
            - generic [ref=e103]:
              - generic [ref=e104]:
                - generic [ref=e105]: Subtotal
                - generic [ref=e106]: £39.99
              - generic [ref=e107]:
                - generic [ref=e108]: Tax
                - generic [ref=e109]: £0.00
              - generic [ref=e110]:
                - generic [ref=e111]: Total
                - generic [ref=e112]: £39.99
            - button "Pay £39.99" [ref=e113] [cursor=pointer]
        - generic [ref=e114]:
          - heading "Behind the scenes · CheckoutSaga.cs" [level=3] [ref=e115]
          - generic [ref=e116]:
            - generic [ref=e118]:
              - generic [ref=e119]:
                - heading "Choreography · cross-service event flow" [level=4] [ref=e120]
                - paragraph [ref=e121]: Each row is one message — direct HTTP at the top, RabbitMQ events between services after that. No central transaction.
              - generic [ref=e123]:
                - generic [ref=e124]:
                  - generic [ref=e125]: Browser
                  - generic [ref=e126]: bff-web
                  - generic [ref=e127]: checkout-orchestrator
                  - generic [ref=e128]: catalog-svc
                  - generic [ref=e129]: payments-svc
                - generic [ref=e130]:
                  - generic [ref=e131]:
                    - generic [ref=e136]:
                      - generic [ref=e137]: → POST /api/demo/saga/start
                      - generic [ref=e138]: Visitor clicks Pay
                    - generic [ref=e142]: ►
                  - generic [ref=e146]:
                    - generic [ref=e152]:
                      - generic [ref=e153]: → POST /api/checkouts
                      - generic [ref=e154]: BFF proxies to checkout-orchestrator
                    - generic [ref=e158]: ►
                  - generic [ref=e161]:
                    - generic [ref=e168]:
                      - generic [ref=e169]: StockReservationRequested
                      - generic [ref=e170]: "Saga: Initial → Initiated · publish via RabbitMQ"
                    - generic [ref=e174]: ►
                  - generic [ref=e176]:
                    - generic [ref=e182]: ◄
                    - generic [ref=e187]:
                      - generic [ref=e188]: StockReserved
                      - generic [ref=e189]: "Catalog: Product.ReserveStock + outbox publish"
                  - generic [ref=e191]:
                    - generic [ref=e198]:
                      - generic [ref=e199]: PaymentSessionRequested
                      - generic [ref=e200]: "Saga: Initiated → StockReserved · publish"
                    - generic [ref=e207]: ►
                  - generic [ref=e208]:
                    - generic [ref=e214]: ◄
                    - generic [ref=e222]:
                      - generic [ref=e223]: PaymentSessionCreated
                      - generic [ref=e224]: "Payments: create Stripe session + outbox publish"
                  - generic [ref=e225]:
                    - generic [ref=e231]: ◄
                    - generic [ref=e239]:
                      - generic [ref=e240]: PaymentCompleted
                      - generic [ref=e241]: "On Stripe webhook · saga: → Completed (final)"
                - generic [ref=e242]:
                  - generic [ref=e243]: http = direct HTTP call · event = published via RabbitMQ outbox
                  - generic [ref=e244]: compensation = saga's failure-recovery path (red rows)
            - generic [ref=e245]:
              - generic [ref=e247]: Bridge Events Log
              - table [ref=e249]:
                - rowgroup [ref=e250]:
                  - row "Time Event Status" [ref=e251]:
                    - columnheader "Time" [ref=e252]
                    - columnheader "Event" [ref=e253]
                    - columnheader "Status" [ref=e254]
                - rowgroup [ref=e255]:
                  - row "Awaiting saga initiation..." [ref=e256]:
                    - cell "Awaiting saga initiation..." [ref=e257]
            - generic [ref=e258]:
              - heading "Inject failure" [level=4] [ref=e259]
              - button "Kill Inventory Mid-Saga" [ref=e261] [cursor=pointer]:
                - generic [ref=e262]:
                  - img [ref=e263]
                  - generic [ref=e265]: Kill Inventory Mid-Saga
      - link "Explore the full pattern catalog →" [ref=e267] [cursor=pointer]:
        - /url: /demos
    - generic [ref=e272]:
      - generic [ref=e273]:
        - heading "Architecture" [level=2] [ref=e274]
        - heading "Patterns for scale and reliability." [level=2] [ref=e275]
        - paragraph [ref=e276]: Detailed breakdowns of the decisions that define the platform. Focusing on how we handle distributed state, data consistency, and failure at scale.
      - generic [ref=e277]:
        - generic [ref=e280]:
          - generic [ref=e281]:
            - heading "Saga vs Two-Phase Commit" [level=3] [ref=e282]
            - paragraph [ref=e283]: When you can have ACID across services, when you cannot, and why the answer in 2026 is almost always sagas.
          - generic [ref=e284]:
            - generic [ref=e285]: 11 min read min read
            - link "Read dive →" [ref=e286] [cursor=pointer]:
              - /url: /deep-dives/saga-vs-2pc
        - generic [ref=e289]:
          - generic [ref=e290]:
            - heading "The Transactional Outbox" [level=3] [ref=e291]
            - paragraph [ref=e292]: Why dual-write is the most expensive bug in event-driven systems, and the small amount of plumbing that fixes it forever.
          - generic [ref=e293]:
            - generic [ref=e294]: 9 min read min read
            - link "Read dive →" [ref=e295] [cursor=pointer]:
              - /url: /deep-dives/transactional-outbox
        - generic [ref=e298]:
          - generic [ref=e299]:
            - heading "Zero-Downtime Secret Rotation" [level=3] [ref=e300]
            - paragraph [ref=e301]: How we rotate database credentials and API keys in a live distributed system without dropping a single request.
          - generic [ref=e302]:
            - generic [ref=e303]: 8 min read min read
            - link "Read dive →" [ref=e304] [cursor=pointer]:
              - /url: /deep-dives/vault-rotation
      - link "View full technical archive" [ref=e306] [cursor=pointer]:
        - /url: /#writing
  - button "Toggle live cluster console" [ref=e309] [cursor=pointer]:
    - img [ref=e311]
    - generic [ref=e313]: live
    - generic "BFF process not yet identified" [ref=e314]: bff:…
    - generic [ref=e315]: ·
    - generic "Frontend bundle started 2026-05-18T16:11:34.213Z (8s ago)" [ref=e316]: web:4f9a7e7 8s
    - generic [ref=e317]: ·
    - generic [ref=e318]: "0"
    - img [ref=e320]
```

# Test source

```ts
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
  125 |     await page.waitForSelector('text=HWK001', { timeout: HYDRATION_TIMEOUT });
  126 |     await expect(page.getByText('HWK001')).toBeVisible();
  127 |     await expect(page.getByText('HWK002')).toBeVisible();
  128 |   });
  129 | 
  130 |   test('CTA links to demos', async ({ page }) => {
  131 |     await page.goto('/architecture');
  132 |     await page.waitForSelector('text=Try the Live Demos', { timeout: HYDRATION_TIMEOUT });
  133 |     const cta = page.getByText('Try the Live Demos');
  134 |     await expect(cta).toBeVisible();
  135 |     await cta.click();
  136 |     await page.waitForURL('**/demos**', { timeout: 10000 });
  137 |   });
  138 | });
  139 | 
  140 | // ─── Navigation ─────────────────────────────────────────────────
  141 | 
  142 | test.describe('Navigation', () => {
  143 |   test('all nav links resolve to 200', async ({ page }) => {
  144 |     const pages = ['/', '/work', '/demos', '/architecture', '/about', '/contact'];
  145 |     for (const path of pages) {
  146 |       const resp = await page.goto(path);
  147 |       expect(resp?.status(), `${path} should return 200`).toBe(200);
  148 |     }
  149 |   });
  150 | 
  151 |   test('deep dive articles resolve', async ({ page }) => {
  152 |     const slugs = ['saga-vs-2pc', 'transactional-outbox', 'vault-rotation'];
  153 |     for (const slug of slugs) {
  154 |       const resp = await page.goto(`/deep-dives/${slug}`);
  155 |       expect(resp?.status(), `/deep-dives/${slug}`).toBe(200);
  156 |     }
  157 |   });
  158 | 
  159 |   test('404 page renders for unknown routes', async ({ page }) => {
  160 |     const resp = await page.goto('/nonexistent-page');
  161 |     expect(resp?.status()).toBe(404);
  162 |   });
  163 | });
  164 | 
  165 | // ─── Trust Tiles ────────────────────────────────────────────────
  166 | 
  167 | test.describe('Homepage', () => {
  168 |   test('trust tiles render with values', async ({ page }) => {
  169 |     await page.goto('/');
  170 |     // Trust tiles use client:visible — wait for motion animation
  171 |     await page.waitForSelector('text=Microservices', { timeout: HYDRATION_TIMEOUT });
> 172 |     await expect(page.getByText('Microservices')).toBeVisible();
      |                                                   ^ Error: expect(locator).toBeVisible() failed
  173 |     await expect(page.getByText('Architecture Guards')).toBeVisible();
  174 |   });
  175 | 
  176 |   test('hero renders', async ({ page }) => {
  177 |     await page.goto('/');
  178 |     await expect(page.locator('h1')).toBeVisible({ timeout: HYDRATION_TIMEOUT });
  179 |   });
  180 | });
  181 | 
  182 | // ─── Mobile Responsive ─────────────────────────────────────────
  183 | 
  184 | test.describe('Mobile', () => {
  185 |   test.use({ viewport: { width: 375, height: 812 } });
  186 | 
  187 |   test('demo page renders and has mobile nav', async ({ page }) => {
  188 |     await page.goto('/demos?demo=circuit');
  189 |     await waitForDemoHub(page);
  190 | 
  191 |     // Mobile nav (accordion) should be visible
  192 |     const mobileNav = page.locator('.md\\:hidden').first();
  193 |     await expect(mobileNav).toBeVisible({ timeout: 10000 });
  194 |   });
  195 | 
  196 |   test('no horizontal overflow on demos', async ({ page }) => {
  197 |     await page.goto('/demos?demo=events');
  198 |     await waitForDemoHub(page);
  199 |     await page.waitForTimeout(2000);
  200 | 
  201 |     const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
  202 |     expect(scrollWidth).toBeLessThanOrEqual(380);
  203 |   });
  204 | 
  205 |   test('no horizontal overflow on architecture', async ({ page }) => {
  206 |     await page.goto('/architecture');
  207 |     await page.waitForTimeout(3000);
  208 | 
  209 |     const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
  210 |     expect(scrollWidth).toBeLessThanOrEqual(380);
  211 |   });
  212 | });
  213 | 
  214 | // ─── API Smoke Tests (skip when backend unavailable) ────────────
  215 | 
  216 | test.describe('API Smoke', () => {
  217 |   test.beforeAll(async ({ request }) => {
  218 |     const resp = await request.get(`${API_URL}/api/health/snapshot`).catch(() => null);
  219 |     if (!resp || resp.status() !== 200) {
  220 |       test.skip();
  221 |     }
  222 |   });
  223 | 
  224 |   test('health returns valid shape', async ({ request }) => {
  225 |     const resp = await request.get(`${API_URL}/api/health/snapshot`).catch(() => null);
  226 |     if (!resp) { test.skip(); return; }
  227 |     const body = await resp.json();
  228 |     expect(body).toHaveProperty('services');
  229 |     expect(body).toHaveProperty('systemStatus');
  230 |   });
  231 | 
  232 |   test('circuit breaker responds', async ({ request }) => {
  233 |     const resp = await request.post(`${API_URL}/api/demo/circuit/request`, {
  234 |       data: { shouldFail: false },
  235 |     }).catch(() => null);
  236 |     if (!resp) { test.skip(); return; }
  237 |     expect(resp.status()).toBe(200);
  238 |     const body = await resp.json();
  239 |     expect(['Closed', 'Open', 'HalfOpen']).toContain(body.circuitState);
  240 |   });
  241 | 
  242 |   test('idempotency responds', async ({ request }) => {
  243 |     const resp = await request.post(`${API_URL}/api/demo/idempotency/process`, {
  244 |       data: { action: 'CreateOrder', payload: {} },
  245 |       headers: { 'X-Idempotency-Key': `e2e-${Date.now()}`, 'X-Demo-Session': 'e2e' },
  246 |     }).catch(() => null);
  247 |     if (!resp) { test.skip(); return; }
  248 |     expect(resp.status()).toBe(200);
  249 |     expect(await resp.json()).toHaveProperty('isDuplicate');
  250 |   });
  251 | 
  252 |   test('ledger simulate returns debit+credit', async ({ request }) => {
  253 |     const resp = await request.post(`${API_URL}/api/demo/ledger/simulate`, {
  254 |       data: { amountCents: 3999 },
  255 |       headers: { 'X-Demo-Session': 'e2e' },
  256 |     }).catch(() => null);
  257 |     if (!resp) { test.skip(); return; }
  258 |     expect(resp.status()).toBe(200);
  259 |     const body = await resp.json();
  260 |     expect(body.entries).toHaveLength(2);
  261 |     expect(body.entries[0].type).toBe('credit');
  262 |     expect(body.entries[1].type).toBe('debit');
  263 |   });
  264 | 
  265 |   test('search returns pipeline info', async ({ request }) => {
  266 |     const resp = await request.get(`${API_URL}/api/demo/search?q=widget`).catch(() => null);
  267 |     if (!resp) { test.skip(); return; }
  268 |     expect(resp.status()).toBe(200);
  269 |     expect((await resp.json()).pipeline).toContain('Debezium');
  270 |   });
  271 | });
  272 | 
```