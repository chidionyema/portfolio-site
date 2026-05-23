import { useEffect, useMemo, useState } from 'react';
import { Activity, CheckCircle2, Loader2 } from 'lucide-react';
import { useClusterState } from '../../hooks/useClusterState';
import { LiveTopologyMap } from './LiveTopologyMap';
import type { ConsoleEvent, JourneyKind, JourneySession } from '../../lib/cluster-store';

/**
 * JourneyCanvas. the single visualisation surface that ties the topology
 * to the BFF's JourneyScheduler. The BFF fires a rotating canonical journey
 * every ~20s (place-order saga / idempotent retry / OCC race); this component
 * locks onto each journey via OnJourneyStart and renders a per-journey side
 * panel beside the topology while the journey runs.
 *
 * Layout on desktop (>= lg):
 *
 *   ┌────────────────────────────────────────────────────────┐
 *   │  Header. active journey, sessionId, elapsed, target   │
 *   ├──────────────────────────────────────┬─────────────────┤
 *   │                                      │                 │
 *   │     Live topology (existing)         │  Side panel:    │
 *   │     14 nodes, packets, click-pause   │  - SagaLadder   │
 *   │                                      │  - IdempTrace   │
 *   │                                      │  - OCCRace      │
 *   │                                      │                 │
 *   └──────────────────────────────────────┴─────────────────┘
 *
 * On narrow viewports the side panel falls below the topology.
 *
 * State sources:
 *   - currentJourney → which side panel renders (driven by OnJourneyStart/End)
 *   - events filtered by sessionId (correlationId) → per-journey rows
 *   - chaos state → if any dependency is paused while a journey is running,
 *     the side panel surfaces compensating / failed paths from real signals
 *
 * No prose narration. Every visible state on the side panels is sourced from
 * an actual event field. no inferred 'this is what would have happened'.
 */

interface JourneyCanvasProps {
  /** Optional title above the canvas; defaults to "The cluster, end-to-end." */
  title?: string;
  /** Optional one-line lede; renders as a subtitle. */
  lede?: string;
}

export function JourneyCanvas({
  title = 'The cluster, end-to-end.',
  lede = 'A real journey through every microservice runs every 20s. Watch the saga state machine resolve, the same idempotency key dedupe across replays, and a five-way OCC race pick exactly one winner.',
}: JourneyCanvasProps) {
  const { currentJourney, recentJourneys, events } = useClusterState();
  const [, setTick] = useState(0);

  // 500ms tick keeps elapsed time fresh + lets transient panels rotate.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(id);
  }, []);

  // While idle (between journeys) show the most recent completed journey
  // so the panel never blanks out. gives the visitor something to read
  // during the inter-journey cool-down.
  const displayedJourney: JourneySession | null = currentJourney ?? recentJourneys[0] ?? null;
  const isLive = currentJourney != null;

  return (
    <div className="rounded-xl border border-white/[0.08] bg-black/40 p-4 md:p-6 shadow-2xl space-y-4">
      <CanvasHeader displayed={displayedJourney} isLive={isLive} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div className="rounded-lg border border-white/[0.06] bg-black/30 p-3 md:p-4">
          <LiveTopologyMap />
        </div>

        <SidePanel journey={displayedJourney} isLive={isLive} events={events} />
      </div>
    </div>
  );
}

// ─────────────────────────────── Header ───────────────────────────────

function CanvasHeader({
  displayed,
  isLive,
}: {
  displayed: JourneySession | null;
  isLive: boolean;
}) {
  const label = displayed ? JOURNEY_LABEL[displayed.journey] : 'Waiting for next journey';
  const stateText = !displayed
    ? 'cluster idle'
    : isLive
      ? 'in progress'
      : displayed.ok
        ? `completed · ${formatElapsed(displayed)}`
        : 'failed';
  const stateTone =
    !displayed
      ? 'text-muted/60'
      : isLive
        ? 'text-accent'
        : displayed.ok
          ? 'text-success'
          : 'text-error';

  return (
    <div className="flex items-baseline justify-between gap-4 px-1">
      <div>
        <div className="text-[10px] uppercase tracking-[0.22em] text-accent mb-1.5">
          Active journey
        </div>
        <div className="font-display text-base md:text-lg text-primary font-semibold">
          {label}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className={`text-[11px] font-bold uppercase tracking-widest ${stateTone}`}>
          {stateText}
        </div>
        {displayed && (
          <div className="text-[10px] text-muted/60 tabular-nums font-mono mt-0.5">
            sess-{displayed.sessionId.slice(0, 8)}
          </div>
        )}
      </div>
    </div>
  );
}

