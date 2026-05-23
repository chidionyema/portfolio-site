/**
 * ArchitectureCanvas. the static reference diagram for /lab.
 *
 * Same node layout as LiveTopologyMap so visitors recognise the cluster
 * shape, but no packets, no chaos, no click-handlers. Edges are labelled
 * with what flows on each one (HTTP / MT events / Postgres / Vault leases).
 * This is the diagram you'd put in a system-design slide deck. The
 * /chaos page has the live, attacked version.
 */

interface NodeDef {
  id: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  label: string;
  kind: 'client' | 'service' | 'db' | 'queue' | 'cache' | 'vault';
}

const NODES: NodeDef[] = [
  { id: 'browser',     x: 460,  y: 32,  w: 80,  h: 36, label: 'Browser',    kind: 'client' },
  { id: 'bff',         x: 440,  y: 152, w: 120, h: 36, label: 'bff-web',    kind: 'service' },
  { id: 'catalog',     x: 70,   y: 292, w: 120, h: 36, label: 'catalog',    kind: 'service' },
  { id: 'orders',      x: 260,  y: 292, w: 120, h: 36, label: 'orders',     kind: 'service' },
  { id: 'payments',    x: 450,  y: 292, w: 120, h: 36, label: 'payments',   kind: 'service' },
  { id: 'checkout',    x: 640,  y: 292, w: 120, h: 36, label: 'checkout',   kind: 'service' },
  { id: 'identity',    x: 820,  y: 292, w: 120, h: 36, label: 'identity',   kind: 'service' },
  { id: 'pg-catalog',  x: 40,   y: 452, w: 80,  h: 36, label: 'pg/catalog', kind: 'db' },
  { id: 'pg-orders',   x: 160,  y: 452, w: 80,  h: 36, label: 'pg/orders',  kind: 'db' },
  { id: 'pg-payments', x: 280,  y: 452, w: 80,  h: 36, label: 'pg/payments',kind: 'db' },
  { id: 'pg-checkout', x: 400,  y: 452, w: 80,  h: 36, label: 'pg/checkout',kind: 'db' },
  { id: 'pg-identity', x: 520,  y: 452, w: 80,  h: 36, label: 'pg/identity',kind: 'db' },
  { id: 'rabbitmq',    x: 660,  y: 452, w: 80,  h: 36, label: 'rabbitmq',   kind: 'queue' },
  { id: 'redis',       x: 760,  y: 452, w: 80,  h: 36, label: 'redis',      kind: 'cache' },
  { id: 'vault',       x: 860,  y: 452, w: 80,  h: 36, label: 'vault',      kind: 'vault' },
];

interface EdgeDef {
  from: string;
  to: string;
  /** Style hint. solid for sync HTTP, dashed for MT events, dotted for Vault leases. */
  kind: 'http' | 'event' | 'sql' | 'vault' | 'cache';
}

const EDGES: EdgeDef[] = [
  // Browser → BFF (HTTP)
  { from: 'browser', to: 'bff', kind: 'http' },
  // BFF → services (HTTP)
  { from: 'bff', to: 'catalog',  kind: 'http' },
  { from: 'bff', to: 'orders',   kind: 'http' },
  { from: 'bff', to: 'payments', kind: 'http' },
  { from: 'bff', to: 'checkout', kind: 'http' },
  { from: 'bff', to: 'identity', kind: 'http' },
  // Services → their Postgres
  { from: 'catalog',  to: 'pg-catalog',  kind: 'sql' },
  { from: 'orders',   to: 'pg-orders',   kind: 'sql' },
  { from: 'payments', to: 'pg-payments', kind: 'sql' },
  { from: 'checkout', to: 'pg-checkout', kind: 'sql' },
  { from: 'identity', to: 'pg-identity', kind: 'sql' },
  // Catalog → Redis (cache)
  { from: 'catalog', to: 'redis', kind: 'cache' },
  // Services → RabbitMQ (MT events)
  { from: 'orders',   to: 'rabbitmq', kind: 'event' },
  { from: 'payments', to: 'rabbitmq', kind: 'event' },
  { from: 'checkout', to: 'rabbitmq', kind: 'event' },
  { from: 'catalog',  to: 'rabbitmq', kind: 'event' },
  // Identity → Vault
  { from: 'identity', to: 'vault', kind: 'vault' },
  // BFF → Vault (dynamic creds)
  { from: 'bff', to: 'vault', kind: 'vault' },
];

