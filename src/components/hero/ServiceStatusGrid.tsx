/**
 * Service status grid. Five microservice tiles with status dot, name, latency.
 * Pre-backend: hardcoded baseline. Post-backend: rebound to /health/stream
 * (see docs/UI_FEATURES_PLAN.md §3.1) — same row shape, same render path.
 */

interface Service {
  id: string;
  name: string;
  latencyMs: number;
  status: 'healthy' | 'degraded' | 'down';
}

const services: Service[] = [
  { id: 'orders',    name: 'orders',    latencyMs: 47, status: 'healthy' },
  { id: 'inventory', name: 'inventory', latencyMs: 31, status: 'healthy' },
  { id: 'payments',  name: 'payments',  latencyMs: 52, status: 'healthy' },
  { id: 'notifs',    name: 'notifs',    latencyMs: 12, status: 'healthy' },
  { id: 'vault',     name: 'vault',     latencyMs: 18, status: 'healthy' },
];

const statusDot = {
  healthy: 'bg-success',
  degraded: 'bg-warning',
  down: 'bg-error',
};

export function ServiceStatusGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 max-w-3xl mx-auto">
      {services.map((s) => (
        <div
          key={s.id}
          className="surface px-3 py-2.5 flex items-center gap-2.5 text-left"
        >
          <span className="relative flex w-1.5 h-1.5 shrink-0">
            <span className={`absolute inline-flex h-full w-full rounded-full ${statusDot[s.status]} opacity-50 animate-ping`} />
            <span className={`relative inline-flex rounded-full w-1.5 h-1.5 ${statusDot[s.status]}`} />
          </span>
          <div className="flex-1 min-w-0 flex flex-col">
            <span className="font-mono text-xs text-primary truncate">{s.name}</span>
            <span className="font-mono text-[10px] text-muted tabular-nums">{s.latencyMs}ms p99</span>
          </div>
        </div>
      ))}
    </div>
  );
}
