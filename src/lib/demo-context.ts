export interface DemoContextCopy {
  problem: string;
  mechanism: string;
  watch: string;
  problemSummary: string;
  mechanismSummary: string;
  strategy: string;
  businessOutcome: string;
  withoutPattern: string;
  sourceUrl: string;
}

export const DEMO_CONTEXT: Record<string, DemoContextCopy> = {
  checkout: {
    problem:
      'Reserving stock, charging a card, and writing an order touch three services with three databases. A crash mid-flow leaves money taken with no order, or an order with no payment.',
    mechanism:
      'Each step is paired with an undo step. If payment fails after stock is reserved, the system automatically releases the stock. No manual cleanup needed.',
    watch:
      'When a step fails, prior steps are reversed in order. The system either reaches the end or unwinds back to the start.',
    problemSummary: 'A crash mid-checkout leaves money taken but no order.',
    mechanismSummary: 'Every step has an automatic undo. Failures roll back cleanly.',
    withoutPattern: 'Customer charged but no order created. Manual reconciliation required.',
    businessOutcome: 'Every checkout either completes fully or rolls back cleanly.',
    strategy: 'Saga Orchestration',
    sourceUrl: 'https://github.com/chidionyema/haworks-platform/blob/main/src/CheckoutOrchestrator/CheckoutOrchestrator.Application/Sagas/CheckoutSaga.cs',
  },
  events: {
    problem:
      'Saving a row and publishing an event are two writes to two systems. If the message broker is down, the event is lost. If the database rolls back after, you publish a ghost event.',
    mechanism:
      'The event is saved to the same database as the business data, in the same transaction. A background worker picks it up and delivers it to the broker. If the broker is down, the event waits safely in the database.',
    watch:
      'Pull the broker offline mid-write. The row commits, the event is saved, and delivery happens the moment the broker returns. Zero loss.',
    problemSummary: 'Events can be lost when the message broker goes down.',
    mechanismSummary: 'Events are saved with the data, then delivered reliably.',
    withoutPattern: 'Events silently lost during broker outages. Downstream services never learn about the order.',
    businessOutcome: 'Zero lost events, even when the message broker goes down mid-write.',
    strategy: 'Transactional Outbox',
    sourceUrl: 'https://github.com/chidionyema/haworks-platform/blob/main/src/Payments/Payments.Infrastructure/DependencyInjection.cs',
  },
  circuit: {
    problem:
      'A slow downstream service pins your thread pool. Every request waits on a timeout. Latency cascades upstream until the whole system grinds to a halt.',
    mechanism:
      'After several failures, the system stops sending requests to the failing service and returns errors instantly. After a cooldown, it sends one test request. If it succeeds, traffic resumes.',
    watch:
      'Compare two paths: instant rejection under protection vs. the timeout cliff without it. Recovery is automatic.',
    problemSummary: 'One slow service can take down the entire platform.',
    mechanismSummary: 'Failing services are cut off. Recovery is automatic.',
    withoutPattern: 'Thread pool exhaustion. 30-second timeouts cascade. Entire platform becomes unresponsive.',
    businessOutcome: 'One failing service cannot take down the whole platform.',
    strategy: 'Circuit Breaker',
    sourceUrl: 'https://github.com/chidionyema/haworks-platform/blob/main/src/BffWeb/BffWeb.Api/Controllers/DemoController.cs',
  },
  vault: {
    problem:
      'Static passwords in config files leak to logs, screenshots, and old laptops. A six-month-old database password is a six-month-old vulnerability.',
    mechanism:
      'Short-lived credentials are issued per service and rotated automatically. The app picks up new credentials without restarting. Old credentials are revoked on the database.',
    watch:
      'During rotation, new credentials are issued, old ones revoked, and not a single request fails. Two sets of credentials overlap briefly to ensure zero downtime.',
    problemSummary: 'Static database passwords are a security risk.',
    mechanismSummary: 'Credentials rotate automatically with zero downtime.',
    withoutPattern: 'Six-month-old database password in config files. One leaked credential compromises everything.',
    businessOutcome: 'No static passwords. Credentials rotate automatically with zero downtime.',
    strategy: 'Dynamic Secret Rotation',
    sourceUrl: 'https://github.com/chidionyema/haworks-platform/blob/main/src/Identity/Identity.Api/Controllers/AdminController.cs',
  },
  idempotency: {
    problem:
      'Networks retry. Mobile clients retry. Webhooks retry. Without protection, every successful retry creates a duplicate charge, a double order, or a second email.',
    mechanism:
      'Each request carries a unique key. The first request with that key executes and its result is saved. Every subsequent request with the same key returns the saved result without re-executing.',
    watch:
      'Send the same request multiple times. Only one execution creates a side-effect. Every replay returns the same response instantly.',
    problemSummary: 'Network retries create duplicate charges.',
    mechanismSummary: 'Each request has a unique key. Duplicates return the cached result.',
    withoutPattern: 'Every network retry creates a duplicate charge. Customer support flooded with refund requests.',
    businessOutcome: 'Duplicate clicks and network retries never double-charge a customer.',
    strategy: 'Request Deduplication',
    sourceUrl: 'https://github.com/chidionyema/haworks-platform/blob/main/src/Orders/Orders.Api/Controllers/DemoController.cs',
  },
  stampede: {
    problem:
      'A popular cache entry expires. A thousand requests arrive at the same time, all miss the cache, and all hit the database simultaneously. The database goes down.',
    mechanism:
      'On a cache miss, only one request rebuilds the value. The rest wait briefly and read the fresh value once it is ready. The database sees one query instead of a thousand.',
    watch:
      'Without protection, every request hits the database. With protection, only one does. The difference is dramatic.',
    problemSummary: 'Cache expiration floods the database.',
    mechanismSummary: 'Only one request rebuilds. The rest wait and share the result.',
    withoutPattern: '50 concurrent requests all hit the database simultaneously. Origin overwhelmed, latency spikes.',
    businessOutcome: 'Cache expiration does not flood the database. Only one caller rebuilds.',
    strategy: 'Cache Stampede Protection',
    sourceUrl: 'https://github.com/chidionyema/haworks-platform/blob/main/src/Catalog/Catalog.Api/Controllers/DemoTestController.cs',
  },
  cache: {
    problem:
      'Multiple servers share a cache. One server updates a record but the others keep serving stale data until their copies expire. Customers see different versions of the same thing.',
    mechanism:
      'On write, a message is broadcast to all servers. Each server drops its local copy immediately. The next read fetches fresh data from the database.',
    watch:
      'Update a record on one server. Within milliseconds, all other servers serve the new value. No polling, no delay.',
    problemSummary: 'Multiple servers serve stale cached data.',
    mechanismSummary: 'Write broadcasts drop stale copies across all servers instantly.',
    withoutPattern: 'Server A updates a product price. Servers B-F keep serving the old price for minutes.',
    businessOutcome: 'All servers converge within milliseconds of a write. No stale data served.',
    strategy: 'Distributed Cache Invalidation',
    sourceUrl: 'https://github.com/chidionyema/haworks-platform/blob/main/src/Catalog/Catalog.Api/Controllers/DemoTestController.cs',
  },
  concurrency: {
    problem:
      'Two people edit the same record at the same time. The last save silently overwrites the first. The person who lost the race never knows their work was discarded.',
    mechanism:
      'Every record has a version number. When you save, the system checks that the version has not changed since you loaded it. If someone else saved first, your save is rejected with a clear conflict message.',
    watch:
      'Both edits start. Both submit. One succeeds, one is rejected with a conflict signal. Nothing is silently overwritten.',
    problemSummary: 'Concurrent edits cause silent data loss.',
    mechanismSummary: 'Version checks prevent stale overwrites.',
    withoutPattern: 'Last writer silently wins. First editor\'s work vanishes without warning.',
    businessOutcome: 'No silent overwrites. Conflicting edits are caught and surfaced immediately.',
    strategy: 'Optimistic Concurrency Control',
    sourceUrl: 'https://github.com/chidionyema/haworks-platform/blob/main/src/Catalog/Catalog.Api/Controllers/DemoTestController.cs',
  },
  ratelimit: {
    problem:
      'A single client issues a million requests per minute. A runaway script, a loop bug, or an abusive caller consumes all capacity meant for everyone.',
    mechanism:
      'Each session gets a fixed number of requests per time window. Once exhausted, further requests are rejected with a "try again later" response. Legitimate users are unaffected.',
    watch:
      'Exhaust the allowance. Traffic above the limit is rejected cleanly while well-behaved clients keep their share.',
    problemSummary: 'One bad client can exhaust capacity for everyone.',
    mechanismSummary: 'Per-session limits reject excess traffic cleanly.',
    withoutPattern: 'A single runaway script consumes all capacity. Legitimate users get errors across the board.',
    businessOutcome: 'Abusive traffic is shed cleanly while legitimate users keep their quota.',
    strategy: 'Rate Limiting',
    sourceUrl: 'https://github.com/chidionyema/haworks-platform/blob/main/src/BffWeb/BffWeb.Api/Controllers/DemoController.cs',
  },
  refund: {
    problem:
      'A refund touches the payment provider, the ledger, and the order status. If the provider call fails or times out, the customer sees nothing. No refund, no explanation, no follow-up.',
    mechanism:
      'A workflow tracks each refund through its stages. If the provider fails or 24 hours pass, the workflow escalates to an operator for manual review instead of silently dropping the refund.',
    watch:
      'The workflow progresses through each stage in real time. On success, the refund completes. On timeout, it escalates to ops review.',
    problemSummary: 'Failed refunds silently disappear.',
    mechanismSummary: 'Workflow with 24h timeout escalates failures to ops review.',
    withoutPattern: 'Provider timeout = refund disappears. No escalation, no audit trail, angry customer.',
    businessOutcome: 'Failed refunds escalate to ops review. Never silently dropped.',
    strategy: 'Refund Workflow',
    sourceUrl: 'https://github.com/chidionyema/haworks-platform/blob/main/src/Payments/Payments.Api/Controllers/AdminController.cs',
  },
  ledger: {
    problem:
      'A payment credited to a seller and a commission debited to the platform are two separate writes. If one succeeds and the other fails, money is created or destroyed.',
    mechanism:
      'Every transaction produces at least two entries that sum to zero. A credit for the seller and a debit for the platform commission. Both are written atomically, so partial writes are impossible.',
    watch:
      'Every simulation posts a credit and a matching debit. The sum of all entries always equals zero. That balance is enforced at the code level, not just the UI.',
    problemSummary: 'Partial writes leave financial records out of balance.',
    mechanismSummary: 'Paired credit/debit entries in one atomic write.',
    withoutPattern: 'Commission debit succeeds but seller credit fails. Money created from nothing.',
    businessOutcome: 'Every transaction balances to zero. Money cannot be created or destroyed.',
    strategy: 'Double-Entry Ledger',
    sourceUrl: 'https://github.com/chidionyema/haworks-platform/blob/main/src/Payouts/Payouts.Api/Controllers/LedgerController.cs',
  },
  erasure: {
    problem:
      'A data deletion request touches five services. If one fails silently, personal data remains. A regulatory breach. If there is no deadline enforcement, requests can stall indefinitely.',
    mechanism:
      'A workflow sends delete commands to each service in order. Each confirms deletion before the workflow advances. A 7-day deadline is enforced. If any service fails to confirm, the request is escalated for manual review.',
    watch:
      'Each service lights up as it confirms deletion. On success, all five confirm. Any failure triggers escalation. Never a silent partial delete.',
    problemSummary: 'Partial deletion leaves regulated data in the system.',
    mechanismSummary: '7-day deadline with mandatory escalation on failure.',
    withoutPattern: 'Four of five services delete data. The fifth silently retains it. GDPR breach.',
    businessOutcome: 'Data deletion touches all services or escalates. No partial deletes.',
    strategy: 'GDPR Erasure Workflow',
    sourceUrl: 'https://github.com/chidionyema/haworks-platform/blob/main/src/Privacy/Privacy.Api/Controllers/PrivacyRequestsController.cs',
  },
  cdcsearch: {
    problem:
      'Search indexes updated by polling the database on a timer lag behind writes. Frequent polling wastes database resources. Infrequent polling means stale results.',
    mechanism:
      'Every database write is captured from the database log and streamed to the search index in real time. No polling, no scheduled jobs. The index stays current within seconds of any write.',
    watch:
      'Trigger a product update and watch the change flow through the pipeline. The search index reflects the update within seconds.',
    problemSummary: 'Polling-based search is stale and wastes database resources.',
    mechanismSummary: 'Database changes stream to the search index in real time.',
    withoutPattern: 'Search results lag 5-30 seconds behind writes. Customers see stale product data.',
    businessOutcome: 'Search indexes stay current within seconds. No polling, no stale results.',
    strategy: 'Change Data Capture',
    sourceUrl: 'https://github.com/chidionyema/haworks-platform/blob/main/src/Search/Search.Api/Program.cs',
  },
};
