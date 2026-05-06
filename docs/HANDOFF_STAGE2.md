# Handoff — Stage 2 (traffic generator + by-instance distribution)

This doc is the resume / takeover document for the multi-instance work.
A fresh agent (Gemini, fresh Claude session, human) reading this should
be able to pick up exactly where the previous session stopped without
needing the chat history.

## Where things are right now

**Stage 1 — multi-instance catalog + instance-id surfacing — SHIPPED.**

Code merged and pushed:

- `ritualworks-platform/feat/portfolio-ui-completion-gemini` at
  `996f12a` (merge of `feat/aspire-multi-instance-catalog`)
- `portfolio-site/main` at `73dc52b`

Build verification at handoff time:

- Platform: `dotnet build` of BuildingBlocks, Catalog.Api, BffWeb.Api,
  AppHost — all green, 0 warnings.
- Portfolio: `npm run build` — green, 5 pages in 7.23s.

What Stage 1 does:

- `src/BuildingBlocks/Middleware/InstanceIdMiddleware.cs` (new): stamps
  `X-Instance-Id` on every response. Computes id at startup from
  `OTEL_RESOURCE_ATTRIBUTES.service.instance.id` (Aspire-injected
  per-replica), with HOSTNAME / MachineName / GUID fallbacks.
- Catalog and BFF Program.cs both call `app.UseInstanceIdHeader()`.
- AppHost: `catalog-svc.WithReplicas(2)`. BFF stays at one replica
  (frontend port-pin + SignalR sticky-routing under `WithReplicas`
  not yet validated; documented in
  `ritualworks-platform/docs/ASPIRE_MULTI_INSTANCE.md`).
- BFF `DemoController.CircuitRequest` captures catalog's
  `X-Instance-Id` from the response and includes it on the JSON body
  as `upstreamInstance`.
- Portfolio: `RequestMetadata` extended with `bffInstance` +
  `upstreamInstance`. `useDemoSession.executeCommand` populates them.
  `RequestReceipt` renders a new pill: `🖥 bff-web-1c4a →
  catalog-svc-7e3f`.

**Stage 1 has NOT been deployed.** Aspire is still running the old
catalog binary at handoff time. Cluster is healthy at `:5050` but
serves the pre-replica catalog.

## What's needed to actually verify Stage 1

**Step 1 — Restart Aspire so the new catalog binary deploys.**

Risk: in-flight Gemini agents working in `ritualworks-platform/` may
have uncommitted WIP that gets lost. Check for them first:

```bash
cd /Users/chidionyema/Documents/code/ritualworks-platform
git worktree list           # any active worktrees with uncommitted work?
git status --short          # main dir clean?
ps aux | grep "ritualworks-platform/src" | grep -v grep    # active service procs
```

If safe to restart:

```bash
pkill -INT -f "RitualworksPlatform.AppHost"
sleep 2
pkill -KILL -f "src/.*\.Api/bin"
cd /Users/chidionyema/Documents/code/ritualworks-platform
git checkout feat/portfolio-ui-completion-gemini
git pull --ff-only origin feat/portfolio-ui-completion-gemini
./scripts/aspire-up.sh --no-build
```

(Will rebuild on first start because catalog source has changed —
expect ~120s cold-start.)

**Step 2 — Verify in Aspire dashboard** at `https://localhost:17000`.
Should see TWO rows under `catalog-svc`, each with its own dynamic
port and own log stream.

**Step 3 — Verify via curl loop:**

```bash
for i in {1..10}; do
  curl -sS -X POST http://localhost:5050/api/demo/circuit/request \
    -H 'Content-Type: application/json' \
    -d '{"shouldFail":false}' \
  | jq -r .upstreamInstance
done
```

Pass condition: at least 2 distinct `upstreamInstance` values appear in
the 10 calls. Aspire's reverse proxy round-robins, so expect a roughly
50/50 split.

