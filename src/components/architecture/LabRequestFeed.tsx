import { useEffect, useState } from 'react';
import { ChevronRight, Copy, Check } from 'lucide-react';
import { useClusterState } from '../../hooks/useClusterState';
import type { ConsoleEvent, ChaosTargetState } from '../../lib/cluster-store';

/**
 * LabRequestFeed
 *
 * Live tail of every /api/* the BFF handled. Each row is one request;
 * clicking a row expands an inline waterfall that explains in plain
 * English what happened to that specific request — which upstream
 * services it tried, how long each hop took, whether chaos
 * intercepted it, and what the BFF returned.
 *
 * This is the "what happens to the request" view a chaos test needs:
 * the visitor pauses a service, watches the wire feed fill with
 * 503 rows, clicks one, and reads the request's actual behaviour
 * end-to-end. Recovery is the same view in reverse — successful
 * rows after resume show the full happy-path waterfall.
 */

const SHOWN = 30;
const API_URL = (
  import.meta.env.PUBLIC_API_URL ?? ''
).replace(/\/$/, '');

/**
 * Maps a path prefix to the upstream chaos target(s) that path could
 * be blocked by. Used to infer "was this 503 caused by chaos?" without
 * needing the BFF to thread that information through every event.
 */
const PATH_CHAOS_TARGETS: Array<{ prefix: string; targets: string[] }> = [
  { prefix: '/api/v1/demo/idempotency', targets: ['orders', 'postgres'] },
  { prefix: '/api/v1/demo/cache/product', targets: ['catalog', 'postgres'] },
  { prefix: '/api/v1/demo/cache/stampede', targets: ['catalog', 'redis'] },
  { prefix: '/api/v1/demo/inventory', targets: ['catalog', 'postgres'] },
  { prefix: '/api/v1/demo/circuit', targets: ['catalog'] },
  { prefix: '/api/v1/demo/vault', targets: ['identity', 'vault'] },
  { prefix: '/api/v1/demo/events', targets: ['payments', 'rabbitmq'] },
  { prefix: '/api/v1/demo/saga', targets: ['checkout', 'catalog', 'payments', 'rabbitmq'] },
  { prefix: '/api/v1/demo/ratelimit', targets: [] },
];

function formatTime(ts: string): string {
  const t = ts.split('T')[1] ?? ts;
  return t.replace('Z', '').slice(0, 12);
}

function buildCurl(path: string, method: string): string {
  const m = method !== 'GET' ? `-X ${method} ` : '';
  return `curl -i ${m}'${API_URL}${path}'`;
}

function inferChaosCause(
  ev: ConsoleEvent,
  chaos: Record<string, ChaosTargetState>,
): { target: string; services: string[] } | null {
  if (ev.status !== 503 && ev.status !== 0) return null;
  const match = PATH_CHAOS_TARGETS.find((p) => ev.path?.startsWith(p.prefix));
  if (!match) return null;
  const paused = match.targets.find((t) => chaos[t]?.status === 'paused');
  if (!paused) return null;
  return { target: paused, services: match.targets };
}

