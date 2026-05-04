export interface DemoContextCopy {
  problem: string;
  mechanism: string;
  watch: string;
}

export const DEMO_CONTEXT: Record<string, DemoContextCopy> = {
  checkout: {
    problem:
      'Reserving stock, charging a card, and writing an order touch three services with three databases. A crash mid-flow leaves money taken with no order, or an order with no payment.',
    mechanism:
      'A saga turns the cross-service transaction into a sequence of local commits, each paired with a compensating action that runs on failure. State lives in the saga itself, not a distributed lock.',
    watch:
      'When a step fails, every prior step is reversed in order. The system never half-commits — it either reaches the end or unwinds cleanly back to the start.',
  },
  events: {
    problem:
      'Saving a row and publishing an event are two writes to two systems. If the broker is down between them, the event is lost; if the database rolls back after, you publish a phantom.',
    mechanism:
      'Persist the event to an outbox table inside the same transaction as the business write. A separate relay reads the outbox and dispatches to the broker, with at-least-once delivery and idempotent consumers.',
    watch:
      'Pull the broker out from under the system mid-write — the row commits, the outbox row commits, and the event is delivered the moment the relay is back. Zero loss, no special handling.',
  },
  circuit: {
    problem:
      'A slow downstream dependency pins your thread pool. Every request waits on a timeout. Latency cascades upstream until the whole system queues itself to death.',
    mechanism:
      'After N consecutive failures the breaker opens and rejects requests instantly. After a cooldown it lets a single probe through; success closes it, failure reopens. Bulkheads cap concurrency per dependency so one bad actor cannot drain the pool.',
    watch:
      'Compare two paths: fast-fail under an open breaker (visible in milliseconds) vs. the timeout cliff a circuit-less system would experience. Recovery is automatic and observable.',
  },
  vault: {
    problem:
      'Static credentials in config files leak — to logs, screenshots, snapshots, alumni laptops. A six-month-old database password is a six-month-old vulnerability.',
    mechanism:
      'Vault issues short-lived credentials per service. A renewal worker rotates each lease before expiry; the app reads through an interface that returns the current lease without restart. Old leases revoke on the database side.',
    watch:
      'During a rotation the new lease is issued, the old one revoked, and not a single in-flight request fails. Two leases overlap for a few seconds; that overlap is the whole point.',
  },
  idempotency: {
    problem:
      'Networks retry. Mobile clients retry. Webhooks retry. Without protection, every retry that succeeds creates a duplicate charge, a double order, a second email — once-and-only-once is a fiction over an unreliable channel.',
    mechanism:
      'A deterministic key — namespaced per user, hashed with the request body — records the result of the first run. Replays find the cached result and return it without re-executing the side-effect. Concurrent collisions resolve via optimistic lock.',
    watch:
      'Hammer the same key from many directions: only one execution leaves a side-effect. Every other replay returns the same response, immediately, with no second charge.',
  },
  stampede: {
    problem:
      'A popular cache key expires. A thousand requests arrive in the same millisecond, all miss, and all hit the database simultaneously. The thundering herd takes the origin down.',
    mechanism:
      'On a miss, only one caller acquires a per-key lock and rebuilds the value. The rest wait briefly on the lock and read the freshly-written value when it lands. .NET 9 HybridCache implements this with L1 (memory) + L2 (Redis) tiers.',
    watch:
      'Without protection, request count to the origin equals concurrency. With protection it equals one. The graph is the demo.',
  },
  cache: {
    problem:
      'Many nodes share a cache. One node updates a record; the others keep serving stale data until their copies expire on their own clocks. Customers see different versions of the same thing.',
    mechanism:
      'On write, publish an invalidation message over Redis pub/sub. Every node subscribes and drops its local copy on receipt. Subsequent reads miss, re-fetch, and converge.',
    watch:
      'Update a record on instance A. Within milliseconds, instance B serves the new value — without a poll, a TTL, or a request-time round trip.',
  },
  concurrency: {
    problem:
      'Two operators edit the same record at the same time. Last-write-wins silently drops the first edit. The user who lost the race never knows.',
    mechanism:
      'Every row carries a version. Updates assert the version they read; if it changed, the database refuses the write and the application surfaces the conflict. The losing client can re-fetch, re-merge, and retry.',
    watch:
      'Both edits start; both submit. One commits, one is rejected with a clear conflict signal. Nothing is silently overwritten.',
  },
  ratelimit: {
    problem:
      'A single client — a runaway script, an over-eager partner, a loop bug — issues a million requests a minute. Capacity meant for everyone is consumed by one.',
    mechanism:
      'A token-bucket limiter assigns each principal a refill rate and a burst capacity. Requests draw tokens; when the bucket is empty, the request is rejected with a 429 and a Retry-After hint. Quotas live in Redis so they apply across nodes.',
    watch:
      'Saturate the bucket: traffic above the rate is shed cleanly while well-behaved clients keep their share. The system stays available even under abuse.',
  },
  tracing: {
    problem:
      'A user reports their checkout was slow. Logs from three services are interleaved in different log aggregators. You spend forty minutes correlating timestamps before you can answer "where was the time spent?"',
    mechanism:
      'Every request carries a trace id; every operation it touches emits a span tagged with that id, parent span id, service, operation, and duration. A flame graph reads the parent/child structure and shows the full call tree at a glance.',
    watch:
      'One request fans out across orders-domain, inventory, payments (which itself calls Stripe), notifications, and the outbox. The flame graph lets you read total time, where the long tail lives, and which span owned the failure when one occurs.',
  },
};