**Step 4 — Verify in browser.** Hard-refresh `:4321/`, navigate to
the circuit-breaker demo, click `Send Request` 6+ times. The receipt
strip below the panel should show `🖥 bff-web-XXXX → catalog-svc-YYYY`
with the catalog suffix rotating between two distinct values.

If any step fails, see "If something is wrong" at the bottom.

---

## Stage 2 — Ambient traffic generator (NOT YET STARTED)

The user's ask: *"a traffic generator that pushes real traffic through
the system and demonstrates scenarios and strategies."*

### What it is

A continuously-running synthetic traffic source that:

1. Fires real saga executions against the actual cluster at a
   configurable rate (`POST /api/demo/saga/start`).
2. Aggregates per-instance distribution counts (which catalog replica
   handled how many stock reservations, which payments instance
   handled how many session-creates).
3. Surfaces metrics to the portfolio-site via SignalR push or a poll
   endpoint: throughput, P99 latency, by-instance distribution, active
   saga count, completion / abandon rates.
4. Lets the visitor toggle on/off, change the rate, change the
   scenario mix.

The demo value: visitor opens the site, traffic is already flowing,
visualisation shows the cluster digesting work in real time. Visitor
presses "Kill catalog instance 1" — the by-instance distribution
shifts visibly, all-load-on-instance-2, P99 ticks up briefly,
recovery is observable.

This is the ambient-cluster-traffic idea from earlier session
discussion + the multi-instance proof landing in §4 of the
show-and-tell page draft (`SHOW_AND_TELL_DRAFT.md`).

### Backend scope (~3 hours)

**File**: new `src/BffWeb/BffWeb.Api/Demo/AmbientTrafficGenerator.cs`.

Shape:

```csharp
public sealed class AmbientTrafficGenerator : BackgroundService
{
    private readonly Channel<int> _rateChanges = ...;
    private volatile int _currentRate = 0;          // sagas/sec; 0 = off
    private readonly ConcurrentDictionary<string, long> _instanceHits = new();
    private readonly RingBuffer<double> _latencyP99Window = ...;
    // ...

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            if (_currentRate == 0) {
                await Task.Delay(500, ct);
                continue;
            }
            var interval = TimeSpan.FromSeconds(1.0 / _currentRate);
            // Fire one saga (90% success, 7% paymentFailure, 3% stockFailure
            // per the scenario mix), record the response's upstreamInstance
            // into _instanceHits, record latency.
            // Use IServiceScopeFactory to get a scoped MediatR/saga sender
            // — same path the existing SagaStart endpoint uses.
            await Task.Delay(interval, ct);
        }
    }

    public void SetRate(int sagasPerSec) => _currentRate = Math.Clamp(sagasPerSec, 0, 50);
    public TrafficSnapshot Snapshot() => new(_currentRate, _instanceHits.ToDictionary(x => x.Key, x => x.Value), _latencyP99Window.P99());
}
```

**File**: new `src/BffWeb/BffWeb.Api/Controllers/AmbientTrafficController.cs`
exposing:

- `POST /api/demo/traffic/rate` — body `{ sagasPerSec: int }`. Sets
  the rate. 0 stops the generator.
- `GET /api/demo/traffic/snapshot` — returns
  `{ rate, instanceHits, p99LatencyMs, totalCompleted, totalAbandoned }`.
- (Optional) SignalR push every 1s on a new `OnTrafficSnapshot`
  hub event. Easier first cut: just poll the snapshot endpoint at
  1Hz from the frontend.

Register `AmbientTrafficGenerator` as a singleton AND as a hosted
service in BFF DI:

```csharp
builder.Services.AddSingleton<AmbientTrafficGenerator>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<AmbientTrafficGenerator>());
```

### Frontend scope (~1.5 hours)

**File**: new `src/components/showandtell/AmbientTrafficControl.tsx`.

Renders:

