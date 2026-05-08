import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle, Activity } from 'lucide-react';

/**
 * LabAutoRunners
 *
 * The lab is a system being exercised, not a console waiting for
 * clicks. Each card here represents one of the patterns the cluster
 * implements; every card is firing real requests against the BFF in
 * a loop on its own cadence. Cards show: last result, total runs in
 * this session, total failures, last latency. Pause a dependent
 * service via the topology -> the affected runner's failures counter
 * starts climbing within seconds because the loop is already in
 * flight.
 *
 * Every endpoint listed below proxies to a real backend (Postgres
 * UNIQUE for idempotency, EF + xmin for concurrency, Stripe-mode
 * Saga for checkout, real catalog HybridCache for cache demos,
 * real Vault probe for vault status, etc). No simulations.
 */

const API_URL = (
  import.meta.env.PUBLIC_API_URL || 'http://localhost:5050'
).replace(/\/$/, '');

interface RunnerSpec {
  id: string;
  name: string;
  what: string;
  intervalMs: number;
  /**
   * Returns { ok, status, body? }. Throws on network failure;
   * non-2xx responses still resolve so the runner can record them
   * as failed runs.
   */
  run: () => Promise<{ ok: boolean; status: number; body?: any }>;
}

async function rawFetch(
  path: string,
  init: RequestInit = {},
): Promise<{ ok: boolean; status: number; body?: any }> {
  try {
    const r = await fetch(`${API_URL}${path}`, { cache: 'no-store', ...init });
    let body: any = undefined;
    try {
      const ct = r.headers.get('content-type') ?? '';
      if (ct.includes('application/json')) body = await r.json();
    } catch {
      // ignore
    }
    return { ok: r.ok, status: r.status, body };
  } catch (e) {
    return { ok: false, status: 0, body: { error: (e as Error).message } };
  }
}

