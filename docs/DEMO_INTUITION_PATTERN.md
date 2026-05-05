# Demo intuition pattern — Round 2 reworks

The Round 1 redesigns moved every demo from "click button, number changes"
to "click button, see the cluster respond." Good but not enough. The
IdempotencyDemo lands at a higher bar than the others because of a
specific pattern; this round applies that pattern to the three demos
with the most leverage.

## The pattern (read first, applies to every branch in this round)

A demo lands when the visitor performs **one click that recreates the
failure mode**, and the **fix is visible in the same frame as the failure.**

Idempotency works because:

1. The pain is universal and 5-second-old ("if my form double-submits, I
   get charged twice").
2. The interaction recreates the failure mode. The user *literally
   double-clicks*.
3. The outcome is verifiable without explanation. Same orderId comes
   back. Two strings, the visitor reads both, sees they match.
4. The fix is the visible thing. The idempotency key is rendered as a
   token, copy-to-clipboard. Mechanism is not hidden.

The other Round 1 redesigns missed at least one of those properties.
Round 2 closes the gap on three demos.

## Branch matrix

All three branches are off `portfolio-site` `main`. Each modifies one
demo file plus its own status file. No frozen-list files. No backend
changes (one branch flags a backend dependency — see below).

| # | Branch | File owned | Effort |
|---|---|---|---|
| 1 | `feat/rate-limiter-mash` | `src/components/demo/RateLimiterDemo.tsx` | S (~45 min) |
| 2 | `feat/saga-crash-button` | `src/components/demo/CheckoutDemo.tsx` | M (~1.5–2 h) — possibly backend-blocked, see below |
| 3 | `feat/cache-inval-customer-tab` | `src/components/demo/CacheInvalidationDemo.tsx` | M (~1.5 h) |

Apply `DEMO_DESIGN_PRINCIPLES.md` end-to-end to every branch. Apply the
isolation rule from `PARALLEL_DEMO_WORK.md` Hard Rule 0: each agent runs
in its own `git worktree`, NOT the main working dir.

---

## Branch 1 — `feat/rate-limiter-mash`

### What's wrong with Round 1

The token-bucket animation works visually but the user doesn't *cause*
the rate-limit. They click `Send 12` once and watch tokens drain. The
visitor isn't simulating an abusive client; they're observing the
result of one click.

### The interaction the visitor needs to perform

Add a primary button labelled **"Mash for 5 seconds"** that fires one
request every ~150ms for 5 seconds (~33 requests). The visitor literally
holds down the gesture by pressing it; the spam IS the failure mode.

While the button is mashing:

- Tokens drain visibly in real time (existing animation reused).
- After ~5 successful sends the bucket exhausts; subsequent fetches
  start returning `allowed: false`. Each rejected response renders an
  inline strip below the button: `429 — retry in Ns` with a live
  countdown driven by `bucket.retryAfterSeconds`.
- The cooldown countdown becomes the visible fix-in-frame: "the system
  is rate-limiting you, here's how long until you can spam again."

### What stays / changes

- KEEP: the token-bucket strip, drain animation, request log on left.
- KEEP: existing Send 1 / Send 5 / Send 12 buttons (relegate to a
  smaller secondary control row — they're useful for granular testing
  but not the headline).
- ADD: the Mash-for-5s button as the new primary action.
- ADD: the inline 429 + countdown.
- DROP: any "allowed/rejected" summary tiles that survived Round 1
  (the bucket itself + the 429 strip is enough).

### Acceptance

- Click the Mash button. Within ~750ms, tokens visibly drain.
- After ~5 sends, subsequent attempts surface `429 — retry in Ns`.
- The inline countdown ticks down to zero. After it does, the bucket
  visibly refills.
- `npm run build` green.
- No console hydration warnings.

### Out of scope / red flags

- No backend change. The existing `POST /api/demo/ratelimit/request`
  endpoint is sufficient.
- Don't replace the bucket animation; build on top of it.
- Don't add a graph. The bucket is the visualisation.

---

## Branch 2 — `feat/saga-crash-button`

### What's wrong with Round 1

The CheckoutDemo redesign added the customer pane / engineering pane
split. Good. But the visitor presses Pay, watches the ladder light up,
gets a Completed receipt. They never *cause* the failure mode the saga
exists to handle. Compensation is the soul of a saga; if the visitor
doesn't trigger it themselves, the demo has missed its thesis.

### The interaction the visitor needs to perform

On the **engineering pane** (right side), add a section labelled
**"Inject failure"** with two buttons:

1. **"Crash payment service"** — armed before clicking Pay. When clicked
   while the saga is at `StockReservedState`, causes the next
   PaymentSessionCreated/Completed event to fail.
2. **"Drop stock to zero"** — armed before clicking Pay. When clicked,
   causes StockReservation to fail on next checkout.

The visitor's flow: arm a crash → click Pay → watch the saga *react in
real time* to the failure they injected. Compensation drawer auto-pops
showing stock release / refund. Customer pane shows the human-readable
failure.

### Backend dependency — flag and stop if blocked

The two buttons need a way to instruct Payments / Catalog to fail on the
NEXT event consumption. Three plausible mechanisms:

a. **Reuse the existing `ChaosButton` infrastructure**. Search
   `src/components/demo/ChaosButton.tsx` and `triggerChaos()` for the
   wire. If `payments-kill` or similar scenarios already exist, just
   wire the new buttons to them. This is the preferred path.
b. **Reuse the `scenarioType` in the saga start**. The saga already
   accepts `paymentFailure` and `stockFailure` scenario types via the
   `IdempotencyKey` tag (per the recent backend work). Reframe the
   "Crash" buttons as scenario selectors that get passed to the saga
   on Pay click. This is acceptable but less visceral — the visitor
   selects a scenario before the click rather than crashing
   mid-flight.
c. **New BFF endpoint** (`/api/demo/chaos/payments-fail-once`) that
   sets a flag the next `PaymentSessionRequestedConsumer` reads. NOT
   in scope for this branch. If you need this, **stop and report**.

Try (a) first. If `triggerChaos` doesn't have a payments scenario,
fall back to (b). Document which path you took in the status file
under "Approach taken."

### What stays / changes

- KEEP: the customer pane (left) — order card with state-driven Pay
  button, cart line items, total.
- KEEP: the engineering pane (right) — saga ladder, bridge events log.
- KEEP: existing `ChaosButton` if it's already in the engineering pane
  (move/restyle if needed).
- ADD: `Inject failure` subsection in the engineering pane with the
  two buttons.
- ADD: visible "armed" state on each button when clicked but the saga
  hasn't started (e.g. red border, "armed" label).
- ADD: when armed-and-fired, the Pay button label briefly notes "with
  injected failure: payments" or similar so the visitor sees cause
  and effect.

### Acceptance

- Without arming any crash: click Pay → saga reaches Completed → success
  receipt.
- Arm "Crash payment service" → click Pay → saga reaches
  `StockReservedState`, then transitions to `Abandoned` with payment-
  failed reason. Compensation drawer auto-pops. Customer pane shows
  "Card declined — your items are released."
- Arm "Drop stock to zero" → click Pay → saga reaches `Abandoned` with
  stock-failed reason. Customer pane shows "Sorry — Demo Widget just
  sold out."
- `npm run build` green.

### Out of scope / red flags

- Don't touch backend code. If the chaos wire path requires it,
  stop and report (per option c above).
- Don't add a third "magic" failure type. Two scenarios are the
  product.

---

## Branch 3 — `feat/cache-inval-customer-tab`

### What's wrong with Round 1

The L1/L2/DB tier bars + propagation wave are technically correct but
abstract. The pain a cache solves — "user sees a stale price at
checkout" — isn't surfaced. Visitor watches bars empty without
understanding why it matters.

### The interaction the visitor needs to perform

Split the demo into a **two-tab metaphor**:

- **Tab A: "Admin"** — current update form. Visitor changes the price.
- **Tab B: "Customer"** — fake browser frame showing a "checkout page"
  with the same product. Updates after the cache invalidation
  propagates.

Both tabs are visible side-by-side (vertical split if there's room, or
stacked on narrower viewports). When the visitor updates the price in
Tab A, they SEE Tab B's price change after the pubsub fanout, with a
visible delay and a brief highlight pulse on the new value.

The L1/L2/DB tier bars stay as evidence of the propagation, but they're
secondary. The two tabs are the headline.

### What stays / changes

- KEEP: the L1/L2/DB tier bars and propagation wave animation
  (relocate underneath the two-tab view as evidence).
- KEEP: the existing read/update/invalidate buttons (move into Tab A).
- ADD: Tab B — a fake "browser frame" component (rounded rectangle
  with a faux URL bar reading `https://shop.example.com/widget`,
  showing the product name and the current cached price). No real
  fetch on its own; it shows whatever the most recent SignalR
  `OnCacheEvent` reported, OR (fallback) the most recent successful
  read from the BFF cache endpoint.
- ADD: highlight pulse on Tab B's price on update.
- ADD: a small "Status" line on Tab B: "Stale — refreshing in Ns" /
  "Live" so the visitor sees the brief stale window during
  invalidation.
- DROP: any tile that doesn't serve the two-tab framing.

### Acceptance

- Initial state: both tabs show the same price. Tab B reads "Live".
- Click Update Price in Tab A: Tab B's price updates within ~1s with
  a visible pulse. During the brief invalidation window, Tab B's
  status briefly shows "Stale".
- The L1/L2/DB tier bars below show the propagation wave.
- `npm run build` green.

### Out of scope / red flags

- No backend change. The existing wire is enough.
- Tab B is presentational only. Don't add a real second user/session;
  the framing is the demo.
- Don't simulate stale data. Use the BFF's actual `cacheInfo.source`
  field for honesty.

---

## Standards (every branch)

Same as previous round, listed for completeness:

1. **Each agent in its own git worktree.** Operator must `git worktree add`
   before launching. Agent's PHASE 0 (in `SUPER_PROMPT.md`) verifies
   it's not in the main working dir.
2. **No `...` placeholders in source.** Ever.
3. **No fabricated build / acceptance output.** Paste real bytes.
4. **No recursive directory listings.** No reads under `obj/`, `bin/`,
   `node_modules/`, `.vite/`, `dist/`, `logs/`.
5. **Read budget: ≤ 6 source files before first edit.** Docs don't
   count.
6. **One commit per visibly-distinct subtask.** Build green before
   committing.
7. **No new dependencies.**
8. **SSR-safe useState.** Empty initial + `useEffect` populate. Pattern
   reference: `HeroPreview.tsx`, `IdempotencyDemo.tsx`.
9. **Apply `DEMO_DESIGN_PRINCIPLES.md`.** If a choice doesn't satisfy
   at least 5 of the 10 principles, redesign.

## Per-branch status files

Pre-populated checklists live in:

- `docs/status/feat-rate-limiter-mash.md`
- `docs/status/feat-saga-crash-button.md`
- `docs/status/feat-cache-inval-customer-tab.md`

Tick `[x]` only after commit + green build + literal output pasted.

## Paste-ready prompt for any of these branches

The same `SUPER_PROMPT.md` works — agents will pick from the priority
list as before. To prefer Round 2 branches, edit the priority list in
your local copy of the prompt, OR direct an agent explicitly:

```
Skip the SUPER_PROMPT priority list. Your branch is <branch>.

Set up worktree (operator):
  cd /Users/chidionyema/Documents/code/portfolio-site
  git worktree add ../portfolio-site-<short> <branch>
  ( cd ../portfolio-site-<short> && npm install )

In the agent's terminal:
  cd /Users/chidionyema/Documents/code/portfolio-site-<short>
  <run gemini, paste the SUPER_PROMPT, but at PHASE 3 force-claim
   the named branch instead of walking the priority list>

Brief: docs/DEMO_INTUITION_PATTERN.md § "Branch <N>"
Status: docs/status/<branch>.md
```

Three branches, three terminals, ~3 hours wall-clock if run in parallel.
Merge protocol unchanged — non-ff merges, build green, push, on to the
next.