- A rate slider (0 / 1 / 5 / 10 / 25 / 50 sagas/sec).
- A throughput tile (current `sagasPerSec` actually achieved).
- A P99 latency tile.
- A by-instance bar chart: one bar per `instanceHits` entry, height
  proportional to count. Updates as the snapshot polls.
- Active count + Completed count + Abandoned count tiles.

Polls `GET /api/demo/traffic/snapshot` every 1s while mounted. Stops
polling on unmount.

Embed in `index.astro` as the live-data backdrop for the §4 saga
storm section of the show-and-tell page (per
`SHOW_AND_TELL_DRAFT.md`).

### Acceptance for Stage 2

```bash
# Set rate
curl -X POST http://localhost:5050/api/demo/traffic/rate \
  -H 'Content-Type: application/json' \
  -d '{"sagasPerSec": 5}'

# Wait 30s
sleep 30

# Snapshot
curl http://localhost:5050/api/demo/traffic/snapshot | jq
```

Pass conditions:
- `rate` echoes 5.
- `instanceHits` has at least 2 keys (both catalog replicas got work).
- `instanceHits` values total at least ~150 (5 sagas/sec × 30s, with
  some slack).
- `p99LatencyMs` is a sensible number (< 1000ms locally).
- Browser: control component shows the bars rising live, by-instance
  distribution roughly even.

### Out of scope for Stage 2

- Multi-instance for any service other than catalog (BFF stays at 1
  replica until SignalR sticky-routing is validated; payments,
  orders, identity stay at 1 replica until separate demand).
- Real OpenTelemetry through Tempo (item 1 of `PORTFOLIO_HIRING_PLAN.md`).
- Real Stripe (item 3).
- Distributed rate limiting / cache invalidation across BFF replicas
  (item 4).

---

## Resume protocol — for the next agent

If you (Gemini, fresh Claude session, human) are reading this and the
previous session stopped mid-flight:

### 1. Read these files in this order

- This file (`HANDOFF_STAGE2.md`) — you're already here.
- `portfolio-site/docs/PORTFOLIO_HIRING_PLAN.md` — broader context on
  where Stage 1 + Stage 2 fit in the 4-week hiring upgrade.
- `portfolio-site/docs/SHOW_AND_TELL_BACKEND.md` — per-section
  backend integration map; explains how the traffic generator fits
  into the show-and-tell §4.
- `ritualworks-platform/docs/ASPIRE_MULTI_INSTANCE.md` — the gotchas
  guide for `WithReplicas`. Contains the list of in-process state
  that breaks under replication and how to fix it.

### 2. Do isolation setup BEFORE editing anything

The previous session learned this the hard way. Multiple agents in
the main working directory corrupt each other's HEADs. Set up
worktrees per `PARALLEL_DEMO_WORK.md` Hard Rule 0.

```bash
cd /Users/chidionyema/Documents/code/ritualworks-platform
git worktree add ../ritualworks-platform-traffic-gen feat/portfolio-ui-completion-gemini
( cd ../ritualworks-platform-traffic-gen && dotnet restore )

cd /Users/chidionyema/Documents/code/portfolio-site
git worktree add ../portfolio-site-traffic-gen main
( cd ../portfolio-site-traffic-gen && npm install )
```

Work in those worktrees. NOT in the main dirs.

### 3. Verify Stage 1 first, before starting Stage 2

If Stage 1 hasn't been deployed (Aspire still running pre-replica
catalog), do that first per the verification steps above. Don't
build Stage 2 on top of an unverified Stage 1.

If Stage 1 verification fails, see "If something is wrong" below.

### 4. Build Stage 2 in two pushes, not one big bang

- Push 1: backend traffic generator + endpoints. Build green. Curl
  `/api/demo/traffic/rate` and `/api/demo/traffic/snapshot`. Confirm
  the BackgroundService actually fires sagas (BFF logs show
  "Saga demo: routing to checkout-orchestrator …" lines at the
  configured rate).
- Push 2: frontend AmbientTrafficControl component. Build green.
  Eyeball in browser.

