import { useEffect, useState } from 'react';
import { Check, Loader2, Circle, ArrowUpRight, Clock } from 'lucide-react';
import { CLUSTER_LABEL } from '../../lib/copy';

export interface HeroPreviewData {
  firstDive: {
    slug: string;
    title: string;
    description: string;
    readingTime: number;
  };
  demoCount: number;
  diveCount: number;
}

/**
 * Hero proof-preview triptych. Three cards: a live-cycling saga visualization,
 * a deep-dive opener, and a receipts strip. Each click-through into the
 * relevant section. The saga card progresses through events over ~7s and
 * resets with a fresh trace ID each cycle — pre-backend it cycles a known
 * walkthrough, post-backend it would subscribe to /events/stream.
 */

const SAGA_EVENTS = ['OrderCreated', 'StockReserved', 'PaymentAuthorised', 'OrderConfirmed'];
const STEP_MS = 1500;
const PAUSE_MS = 1800;

function makeTraceId() {
  return Array.from({ length: 6 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

export function HeroPreview({ firstDive, demoCount, diveCount }: HeroPreviewData) {
  const [step, setStep] = useState(0);
  const [traceId, setTraceId] = useState(() => makeTraceId());
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  useEffect(() => {
    if (reduced) {
      setStep(SAGA_EVENTS.length);
      return;
    }
    const id = window.setInterval(() => {
      setStep((s) => {
        if (s >= SAGA_EVENTS.length) {
          setTraceId(makeTraceId());
          return 0;
        }
        return s + 1;
      });
    }, step >= SAGA_EVENTS.length ? PAUSE_MS : STEP_MS);
    return () => window.clearInterval(id);
  }, [step, reduced]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 max-w-3xl mx-auto text-left">
      {/* Live state machine card */}
      <a
        href="#demo"
        className="group bg-[#0d0d15] border border-white/5 p-4 hover:border-accent/50 transition-colors flex flex-col focus-ring rounded-xl shadow-2xl"
        aria-label={`Inspect ${demoCount} live services`}
      >
        <CardLabel left={`Live State Machine · Cluster_${CLUSTER_LABEL}`} traceId={traceId} />
        <ul className="space-y-1.5 text-xs">
          {SAGA_EVENTS.map((name, i) => (
            <EventRow key={name} state={stateFor(i, step)} name={name} />
          ))}
        </ul>
      </a>

      {/* Deep-dive opener card */}
      <a
        href={`/deep-dives/${firstDive.slug}/`}
        className="group bg-[#0d0d15] border border-white/5 p-4 hover:border-accent/50 transition-colors flex flex-col focus-ring rounded-xl shadow-2xl"
        aria-label={`Read spec: ${firstDive.title}`}
      >
        <CardLabel left={`Architecture Specs · v${diveCount}.0`} />
        <div className="font-display text-sm text-primary mb-1.5 leading-tight line-clamp-2 uppercase font-black">
          {firstDive.title}
        </div>
        <p className="text-[11px] text-secondary leading-relaxed flex-1 line-clamp-3 font-mono opacity-80">
          {firstDive.description}
        </p>
        <div className="flex items-center gap-1 mt-2.5 text-[10px] font-mono uppercase tracking-wider text-muted">
          <Clock className="w-2.5 h-2.5" strokeWidth={1.75} />
          Full Telemetry Stream
        </div>
      </a>

      {/* Infrastructure card */}
      <a
        href="#about"
        className="group bg-[#0d0d15] border border-white/5 p-4 hover:border-accent/50 transition-colors flex flex-col focus-ring rounded-xl shadow-2xl"
        aria-label="Recent deployments"
      >
        <CardLabel left="Ops History · Global" />
        <div className="font-display text-sm text-primary mb-2 leading-tight uppercase font-black">
          High-Frequency Ops.
        </div>
        <p className="text-[11px] text-secondary leading-relaxed font-mono opacity-80">
          Scaling event-driven clusters and security platforms for UK Gov & Fintech since 2012.
          Deployment history available on request.
        </p>
      </a>
    </div>
  );
}

function stateFor(index: number, step: number): 'done' | 'active' | 'pending' {
  if (index < step) return 'done';
  if (index === step) return 'active';
  return 'pending';
}

function CardLabel({ left, traceId }: { left: string; traceId?: string }) {
  return (
    <div className="flex items-start justify-between mb-3">
      <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted">{left}</span>
      <div className="flex items-center gap-1.5">
        {traceId && (
          <span key={traceId} className="text-[10px] font-mono text-muted opacity-60 animate-fade-in">
            {traceId}
          </span>
        )}
        <ArrowUpRight className="w-3 h-3 text-muted group-hover:text-accent transition-colors" strokeWidth={1.75} />
      </div>
    </div>
  );
}

function EventRow({ state, name }: { state: 'done' | 'active' | 'pending'; name: string }) {
  if (state === 'done') {
    return (
      <li className="flex items-center gap-2 text-secondary">
        <Check className="w-3 h-3 text-success shrink-0" strokeWidth={2.5} />
        <span className="font-mono">{name}</span>
      </li>
    );
  }
  if (state === 'active') {
    return (
      <li className="flex items-center gap-2 text-primary">
        <Loader2 className="w-3 h-3 text-info shrink-0 animate-spin" strokeWidth={2} />
        <span className="font-mono">{name}</span>
      </li>
    );
  }
  return (
    <li className="flex items-center gap-2 text-muted opacity-60">
      <Circle className="w-3 h-3 shrink-0" strokeWidth={2} />
      <span className="font-mono">{name}</span>
    </li>
  );
}
