# Demo copy — per-demo templates

Pre-written copy for all 10 demos following the 5-element pattern in
`DEMO_COPY_PATTERN.md`. Each section gives the agent the exact
strings to paste into the matching component, plus pointers to
where the current copy lives so it knows what to replace.

The agent's job is to **apply** these strings, not invent them.
Read this file ONCE for your assigned demo's section; do not read
the other sections.

If a string here doesn't fit the existing component (e.g. the
component has fewer animation states than the in-flight labels
provide), pick the closest fit and document the deviation in the
status file. Don't drop the label without recording why.

---

## 1 — IdempotencyDemo (already at the bar; reference only)

This demo is already correctly framed; **do not edit its copy**. It
exists in this doc as the reference standard for what every other
demo should look like.

Headline: *"What happens if a payment form double-submits?"*
File: `src/components/demo/IdempotencyDemo.tsx`

Use this as the calibration point: every demo's copy should feel
like IdempotencyDemo's copy after this work lands.

---

## 2 — CheckoutDemo (saga)

**File**: `src/components/demo/CheckoutDemo.tsx`

### Headline
> What happens to the customer's order if Stripe crashes
> mid-payment?

### Setup line
> Press **Pay**. Then press **Crash payment service** before the
> third stage lights up. Watch the customer's view on the left and
> the saga state machine on the right.

### In-flight labels (timed to existing saga ladder states)
| When state hits | Label | Tooltip |
|---|---|---|
| `Initiated` | *"Order created. Now reserving stock."* | "First step of the saga." |
| `StockReservedState` | *"Stock reserved on `catalog-svc-XXXX`."* | "The catalog replica that handled this. Aspire runs two — load-balances across them." |
| `ReadyForPayment` | *"Payment session created with Stripe."* | "If the next step fails, the saga rolls back the stock." |
| `Completed` | *"Order completed."* | "" |
| `Abandoned` | *"Compensation flow firing — releasing stock."* | "The saga's whole point. State that was reserved is now being given back." |

### Outcome banner
> ✓ The customer's order rolled back, the stock was returned, and
> the customer wasn't double-charged. **Without this pattern**, your
> order is in `Paid` state in your DB but Stripe never confirmed —
> you find out from a refund ticket the next morning.

### Pattern line
> Pattern: transactional outbox + saga compensation. Code:
> `src/CheckoutOrchestrator/Application/Sagas/CheckoutSaga.cs`.
> The hard part wasn't the saga; it was making the compensation
> event survive a broker outage.

### Replace
- Current `<h3>` near the top of CheckoutDemo.tsx → headline above.
- The "Saga state machine" header + description → setup line.
- The existing terminal-state tile or success/failure pill → outcome banner.

---

## 3 — RateLimiterDemo

**File**: `src/components/demo/RateLimiterDemo.tsx`

### Headline
> A bot is hammering your form. How do you stop it without making
> genuine customers wait?

### Setup line
> Press **Mash for 5 seconds**. Watch the token bucket drain. The
> third or fourth click into the spam, you'll see the rate-limit
> response come back instead of a success.

### In-flight labels
| When | Label | Tooltip |
|---|---|---|
| Bucket draining | *"Token consumed: 4 of 5 left."* | "Each request 'spends' a token. Tokens refill at a steady rate." |
| First 429 | *"Rate-limited. Retry in `Ns`."* | "The server is telling the client how long to wait before trying again." |
| Bucket refilling | *"Tokens refilling at 1/second."* | "" |

### Outcome banner
> ✓ The bot's spam was blocked from the 6th request onward; the
> server told it to retry in 5 seconds. **Without this pattern**, the
> bot consumes all your downstream capacity and your real customers
> see slow checkouts (or, worse, errors that look like a service
> outage).

### Pattern line
> Pattern: token-bucket rate limiting. Code:
> `src/BffWeb/BffWeb.Api/Controllers/DemoController.cs` (RateLimit
> handler).
> Limits per-session, not global — abusers don't poison everyone's
> capacity.

---

## 4 — VaultRotationDemo

**File**: `src/components/demo/VaultRotationDemo.tsx`

### Headline
> How do you rotate the database password on 200 live servers
> without breaking anyone's connection?

### Setup line
> Press **Force credential rotation**. Watch the active credential
> card slide out and the standby card slide in. The "App connection"
> badge below should stay green throughout.

### In-flight labels
| When | Label | Tooltip |
|---|---|---|
| `rotating` stage | *"Vault is generating credential v(n+1)."* | "HashiCorp Vault dynamically creates a fresh DB user for each rotation." |
| Cred slide animation | *"v(n+1) becomes active. v(n) revoked."* | "" |
| App-connection badge stays green | *"App pool refreshes connections without dropping."* | "Existing connections are drained over a TTL window. New requests use the new credential." |

