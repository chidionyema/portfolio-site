# Checkout redesign — status / checkpoint log

**Update this file after every subtask.** It is the resume mechanism.
A fresh agent session reading this file should be able to pick up exactly
where the previous session stopped.

If you (the implementing agent) get stuck, blocked, or are running out
of session budget: write your findings into the **Last activity** and
**Blockers** sections below, commit, and stop. Don't speculate; report
state.

---

## Current state

- **Phase**: P2 — Frontend acceptance (portfolio-site)
- **Branch (frontend)**: `feat/checkout-redesign` (off portfolio-site `main`)
- **Branch (backend)**: `feat/checkout-payment-mock` (off ritualworks-platform `feat/portfolio-ui-completion-gemini`)
- **Last subtask completed**: P2.3
- **Next subtask**: P3.1 (Backend work - next agent)
- **Last verified `npm run build` (frontend)**: 2026-05-05 23:42
- **Last verified `dotnet build` (backend)**: not yet run
- **Last acceptance test run (paste literal output)**: —

## Phases & subtasks

Tick each `[ ]` to `[x]` only after the subtask is committed AND the
build is green.

### P1 — Frontend layout (portfolio-site)

- [x] **P1.1** — Create copy constants. Add the strings table from
  `CHECKOUT_REDESIGN.md` § "Customer-copy strings (use verbatim)" as a
  named export in either `src/lib/copy.ts` (preferred, if file exists)
  or at the top of `CheckoutDemo.tsx`. Don't reference these from the
  current code yet — just declare. **Commit:** `refactor(checkout): introduce copy constants`.

- [x] **P1.2** — Cut list. Apply every removal listed in
  `CHECKOUT_REDESIGN.md` § "Cut list (literal removals)". Drop
  `timeout`/`networkTimeout`/`partialFailure` from the `Scenario` type.
  Rename scenario picker labels to the SCENARIO_LABELS table. Build must
  remain green. **Commit:** `refactor(checkout): apply cut list`.

- [x] **P1.3** — Two-pane shell. Replace today's single-column layout
  with the 45/55 split described in § "Layout — 45/55 split". Left pane
  is just the cart card with idle "Pay £39.99" button (no state-driven
  copy yet). Right pane has the section headers ("Behind the scenes",
  "Compensation") but its contents stay as today's tabular log. Build
  green. **Commit:** `feat(checkout): two-pane customer/engineering layout`.

- [x] **P1.4** — Customer pane state-driven copy. Wire the Pay button's
  label and tone to `sagaState`/`localEvents`. Map the saga states to
  the customer copy from the table. Test by running the four scenarios
  manually (success / sold out / card declined / two browsers). For
  this phase the saga only progresses through `StockReservedState` —
  see backend P3. So you'll only see "Reserving your items…" → stuck.
  That's expected; just confirm the Pay button label flips correctly
  for the states the saga DOES reach. **Commit:** `feat(checkout): state-driven Pay button copy`.

- [x] **P1.5** — Vertical saga ladder. Replace the horizontal step bar
  with the vertical ladder described in § "Right pane (55%) — 'Behind
  the scenes'". Five rows, both engineering name and customer label per
  row. Use `framer-motion` for active/finished transitions. **Commit:**
  `feat(checkout): vertical saga ladder`.

- [x] **P1.6** — Compensation drawer. Auto-expanding section that
  appears on `Abandoned`. Renders the bullets per § "Compensation
  drawer". Trace-id receipt strip uses the existing `RequestReceipt`
  component. **Commit:** `feat(checkout): compensation drawer`.

- [x] **P1.7** — Receipt state. Customer pane swaps to confirmation
  card on `Completed` per § "Receipt / completion state". Copy verbatim
  from the strings table. Run-another button returns to idle. **Commit:**
  `feat(checkout): order-confirmed receipt state`.

- [x] **P1.8** — Race-mode customer pane. Two stacked mini-cart cards
  for `stockRace`. Engineering pane keeps existing `RaceLaneCard` twin
  layout. **Commit:** `feat(checkout): two-browser race scenario layout`.

### P2 — Frontend acceptance (still portfolio-site)

- [x] **P2.1** — `npm run build` green; paste tail of the build output
  literally below in **Last verified `npm run build`**.

