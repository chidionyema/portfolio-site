# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: demos.spec.ts >> Demo Hub >> demo "ledger" renders without crash
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
          - list [ref=e56]:
            - listitem [ref=e57]:
              - link "Double-entry ledger" [ref=e58] [cursor=pointer]:
                - /url: "?demo=ledger"
                - generic [ref=e59]:
                  - img [ref=e60]
                  - generic [ref=e63]: Double-entry ledger
        - group [ref=e65]:
          - generic "Compliance" [ref=e66] [cursor=pointer]:
            - generic [ref=e67]: Compliance
            - img [ref=e68]
        - group [ref=e70]:
          - generic "Search pipeline" [ref=e71] [cursor=pointer]:
            - generic [ref=e72]: Search pipeline
            - img [ref=e73]
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
                - generic [ref=e112]: Financial integrity
                - generic [ref=e113]: Every cent is accounted for — twice
              - heading "Double-entry ledger" [level=2] [ref=e114]
              - paragraph [ref=e115]: Debit/credit pairs with balance invariant
              - link "View source" [ref=e117] [cursor=pointer]:
                - /url: https://github.com/chidionyema/haworks-platform/blob/main/src/Payouts/Payouts.Domain/Aggregates/LedgerEntry.cs
                - img [ref=e118]
                - generic [ref=e122]: View source
                - img [ref=e123]
        - generic [ref=e127]:
          - generic [ref=e129]:
            - generic [ref=e131]:
              - img [ref=e132]
              - generic [ref=e134]:
                - heading "The Problem" [level=4] [ref=e135]
                - paragraph [ref=e136]: Single-entry writes leave books out of balance.
            - generic [ref=e138]:
              - img [ref=e139]
              - generic [ref=e150]:
                - heading "The Solution" [level=4] [ref=e151]
                - paragraph [ref=e152]: Paired debit/credit entries in one atomic write.
          - generic [ref=e153]:
            - generic [ref=e154]:
              - generic [ref=e155]:
                - generic [ref=e156]: Gross
                - generic [ref=e157]: $39.99
              - generic [ref=e158]:
                - generic [ref=e159]: Commission
                - generic [ref=e160]: $4.00
              - generic [ref=e161]:
                - generic [ref=e162]: Net balance
                - generic [ref=e163]: —
            - generic [ref=e164]:
              - generic [ref=e165]:
                - heading "Ledger Controls" [level=2] [ref=e166]:
                  - img [ref=e167]
                  - text: Ledger Controls
                - generic [ref=e170]:
                  - generic [ref=e171]:
                    - generic [ref=e172]:
                      - generic [ref=e173]: Transaction
                      - generic [ref=e174]: READY
                    - generic [ref=e175]:
                      - generic [ref=e176]: Demo Widget × 1
                      - generic [ref=e177]: $39.99
                    - generic [ref=e178]: "Platform commission: 10% ($4.00)"
                  - button "Simulate Payment" [ref=e179] [cursor=pointer]
                  - generic [ref=e180]:
                    - generic [ref=e181]: What happens
                    - list [ref=e182]:
                      - listitem [ref=e183]: Payment event triggers ledger aggregate
                      - listitem [ref=e184]: CREDIT entry posted for full payment amount
                      - listitem [ref=e185]: DEBIT entry posted for platform commission
                      - listitem [ref=e186]: Both entries written atomically in one transaction
                      - listitem [ref=e187]: Sum of all entries always equals zero
              - generic [ref=e188]:
                - heading "Ledger Entries" [level=2] [ref=e189]:
                  - img [ref=e190]
                  - text: Ledger Entries
                - generic [ref=e192]:
                  - generic [ref=e193]:
                    - generic [ref=e194]: Type
                    - generic [ref=e195]: Description
                    - generic [ref=e196]: Amount
                    - generic [ref=e197]: Time
                  - generic [ref=e199]: Run a simulation to see entries
                  - generic [ref=e200]: Sum of all entries = 0 · double-entry invariant
          - button "Under the hood" [ref=e202] [cursor=pointer]:
            - generic [ref=e203]:
              - img [ref=e204]
              - text: Under the hood
            - img [ref=e206]
      - generic [ref=e208]:
        - generic [ref=e209]: All commands target endpoints on the local_dev cluster.
        - generic [ref=e210]:
          - 'button "Try next: GDPR erasure" [ref=e211] [cursor=pointer]':
            - generic [ref=e212]: "Try next:"
            - generic [ref=e213]: GDPR erasure
            - img [ref=e214]
          - link "Read the deep dives" [ref=e216] [cursor=pointer]:
            - /url: "#deep-dives"
            - text: Read the deep dives
            - img [ref=e217]
  - button "Toggle live cluster console" [ref=e221] [cursor=pointer]:
    - img [ref=e223]
    - generic [ref=e225]: live
    - generic "BFF process not yet identified" [ref=e226]: bff:…
    - generic [ref=e227]: ·
    - generic "Frontend bundle started 2026-05-18T16:11:34.213Z (2m ago)" [ref=e228]: web:4f9a7e7 2m
    - generic [ref=e229]: ·
    - generic [ref=e230]: "0"
    - img [ref=e232]
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