### Outcome banner
> ✓ The new credential is active. Old one is revoked at Vault. App
> connections never blinked. **Without this pattern**, your team
> rotates DB passwords once a year and writes the new one in a
> Slack DM. The current credential leaks into application logs and
> CI artefacts; you find out when audit notices the same hash for
> 18 months.

### Pattern line
> Pattern: Vault dynamic database credentials with TTL-bounded
> rotation. Code:
> `src/Identity/Identity.Infrastructure/Vault/DynamicCredentialProvider.cs`
> (or equivalent path; verify in repo).
> The hard part is the connection-pool refresh; getting it right
> means the rotation is invisible to running code.

---

## 5 — CacheStampedeDemo

**File**: `src/components/demo/CacheStampedeDemo.tsx`

### Headline
> A thousand customers refresh the same page at once just as your
> cache expires. How do you stop your database melting?

### Setup line
> Press **Race**. Three columns will populate as 50 concurrent
> requests hit the cache in three different protection modes. Watch
> the database hit count in each.

### In-flight labels
| When | Label | Tooltip |
|---|---|---|
| `none` column populating | *"No protection: every request hits the DB."* | "Worst case — the database does N times the work it should." |
| `lock` column | *"First request fetches; others wait."* | "Only one DB call. Slowest perceived latency for the followers." |
| `probabilistic` column | *"First past the gate fetches; others get last-good value."* | "Best of both worlds — protects the DB without making everyone wait." |

### Outcome banner
> ✓ The `lock` and `probabilistic` modes both kept DB load to a
> handful of queries. The `none` column hit the DB 50 times.
> **Without this pattern**, your cache TTL expiry triggers a 50×
> spike on your origin database; the slow query alarms fire; the
> on-call engineer wakes up; you eventually add the protection
> after the second incident.

### Pattern line
> Pattern: cache-stampede protection (single-flight + probabilistic
> early refresh). Code: `src/Catalog/Catalog.Infrastructure/Cache/`.
> The probabilistic variant trades a tiny stale-value risk for
> dramatically better tail latency.

---

## 6 — CacheInvalidationDemo

**File**: `src/components/demo/CacheInvalidationDemo.tsx`

### Headline
> Two staff members edit the same product price at the same time.
> Why does every customer's checkout cart show the right number a
> second later?

### Setup line
> Press **Update price** on the **Admin** tab on the left. Watch
> the **Customer** tab on the right and the three cache-tier bars
> below it.

### In-flight labels
| When | Label | Tooltip |
|---|---|---|
| Database write | *"Database: new price written."* | "" |
| Pubsub fire | *"Cache invalidation event broadcast."* | "A small message tells every web server its cached copy is now stale." |
| L1 bars empty | *"L1 caches (every web server) cleared."* | "L1 = the in-process memory cache on each instance. Fastest, but every instance has its own." |
| L2 bar empty | *"L2 cache (shared Redis) cleared."* | "L2 = shared cache across all instances. Slower than L1, but consistent." |
| Customer pulse | *"Customer view refreshed."* | "" |

### Outcome banner
> ✓ The customer sees the new price within 200ms.
> **Without this pattern**, the customer sees yesterday's price
> until each cache happens to expire — anywhere from seconds to
> hours. That's how customers end up checking out at the wrong
> total and you find out from a refund ticket.

### Pattern line
> Pattern: cache-aside + pub/sub invalidation across L1 and L2.
> Code: `src/Catalog/Catalog.Application/Cache/ProductCacheInvalidationConsumer.cs`.
> The hard part wasn't the cache; it was making the invalidation
> message survive a broker outage — see the §3 outbox demo on the
> homepage.

---

## 7 — ConcurrencyDemo

**File**: `src/components/demo/ConcurrencyDemo.tsx`

### Headline
> Two staff edit the same record at the same time. The loser's
> work shouldn't silently disappear.

### Setup line
> Both users have already loaded the form. Press **Save** on User_A
> first, then **Save** on User_B. Watch what happens to User_B.

### In-flight labels
| When | Label | Tooltip |
|---|---|---|
| Both reads complete | *"Both users loaded version `1`."* | "" |
| User_A saves | *"User_A wrote version `2`."* | "" |
| User_B's save returns 409 | *"User_B got a conflict. Version on disk is now `2`."* | "Optimistic concurrency: the server told B their assumed version is stale." |
| Loser snap | *"User_B's view snaps to the current version."* | "B can see what A changed and decide what to do — re-edit, abandon, or merge." |

### Outcome banner
> ✓ Only one write went through. The other user got told what
> happened, with the current state, and can decide what to do.
> **Without this pattern**, both writes succeed, the second one
> overwrites the first, and User_A finds out their work is gone the
> next time they open the record.

### Pattern line
> Pattern: optimistic concurrency with EF `xmin` shadow column.
> Code: `src/Catalog/Catalog.Domain/Entities/Product.cs`.
> The check happens in a single SQL `UPDATE … WHERE xmin = …` so
> two concurrent writers can't race past it.

---

## 8 — CircuitBreakerDemo