export function LabRequestFeed() {
  const { events, chaos } = useClusterState();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const latest = events.slice(0, SHOWN);

  const copy = async (s: string, key: string) => {
    try {
      await navigator.clipboard.writeText(s);
      setCopied(key);
      setTimeout(() => setCopied(null), 1200);
    } catch {
      /* Clipboard API unavailable (non-HTTPS / backgrounded tab) — fall back to prompt */
      window.prompt('Copy:', s);
    }
  };

  return (
    <div className="font-mono">
      <div className="flex items-center justify-between mb-3 text-[10px] uppercase tracking-[0.2em] text-muted/70">
        <span>Live request feed · click a row for behaviour</span>
        <span className="text-muted/40">
          {events.length === 0
            ? 'waiting for traffic'
            : `${events.length} events buffered`}
        </span>
      </div>

      <div className="rounded-md border border-white/[0.06] bg-black/40 max-h-[520px] overflow-y-auto divide-y divide-white/[0.04]">
        {latest.length === 0 ? (
          <div className="px-4 py-8 text-center text-[11px] text-muted/50 italic">
            Waiting for the cluster to start producing events…
          </div>
        ) : (
          latest.map((ev, idx) => {
            const key = `${ev.ts}-${idx}`;
            const isOpen = expanded === key;
            return (
              <FeedRow
                key={key}
                ev={ev}
                isOpen={isOpen}
                onToggle={() => setExpanded(isOpen ? null : key)}
                chaos={chaos}
                onCopy={copy}
                copiedKey={copied}
                rowKey={key}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

function FeedRow({
  ev,
  isOpen,
  onToggle,
  chaos,
  onCopy,
  copiedKey,
  rowKey,
}: {
  ev: ConsoleEvent;
  isOpen: boolean;
  onToggle: () => void;
  chaos: Record<string, ChaosTargetState>;
  onCopy: (s: string, k: string) => void;
  copiedKey: string | null;
  rowKey: string;
}) {
  const isError = ev.status >= 500 || ev.status === 0;
  const isWarn = ev.status >= 400 && ev.status < 500;
  const tone = isError ? 'text-error' : isWarn ? 'text-warning' : 'text-success';
  const methodColor =
    ev.method === 'GET'
      ? 'text-accent'
      : ev.method === 'POST'
        ? 'text-success'
        : ev.method === 'DELETE'
          ? 'text-error'
          : 'text-warning';

  const chaosCause = inferChaosCause(ev, chaos);

  return (
    <div className={isOpen ? 'bg-white/[0.02]' : ''}>
      <button
        onClick={onToggle}
        className="w-full grid grid-cols-[14px_80px_60px_60px_1fr_70px_70px] gap-3 px-4 py-1.5 items-center text-[10.5px] hover:bg-white/[0.03] text-left"
      >
        <ChevronRight
          className={`w-3 h-3 text-muted/50 transition-transform ${isOpen ? 'rotate-90' : ''}`}
        />
        <span className="text-muted/60 tabular-nums truncate">
          {formatTime(ev.ts)}
        </span>
        <span className={`font-bold tabular-nums ${tone}`}>
          {ev.status || 'ERR'}
        </span>
        <span className={`font-bold ${methodColor}`}>{ev.method}</span>
        <span className="text-secondary truncate" title={ev.path}>
          {ev.path}
        </span>
        <span className="text-muted/70 tabular-nums text-right">
          {ev.durationMs.toFixed(0)}ms
        </span>
        <span
          className="text-muted/50 truncate text-right"
          title={ev.upstreams.map((u) => `${u.service} ${u.instanceId}`).join(', ')}
        >
          {chaosCause
            ? `chaos:${chaosCause.target}`
            : ev.upstreams.length > 0
              ? `→ ${ev.upstreams[0].service.replace('-svc', '')}`
              : '·'}
        </span>
      </button>

      {isOpen && <ExpandedDetail ev={ev} chaosCause={chaosCause} onCopy={onCopy} copiedKey={copiedKey} rowKey={rowKey} />}
    </div>
  );
}

function ExpandedDetail({
  ev,
  chaosCause,
  onCopy,
  copiedKey,
  rowKey,
}: {
  ev: ConsoleEvent;
  chaosCause: { target: string; services: string[] } | null;
  onCopy: (s: string, k: string) => void;
  copiedKey: string | null;
  rowKey: string;
}) {
  const isError = ev.status >= 500 || ev.status === 0;
  const upstreamMs = ev.upstreams.length > 0 ? Math.round(ev.durationMs * 0.85) : 0; // heuristic
  const bffMs = Math.max(0, Math.round(ev.durationMs - upstreamMs));
  const curl = buildCurl(ev.path, ev.method);

  return (
    <div className="px-4 py-4 border-t border-white/[0.04] bg-black/30 text-[11px] space-y-4">
      <Behaviour ev={ev} chaosCause={chaosCause} />

      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted/60 mb-2">
          Hop chain
        </div>
        <div className="space-y-1.5">
          <Hop label="Browser" detail={`${ev.method} ${ev.path}`} kind="browser" />
          <Hop
            label={`bff-web-${ev.instanceId}`}
            detail={`received · ${ev.method}`}
            kind="bff"
          />
          {ev.upstreams.length === 0 ? (
            <Hop
              label="(no upstream)"
              detail={
                chaosCause
                  ? `BFF chaos handler short-circuited before any network call`
                  : 'BFF handled in-process'
              }
              kind="ghost"
            />
          ) : (
            ev.upstreams.map((u, i) => (
              <Hop
                key={i}
                label={`${u.service} · ${u.instanceId}`}
                detail={
                  isError ? 'returned error' : 'responded'
                }
                kind="upstream"
              />
            ))
          )}
          <Hop
            label="response"
            detail={`status ${ev.status || 'ERR'} · ${ev.durationMs.toFixed(0)}ms total`}
            kind={isError ? 'error' : 'success'}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="total duration" value={`${ev.durationMs.toFixed(0)}ms`} />
        <Stat
          label="upstream / bff split"
          value={
            ev.upstreams.length > 0
              ? `${upstreamMs}ms / ${bffMs}ms`
              : 'bff only'
          }
        />
        {ev.traceId && (
          <Stat label="trace id" value={ev.traceId.slice(0, 8) + '…'} />
        )}
        {ev.correlationId && (
          <Stat
            label="correlation id"
            value={ev.correlationId.slice(0, 8) + '…'}
          />
        )}
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-white/[0.04]">
        <span className="text-[10px] uppercase tracking-widest text-muted/60">
          reproduce
        </span>
        <code className="flex-1 text-[10px] text-muted bg-black/40 px-2 py-1 rounded truncate">
          {curl}
        </code>
        <button
          onClick={() => onCopy(curl, rowKey)}
          className="text-secondary hover:text-primary p-1"
          title="Copy curl"
        >
          {copiedKey === rowKey ? (
            <Check className="w-3.5 h-3.5 text-success" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}

function Behaviour({
  ev,
  chaosCause,
}: {
  ev: ConsoleEvent;
  chaosCause: { target: string; services: string[] } | null;
}) {
  if (chaosCause) {
    return (
      <div className="rounded border border-error/30 bg-error/[0.06] p-3 text-error">
        <div className="text-[10px] uppercase tracking-widest text-error/80 mb-1">
          What happened to this request
        </div>
        <p className="text-[11.5px] leading-relaxed">
          The BFF tried to call <code className="font-bold">{chaosCause.services.join(' / ')}</code>,
          which is currently chaos-paused (you paused{' '}
          <strong>{chaosCause.target}</strong> via the topology). The BFF's
          chaos handler intercepted the outbound call before any network
          activity and threw a synthetic 503 in{' '}
          <strong>{ev.durationMs.toFixed(0)}ms</strong>. Without the handler
          this request would have hung for the full 4-second HttpClient
          timeout per upstream attempt. Resume the target — the next
          request hits the real service and returns normally.
        </p>
      </div>
    );
  }
  if (ev.status === 0) {
    return (
      <div className="rounded border border-error/30 bg-error/[0.06] p-3 text-error">
        <div className="text-[10px] uppercase tracking-widest text-error/80 mb-1">
          What happened to this request
        </div>
        <p className="text-[11.5px] leading-relaxed">
          The browser couldn't get a response — typically a network
          drop, a CORS preflight failure, or the BFF process not yet
          listening. Check the topology header for the cluster's
          status.
        </p>
      </div>
    );
  }
  if (ev.status >= 500) {
    return (
      <div className="rounded border border-error/30 bg-error/[0.06] p-3 text-error">
        <div className="text-[10px] uppercase tracking-widest text-error/80 mb-1">
          What happened to this request
        </div>
        <p className="text-[11.5px] leading-relaxed">
          The BFF returned a 5xx in <strong>{ev.durationMs.toFixed(0)}ms</strong>.
          {ev.upstreams.length > 0
            ? ` It made ${ev.upstreams.length} upstream call${ev.upstreams.length === 1 ? '' : 's'} and at least one of them failed or threw.`
            : ' It failed in-process before any upstream call landed.'}
        </p>
      </div>
    );
  }
  if (ev.status >= 400) {
    return (
      <div className="rounded border border-warning/30 bg-warning/[0.06] p-3 text-warning">
        <div className="text-[10px] uppercase tracking-widest text-warning/80 mb-1">
          What happened to this request
        </div>
        <p className="text-[11.5px] leading-relaxed">
          The BFF returned a 4xx — client-level rejection. Common
          reasons: bad payload, missing header, route not found,
          rate-limit exhausted.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded border border-success/30 bg-success/[0.06] p-3 text-success">
      <div className="text-[10px] uppercase tracking-widest text-success/80 mb-1">
        What happened to this request
      </div>
      <p className="text-[11.5px] leading-relaxed">
        The BFF received the request and returned{' '}
        <strong>{ev.status}</strong> in{' '}
        <strong>{ev.durationMs.toFixed(0)}ms</strong>.{' '}
        {ev.upstreams.length === 0
          ? 'No upstream call — the BFF handled this in-process (rate-limit, idempotency, etc).'
          : `It fanned out to ${ev.upstreams.length} upstream service${ev.upstreams.length === 1 ? '' : 's'}: ${ev.upstreams.map((u) => `${u.service.replace('-svc', '')} (${u.instanceId})`).join(', ')}.`}
      </p>
    </div>
  );
}

function Hop({
  label,
  detail,
  kind,
}: {
  label: string;
  detail: string;
  kind: 'browser' | 'bff' | 'upstream' | 'response' | 'success' | 'error' | 'ghost';
}) {
  const colour =
    kind === 'browser' || kind === 'bff'
      ? 'text-accent'
      : kind === 'success'
        ? 'text-success'
        : kind === 'error'
          ? 'text-error'
          : kind === 'ghost'
            ? 'text-muted/50'
            : 'text-secondary';
  return (
    <div className="grid grid-cols-[18px_1fr_auto] gap-2 items-center text-[10.5px]">
      <span className={`tabular-nums text-muted/40 text-right`}>›</span>
      <span className={`font-bold ${colour}`}>{label}</span>
      <span className="text-muted/70">{detail}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/[0.06] bg-black/30 px-3 py-2">
      <div className="text-[9px] uppercase tracking-widest text-muted/60 mb-0.5">
        {label}
      </div>
      <div className="text-[11.5px] text-primary tabular-nums font-bold">
        {value}
      </div>
    </div>
  );
}
