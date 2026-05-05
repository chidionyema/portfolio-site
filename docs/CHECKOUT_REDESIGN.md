# Checkout demo redesign — spec

This doc is the source of truth for the checkout/saga demo redesign. It
covers both the frontend layout work (in this repo) and the matching
backend payment consumer (in the sibling `ritualworks-platform` repo).
**Implementing agent: read this file end-to-end before touching code.**

## Why we're redesigning

Today's `CheckoutDemo.tsx` is engineering theatre with a checkout
*theme*: `Select Execution Path` / `Dispatch order` / `Buffer: f4a9b21c`.
There's no cart, no line items, no total, no customer-facing failure
framing. A senior-eng visitor reads it as a state-machine demo, not as
a credible distributed checkout. The race mode (`RaceLaneCard` pattern)
is the strongest piece — twin cards, winner/loser tone, trophy/X. The
redesign anchors on that visceral pattern and adds an honest customer
view alongside an honest engineering view.

## Layout — 45/55 split

Two panes, side-by-side on desktop, stacked on mobile.

### Left pane (45%) — "Your order"
A real-looking cart card. Treat it as if a customer landed on a Stripe
Checkout terminal screen.

- Header: **"Your order"** (`text-sm font-bold uppercase tracking-[0.2em]`,
  same heading style as other demos).
- Single line item: thumbnail rectangle (44×44 placeholder, `bg-white/5`,
  no image), product name "Demo Widget", unit price £39.99, qty 1.
- Subtotal / Tax (£0.00) / Total rows. Total in
  `text-3xl font-black tabular-nums`.
- Single primary button below the total:
  - **Idle**: "Pay £39.99" — white background, black text, `font-black`,
    same style class as today's dispatch button.
  - **Processing** (states drive the button label):
    - `Initiated` → "Reserving your items…" + `<Loader2 spin />`
    - `StockReservedState` → "Confirming payment…"
    - `ReadyForPayment` → "Completing order…"
    - `Completed` → ✓ "Order #ABC-123 confirmed" (background flips to
      success-tinted)
    - `Abandoned` (stock failure) → ✕ "Sorry — Demo Widget just sold out"
      (background flips to error-tinted)
    - `Abandoned` (payment failure) → ✕ "Card declined — your items are released"

That is the entire customer pane. No trace ids, no event log, no chaos
button, no engineering vocabulary.

### Right pane (55%) — "Behind the scenes"

Header: **"Behind the scenes · CheckoutSaga.cs"** in monospace
(`font-mono`). The header label is the trust signal — it explicitly
tells the reader the right pane is the engineering view.

Three stacked sections inside the right pane:

1. **Vertical saga ladder** (replaces today's horizontal step bar at
   `CheckoutDemo.tsx:256`). Five rows, top-to-bottom:
   - `Initiated` — "Checkout started"
   - `StockReservedState` — "Stock reserved"
   - `ReadyForPayment` — "Payment session created"
   - `Completed` — "Order completed"
   - `Abandoned` (rendered ONLY when reached, branching off whichever
     row was the last successful one) — "Compensation in flight"

   Each row shows BOTH the engineering name (`font-mono`, smaller) and
   the customer-facing label (regular weight, primary). Active row has
   `border-accent` + spinner; finished rows have `border-success` + check;
   pending rows are dim.

2. **Compensation drawer** — collapsed by default. Auto-expands on
   `Abandoned`. Renders bullets:
   - "Stock release: ✓ 1 unit returned to inventory"
   - "Published `StockReleaseRequestedEvent` to RabbitMQ"
   - Trace-id receipt strip for the compensation event.

   The compensation drawer is what proves this is a *saga* and not a
   sequential pipeline. It must be visible in `stockFailure` and
   `paymentFailure` runs.

3. **Bridge events log** — keep today's tabular log structure but **cut
   the fake `Buffer: f4a9b21c` at line 294 and the duplicate `Connected`
   badge at lines 297–300**. The page-level connection chip in
   `DemoHubLite` already serves the live-state purpose.

   Columns: time / step (engineering name + customer label inline) /
   status. Rows animate in.

## Per-scenario verdict

The current `Scenario` type at `CheckoutDemo.tsx:19` is `'success' |
'stockFailure' | 'paymentFailure' | 'stockRace'`. Wider list in
`demo-client.ts` includes `timeout`, `networkTimeout`, `partialFailure`
— **kill those three from the type and the picker**. Final scenarios:

| Scenario value | Picker label | Customer copy on failure | Keep/Drop |
|---|---|---|---|
| `success` | Pay (happy path) | n/a | Keep — default |
| `stockFailure` | Sold out | "Sorry — Demo Widget just sold out" | Keep |
| `paymentFailure` | Card declined | "Card declined — your items are released" | Keep |
| `stockRace` | Two browsers, one item | n/a | Keep, reframe — see below |
| `timeout` | — | — | **Drop** |
| `networkTimeout` | — | — | **Drop** |
| `partialFailure` | — | — | **Drop** |