**File**: `src/components/demo/CircuitBreakerDemo.tsx`

### Headline
> A downstream service is taking 30 seconds to respond. Your site
> shouldn't grind to a halt.

### Setup line
> Press **Trip & hammer**. The left lane fires requests with the
> circuit breaker disabled; the right lane uses it. Watch how each
> lane behaves once the downstream starts failing.

### In-flight labels
| When | Label | Tooltip |
|---|---|---|
| Both lanes start | *"Hammering downstream — both lanes."* | "" |
| Right lane breaker trips | *"Breaker open. Right lane fails fast in <1ms."* | "After 2 failures, the breaker stops letting calls through. Caller learns instantly that downstream is dead." |
| Left lane keeps hanging | *"No breaker: each call waits the full 3s timeout."* | "Without the breaker, every request burns a thread waiting. Threads run out; your whole app slows down." |
| Cooldown / breaker re-tests | *"Breaker half-open. One test call goes through."* | "Periodic single-call probes test if downstream is back." |

### Outcome banner
> ✓ Right lane: <10ms per rejected call. Left lane: ~3000ms each,
> threads piling up. **Without this pattern**, a single slow
> downstream takes out your whole API — every request thread waits
> for a timeout, the pool exhausts, healthy traffic gets queued,
> P99 latency goes to seconds, on-call wakes up.

### Pattern line
> Pattern: Polly circuit breaker on per-context HttpClient. Code:
> `src/BffWeb/BffWeb.Api/Controllers/DemoController.cs` (s_circuit
> field).
> One static breaker per outbound dependency keeps state across
> requests; concurrent traffic shares a single fail-fast view.

---

## 9 — EventFlowDemo

**File**: `src/components/demo/EventFlowDemo.tsx`

### Headline
> Your message broker dies for an hour. The orders placed during
> that hour shouldn't be lost.

### Setup line
> Press **Pause broker**. Then press **Trigger** ten times. Watch
> the queue depth bar fill. Press **Resume broker**. Watch it drain.

### In-flight labels
| When | Label | Tooltip |
|---|---|---|
| Broker paused | *"Broker is down. Events writing to outbox."* | "Each event lands in a per-service `OutboxMessage` table inside the same DB transaction as the business state. They survive the outage." |
| Queue bar filling | *"`N` events queued in outbox."* | "" |
| Broker resumed | *"Broker is back. Outbox flushing."* | "MassTransit's `BusOutboxDeliveryService` polls the outbox table and publishes the rows in order." |
| Per-event stage progresses | *"`persisted` → `relayed` → `consumed`"* | "Three states each event passes through. `persisted` is durable; `consumed` means downstream services have processed it." |

### Outcome banner
> ✓ Every event placed during the outage was published in order
> after the broker came back. Zero losses. **Without this pattern**,
> events you tried to publish while the broker was down disappear
> — your service thinks the publish succeeded, downstream never
> sees them, you find out when stock counts and order totals go out
> of sync.

### Pattern line
> Pattern: transactional outbox + at-least-once delivery via
> MassTransit's `EntityFrameworkOutbox`. Code:
> `src/Payments/Payments.Infrastructure/DependencyInjection.cs`
> (search for `AddEntityFrameworkOutbox`).
> Atomic with the business state. Survives broker outage. The
> trade-off is the outbox table needs its own retention story —
> see runbook #3.

---

## 10 — DistributedTracingDemo

**File**: `src/components/demo/DistributedTracingDemo.tsx`

### Headline
> A customer says checkout was slow. Which of seven services did it?

### Setup line
> Press **Run scenario**. Then click any span in the flame graph
> below to see what was happening at that moment in that service.

### In-flight labels
| When | Label | Tooltip |
|---|---|---|
| Trace recording | *"7 spans across 6 services collected."* | "Every request that fans out gets the same trace ID. Each service emits its own span; they all link back to the root." |
| User clicks a span | *"This span: `<service>.<operation>`, `Nms`, status `OK/Error`."* | "The span tells you where time went, what attributes were set, and (for errors) the exception that fired." |
| `withFailure` scenario | *"Stripe span returned Error. Parent span inherits."* | "Errors propagate UP the trace tree. Spotting the leaf cause is the whole point of distributed tracing." |

### Outcome banner
> ✓ The `external-stripe` call took 95ms — most of the total. Click
> the span to see why. **Without this pattern**, you stare at a
> "checkout slow" complaint and a logs aggregator with seven
> services' lines interleaved by timestamp, hoping to correlate by
> request ID. With it, you click one bar and know the answer.

### Pattern line
> Pattern: OpenTelemetry distributed tracing across service
> boundaries, exported to Tempo. Code: `src/BuildingBlocks/Extensions/ServiceDefaults.cs`
> (search for `AddOpenTelemetry`). Today the trace is synthesised
> server-side for the demo; real OTel propagation across the saga
> is on the hiring plan as Item 1.
