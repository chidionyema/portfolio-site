# Show and tell — homepage draft

This is the prose for the long-scroll homepage, drawn from
`ritualworks-platform`'s `docs/CASE-STUDY.md`, `README.md`, the ADRs
(0001–0009), and the runbooks. Voice extracted from those docs —
direct, opinionated, specific. Edit freely; this is a starting point.

Each section is sized for embedding alongside an interactive figure.
Word counts noted per section. Total ≈ 2,400 words of body prose.

---

## Section 1 — The opening claim

*(~70 words, dominant text on first viewport, single sentence in
display type, supporting paragraph below.)*

### Display

> **In a payment system, every state transition has to publish exactly
> one event — even when the broker dies mid-commit. Most systems can't
> prove this. Below is one that can.**

### Body

I run a deterministic chaos test against this platform. It kills the
saga's payment session mid-flight and asserts that compensation
publishes the right event, the right consumer reverses the right
stock count, and the saga ends in `Abandoned` with zero zombie state.
It runs in CI in 12 seconds. Press the chaos button below and watch
it run live.

### Page furniture

- Single primary CTA below: `Run the chaos test ▸`
- Single secondary link to the GitHub repo
- No demo grid, no nav. The page is the navigation.

---

## Section 2 — The naive version

*(~220 words. Embedded mini-demo: a 4-step saga running in-process,
no outbox, broker-kill button.)*

### Body

The naive version of a payment saga reads like a sequence of
commands. Reserve stock. Create payment session. Capture payment.
Persist order.

```
[Reserve stock]  →  [Create payment session]  →  [Capture]  →  [Persist]
```

It works on the happy path. It works in a unit test. It works in
your interview answer. It also breaks the first time the broker
goes down between the third and fourth step.

The bug: the third step's "publish a `PaymentCompleted` event" and
the fourth step's "save the order to my database" are in different
transactional domains. If the broker crashes between them, you have
an order that was charged but isn't recorded — or, if you publish
*after* saving, you have an order recorded but never charged.

The defensive patches developers reach for — idempotency keys,
optimistic concurrency, manual compensation — are all retroactive
admissions that the procedural orchestration is fighting the
distributed nature of the problem.

### Embedded interaction