The picker becomes a 4-up segmented control above the cart card (NOT
above the demo as it is today; the picker should sit inside the cart
context, like choosing a payment method). Use small text-only buttons,
not the chunky tabbed control of today.

### `stockRace` reframe

- Picker label: **"Two browsers, one item"** with sub-line "Black Friday
  rush — same product, two carts, only one wins."
- Customer pane in race mode: render two stacked mini-cart cards labelled
  "Browser A" and "Browser B" instead of one. Both show the same Pay
  button. Click "Run race" → both fire in parallel.
- Engineering pane in race mode: keep the existing `RaceLaneCard` twin
  layout. It's already the strongest piece.

## Receipt / completion state

After `Completed`:
- Customer pane swaps to a confirmation card: green check icon, **"Order
  confirmed"** as the heading, order number `#ABC-123` (use the saga's
  `OrderId`, format = first 6 chars uppercased + dash + next 3 chars),
  and the line "We'll email you a receipt at demo@haworks.dev".
- Below that: a "View order details" link with `href="#"` and
  `aria-disabled` + tooltip "Demo only — there's no real order page". This
  is the one place a fake link is OK because it's the sole trust signal
  closing the loop.
- A small text-only "Run another" button (muted) returns to idle.
- Right pane: saga ladder shows all four green; bridge log keeps the full
  event audit, scrollable. **No reset of the engineering pane**; the
  audit trail persists until the user clicks "Run another".
- Don't email anything. Don't redirect. Don't add a fake invoice download.

## Cut list (literal removals)

| File:line | What to cut | Why |
|---|---|---|
| `CheckoutDemo.tsx:213` | `<ChaosButton scenario="inventory-kill" …>` next to dispatch | Wrong altitude — admin action mixed with customer action. Move into right pane under "Behind the scenes" or remove entirely. |
| `CheckoutDemo.tsx:294` | `Buffer: f4a9b21c` hardcoded fake badge | Actively erodes trust |
| `CheckoutDemo.tsx:297-300` | Second "Connected" green dot | Duplicates the page-level chip in `DemoHubLite` |
| `CheckoutDemo.tsx:256-280` | Horizontal step bar | Replaced by vertical ladder |
| `CheckoutDemo.tsx:36-39` (and refs) | `timeout`/`networkTimeout`/`partialFailure` from `Scenario` type | Dropped scenarios |
| `CheckoutDemo.tsx:183-194` | "Click to start your first saga" tooltip | Pay button is unmistakable on its own |

## Customer-copy strings (use verbatim)

```
ORDER_HEADER         = 'Your order'
PAY_IDLE             = 'Pay £39.99'
PAY_RESERVING        = 'Reserving your items…'
PAY_CONFIRMING       = 'Confirming payment…'
PAY_COMPLETING       = 'Completing order…'
PAY_DONE_PREFIX      = 'Order'                  // followed by '#ABC-123 confirmed'
FAIL_SOLD_OUT        = 'Sorry — Demo Widget just sold out'
FAIL_CARD_DECLINED   = 'Card declined — your items are released'
RECEIPT_HEADER       = 'Order confirmed'
RECEIPT_EMAIL_LINE   = "We'll email you a receipt at demo@haworks.dev"
RECEIPT_VIEW_LINK    = 'View order details'
RECEIPT_VIEW_TOOLTIP = 'Demo only — there is no real order page'
RUN_ANOTHER          = 'Run another'
ENGINEERING_HEADER   = 'Behind the scenes · CheckoutSaga.cs'
COMPENSATION_HEADER  = 'Compensation'
SCENARIO_LABELS      = {
  success:       'Pay',
  stockFailure:  'Sold out',
  paymentFailure:'Card declined',
  stockRace:     'Two browsers, one item',
}
```