Don't combine. If something breaks, you can revert one push without
losing the other.

### 5. Restart Aspire AT MOST ONCE per push

If you have to restart, kill all svc procs cleanly and use
`./scripts/aspire-up.sh` (NOT `dotnet run` directly). The wrapper
handles orphan cleanup; bare `dotnet run` doesn't. Per
`docs/runbooks/aspire-orphan-services-on-macos.md`.

### 6. When done

Push to feature branches; don't merge to main yourself unless the
operator (the human running this) explicitly OKs it. The previous
session's pattern was: agent pushes branch + reports BRANCH/SHA;
operator reviews + ff-merges.

---

## If something is wrong

### Stage 1: catalog instances both show same id

Possible causes:
- `WithReplicas(2)` not applied — `git log feat/portfolio-ui-completion-gemini`
  should show commit `996f12a "merge: feat/aspire-multi-instance-catalog"`
  and the AppHost change.
- Aspire didn't pick up the new code — full restart of Aspire (not
  just BFF/Catalog process kill) and watch Aspire dashboard for two
  rows under catalog-svc.
- Aspire reverse proxy not load-balancing — unusual; check Aspire
  version; this should be default behaviour for `WithReplicas`.

### Stage 1: receipt strip shows trace pill but no replica trail

- `bffInstance` is null → BFF middleware not registered. Verify
  `app.UseInstanceIdHeader()` is in BFF Program.cs. Verify BFF
  rebuilt and redeployed.
- `upstreamInstance` is null → BFF DemoController didn't capture the
  upstream's header. Verify the `request.BypassBreaker ?
  await client.GetAsync(path) : await s_circuit.ExecuteAsync(...)`
  block in `DemoController.CircuitRequest` includes the
  `resp.Headers.TryGetValues("X-Instance-Id", out var ids)` capture
  and that `upstreamInstance` is in the response Ok(new {…}) object.

### Stage 1: receipt strip doesn't appear at all

- Check browser console for hydration mismatch — the bffInstance
  field on the homepage (SSR) might differ from the client value.
  Per `DEMO_DESIGN_PRINCIPLES.md` rule 7 (no fake metadata) — the
  BFF should stamp from real env, not synthesise.
- Check that `RequestMetadata` interface in `demo-client.ts` matches
  what's in `useDemoSession.ts` and `RequestReceipt.tsx`. If
  TypeScript silently broadens the type, the new fields might not
  flow.

### Stage 2: traffic generator fires but `instanceHits` only has 1 key

Possible causes:
- Only one catalog replica is actually responding (maybe one crashed
  on startup). Check Aspire dashboard.
- Aspire's reverse proxy is sticky to the first responder for some
  reason — try a fresh test session, restart BFF only.
- The traffic generator is calling the BFF endpoint that doesn't go
  through catalog (e.g. the in-process saga start that doesn't fan
  out). Verify the saga's `Initially` block publishes
  `StockReservationRequestedEvent` and that catalog's
  `StockReservationRequestedConsumer` is the path the upstream id
  comes from.

---

## Final state checklist for the handoff

- [x] Stage 1 platform code merged into `feat/portfolio-ui-completion-gemini` (`996f12a`)
- [x] Stage 1 frontend code merged into `main` (`73dc52b`)
- [x] Both build green
- [ ] Aspire restarted with the new catalog binary
- [ ] Curl loop verifies upstreamInstance rotates across requests
- [ ] Browser verifies receipt strip shows `bff-web-XXXX → catalog-svc-YYYY`
- [ ] Stage 2 backend (AmbientTrafficGenerator + controller)
- [ ] Stage 2 frontend (AmbientTrafficControl)
- [ ] Stage 2 acceptance (rate=5 for 30s, instanceHits has ≥2 keys, total ≥150)

The previous session committed and pushed Stage 1 code but did NOT
restart Aspire; the in-flight Gemini agents working in
`ritualworks-platform/` may have WIP that needs preserving before any
restart.
