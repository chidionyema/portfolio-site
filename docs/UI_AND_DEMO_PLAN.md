---
title: UI + Demo Plan
status: working-doc
last_reviewed: 2026-05-04
---

# Portfolio Site — UI + Demo Plan

Working roadmap captured after a top-to-bottom review on 2026-05-04. Source of truth is the **code**; this doc tracks intent and gaps. Update as items land or change.

The site has nine interactive demos backed by the haworks-platform .NET 9 API. The shell, aesthetic, and demo plumbing (REST + SignalR) are in good shape. The remaining work splits into three buckets: UX fixes, deepening existing demos, and surfacing backend capabilities that are currently invisible.

---

## Session log — 2026-05-04

Eight of the original nine planned items shipped. Each bullet links to the section with full detail.

- 1.1 Deep-dive links — done.
- 1.2 "Why this matters" cards — done.
- 1.3 `traceId` propagation + hub-level `<TraceViewer>` — done.
- 2.1 Saga `stockRace` — done. (`webhookFirst` deferred — see 2.1.)
- 2.2 Circuit Breaker HALF-OPEN visualization — done. (Jitter visualization deferred — see 2.2.)
- 2.3 Outbox pause-relay — done.
- 2.4 Idempotency replay window + concurrent collision — done.
- 2.5 Cache stampede across replicas — **deferred this session**, fully scoped below with estimate.

Side fixes applied during the session: CORS origin (`localhost:4321` added), `[IgnoreAntiforgeryToken]` on `DemoController`, frontend `.env.development` realigned to the actual API port (7121), `EventFlowEvent` and `SagaStepEvent` TS types corrected to match the wire format, saga SignalR group routing fixed.

---

## Bucket 1 — UX fixes

### 1.1 Wire each demo to its deep-dive — *shipped*

`DemoMeta.deepDiveSlug?` added; mapped on the three demos with articles (`checkout` → `saga-vs-2pc`, `events` → `transactional-outbox`, `vault` → `vault-rotation`). `DemoHubLite` renders a "Read the spec →" CTA in the demo header when a slug exists. The other six demos suppress the link until articles land.

### 1.2 "Why this matters" context card on every demo — *shipped*

`<DemoContext>` reads from `src/lib/demo-context.ts` (a copy table keyed by demoId, three cells per demo: Problem / Mechanism / What to watch). Mounted once in `DemoHubLite` so adding a new demo just requires one entry in the copy table.

### 1.3 Propagate `traceId` and mount `<TraceViewer>` — *shipped*

Tiny pub/sub `traceStore` in `src/lib/trace-store.ts` plus a `useLatestTraceId()` hook backed by `useSyncExternalStore`. `useDemoSession.executeCommand` pushes the `X-Trace-Id` from every successful response. `DemoHubLite` mounts `<TraceViewer />` once below the demo content, clearing on demo switch. The dead `activeTraceId` state in `CheckoutDemo` is gone.

---

## Bucket 2 — Deepen existing demos

### 2.1 Saga — concurrent stock race + out-of-order webhook