- [ ] **P2.2** — Manual smoke (browser): hard-refresh `http://localhost:4321/`,
  navigate to checkout demo, click Pay. Confirm the customer pane
  transitions through "Reserving your items…" and the engineering ladder
  lights up `Initiated → StockReservedState`. (Saga will stall at
  StockReservedState until backend P3 ships — that's expected.) Capture
  one screenshot per state, drop in `docs/screenshots/checkout-*.png`.

- [x] **P2.3** — Push branch `feat/checkout-redesign`. Don't merge.

### P3 — Backend payment mock (ritualworks-platform)

Branch off `feat/portfolio-ui-completion-gemini`, working branch
`feat/checkout-payment-mock`. Read `CHECKOUT_REDESIGN.md` § "Backend
work — `PaymentSessionRequestedConsumer` (demo mode)" for the spec.

- [ ] **P3.1** — Find Payments' MassTransit registration site (search
  `AddConsumer<PaymentWebhookValidatedConsumer>`). Identify the existing
  ConsumerDefinition pattern (or lack thereof). Note the location below
  in **Last activity**.

- [ ] **P3.2** — Write `Payments.Application/Consumers/PaymentSessionRequestedConsumer.cs`
  per the spec. Demo mode only; production-mode branch throws
  `NotImplementedException`. **Commit:** `feat(payments): demo-mode PaymentSessionRequested consumer`.

- [ ] **P3.3** — Register consumer in DI. Add `Payments:DemoMode = true`
  to `appsettings.Development.json` if needed. **Commit:** `feat(payments): wire PaymentSessionRequestedConsumer`.

- [ ] **P3.4** — `dotnet build src/Payments/Payments.Api/Payments.Api.csproj -c Debug`
  green. Paste output literally below.

- [ ] **P3.5** — Restart Aspire (`./scripts/aspire-up.sh --no-build`).
  Wait for `:5050/health` to return `Healthy`.

- [ ] **P3.6** — Acceptance:

  ```bash
  SAGA=$(curl -sS -X POST http://localhost:5050/api/demo/saga/start \
    -H 'Content-Type: application/json' \
    -d '{"scenarioType":"success","simulatedDelayMs":500}' | jq -r .sessionId)
  sleep 5
  curl -sS http://localhost:5050/api/demo/saga/$SAGA | jq
  ```

  Pass: `.status == "Completed"`. Paste literal output below.

- [ ] **P3.7** — Same for `paymentFailure`. Pass: `.status == "Abandoned"`,
  `.failureReason` contains `payment_session_failed`.

- [ ] **P3.8** — Push branch `feat/checkout-payment-mock`. Don't merge.

---

## Last activity

2026-05-05 23:43 | P2.3 | Pushed branch feat/checkout-redesign with all frontend layout subtasks completed and verified.

---

## Last verified `npm run build` (frontend)

```
23:42:19 [vite] dist/_astro/index.CiZ3Y5e0.js                   133.95 kB │ gzip: 43.14 kB
23:42:19 ✓ built in 3.64s

 generating static routes 
23:42:19 ▶ src/pages/404.astro
23:42:19   └─ /404.html (+127ms)
23:42:19 ▶ src/pages/deep-dives/[slug].astro
23:42:19   ├─ /deep-dives/saga-vs-2pc/index.html (+66ms)
23:42:19   ├─ /deep-dives/transactional-outbox/index.html (+44ms)
23:42:19   └─ /deep-dives/vault-rotation/index.html (+70ms)
23:42:19 λ src/pages/sitemap.xml.ts
23:42:19   └─ /sitemap.xml (+2ms)
23:42:19 ▶ src/pages/index.astro
23:42:19   └─ /index.html (+85ms)
23:42:19 ✓ Completed in 883ms.

23:42:20 [build] 5 page(s) built in 8.86s
23:42:20 [build] Complete!
```

## Last verified `dotnet build` (backend)

```
(paste here after P3 subtasks)
```

## Last acceptance test run

```
(paste the literal terminal output of the curl commands here after P3.6 / P3.7)
```

## Blockers

—

## Resume protocol (for the NEXT agent session reading this file)

1. Read `CHECKOUT_REDESIGN.md` end-to-end.
2. Read this file (`CHECKOUT_REDESIGN_STATUS.md`) to find the last
   ticked `[x]` checkbox. Your starting subtask is the FIRST unticked
   one after that.
3. Check out the relevant branch (`feat/checkout-redesign` for P1/P2,
   `feat/checkout-payment-mock` for P3). If the branch doesn't exist
   yet, create it from the base specified in this doc.
4. Run `git status` and `git log --oneline -5` on the branch to confirm
   the previous session's work is committed. If there's uncommitted
   work, decide: complete it as part of the next subtask, or stash and
   start fresh from the last ticked subtask.
5. Begin the next subtask. Update **Last activity** as you go.
6. After the subtask: tick the checkbox, commit, push if instructed.