[A small inline simulator. 4 boxes. Press `Run`. Watch them light up
green in order. Press `Run` then `Kill broker` between step 3 and 4.
The 4th step never lights up. State summary at the bottom shows the
inconsistency: "Payment captured at Stripe (1) ↔ Order saved to DB
(0)."]

### Body continued

I shipped this bug once. It's why this platform exists.

---

## Section 3 — The fix

*(~250 words. Same simulator from §2, instrumented with the outbox
pattern. Same chaos. Different outcome.)*

### Body

The transactional outbox pattern says: every `Publish` writes a row
to your local database in the same transaction as the state change.
A separate process flushes those rows to the broker.

```
   ┌───────────────────────────────────────────────────────┐
   │  EF SaveChanges (atomic):                             │
   │   • UPDATE orders SET status = 'paid' …               │
   │   • INSERT INTO __OutboxMessage (PaymentCompleted) …  │
   └───────────────────────────────────────────────────────┘
                                 │
                                 ▼
                  [BusOutboxDeliveryService polls]
                                 │
                                 ▼
                       [RabbitMQ — eventually]
```

You can't be in a state where the order is saved but the publish
never happened. The publish *is* a row in the same database, written
in the same transaction. The broker's availability becomes a
*latency* concern, not a *correctness* concern.

### Embedded interaction

[Same 4-step simulator as §2. Press `Run`. Press `Kill broker` mid-flight.
This time the outbox row is visible (a small badge appears on step 3:
"queued in outbox, waiting for broker"). Press `Restore broker`. The
queued event flushes; step 4 completes; state summary shows
consistency.]

### Body continued

Worth being honest: this isn't a free pattern. The outbox row is in
the same database as the business state, so its retention shape
matters. If a service produces 10k events/sec and the broker is down
for an hour, that's 36 million rows accumulating in the outbox table
— vacuum behaviour, index bloat, and eventual flush throughput
become real concerns. MassTransit's
`AddEntityFrameworkOutbox` handles the basics; the operational shape
(dead-letter queues, max-row caps, alerting on outbox depth) is
work that goes with this pattern, not a free win.

The platform uses MassTransit's `AddEntityFrameworkOutbox<>` with
`UseBusOutbox`, per-context. See [ADR-0004 on database-per-service](#)
for the corollary: each service has its own outbox table because each
service has its own database.

---

## Section 4 — The scale

*(~280 words. Embedded saga storm — 50 concurrent sagas across 7 real
services, with chaos buttons.)*

### Body

A pattern works in a 4-step diagram. Whether it works at scale, under
chaos, across multiple services, is a different question.

This platform is seven services, talking only over RabbitMQ
(`MassTransit + EntityFrameworkOutbox`) and gRPC. The checkout flow
involves three of them: `orders`, `catalog`, `payments`, coordinated
by a fourth — `checkout-orchestrator` — running a MassTransit state
machine.

The checkout state machine has six states (`Initial`, `Initiated`,
`StockReservedState`, `ReadyForPayment`, `Completed`, `Abandoned`)
and explicit compensation arrows for every failure mode. It owns no
business logic — only state transitions and which event to publish
on the way to the next state. The business work happens inside the
domain services. See [`CheckoutSaga.cs`](#) (105 lines) for the
entire state machine.

Below: the same pattern across all seven services, under load.
Press `Run 50 checkouts` to fire fifty concurrent sagas. Each
produces about 12 events across the cluster. Watch the throughput
counter. Then press one of the chaos buttons.

### Embedded interaction

[The saga storm flagship: live event mesh, throughput counter, P99
latency tile, active/completed/failed counts. Three chaos buttons:
`Kill RabbitMQ` / `Kill catalog instance` / `Disable payments`. After
the storm subsides, a button to drill into any specific saga and see
its real OTel flame graph through Tempo.]

### Body continued

What you should see:

- Steady-state: ~50 sagas in ~5 seconds. P99 around 200ms per saga.
- Kill RabbitMQ mid-storm: saga progress freezes (the orchestrator
  is waiting for events that can't arrive). The outbox depth ticks
  up. No sagas have failed yet.
- Restore RabbitMQ: the queued events flush in order. Sagas resume.
  All eventually reach `Completed` or `Abandoned`. None lost.
- Kill the catalog instance during the storm: half the sagas land
  on the surviving instance; the rest retry once the killed instance
  comes back. Per-saga latency rises, but no saga is stuck.

This is the headline claim. The rest of the page is supporting
evidence.

---

## Section 5 — The proof

*(~190 words. Code-block prominent: the actual `dotnet test` command
that runs the headline chaos test.)*

### Body

The chaos test is not a marketing artefact. It's a deterministic
xUnit test that runs in CI in 12 seconds. You can clone the repo and
run it.

```bash
git clone https://github.com/chidionyema/ritualworks-platform
cd ritualworks-platform
dotnet test --filter Category=Chaos
```

What happens:

1. A real Postgres container starts (Testcontainers).
2. The `CheckoutSaga` is registered with `MassTransitTestHarness`.
3. A real `CheckoutInitiatedEvent` is published.
4. The test waits for `StockReserved` to land, then publishes
   `PaymentSessionFailed` — the in-process equivalent of "kill the
   payment service mid-flight."
5. The test polls the actual end-state condition: saga `CurrentState
   == 'Abandoned'`, stock count restored to original. Not
   `harness.Consumed.Any<T>` — that returns true microseconds before
   the publish lands and produces flaky results. See
   [`SagaCompensationChaosTests.cs:60`](#) for the comment that
   explains this and links to the original race-conditioned version.

The test passes. Every commit. Receipts in CI history.

---

## Section 6 — The 200 lines that make the difference

*(~190 words. Embedded code panel — the saga state machine — with
syntax highlighting and a side comment.)*

### Body

The interesting code in this platform is small. Most of the line
count is plumbing.

The state machine is 105 lines. The outbox registration is 8.
The bridge consumers (which translate domain events into SignalR
pushes) are about 100 lines combined. The compensation logic is
inside the saga's `When(PaymentSessionFailed)` arrow — 12 lines.

```csharp
// CheckoutSaga.cs (excerpt)

During(StockReservedState,
    When(PaymentSessionFailed)
        .Then(ctx => ctx.Saga.FailureReason =
            $"PaymentSessionFailed: {ctx.Message.ErrorCode}")
        .PublishAsync(ctx => ctx.Init<StockReleaseRequestedEvent>(new()
        {
            OrderId = ctx.Saga.OrderId,
            SagaId  = ctx.Saga.CorrelationId,
            Items   = DeserializeItems(ctx.Saga.ReservedItemsJson),
            Reason  = "payment_session_failed",
        }))
        .TransitionTo(Abandoned));
```

That's the entire compensation arrow. Stock release is published as
a fact (`StockReleaseRequested`), not requested as a command. The
`catalog-svc` consumer reads it from the bus and reverses each
`Product.ReleaseStock(qty)`.

This is the right shape because the saga doesn't *issue commands*;
it *announces state changes* and lets each context react. If
catalog-svc is down when the message lands, RabbitMQ holds it; when
catalog-svc returns, the consumer drains the queue. No retries in
the saga. No timeouts in the saga. The transport guarantees
delivery; the consumer guarantees idempotency. Each layer owns its
responsibility.

---

## Section 7 — What this took to make work

*(~330 words. Three numbered scar-tissue stories with file pointers.
Conversational, owned, specific.)*

### Body

This wasn't shipped without surprises. Three things broke in ways
that took meaningful debugging time, and each fix is documented in
the runbook directory because I expect to hit similar shapes again.

**1. Testcontainers + Docker Desktop on macOS, day one.** The first
time I ran the integration suite, every test failed with a
catastrophic regex backtrack inside Testcontainers' `MatchImage`
function — a benign image tag triggered exponential matching. Fixing
that revealed the second issue: Docker Desktop's socket had moved
from `/var/run/docker.sock` to `~/.docker/run/docker.sock`, and the
Ryuk reaper container couldn't bind-mount the new path.

The fix is a `[ModuleInitializer]` in
[`src/BuildingBlocks.Testing/TestModuleInitializer.cs`](#) that runs
before any test discovers Docker, sets `DOCKER_HOST` and
`TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE`, and raises the regex
timeout to 5 seconds. The file is `<Compile Include>`-linked into
every integration test project so the fix is symmetric.

**2. In-memory MT transport vs EF outbox.** The Stripe webhook
idempotency test was flaky — replaying the same `evt_xxx` 3× sometimes
produced 3 publishes, sometimes 1. The cause: in-memory MT
transport publishes synchronously, but the production EF outbox
captures publishes inside the same DB transaction as the dedup row.
The fix wasn't to change production. It was to assert the
production-correct guarantee: `OutboxMessage` row count, not
`harness.Published` count. The
[comments in `PaymentWebhookValidatedConsumer.cs`](#) carry the
trade-off forward for the next person.

**3. The chaos test that almost wasn't.** The saga compensation
chaos test initially used `harness.Consumed.Any<T>()` to wait for
events. This returns `true` microseconds before the downstream
publish lands in `harness.Published`, producing race-condition
failures under CI load. Replaced with `PollUntilAsync` that polls
the actual end-state condition (saga is `Failed`, stock is
restored). The chaos test went from flaky-when-CI-was-busy to
deterministic — runs in 12 seconds, every commit, on every machine.

These are not war stories. They're how the platform is built —
each fix lives in a runbook because the next person to hit it
should find it in 90 seconds, not three days.

---

## Section 8 — Why I made the meta-decisions I did

*(~280 words. Compact ADR list, each with a 1-line rationale and a
"why this and not that" pointer.)*

### Body

A microservice migration is a thicket of small decisions, most of
which are reversible if you write them down at the time. I wrote
nine ADRs during this build. Each is a one-page document with the
options considered, the trade-offs, and the call.

| ADR | Decision | Rejected alternative |
|---|---|---|
| [0001](#) | Strict monorepo with physically-enforced service boundaries | Polyrepo per service, hybrid contracts-monorepo |
| [0002](#) | Aspire for local dev, kind+ArgoCD for production-shape demo | Pure Kubernetes (Tilt), pure Docker Compose |
| [0003](#) | Saga as its own service (`checkout-orchestrator`) | Saga inside `orders-svc` |
| [0004](#) | Database-per-service in a shared Postgres cluster | Schema-per-service, Postgres-instance-per-service |
| [0005](#) | JWT RS256 + JWKS rotation | HS256 with shared secret in Vault |
| [0006](#) | Self-hosted Pact broker via Helm | Pact Broker SaaS, no-broker file-based contracts |
| [0007](#) ⓢ | (Superseded) Strangler-fig migration over 14 weeks | — |
| [0008](#) | Clean-slate greenfield over strangler-fig | The plan in 0007 |
| [0009](#) | Existing monolith is reference, not source | Selective port from monolith |

The most important call was 0004 — database-per-service. Every
other decision flows from it. You can't `JOIN` the other service's
table, so you publish events. You can't share `DbContext`, so each
service owns its outbox. You can't share `__EFMigrationsHistory`,
so each service owns its migrations. The decision shapes everything
downstream.

The most instructive ADR is 0007 — the strangler-fig plan I
originally chose, then rejected for 0008 once I stopped pretending
the monolith had real users. I kept 0007 in the repo with a
"Superseded" header rather than deleting it. The decision-trail is
more valuable than the decision.

---

## Section 9 — The same proof shape, applied

*(~180 words. A short list of supporting demos, each with one
sentence + one inline interaction.)*

### Body

The pattern in §3 — atomic publish-and-commit, transport-mediated
delivery, consumer-mediated idempotency — generalises to every
distributed concern in this platform. Each link below is a smaller
show-and-tell with the same naive → fix → chaos → proof shape.

- **Idempotency.** Replay the same Stripe webhook three times. Same
  `orderId` returns. The dedup row is in the same DB transaction as
  the saga state, so the production guarantee is "exactly once" even
  under network adversity. → [demo · code · runbook]
- **Optimistic concurrency.** Two cart updates land at the same
  millisecond. One wins, one gets a 409. The loser's UI snaps to the
  winner's version. → [demo · code]
- **Distributed rate limiting.** Token-bucket state in Redis,
  shared across BFF replicas. Press "Mash for 5 seconds." → [demo]
- **Vault credential rotation.** Postgres dynamic credentials
  rotate every 60s. Active connections survive the rotation. →
  [demo · code]
- **Cache invalidation across instances.** Update product price in
  one BFF instance; the other refreshes via Redis pub/sub. → [demo]

Each is a smaller version of the same argument. None of them sells
the platform on their own; together they describe the operational
posture.

---

## Section 10 — About / hire me

*(~140 words. Direct, NDA-respecting, with named refs and rate.)*

### Body

I'm available for senior contract work in London. .NET 9 / Aspire /
distributed systems / payments / Vault. Day rate £750+. The portfolio
above is what I build on Saturdays — most of my production work is
under NDA, but I can walk you through one live production saga
design in a 30-minute call. References available on request from
prior engagements at [Company A], [Company B], [Company C].

I'm most useful on teams that have a payment system, a saga that's
fighting itself, or a microservices migration that's stalled at
the "we have services but they all share a database" phase. If
that's your shape, get in touch.

[chidi@example.com] · [LinkedIn] · [GitHub]

---

## Implementation notes for the Astro page

- **One file**: `src/pages/index.astro` becomes the show-and-tell
  page. The current homepage gets cut.
- **Section component**: `<ShowAndTellSection prose=… interaction=… />`
  — three columns max:
  - Left or full-width: prose
  - Centre or right: embedded interaction (one of the existing demo
    components, restyled to ~400px tall instead of full-page)
- **Interactions to build (new vs reuse)**:
  - §2 (naive saga simulator): NEW — small client-side React
    component, ~150 LOC. No backend.
  - §3 (outbox-instrumented saga): NEW — same component, different
    flag. ~+30 LOC.
  - §4 (saga storm): NEW — backend endpoint + frontend, per the
    PORTFOLIO_HIRING_PLAN.md item 2.
  - §5 (chaos test runner): could be a static "code block + git
    history of CI runs" or a live runner if budget allows.
  - §6 (code panel): static highlight, link to GitHub.
  - §9 (mini supporting demos): reuse existing components, restyled.
- **Chrome to remove**: nav sidebar, demo grid, status tray,
  command palette, anything that breaks the long-scroll narrative.
- **Chrome to keep**: the live cluster connection chip top-right
  (it's the proof the page is alive); the trace receipt strips below
  each interaction.
- **Total scope**: ~4 days of focused work for the page itself,
  assuming the saga-storm flagship from the hiring plan ships
  separately as item 2 of that plan.

---

## What the existing site has that should NOT survive

Per the cut list elsewhere — listed here so the show-and-tell author
doesn't accidentally reach for them:

- The 10-demo grid (replaced by §4 + §9)
- The metric tiles ("Cluster_Healthy", fake correlation IDs)
- The architecture diagram on the homepage (move to a deeper page or
  cut)
- The placeholder deep-dive markdown files
- The Grafana iframe (530s currently)
- The `docs/SUPER_PROMPT.md` / `RUN_PARALLEL.md` etc — repository
  hygiene rather than visitor concern

The homepage's job is to land one argument with maximum density.
Everything that doesn't serve that argument is cut.
