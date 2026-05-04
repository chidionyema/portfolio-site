---
title: UI + Demo Plan
status: working-doc
last_reviewed: 2026-05-04
---

# Portfolio Site — UI + Demo Plan

Working roadmap captured after a top-to-bottom review on 2026-05-04. Source of truth is the **code**; this doc tracks intent and gaps. Update as items land or change.

The site has nine interactive demos backed by the ritualworks .NET 9 API. The shell, aesthetic, and demo plumbing (REST + SignalR) are in good shape. The remaining work splits into three buckets: UX fixes, deepening existing demos, and surfacing backend capabilities that are currently invisible.

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
| Distributed tracing as a first-class demo (the "follow the request" flame graph across consumer hops) | `src/Infrastructure/Telemetry/ActivitySources.cs:1-82` | `POST /api/demo/tracing/start` → SignalR streams span tree | 6–8h |
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

## Order of operations (going forward)

1. **Smoke-test what's shipped this session** end-to-end against a running Aspire stack. Backend prereqs already applied (CORS, antiforgery, dev URL alignment). Aspire was built but not booted in the smoke test — that's the next thing to do before any new demo work.
2. **Bucket 2 leftovers** — finish #5 `webhookFirst` (5–7h) and #2.2 jitter visualization (3–4h), then #9 cache-stampede-across-replicas (6–9h).
3. **Bucket 3** — pick the highest-leverage one for the audience (almost certainly *distributed tracing as a demo*) and ship it.
4. **TS hygiene sweep** — there's still a baseline of pre-existing type errors in `RateLimiterDemo`, `VaultRotationDemo`, `EventMesh`, and `sitemap.xml.ts`. Worth a dedicated 1–2h pass to align the SignalR event types and clean up the implicit-any warnings in `sitemap.xml.ts`.

Backend prerequisites for the smoke test are tracked separately (CORS origin, antiforgery on `DemoController`, dev URL alignment — already applied 2026-05-04).
