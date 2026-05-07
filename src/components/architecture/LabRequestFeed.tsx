import { useEffect, useState } from 'react';
import { useClusterState } from '../../hooks/useClusterState';

/**
 * LabRequestFeed
 *
 * Front-and-centre rolling tail of every /api/* request the BFF
 * actually handled. Same data the corner dock shows, but inline on
 * the lab page so the visitor's eye lands on the live evidence
 * rather than a tiny widget in the corner.
 *
 * Pause a service via the topology -> the next probe / runner / demo
 * call to that service appears here as a red 503 row within a
 * second. Resume -> the next call appears green.
 *
 * No interpretation, no narrative — just the wire.
 */

const SHOWN = 30;

function formatTime(ts: string): string {
  // Avoid SSR/CSR mismatch from toLocaleTimeString — slice the ISO.
  const t = ts.split('T')[1] ?? ts;
  return t.replace('Z', '').slice(0, 12);
}

function buildCurl(path: string, method: string): string {
  return `curl -i ${method !== 'GET' ? `-X ${method} ` : ''}'${path}'`;
}

export function LabRequestFeed() {
  const { events } = useClusterState();
  const [, setTick] = useState(0);

  // 1Hz tick so "Xs ago" timestamps update.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const latest = events.slice(0, SHOWN);

  return (
    <div className="font-mono">
      <div className="flex items-center justify-between mb-3 text-[10px] uppercase tracking-[0.2em] text-muted/70">
        <span>Live request feed</span>
        <span className="text-muted/40">
          {events.length === 0
            ? 'waiting for traffic'
            : `${events.length} events buffered`}
        </span>
      </div>

      <div className="rounded-md border border-white/[0.06] bg-black/40 max-h-[420px] overflow-y-auto divide-y divide-white/[0.04]">
        {latest.length === 0 ? (
          <div className="px-4 py-8 text-center text-[11px] text-muted/50 italic">
            Waiting for the cluster to start producing events…
          </div>
        ) : (
          latest.map((ev, idx) => (
            <FeedRow key={`${ev.ts}-${idx}`} ev={ev} />
          ))
        )}
      </div>
    </div>
  );
}

function FeedRow({ ev }: { ev: ReturnType<typeof useClusterState>['events'][number] }) {
  const isError = ev.status >= 500 || ev.status === 0;
  const isWarn = ev.status >= 400 && ev.status < 500;
  const tone = isError
    ? 'text-error'
    : isWarn
      ? 'text-warning'
      : 'text-success';
  const methodColor =
    ev.method === 'GET'
      ? 'text-accent'
      : ev.method === 'POST'
        ? 'text-success'
        : ev.method === 'DELETE'
          ? 'text-error'
          : 'text-warning';

  return (
    <div className="grid grid-cols-[80px_60px_60px_1fr_70px_60px] gap-3 px-4 py-1.5 items-center text-[10.5px] hover:bg-white/[0.02]">
      <span className="text-muted/60 tabular-nums truncate">
        {formatTime(ev.ts)}
      </span>
      <span className={`font-bold tabular-nums ${tone}`}>{ev.status || 'ERR'}</span>
      <span className={`font-bold ${methodColor}`}>{ev.method}</span>
      <span className="text-secondary truncate" title={ev.path}>
        {ev.path}
      </span>
      <span className="text-muted/70 tabular-nums text-right">
        {ev.durationMs.toFixed(0)}ms
      </span>
      <span className="text-muted/50 truncate text-right" title={ev.upstreams.map((u) => `${u.service} ${u.instanceId}`).join(', ')}>
        {ev.upstreams.length > 0
          ? `→ ${ev.upstreams[0].service.replace('-svc', '')}`
          : '·'}
      </span>
    </div>
  );
}
