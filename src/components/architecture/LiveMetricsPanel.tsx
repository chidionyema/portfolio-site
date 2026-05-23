import { useEffect, useState, useMemo } from 'react';
import { useClusterState } from '../../hooks/useClusterState';

/**
 * LiveMetricsPanel
 *
 * Real-time tiles fed from the cluster store's event stream. No
 * narrative, no "X happened at Y" prose. the lab is supposed to
 * exercise the real system and let the visitor read its response
 * in numbers that move.
 *
 * What it shows, computed over the trailing 30s window of /api/*
 * events the BFF emitted:
 *
 *   - Requests / sec       (events ÷ 30)
 *   - Error rate           (% with status >= 500)
 *   - p99 latency          (ms)
 *   - Per-service breakdown: each upstream service's request count,
 *     error count, and chaos pause state
 *
 * Pause a service via the topology → background prober keeps firing
 * traffic → the affected service's tile flips to red and the global
 * error-rate gauge jumps within a couple of seconds. Resume →
 * numbers settle back. Visitor sees the response, doesn't have to
 * trust prose.
 */

const WINDOW_MS = 30_000;
const TICK_MS = 1000;

interface ServiceTile {
  id: string;
  name: string;
  requests: number;
  errors: number;
  paused: boolean;
}

export function LiveMetricsPanel() {
  const { events, services, chaos } = useClusterState();
  const [, setTick] = useState(0);

  // 1Hz tick so windowed stats refresh even when no new events arrive.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const stats = useMemo(() => {
    const cutoff = Date.now() - WINDOW_MS;
    const recent = events.filter((e) => {
      const ts = Date.parse(e.ts);
      return Number.isFinite(ts) && ts >= cutoff;
    });

    const total = recent.length;
    const errors = recent.filter((e) => e.status >= 500).length;
    const errorRate = total > 0 ? (errors / total) * 100 : 0;

    const sortedDur = recent
      .map((e) => e.durationMs)
      .filter((d) => Number.isFinite(d))
      .sort((a, b) => a - b);
    const p99Index = Math.max(
      0,
      Math.ceil(sortedDur.length * 0.99) - 1,
    );
    const p99 = sortedDur.length > 0 ? sortedDur[p99Index] : 0;

    // Per-service aggregation from the events' upstream hops. An event
    // can fan out to multiple upstreams; we count once per hop.
    const perService = new Map<string, { requests: number; errors: number }>();
    for (const e of recent) {
      const isError = e.status >= 500;
      const upstreams =
        e.upstreams && e.upstreams.length > 0
          ? e.upstreams
          : [{ service: 'bff-web', instanceId: e.instanceId }];
      for (const u of upstreams) {
        const id = serviceShortName(u.service);
        const prev = perService.get(id) ?? { requests: 0, errors: 0 };
        prev.requests++;
        if (isError) prev.errors++;
        perService.set(id, prev);
      }
    }

    const serviceTiles: ServiceTile[] = ['catalog', 'orders', 'payments', 'checkout', 'identity'].map((id) => {
      const s = perService.get(id) ?? { requests: 0, errors: 0 };
      const paused =
        services.find((sv) => sv.id === id)?.chaosPaused ??
        chaos[id]?.status === 'paused';
      return {
        id,
        name: id,
        requests: s.requests,
        errors: s.errors,
        paused,
      };
    });

    return {
      rps: total / (WINDOW_MS / 1000),
      errorRate,
      errorCount: errors,
      total,
      p99,
      serviceTiles,
    };
  }, [events, services, chaos]);

  const errorTone =
    stats.errorRate > 10
      ? 'text-error'
      : stats.errorRate > 1
        ? 'text-warning'
        : 'text-success';

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/[0.06] border border-white/[0.06] rounded-lg overflow-hidden font-mono">
      <Tile
        label="req / sec"
        value={stats.rps.toFixed(1)}
        sublabel={`${stats.total} in last 30s`}
      />
      <Tile
        label="error rate"
        value={`${stats.errorRate.toFixed(1)}%`}
        sublabel={`${stats.errorCount} 5xx`}
        valueClassName={errorTone}
      />
      <Tile
        label="p99 latency"
        value={`${stats.p99.toFixed(0)}ms`}
        sublabel="last 30s"
      />
      <Tile
        label="services"
        value={`${stats.serviceTiles.filter((s) => s.requests > 0).length}/5`}
        sublabel="hit in window"
      />

      <div className="col-span-2 md:col-span-4 bg-black/40 px-4 py-4 border-t border-white/[0.06]">
        <div className="text-[10px] text-muted/60 uppercase tracking-widest mb-3">
          per upstream service · trailing 30s
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {stats.serviceTiles.map((s) => (
            <ServiceRow key={s.id} tile={s} />
          ))}
        </div>
      </div>
    </div>
  );
}

interface TileProps {
  label: string;
  value: string;
  sublabel: string;
  valueClassName?: string;
}

function Tile({ label, value, sublabel, valueClassName }: TileProps) {
  return (
    <div className="bg-black/40 px-4 py-3">
      <div className="text-[10px] text-muted/60 uppercase tracking-widest mb-1">
        {label}
      </div>
      <div
        className={`text-xl tabular-nums font-bold ${valueClassName ?? 'text-primary'}`}
      >
        {value}
      </div>
      <div className="text-[10px] text-muted/50 mt-0.5">{sublabel}</div>
    </div>
  );
}

function ServiceRow({ tile }: { tile: ServiceTile }) {
  const errorPct =
    tile.requests > 0 ? (tile.errors / tile.requests) * 100 : 0;
  const tone = tile.paused
    ? 'text-error border-error/40 bg-error/5'
    : errorPct > 10
      ? 'text-error border-error/30 bg-error/5'
      : tile.requests === 0
        ? 'text-muted/50 border-white/[0.04]'
        : 'text-success border-success/20 bg-success/5';

  return (
    <div className={`rounded border px-3 py-2 ${tone}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-widest text-secondary">
          {tile.name}
        </span>
        {tile.paused && (
          <span className="text-[8px] uppercase tracking-widest text-error font-bold">
            paused
          </span>
        )}
      </div>
      <div className="text-base tabular-nums font-bold leading-none">
        {tile.requests}{' '}
        <span className="text-[10px] text-muted/60 font-normal">req</span>
      </div>
      {tile.errors > 0 && (
        <div className="text-[10px] text-error mt-1">
          {tile.errors} failed ({errorPct.toFixed(0)}%)
        </div>
      )}
    </div>
  );
}

/**
 * Map upstream service name to the short id we display. The console
 * events report `catalog-svc` / `orders-svc` etc; the topology and
 * chaos panel use `catalog` / `orders`.
 */
function serviceShortName(service: string): string {
  const map: Record<string, string> = {
    'catalog-svc': 'catalog',
    'orders-svc': 'orders',
    'payments-svc': 'payments',
    'checkout-svc': 'checkout',
    'identity-svc': 'identity',
    'bff-web': 'bff',
  };
  return map[service] ?? service;
}
