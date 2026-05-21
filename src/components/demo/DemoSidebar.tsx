import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { DemoIcon } from '../../lib/icons';
import type { LucideIcon } from 'lucide-react';

export interface DemoMeta {
  id: string;
  label: string;
  desc: string;
  valueProp: string;
  Icon: LucideIcon;
  deepDiveSlug?: string;
  /**
   * Path within haworks-platform that holds the primary
   * implementation behind this demo. Rendered as a "view source" link
   * so technical reviewers can verify the claim instead of taking the
   * UI's word for it.
   */
  sourcePath?: string;
}

const REPO_BASE_URL =
  'https://github.com/chidionyema/haworks-platform/blob/main/';

export function sourceUrlFor(demo: DemoMeta): string | null {
  return demo.sourcePath ? `${REPO_BASE_URL}${demo.sourcePath}` : null;
}

export interface DemoGroup {
  id: string;
  label: string;
  demos: DemoMeta[];
}

export const demoGroups: DemoGroup[] = [
  {
    id: 'data',
    label: 'Reliable transactions',
    demos: [
      { id: 'checkout',    label: 'Checkout saga',              desc: 'An order either completes fully or rolls back cleanly', valueProp: 'Orchestrates stock, payment, and order across 4 services', Icon: DemoIcon.checkout, deepDiveSlug: 'saga-vs-2pc',
        sourcePath: 'src/CheckoutOrchestrator/CheckoutOrchestrator.Application/Sagas/CheckoutSaga.cs' },
      { id: 'events',      label: 'Event delivery guarantee',   desc: 'Events are never silently lost, even if the message broker crashes', valueProp: 'DB write + event publish commit as one atomic operation', Icon: DemoIcon.events, deepDiveSlug: 'transactional-outbox',
        sourcePath: 'src/Payments/Payments.Application/Consumers/PaymentSessionRequestedConsumer.cs' },
      { id: 'concurrency', label: 'Conflict detection',         desc: 'Two people editing the same product at once? The system catches it.', valueProp: 'Postgres version check prevents silent overwrites', Icon: DemoIcon.concurrency,
        sourcePath: 'src/Catalog/Catalog.Api/Controllers/DemoConcurrencyController.cs' },
    ],
  },
  {
    id: 'resilience',
    label: 'Resilience under failure',
    demos: [
      { id: 'circuit',     label: 'Circuit breaker',            desc: 'One slow service cannot take down the whole platform', valueProp: 'Detects failures, stops calling, recovers automatically', Icon: DemoIcon.circuit,
        sourcePath: 'src/BffWeb/BffWeb.Api/Controllers/DemoController.cs' },
      { id: 'idempotency', label: 'Safe retries',               desc: 'Click "pay" twice? Network retry? You are only charged once.', valueProp: 'Unique constraint in Postgres deduplicates every request', Icon: DemoIcon.idempotency,
        sourcePath: 'src/Orders/Orders.Api/Controllers/DemoIdempotencyController.cs' },
      { id: 'ratelimit',   label: 'Rate limiting',              desc: 'Abusive traffic is blocked while real users keep their quota', valueProp: 'Fixed-window throttle per session, configurable limits', Icon: DemoIcon.ratelimit,
        sourcePath: 'src/BffWeb/BffWeb.Api/Controllers/DemoController.cs' },
    ],
  },
  {
    id: 'caching',
    label: 'Caching',
    demos: [
      { id: 'stampede', label: 'Cache stampede protection',     desc: 'When a popular cache expires, only one request hits the database', valueProp: 'Memory + Redis tiers with lock-based repopulation', Icon: DemoIcon.stampede,
        sourcePath: 'src/Catalog/Catalog.Api/Controllers/DemoTestController.cs' },
      { id: 'cache',    label: 'Real-time cache sync',          desc: 'Update a product and every server sees it within milliseconds', valueProp: 'Redis pub/sub pushes invalidations to all nodes', Icon: DemoIcon.cache,
        sourcePath: 'src/Catalog/Catalog.Application/Commands/UpdateProductCommand.cs' },
    ],
  },
  {
    id: 'sagas',
    label: 'Multi-step workflows',
    demos: [
      { id: 'refund', label: 'Refund workflow',                 desc: 'A refund that fails at the payment provider escalates for human review', valueProp: 'State machine with timeout, retry cap, and operator override', Icon: DemoIcon.checkout,
        sourcePath: 'src/Payments/Payments.Application/Sagas/RefundSaga.cs' },
    ],
  },
  {
    id: 'financial',
    label: 'Financial accounting',
    demos: [
      { id: 'ledger', label: 'Double-entry ledger',             desc: 'Every payment is recorded as a debit and a credit that must sum to zero', valueProp: 'Immutable ledger entries with balance invariant checks', Icon: DemoIcon.checkout,
        sourcePath: 'src/Payouts/Payouts.Domain/Aggregates/LedgerEntry.cs' },
    ],
  },
  {
    id: 'compliance',
    label: 'Privacy and compliance',
    demos: [
      { id: 'erasure', label: 'GDPR data deletion',             desc: 'Delete a user and their data is erased across all 8 services within 7 days', valueProp: 'Privacy saga coordinates deletion with audit trail', Icon: DemoIcon.vault,
        sourcePath: 'src/Privacy/Privacy.Application/Requests/Sagas/PrivacyRequestStateMachine.cs' },
    ],
  },
  {
    id: 'search',
    label: 'Search',
    demos: [
      { id: 'cdcsearch', label: 'Live search indexing',         desc: 'Edit a product in Postgres and it appears in search results within seconds', valueProp: 'Database changes stream to Elasticsearch automatically', Icon: DemoIcon.events,
        sourcePath: 'src/Search/Search.Application/Consumers/ProductCacheInvalidatedConsumer.cs' },
    ],
  },
  {
    id: 'secrets',
    label: 'Secret management',
    demos: [
      { id: 'vault', label: 'Zero-downtime password rotation',  desc: 'Database passwords rotate automatically with no service interruption', valueProp: 'Vault leases watched, credentials swapped live', Icon: DemoIcon.vault, deepDiveSlug: 'vault-rotation',
        sourcePath: 'src/Identity/Identity.Api/Controllers/AdminController.cs' },
    ],
  },
];

