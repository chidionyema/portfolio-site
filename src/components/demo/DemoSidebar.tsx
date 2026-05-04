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
}

export interface DemoGroup {
  id: string;
  label: string;
  demos: DemoMeta[];
}

export const demoGroups: DemoGroup[] = [
  {
    id: 'data',
    label: 'Reliable_Transactions',
    demos: [
      { id: 'checkout',    label: 'Distributed_Saga',         desc: 'Transaction orchestration across Fly.io nodes', valueProp: 'Stops orders from being half-charged', Icon: DemoIcon.checkout, deepDiveSlug: 'saga-vs-2pc' },
      { id: 'events',      label: 'Transactional_Outbox',       desc: 'Atomic event persistence and broker relay',    valueProp: 'Never silently drops a published event', Icon: DemoIcon.events, deepDiveSlug: 'transactional-outbox' },
      { id: 'concurrency', label: 'Optimistic_Locking',  desc: 'Pre-emptive conflict detection in Postgres',   valueProp: 'Two edits never overwrite each other', Icon: DemoIcon.concurrency },
    ],
  },
  {
    id: 'resilience',
    label: 'Resilience_Under_Load',
    demos: [
      { id: 'circuit',     label: 'Circuit_Breaker', desc: 'Fail-fast and graceful recovery pipeline', valueProp: 'Stops a slow dep from taking everyone down', Icon: DemoIcon.circuit },
      { id: 'idempotency', label: 'Deterministic_Identity',     desc: 'Safe retries with Redis-backed identity',   valueProp: 'Safe to retry — never charges twice', Icon: DemoIcon.idempotency },
      { id: 'ratelimit',   label: 'Traffic_Shaping',      desc: 'Token-bucket throttling and QoS',       valueProp: 'One bad client cannot starve everyone else', Icon: DemoIcon.ratelimit },
    ],
  },
  {
    id: 'caching',
    label: 'Cache_Coherence',
    demos: [
      { id: 'stampede', label: 'Multi_Tier_Cache',    desc: 'Memory + Redis tiers prevent thundering herd', valueProp: 'A popular cache key never floods the DB', Icon: DemoIcon.stampede },
      { id: 'cache',    label: 'PubSub_Invalidation', desc: 'Real-time cache coherence across nodes',     valueProp: 'Updates show up everywhere within ms', Icon: DemoIcon.cache },
    ],
  },
  {
    id: 'secrets',
    label: 'Secret_Lifecycle',
    demos: [
      { id: 'vault', label: 'Dynamic_Credentials', desc: 'Zero-downtime Vault rotation workflows', valueProp: 'Database passwords rotate with no downtime', Icon: DemoIcon.vault, deepDiveSlug: 'vault-rotation' },
    ],
  },
  {
    id: 'observability',
    label: 'Observability',
    demos: [
      { id: 'tracing', label: 'Distributed_Tracing', desc: 'Spans across 6 services rendered as a flame graph', valueProp: 'Follow one request across every service', Icon: DemoIcon.tracing },
    ],
  },
];

export const allDemos: DemoMeta[] = demoGroups.flatMap((g) => g.demos);

export function findDemo(id: string): DemoMeta {
  return allDemos.find((d) => d.id === id) ?? allDemos[0];
}

export function findGroupOf(id: string): DemoGroup {
  return demoGroups.find((g) => g.demos.some((d) => d.id === id)) ?? demoGroups[0];
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
                      flex items-center gap-5 px-10 py-4 text-[12px] font-mono font-bold
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
                      ${isActive ? 'bg-white/5 text-primary border-l-4 border-accent' : 'text-muted'}
                    `}
                  >
                    <div className="flex items-center gap-4">
                       <demo.Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-accent' : 'text-muted/60'}`} strokeWidth={2} />
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