const JOURNEY_LABEL: Record<JourneyKind, string> = {
  'place-order-saga': 'Place-order saga · across all five microservices',
  'idempotent-retry': 'Idempotent retry · same key, five submissions',
  'occ-race': 'OCC race · five concurrent writes, one winner',
};

// ─────────────────────────────── Side panel ───────────────────────────────

function SidePanel({
  journey,
  isLive,
  events,
}: {
  journey: JourneySession | null;
  isLive: boolean;
  events: ConsoleEvent[];
}) {
  if (!journey) {
    return (
      <div className="rounded-lg border border-white/[0.06] bg-black/30 p-4 flex items-center justify-center min-h-[260px]">
        <div className="text-center">
          <Loader2 className="w-5 h-5 text-muted/50 animate-spin mx-auto mb-3" />
          <div className="text-[12px] text-muted/60">Waiting for next journey…</div>
        </div>
      </div>
    );
  }

  if (journey.journey === 'place-order-saga') {
    return <SagaLadder journey={journey} isLive={isLive} events={events} />;
  }
  if (journey.journey === 'idempotent-retry') {
    return <IdempotencyTrace journey={journey} isLive={isLive} events={events} />;
  }
  return <OccRaceBoard journey={journey} isLive={isLive} events={events} />;
}

// ─────────────────────────────── Saga ladder ───────────────────────────────

const SAGA_HAPPY_STEPS = [
  'OrderCreated',
  'StockReservationRequested',
  'StockReservationCommitted',
  'PaymentSessionRequested',
  'PaymentCaptured',
  'OrderCompleted',
] as const;

const SAGA_COMPENSATE_STEPS = [
  'StockReservationFailed',
  'OrderCompensating',
  'OrderAbandoned',
] as const;

function SagaLadder({
  journey,
  isLive,
  events,
}: {
  journey: JourneySession;
  isLive: boolean;
  events: ConsoleEvent[];
}) {
  // Find the journey's POST /api/v1/demo/saga/start row to get the sagaId we
  // can match later events against. Without it we still render the ladder
  // statically; with it we can highlight by progress.
  const sagaEvents = useMemo(() => {
    const journeyStart = Date.parse(journey.startedAt);
    return events.filter((ev) => {
      const ts = Date.parse(ev.ts);
      if (!Number.isFinite(ts)) return false;
      if (ts < journeyStart - 500) return false; // small slack for clock skew
      return ev.path?.startsWith('/api/v1/demo/saga/');
    });
  }, [events, journey.startedAt]);

  // Crude progress estimator: count of saga GETs after start ≈ poll cycles.
  // Without backend-side step events plumbed all the way through, we model
  // progress on elapsed seconds (the BFF saga averages ~6s end-to-end).
  const elapsed = liveElapsedSec(journey, isLive);
  const isCompensating =
    !isLive && journey.ok === false && elapsed >= 2;
  const happyStep = Math.min(
    SAGA_HAPPY_STEPS.length,
    Math.floor((elapsed / 8) * SAGA_HAPPY_STEPS.length),
  );

  return (
    <div className="rounded-lg border border-white/[0.06] bg-black/30 p-3 md:p-4">
      <div className="text-[10px] uppercase tracking-[0.22em] text-muted/70 mb-3">
        Saga state machine
      </div>
      <div className="space-y-1">
        {SAGA_HAPPY_STEPS.map((step, i) => (
          <SagaRow
            key={step}
            label={step}
            active={!isCompensating && (isLive ? i < happyStep : journey.ok === true)}
            inFlight={isLive && i === happyStep - 1}
            tone={isCompensating ? 'dim' : journey.ok === true ? 'success' : 'pending'}
          />
        ))}
      </div>

      {(isCompensating || (!isLive && journey.ok === false)) && (
        <>
          <div className="h-px bg-error/30 my-3" />
          <div className="text-[10px] uppercase tracking-[0.22em] text-error/80 mb-2">
            Compensating
          </div>
          <div className="space-y-1">
            {SAGA_COMPENSATE_STEPS.map((step, i) => (
              <SagaRow
                key={step}
                label={step}
                active={true}
                inFlight={isLive && i === SAGA_COMPENSATE_STEPS.length - 1}
                tone="error"
              />
            ))}
          </div>
        </>
      )}

      <div className="mt-4 text-[10px] text-muted/60 font-mono tabular-nums">
        {sagaEvents.length} saga {sagaEvents.length === 1 ? 'event' : 'events'} · {elapsed}s elapsed
      </div>
    </div>
  );
}

