import { useEffect, useState } from 'react';

/**
 * Terminal-style live event feed. Cycles through saga events at ~600ms each,
 * generates a fresh trace ID per cycle. Pre-backend the events come from a
 * known saga walkthrough; post-backend the same component swaps to an SSE
 * subscription on /events/stream — same row shape, same render path.
 */

interface Event {
  ts: Date;
  service: string;
  name: string;
  traceId: string;
}

const SAGA: Array<{ service: string; name: string; gapMs: number }> = [
  { service: 'orders',    name: 'OrderCreated',       gapMs: 0 },
  { service: 'inventory', name: 'StockReserved',      gapMs: 56 },
  { service: 'orders',    name: 'OutboxEventStored',  gapMs: 23 },
  { service: 'payments',  name: 'PaymentAuthorised',  gapMs: 147 },
  { service: 'orders',    name: 'OrderConfirmed',     gapMs: 32 },
  { service: 'notifs',    name: 'EmailQueued',        gapMs: 411 },
];

function makeTraceId() {
  return Array.from({ length: 12 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

function formatTime(d: Date) {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${h}:${m}:${s}.${ms}`;
}

const SERVICE_COLOR: Record<string, string> = {
  orders:    'text-blue-400',
  inventory: 'text-amber-400',
  payments:  'text-green-400',
  notifs:    'text-pink-400',
  outbox:    'text-purple-400',
};

const ROWS = 6;
const STEP_MS = 600;

export function LiveEventFeed() {
  const [events, setEvents] = useState<Event[]>([]);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      // Show one full saga snapshot, no animation.
      const trace = makeTraceId();
      const now = Date.now();
      setEvents(
        SAGA.map((step, i) => ({
          ts: new Date(now - (SAGA.length - i) * 100),
          service: step.service,
          name: step.name,
          traceId: trace,
        })).reverse(),
      );
      return;
    }

    let traceId = makeTraceId();
    let cursor = 0;

    const tick = () => {
      if (cursor >= SAGA.length) {
        traceId = makeTraceId();
        cursor = 0;
      }
      const step = SAGA[cursor++];
      const ts = new Date();
      setEvents((prev) => [{ ts, service: step.service, name: step.name, traceId }, ...prev].slice(0, ROWS));
    };

    tick();
    const id = window.setInterval(() => {
      if (!paused) tick();
    }, STEP_MS);
    return () => window.clearInterval(id);
  }, [paused]);

  return (
    <div
      className="surface text-left overflow-hidden mx-auto max-w-2xl w-full"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-muted">
          <span className="relative flex w-1.5 h-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-60 animate-ping" />
            <span className="relative inline-flex rounded-full w-1.5 h-1.5 bg-success" />
          </span>
          live event stream
        </div>
        <span className="text-[10px] font-mono text-muted">/events/stream</span>
      </div>

      <ol className="font-mono text-[11px] sm:text-xs leading-relaxed py-2 px-4 min-h-[170px]">
        {events.length === 0 && (
          <li className="text-muted">connecting…</li>
        )}
        {events.map((e, i) => (
          <li
            key={`${e.traceId}-${e.ts.getTime()}-${i}`}
            className="grid grid-cols-[78px_70px_1fr_auto] sm:grid-cols-[88px_82px_1fr_auto] gap-3 items-baseline whitespace-nowrap"
            style={{ opacity: 1 - i * 0.13 }}
          >
            <span className="text-muted tabular-nums">{formatTime(e.ts)}</span>
            <span className={SERVICE_COLOR[e.service] ?? 'text-secondary'}>{e.service}</span>
            <span className="text-primary truncate">{e.name}</span>
            <span className="text-muted hidden sm:inline truncate">trace={e.traceId.slice(0, 7)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
