# Show-and-tell — backend integration map

For each section of the show-and-tell page (per
`SHOW_AND_TELL_DRAFT.md`), this doc lists:

- Whether it needs backend (yes / no / partial)
- The endpoint(s) it consumes if backend is involved
- The wire shape and where it's documented
- Whether the backend exists today or has to be built (cross-ref to
  `PORTFOLIO_HIRING_PLAN.md`)

The summary at the bottom rolls up "new backend work required" so
you can see the path-to-shippable at a glance.

---

## Per-section integration

### §1 Opening claim

**Backend**: none.

Pure prose + the page-level connection chip (already wired). The
"Run the chaos test ▸" CTA from this section links to §5, where
the real backend lives.

---

### §2 Naive saga simulator

**Backend**: none.

`SagaSimulator.tsx` (mode = `naive`) — pure client-side React
component, ~300 LOC, framer-motion animations, no fetch, no
SignalR. Shipped today.

The component deliberately does NOT touch any backend. Two reasons:

1. The point of this section is *illustrative*, not operational. The
   visitor needs to see the failure mode in 5 seconds, not wait for
   a real broker to die.
2. The real version of this argument runs in §4 (saga storm) against
   the actual cluster. Section 2 is a sketch; section 4 is the
   evidence. Mixing them dilutes both.

---

### §3 Outbox saga simulator

**Backend**: none.

Same `SagaSimulator.tsx` component, mode = `outbox`. The user
toggles between modes inside the same widget, or two instances are
embedded back-to-back across §2 and §3. Either layout works.

---

### §4 Saga storm under chaos (the flagship)

**Backend**: yes, partially exists; needs new work.

**Existing**:
- `POST /api/demo/saga/start` — fires one saga. Real cluster, real
  saga, real outbox, real bridges. Wire shape:
  `SagaStartResponse = { sessionId, orderId, status, subscriptionToken }`
  per `src/lib/api/demo-client.ts:21-25`.
- `GET /api/demo/saga/{sessionId}` — saga status snapshot.
- SignalR push of `OnSagaStep` events from the bridge consumers in
  `src/BffWeb/BffWeb.Api/SignalR/SagaStepBridgeConsumers.cs`.
- Existing `feat/saga-crash-button` work on the chaos buttons (in
  flight / partially complete from earlier in the session).

**Needs**:
- **NEW**: `POST /api/demo/saga/storm` accepting
  `{ count: int, scenarioMix?: { success?, paymentFailure?,
  stockFailure? } }`. Server fires N sagas concurrently with the
  given mix. Returns one response when all sagas have been
  *initiated*; the SignalR push channel carries the per-saga
  progress.

  *Tracked as Item 2 of `PORTFOLIO_HIRING_PLAN.md`.*

- **NEW**: `POST /api/demo/chaos/broker-pause` and
  `POST /api/demo/chaos/broker-resume` (or a single toggle endpoint).
  Pauses / resumes the RabbitMQ MassTransit publish filter so
  events pile up in the per-context outbox tables.

  Note: there's an existing `UsePublishFilter` hook from earlier
  work (commit `d23bb65 fix(messaging,payments): real relay-pause
  works end-to-end via UsePublishFilter`) that can almost certainly
  be re-used here. Verify before building from scratch.

- **NEW (hiring plan item 1)**: real OpenTelemetry through Tempo so
  the per-saga drill-in shows real spans, not synthesised ones.

**Frontend integration**:
- New component `SagaStormDemo.tsx` in `src/components/showandtell/`.
- Subscribes to existing SignalR `OnSagaStep` events; aggregates
  across all sagaIds returned in the storm response.
- Live event-mesh visualisation: a small SVG topology of the seven
  services with edges that pulse when an event flows.
- Throughput counter (sagas/sec, last 10s window).
- P99 latency tile (per-saga end-to-end time).
- Chaos buttons inline.
- Drill-in: click any saga in the storm → opens existing
  `TraceViewer.tsx` with the trace ID.

