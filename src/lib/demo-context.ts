export interface DemoContextCopy {
  problem: string;
  mechanism: string;
  watch: string;
  problemSummary: string;
  mechanismSummary: string;
  strategy: string;
  businessOutcome: string;
}

export const DEMO_CONTEXT: Record<string, DemoContextCopy> = {
  checkout: {
    problem:
      'Reserving stock, charging a card, and writing an order touch three services with three databases. A crash mid-flow leaves money taken with no order, or an order with no payment.',
    mechanism:
      'A saga turns the cross-service transaction into a sequence of local commits, each paired with a compensating action that runs on failure. State lives in the saga itself, not a distributed lock.',
    watch:
      'When a step fails, every prior step is reversed in order. The system never half-commits — it either reaches the end or unwinds cleanly back to the start.',
    problemSummary: 'Cross-service crashes leave data inconsistent.',
    mechanismSummary: 'Chained local commits with rollback logic.',
    businessOutcome: 'Zero lost orders — every checkout either completes fully or rolls back cleanly.',
    strategy: 'Stateful Saga Orchestration',
  },
  events: {
    problem:
      'Saving a row and publishing an event are two writes to two systems. If the broker is down between them, the event is lost; if the database rolls back after, you publish a phantom.',
    mechanism:
      'Persist the event to an outbox table inside the same transaction as the business write. A separate relay reads the outbox and dispatches to the broker, with at-least-once delivery and idempotent consumers.',
    watch:
      'Pull the broker out from under the system mid-write — the row commits, the outbox row commits, and the event is delivered the moment the relay is back. Zero loss, no special handling.',
    problemSummary: 'Publishing events can fail after database commits.',
    mechanismSummary: 'Atomic outbox table + background relay.',
    businessOutcome: 'Zero lost events — even when the message broker goes down mid-write.',
    strategy: 'Transactional Outbox Pattern',
  },
  circuit: {
    problem:
      'A slow downstream dependency pins your thread pool. Every request waits on a timeout. Latency cascades upstream until the whole system queues itself to death.',
    mechanism:
      'After N consecutive failures the breaker opens and rejects requests instantly. After a cooldown it lets a single probe through; success closes it, failure reopens. Bulkheads cap concurrency per dependency so one bad actor cannot drain the pool.',
    watch:
      'Compare two paths: fast-fail under an open breaker (visible in milliseconds) vs. the timeout cliff a circuit-less system would experience. Recovery is automatic and observable.',
    problemSummary: 'Slow dependencies cascade into total system failure.',
    mechanismSummary: 'Fail-fast circuit state with automatic probes.',
    businessOutcome: 'One failing service can\'t take down the whole platform.',
    strategy: 'Polly Circuit Breaker & Bulkheads',
  },
  vault: {
    problem:
      'Static credentials in config files leak — to logs, screenshots, snapshots, alumni laptops. A six-month-old database password is a six-month-old vulnerability.',
    mechanism:
      'Vault issues short-lived credentials per service. A renewal worker rotates each lease before expiry; the app reads through an interface that returns the current lease without restart. Old leases revoke on the database side.',
    watch:
      'During a rotation the new lease is issued, the old one revoked, and not a single in-flight request fails. Two leases overlap for a few seconds; that overlap is the whole point.',
    problemSummary: 'Static database passwords are a security risk.',
    mechanismSummary: 'Dynamic roles with automated TTL rotation.',
    businessOutcome: 'No static passwords — credentials rotate automatically with zero downtime.',
    strategy: 'HashiCorp Vault Dynamic Secrets',
  },
  idempotency: {
    problem:
      'Networks retry. Mobile clients retry. Webhooks retry. Without protection, every retry that succeeds creates a duplicate charge, a double order, a second email — once-and-only-once is a fiction over an unreliable channel.',
    mechanism:
      'A deterministic key is claimed via INSERT...ON CONFLICT against a Postgres UNIQUE constraint. The first request wins and its result is cached in the row. Replays find the cached result and return it without re-executing the side-effect. Concurrent collisions resolve at the database level.',
    watch:
      'Hammer the same key from many directions: only one execution leaves a side-effect. Every other replay returns the same response, immediately, with no second charge.',
    problemSummary: 'Duplicate payments caused by network retries.',
    mechanismSummary: 'Deterministic keys prevent double execution.',
    businessOutcome: 'Duplicate clicks and network retries never double-charge a customer.',
    strategy: 'Postgres UNIQUE Constraint',
  },
  stampede: {
    problem:
      'A popular cache key expires. A thousand requests arrive in the same millisecond, all miss, and all hit the database simultaneously. The thundering herd takes the origin down.',
    mechanism:
      'On a miss, only one caller acquires a per-key lock and rebuilds the value. The rest wait briefly on the lock and read the freshly-written value when it lands. .NET 9 HybridCache implements this with L1 (memory) + L2 (Redis) tiers.',
    watch:
      'Without protection, request count to the origin equals concurrency. With protection it equals one. The graph is the demo.',
    problemSummary: 'Cache expiration floods the database (Stampede).',
    mechanismSummary: 'Locking and request coalescing during misses.',
    businessOutcome: 'Cache expiration doesn\'t flood the database — only one caller rebuilds.',
    strategy: '.NET 9 HybridCache / Coalescing',
  },
  cache: {
    problem:
      'Many nodes share a cache. One node updates a record; the others keep serving stale data until their copies expire on their own clocks. Customers see different versions of the same thing.',
    mechanism:
      'On write, publish an invalidation message over Redis pub/sub. Every node subscribes and drops its local copy on receipt. Subsequent reads miss, re-fetch, and converge.',
    watch:
      'Update a record on instance A. Within milliseconds, instance B serves the new value — without a poll, a TTL, or a request-time round trip.',
    problemSummary: 'Multi-node clusters serve stale cached data.',
    mechanismSummary: 'Pub/sub messages drop stale local copies.',
    businessOutcome: 'All nodes converge within milliseconds of a write — no stale data served.',
    strategy: 'Distributed Cache Invalidation',
  },
  concurrency: {
    problem:
      'Two operators edit the same record at the same time. Last-write-wins silently drops the first edit. The user who lost the race never knows.',
    mechanism:
      'Every row carries a version. Updates assert the version they read; if it changed, the database refuses the write and the application surfaces the conflict. The losing client can re-fetch, re-merge, and retry.',
    watch:
      'Both edits start; both submit. One commits, one is rejected with a clear conflict signal. Nothing is silently overwritten.',
    problemSummary: 'Concurrent edits cause silent data overwrites.',
    mechanismSummary: 'Version tracking prevents stale updates.',
    businessOutcome: 'No silent overwrites — conflicting edits are caught and surfaced immediately.',
    strategy: 'EF Core Optimistic Concurrency',
  },
  ratelimit: {
    problem:
      'A single client — a runaway script, an over-eager partner, a loop bug — issues a million requests a minute. Capacity meant for everyone is consumed by one.',
    mechanism:
      'A fixed-window rate limiter assigns each session a permit count and window duration. Requests acquire permits; when the window is exhausted, requests are rejected with a 429 and a Retry-After hint.',
    watch:
      'Saturate the bucket: traffic above the rate is shed cleanly while well-behaved clients keep their share. The system stays available even under abuse.',
    problemSummary: 'Single users can exhaust system capacity.',
    mechanismSummary: 'Fixed-window rate limiting with per-session permits.',
    businessOutcome: 'Abusive traffic is shed cleanly while legitimate users keep their quota.',
    strategy: '.NET FixedWindowRateLimiter',
  },
  tracing: {
    problem:
      'A user reports their checkout was slow. Logs from three services are interleaved in different log aggregators. You spend forty minutes correlating timestamps before you can answer "where was the time spent?"',
    mechanism:
      'Every request carries a trace id; every operation it touches emits a span tagged with that id, parent span id, service, operation, and duration. A flame graph reads the parent/child structure and shows the full call tree at a glance.',
    watch:
      'One request fans out across orders-domain, inventory, payments (which itself calls Stripe), notifications, and the outbox. The flame graph lets you read total time, where the long tail lives, and which span owned the failure when one occurs.',
    problemSummary: 'Interleaved logs hide cross-service bottlenecks.',
    mechanismSummary: 'Correlation IDs track requests across services.',
    businessOutcome: 'Any slow request is traceable across all services in seconds.',
    strategy: 'OpenTelemetry + Distributed Tracing',
  },
  refund: {
    problem:
      'A refund touches the payment provider, the ledger, and the order state. If the provider call fails or times out, the customer sees nothing — no refund, no explanation, no escalation.',
    mechanism:
      'A MassTransit saga state machine tracks each refund through Requested → AwaitingProviderConfirmation → Refunded. If the provider fails or 24 hours elapse, the saga transitions to RequiresReview instead of silently dropping the refund.',
    watch:
      'The saga progresses through each state in real time. On success, the refund completes. On timeout or failure, it escalates to ops review — never silently lost.',
    problemSummary: 'Failed refunds silently disappear.',
    mechanismSummary: 'Saga with 24h timeout escalates to ops review.',
    businessOutcome: 'Failed refunds escalate to ops review — never silently dropped.',
    strategy: 'MassTransit Refund Saga',
  },
  ledger: {
    problem:
      'A payment credited to a seller and a commission debited to the platform are two separate writes. If one succeeds and the other fails, money is created or destroyed — the books no longer balance.',
    mechanism:
      'Double-entry bookkeeping requires every transaction to produce at least two ledger entries that sum to zero. Both entries are written in a single atomic transaction on the same aggregate, so partial writes are impossible.',
    watch:
      'Every simulation posts a CREDIT for the gross amount and a DEBIT for the platform commission. The sum of all entries always equals zero. That invariant is enforced at the domain model level, not the UI.',
    problemSummary: 'Single-entry writes leave books out of balance.',
    mechanismSummary: 'Paired debit/credit entries in one atomic write.',
    businessOutcome: 'Every transaction balances to zero — money can\'t be created or destroyed.',
    strategy: 'Double-Entry Ledger (domain invariant)',
  },
  erasure: {
    problem:
      'A GDPR erasure request touches five services. If one service fails silently, personal data remains in the system — a regulatory breach. If the saga has no SLA enforcement, requests can stall indefinitely.',
    mechanism:
      'A saga orchestrates erasure commands to each service in order. Each service confirms deletion before the saga advances. A 7-day SLA timer is started on creation; expiry without completion transitions the saga to Stalled for mandatory ops review.',
    watch:
      'Each service node lights up as it confirms erasure. On success all five confirm and the saga completes. Any failure transitions to Failed — never a silent partial delete.',
    problemSummary: 'Partial erasure leaves regulated data in the system.',
    mechanismSummary: 'Ordered saga with SLA timer prevents silent failures.',
    businessOutcome: 'GDPR erasure touches all services or escalates — no partial deletes.',
    strategy: 'GDPR Erasure Saga (Art. 17)',
  },
  cdcsearch: {
    problem:
      'Search indexes updated by polling the database on a timer lag behind writes by the poll interval. High-frequency writes mean the index is always slightly stale, and frequent polling adds unnecessary load to the primary.',
    mechanism:
      "Debezium reads PostgreSQL's Write-Ahead Log (WAL) and publishes every row change to a Kafka topic. A consumer reads from Kafka and updates the Elasticsearch index. The entire pipeline is event-driven — no polling, no scheduled jobs.",
    watch:
      'Trigger a search and watch the CDC pipeline light up: PostgreSQL WAL → Debezium → Kafka → Elasticsearch. The pipeline completes and results reflect the latest data within seconds of any product write.',
    problemSummary: 'Polling-based indexing is stale and wastes DB resources.',
    mechanismSummary: 'WAL-driven CDC keeps indexes current with zero polling.',
    businessOutcome: 'Search indexes stay current within seconds — no polling, no stale results.',
    strategy: 'Debezium CDC + Kafka + Elasticsearch',
  },
};
