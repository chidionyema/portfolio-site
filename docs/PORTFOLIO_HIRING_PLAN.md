# Portfolio hiring upgrade — implementation plan

This doc captures the proposed work coming out of the hiring-grade
portfolio review (`docs/HIRING_REVIEW.md` if it exists, or the
review-as-chat-output otherwise). It's the source of truth for the next
4–6 weeks of focused contract-rate work, ~80–120 hours.

The goal is to move the portfolio from **5.5/10 against £700+/day**
("competent demos engineer who's done a tutorial pass on distributed
systems") to **8+/10** ("this person operates a real distributed system
at scale"). The means: stop polishing UI on single-process demos, start
proving the architecture under real load, real chaos, and real
payments.

## Audience and constraint

- Target: London .NET / distributed-systems senior contractor roles at
  £700/day+. Primary markets: fintech (Monzo, Wise, Cleo, Stripe-EU),
  enterprise (BP, M&S, Sky), consultancies. The plan tilts fintech.
- Stack stays: .NET 9 + Aspire + MassTransit + Astro/React. No new
  languages, no K8s, no service mesh.
- Time: 1 month, 80–120 hours. Anything beyond gets cut.
- Real over impressive. A real Stripe sandbox flow that occasionally
  500s (and shows the saga retry it) is better than a polished mock
  that always succeeds.

## The 30-second test (what changes on the homepage)

Today: hero with metric tiles + demo grid. Reads as "look at all my
features" — same template as 10,000 other portfolios.

Target: **a live event mesh driven by ambient synthetic traffic**, with
a `Kill RabbitMQ` button placed prominently next to the visualisation.
Real OTel spans flowing through Tempo. Real P99 latency, real saga
counts, real broker queue depth. Visitor presses chaos button; queue
pressure visibly rises; compensation flows trigger; queue drains as the
broker comes back.

This is **what the candidate actually does for a living, expressed as
an artefact.** It cannot be faked with hashmaps and animations. A
reviewer can validate the claim in 30 seconds.

## The plan — 5 ranked items

### Item 1 — Real OpenTelemetry across all 6 services
**Effort**: ~3 days  
**Risk**: Medium — OTel context propagation through MassTransit can be
fiddly.

**What changes**:
- Audit and complete `ServiceDefaults.cs` OTel setup. Confirm
  `AddOpenTelemetry().WithTracing(...).AddSource(...)` for each
  service and the activity sources match what `DemoController` and
  saga consumers emit.
- Wire MassTransit's OTel instrumentation
  (`Microsoft.Extensions.Telemetry.Abstractions` activity propagation
  on send/consume).
- Verify Tempo container is reachable from each service via OTLP
  (`OTEL_EXPORTER_OTLP_ENDPOINT`, already injected in AppHost).
- Replace `DemoController.StartTrace`'s synthesised trace generation
  with a real Tempo query: client emits a real saga, then `GET
  /api/traces/{id}` queries `Tempo` HTTP API for the actual spans.
- `TraceViewer.tsx` reads the live trace; flame graph renders real
  service names, real latencies.

**Acceptance**:
- `POST /api/demo/saga/start` returns a trace ID in the response
  header AND in the body.
- `GET /api/traces/{id}` returns ≥7 real spans crossing
  `bff-web → orders → catalog → payments → bff-web` with correct
  parent/child relationships and real timings.
- A reviewer opening DevTools sees real OTel headers
  (`traceparent`, `tracestate`) on every cross-service request.

**Why first**: Unblocks items 2, 3, 4. Without it, the saga storm and
chaos demos are still synthesised. The "fake trace" is the most
damaging current anti-signal — fix it first.

**Files**:
- `src/BuildingBlocks/Extensions/ServiceDefaults.cs`
- `src/BffWeb/BffWeb.Api/Controllers/SystemController.cs` (the
  `/api/traces/{id}` handler — un-mock it)
- `src/BffWeb/BffWeb.Api/Controllers/DemoController.cs` (`StartTrace`
  becomes a real saga trigger or is cut)
- `portfolio-site/src/components/demo/TraceViewer.tsx`

---

### Item 2 — Saga storm (the new flagship)
**Effort**: ~5 days  
**Risk**: High — local cluster capacity matters; bad sizing makes the
demo crash.

**What changes**:
- New BFF endpoint `POST /api/demo/saga/storm` accepting
  `{ count, scenarioMix? }`. Server fires N concurrent sagas with mixed
  scenarios (70% success, 20% paymentFailure, 10% stockFailure by
  default).
- New frontend `SagaStormDemo.tsx` (replaces or augments
  `CheckoutDemo`):
  - Primary button: **"Run 50 checkouts"** (or 100 / 200 picker)
  - **Live event mesh visualisation** subscribed to OTel-derived events
    (via SignalR or SSE). Each saga renders as a moving dot or trace
    line through the service topology.
  - **Throughput counter** (sagas/sec, last 10s)
  - **P99 latency tile** (live, last 50 sagas)
  - **Active / completed / failed** counters
  - **Chaos buttons** inline:
    - `Kill RabbitMQ` (uses Aspire DCP API or a chaos endpoint)
    - `Kill catalog instance` (one of N replicas)
    - `Drop Postgres connection` (kill connections via SQL)
    - `Disable Stripe` (toggle a chaos flag in payments)
- Replace homepage hero with this demo (or pin it above-the-fold
  with the existing index untouched).

**Acceptance**:
- Click `Run 50`: within 60s, throughput visible, sagas progressing
  through ladder stages, P99 stabilises around expected
  (~200–500ms per saga locally).
- Click `Kill RabbitMQ` mid-storm: outbox queue depth visibly rises,
  no sagas stuck (state machine waits cleanly), broker comes back,
  queue drains, all sagas eventually reach Completed or Abandoned.
- Per-saga drill-down: click a saga in the storm, opens its real
  OTel flame graph in a side panel.

**Why second**: This is the entire candidate's value prop in one
artefact. Without it, the portfolio is 9 small demos; with it, the
portfolio is 1 flagship + 9 supporting demos.

**Risk mitigation**: Pre-flight a 100-saga test on the local cluster
during dev. If Postgres or RabbitMQ chokes, downsample defaults to 25
or 50. The contrast is the demo, not the absolute number.

**Files**:
- New: `src/BffWeb/BffWeb.Api/Controllers/SagaStormController.cs`
- New: `src/BffWeb/BffWeb.Api/Demo/SagaStormService.cs` (the orchestrator)
- New: `portfolio-site/src/components/demo/SagaStormDemo.tsx`
- New: `portfolio-site/src/components/demo/EventMeshLive.tsx` (the
  visualisation; can extract from existing `EventMesh.tsx`)
- `portfolio-site/src/pages/index.astro` (hero replacement)

---

### Item 3 — Real Stripe sandbox integration
**Effort**: ~5 days  
**Risk**: Medium — webhook tunneling for local dev (Stripe CLI), Vault
secret rotation needs setup.

**What changes** (ranked by hiring signal):
1. Un-mock `StripeCheckoutSessionService` and `StripePaymentProcessor`.
   Real Stripe API key in Vault (`secret/stripe.ApiKey`,
   `secret/stripe.WebhookSecret`).
2. `WebhookHandler` validates real signature with `whsec_*`. Demo
   triggers a real card flow → real Stripe Checkout redirect → real
   webhook fires.
3. **Idempotent webhook processing.** Stripe retries webhooks; the
   saga must handle 5× delivery of the same `evt_xxx` without
   double-charging or double-finalising. Demo button: "Re-fire last
   webhook 5×" — visitor verifies idempotency themselves.
4. **Reconciliation `IHostedService`.** Polls Stripe (`/v1/events`
   filtered to last 24h) every 5 min; finds any successful
   `payment_intent.succeeded` events that didn't arrive via webhook
   (network failure between Stripe and BFF) and reconciles them
   against local saga state.
5. **Refund / chargeback compensation.** When Stripe sends
   `charge.refunded`, the saga compensates: stock returns, order moves
   to refunded state. Demo button: "Issue refund" → real Stripe API.
6. **Test-card matrix** in the demo UI: buttons for `4242…` (success),
   `4000…0002` (decline), `4000…9995` (insufficient funds),
   `4000…3220` (3DS challenge). Each routes the saga differently.

**What's deliberately out**: subscriptions, multi-currency, Stripe
Connect, ACH/SEPA. Commodity integrations that don't add hiring signal.

**Acceptance**: full numbered checklist runs green:
- ✅ Real Stripe checkout redirect from demo
- ✅ Webhook signature validation rejecting forged requests
- ✅ Re-fire webhook 5× → identical end state
- ✅ Stop BFF webhook listener, complete a payment, restart: reconciliation
  job picks up missed event within poll interval
- ✅ Issue refund → saga compensates, stock returns visibly

**Files**:
- `src/Payments/Payments.Infrastructure/Gateways/Stripe/StripePaymentProcessor.cs`
- `src/Payments/Payments.Infrastructure/Gateways/Stripe/StripeCheckoutSessionService.cs`
- `src/Payments/Payments.Api/Controllers/WebhookHandler.cs`
- New: `src/Payments/Payments.Application/Services/StripeReconciliationJob.cs`
- `src/BffWeb/BffWeb.Api/Controllers/DemoController.cs` (test-card buttons)

---

### Item 4 — Multi-instance for cache invalidation + rate limiter
**Effort**: ~2 days  
**Risk**: Low — Aspire's `WithReplicas` is well-trodden.

**What changes**:
- `deploy/aspire/Program.cs`: add `.WithReplicas(2)` to bff-web,
  `.WithReplicas(2)` to catalog-svc.
- Move rate-limiter state from in-process `DemoStateStore` to Redis
  (use existing Redis container; `Microsoft.AspNetCore.RateLimiting`
  with a Redis sink, OR roll your own with `IDistributedCache`).
- Verify cache invalidation pubsub already fans out across replicas
  (via existing Redis pub/sub) — should already work, just needs
  testing.

See the companion doc `ASPIRE_MULTI_INSTANCE.md` in the
ritualworks-platform repo for the gotchas, anti-patterns, and the
specific in-process state that breaks under replication.

**Acceptance**:
- Aspire dashboard shows 2 rows under `bff-web` and 2 under
  `catalog-svc`, each with its own dynamic port.
- Open two browser tabs in different incognito sessions. Use Aspire
  dashboard logs to confirm they landed on different BFF instances.
  Update product price in tab A; tab B refreshes within 1 second.
- Mash rate limiter from one tab; bucket count is consistent across
  both instances (verify by checking each instance's logs).

**Files**:
- `deploy/aspire/Program.cs`
- `src/BffWeb/BffWeb.Api/Demo/DemoStateStore.cs` (rate limiter
  → Redis-backed)
- `src/BffWeb/BffWeb.Api/Controllers/DemoController.cs` (rate limit
  endpoint uses the Redis-backed store)

---

### Item 5 — Voice + CV linkage
**Effort**: ~1 day  
**Risk**: None.

**What changes**:
- Replace homepage hero strapline with a specific, scar-tissue-flavoured
  paragraph. Suggested:
  > "I write the saga compensation logic that runs at 3 a.m. when
  > Stripe's webhook arrives 4 hours late and the user has already
  > requested a refund. Below: a working version, with chaos buttons.
  > Press them."
- Replace saga demo header with:
  > "The hardest bug I ever shipped: a payment that succeeded at
  > Stripe, failed our outbox commit, and resulted in a refund our
  > customer didn't get. The fix was atomic publish-and-commit across
  > three transactions. This demo is that pattern, simplified. Kill
  > any service mid-checkout — the system reconciles."
- New About / CV section (or page): rate, location, stack, NDA-ack,
  3 named refs with role + company.
- Site-wide audit for marketing copy. Cut "delighted", emojis, "built
  with love", "powered by", anything generic.

**Acceptance**: A colleague who doesn't know the candidate reads the
homepage; within 90 seconds they can identify the candidate's
specialty, price, market, and one specific thing the candidate has
shipped.

**Files**:
- `portfolio-site/src/pages/index.astro`
- New: `portfolio-site/src/pages/about.astro` or section
- Site-wide audit (manual review pass)

---

## Cut list (active removal, not deferral)

These hurt more than they help. Remove explicitly.

| File / artefact | Why cut |
|---|---|
| `CacheStampedeDemo.tsx` | Academic. Reads as "I learned about thundering herd from a Cloudflare blog." Not multi-instance, no real DB hit count, no operational story. |
| Standalone `DistributedTracingDemo.tsx` | Replaced by real OTel in the saga storm. The standalone demo becomes redundant once Item 1 ships. |
| Synthetic metric tiles (`Cluster_Healthy`, fake correlation IDs, fake instance counts) | First fake metric flips the reviewer's BS detector and stays flipped. Audit and remove all of them. |
| `Vault__Enabled = "false"` lines on every service | Either turn Vault on (paired with Stripe secret rotation in Item 3) or remove the wiring entirely. The half-state signals "wired but never used." |
| `docs/SUPER_PROMPT.md`, `RUN_PARALLEL.md`, `RECOVERY_PROMPT.md`, `DEMO_DESIGN_PRINCIPLES.md`, `DEMO_BRIEFS.md`, `RUN_PARALLEL_R2.md`, `PARALLEL_DEMO_WORK.md`, `ASSIGN.md` in the public repo | These expose multi-agent AI orchestration during development. For 2026, that's a positive signal in some hiring contexts and a negative in others. Until the candidate knows their audience, move to a private branch or `.gitignore`. |
| Empty/placeholder deep-dive markdown files | If any deep-dive page has stub content, the reviewer assumes the rest is also stubbed. Either complete or remove. |
| Grafana iframe (530s currently) | Broken third-party embed. Cut. |

## Week-by-week

| Week | Items | Hours |
|---|---|---|
| 1 | Item 1 (OTel) + buffer | ~30 |
| 2 | Item 2 (saga storm) | ~30 |
| 3 | Item 3 (Stripe sandbox) | ~30 |
| 4 | Item 4 (multi-instance) + Item 5 (voice) + cuts + polish | ~20 |

If Items 1–3 take longer than estimated, deprioritise Item 4 first. The
saga storm + real Stripe + real OTel is the minimum hireable bundle;
multi-instance is the cherry on top.

## What to test continuously

Throughout the work:
- `npm run build` in portfolio-site stays green
- `dotnet build` solution-wide stays green
- The existing 8 demos that already work (rate limiter, idempotency,
  vault, concurrency, etc.) keep working — they're the supporting
  evidence even after the headline changes
- Aspire `./scripts/aspire-up.sh --no-build` produces a healthy stack
  on cold start, every time

## Acceptance for the whole upgrade

Three criteria. All three must hold:
1. **30-second test**: a fresh hiring manager opens the homepage,
   presses one button, sees the cluster respond under load with real
   OTel spans. They believe the artefact within 30 seconds.
2. **Real money flow**: the demo can take a real test card via
   Stripe, complete a real saga, and the visitor can verify the order
   in their (test) Stripe dashboard.
3. **Survives chaos under load**: kill RabbitMQ during the saga storm.
   No sagas lost. All eventually reach a terminal state. System
   recovers without manual intervention.

If those three hold, the portfolio is at the rate-target bar. If not,
the work isn't done.

## Sanity-check items (need a real human, not me)

[Same caveats as the review:]
- Verify the AI-orchestration-docs cut is the right call for the
  candidate's specific target companies.
- Verify £700+/day is realistic for the current London .NET market in
  this exact niche.
- Verify the saga-storm framing actually plays at fintech screens vs.
  enterprise screens — the recommendation tilts fintech.

Run these past a friendly contact in target companies before
committing the month of work.