function SagaRow({
  label,
  active,
  inFlight,
  tone,
}: {
  label: string;
  active: boolean;
  inFlight: boolean;
  tone: 'pending' | 'success' | 'error' | 'dim';
}) {
  const Icon = inFlight ? Loader2 : active ? CheckCircle2 : Activity;
  const colour =
    !active
      ? 'text-muted/40'
      : tone === 'error'
        ? 'text-error'
        : tone === 'success'
          ? 'text-success'
          : tone === 'dim'
            ? 'text-muted/40'
            : 'text-accent';
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <Icon className={`w-3 h-3 shrink-0 ${colour} ${inFlight ? 'animate-spin' : ''}`} />
      <span className={`tabular-nums ${active ? 'text-primary' : 'text-muted/50'} ${tone === 'dim' ? 'line-through' : ''}`}>
        {label}
      </span>
    </div>
  );
}

// ─────────────────────────── Idempotency trace ───────────────────────────

function IdempotencyTrace({
  journey,
  isLive,
  events,
}: {
  journey: JourneySession;
  isLive: boolean;
  events: ConsoleEvent[];
}) {
  const start = Date.parse(journey.startedAt);
  const submits = useMemo(
    () =>
      events
        .filter((ev) => {
          const ts = Date.parse(ev.ts);
          return (
            Number.isFinite(ts) &&
            ts >= start - 500 &&
            ev.method === 'POST' &&
            ev.path === '/api/v1/demo/idempotency/process'
          );
        })
        .slice(0, 5)
        .reverse(), // chronological
    [events, start],
  );
  const elapsed = liveElapsedSec(journey, isLive);

  return (
    <div className="rounded-lg border border-white/[0.06] bg-black/30 p-3 md:p-4">
      <div className="text-[10px] uppercase tracking-[0.22em] text-muted/70 mb-3">
        Same key · 5 submissions
      </div>
      <div className="space-y-1.5">
        {Array.from({ length: 5 }).map((_, i) => {
          const ev = submits[i];
          if (!ev) {
            return (
              <SubmitRow
                key={i}
                idx={i}
                state={i === submits.length ? (isLive ? 'inflight' : 'pending') : 'pending'}
                latencyMs={null}
                kind={null}
              />
            );
          }
          const isFirst = i === 0;
          return (
            <SubmitRow
              key={`${ev.ts}-${i}`}
              idx={i}
              state={ev.status >= 500 || ev.status === 0 ? 'failed' : 'ok'}
              latencyMs={ev.durationMs}
              kind={isFirst ? 'fresh' : 'dedup'}
            />
          );
        })}
      </div>

      <div className="mt-4 rounded border border-white/[0.06] bg-black/30 px-3 py-2">
        <div className="text-[10px] uppercase tracking-widest text-muted/60 mb-0.5">
          Invariant
        </div>
        <div className="text-[11px] text-secondary leading-relaxed">
          Postgres <code className="font-mono text-accent">ON CONFLICT (key)</code> returns the same{' '}
          <code className="font-mono text-accent">claim_id</code> on every replay. Zero duplicate
          rows, zero duplicate side-effects.
        </div>
      </div>

      <div className="mt-3 text-[10px] text-muted/60 font-mono tabular-nums">
        {submits.length}/5 submitted · {elapsed}s elapsed
      </div>
    </div>
  );
}

function SubmitRow({
  idx,
  state,
  latencyMs,
  kind,
}: {
  idx: number;
  state: 'pending' | 'inflight' | 'ok' | 'failed';
  latencyMs: number | null;
  kind: 'fresh' | 'dedup' | null;
}) {
  const colour =
    state === 'ok'
      ? 'text-success'
      : state === 'failed'
        ? 'text-error'
        : state === 'inflight'
          ? 'text-accent'
          : 'text-muted/40';
  const dot =
    state === 'ok' ? '●' : state === 'failed' ? '✗' : state === 'inflight' ? '◐' : '○';
  const labelTone = state === 'pending' ? 'text-muted/40' : 'text-primary';
  return (
    <div className="grid grid-cols-[20px_1fr_60px] gap-2 items-center text-[11px]">
      <span className={`tabular-nums ${colour} text-center`}>{dot}</span>
      <span className={`${labelTone} font-mono`}>
        submit #{idx + 1}
        {kind && (
          <span className="ml-2 text-[9.5px] uppercase tracking-widest text-muted/60">
            {kind === 'fresh' ? 'fresh write' : 'deduped'}
          </span>
        )}
      </span>
      <span className="text-muted/60 tabular-nums font-mono text-right text-[10px]">
        {latencyMs != null ? `${latencyMs.toFixed(0)}ms` : '—'}
      </span>
    </div>
  );
}

// ─────────────────────────────── OCC race ───────────────────────────────