const KIND_STYLE: Record<EdgeDef['kind'], { stroke: string; dash: string; label: string }> = {
  http:  { stroke: 'rgb(91 63 214 / 0.45)',  dash: '0',     label: 'HTTP' },
  event: { stroke: 'rgb(234 179 8 / 0.45)',  dash: '6 4',   label: 'MT events' },
  sql:   { stroke: 'rgb(255 255 255 / 0.20)',dash: '0',     label: 'Postgres' },
  vault: { stroke: 'rgb(99 102 241 / 0.45)', dash: '2 4',   label: 'Vault leases' },
  cache: { stroke: 'rgb(220 38 38 / 0.40)',  dash: '0',     label: 'Redis' },
};

const NODE_KIND_STYLE: Record<NodeDef['kind'], { fill: string; stroke: string; text: string }> = {
  client:  { fill: 'rgba(11,11,14,0.9)', stroke: 'rgba(255,255,255,0.35)', text: 'rgb(245 245 240)' },
  service: { fill: 'rgba(11,11,14,0.9)', stroke: 'rgb(91 63 214)',         text: 'rgb(245 245 240)' },
  db:      { fill: 'rgba(11,11,14,0.9)', stroke: 'rgba(255,255,255,0.35)', text: 'rgb(245 245 240)' },
  queue:   { fill: 'rgba(11,11,14,0.9)', stroke: 'rgb(234 179 8)',         text: 'rgb(245 245 240)' },
  cache:   { fill: 'rgba(11,11,14,0.9)', stroke: 'rgb(220 38 38)',         text: 'rgb(245 245 240)' },
  vault:   { fill: 'rgba(11,11,14,0.9)', stroke: 'rgb(99 102 241)',        text: 'rgb(245 245 240)' },
};

export function ArchitectureCanvas() {
  const nodeMap = new Map(NODES.map((n) => [n.id, n]));

  const center = (n: NodeDef) => ({
    x: n.x + (n.w ?? 80) / 2,
    y: n.y + (n.h ?? 36) / 2,
  });

  return (
    <div className="relative w-full glass border border-white/10 rounded-2xl bg-black/40 overflow-hidden">
      <div className="absolute top-3 left-4 right-4 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.2em] text-muted z-10">
        <span>cluster · 1 BFF · 5 microservices · 8 infra</span>
        <span>static reference · live version on /chaos</span>
      </div>
      <svg
        viewBox="0 0 1000 540"
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Cluster architecture diagram"
      >
        <g fill="none">
          {EDGES.map((e, i) => {
            const f = nodeMap.get(e.from)!;
            const t = nodeMap.get(e.to)!;
            const a = center(f);
            const b = center(t);
            const style = KIND_STYLE[e.kind];
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={style.stroke}
                strokeWidth={1.25}
                strokeDasharray={style.dash}
              />
            );
          })}
        </g>
        <g>
          {NODES.map((n) => {
            const style = NODE_KIND_STYLE[n.kind];
            return (
              <g key={n.id}>
                <rect
                  x={n.x}
                  y={n.y}
                  width={n.w ?? 80}
                  height={n.h ?? 36}
                  rx={6}
                  ry={6}
                  fill={style.fill}
                  stroke={style.stroke}
                  strokeOpacity={0.8}
                  strokeWidth={1.5}
                />
                <text
                  x={n.x + (n.w ?? 80) / 2}
                  y={n.y + (n.h ?? 36) / 2 + 4}
                  textAnchor="middle"
                  fontSize="11"
                  fontFamily="ui-monospace, SF Mono, monospace"
                  fill={style.text}
                >
                  {n.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      <div className="px-4 py-3 border-t border-white/10 flex flex-wrap items-center gap-x-5 gap-y-1.5 font-mono text-[10px] text-muted">
        <Legend swatchClass="bg-[rgb(91_63_214)]" label="HTTP" />
        <Legend swatchClass="bg-[rgb(234_179_8)]" label="MassTransit events" dashed />
        <Legend swatchClass="bg-white/40" label="Postgres" />
        <Legend swatchClass="bg-[rgb(220_38_38)]" label="Redis" />
        <Legend swatchClass="bg-[rgb(99_102_241)]" label="Vault leases" dashed />
      </div>
    </div>
  );
}

function Legend({
  swatchClass,
  label,
  dashed = false,
}: {
  swatchClass: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={`inline-block w-6 h-[2px] ${swatchClass}`}
        style={dashed ? { borderTop: '2px dashed currentColor', backgroundColor: 'transparent' } : undefined}
      />
      <span>{label}</span>
    </span>
  );
}