---

### §5 The proof — chaos test

**Backend**: optional. Two viable shapes:

**Shape A (zero backend, ship today)**:
- A static code block showing the `dotnet test --filter Category=Chaos`
  invocation.
- A linked screenshot of CI passing the test.
- A link to the test class on GitHub
  (`tests/CheckoutOrchestrator.Integration/SagaCompensationChaosTests.cs`).
- Possibly: a 30-second screen recording of the test running locally,
  embedded as `<video>`. Very low effort, very high credibility.

**Shape B (live runner, ~3 days of work)**:
- New BFF endpoint `POST /api/demo/chaos/run-test` that spawns
  `dotnet test --filter Category=Chaos --logger "console;verbosity=normal"`
  and streams stdout via SSE.
- Frontend renders the streamed lines in a fixed-height terminal
  pane.

Recommend Shape A. The test class header comment in the source is
itself a strong artefact — copy that into the page directly. The
visitor doesn't need to *see* the test run; they need to know it
exists, runs deterministically, and they can run it themselves.
Save the live-runner work for a later iteration if at all.

---

### §6 The 200 lines that make the difference

**Backend**: none.

Static code excerpt from
`src/CheckoutOrchestrator/CheckoutOrchestrator.Application/Sagas/CheckoutSaga.cs`,
embedded with syntax highlighting (Astro's `<Code>` component or
shiki). Plus a "View full file on GitHub" link.

Optional refinement: pull the snippet at build time from the actual
`.cs` file on disk so it stays in sync with the source. Low priority.

---

### §7 What this took to make work — scar tissue

**Backend**: none.

Three numbered stories. Each story links to:

1. A runbook file under
   `ritualworks-platform/docs/runbooks/` (already exists for the
   first three runbooks named in the draft):
   - `aspire-orphan-services-on-macos.md`
   - `payments-integration-docker-flake.md`
   - `serilog-silent-swallow.md`
2. A specific source file referenced by line:
   - `src/BuildingBlocks.Testing/TestModuleInitializer.cs`
   - `src/Payments/Payments.Application/Consumers/PaymentWebhookValidatedConsumer.cs`
   - `tests/CheckoutOrchestrator.Integration/SagaCompensationChaosTests.cs`

These are file links to the GitHub repo. No new endpoints.

If the runbook files are short enough (most are 50-100 lines), embed
the full content inline in the page rather than linking out. Reduces
clicks; the runbooks read well as inline content. Use Astro
markdown processing (`astro:content` collections) to render them.

---

### §8 Why I made the meta-decisions I did — ADRs

**Backend**: none.

A 9-row table linking to each ADR file under
`ritualworks-platform/docs/microservices-migration/adr/`. Same
embed-or-link decision as runbooks; ADRs are 1–2 pages each so
embedding full content is feasible.

Optional: build a small `astro:content` collection that reads the
ADRs at build time, parses the front matter (status, date, deciders),
and renders them as a structured browser. ~1 day of work for a much
better artefact than a flat list. Recommend doing this if budget
allows; a styled ADR explorer is rare and signals decision
maturity.

---

### §9 The same proof shape, applied — supporting demos

**Backend**: yes, all existing.

Five bullets, each links to a smaller standalone show-and-tell
applying the same naive→fix→chaos→proof shape. The backends for
these are already integrated in the platform per the merged
parallel work earlier this session:

- **Idempotency** — `POST /api/demo/idempotency/process` (existing);
  replay produces `isDuplicate: true` with same `orderId`.
  Component: existing `IdempotencyDemo.tsx` (already at the bar per
  the §0 review).
- **Optimistic concurrency** — `GET /api/demo/inventory/{id}` +
  `PUT` with `If-Match` header (existing). 409 on conflict.
  Component: existing `ConcurrencyDemo.tsx` (post round-2 redesign).
