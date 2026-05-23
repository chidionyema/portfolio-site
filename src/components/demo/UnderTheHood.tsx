import { useState } from 'react';
import { Wrench, ExternalLink, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { findDemo, sourceUrlFor } from './DemoSidebar';
import { cn } from '../../lib/utils';

const DEMO_SERVICES: Record<string, Array<{ name: string; role: string }>> = {
  checkout:    [{ name: 'bff-web', role: 'proxy' }, { name: 'checkout-orchestrator', role: 'saga' }, { name: 'catalog-svc', role: 'stock' }, { name: 'payments-svc', role: 'stripe' }, { name: 'rabbitmq', role: 'broker' }, { name: 'postgres', role: 'state' }],
  events:      [{ name: 'bff-web', role: 'proxy' }, { name: 'payments-svc', role: 'outbox' }, { name: 'rabbitmq', role: 'broker' }, { name: 'postgres', role: 'store' }],
  circuit:     [{ name: 'bff-web', role: 'circuit' }, { name: 'catalog-svc', role: 'upstream' }],
  vault:       [{ name: 'bff-web', role: 'proxy' }, { name: 'identity-svc', role: 'rotation' }, { name: 'vault', role: 'secrets' }, { name: 'postgres', role: 'auth' }],
  idempotency: [{ name: 'bff-web', role: 'proxy' }, { name: 'orders-svc', role: 'claim' }, { name: 'postgres', role: 'unique' }],
  stampede:    [{ name: 'bff-web', role: 'proxy' }, { name: 'catalog-svc', role: 'cache' }, { name: 'redis', role: 'L2' }, { name: 'postgres', role: 'origin' }],
  cache:       [{ name: 'bff-web', role: 'bridge' }, { name: 'catalog-svc', role: 'write' }, { name: 'rabbitmq', role: 'pubsub' }, { name: 'redis', role: 'L2' }, { name: 'postgres', role: 'store' }],
  concurrency: [{ name: 'bff-web', role: 'proxy' }, { name: 'catalog-svc', role: 'xmin' }, { name: 'postgres', role: 'row lock' }],
  ratelimit:   [{ name: 'bff-web', role: 'limiter' }],
  refund:      [{ name: 'bff-web', role: 'proxy' }, { name: 'payments-svc', role: 'saga' }, { name: 'stripe', role: 'provider' }, { name: 'rabbitmq', role: 'broker' }, { name: 'postgres', role: 'state' }],
  ledger:      [{ name: 'bff-web', role: 'proxy' }, { name: 'payouts-svc', role: 'ledger' }, { name: 'postgres', role: 'entries' }],
  erasure:     [{ name: 'bff-web', role: 'proxy' }, { name: 'privacy-svc', role: 'saga' }, { name: 'orders-svc', role: 'erasure' }, { name: 'payments-svc', role: 'erasure' }, { name: 'identity-svc', role: 'erasure' }, { name: 'audit-svc', role: 'erasure' }, { name: 'rabbitmq', role: 'broker' }, { name: 'postgres', role: 'state' }],
  cdcsearch:   [{ name: 'bff-web', role: 'proxy' }, { name: 'catalog-svc', role: 'write' }, { name: 'postgres', role: 'WAL' }, { name: 'debezium', role: 'CDC' }, { name: 'kafka', role: 'stream' }, { name: 'elasticsearch', role: 'index' }],
};

const DEMO_PATTERNS: Record<string, { name: string; oneLiner: string }> = {
  checkout:    { name: 'Stateful Saga Orchestration', oneLiner: 'MassTransit StateMachine with compensation on every failure path' },
  events:      { name: 'Transactional Outbox', oneLiner: 'Event persisted in same DB transaction as business write, relayed by background service' },
  circuit:     { name: 'Polly Circuit Breaker', oneLiner: 'AsyncCircuitBreakerPolicy: 2 failures opens for 6s, half-open probe auto-recovers' },
  vault:       { name: 'Dynamic Credential Rotation', oneLiner: 'Vault issues short-lived DB creds; dual-key overlap ensures zero dropped connections' },
  idempotency: { name: 'Postgres UNIQUE Constraint', oneLiner: 'INSERT ON CONFLICT on idempotency key: concurrent duplicates resolve at the DB level' },
  stampede:    { name: '.NET 9 HybridCache Singleflight', oneLiner: 'One caller rebuilds on miss while others wait: N requests, 1 DB hit' },
  cache:       { name: 'Outbox-Driven Invalidation', oneLiner: 'ProductCacheInvalidatedEvent published atomically, consumed by all nodes via MassTransit' },
  concurrency: { name: 'EF Core Optimistic Concurrency', oneLiner: 'Postgres xmin system column as concurrency token: stale writes get 409 Conflict' },
  ratelimit:   { name: '.NET FixedWindowRateLimiter', oneLiner: 'System.Threading.RateLimiting with per-session fixed-window permits' },
  refund:      { name: 'MassTransit Refund Saga', oneLiner: 'StateMachine with 24h timeout, provider failure handling, and RequiresReview terminal state' },
  ledger:      { name: 'Double-Entry Bookkeeping', oneLiner: 'Every payment produces CREDIT + DEBIT entries in one atomic transaction' },
  erasure:     { name: 'GDPR Erasure Saga', oneLiner: 'Ordered deletion across 5 services with 7-day SLA timer; failure transitions to Stalled for ops review' },
  cdcsearch:   { name: 'Debezium CDC Pipeline', oneLiner: 'WAL events flow PostgreSQL to Debezium to Kafka to Elasticsearch with sub-second lag' },
};

const DEMO_BREAKS: Record<string, string> = {
  checkout:    'Orders get half-charged with no stock reserved, or stock reserved with no payment.',
  events:      'Events are silently lost when the broker is down between DB commit and publish.',
  circuit:     'A slow dependency pins threads until the system exhausts its resources.',
  vault:       'Long-lived static passwords leak via logs, screenshots, and former employees.',
  idempotency: 'Every network retry creates a duplicate charge, order, or email.',
  stampede:    'A popular cache key expires and multiple concurrent requests hit the database.',
  cache:       'Nodes serve stale data for the full TTL window after an update.',
  concurrency: 'Last-write-wins silently overwrites the first editor\'s changes.',
  ratelimit:   'A single runaway client consumes capacity meant for all users.',
  refund:      'Failed refunds disappear without escalation, audit trails, or customer notification.',
  ledger:      'A partial write credits the seller but skips the commission debit, creating inconsistent balances.',
  erasure:     'A single service failure leaves personal data in the system without visibility.',
  cdcsearch:   'Polling-based index jobs run on a schedule, serve stale results, and increase primary database load.',
};

export function UnderTheHood({ demoId }: { demoId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const demo = findDemo(demoId);
  const services = DEMO_SERVICES[demoId] ?? [];
  const pattern = DEMO_PATTERNS[demoId];
  const breaks = DEMO_BREAKS[demoId];
  const sourceUrl = sourceUrlFor(demo);

  return (
    <div className="mt-8 border-t border-white/5">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-4 text-[10px] font-black uppercase tracking-[0.3em] text-secondary/60 hover:text-secondary transition-colors group"
      >
        <span className="flex items-center gap-2">
          <Wrench className="w-3.5 h-3.5" />
          Under the hood
        </span>
        <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-6 font-mono text-[10px]">
              <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5">
                <div className="text-[9px] font-black uppercase tracking-[0.3em] text-secondary/50 mb-3">Services involved</div>
                <div className="flex flex-wrap gap-1.5">
                  {services.map(s => (
                    <span key={s.name} className="px-2 py-1 bg-white/5 rounded border border-white/5 text-secondary/80">
                      {s.name} <span className="text-muted">({s.role})</span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5">
                <div className="text-[9px] font-black uppercase tracking-[0.3em] text-secondary/50 mb-3">Pattern</div>
                {pattern && (
                  <div>
                    <div className="text-accent font-bold mb-1">{pattern.name}</div>
                    <div className="text-secondary/70 leading-relaxed">{pattern.oneLiner}</div>
                    {sourceUrl && (
                      <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-accent/60 hover:text-accent transition-colors">
                        View source <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>

              {breaks && (
                <div className="md:col-span-2 p-4 bg-error/[0.03] rounded-xl border border-error/10">
                  <div className="text-[9px] font-black uppercase tracking-[0.3em] text-error/50 mb-2">What breaks without this</div>
                  <div className="text-secondary/70 leading-relaxed">{breaks}</div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
