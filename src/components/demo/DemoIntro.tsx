interface DemoIntroProps {
  what: string;
  steps: string[];
}

const INTROS: Record<string, DemoIntroProps> = {
  checkout: {
    what: 'A purchase that coordinates stock reservation, payment, and order creation across four services.',
    steps: ['Pick a scenario (happy path, or a failure)', 'Click the checkout button', 'Watch the event log on the right as services communicate'],
  },
  events: {
    what: 'Shows how a database write and an event publish happen as one atomic operation. If either fails, both are rolled back.',
    steps: ['Click "Commit event" to write a payment record and publish an event', 'Pause the relay to simulate a broker outage', 'Resume it and watch the queued events deliver'],
  },
  concurrency: {
    what: 'Two users edit the same product at the same time. The system detects the conflict instead of silently overwriting.',
    steps: ['Click "Start" to open two editing sessions', 'Both sessions load the same product version', 'Watch which save succeeds and which is rejected'],
  },
  circuit: {
    what: 'When a downstream service is slow or failing, the circuit breaker stops calling it and returns a fast error instead.',
    steps: ['Send a few requests (they succeed)', 'Click "Trip breaker" to simulate a failing service', 'Send more requests and see the fast rejections, then watch it recover'],
  },
  idempotency: {
    what: 'Sending the same request twice produces the same result. A duplicate click or network retry does not create a duplicate order.',
    steps: ['Click "Send request" to create an order', 'Click it again with the same idempotency key', 'The second request returns the existing order, not a new one'],
  },
  ratelimit: {
    what: 'Requests beyond the allowed rate are rejected with a 429 status. Legitimate traffic within the limit is unaffected.',
    steps: ['Send requests at normal pace (they succeed)', 'Click "Burst" to exceed the rate limit', 'Watch requests get rejected, then recover after the window resets'],
  },
  stampede: {
    what: 'When a popular cache key expires, only one request repopulates it. The rest wait instead of all hitting the database.',
    steps: ['Click "Expire cache" to clear the cached value', 'Send a burst of concurrent requests', 'Only one database query runs; the others get the cached result'],
  },
  cache: {
    what: 'Update a product and every server node sees the new value within milliseconds via a pub/sub cache invalidation.',
    steps: ['View the current cached product', 'Edit a field and save', 'Watch the cache invalidation propagate to all nodes'],
  },
  refund: {
    what: 'A refund request goes through the payment provider. If it fails or times out, the system escalates to an operator instead of losing the refund.',
    steps: ['Click "Request refund" to start the saga', 'Watch the state machine progress through each stage', 'Try the failure scenario to see the escalation path'],
  },
  ledger: {
    what: 'Every payment creates a debit and a credit entry. The sum of all entries must be zero. The database rejects any transaction that breaks this rule.',
    steps: ['Click "Record payment" to create a ledger entry pair', 'Check the running balance (always zero)', 'Try a refund to see the reverse entries'],
  },
  erasure: {
    what: 'A GDPR deletion request triggers data erasure across all services that hold the user\'s information, tracked by a saga with a 7-day deadline.',
    steps: ['Click "Request erasure" for a test user', 'Watch the saga coordinate deletion across services', 'See the completion confirmation with audit trail'],
  },
  cdcsearch: {
    what: 'When a product is updated in the database, the change streams to the search index automatically. No application code writes to two places.',
    steps: ['Search for a product', 'Update its name or price in the database', 'Search again and see the updated result within seconds'],
  },
  vault: {
    what: 'Database credentials are rotated automatically via HashiCorp Vault. The service picks up the new password without restarting.',
    steps: ['Click "Rotate" to trigger a credential rotation', 'Watch the old credential expire and the new one activate', 'The service continues handling requests throughout'],
  },
};

export function DemoIntro({ demoId }: { demoId: string }) {
  const intro = INTROS[demoId];
  if (!intro) return null;

  return (
    <div className="mb-6 space-y-3">
      <p className="text-sm text-secondary leading-relaxed">
        {intro.what}
      </p>
      <ol className="text-xs text-secondary/60 space-y-1 list-decimal list-inside">
        {intro.steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
    </div>
  );
}