Define these as `const` exports at the top of `CheckoutDemo.tsx` (or in
`src/lib/copy.ts` if it's already used for similar strings).

## Backend work — `PaymentSessionRequestedConsumer` (demo mode)

Repo: `/Users/chidionyema/Documents/code/ritualworks-platform`
Branch: off `feat/portfolio-ui-completion-gemini`, working branch
`feat/checkout-payment-mock`.

Today's saga publishes `PaymentSessionRequestedEvent` after StockReserved
but no Payments service consumer handles it, so the saga stalls at
`StockReservedState`. Build the consumer in **demo mode** — bypasses
Stripe entirely.

### What to write
File: `src/Payments/Payments.Application/Consumers/PaymentSessionRequestedConsumer.cs`.

Pattern: mirror `Catalog/Catalog.Application/Consumers/StockReservationRequestedConsumer.cs`
(committed in `d36e239`). Same DI shape (publisher + logger), same
publish-before-save discipline, same outbox-friendly atomicity.

Behaviour:
- Inspect the consumer's MT message (`PaymentSessionRequestedEvent`).
- Read a config flag: `Payments:DemoMode` (bool, default `true` for now,
  flip to `false` once Stripe sandbox is wired). Document the flag in
  `appsettings.Development.json` if not present.
- **Demo mode (true)**:
  - Publish `PaymentSessionCreatedEvent` immediately with a synthetic
    `SessionId = Guid.NewGuid()`, `PaymentId = Guid.NewGuid()`,
    `CheckoutUrl = "https://demo.haworks.dev/checkout/" + SessionId`,
    `Provider = "demo-mock"`.
  - Then a 1-second delay (`Task.Delay(1000, ct)`).
  - Then publish `PaymentCompletedEvent` (Amount/Currency from the input
    event; PaymentId matches the one published above).
  - **Exception**: if the saga is for a `paymentFailure` scenario,
    publish `PaymentSessionFailedEvent` after the delay instead. The
    scenario is signalled by the request's `IdempotencyKey` containing
    `"paymentFailure"` (the BFF's `DemoController.StartSaga` sets it).
- **Production mode (false)**: delegate to the existing
  `StripeCheckoutSessionService` and let Stripe webhooks drive
  `PaymentCompletedEvent` later. Don't build that path now — leave a
  stub that throws `NotImplementedException`.

### Why demo mode and not Stripe sandbox

Stripe sandbox needs API keys, webhook tunneling for localhost, and
maintains a runtime dependency on Stripe's UX. The portfolio's pitch is
"the gateway is a swappable concern; what's interesting is everything
around it" — the mock keeps the saga in the spotlight. A senior eng will
read `Payments:DemoMode = true` in the consumer and respect it; they'd
be more annoyed by a flaky Stripe sandbox.

### Registration
Add to Payments' MassTransit registration site (search
`AddConsumer<PaymentWebhookValidatedConsumer>` in `Payments.Infrastructure`
to find it):

```csharp
mt.AddConsumer<PaymentSessionRequestedConsumer>();
```

(No special `ConsumerDefinition` wrapper needed unless the existing
release/reservation consumers' definition pattern is required for outbox
correlation — match what's already there in Payments.)

### Acceptance for backend
With Aspire running, drive from BFF:

```bash
SAGA=$(curl -sS -X POST http://localhost:5050/api/demo/saga/start \
  -H 'Content-Type: application/json' \
  -d '{"scenarioType":"success","simulatedDelayMs":500}' | jq -r .sessionId)
sleep 5
curl -sS http://localhost:5050/api/demo/saga/$SAGA | jq -r .status
```

Pass condition: status returns `"Completed"`. For `paymentFailure`, must
return `"Abandoned"` with `failureReason` matching `payment_session_failed`.

## Standards (non-negotiable)

These are bug-bait the implementing agent has hit before. Read carefully.

1. **No literal `...` placeholders in source files.** Ever. If you need
   to skip a chunk because you elided it from a read, comment it out
   with `// TODO(gemini): restore` and DO restore it before committing.
   A literal `...` outside of a JSX spread or function rest-param will
   break the build.

2. **No fabricated validation results.** When the spec says "run the
   acceptance command and paste the output", paste the literal terminal
   output verbatim. Don't summarise. Don't claim "verified passing" —
   show the bytes.

3. **No recursive directory listings.** No `ls -R`, no `tree`, no
   `grep -r` outside the explicit directories named in this doc. No
   `find .` that descends into `obj/`, `bin/`, `node_modules/`,
   `.vite/`, `dist/`, `logs/`. If you think you need a recursive scan,
   stop and report instead.

4. **Read budget.** No more than 6 source files before your first edit.
   The files you need are named in this doc (and in the cut-list
   table). If you find yourself wanting to read a 7th, stop and report.

5. **Atomic commits.** One commit per visibly-distinct phase
   (P1, P2, P3 below). Commit message format: `feat(checkout): <short>`
   for new behaviour, `refactor(checkout): <short>` for cut-list/layout,
   `fix(checkout): <short>` for bugs. Each commit must build cleanly
   (`npm run build`) before you start the next phase.

6. **No new dependencies.** No `npm i`. The existing stack is enough:
   Astro 4, React 18, Tailwind, framer-motion, lucide-react, signalr.

7. **Don't touch other demos.** Only `CheckoutDemo.tsx` (and
   `src/lib/copy.ts` if you put copy strings there) in this repo. Don't
   refactor `useDemoSession`, `signalr.ts`, `RequestReceipt.tsx`,
   `DemoHubLite.tsx`, or any other demo file. The wedge already shipped.

8. **SSR-safe state.** No `Math.random()` or `crypto.randomUUID()` in
   `useState` initialisers. Pattern to copy: see `HeroPreview.tsx` /
   `IdempotencyDemo.tsx` (empty initial + populate in `useEffect`).