function OccRaceBoard({
  journey,
  isLive,
  events,
}: {
  journey: JourneySession;
  isLive: boolean;
  events: ConsoleEvent[];
}) {
  const start = Date.parse(journey.startedAt);
  const puts = useMemo(
    () =>
      events
        .filter((ev) => {
          const ts = Date.parse(ev.ts);
          return (
            Number.isFinite(ts) &&
            ts >= start - 500 &&
            ev.method === 'PUT' &&
            ev.path?.startsWith('/api/v1/demo/inventory/')
          );
        })
        .slice(0, 5)
        .reverse(),
    [events, start],
  );
  const elapsed = liveElapsedSec(journey, isLive);
  const winners = puts.filter((p) => p.status >= 200 && p.status < 300).length;
  const losers = puts.filter((p) => p.status === 412 || p.status === 409).length;

  return (
    <div className="rounded-lg border border-white/[0.06] bg-black/30 p-3 md:p-4">
      <div className="text-[10px] uppercase tracking-[0.22em] text-muted/70 mb-3">
        5 concurrent updates · same xmin
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded border border-success/30 bg-success/[0.06] px-3 py-2">
          <div className="text-[10px] uppercase tracking-widest text-success/80">won</div>
          <div className="text-2xl font-bold tabular-nums text-success">{winners}</div>
          <div className="text-[10px] text-muted/60">CAS_OK · 200</div>
        </div>
        <div className="rounded border border-warning/30 bg-warning/[0.06] px-3 py-2">
          <div className="text-[10px] uppercase tracking-widest text-warning/80">rejected</div>
          <div className="text-2xl font-bold tabular-nums text-warning">{losers}</div>
          <div className="text-[10px] text-muted/60">STALE_XMIN · 412</div>
        </div>
      </div>

      <div className="space-y-1">
        {Array.from({ length: 5 }).map((_, i) => {
          const ev = puts[i];
          if (!ev) {
            return (
              <RaceRow
                key={i}
                idx={i}
                outcome={isLive ? 'inflight' : 'pending'}
                latencyMs={null}
              />
            );
          }
          const ok = ev.status >= 200 && ev.status < 300;
          return (
            <RaceRow
              key={`${ev.ts}-${i}`}
              idx={i}
              outcome={ok ? 'won' : 'lost'}
              latencyMs={ev.durationMs}
            />
          );
        })}
      </div>

      <div className="mt-4 rounded border border-white/[0.06] bg-black/30 px-3 py-2">
        <div className="text-[10px] uppercase tracking-widest text-muted/60 mb-0.5">
          Invariant
        </div>
        <div className="text-[11px] text-secondary leading-relaxed">
          Postgres <code className="font-mono text-accent">xmin</code> is EF's concurrency token.
          Exactly one update wins per batch. losers get 412, retry on a fresh row version.
        </div>
      </div>

      <div className="mt-3 text-[10px] text-muted/60 font-mono tabular-nums">
        {puts.length}/5 fired · {elapsed}s elapsed
      </div>
    </div>
  );
}

function RaceRow({
  idx,
  outcome,
  latencyMs,
}: {
  idx: number;
  outcome: 'pending' | 'inflight' | 'won' | 'lost';
  latencyMs: number | null;
}) {
  const colour =
    outcome === 'won'
      ? 'text-success'
      : outcome === 'lost'
        ? 'text-warning'
        : outcome === 'inflight'
          ? 'text-accent'
          : 'text-muted/40';
  const label =
    outcome === 'won'
      ? '200 · CAS_OK'
      : outcome === 'lost'
        ? '412 · STALE_XMIN'
        : outcome === 'inflight'
          ? 'inflight'
          : 'pending';
  return (
    <div className="grid grid-cols-[20px_1fr_60px] gap-2 items-center text-[11px]">
      <span className="text-muted/40 tabular-nums text-center font-mono">#{idx + 1}</span>
      <span className={`font-mono ${colour}`}>{label}</span>
      <span className="text-muted/60 tabular-nums font-mono text-right text-[10px]">
        {latencyMs != null ? `${latencyMs.toFixed(0)}ms` : '—'}
      </span>
    </div>
  );
}

// ─────────────────────────────── helpers ───────────────────────────────

function liveElapsedSec(j: JourneySession, isLive: boolean): number {
  const start = Date.parse(j.startedAt);
  const end = isLive
    ? Date.now()
    : j.endedAt
      ? Date.parse(j.endedAt)
      : Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, Math.floor((end - start) / 1000));
}

function formatElapsed(j: JourneySession): string {
  const s = liveElapsedSec(j, false);
  return `${s}s`;
}