- **Distributed rate limiting** — `POST /api/demo/ratelimit/request`
  (existing). Currently in-process token bucket; multi-instance
  upgrade tracked as Item 4 of `PORTFOLIO_HIRING_PLAN.md`.
  Component: existing `RateLimiterDemo.tsx` (post round-2 mash).
- **Vault credential rotation** — `GET /api/demo/vault/status` +
  `POST /api/demo/vault/rotate` (existing). Real dynamic Postgres
  credential upgrade tracked as Item 4 of the hiring plan.
  Component: existing `VaultRotationDemo.tsx` (post round-2 swap).
- **Cache invalidation across instances** — `GET /api/demo/cache/product/{id}`
  + `PUT` (existing). Multi-instance upgrade tracked as Item 4.
  Component: existing `CacheInvalidationDemo.tsx` (post round-2
  customer tab).

Each can be embedded inline in the page as a smaller (~400 px tall)
version of the existing demo, or linked out to a per-pattern
sub-page. Embedding inline keeps the long-scroll narrative; linking
out lets each get its own focused page. **Embed inline by default**;
break out only if the embedded version reads poorly under the
section's prose.

---

### §10 About / hire-me

**Backend**: none.

Static content. Email, LinkedIn, GitHub links. References listed
manually with role + company.

Note: if the candidate wants a "Get in touch" form, that's a separate
backend concern (email-via-API or static form provider). Not in
scope for the show-and-tell shape.

---

## Summary: new backend work required

Mapping the show-and-tell page back to backend items already in
`PORTFOLIO_HIRING_PLAN.md`:

| Show-and-tell section | Existing? | Needs |
|---|---|---|
| §1 Opening claim | n/a | none |
| §2 Naive saga sim | n/a | shipped today |
| §3 Outbox saga sim | n/a | shipped today |
| §4 Saga storm | partial | hiring plan items 1 (real OTel) + 2 (saga storm endpoint) |
| §5 Chaos test proof | n/a | none (Shape A); else 3 days for live runner |
| §6 200 lines of code | n/a | none |
| §7 Scar tissue | n/a | none |
| §8 ADR explorer | n/a | none (1 day if styled explorer) |
| §9 Supporting demos | yes | hiring plan item 4 (multi-instance) sharpens these |
| §10 About | n/a | none |

**Net new backend for the show-and-tell page**: items 1, 2 of the
hiring plan (real OTel + saga storm endpoint). Item 4 (multi-instance)
is *nice-to-have* — it sharpens §9 supporting demos but doesn't
block the page from shipping.

**Frontend new work for the page**: SagaSimulator (shipped today),
SagaStormDemo (depends on backend item 2), and the Astro page itself
that ties §1–§10 together.

**Implementation order recommendation** (matches hiring plan order):
1. Real OTel across services (3 days, hiring item 1)
2. Saga storm endpoint + frontend SagaStormDemo (5 days, hiring
   item 2)
3. Astro page assembly with §1–§10 prose + components (2 days)
4. ADR explorer + runbook embedding (1–2 days, optional polish)

Total: ~10–12 days of focused work for the show-and-tell page
flagship. Can run in parallel with hiring item 3 (real Stripe) and
item 4 (multi-instance) which serve §9's supporting demos.

---

## What this DOESN'T require

To pre-empt scope creep:

- ❌ A new SignalR hub. Existing `/hubs/demo` is sufficient.
- ❌ A new auth model. Demos remain `[AllowAnonymous]`.
- ❌ A separate database for show-and-tell state. Page is mostly
  read-only; saga state lives in checkout-orchestrator's existing
  Postgres.
- ❌ A CMS for the prose. Astro file-based content is sufficient;
  edit Markdown in the repo.
- ❌ A separate deployment pipeline. Same `npm run build`, same
  static output, same hosting.

The show-and-tell page is mostly a *re-organisation* of existing
material plus two new building blocks (saga simulator, saga storm).
Don't let it bloat into a microsite.