- **`stockRace`** — *shipped 2026-05-04.* Backend seeds the chosen product to stock 5, creates two orders (Cart_A, Cart_B) each requesting 3 units, publishes both `CheckoutInitiatedEvent`s. The existing `StockReservationConsumer` decides the race via its atomic `UPDATE ... WHERE StockQuantity >= n` — no fakery. Frontend renders dual swimlanes with per-lane state, status badge, and event log; trophy/error icon marks the winner.
- **`webhookFirst`** — *deferred.* Crosses webhooks + payment session + saga state machine; needs a separate pass to be honest (the demo must show the order being settled out of band by the webhook handler, then the consumer observing that and skipping). **Estimate: 5–7 hours.** ≈2h backend (synthetic Stripe webhook injection + handler that settles before the saga's payment consumer fires; verify saga state machine handles the early-settled state gracefully). ≈2h frontend (timeline visualization showing webhook arrival, then saga consumer observing and skipping). ≈1h end-to-end test + plan-doc writeup. Add a buffer for the saga state machine reads — this is the riskiest part.

**Side fix landed during this work** — saga events were silently dropped before. The frontend joins the SignalR group `demo-{localUUID}`, but the backend sends saga events to `demo-{sagaId}`. Different group, no delivery. Now `CheckoutDemo` calls `signalRClient.subscribe(sagaId)` after `/saga/start` returns, so events actually route to the page. Same fix applies to race mode (subscribes to both lane sagaIds). Other demos using the same pattern may need the same fix — flagged for review.

### 2.2 Circuit Breaker — HALF-OPEN visualization + jitter

- **HALF-OPEN visualization** — *shipped 2026-05-04.* Backend `CircuitBreakerDurationSeconds` trimmed 10→6 so the half-open window arrives quickly. Frontend rewrite: state-machine diagram (Closed → Half_Open → Open) with active-state pulse, "Probe_Armed"/"Probe_In_Flight" indicator, "Trip_Breaker" button (fires 3 sequential failing requests), "Manual_Reset" button, transition timeline. Audit log entries now distinguish `probe-success` / `probe-failure` / `rejected`. The dead "Hedging" / "Bulkhead" indicators were removed; they were promising things the demo didn't deliver.
- **Jitter visualization** — *deferred.* The "5+ clients fanning out their backoff" story still needs a concurrent-clients view. **Estimate: 3–4 hours.** ≈30min backend (no change needed — purely a frontend simulation of N clients each with their own retry-with-jitter timing, since jitter is a *client-side* concern). ≈2.5h frontend (lane component with per-client retry track, visual stagger calculations, configurable jitter on/off toggle to show the "thundering herd" without it). ≈30min copy + plan-doc update.

### 2.3 Outbox — "DB commits, relay is down" recovery — *shipped 2026-05-04*

- **Backend** — new `IDemoRelayGate` (`Application/Interfaces/IDemoRelayGate.cs`) + `DemoRelayGate` singleton (`Infrastructure/Messaging/DemoRelayGate.cs`) hold the in-memory FIFO buffer. `POST /api/demo/events/trigger` branches: paused → enqueue + notify only `persisted`; running → normal outbox transaction. New `GET /api/demo/events/relay-status` and `POST /api/demo/events/relay-pause { paused }`. On resume, drain order is FIFO and each event runs the normal outbox transaction so `relayed`/`consumed` SignalR events fire exactly as a fresh trigger would.
- **Frontend** — initial GET `/relay-status` so a refresh while paused shows the right state. Pause/Resume button flips label and tone. Amber callout when gated, with live queued count. Right-column broker tile flips green→amber when paused (`HEALTH_OPTIMAL` → `RELAY_DISCONNECTED`). Trigger 3 events while paused → all stuck in `pending` → click resume → backend drains → audit table flips through `relayed` → `consumed` via SignalR.

### 2.4 Idempotency — cache expiry + concurrent collision — *shipped 2026-05-04*

- **Backend** — `DemoStateStore.IdempotencyKeys` now stores typed `IdempotencyEntry { Result, CreatedAt, ExpiresAt }` records. `POST /api/demo/idempotency/process` reads `X-Idempotency-Ttl-Seconds` (default 30s, clamped 5–600), uses `ConcurrentDictionary.AddOrUpdate` with an expiry-aware update factory. Reference equality on the returned entry tells us who won. New `POST /api/demo/idempotency/race { key, count, ttlSeconds }` fires N parallel `AddOrUpdate`s and returns per-request outcomes.
- **Frontend** — TTL countdown is now sourced from `expiresInSeconds` on the response, ticked from a wall-clock deadline. TTL preset buttons (10s / 30s / 120s) drive the header. "Fire_Race" button calls the race endpoint and renders winner/loser tiles with order ids and per-request latencies. Audit trail distinguishes `Commit_New` / `Replay_Cached` / `Replay_After_Expiry` / `Race_Winner` / `Race_Loser`.
- **Why this is honest** — concurrent collision is decided by `ConcurrentDictionary.AddOrUpdate`'s atomic CAS semantics, not a simulation. Losers observe the winner's response with the same `OrderId` — the point of the pattern.

### 2.5 Cache stampede — distributed lock across two API instances — *deferred*

**Why deferred:** the existing demo runs single-process. The current `IHybridCache` provides L1 (memory) + L2 (Redis) layering, but the *cross-process* lock — the lock that proves "even with multiple replicas, only one calls the origin" — needs both an Aspire orchestration change and a verification of how the cache actually serializes a cache-miss across processes. Both are non-trivial enough that doing them in a hurry would produce demo theatre rather than an honest demonstration.

**What it actually requires:**

1. **Aspire — second replica.** Add a second `AddProject<haworks>("api-2")` to `src/haworks.AppHost/Program.cs` with the same `WithReference` set as the first. Decide on a launch profile that doesn't collide with the existing `7121/5245` ports — Aspire can pick dynamically, but the frontend has to be told both URLs.
2. **Routing strategy.** Either:
   - *(a)* Frontend round-robins between the two API URLs for the stampede demo only, OR
   - *(b)* Put a small YARP/nginx in front and present a single URL that fans out. Cleaner UX, more infra to maintain.
3. **Verify the cross-process lock is real.** Audit `IHybridCache` and the stampede demo endpoint to confirm the lock is held in Redis (not in-process memory). If the existing implementation uses `lock(_obj)` or `SemaphoreSlim` per-process, the demo is dishonest under two replicas — concurrent misses on different processes will both call the origin. If so, swap in a Redis-based lock (`StackExchange.Redis` `SET NX PX` or `IDistributedLockFactory` from RedLock.NET) for the demo path.
4. **Frontend** — add a "Served by" badge per request so the user can see the load split. Make the comparison legible: "Without protection, both instances call origin (2 db queries). With protection, one calls, the other waits, both return the same cached value (1 db query)."
5. **Smoke test.** Manually validate: with both replicas live, fire 100 concurrent stampede requests; expect `dbQueries == 1`, not 2.

**Estimate: 6–9 hours** (≈1 focused workday).

| Step | Hours | Risk |
| --- | --- | --- |
| Aspire AppHost edits — second replica + port wiring | 1–2h | Medium — Aspire dynamic ports + dependency duplication can surprise |
| Audit + (likely) replace per-process lock with Redis-based lock for demo path | 2–3h | **Highest** — if `IHybridCache` doesn't already do Redis locking for this case, this is the bulk of the work |
| Frontend "served by" indicator + comparison panel + per-instance request count | 1–2h | Low |
| Manual smoke test + plan-doc writeup | 1h | Low |
| Buffer for Aspire/Redis surprises | 1h | — |

**Sequencing:** do the audit (step 3) **first**, before touching Aspire. The audit decides whether this is a 6h or 9h job. If the lock is already Redis-backed and just needs surfacing, the rest is wiring. If it's per-process, expect the Redis lock swap to dominate.

**Honesty caveat for the interim:** until #9 ships, the existing demo is a *single-process* stampede demo and should be labeled as such in the demo copy. The current `<DemoContext>` "What to watch" line for `stampede` says "Without protection, request count to the origin equals concurrency. With protection it equals one. The graph is the demo." — that statement is true for one process. Once the two-replica version ships, the copy can grow to "...even when the requests arrive at different replicas."

---

## Bucket 3 — Backend features not yet demoed (future)

Captured here so they're not lost. **Not** part of the current pass; addressed after Bucket 1 + 2 land. Estimates are rough — each is one-PR-sized unless noted.

| Feature | Backend ref | Demo sketch | Est. |
| --- | --- | --- | --- |
| ~~Distributed tracing as a first-class demo~~ — *shipped 2026-05-05.* `POST /api/demo/tracing/start` builds a 7-span / 6-service trace and stores it in a new `IDemoTraceStore` singleton (`Infrastructure/Telemetry/DemoTraceStore.cs`). `GET /api/traces/{id}` (in `SystemController`) was previously a mock that returned a single fixed span; now it queries the store, so every demo's `X-Trace-Id` resolves to a real flame graph in the hub-level `<TraceViewer>`. New `DistributedTracingDemo.tsx` lives under a new `Observability` sidebar group with `Happy_Path` / `Stripe_Failure` scenarios. | `src/Infrastructure/Telemetry/DemoTraceStore.cs`, `DemoController.StartTrace` | — | done |
| JTI token revocation w/ L1 + L2 cache | `src/Infrastructure/Identity/TokenRevocationService.cs:1-114` | Issue → Revoke → Validate, show cache layer hit timings | 4–6h |
| Reservation-based checkout (Flow B) + sweeper | `src/Infrastructure/BackgroundServices/ReservationSweeperService.cs:1-145` | 30s reservation TTL; watch sweeper expire it & release stock | 4–6h |
| Bulkhead isolation + Null vs Critical fallback | `src/Infrastructure/Resilience/BulkheadOptions.cs`, `Fallbacks/*` | 100 concurrent requests; 25 execute / 50 queue / rest 429 | 3–4h |
| Idempotent webhook ingestion | `src/Api/Controllers/WebhooksController.cs:40-55` | Replay same Stripe webhook 3×; first processes, rest no-op | 4–5h |
| Chunked upload + ClamAV + magic bytes | `src/Infrastructure/ExternalServices/Validation/ClamAVScanner.cs:1-47` | Resumable chunks; EICAR test file rejected | 6–10h |
| Vault dynamic DB credentials (deepens vault demo) | per-context `*BoundedContextExtensions` + Vault DB roles | Show 5 separate role lifecycles with TTL countdown | 4–6h |
| MassTransit publish/consume observers | `src/Infrastructure/Messaging/Observers/*` | 6-stage outbox timeline with per-stage latencies | 3–5h |

## Out of scope (operational hygiene, not demo material)

`TokenCleanupService`, `StockJanitorService` (sweeper safety net), health checks, telemetry plumbing, alerting service.

---

## TODO — Aspire end-to-end smoke test

Outstanding from the 2026-05-04 session. Substantial code shipped across both repos; never actually exercised against a running stack. The earlier attempt timed out before Aspire was fully up.

**Prereqs (all applied 2026-05-04, verified in code):**
- Backend CORS allows `http://localhost:4321` (Astro default) — `SecurityServiceExtensions.cs:80-93`.
- `[IgnoreAntiforgeryToken]` on `DemoController` so demo POSTs aren't blocked by global CSRF.
- Frontend `.env.development` points at `https://localhost:7121` (the actual API HTTPS port from `launchSettings.json`).
- Docker Desktop must be running before `dotnet run --project src/haworks.AppHost`.

**How to run:**

```bash
# terminal 1 — backend
cd /path/to/haworks-platform
dotnet run --project src/haworks.AppHost --launch-profile https

# wait for the Aspire dashboard to show all resources green
# then terminal 2 — frontend
cd /path/to/portfolio-site
npm run dev
```

Open `http://localhost:4321`. Click through every demo. Watch the SignalR connection pill (top-left of the demo hub) — it should read `SignalR_Live` once the API is up.

**What to verify, demo by demo:**

| Demo | Expected behavior |
| --- | --- |
| Saga (`Path_Happy`) | `initiated → stock_reserved → payment_ready → completed` events appear in the audit log |
| Saga (`Fault_Stock`) | Saga reaches `stock_failed`, then `compensated` |
| Saga (`Fault_Pay`) | Saga reaches `payment_failed`, compensation runs |
| Saga (`Stock_Race`) | **New.** Two lanes appear; one ends with 🏆 (Cart_A or Cart_B), the other with the X icon. SagaIds differ. |
| Outbox | Trigger 3 events while paused → all in `pending` state, queue depth = 3 → click `Resume_Relay` → `relayed` then `consumed` events stream in. Broker tile flips green again. |
| Circuit Breaker | `Trip_Breaker` → 3 failing requests → state → `Open`. After 6s → state → `Half_Open`, "Probe_Armed" badge. Click `Send_Probe` → on success, state → `Closed`. |
| Idempotency | TTL=10s. `Send_Request` → `Commit_New`. Replay within 10s → `Replay_Cached`. Wait 10s, replay → `Replay_After_Expiry` (new orderId). `Fire_Race` → 4 outcomes, exactly 1 `Race_Winner`, 3 `Race_Loser`, all sharing the winner's orderId. |
| Vault rotation | Existing behavior — verify `OnVaultRotation` events still flow. |
| Cache stampede | Single-process protection visible (multi-replica deferred — see 2.5). |
| Cache invalidation | Pub/sub event fires across nodes. |
| Concurrency | Optimistic-lock conflict surfaces on simultaneous edits. |
| Rate limit | 429 with retry-after on burst above the limit. |

**Likely first-run hiccups:**
- Self-signed cert on `localhost:7121` blocks the SignalR/fetch handshake. Fix: visit `https://localhost:7121/swagger` once and accept the cert, or `dotnet dev-certs https --trust`.
- Astro picks a port other than 4321 if 4321 is occupied. Either pass `--port 4321` or update CORS to also allow whatever Astro chose.
- Aspire's first run pulls Docker images for postgres/redis/rabbitmq/vault/minio/clamav — can take several minutes.
- Saga events that don't reach the page → previously-flagged routing fix (frontend now subscribes to the returned sagaId via `signalRClient.subscribe(...)`). If saga events still don't arrive, double-check the connection pill says `SignalR_Live` and the browser network tab shows the websocket open.

**Document findings:** if any demo doesn't behave as above, file the gap in this doc with a concrete repro before fixing. Don't smoke-test and silently fix — the gaps are useful evidence for the next round.

---

## Light-mode + mobile audit (2026-05-05)

Static-analysis pass per the design review. **Findings only — no fixes in this round.**

### Light mode is half-built (high impact)

The `.light` class on `<html>` only swaps **5 tokens**: `--color-base`, `--color-surface`, `--color-accent`, `--color-text-primary`, `--hairline` (BaseLayout.astro:70-71 critical CSS). The rest stay at their dark-mode values.

**Concrete failures:**

- **Secondary + muted text becomes low-contrast.** `--color-text-secondary: 148 163 184` and `--color-text-muted: 100 116 139` are defined only in `:root` (`global.css:29-30`). In light mode the background flips to `250 250 246` but the secondary/muted text stays grey. Contrast ratio ~2.8:1 for secondary, ~3.6:1 for muted — both fail WCAG AA.
- **`bg-white` CTAs disappear into the page.** The "primary action" pattern across every demo is `bg-white text-black` (the `Send_Request` / `Dispatch_New_Order` / `Commit_Event` buttons). Tailwind literal `bg-white` does not theme-swap. On a light background these buttons become near-invisible.
- **Glass surfaces lose their depth.** `.glass` and `.glass-subtle` use `bg-white/[0.03]` — a 3% white overlay. On light bg this is meaningless; the layering effect that makes the dark theme feel "premium console" collapses.
- **Semantic state colors don't recompute for light bg.** Success/warning/error/info pills (`text-success`, `bg-warning/10`, etc.) use the same RGB triplets in both modes. They look fine on dark; on light they're slightly washed out but not actively broken.
- **The status-dot glow shadows** (`shadow-[0_0_8px_rgba(34,197,94,0.6)]`) are tuned for dark surfaces. On light, the green/amber/red glows look faint or absent.
- **TraceViewer span colors** are hardcoded dark-theme picks (`#6366f1`, `#f59e0b`, etc.). Legible on dark, less so on light.

**Files affected:** every demo component (most use `bg-white` for the primary CTA), `LiveMetricsRow.tsx`, `StatusTray.tsx`, `Scorecard.tsx`, `CodeDrawer.tsx`.

**Suggested fix (separate pass):**
1. Define light-mode overrides for `--color-text-secondary`, `--color-text-muted`, and the four semantic colors (`success/info/warning/error`) inside `.light` in `global.css` and the BaseLayout critical CSS.
2. Replace `bg-white text-black` CTA pattern with a token-driven class — e.g. a `btn-primary` component that resolves to `rgb(var(--color-accent))` in both modes, or `bg-primary text-base` so the button always contrasts with the page.
3. Tune `.glass` overlays per-mode (white/[0.03] on dark, black/[0.04] on light).

**Effort estimate:** 4–6h for full light-mode parity. Or: deprecate light mode entirely (remove `setTheme('light')` from CommandPalette) until the design system is dual-theme by construction. The latter is cheaper.

### Mobile is mostly fine, three concrete risks

`lg:grid-cols-2` (which collapses to single column below 1024px) is used across every demo. The collapse is correct — controls stack on top of telemetry, both stay full-width. Most demos read fine.

**Risks worth verifying on a real phone:**

1. **Stats tiles wrap awkwardly.** `LiveMetricsRow` uses `grid-cols-3` with a `max-w-md` cap. At <360px width the three tiles compress; the `text-lg` numeric values may overflow. Low risk.
2. **Tracking-heavy labels overflow narrow phones.** Many labels use `tracking-[0.4em]` (40% letter-spacing). E.g. `Hydrating_Production_State…` plus that tracking value can exceed a 320px viewport. Affects: `DemoHubLite` loading skeleton, demo group headers, audit-trail headers.
3. **Race-mode swimlanes are too narrow at <640px.** The `CheckoutDemo` `stockRace` view renders two `RaceLaneCard`s in a `grid lg:grid-cols-2`. On mobile they stack — fine — but each lane's `min-h-[280px]` event log + header eats vertical real estate (~600px per lane = 1200px for both). Considerable scrolling. Low priority since stockRace is a niche scenario.

**Not a problem despite fears:**

- `text-[10px]` / `text-[9px]` body text stays legible on phones at default system size. Becomes unreadable when the user has Large Text accessibility enabled — but that's the broader Tailwind hardcoded-px-vs-rem tradeoff, not specific to this site.
- Mobile sidebar (`DemoMobileNav` in `DemoSidebar.tsx`) uses native `<details>`/`<summary>` for disclosure. Accessible by default, no swipe needed.

**Effort to address:** 1–2h for the three concrete risks (mostly tightening `tracking-` values on narrow viewports via `sm:` breakpoint).

---

## Outstanding TODOs — consolidated (2026-05-05)

Single source of truth for what's left. Ranked by impact within each tier.
Effort estimates are rough — treat as "right order of magnitude," not commitments.

### Tier 1 — Critical path / unblockers

These either gate other work or close existing honesty gaps.

- **T1.1 — Aspire end-to-end smoke test.** Documented in detail above. Highest leverage because it unblocks Flow B's three remaining gates (integration tests, EF migration, `ReservationConfirmedConsumer` integration test) AND verifies every demo's flame graph end-to-end. **Est: 2–4h** if the stack comes up clean; expect surprises (cert trust, port collisions, container pulls).
- **T1.2 — Backend honesty pass: `/api/metrics/snapshot` + `/api/health/snapshot`.** Both return hardcoded literals today (`SystemController.cs:38-40,82-87`). My earlier fix made the *frontend* honest about offline state, but in normal operation the page still displays `18234`, `99.998%`, `42.4ms` — pulled from an API that isn't measuring anything.
   - **Plan:** add a tiny `IDemoActivityCounters` singleton that tracks `ingressEvents24h` (incremented on every demo POST), `activeSessions` (Set of recent X-Demo-Session ids with a sliding window), `p99LatencyMs` (rolling histogram of per-request durations from a middleware). Wire `SystemController.GetMetricsSnapshot` to read it. Health snapshot's `latencyMs` per-service can pull from the same middleware tagged by route prefix.
   - **Why this approach:** 2–4h of work, gives an honest "this is real activity on this server right now." Alternative (real Prometheus + scraper) is 8–12h and overkill for a portfolio.
   - **Est: 2–4h.**
- **T1.3 — `Cluster_Healthy // LHR_01` + `lhr_cluster_01` node label honesty.** Hardcoded strings in `index.astro` and `DemoHubLite.tsx` claim a specific datacenter. Either wire to a real env-var-driven label (e.g. read from `PUBLIC_CLUSTER_LABEL`) or rephrase to remove the geo-specific claim. **Est: 30min.**

### Tier 2 — Reaching 8/10 on UX clarity

The three small wins identified by the design review. *All landing in this session per user direction.*

- **T2.1 — Plain-English `valueProp` rewrite.** Current valueProps assume domain vocabulary ("Solves Split-Brain in microservices", "Eliminates Duplicate Side-Effects"). Rewrite to outcome language a non-domain-expert engineer can parse. Owns `DemoSidebar.tsx`. **Est: 1h.**
- **T2.2 — Auto-expand TraceViewer on first trace fire of a session.** Persist the choice in localStorage so subsequent visits respect the user's manual toggle. Owns `TraceViewer.tsx`. **Est: 30min.**
- **T2.3 — Tooltips on dangerous-verb buttons.** Trip_Breaker, Manual_Reset, Pause_Relay, Resume_Relay, Fire_Race, Inject_Chaos. `title=` + `aria-label`. Reassure the user about reversibility. **Est: 30min.**

### Tier 3 — Bucket 2 leftovers (deepen existing demos)

- **T3.1 — Saga `webhookFirst` scenario** (5–7h). Crosses webhooks + payment session + saga state machine. Backend needs a synthetic Stripe webhook injection and a saga branch that handles the early-settled state.
- ~~**T3.2 — Circuit Breaker jitter visualization**~~ — *shipped 2026-05-05.* `JitterStorm` sub-component appended to `CircuitBreakerDemo`: 12 simulated clients each retry up to 4× with exponential backoff (200/400/800/1600ms ceilings), toggle between "No_Jitter" (synchronous waves) and "Full_Jitter" (random delay in `[0, ceiling]`). Density histogram across 32 buckets shows the load shape difference (peak retries-per-window) plus per-client lanes show individual retry timing. Pure client-side simulation; jitter is a caller-side concern so the visualization is honestly frontend.

### Tier 4 — Bucket 3 demos (new captures of backend capabilities)

Listed in priority order for portfolio impact. *Distributed tracing already shipped 2026-05-05.*

- **T4.1 — Reservation-based checkout (Flow B) UI** (4–6h). Flow B backend is now committed (commit `4543b46`). Demo creates a reservation with 30s TTL, watches the sweeper expire it. **Gated by T1.1** (Aspire smoke test) since the integration tests need to run first.
- **T4.2 — JTI token revocation (L1 + L2 cache)** (4–6h). Issue → Revoke → Validate, surface cache-layer hit timings. Real OAuth pattern, very portfolio-credible.
- **T4.3 — Bulkhead isolation + Null vs Critical fallback handlers** (3–4h). Smallest scope of the bunch; builds on the existing CircuitBreakerDemo.
- **T4.4 — Idempotent webhook ingestion** (4–5h). Replay the same Stripe webhook 3×, first processes, rest dedupe.
- **T4.5 — Vault dynamic DB credentials** (4–6h). Deepens the existing vault demo to show 5 separate role lifecycles (one per bounded context).
- **T4.6 — MassTransit publish/consume observers** (3–5h). 6-stage outbox timeline with per-stage latencies; complements the outbox demo.
- **T4.7 — Chunked upload + ClamAV + magic bytes** (6–10h). Largest of the bunch. EICAR test file rejected, resumable chunks. Worth doing only if uploads are actually a part of the pitch.

### Tier 5 — Light-mode + mobile cleanup

- **T5.1 — Light-mode parity.** Detailed findings in the audit section above. **Est: 4–6h** to fix properly, OR ~30min to deprecate light mode (remove `setTheme('light')` from CommandPalette) until the design system is dual-theme by construction. Leaning toward deprecate since light isn't currently the brand.
- **T5.2 — Mobile concrete risks.** Three filed: stats overflow at <360px, `tracking-` overflow on narrow phones, race-mode swimlane height. **Est: 1–2h**.

### Tier 6 — Smaller cleanups (bundle when convenient)

- **T6.1 — Demo header competing chrome.** Status pill + Node label + System/Source toggle + Inject_Chaos all sit at full visual weight. Demote secondary info (Node label, view toggle background) so the demo title wins. **Est: 30min.**
- **T6.2 — Drop `stash@{0}`** in haworks-platform. Flow B's `DemoResilienceRegistry` is now in HEAD. Stash is redundant. **Est: 1 command.**
- **T6.3 — Onboarding "start here" hint** on the default-loaded saga demo. Currently a tooltip appears after 3 seconds of inaction; consider a subtle persistent "👇 click Dispatch_New_Order to fire your first saga" line until the first run completes. **Est: 30min.**
- **T6.4 — Document the `.env.development` convention.** The frontend depends on a gitignored `.env.development` that was set to `7123` (wrong) in someone's local clone. Add an `.env.example` with the right defaults so a fresh clone runs against the right port. **Est: 15min.**

### Out of scope (operational hygiene)

`TokenCleanupService`, `StockJanitorService` (sweeper safety net), health checks, telemetry plumbing, alerting service. Not user-facing.

---

## Order of operations (going forward)

1. **Tier 2 (reaching 8/10)** — landing in the same pass that produced this doc. (Self-referential; counts because it's the visible polish.)
2. **Tier 1.1 (Aspire smoke test)** — single highest-impact unblocker.
3. **Tier 1.2 + 1.3 (backend honesty pass)** — the displayed-but-fake numbers are the biggest credibility risk on the site.
4. **Tier 4.1 (Flow B UI)** as soon as Tier 1.1 unblocks runtime verification.
5. **Tier 5.1 (light-mode deprecate)** — quickest way to remove the lurking quality issue without committing to a 4–6h rewrite.
6. **Tier 4.2 / 4.3 / 4.4 (smaller Bucket-3 demos)** — token revocation, bulkhead, webhook idempotency.
7. **Everything else** as time allows.
