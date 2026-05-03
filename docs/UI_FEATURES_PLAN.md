# UI Features & Backend Integration Plan

**Status:** canonical. This document covers every feature on the site — the 9 existing demos, 6 new demos, and 10 cross-cutting UI surfaces — with the same six-section template per feature: UI spec / backend contract / infra surface / failure & empty states / implementation steps / definition of done.

**Companion documents:**
- `DEMO_API_INTEGRATION.md` — authoritative wire-protocol reference for the original 9 demos. Cross-linked here, not duplicated. Where its specs are thin, this document fills them.
- `PORTFOLIO_UI_SPEC.md` — earlier design spec. Superseded by §0 (visual system) below where they conflict.
- `PORTFOLIO_INFRA_AUTOMATION.md` — Terraform-managed services. All `infra/...` paths in this doc resolve there.
- `IMPLEMENTATION_SPEC.md` — backend API surface scaffolding.

When a section references a service (Fly.io app, Grafana dashboard, RabbitMQ queue, Vault path), the canonical Terraform definition lives under `infra/terraform/modules/<provider>/`.

---

## Table of Contents

0. [Visual system & honesty contract](#0-visual-system--honesty-contract)
1. [Feature inventory (master)](#1-feature-inventory-master)
2. [Cross-cutting backend concerns](#2-cross-cutting-backend-concerns)
3. [Cross-cutting UI feature specs](#3-cross-cutting-ui-feature-specs)
   - [3.1 Live system status strip](#31-live-system-status-strip)
   - [3.2 Embedded Grafana panels](#32-embedded-grafana-panels)
   - [3.3 Per-demo trace viewer](#33-per-demo-trace-viewer)
   - [3.4 Chaos button (controlled fault injection)](#34-chaos-button-controlled-fault-injection)
   - [3.5 Interactive architecture diagram](#35-interactive-architecture-diagram)
   - [3.6 Code drawer per demo](#36-code-drawer-per-demo)
   - [3.7 Deep-dives content engine](#37-deep-dives-content-engine)
   - [3.8 Live hero metrics](#38-live-hero-metrics)
   - [3.9 Signature visual (event mesh canvas)](#39-signature-visual-event-mesh-canvas)
   - [3.10 Accessibility & performance scorecards](#310-accessibility--performance-scorecards)
4. [Demo hub restructure](#4-demo-hub-restructure)
5. [Existing demo specs (the 9)](#5-existing-demo-specs-the-9)
6. [Frontend file layout](#6-frontend-file-layout)
7. [Build & deploy sequencing](#7-build--deploy-sequencing)

---

## 0. Visual system & honesty contract

### 0.1 Visual direction (committed): editorial-precise

The site reads as **NYT × Linear**: editorial gravity meets technical precision. Three deliberate moves:

| Aspect | Choice | Rationale |
|---|---|---|
| Display type | Fraunces (or GT Sectra Display) | Serif headlines signal craft and calm; differentiates from every Inter-only dev portfolio. |
| Technical type | JetBrains Mono | Used for code, event names, metrics, traces — anywhere the reader's eye wants alignment. |
| UI chrome type | Inter | Buttons, labels, nav. The boring choice on purpose. |
| Surfaces | Opaque, 1px hairline borders | No glass morphism. No backdrop-blur. Crispness reads contemporary in 2026. |
| Color | Off-black on warm off-white (light); near-black with single accent (dark) | One accent (signature gradient or solid) used at most twice per viewport. Restraint is the brand. |
| Spacing | 8pt grid, generous outer margins | Editorial feel. Don't fill the viewport edge-to-edge above tablet breakpoint. |
| Iconography | Lucide (or curated subset) | No emoji anywhere. Consistent stroke weight. |
| Motion | Scroll-linked reveals + magnetic CTA + spring tab transitions | One signature interaction per surface, never all of them. `prefers-reduced-motion` honored throughout. |

Tokens defined in `tailwind.config.mjs` and `src/styles/global.css`. `BaseLayout.astro` loads the type pair via `font-display: swap` from a self-hosted (or fontsource) bundle to keep first paint fast.

### 0.2 Honesty contract — copy that survives the backend rollout window

The site's strongest claims (`HeroLite.tsx:62` "Here's one running" / `DemoHubLite.tsx:90` "interfaces with real infrastructure") are **only true once the backend is wired**. Until then, the site ships with two surgical interim edits:

| Surface | Pre-backend copy | Post-backend copy (revert) |
|---|---|---|
| Hero subhead | *"Here's how I build them."* | *"Here's one running."* |
| Demo hub footer | *"Interactive walkthroughs of the patterns. Wired to live infra in {month}."* | *"These demos interface with real infrastructure."* |

Both strings are sourced from a single constant `src/lib/copy.ts` — `BACKEND_LIVE = false` flips them. No other copy makes claims that depend on backend reality.

This is the **only** UI concession to backend timing. Everything else (typography, layout, demos, deep-dives, OG image, palette, motion) ships without dependency on backend state.

### 0.3 Definition of "world-class" for this site

Concretely: a hiring manager screenshots the hero and shares it in a Slack channel. A senior engineer reads a deep-dive end to end. A platform team links to a demo as a teaching reference. Three observable outcomes, not vibes.

---

## 1. Feature inventory (master)

### 1.1 Cross-cutting UI features (10)

| # | Feature | Surface | Transport | Caching | Priority |
|---|---------|---------|-----------|---------|----------|
| 3.1 | Live system status strip | global header | SSE (`/health/stream`) + REST fallback | 5s edge cache on REST | P0 |
| 3.2 | Embedded Grafana panels | architecture & hero | iframe + JSON snapshot API | snapshot 60s | P0 |
| 3.3 | Per-demo trace viewer | inside each demo | REST `/traces/{id}` | none | P0 |
| 3.4 | Chaos button | demo controls | REST `/chaos/*` (idempotent) | none | P1 |
| 3.5 | Interactive architecture diagram | `/architecture` section | static SVG + live overlay via SSE | overlay 2s | P1 |
| 3.6 | Code drawer per demo | inside each demo | static (build-time) | immutable | P1 |
| 3.7 | Deep-dives content engine | `/deep-dives/*` | Astro content collection (MDX) | static | P1 |
| 3.8 | Live hero metrics | hero section | REST `/metrics/live` (poll 10s) | edge cache 10s | P2 |
| 3.9 | Signature visual (event mesh) | hero | client-only canvas, fed by status SSE | n/a | P2 |
| 3.10 | A11y & perf scorecards | footer / `/quality` | static badges, CI-published | static | P2 |

### 1.2 Existing demos (9, the original set)

| # | Demo | Group | Transport | Backend ref |
|---|------|-------|-----------|-------------|
| 5.1 | Saga (Checkout) | Data integrity | SignalR + REST POST | `DEMO_API_INTEGRATION.md §Demo 1` |
| 5.2 | Event Flow (Outbox) | Data integrity | SignalR | `DEMO_API_INTEGRATION.md §Demo 2` |
| 5.3 | Concurrency (optimistic locking) | Data integrity | REST | `DEMO_API_INTEGRATION.md §Demo 8` |
| 5.4 | Circuit Breaker | Resilience | REST POST + SSE | `DEMO_API_INTEGRATION.md §Demo 3` |
| 5.5 | Idempotency | Resilience | REST POST | `DEMO_API_INTEGRATION.md §Demo 5` |
| 5.6 | Rate Limit | Resilience | REST burst | `DEMO_API_INTEGRATION.md §Demo 9` |
| 5.7 | Cache Stampede | Caching | REST burst + SSE | `DEMO_API_INTEGRATION.md §Demo 6` |
| 5.8 | Cache Invalidation | Caching | REST + SignalR pub/sub | `DEMO_API_INTEGRATION.md §Demo 7` |
| 5.9 | Vault Rotation | Coordination | REST + SSE | `DEMO_API_INTEGRATION.md §Demo 4` |

### 1.3 New demos

**Out of scope.** The demo set is bounded by what the RitualWorks backend supports. The existing 9 demos in §1.2 are the canonical set. Proposals for additional demos (read-your-writes, backpressure, hedged requests, leader election, canary deploy, event sourcing replay) were rejected because they would require new backend capabilities, which is outside the scope of this work. If the backend later grows new patterns, they can be added here without changing the structure.

**Priority bands:** **P0** = ship before any demos go live (status strip, trace viewer, Grafana panels). **P1** = ship within first sprint after P0 (chaos, architecture, code drawer, deep-dives). **P2** = polish (hero metrics live wiring, mesh visual, scorecards).

---

## 2. Cross-cutting backend concerns

### 2.1 Backend topology recap

The infra (already provisioned by `infra/terraform/`) gives us:

- **Fly.io app `portfolio-api`** — ASP.NET Core 9 minimal API. Hosts all REST endpoints and SignalR hubs. Region: `lhr`. 3 free machines auto-stop.
- **Fly.io app `portfolio-vault`** — HashiCorp Vault dev mode for rotation demo only.
- **Neon Postgres** — outbox + saga state + idempotency keys.
- **Upstash Redis** — caches, rate-limit token buckets, distributed locks.
- **CloudAMQP RabbitMQ (Lemur)** — domain events between bounded contexts.
- **Grafana Cloud** — Prometheus + Loki + Tempo. Panels rendered into the site via signed snapshot URLs.
- **Cloudflare Pages** — Astro static build + edge functions for caching layer.

All new endpoints below are added to `portfolio-api` unless noted.

### 2.2 Auth model

Three tiers:

1. **Public read endpoints** (status, metrics, traces, code, deep-dives) — no auth, but rate-limited per IP via Upstash token bucket (`60 rpm` baseline).
2. **Demo write endpoints** (saga trigger, chaos, idempotency probe) — require a short-lived **demo token** minted by `/demo/session` (returns JWT, 10 min TTL, bound to IP). Mint is rate-limited (`5 rpm/IP`).
3. **Admin endpoints** — none exposed publicly. Operator-only via `flyctl ssh`.

The demo token avoids two failure modes: random script kiddies hammering `/chaos/*`, and a single user being able to monopolize the saga queue. Token issuance is intentionally unauthenticated — the security boundary is rate + session-scoped fault budgets, not identity.

### 2.3 Transport choices — when to use what

| Need | Transport | Rationale |
|------|-----------|-----------|
| One-shot fetch (code, traces, panel snapshots) | REST GET | cacheable on edge |
| Continuous live updates (status, event stream, mesh viz) | **SSE** | one-way, auto-reconnect, no SignalR overhead, plays well with Cloudflare |
| Bidirectional with backpressure (saga events with ack) | SignalR (existing `useSignalR.ts`) | already wired, keep for demos that need server→client→server |
| Mutation (trigger saga, fire chaos) | REST POST | idempotent via `Idempotency-Key` header |

Default to SSE for any new "live" surface. Reserve SignalR for the existing demos.

### 2.4 Idempotency

Every POST accepts an `Idempotency-Key` header (UUID v4). The API stores `(key, response_body, status)` in Postgres for 24h. Re-submission returns the cached response. Frontend generates the key once per logical user action and replays it on retry.

### 2.5 Rate limiting

Token bucket in Redis, keyed by `ip+route_class`. Three classes:

- `read` — 60 rpm
- `mint` — 5 rpm (demo session creation)
- `write` — 30 rpm (saga, chaos, etc., gated by demo token)

429 response includes `Retry-After` and `X-RateLimit-Remaining`. Frontend surfaces this as a small toast with countdown.

### 2.6 Observability contract

Every endpoint emits:

- W3C `traceparent` (propagated to downstream services).
- Prometheus histogram `http_request_duration_seconds{route,status}`.
- Loki log line with correlation ID.

The trace viewer (Feature 3) and Grafana panels (Feature 2) consume these directly — no parallel telemetry path.

---

## 3. Cross-cutting UI feature specs

### 3.1 Live system status strip

**Where:** thin sticky bar above the hero, ~32px tall. Visible site-wide.

**What it shows:** dot per service (API, Postgres, Redis, RabbitMQ, Vault), color-coded green/amber/red, with hover tooltip showing last check time and p99 latency over last 5 min. A "deploy SHA" badge on the right links to the GitHub commit.

**Interaction:** click a dot → opens a tray with the last 20 health-check transitions (timeline). Click the deploy badge → opens commit on GitHub.

**Why:** before the user scrolls a pixel, they see the system is real and currently up.

#### Backend contract

**Endpoint:** `GET /health/stream` (SSE).

**Response stream:**
```
event: status
data: {"ts":"2026-05-02T10:14:33.221Z","services":[
  {"id":"api","status":"healthy","p99_ms":47,"checked_at":"..."},
  {"id":"db","status":"healthy","p99_ms":12,"checked_at":"..."},
  {"id":"redis","status":"healthy","p99_ms":3,"checked_at":"..."},
  {"id":"mq","status":"degraded","p99_ms":210,"checked_at":"...","note":"queue depth >1000"},
  {"id":"vault","status":"healthy","p99_ms":18,"checked_at":"..."}
],"deploy_sha":"7f1b630","uptime_s":48211}
```

Emitted every 5s. Server keeps an in-memory snapshot updated by a background `IHostedService` (`HealthAggregator`) that runs each probe on its own cadence:

- API: self (`/healthz`), 1s
- DB: `SELECT 1` against Neon, 5s
- Redis: `PING` to Upstash, 5s
- RabbitMQ: management API `/api/aliveness-test/%2F`, 10s
- Vault: `/v1/sys/health`, 10s

Status mapping: `healthy` if last 3 probes succeeded; `degraded` if last 3 included ≥1 failure but not 3; `down` if last 3 all failed.

**Fallback REST:** `GET /health/snapshot` returns the same JSON envelope. Frontend uses it on initial render (so SSR / first paint has data) and as a fallback if EventSource drops.

#### Frontend

- New component `src/components/system/StatusStrip.tsx` (client:load), client-side `useEventStream('/health/stream')` (existing hook at `src/hooks/useEventStream.ts`).
- Initial state hydrated from `/health/snapshot` fetched in the Astro frontmatter and serialized into the HTML — so the bar shows real status on first paint, no spinner.
- On SSE error: keep last good state, show a tiny "reconnecting…" pulse on the strip.

#### Failure & empty states

- Cold start (no probes complete yet): all dots gray, label "warming up".
- Stream disconnected >30s: show amber banner "Live status stale (last update 31s ago)".
- All services down: show red banner with link to `/runbook`.

#### Infra surface

- New Fly.io app endpoint, no new infra needed.
- Probe credentials live in Fly secrets (`POSTGRES_HEALTH_DSN`, `REDIS_HEALTH_URL`, `RABBITMQ_MGMT_URL`, `VAULT_TOKEN_HEALTH`). Add to `infra/terraform/modules/flyio/secrets.tf`.

#### Implementation steps

1. Backend: `HealthAggregator` `IHostedService` + per-service `IHealthProbe` impls.
2. Backend: SSE endpoint `MapGet("/health/stream", ...)` using `Results.Stream` and a `Channel<StatusSnapshot>`.
3. Backend: `MapGet("/health/snapshot", ...)` returns latest from aggregator.
4. Frontend: `StatusStrip.tsx` + tray drawer.
5. Astro: include hydrated snapshot via `Astro.props` in `BaseLayout.astro`.
6. Wire `deploy_sha` from `git rev-parse --short HEAD` injected at build time as `GIT_SHA` env var.

---

### 3.2 Embedded Grafana panels

**Where:**
- Architecture section (under the diagram): three panels — request rate, p99 latency, RabbitMQ queue depth.
- Hero metrics row (Feature 8): one tiny sparkline panel.

**What:** Grafana Cloud public dashboard rendered as iframe with `kiosk=tv` and a fixed time range (`from=now-1h&to=now`). Panels auto-refresh every 30s.

**Why:** real graphs of real traffic is the single most credible signal a candidate can show. It's also the move that turns "I claim 99.9% uptime" into "here's the SLI on a graph."

#### Backend contract

Two paths:

**Path A — direct iframe (default):**
```
https://<org>.grafana.net/d-solo/<dashboard-uid>/portfolio?orgId=1&panelId=2&kiosk=tv&from=now-1h&to=now&theme=dark
```
Dashboard must be set to "Public dashboard" in Grafana (free tier supports this with a read-only token).

**Path B — server-rendered snapshot fallback:**

For users with strict CSP / iframe blockers, expose `GET /panels/{panel_id}.svg` from `portfolio-api` which:
1. Calls Grafana's render API (`/render/d-solo/...?width=600&height=200&tz=UTC`).
2. Returns the rendered SVG, edge-cached at Cloudflare for 60s.
3. Falls back to a "panel unavailable" SVG if Grafana errors.

Edge cache key: `panel_id + hour bucket`. This caps Grafana render load to ~24 calls/day/panel regardless of traffic.

#### Frontend

- `src/components/metrics/GrafanaPanel.tsx` — props: `panelId`, `height`, `mode: 'iframe' | 'snapshot'`. Renders iframe by default, swaps to `<img src="/panels/{id}.svg">` on iframe load failure.
- Loading state: skeleton with shimmering bars at correct height (no layout shift).
- The first panel above-the-fold uses `loading="eager"`; below-the-fold panels use `loading="lazy"`.

#### Dashboard definitions

Define in `infra/terraform/modules/grafana/dashboards/portfolio.json` (Terraform `grafana_dashboard` resource, already scaffolded):

| Panel ID | Title | Query (PromQL) |
|----------|-------|---------------|
| 1 | Request rate (rps) | `sum(rate(http_requests_total[1m]))` |
| 2 | API p99 (ms) | `histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) * 1000` |
| 3 | RabbitMQ queue depth | `sum(rabbitmq_queue_messages) by (queue)` |
| 4 | Saga success rate | `sum(rate(saga_completed_total[5m])) / sum(rate(saga_started_total[5m]))` |
| 5 | Hero sparkline (req/s, last 1h) | same as 1, render-only |

#### Failure & empty states

- Grafana token rotated / dashboard deleted: snapshot endpoint returns the "unavailable" SVG with a link to GitHub for the panel definition. Page still renders.
- No traffic in window: panel shows "No data — system is idle. Click 'Run Saga' above to generate traffic." This is a feature, not a bug — encourages interaction.

#### Infra surface

- `infra/terraform/modules/grafana/main.tf` — adds `grafana_dashboard.portfolio` and `grafana_dashboard_public.portfolio` (public dashboard token).
- Output `public_dashboard_url` consumed by Astro at build time as `PUBLIC_GRAFANA_URL`.
- Render API token in Fly secret `GRAFANA_RENDER_TOKEN`.

---

### 3.3 Per-demo trace viewer

**Where:** below each demo's event stream, collapsed by default ("View trace →"). Expands to a Gantt-style waterfall.

**What:** after any demo run, the frontend has a `traceId`. The viewer fetches the spans and renders them as horizontal bars on a time axis, color-coded by service, with hover details (operation, duration, attributes, error if any).

**Why:** anyone can `Console.WriteLine` an event log. Showing actual OpenTelemetry spans separates the candidates who instrument their systems from those who don't.

#### Backend contract

**Endpoint:** `GET /traces/{traceId}`

**Response:**
```json
{
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
  "rootSpanId": "00f067aa0ba902b7",
  "durationMs": 312,
  "spans": [
    {
      "spanId": "00f067aa0ba902b7",
      "parentSpanId": null,
      "service": "orders-api",
      "operation": "POST /saga/checkout",
      "startMs": 0,
      "durationMs": 312,
      "status": "OK",
      "attributes": {"http.method":"POST","http.status_code":200,"order.id":"..."}
    },
    {
      "spanId": "...",
      "parentSpanId": "00f067aa0ba902b7",
      "service": "orders-domain",
      "operation": "OrdersHandler.Handle",
      "startMs": 4,
      "durationMs": 18,
      "status": "OK",
      "attributes": {}
    }
    // ...
  ]
}
```

Backend reads from **Grafana Tempo** via its query API (`/api/traces/{traceId}`), translates Tempo's protobuf JSON into the simpler envelope above, and caches in Redis for 10 minutes (traces are immutable). Cache key: `trace:{traceId}`.

#### Frontend

- `src/components/demo/TraceViewer.tsx` — accepts `traceId`, fetches lazily on first expand.
- Renders an SVG waterfall (no chart library — keeps bundle small). Bars are `<rect>` with a `<title>` for native tooltip; on click, shows a side panel with full attributes.
- Service color palette matches the bounded-context colors already used in `CheckoutDemo.tsx:57-64`.

Wiring into demos:
- Each demo's `runSimulation` function (e.g., `CheckoutDemo.tsx:20`) currently fakes events. When wired to the real API (per `DEMO_API_INTEGRATION.md`), the response carries `X-Trace-Id`. Store it in component state, pass to `<TraceViewer traceId={traceId} />`.
- For demos that don't naturally produce a single trace (rate limiter, cache invalidation), generate a synthetic root span server-side that wraps the demo's logical operation.

#### Failure & empty states

- 404 (trace not yet flushed to Tempo): show "Trace propagating… retry in 5s" with auto-retry up to 3 times. Tempo's ingest delay is typically <2s but can spike.
- Trace older than retention window: show "Trace expired" with link to the demo's source code as consolation.

#### Infra surface

- Tempo is part of Grafana Cloud free tier (50GB ingest/month). API token in Fly secret `TEMPO_API_TOKEN`.
- Add to `infra/terraform/modules/grafana/main.tf`: `grafana_cloud_access_policy_token` with scope `traces:read`.

---

### 3.4 Chaos button (controlled fault injection)

**Where:** inside Circuit Breaker and Saga demos. Replaces the current pure-simulation behavior with real fault injection against the running services.

**What:**
- Circuit Breaker demo: button "Sever Payments service for 30s." On click, the API marks the Payments service in fault mode (returns 503 to all callers for 30s). UI shows the circuit breaker opening, then half-opening, then closing as the fault clears.
- Saga demo: button "Kill Inventory mid-saga." Triggers a 5s outage during saga execution. UI shows compensation events firing (stock un-reserve, payment refund-pending).

**Why:** demonstrates not just that you've coded resilience patterns, but that they actually work under live failure. Hiring managers have seen 100 circuit breaker diagrams; almost none have seen one trip in a browser.

#### Backend contract

**Endpoint:** `POST /chaos/{scenario}`

Headers: `Authorization: Bearer {demoToken}`, `Idempotency-Key: {uuid}`.

**Body:**
```json
{ "duration_s": 30, "fault": "http_503" }
```

**Response:**
```json
{ "scenarioId": "...", "scheduled_until": "2026-05-02T10:15:03Z", "trace_id": "..." }
```

Scenarios (initial set):
- `payments-503` — `IFaultInjector` injects 503 on `payments` HTTP route for `duration_s` seconds.
- `inventory-kill` — kills inventory consumer process via `IConsumerControl.Stop()` then auto-restarts after `duration_s`.
- `db-latency` — adds 500ms artificial latency to all DB queries.
- `mq-disconnect` — closes the RabbitMQ connection; reconnect logic must engage.

Implementation: a single `IFaultInjector` service held by DI, mutated by the chaos endpoint, consulted by middleware/decorators in each affected service.

**Constraints:**
- `duration_s` capped at 60s server-side regardless of payload.
- Concurrent scenarios on the same target are rejected with 409 (`X-Active-Scenario: payments-503`).
- A global "fault budget" of 5 concurrent scenarios across the fleet — past that, 429.

#### Frontend

- Reuse `<TraceViewer>` to show the trace of the chaos call itself.
- Subscribe to `/health/stream` (Feature 1) — the affected service's status will go amber → red → amber → green, providing live confirmation.
- Show countdown timer next to the button while the fault is active.
- Big disclaimer copy: "This affects the live system. Other visitors will see the same fault. Limit: 60s."

#### Failure & empty states

- 401 (no demo token): silently mint one via `/demo/session` first, then retry once.
- 409 (scenario already active): button shows "Already running — ends in {n}s" disabled.
- 429 (fault budget exhausted): toast "Too many chaos demos in flight. Try again in 30s."

#### Infra surface

- No new infra. All fault injection is process-internal; no need to touch Fly's machine API.
- Audit log: every chaos call writes a Loki log line `chaos.scenario.fired{ip,scenario,duration}`. Build a Grafana panel "Chaos events (last 24h)" — useful as a content piece in itself ("here's what visitors broke today").

---

### 3.5 Interactive architecture diagram

**Where:** replaces the 5-emoji grid currently at `src/pages/index.astro:39-53`.

**What:** an SVG topology — services as nodes, queues/topics as labeled edges, infra (DB/Redis/Vault) as side-attached resources. Clicking a node:
- Highlights its dependencies and dependents.
- Opens a side panel with: service description, owned events, code link, current health (live), p99 latency (live).

A "live mode" toggle animates message flow: dots travel along edges in real time, pulsing when a real message just transited that queue.

**Why:** the current emoji grid undersells the system catastrophically. A real diagram, especially one that animates with real traffic, is the section a hiring manager screenshots and shares.

#### Backend contract

**Static topology** — built into the SVG directly; not a runtime concern.

**Live overlay** — `GET /topology/stream` (SSE):

```
event: edge-flow
data: {"edge":"orders->payments","msg_count_5s":12,"avg_latency_ms":47}

event: node-status
data: {"node":"payments","status":"healthy","rps":3.2}
```

Backend computes both from the existing telemetry pipeline:
- Edge throughput: count of RabbitMQ messages per `{exchange, routing_key}` in last 5s window.
- Node health: same source as `/health/stream`.

Emit every 2s. SSE so the same connection style as Feature 1.

#### Frontend

- `src/components/architecture/TopologyMap.tsx` — pure SVG, hand-coded layout (5–8 nodes, ~10 edges). Avoid `d3` or `react-flow` — heavy and unnecessary at this size.
- Animated dot per `edge-flow` event: spawn an SVG circle, animate `cx/cy` along the edge's path, fade out at end. Cap at 20 simultaneous dots to avoid jank.
- Side panel uses the same drawer component as the status strip tray.
- Layout: viewport-aware (collapses to vertical stack on mobile, full topology on desktop ≥ md).

#### Failure & empty states

- No live data (cold start, weekend, no visitors): show static layout with subtle "system idle" copy and a CTA to run the saga demo. Clicking it scrolls to the demo and pre-clicks Run.

#### Infra surface

- No new infra. Reuses Prometheus metrics already scraped from RabbitMQ exporter and the API.

---

### 3.6 Code drawer per demo

**Where:** below each demo's event stream, a "View code →" toggle. Expands to a tabbed code viewer showing the actual handler / consumer / saga code paths the demo just exercised.

**What:** syntax-highlighted C# (and YAML/SQL where relevant), with a "View on GitHub" permalink at the top of each tab.

**Why:** closes the loop between observed behavior and implementation. Crucially, this is the part the user *can read at their own pace* — a passive thinker who doesn't want to click "Run" still gets value.

#### Backend contract

**None.** This is build-time static.

The Astro build pulls source from `ritualworks` (sibling repo) at build time:

```ts
// astro.config.mjs — add a plugin
{
  name: 'inline-source',
  buildStart() {
    const files = require('./scripts/code-manifest.json'); // { demoId: [ { lang, repoPath, label } ] }
    // For each entry, read the file from ../ritualworks/... pin to a SHA, write to src/content/code/{demoId}/{label}.json
    //   { lang, label, source, githubUrl: "https://github.com/.../blob/{sha}/{path}" }
  }
}
```

`scripts/code-manifest.json` is the curated mapping. Example:

```json
{
  "checkout": [
    { "label": "OrderSaga.cs", "lang": "csharp", "repoPath": "src/Orders/Sagas/OrderSaga.cs" },
    { "label": "OutboxPublisher.cs", "lang": "csharp", "repoPath": "src/Shared/Outbox/OutboxPublisher.cs" },
    { "label": "outbox.sql", "lang": "sql", "repoPath": "src/Shared/Outbox/Migrations/001_create_outbox.sql" }
  ]
}
```

Pin `sha` per build to ensure the GitHub link is stable.

#### Frontend

- `src/components/demo/CodeDrawer.tsx` — accepts `demoId`, dynamically imports `src/content/code/{demoId}/index.json`.
- Syntax highlighting: **Shiki** (Astro-native, server-rendered, zero client JS for highlighting). Bundle impact: zero — HTML comes pre-highlighted.
- Copy-to-clipboard on hover, deep-link to GitHub line range.

#### Failure & empty states

- Manifest entry missing (file moved/deleted in source repo): build fails loudly, do not ship a broken link.

#### Infra surface

- None.

---

### 3.7 Deep-dives content engine

**Where:** `/deep-dives/*` pages. The current site links to these (`src/pages/index.astro:88`) but the directory `src/pages/deep-dives/` is empty — that's a credibility leak.

**What:** Astro content collection of MDX articles. Each article has frontmatter, prose, code samples, and *embedded interactive widgets* — e.g., the Outbox article embeds a mini live event-stream widget that runs the same backend as the full demo.

Initial set (3 — fewer is fine, missing is not):
1. **Transactional Outbox** — why it exists, the without/with diagram, race conditions caught, the actual SQL. Embeds a live mini event stream filtered to outbox topic.
2. **Saga vs. 2PC** — the trade space, when each wins, code from the OrderSaga, with the chaos button inline so you can see compensation fire.
3. **Vault Rotation** — the operational story (what "zero-downtime" actually means), with a live count of rotations performed against the running system.

**Why:** writing is the highest-bandwidth signal of seniority that a portfolio can carry. Hiring managers skim demos but *read* a well-written deep dive end to end.

#### Backend contract

- Articles themselves: static.
- Embedded live widgets: reuse Feature 3.1, 3.3, 3.4 endpoints.

#### Frontend

- `src/content/config.ts` — define `deepDives` collection.
- `src/content/deep-dives/*.mdx` — articles. MDX so we can `import { OutboxLiveStream } from '../../components/...'`.
- `src/pages/deep-dives/[slug].astro` — dynamic route, reads collection, renders with prose styling.
- Reading time, table of contents (auto-generated from H2/H3), prev/next navigation.

#### Failure & empty states

- Section copy on `/` updates dynamically based on collection size: never advertises 6 articles when only 3 exist.

#### Infra surface

- None.

---

### 3.8 Live hero metrics

**Where:** replace the static metrics row in `HeroLite.tsx:5-10` (which animates from 0 to fake numbers).

**What:** four real-time KPIs, polled every 10s:
1. **Events processed (last 24h)** — count from Postgres `events_processed` aggregate.
2. **Current p99 latency** — Prometheus query.
3. **Uptime since deploy** — computed from `deploy_sha` first-seen timestamp.
4. **Active demos right now** — count of distinct IPs with valid demo tokens in last 60s.

The visual treatment is identical to the current `AnimatedNumber` component — but now numbers actually move when traffic moves, and refresh in place.

**Why:** moving real numbers > animating fake ones, and it costs almost nothing to wire.

#### Backend contract

**Endpoint:** `GET /metrics/live`

**Response:**
```json
{
  "events_24h": 18234,
  "p99_ms": 42,
  "uptime_s": 48211,
  "active_sessions": 3,
  "as_of": "2026-05-02T10:14:33Z"
}
```

Cached at edge for 10s (Cloudflare cache rule on path). Backend computes:
- `events_24h`: `SELECT COUNT(*) FROM outbox WHERE created_at > now() - interval '24 hours'` (cached in Redis for 60s).
- `p99_ms`: Prometheus instant query `histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) * 1000`.
- `uptime_s`: `(now() - process.start_time).total_seconds`.
- `active_sessions`: `ZCOUNT demo:sessions:active {now-60s} +inf` against Redis sorted set.

#### Frontend

- Replace `metrics` constant in `HeroLite.tsx` with a `useEffect` that fetches `/metrics/live` on mount + every 10s.
- Initial values come from server-side fetch in the Astro frontmatter (no zero-flicker).
- `AnimatedNumber` already handles tweening — feed it new target values; it'll re-animate smoothly.

#### Failure & empty states

- API down: keep last good values, show a small `~` prefix indicating "stale," tooltip explains.
- Cold deploy (uptime < 60s): show "just deployed" instead of `0s`.

#### Infra surface

- Cloudflare Pages cache rule for `/metrics/live` → `cache 10s, stale-while-revalidate 30s`. Defined in `infra/terraform/modules/cloudflare/cache.tf`.

---

### 3.9 Signature visual (event mesh canvas)

**Where:** hero, replaces the gradient orbs at `HeroLite.tsx:50-51`.

**What:** a small canvas (or SVG) showing 5 nodes arranged in a force-directed layout, with particles traveling between them whenever a real message transits the corresponding queue. Subtle, low-contrast, not the focal point — but it moves with real traffic.

**Why:** every portfolio has gradient orbs. Almost none have a single purpose-built visual that visualizes the system on the page.

#### Backend contract

Reuses Feature 3.5's `/topology/stream` (`edge-flow` events). No new endpoint.

#### Frontend

- `src/components/hero/EventMesh.tsx` — canvas-rendered, runs at 30fps using `requestAnimationFrame`. ~100 lines.
- Pauses (no rAF) when tab hidden via `document.visibilityState`.
- Falls back to a static decorative SVG for `prefers-reduced-motion` users.
- No external libraries — keeps bundle <2KB gzipped.

#### Failure & empty states

- SSE disconnected: drift to a slow ambient idle animation (one particle every ~3s on a random edge). Site looks alive even if backend is down.

#### Infra surface

- None.

---

### 3.10 Accessibility & performance scorecards

**Where:** site footer and a `/quality` page.

**What:** four badges showing real, current scores:
1. **Lighthouse 100/100/100/100** (Perf / A11y / Best Practices / SEO).
2. **axe-core: 0 violations.**
3. **WCAG 2.2 AA: passing.**
4. **Bundle: <X KB gzipped.**

Each links to the underlying CI run that produced it.

**Why:** a11y is the cheapest "senior" signal you can plant. It also closes the loop on the pretty-but-untested-portfolio failure mode.

#### Backend contract

CI publishes JSON to a static file `public/quality.json`:

```json
{
  "lighthouse": { "perf": 100, "a11y": 100, "bp": 100, "seo": 100, "url": "https://github.com/.../runs/..." },
  "axe": { "violations": 0, "url": "..." },
  "bundle_kb": 78,
  "as_of": "2026-05-02T08:00:00Z"
}
```

GitHub Actions workflow `.github/workflows/quality.yml`:
1. Build site.
2. Run Lighthouse CI against preview deploy.
3. Run axe-core via `@axe-core/cli` against same.
4. Compute gzip bundle size.
5. Write `quality.json` and commit to `gh-pages` branch (or push to a known URL via Cloudflare KV).
6. Fail the build if any score drops below threshold (Perf 95, A11y 100, axe 0).

#### Frontend

- Footer reads `/quality.json` at build time, renders four badges.
- `/quality` page expands them with per-rule detail and the underlying report links.

#### Failure & empty states

- File missing: footer hides the row entirely. Never show fake/stale scores.

#### Infra surface

- GitHub Actions only. No runtime infra.

---

## 4. Demo hub restructure

The current `DemoHubLite.tsx` puts 9 emoji tabs in a single row. That's high cognitive load and reads as "I have 9 things" rather than "I built a system with 9 capabilities." Restructure into **4 capability groups**:

| Group | Demos (existing 9) |
|---|---|
| **Data integrity** | Saga (Checkout), Event Flow (Outbox), Concurrency (Optimistic Locking) |
| **Resilience** | Circuit Breaker, Idempotency, Rate Limit |
| **Caching** | Cache Stampede, Cache Invalidation |
| **Secrets** | Vault Rotation |

### 4.1 UX shape

- **Desktop (md+):** sidebar nav on the left (group → demo), content pane on the right. Selected demo highlighted; group label persistent above the demo.
- **Mobile (sm):** disclosure groups (`<details>`) — taps expand a group, shows its demos as inline buttons. Single demo content pane below.
- Deep-link friendly: `?demo=outbox` selects a demo and scrolls it into view. Browser back/forward navigates between demos.

### 4.2 Why grouped, not faceted

A single sidebar with capability headings is itself a credibility signal — it says "this person thinks in capability domains, not in features." Faceting (filter chips for "uses Redis" / "uses MQ" / "uses Postgres") would be technically clever but undersells the architectural framing. Save it for a `/capabilities` matrix page if needed later.

### 4.3 Empty-group rule

Groups with zero demos are hidden entirely from the sidebar — never show a heading with no entries. (Relevant if a future deletion leaves a group empty.)

### 4.4 Definition of done

1. Sidebar component `src/components/demo/DemoSidebar.tsx` renders the four groups.
2. URL query param `?demo=` is the single source of truth for selection; React state mirrors it.
3. Keyboard: arrow keys navigate within a group; tab moves between group and content pane; demo names are real `<a href>` links so middle-click and right-click work.
4. Mobile disclosure groups close all-but-current on selection (no accordion sprawl).
5. Lighthouse a11y still 100; axe-core: 0 violations.

---

## 5. Existing demo specs (the 9)

Each demo's wire protocol is defined authoritatively in `DEMO_API_INTEGRATION.md` (linked per row). This section captures only the **UI-side delta** — what changes when the new design system, code drawer (§3.6), trace viewer (§3.3), and chaos button (§3.4) are layered on top.

### 5.1 Saga (Checkout)

- **Backend wiring:** `DEMO_API_INTEGRATION.md §Demo 1`. Triggered by `POST /demos/saga/run`, events streamed via SignalR `SagaHub`.
- **UI changes vs current `CheckoutDemo.tsx`:**
  - Replace `setTimeout` simulation with real SignalR subscription via `useSignalR.ts`.
  - Replace context-color emoji map (`CheckoutDemo.tsx:57-64`) with Lucide icons + Tailwind tokens.
  - Add `<TraceViewer traceId={...} />` (§3.3) below event stream.
  - Add `<CodeDrawer demoId="checkout" />` (§3.6) showing `OrderSaga.cs`, `OutboxPublisher.cs`, `001_create_outbox.sql`.
  - Add `<ChaosButton scenario="inventory-kill" />` (§3.4) to the controls panel — when fired mid-saga, the UI should show compensation events in real time.
- **DoD:** running the demo produces a real correlation ID; the trace viewer renders the corresponding spans; the code drawer's GitHub link resolves to a real commit.

### 5.2 Event Flow (Outbox)

- **Backend wiring:** `DEMO_API_INTEGRATION.md §Demo 2`.
- **UI changes vs `EventFlowDemo.tsx`:** real SignalR feed; trace viewer; code drawer (`OutboxPublisher.cs`, `OutboxConsumer.cs`, the polling SQL); link to deep-dive `transactional-outbox.mdx`.

### 5.3 Concurrency (Optimistic Locking)

- **Backend wiring:** `DEMO_API_INTEGRATION.md §Demo 8`.
- **UI changes:** show two simulated client tabs side-by-side, each issuing a real PUT with `If-Match` header. Server returns 409 on stale version. Code drawer surfaces the C# `[ConcurrencyCheck]` and the migration column.

### 5.4 Circuit Breaker

- **Backend wiring:** `DEMO_API_INTEGRATION.md §Demo 3`. State changes streamed via SSE.
- **UI changes vs `CircuitBreakerDemo.tsx`:** chaos button to actually sever the downstream service; live state bar reads from real CB state, not a simulated counter.

### 5.5 Idempotency

- **Backend wiring:** `DEMO_API_INTEGRATION.md §Demo 5`. POST with `Idempotency-Key` header; second POST returns cached response.
- **UI changes:** "Retry with same key" / "Retry with new key" buttons, each producing a request and showing whether it hit the idempotency cache.

### 5.6 Rate Limit

- **Backend wiring:** `DEMO_API_INTEGRATION.md §Demo 9`. Token bucket in Upstash Redis.
- **UI changes:** burst control (1, 10, 100 RPS), live token-bucket gauge, 429 responses rendered as a stream of red rows with `Retry-After`.

### 5.7 Cache Stampede

- **Backend wiring:** `DEMO_API_INTEGRATION.md §Demo 6`. Triggers a parallel-request burst against an expiring key; demonstrates lock-and-fetch (`SETNX` pattern).
- **UI changes:** before/after toggle (single-flight on/off); show DB query count plummet when on.

### 5.8 Cache Invalidation

- **Backend wiring:** `DEMO_API_INTEGRATION.md §Demo 7`. Pub/sub via RabbitMQ to invalidate on write across two API instances.
- **UI changes:** two simulated app instances side-by-side, both reading the same key; write on one, watch invalidation propagate to the other (with measured latency).

### 5.9 Vault Rotation

- **Backend wiring:** `DEMO_API_INTEGRATION.md §Demo 4`. Vault dev mode rotates DB credentials; both old and new connections are valid during the overlap window.
- **UI changes:** timeline visualization of credential lifecycle; show app continuing to serve traffic across the rotation event.

### 5.10 Cross-cutting per-demo additions

Every demo gets these layered on top, regardless of which specific demo it is:

1. **Trace viewer** (§3.3) under the event stream — collapsed by default.
2. **Code drawer** (§3.6) with curated source files from RitualWorks — tab labels match the C# class names.
3. **Chaos button** (§3.4) where the demo's pattern admits a meaningful fault (Saga, Circuit Breaker; *not* Idempotency or Rate Limit).
4. **Reset button** that issues a real backend reset (`POST /demos/{id}/reset`) so subsequent runs start clean.
5. **Status indicator** in the demo header reflecting the relevant service's health from §3.1's stream — turns amber/red automatically if the underlying service is down, with a tooltip explaining why the demo can't run right now.

---

## 6. Frontend file layout additions

```
src/
  components/
    system/
      StatusStrip.tsx                   [3.1]
      StatusTray.tsx                    [3.1]
    metrics/
      GrafanaPanel.tsx                  [3.2]
      LiveMetricsRow.tsx                [3.8]
    demo/
      TraceViewer.tsx                   [3.3]
      CodeDrawer.tsx                    [3.6]
      ChaosButton.tsx                   [3.4]
    architecture/
      TopologyMap.tsx                   [3.5]
      TopologyNodePanel.tsx             [3.5]
    hero/
      EventMesh.tsx                     [3.9]
    quality/
      Scorecard.tsx                     [3.10]
  content/
    config.ts                           [3.7]
    deep-dives/
      transactional-outbox.mdx          [3.7]
      saga-vs-2pc.mdx                   [3.7]
      vault-rotation.mdx                [3.7]
    code/                               [3.6 — generated]
  hooks/
    useEventStream.ts                   (existing — reused)
    useDemoToken.ts                     [3.4 — new, manages JWT lifecycle]
    usePolling.ts                       [3.8 — new]
  lib/
    api/
      client.ts                         (existing — extend with idempotency-key support)
      sse.ts                            (existing useEventStream, harden reconnect)
      tracing.ts                        [3.3 — Tempo→envelope translation client side optional]
  pages/
    deep-dives/
      [slug].astro                      [3.7]
    quality.astro                       [3.10]
    runbook.astro                       (linked from 3.1's all-down state)
scripts/
  code-manifest.json                    [3.6]
  build-code-snippets.mjs               [3.6 — runs in astro buildStart]
```

New top-level dirs: none. `infra/` already added.

---

## 7. Build & deploy sequencing

### 7.1 Backend prerequisites (must land before frontend wiring)

| Endpoint | Used by | Effort |
|---|---|---|
| `GET /health/stream` + `/health/snapshot` | 3.1, 3.5 | M |
| `GET /metrics/live` | 3.8 | S |
| `GET /traces/{id}` | 3.3 | M |
| `POST /demo/session` (token mint) | 3.4 | S |
| `POST /chaos/{scenario}` | 3.4 | M |
| `GET /topology/stream` | 3.5, 3.9 | M |
| `GET /panels/{id}.svg` (optional fallback) | 3.2 | S |

### 7.2 Recommended sprint order

**Sprint 1 — credibility floor (5 days)**
- Backend: `/health/snapshot`, `/health/stream`, `/metrics/live`.
- Frontend: 3.1 status strip, 3.8 live hero metrics, 3.10 a11y scorecards (can run in parallel).
- Outcome: site front page reflects real backend state. Even if no demos work yet, the story is already credible.

**Sprint 2 — demos become real (5 days)**
- Backend: `/traces/{id}`, `/demo/session`, plus the existing demo wiring per `DEMO_API_INTEGRATION.md`.
- Frontend: 3.3 trace viewer, 3.6 code drawer.
- Outcome: any demo run produces a real trace + the code that ran. This is the moment the site stops being a portfolio template.

**Sprint 3 — interaction & narrative (5 days)**
- Backend: `/chaos/*`, `/topology/stream`.
- Frontend: 3.4 chaos button, 3.5 architecture map, 3.9 event mesh, 3.7 deep-dives content.
- Outcome: the showcase that makes a hiring manager call you.

**Sprint 4 — polish (3 days)**
- 3.2 Grafana embeds tuned, public dashboard tokens rotated to long-lived.
- Cross-browser, mobile, reduced-motion passes.
- Open-graph image generation that snapshots the live status strip.

### 7.3 Definition of done per feature

For each feature, "done" requires all six:
1. Backend endpoint deployed to Fly.io with health check passing.
2. Frontend component shipped with loading, empty, and error states tested.
3. Lighthouse perf score not regressed.
4. axe-core: zero new violations.
5. Trace propagation verified end-to-end (request → backend → DB/MQ → trace appears in viewer).
6. README / inline doc comment added explaining the contract — the only doc-comment exception to the project's "no unnecessary comments" rule, because the contract spans the network.

### 7.4 Pre-merge checklist (per PR)

- `npm run build` clean (Astro + TS).
- `lhci autorun` green.
- `axe` clean.
- New endpoints have a contract test in `portfolio-api`'s test suite.
- If feature touches `infra/terraform/`: `terraform plan` posted in PR description.

---

## Open questions

1. **Demo token persistence model** — JWT signed with HS256 + a single Fly secret, or short-lived sessions in Redis? JWT is simpler and survives API restarts; Redis is revocable. Lean JWT for v1.
2. **Trace viewer for non-saga demos** — synthesize a root span server-side (proposed) or render-only when a real one exists? Synthesizing is more work but keeps the UX consistent.
3. **Grafana public dashboard rate limit** — is the free tier's "1000 queries/hour" enough? Probably yes (snapshot caching makes load constant), but worth measuring before launch.
4. **Chaos isolation** — current proposal is process-internal `IFaultInjector`. If we ever scale beyond one Fly machine, faults need to coordinate across machines. Defer until needed.
