# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: demos.spec.ts >> Architecture Page >> analyzer examples show HWK rule IDs
- Location: tests/e2e/demos.spec.ts:123:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('HWK001')
Expected: visible
Error: strict mode violation: getByText('HWK001') resolved to 2 elements:
    1) <h2 class="font-display tracking-tight text-primary text-xl md:text-2xl font-medium leading-snug mb-8">Custom Roslyn Analyzers (HWK001–050)</h2> aka getByRole('heading', { name: 'Custom Roslyn Analyzers (' })
    2) <span class="text-accent font-black">HWK001</span> aka getByText('HWK001', { exact: true })

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('HWK001')

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
  - banner [ref=e20]:
    - generic [ref=e21]:
      - link "Chidi Onyema" [ref=e22] [cursor=pointer]:
        - /url: /
      - navigation "Primary" [ref=e23]:
        - link "Work" [ref=e24] [cursor=pointer]:
          - /url: /work
        - link "Demos" [ref=e25] [cursor=pointer]:
          - /url: /demos
        - link "Architecture" [ref=e26] [cursor=pointer]:
          - /url: /architecture
        - link "Deep Dives" [ref=e27] [cursor=pointer]:
          - /url: /#deep-dives
        - link "About" [ref=e28] [cursor=pointer]:
          - /url: /about
      - link "Hire me" [ref=e30] [cursor=pointer]:
        - /url: /contact
  - main [ref=e31]:
    - generic [ref=e34]:
      - generic [ref=e35]:
        - heading "Platform Engineering" [level=2] [ref=e36]
        - heading "16 microservices. 159 architecture guards. 50 custom analyzers." [level=1] [ref=e37]
        - paragraph [ref=e38]: Every line enforced in CI. No exceptions, no overrides, no "we'll fix it later."
      - generic [ref=e39]:
        - generic [ref=e40]:
          - heading "Compile-Time Enforcement" [level=2] [ref=e41]:
            - img [ref=e42]
            - text: Compile-Time Enforcement
          - heading "Custom Roslyn Analyzers (HWK001–050)" [level=2] [ref=e46]
        - generic [ref=e47]:
          - generic [ref=e50]:
            - generic [ref=e51]:
              - generic [ref=e52]: HWK001
              - generic [ref=e53]: build error
            - generic [ref=e54]: No SaveChangesAsync in MassTransit consumers
            - generic [ref=e55]:
              - img [ref=e56]
              - generic [ref=e60]: await _dbContext.SaveChangesAsync(); // Outbox commits automatically
            - generic [ref=e61]:
              - img [ref=e62]
              - generic [ref=e65]: // Mutations via EF tracked entities // MassTransit outbox commits on success
            - paragraph [ref=e66]: Fires at compile time, not at code review.
          - generic [ref=e69]:
            - generic [ref=e70]:
              - generic [ref=e71]: HWK002
              - generic [ref=e72]: build error
            - generic [ref=e73]: No Guid.NewGuid() inside Polly retry
            - generic [ref=e74]:
              - img [ref=e75]
              - generic [ref=e79]: "policy.ExecuteAsync(() => { var key = Guid.NewGuid(); // new per retry! });"
            - generic [ref=e80]:
              - img [ref=e81]
              - generic [ref=e84]: "var key = Guid.NewGuid(); policy.ExecuteAsync(() => { Call(key); // same across retries });"
            - paragraph [ref=e85]: Fires at compile time, not at code review.
          - generic [ref=e88]:
            - generic [ref=e89]:
              - generic [ref=e90]: HWK035
              - generic [ref=e91]: build error
            - generic [ref=e92]: No hardcoded currency strings
            - generic [ref=e93]:
              - img [ref=e94]
              - generic [ref=e98]: var amount = new Money(100, "USD"); // What about GBP, EUR customers?
            - generic [ref=e99]:
              - img [ref=e100]
              - generic [ref=e103]: var amount = new Money( 100, options.DefaultCurrency ); // From config
            - paragraph [ref=e104]: Fires at compile time, not at code review.
      - generic [ref=e105]:
        - generic [ref=e106]:
          - heading "CI Enforcement" [level=2] [ref=e107]:
            - img [ref=e108]
            - text: CI Enforcement
          - heading "159 Architecture Guards + 12 NetArchTest Rules" [level=2] [ref=e110]
          - paragraph [ref=e111]: Regex patterns and assembly-level rules run on every PR. A single violation blocks the merge.
        - generic [ref=e112]:
          - generic [ref=e115]:
            - img [ref=e116]
            - generic [ref=e118]:
              - generic [ref=e119]: No PublishAsync without SaveChanges
              - generic [ref=e120]: Events written to outbox must be flushed
          - generic [ref=e123]:
            - img [ref=e124]
            - generic [ref=e126]:
              - generic [ref=e127]: No BeginTransactionAsync in consumers
              - generic [ref=e128]: MassTransit outbox provides the transaction
          - generic [ref=e131]:
            - img [ref=e132]
            - generic [ref=e134]:
              - generic [ref=e135]: No localhost fallback in config
              - generic [ref=e136]: Containers resolve via service mesh, not loopback
          - generic [ref=e139]:
            - img [ref=e140]
            - generic [ref=e142]:
              - generic [ref=e143]: No positional records for events
              - generic [ref=e144]: MassTransit cannot deserialize positional constructors
          - generic [ref=e147]:
            - img [ref=e148]
            - generic [ref=e150]:
              - generic [ref=e151]: No raw Testcontainers in tests
              - generic [ref=e152]: Must use SharedTestPostgres singleton
          - generic [ref=e155]:
            - img [ref=e156]
            - generic [ref=e158]:
              - generic [ref=e159]: No idempotency key inside Polly retry
              - generic [ref=e160]: Key changes per attempt, defeating idempotency
        - link "View all 159 guards on GitHub" [ref=e162] [cursor=pointer]:
          - /url: https://github.com/chidionyema/haworks-platform/blob/main/tests/Platform.ArchitecturalGuards/PlatformGuardTests.cs
          - img [ref=e163]
          - text: View all 159 guards on GitHub
      - generic [ref=e165]:
        - generic [ref=e166]:
          - heading "Financial Integrity" [level=2] [ref=e167]:
            - img [ref=e168]
            - text: Financial Integrity
          - heading "Double-Entry Ledger (Payouts Service)" [level=2] [ref=e172]
        - generic [ref=e175]:
          - generic [ref=e176]:
            - generic [ref=e177]:
              - generic [ref=e178]: credit
              - generic [ref=e179]: Seller Payable
            - generic [ref=e180]: +£39.99Payment received
          - generic [ref=e181]:
            - generic [ref=e182]:
              - generic [ref=e183]: debit
              - generic [ref=e184]: Platform Escrow
            - generic [ref=e185]: "-£39.99Funds reserved"
          - generic [ref=e187]:
            - generic [ref=e188]:
              - generic [ref=e189]: debit
              - generic [ref=e190]: Seller Payable
            - generic [ref=e191]: "-£39.99Payout disbursed"
          - generic [ref=e192]:
            - generic [ref=e193]:
              - generic [ref=e194]: credit
              - generic [ref=e195]: Bank (Stripe)
            - generic [ref=e196]: +£39.99Wire initiated
          - generic [ref=e198]: Sum of all entries = £0.00 (invariant enforced by DB CHECK constraint)
      - generic [ref=e199]:
        - generic [ref=e200]:
          - heading "Compliance Engineering" [level=2] [ref=e201]:
            - img [ref=e202]
            - text: Compliance Engineering
          - heading "GDPR Article 17 Erasure Saga" [level=2] [ref=e205]
        - generic [ref=e207]:
          - generic [ref=e208]:
            - generic [ref=e209]:
              - generic [ref=e210]:
                - generic [ref=e211]: Request
                - generic [ref=e212]: User submits
              - img [ref=e213]
            - generic [ref=e215]:
              - generic [ref=e216]:
                - generic [ref=e217]: Orders
                - generic [ref=e218]: PII scrubbed
              - img [ref=e219]
            - generic [ref=e221]:
              - generic [ref=e222]:
                - generic [ref=e223]: Payments
                - generic [ref=e224]: PII scrubbed
              - img [ref=e225]
            - generic [ref=e227]:
              - generic [ref=e228]:
                - generic [ref=e229]: Identity
                - generic [ref=e230]: Account deleted
              - img [ref=e231]
            - generic [ref=e233]:
              - generic [ref=e234]:
                - generic [ref=e235]: Audit
                - generic [ref=e236]: Anonymized
              - img [ref=e237]
            - generic [ref=e240]:
              - generic [ref=e241]: Confirmed
              - generic [ref=e242]: < 7 days
          - paragraph [ref=e243]: 7-day compliance window · stall detection at 24h · audit records anonymized, not deleted
      - generic [ref=e244]:
        - generic [ref=e245]:
          - heading "Event Backbone" [level=2] [ref=e246]:
            - img [ref=e247]
            - text: Event Backbone
          - heading "CDC Pipeline (Debezium → Kafka → Elasticsearch)" [level=2] [ref=e251]
        - generic [ref=e253]:
          - generic [ref=e254]:
            - generic [ref=e255]:
              - generic [ref=e256]:
                - img [ref=e257]
                - generic [ref=e261]: PostgreSQL
                - generic [ref=e262]: WAL stream
              - img [ref=e263]
            - generic [ref=e265]:
              - generic [ref=e266]:
                - img [ref=e267]
                - generic [ref=e271]: Debezium
                - generic [ref=e272]: CDC connector
              - img [ref=e273]
            - generic [ref=e275]:
              - generic [ref=e276]:
                - img [ref=e277]
                - generic [ref=e280]: Kafka
                - generic [ref=e281]: Event log
              - img [ref=e282]
            - generic [ref=e285]:
              - img [ref=e286]
              - generic [ref=e289]: Elasticsearch
              - generic [ref=e290]: Search index
          - paragraph [ref=e291]: No dual-write, no polling. The WAL is the source of truth. Sub-second propagation.
      - generic [ref=e292]:
        - generic [ref=e293]:
          - heading "Test Strategy" [level=2] [ref=e294]:
            - img [ref=e295]
            - text: Test Strategy
          - heading "Consumer-Driven Contract Tests (Pact)" [level=2] [ref=e297]
        - generic [ref=e299]:
          - generic [ref=e300]:
            - generic [ref=e301]: "13"
            - generic [ref=e302]: Contract Suites
          - generic [ref=e303]:
            - generic [ref=e304]: "159"
            - generic [ref=e305]: Arch Guards
          - generic [ref=e306]:
            - generic [ref=e307]: "50"
            - generic [ref=e308]: Roslyn Rules
      - generic [ref=e309]:
        - generic [ref=e310]:
          - heading "Developer Experience" [level=2] [ref=e311]:
            - img [ref=e312]
            - text: Developer Experience
          - heading ".NET Aspire Orchestration" [level=2] [ref=e315]
        - generic [ref=e318]: "$ dotnet run --project AppHost 13 infrastructure containers 16 microservices 1 command Dashboard: http://localhost:15888"
      - generic [ref=e319]:
        - paragraph [ref=e320]: Want to see these patterns in action?
        - link "Try the Live Demos →" [ref=e321] [cursor=pointer]:
          - /url: /demos
  - button "Toggle live cluster console" [ref=e324] [cursor=pointer]:
    - img [ref=e326]
    - generic [ref=e328]: live
    - generic "BFF process not yet identified" [ref=e329]: bff:…
    - generic [ref=e330]: ·
    - generic "Frontend bundle started 2026-05-18T16:11:34.213Z (8s ago)" [ref=e331]: web:4f9a7e7 8s
    - generic [ref=e332]: ·
    - generic [ref=e333]: "0"
    - img [ref=e335]
```

# Test source

```ts
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
  125 |     await page.waitForSelector('text=HWK001', { timeout: HYDRATION_TIMEOUT });
> 126 |     await expect(page.getByText('HWK001')).toBeVisible();
      |                                            ^ Error: expect(locator).toBeVisible() failed
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
  172 |     await expect(page.getByText('Microservices')).toBeVisible();
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
```