export const allDemos: DemoMeta[] = demoGroups.flatMap((g) => g.demos);

// Recommended order in which a first-time visitor sees the demos. Sequenced
// from simplest concept to most complex so the "Try next" CTA in the hub
// builds understanding rather than throwing the user at the saga first.
export const DEMO_LEARNING_ORDER: string[] = [
  'idempotency',
  'ratelimit',
  'circuit',
  'stampede',
  'cache',
  'concurrency',
  'events',
  'checkout',
  'refund',
  'ledger',
  'erasure',
  'cdcsearch',
  'vault',
];

export function findDemo(id: string): DemoMeta {
  return allDemos.find((d) => d.id === id) ?? allDemos[0];
}

export function findGroupOf(id: string): DemoGroup {
  return demoGroups.find((g) => g.demos.some((d) => d.id === id)) ?? demoGroups[0];
}

export function findNextDemo(id: string): DemoMeta | null {
  const idx = DEMO_LEARNING_ORDER.indexOf(id);
  if (idx === -1 || idx >= DEMO_LEARNING_ORDER.length - 1) return null;
  return findDemo(DEMO_LEARNING_ORDER[idx + 1]);
}

interface SidebarProps {
  activeId: string;
  onSelect: (id: string) => void;
}

export function DemoSidebar({ activeId, onSelect }: SidebarProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current?.querySelector<HTMLAnchorElement>(`a[data-demo-id="${activeId}"]`);
    el?.focus({ preventScroll: true });
  }, [activeId]);

  return (
    <nav
      ref={containerRef}
      aria-label="System modules"
      className="hidden md:block w-72 lg:w-80 shrink-0 border-r border-white/5 pr-0 py-10 bg-black/40 backdrop-blur-2xl"
    >
      {demoGroups.map((group) => (
        <div key={group.id} className="mb-12 last:mb-0">
          <div className="mb-6 px-10 text-[10px] uppercase tracking-[0.4em] font-black text-secondary/40 flex items-center justify-between">
            <span>{group.label}</span>
          </div>
          <ul className="space-y-1">
            {group.demos.map((demo) => {
              const isActive = demo.id === activeId;
              return (
                <li key={demo.id} className="relative group">
                  <a
                    href={`?demo=${demo.id}`}
                    data-demo-id={demo.id}
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                      e.preventDefault();
                      onSelect(demo.id);
                    }}
                    className={`
                      flex items-center gap-5 px-10 py-5 text-[12px] font-mono font-bold
                      transition-all duration-75 relative border-l-2
                      ${isActive
                        ? 'bg-white/[0.04] text-primary border-accent shadow-[inset_10px_0_30px_-10px_rgba(99,102,241,0.2)]'
                        : 'text-secondary/60 border-transparent hover:text-primary hover:bg-white/[0.01]'}
                    `}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <div className="relative flex items-center justify-center">
                       <demo.Icon
                         className={`w-4.5 h-4.5 shrink-0 transition-colors ${isActive ? 'text-accent' : 'text-secondary/40 group-hover:text-secondary'}`}
                         strokeWidth={isActive ? 2.5 : 2}
                       />
                       {isActive && (
                         <div className="absolute -top-1 -right-1 w-2 h-2 bg-success rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
                       )}
                    </div>
                    <span className="flex-1 truncate uppercase tracking-tighter leading-none">{demo.label}</span>
                    {isActive ? (
                       <ChevronRight className="w-4 h-4 text-accent animate-slide-in-right" />
                    ) : (
                       <ChevronRight className="w-4 h-4 text-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

interface MobileNavProps {
  activeId: string;
  onSelect: (id: string) => void;
}

export function DemoMobileNav({ activeId, onSelect }: MobileNavProps) {
  const activeGroupId = findGroupOf(activeId).id;

  return (
    <nav aria-label="System modules" className="md:hidden space-y-2 mb-8 font-mono">
      {demoGroups.map((group) => (
        <details
          key={group.id}
          open={group.id === activeGroupId}
          className="glass-subtle overflow-hidden"
        >
          <summary className="flex items-center justify-between px-6 py-5 cursor-pointer">
            <span className="uppercase tracking-[0.2em] text-[10px] font-black text-secondary">
              {group.label}
            </span>
            <ChevronRight className="w-5 h-5 transition-transform duration-300 disclosure-chevron text-muted" strokeWidth={2.5} />
          </summary>
          <ul className="border-t border-white/5 bg-black/40">
            {group.demos.map((demo) => {
              const isActive = demo.id === activeId;
              return (
                <li key={demo.id}>
                  <a
                    href={`?demo=${demo.id}`}
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                      e.preventDefault();
                      onSelect(demo.id);
                    }}
                    className={`
                      flex items-center justify-between gap-4 px-8 py-5 text-[11px] font-black uppercase transition-all
                      ${isActive ? 'bg-white/10 text-primary border-l-4 border-accent' : 'text-muted'}
                    `}
                  >
                    <div className="flex items-center gap-4">
                       <demo.Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-accent' : 'text-muted/90'}`} strokeWidth={2} />
                       <span className="tracking-tight">{demo.label}</span>
                    </div>
                    {isActive && <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]" />}
                  </a>
                </li>
              );
            })}
          </ul>
        </details>
      ))}
    </nav>
  );
}