const RUNNERS: RunnerSpec[] = [
  {
    id: 'idempotency',
    name: 'Idempotency',
    what: 'POST /idempotency/claim with a fresh key every cycle',
    intervalMs: 6000,
    run: () => {
      const key = `lab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      return rawFetch('/api/demo/idempotency/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': key,
          'X-Idempotency-Ttl-Seconds': '30',
        },
        body: JSON.stringify({ amount: 39.99 }),
      });
    },
  },
  {
    id: 'cache',
    name: 'Cache invalidation',
    what: 'GET /cache/product/demo · catalog HybridCache',
    intervalMs: 4000,
    run: () => rawFetch('/api/demo/cache/product/demo'),
  },
  {
    id: 'concurrency',
    name: 'Concurrency',
    what: 'GET /inventory · catalog Product · EF xmin',
    intervalMs: 5000,
    run: async () => {
      const seed = await rawFetch('/api/demo/cache/product/demo');
      const id = seed.body?.id;
      if (!id) return seed;
      return rawFetch(`/api/demo/inventory/${id}`);
    },
  },
  {
    id: 'circuit',
    name: 'Circuit breaker',
    what: 'POST /circuit/request · Polly + catalog',
    intervalMs: 5000,
    run: () =>
      rawFetch('/api/demo/circuit/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: null, bypassBreaker: false }),
      }),
  },
  {
    id: 'ratelimit',
    name: 'Rate limit',
    what: 'POST /ratelimit/request · sliding window',
    intervalMs: 2500,
    run: () =>
      rawFetch('/api/demo/ratelimit/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // X-Demo-Session must parse as Guid? — 'lab-runner' was failing
          // ASP.NET's model binding with 400. Omit and let the controller
          // generate a fresh session id from the empty body.
        },
        body: JSON.stringify({ sessionId: null }),
      }),
  },
  // Vault runner disabled in prod: no Vault server provisioned, the
  // endpoint always 503s, the failure rate alone trips the BFF's
  // identity-svc circuit breaker. Re-enable once a real Vault is up.
  // {
  //   id: 'vault',
  //   name: 'Vault status',
  //   what: 'GET /vault/status · live /v1/sys/health probe',
  //   intervalMs: 7000,
  //   run: () => rawFetch('/api/demo/vault/status'),
  // },
  {
    id: 'events',
    name: 'Event flow relay',
    what: 'GET /events/relay-status · payments outbox',
    intervalMs: 5000,
    run: () => rawFetch('/api/demo/events/relay-status'),
  },
  {
    id: 'saga',
    name: 'Saga checkout',
    what: 'POST /saga/start · checkout → catalog → payments',
    intervalMs: 12000,
    run: () =>
      rawFetch('/api/demo/saga/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioType: 'success',
          simulatedDelayMs: 200,
        }),
      }),
  },
  {
    id: 'stampede',
    name: 'Cache stampede',
    what: 'POST /cache/stampede · HybridCache singleflight',
    intervalMs: 15000,
    run: () =>
      rawFetch('/api/demo/cache/stampede', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concurrentRequests: 8,
          cacheKey: `lab-${Date.now()}`,
          protectionMode: 'singleflight',
          simulatedDbLatencyMs: 50,
        }),
      }),
  },
];

interface RunnerState {
  runs: number;
  failures: number;
  lastStatus: number | null;
  lastDurationMs: number | null;
  lastTs: number | null;
  inFlight: boolean;
}

const INITIAL_STATE: RunnerState = {
  runs: 0,
  failures: 0,
  lastStatus: null,
  lastDurationMs: null,
  lastTs: null,
  inFlight: false,
};

function useRunner(spec: RunnerSpec): RunnerState {
  const [state, setState] = useState<RunnerState>(INITIAL_STATE);

  useEffect(() => {
    let stopped = false;

    const fire = async () => {
      if (stopped) return;
      setState((s) => ({ ...s, inFlight: true }));
      const start = performance.now();
      try {
        const res = await spec.run();
        const dur = Math.round(performance.now() - start);
        if (stopped) return;
        setState((s) => ({
          runs: s.runs + 1,
          failures: res.ok ? s.failures : s.failures + 1,
          lastStatus: res.status,
          lastDurationMs: dur,
          lastTs: Date.now(),
          inFlight: false,
        }));
      } catch (e) {
        const dur = Math.round(performance.now() - start);
        if (stopped) return;
        setState((s) => ({
          runs: s.runs + 1,
          failures: s.failures + 1,
          lastStatus: 0,
          lastDurationMs: dur,
          lastTs: Date.now(),
          inFlight: false,
        }));
      }
    };

    // Stagger first call slightly so all 9 don't fire at once on page load.
    const start = window.setTimeout(fire, Math.random() * 1500);
    const id = window.setInterval(fire, spec.intervalMs);
    return () => {
      stopped = true;
      clearTimeout(start);
      clearInterval(id);
    };
  }, [spec]);

  return state;
}

export function LabAutoRunners() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {RUNNERS.map((r) => (
        <RunnerCard key={r.id} spec={r} />
      ))}
    </div>
  );
}

function RunnerCard({ spec }: { spec: RunnerSpec }) {
  const state = useRunner(spec);
  const failureRate = state.runs > 0 ? (state.failures / state.runs) * 100 : 0;

  const tone =
    state.lastStatus === null
      ? 'border-white/[0.06] bg-white/[0.02]'
      : !state.lastStatus
        ? 'border-error/40 bg-error/[0.06]'
        : state.lastStatus >= 500
          ? 'border-error/40 bg-error/[0.06]'
          : state.lastStatus >= 400
            ? 'border-warning/30 bg-warning/[0.04]'
            : 'border-success/20 bg-success/[0.03]';

  const StatusIcon =
    state.lastStatus === null
      ? Activity
      : state.lastStatus >= 500 || state.lastStatus === 0
        ? AlertCircle
        : state.lastStatus >= 400
          ? AlertCircle
          : CheckCircle2;
  const statusColor =
    state.lastStatus === null
      ? 'text-muted/50'
      : state.lastStatus >= 500 || state.lastStatus === 0
        ? 'text-error'
        : state.lastStatus >= 400
          ? 'text-warning'
          : 'text-success';

  return (
    <div className={`rounded-md border ${tone} p-4 font-mono transition-colors`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-secondary font-bold">
            {spec.name}
          </div>
          <div className="text-[10px] text-muted/70 mt-0.5">{spec.what}</div>
        </div>
        {state.inFlight ? (
          <Loader2 className="w-3.5 h-3.5 text-accent animate-spin shrink-0 mt-1" />
        ) : (
          <StatusIcon className={`w-3.5 h-3.5 shrink-0 mt-1 ${statusColor}`} />
        )}
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        {state.lastStatus !== null ? (
          <>
            <span className={`text-base font-bold tabular-nums ${statusColor}`}>
              {state.lastStatus === 0 ? 'ERR' : state.lastStatus}
            </span>
            <span className="text-[10px] text-muted/60 tabular-nums">
              {state.lastDurationMs}ms
              {state.lastTs && (
                <>
                  {' · '}
                  {Math.max(
                    0,
                    Math.floor((Date.now() - state.lastTs) / 1000),
                  )}
                  s ago
                </>
              )}
            </span>
          </>
        ) : (
          <span className="text-[10px] text-muted/50 italic">starting…</span>
        )}
      </div>

      <div className="flex justify-between text-[10px] text-muted/70 tabular-nums">
        <span>{state.runs} runs</span>
        <span className={state.failures > 0 ? 'text-error' : ''}>
          {state.failures} failed{' '}
          {state.runs > 0 && (
            <span className="text-muted/40">({failureRate.toFixed(0)}%)</span>
          )}
        </span>
      </div>
    </div>
  );
}
