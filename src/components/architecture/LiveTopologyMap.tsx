import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';

/**
 * LiveTopologyMap
 *
 * Replaces the placeholder TopologyMap. The point of this component is
 * to make the actual cluster shape visible — Browser → BFF → 5 services
 * (catalog ×2 via Aspire WithReplicas) → 5 Postgres databases / RabbitMQ /
 * Redis / Vault — and to animate every real request as it flows through.
 *
 * Data sources:
 *   • <c>/hubs/console</c> SignalR stream (built earlier today) for
 *     per-request events with upstream attribution.
 *   • <c>/api/health/snapshot</c> for service health colouring.
 *
 * Packet animation: each event spawns a Browser → BFF packet plus a BFF →
 * upstream packet per hop captured by UpstreamInstanceCaptureHandler.
 * Path heuristics drive a third hop into the right infra node:
 *   /cache/     → Redis
 *   /events|saga → RabbitMQ
 *   /vault/     → Vault
 *   anything else → that service's Postgres
 *
 * Replica badges: each service node aggregates the set of instance ids
 * observed in the event stream and renders one dot per replica below the
 * node. WithReplicas(2) → two dots over the catalog node within seconds.
 *
 * Out of scope (phase 2): chaos buttons (kill / inject 503 / pause).
 */

const CONSOLE_HUB_URL =
  (import.meta as any).env?.PUBLIC_BFF_URL?.replace(/\/$/, '') ??
  'http://localhost:5050';

interface UpstreamHop {
  service: string;
  instanceId: string;
}

interface ConsoleEvent {
  ts: string;
  service: string;
  instanceId: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  upstreams: UpstreamHop[];
}

interface NodeDef {
  id: string;
  x: number;
  y: number;
  label: string;
  kind: 'client' | 'service' | 'db' | 'queue' | 'cache' | 'vault';
  service?: string; // matches the upstream-hop `service` field
}

// Layout in viewBox 1000×540. Row spacing: 50 / 170 / 310 / 460.
const NODES: Record<string, NodeDef> = {
  browser: { id: 'browser', x: 500, y: 50, label: 'Browser', kind: 'client' },
  bff: { id: 'bff', x: 500, y: 170, label: 'bff-web', kind: 'service', service: 'bff-web' },

  // Row 3: 5 services
  catalog: { id: 'catalog', x: 130, y: 310, label: 'catalog', kind: 'service', service: 'catalog-svc' },
  orders: { id: 'orders', x: 320, y: 310, label: 'orders', kind: 'service', service: 'orders-svc' },
  payments: { id: 'payments', x: 510, y: 310, label: 'payments', kind: 'service', service: 'payments-svc' },
  checkout: { id: 'checkout', x: 700, y: 310, label: 'checkout', kind: 'service', service: 'checkout-svc' },
  identity: { id: 'identity', x: 880, y: 310, label: 'identity', kind: 'service', service: 'identity-svc' },

  // Row 4: infra
  'pg-catalog': { id: 'pg-catalog', x: 80, y: 470, label: 'pg/catalog', kind: 'db' },
  'pg-orders': { id: 'pg-orders', x: 200, y: 470, label: 'pg/orders', kind: 'db' },
  'pg-payments': { id: 'pg-payments', x: 320, y: 470, label: 'pg/payments', kind: 'db' },
  'pg-content': { id: 'pg-content', x: 440, y: 470, label: 'pg/content', kind: 'db' },
  'pg-identity': { id: 'pg-identity', x: 560, y: 470, label: 'pg/identity', kind: 'db' },
  rabbitmq: { id: 'rabbitmq', x: 700, y: 470, label: 'rabbitmq', kind: 'queue' },
  redis: { id: 'redis', x: 800, y: 470, label: 'redis', kind: 'cache' },
  vault: { id: 'vault', x: 900, y: 470, label: 'vault', kind: 'vault' },
};

// Static edges drawn underneath the live packets.
const STATIC_EDGES: [string, string][] = [
  ['browser', 'bff'],
  ['bff', 'catalog'],
  ['bff', 'orders'],
  ['bff', 'payments'],
  ['bff', 'checkout'],
  ['bff', 'identity'],
  ['catalog', 'pg-catalog'],
  ['catalog', 'redis'],
  ['catalog', 'rabbitmq'],
  ['orders', 'pg-orders'],
  ['orders', 'rabbitmq'],
  ['payments', 'pg-payments'],
  ['payments', 'rabbitmq'],
  ['payments', 'vault'],
  ['checkout', 'pg-orders'],
  ['checkout', 'rabbitmq'],
  ['identity', 'pg-identity'],
  ['identity', 'vault'],
];

const SERVICE_NAME_TO_NODE: Record<string, string> = {
  'catalog-svc': 'catalog',
  'orders-svc': 'orders',
  'payments-svc': 'payments',
  'checkout-svc': 'checkout',
  'identity-svc': 'identity',
};

// Map a topology node id → chaos endpoint target. The 5 pg-* nodes share
// one Postgres container in dev so they all route to the same target —
// pausing any is pausing all, which is accurate to the real failure mode.
// Browser + bff are not valid targets (the BFF runs the chaos API).
const NODE_TO_CHAOS_TARGET: Record<string, string> = {
  catalog: 'catalog',
  orders: 'orders',
  payments: 'payments',
  checkout: 'checkout',
  identity: 'identity',
  'pg-catalog': 'postgres',
  'pg-orders': 'postgres',
  'pg-payments': 'postgres',
  'pg-content': 'postgres',
  'pg-identity': 'postgres',
  rabbitmq: 'rabbitmq',
  redis: 'redis',
  vault: 'vault',
};

interface ChaosTargetState {
  target: string;
  status: 'running' | 'paused';
  resumeAtUtc: string | null;
  remainingSeconds: number | null;
}

// Demo dependency map. Drives the impact ribbon: when a chaos target
// goes red, every demo that depends on it lights up too. The path
// prefixes let us match incoming console events back to the originating
// demo for the live success/fail counters.
//
// `anchorId` is the DOM id of the demo card on the page so clicking a
// ribbon row scrolls to it. The frontend demo components mount under
// these ids today (see src/components/demo/DemoSidebar.tsx).
interface DemoDependency {
  id: string;
  name: string;
  paths: string[];
  deps: string[];
  anchorId?: string;
  /**
   * If set, an auto-prober will hit this URL while ANY of `deps` is
   * paused. Must be a side-effect-free GET — the prober fires up to
   * one request every 3s per affected demo so the visitor sees real
   * 503s land instead of inferring failure from a static dep map.
   */
  probePath?: string;
}

const DEMOS: DemoDependency[] = [
  { id: 'idempotency',  name: 'Idempotency',     paths: ['/api/demo/idempotency/'],    deps: [],                                       anchorId: 'demo-idempotency' },
  { id: 'checkout',     name: 'Saga checkout',   paths: ['/api/demo/saga/', '/api/checkout/'], deps: ['catalog','orders','payments','rabbitmq','postgres'], anchorId: 'demo-checkout' },
  { id: 'ratelimit',    name: 'Rate limit',      paths: ['/api/demo/ratelimit/'],      deps: [],                                       anchorId: 'demo-ratelimit' },
  // Vault, cache, and events have safe read-only endpoints we can
  // probe automatically while chaos is active — fires the actual
  // backend round-trip so the visitor sees real failures land.
  { id: 'vault',        name: 'Vault rotation',  paths: ['/api/demo/vault/'],          deps: ['vault','identity'],                     anchorId: 'demo-vault',       probePath: '/api/demo/vault/status' },
  { id: 'stampede',     name: 'Cache stampede',  paths: ['/api/demo/cache/stampede'],  deps: ['catalog','redis'],                      anchorId: 'demo-stampede' },
  // id matches DemoHubLite's switch case ('cache') so the dispatch
  // event below selects the right demo card.
  { id: 'cache',        name: 'Cache invalidation', paths: ['/api/demo/cache/product/', '/api/demo/cache/seed-demo-product'], deps: ['catalog','redis'], anchorId: 'demo-cache', probePath: '/api/demo/cache/product/demo' },
  { id: 'concurrency',  name: 'Concurrency',     paths: ['/api/demo/inventory/'],      deps: ['catalog','postgres'],                   anchorId: 'demo-concurrency' },
  { id: 'circuit',      name: 'Circuit breaker', paths: ['/api/demo/circuit/'],        deps: ['catalog'],                              anchorId: 'demo-circuit' },
  { id: 'events',       name: 'Event flow',      paths: ['/api/demo/events/'],         deps: ['payments','rabbitmq','postgres'],       anchorId: 'demo-events',      probePath: '/api/demo/events/relay-status' },
  { id: 'tracing',      name: 'Tracing',         paths: ['/api/demo/tracing/'],        deps: ['catalog','orders','payments'],          anchorId: 'demo-tracing' },
];

const DEMO_LOOKUP: Record<string, DemoDependency> = Object.fromEntries(
  DEMOS.map((d) => [d.id, d]),
);

function demoFromPath(path: string): string | null {
  const p = path.toLowerCase();
  for (const demo of DEMOS) {
    if (demo.paths.some((prefix) => p.startsWith(prefix))) return demo.id;
  }
  return null;
}

const COUNT_WINDOW_MS = 60_000;
const RECOVERY_DISPLAY_MS = 8_000;
const PROBE_INTERVAL_MS = 3_000;

function infraTargetForPath(serviceNodeId: string, path: string): string | null {
  const p = path.toLowerCase();
  if (p.includes('/cache/')) return 'redis';
  if (p.includes('/saga/') || p.includes('/events/') || p.includes('/checkout')) return 'rabbitmq';
  if (p.includes('/vault/')) return 'vault';
  // Default: that service's primary DB if we have one mapped.
  const candidate = `pg-${serviceNodeId}`;
  if (NODES[candidate]) return candidate;
  return null;
}

interface Packet {
  id: number;
  from: string;
  to: string;
  // colour token: success | accent | warning | error
  tone: 'success' | 'accent' | 'warning' | 'error';
}

const PACKET_DURATION_MS = 650;

interface ServiceHealth {
  id: string;
  name: string;
  status: 'online' | 'degraded' | 'offline';
  latencyMs: number;
}

interface HealthSnapshot {
  services: ServiceHealth[];
  systemStatus: string;
}

function healthColor(status: string | undefined) {
  switch (status) {
    case 'online':
      return 'rgb(34 197 94)'; // success
    case 'degraded':
      return 'rgb(234 179 8)'; // warning
    case 'offline':
      return 'rgb(239 68 68)'; // error
    default:
      return 'rgb(255 255 255 / 0.25)';
  }
}

export const LiveTopologyMap: React.FC = () => {
  const [packets, setPackets] = useState<Packet[]>([]);
  const [replicas, setReplicas] = useState<Record<string, Set<string>>>({});
  const [eventsPerSec, setEventsPerSec] = useState(0);
  const [snapshot, setSnapshot] = useState<HealthSnapshot | null>(null);
  const [chaos, setChaos] = useState<Record<string, ChaosTargetState>>({});
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const [recoveryRecords, setRecoveryRecords] = useState<
    Record<string, { ms: number; until: number }>
  >({});
  const packetIdRef = useRef(0);
  const eventTimestampsRef = useRef<number[]>([]);
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  // Per-demo windowed event log: each entry is { ts, ok }. Pruned to
  // COUNT_WINDOW_MS on read so the ribbon shows trailing-window stats.
  const demoEventsRef = useRef<Record<string, Array<{ ts: number; ok: boolean }>>>({});
  // Demos awaiting their first success after a chaos clear. Resume timestamp
  // by demo id; cleared when the recovery is recorded.
  const recoveryWatchRef = useRef<Record<string, number>>({});
  // Previous chaos snapshot so we can detect paused → running transitions.
  const prevChaosRef = useRef<Record<string, ChaosTargetState>>({});
  // Per-demo timestamp of the most recent chaos session start (when the
  // demo first gained a paused dependency). Used to determine whether a
  // failure "counts" as evidence for the verified-broken state.
  const chaosSessionStartRef = useRef<Record<string, number>>({});

  // 1Hz tick so the paused countdown updates without other state changes.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Fetch initial chaos state so the map shows already-paused nodes after
  // a hard refresh. After this, SignalR pushes keep us in sync.
  useEffect(() => {
    let cancelled = false;
    fetch(`${CONSOLE_HUB_URL}/api/demo/chaos/state`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) {
          setChaos(normaliseChaos(data));
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const pauseNode = async (nodeId: string) => {
    const target = NODE_TO_CHAOS_TARGET[nodeId];
    if (!target) return;
    setActiveMenu(null);
    try {
      await fetch(`${CONSOLE_HUB_URL}/api/demo/chaos/${target}/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durationSeconds: 30 }),
      });
    } catch {
      // ignore — SignalR push will reflect actual state if it landed
    }
  };

  const resumeNode = async (nodeId: string) => {
    const target = NODE_TO_CHAOS_TARGET[nodeId];
    if (!target) return;
    setActiveMenu(null);
    try {
      await fetch(`${CONSOLE_HUB_URL}/api/demo/chaos/${target}/resume`, {
        method: 'POST',
      });
    } catch {
      // ignore
    }
  };

  // Health snapshot polling — same endpoint StatusStrip uses.
  useEffect(() => {
    let cancelled = false;
    const fetchSnapshot = async () => {
      try {
        const res = await fetch(`${CONSOLE_HUB_URL}/api/health/snapshot`);
        if (!res.ok) return;
        const data = (await res.json()) as HealthSnapshot;
        if (!cancelled) setSnapshot(data);
      } catch {
        // ignore — degraded UI fallback handled by status colour default.
      }
    };
    fetchSnapshot();
    const id = setInterval(fetchSnapshot, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Detect chaos transitions: when a previously-paused target flips back
  // to running, every demo that depends on it enters a recovery watch.
  // Conversely, when something newly pauses, the auto-prober kicks in.
  useEffect(() => {
    const prev = prevChaosRef.current;
    const justResumed = Object.keys(chaos).filter(
      (k) => prev[k]?.status === 'paused' && chaos[k].status === 'running',
    );
    const justPaused = Object.keys(chaos).filter(
      (k) => prev[k]?.status !== 'paused' && chaos[k].status === 'paused',
    );

    const now = performance.now();
    if (justResumed.length > 0) {
      DEMOS.forEach((demo) => {
        if (demo.deps.some((d) => justResumed.includes(d))) {
          if (recoveryWatchRef.current[demo.id] === undefined) {
            recoveryWatchRef.current[demo.id] = now;
          }
        }
      });
    }
    if (justPaused.length > 0) {
      // Mark a fresh chaos session for any newly-affected demo. The ribbon
      // uses these timestamps to distinguish "claimed broken" (dep paused,
      // zero events since this session began) from "verified broken"
      // (≥1 actual failure recorded after this timestamp).
      DEMOS.forEach((demo) => {
        if (demo.deps.some((d) => justPaused.includes(d))) {
          chaosSessionStartRef.current[demo.id] = now;
        }
      });
    }
    prevChaosRef.current = chaos;
  }, [chaos]);

  // Auto-prober: while ANY chaos target is paused, fire safe GET probes
  // against every demo with a probePath whose deps include that target.
  // The probes are real BFF round-trips that hit ChaosFaultInjectionHandler
  // and return real 503s — the visitor sees actual failures stream in,
  // not a hardcoded "broken" badge. Disabled when nothing is paused.
  useEffect(() => {
    const pausedTargets = new Set(
      Object.entries(chaos)
        .filter(([, s]) => s.status === 'paused')
        .map(([k]) => k),
    );
    if (pausedTargets.size === 0) return;

    const affectedProbeable = DEMOS.filter(
      (d) => d.probePath && d.deps.some((dep) => pausedTargets.has(dep)),
    );
    if (affectedProbeable.length === 0) return;

    const fire = () => {
      affectedProbeable.forEach((demo) => {
        // cache:no-store guarantees the request hits the BFF every time
        // rather than being served from any HTTP cache; auto-probes are
        // fire-and-forget so we don't await them.
        fetch(`${CONSOLE_HUB_URL}${demo.probePath!}`, {
          method: 'GET',
          cache: 'no-store',
          headers: { 'X-Demo-Session': 'auto-probe' },
        }).catch(() => undefined);
      });
    };

    fire();
    const id = window.setInterval(fire, PROBE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [chaos]);

  const handleEvent = (ev: ConsoleEvent) => {
    // 0. Per-demo windowed event log + recovery-watch resolution.
    const demoId = demoFromPath(ev.path);
    if (demoId) {
      const ok = ev.status < 400;
      const log = demoEventsRef.current[demoId] ?? [];
      const now = performance.now();
      log.push({ ts: now, ok });
      // Keep within the trailing window. Cheap because demo events arrive
      // at human speeds (a few per second at most).
      while (log.length > 0 && log[0].ts < now - COUNT_WINDOW_MS) log.shift();
      demoEventsRef.current[demoId] = log;

      // First success after a recovery watch → record elapsed.
      const watchStart = recoveryWatchRef.current[demoId];
      if (watchStart !== undefined && ok) {
        const elapsed = Math.round(now - watchStart);
        delete recoveryWatchRef.current[demoId];
        setRecoveryRecords((prev) => ({
          ...prev,
          [demoId]: { ms: elapsed, until: now + RECOVERY_DISPLAY_MS },
        }));
      }
    }

    // 1. Replica tracking. Each event tells us about the BFF that handled
    //    it and zero-or-more upstream replicas.
    setReplicas((prev) => {
      const next = { ...prev };
      const recordReplica = (service: string, instanceId: string) => {
        const key =
          service === 'bff-web' ? 'bff' : SERVICE_NAME_TO_NODE[service] ?? null;
        if (!key) return;
        const set = new Set(next[key] ?? []);
        set.add(instanceId);
        next[key] = set;
      };
      recordReplica(ev.service, ev.instanceId);
      ev.upstreams.forEach((u) => recordReplica(u.service, u.instanceId));
      return next;
    });

    // 2. Rate counter — events in the trailing 1s window.
    const now = performance.now();
    const stamps = eventTimestampsRef.current;
    stamps.push(now);
    while (stamps.length > 0 && stamps[0] < now - 1000) stamps.shift();
    setEventsPerSec(stamps.length);

    // 3. Packet animation. Browser → BFF for every event. Then for each
    //    upstream hop, BFF → service, then service → an inferred infra
    //    node so the visitor sees the full chain light up.
    const tone: Packet['tone'] =
      ev.status >= 500 ? 'error' : ev.status >= 400 ? 'warning' : 'success';
    spawnPacket('browser', 'bff', tone, 0);
    ev.upstreams.forEach((u, idx) => {
      const target = SERVICE_NAME_TO_NODE[u.service];
      if (!target) return;
      // Stagger so the visitor sees them in sequence rather than overlapping.
      spawnPacket('bff', target, tone, 200 + idx * 60);
      const infra = infraTargetForPath(target, ev.path);
      if (infra) {
        spawnPacket(target, infra, 'accent', 200 + idx * 60 + 380);
      }
    });
  };

  const spawnPacket = (
    from: string,
    to: string,
    tone: Packet['tone'],
    delayMs: number,
  ) => {
    window.setTimeout(() => {
      const id = ++packetIdRef.current;
      setPackets((prev) => [...prev, { id, from, to, tone }]);
      window.setTimeout(() => {
        setPackets((prev) => prev.filter((p) => p.id !== id));
      }, PACKET_DURATION_MS + 60);
    }, delayMs);
  };

  // SignalR: subscribe to /hubs/console.
  useEffect(() => {
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(`${CONSOLE_HUB_URL}/hubs/console`)
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();
    connectionRef.current = conn;

    conn.on('OnChaosState', (raw: any) => {
      if (!raw) return;
      setChaos(normaliseChaos(raw));
    });

    conn.on('OnConsoleEvent', (raw: any) => {
      handleEvent({
        ts: raw.ts,
        service: raw.service,
        instanceId: raw.instanceId,
        method: raw.method,
        path: raw.path,
        status: raw.status,
        durationMs: raw.durationMs,
        upstreams: Array.isArray(raw.upstreams)
          ? raw.upstreams.map((u: any) => ({
              service: u.service,
              instanceId: u.instanceId,
            }))
          : [],
      });
    });

    // Backfill rapidly so the map starts populated rather than empty.
    conn.on('OnConsoleBackfill', (batch: any[]) => {
      (batch ?? []).slice(-20).forEach((raw, i) => {
        window.setTimeout(() => {
          handleEvent({
            ts: raw.ts,
            service: raw.service,
            instanceId: raw.instanceId,
            method: raw.method,
            path: raw.path,
            status: raw.status,
            durationMs: raw.durationMs,
            upstreams: Array.isArray(raw.upstreams)
              ? raw.upstreams.map((u: any) => ({
                  service: u.service,
                  instanceId: u.instanceId,
                }))
              : [],
          });
        }, i * 80);
      });
    });

    conn.start().catch(() => undefined);
    return () => {
      conn.stop().catch(() => undefined);
      connectionRef.current = null;
    };
  }, []);

  const serviceById = useMemo(() => {
    const map: Record<string, ServiceHealth | undefined> = {};
    snapshot?.services.forEach((s) => {
      map[s.id] = s;
    });
    return map;
  }, [snapshot]);

  const isPaused = (nodeId: string): boolean => {
    const target = NODE_TO_CHAOS_TARGET[nodeId];
    if (!target) return false;
    return chaos[target]?.status === 'paused';
  };

  const remainingSec = (nodeId: string): number | null => {
    const target = NODE_TO_CHAOS_TARGET[nodeId];
    if (!target) return null;
    return chaos[target]?.remainingSeconds ?? null;
  };

  const nodeStatusColor = (node: NodeDef): string => {
    // Chaos override: a paused node is unconditionally red regardless of
    // what the health snapshot still reports (snapshot polls every 5s, the
    // pause is instant).
    if (isPaused(node.id)) return 'rgb(239 68 68)';
    // Health snapshot id matches our service node id roughly; map by name.
    if (node.kind !== 'service') {
      // infra colour: derived from systemStatus + the service that talks to it
      if (snapshot?.systemStatus === 'offline') return healthColor('offline');
      // Map specific infra ids to snapshot ids
      if (node.id === 'rabbitmq') return healthColor(serviceById['mq']?.status);
      // pg / redis / vault aren't in snapshot today — neutral colour.
      return 'rgba(255,255,255,0.35)';
    }
    const lookup: Record<string, string> = {
      bff: 'api',
      catalog: 'catalog',
      orders: 'orders',
      payments: 'payments',
      checkout: 'checkout',
      identity: 'identity',
    };
    const id = lookup[node.id];
    return healthColor(id ? serviceById[id]?.status : undefined);
  };

  return (
    <div
      className="relative w-full glass border border-white/10 rounded-2xl bg-black/40 overflow-hidden"
      onClick={() => setActiveMenu(null)}
    >
      <div className="absolute top-3 left-4 right-4 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.2em] text-muted z-10">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
          <span>live cluster · {eventsPerSec} req/s</span>
        </div>
        <div>
          {snapshot
            ? `system ${snapshot.systemStatus}`
            : 'connecting…'}
        </div>
      </div>

      <svg
        viewBox="0 0 1000 540"
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Live cluster topology"
      >
        <defs>
          <radialGradient id="node-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(124,92,255,0.4)" />
            <stop offset="100%" stopColor="rgba(124,92,255,0)" />
          </radialGradient>
        </defs>

        {/* Static edges — drawn first, faded. */}
        <g stroke="rgba(255,255,255,0.08)" strokeWidth={1} fill="none">
          {STATIC_EDGES.map(([a, b]) => (
            <line
              key={`${a}-${b}`}
              x1={NODES[a].x}
              y1={NODES[a].y}
              x2={NODES[b].x}
              y2={NODES[b].y}
            />
          ))}
        </g>

        {/* Live packets — keyframed via SMIL animateMotion. Fallback to a
            CSS keyframe path on browsers without SMIL would be more code;
            SMIL works in every modern browser today. */}
        <g>
          {packets.map((p) => {
            const from = NODES[p.from];
            const to = NODES[p.to];
            const colour =
              p.tone === 'error'
                ? 'rgb(239 68 68)'
                : p.tone === 'warning'
                  ? 'rgb(234 179 8)'
                  : p.tone === 'accent'
                    ? 'rgb(124 92 255)'
                    : 'rgb(34 197 94)';
            return (
              <g key={p.id}>
                <circle r={4} fill={colour} opacity={0.9}>
                  <animateMotion
                    dur={`${PACKET_DURATION_MS}ms`}
                    fill="freeze"
                    path={`M ${from.x} ${from.y} L ${to.x} ${to.y}`}
                    keyPoints="0;1"
                    keyTimes="0;1"
                    calcMode="linear"
                  />
                </circle>
              </g>
            );
          })}
        </g>

        {/* Nodes */}
        <g>
          {Object.values(NODES).map((node) => {
            const colour = nodeStatusColor(node);
            const isService = node.kind === 'service';
            const replicaSet = replicas[node.id];
            const replicaCount = replicaSet?.size ?? 0;
            const paused = isPaused(node.id);
            const targetable = NODE_TO_CHAOS_TARGET[node.id] !== undefined;
            const remaining = remainingSec(node.id);
            return (
              <g
                key={node.id}
                style={{ cursor: targetable ? 'pointer' : 'default' }}
                onClick={(e) => {
                  if (!targetable) return;
                  e.stopPropagation();
                  setActiveMenu((cur) => (cur === node.id ? null : node.id));
                }}
              >
                <rect
                  x={node.x - (isService ? 60 : 40)}
                  y={node.y - 18}
                  width={isService ? 120 : 80}
                  height={36}
                  rx={6}
                  ry={6}
                  fill={paused ? 'rgba(60,10,10,0.85)' : 'rgba(11,11,14,0.9)'}
                  stroke={colour}
                  strokeOpacity={paused ? 1 : 0.7}
                  strokeWidth={paused ? 2 : 1.5}
                />
                {paused && (
                  <rect
                    x={node.x - (isService ? 60 : 40)}
                    y={node.y - 18}
                    width={isService ? 120 : 80}
                    height={36}
                    rx={6}
                    ry={6}
                    fill="none"
                    stroke="rgb(239 68 68)"
                    strokeWidth={1}
                    opacity={0.5}
                  >
                    <animate
                      attributeName="opacity"
                      values="0.2;0.7;0.2"
                      dur="1.2s"
                      repeatCount="indefinite"
                    />
                  </rect>
                )}
                <text
                  x={node.x}
                  y={node.y + 4}
                  textAnchor="middle"
                  className="font-mono"
                  fill={paused ? 'rgb(254 202 202)' : 'rgb(245 245 240)'}
                  fontSize={11}
                >
                  {node.label}
                </text>
                {paused && remaining !== null && (
                  <text
                    x={node.x}
                    y={node.y - 22}
                    textAnchor="middle"
                    fontSize={9}
                    fill="rgb(239 68 68)"
                    className="font-mono"
                    style={{ fontWeight: 700, letterSpacing: '0.1em' }}
                  >
                    PAUSED · {remaining}s
                  </text>
                )}

                {/* Click-to-chaos menu rendered above the node. SVG can't
                    contain HTML directly, so use foreignObject. */}
                {activeMenu === node.id && (
                  <foreignObject
                    x={node.x - 80}
                    y={node.y - 78}
                    width={160}
                    height={56}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div
                      className="glass border border-white/15 rounded-md text-[10px] font-mono shadow-lg"
                      style={{ background: 'rgba(11,11,14,0.95)' }}
                    >
                      {paused ? (
                        <button
                          className="w-full px-3 py-2 text-success hover:bg-white/5 text-center font-bold uppercase tracking-widest"
                          onClick={(e) => {
                            e.stopPropagation();
                            void resumeNode(node.id);
                          }}
                        >
                          ▶ Resume now
                        </button>
                      ) : (
                        <button
                          className="w-full px-3 py-2 text-error hover:bg-white/5 text-center font-bold uppercase tracking-widest"
                          onClick={(e) => {
                            e.stopPropagation();
                            void pauseNode(node.id);
                          }}
                        >
                          ⏸ Pause 30s
                        </button>
                      )}
                      <div className="px-3 py-1 text-muted/70 text-center border-t border-white/10 text-[9px]">
                        chaos · dev only
                      </div>
                    </div>
                  </foreignObject>
                )}

                {/* Replica badges below service nodes — one dot per observed
                    instance id. Up to 4 visible; 5+ collapses to "+N". */}
                {isService && replicaCount > 0 && (
                  <g>
                    {Array.from(replicaSet ?? []).slice(0, 4).map((rid, i) => (
                      <circle
                        key={rid}
                        cx={node.x - ((Math.min(replicaCount, 4) - 1) * 6) + i * 12}
                        cy={node.y + 28}
                        r={3}
                        fill={colour}
                      >
                        <title>{`${node.label} replica ${rid}`}</title>
                      </circle>
                    ))}
                    {replicaCount > 4 && (
                      <text
                        x={node.x + 30}
                        y={node.y + 31}
                        textAnchor="start"
                        fontSize={9}
                        fill="rgba(245,245,240,0.5)"
                        className="font-mono"
                      >
                        +{replicaCount - 4}
                      </text>
                    )}
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Impact ribbon — visible cause-and-effect for chaos actions.
          Each card shows what depends on what's currently paused, the
          live success/fail count from the trailing 60s window, and a
          recovery time after resume. Without this, "pause catalog" is
          a button-press without a visible consequence. */}
      <ImpactRibbon
        chaos={chaos}
        events={demoEventsRef.current}
        recoveryRecords={recoveryRecords}
        chaosSessionStarts={chaosSessionStartRef.current}
      />

      <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 text-[10px] font-mono uppercase tracking-widest text-muted/70">
        <span>click any node to pause it · auto-resume after 30s</span>
        <span>{Object.values(replicas).reduce((s, set) => s + set.size, 0)} replicas seen</span>
      </div>
    </div>
  );
};

interface ImpactRibbonProps {
  chaos: Record<string, ChaosTargetState>;
  events: Record<string, Array<{ ts: number; ok: boolean }>>;
  recoveryRecords: Record<string, { ms: number; until: number }>;
  /**
   * Per-demo timestamp of the most recent chaos session start. A failure
   * counted within `events` only proves "verified broken" if its `ts` is
   * after the session start — otherwise it's stale residue from before
   * this pause and the card stays in "claimed broken" (theoretical) state.
   */
  chaosSessionStarts: Record<string, number>;
}

const ImpactRibbon: React.FC<ImpactRibbonProps> = ({
  chaos,
  events,
  recoveryRecords,
  chaosSessionStarts,
}) => {
  const now = performance.now();
  const pausedTargets = new Set(
    Object.entries(chaos)
      .filter(([, s]) => s.status === 'paused')
      .map(([k]) => k),
  );

  const cards = DEMOS.map((demo) => {
    // Prune as we read so the displayed counts match the trailing window
    // even if no fresh events have arrived for a while.
    const log = (events[demo.id] ?? []).filter(
      (e) => e.ts >= now - COUNT_WINDOW_MS,
    );
    const success = log.filter((e) => e.ok).length;
    const failed = log.length - success;
    const blockingDeps = demo.deps.filter((d) => pausedTargets.has(d));
    const claimedBroken = blockingDeps.length > 0;
    // "verified" = at least one real failed event observed after the
    // current chaos session began. Without this, the broken status is
    // a theoretical claim from the dep map. With it, we have evidence.
    const sessionStart = chaosSessionStarts[demo.id] ?? 0;
    const verifiedFailures = log.filter((e) => !e.ok && e.ts >= sessionStart).length;
    const verified = verifiedFailures > 0;
    const recovery = recoveryRecords[demo.id];
    const recovering = recovery && recovery.until > now;

    // Honest evidence: the card only flips to "broken" once a real
    // failed event has been observed since this chaos session started.
    // Until then, the dot stays "probing" — connection is live, no
    // failures yet (could be a slow probe, could be a target that
    // hasn't been hit yet). Theory-only red is gone.
    let status: 'broken' | 'probing' | 'recovering' | 'healthy';
    if (claimedBroken && verified) status = 'broken';
    else if (claimedBroken) status = 'probing';
    else if (recovering) status = 'recovering';
    else status = 'healthy';

    return {
      demo,
      status,
      success,
      failed,
      blockingDeps,
      recovery,
      verifiedFailures,
    };
  });

  const brokenCount = cards.filter((c) => c.status === 'broken').length;
  const probingCount = cards.filter((c) => c.status === 'probing').length;

  return (
    <div className="px-4 py-3 border-t border-white/10 font-mono">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted/70">
          impact · per-demo · auto-probing while paused
        </span>
        <span
          className={`text-[10px] uppercase tracking-[0.2em] ${
            brokenCount > 0
              ? 'text-error'
              : probingCount > 0
                ? 'text-muted'
                : 'text-muted/70'
          }`}
        >
          {brokenCount > 0
            ? `${brokenCount} demo${brokenCount === 1 ? '' : 's'} verified broken`
            : probingCount > 0
              ? `probing ${probingCount}…`
              : 'all demos healthy'}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
        {cards.map(({ demo, status, success, failed, blockingDeps, recovery, verifiedFailures }) => {
          const ringColor =
            status === 'broken'
              ? 'border-error/50 bg-error/[0.08]'
              : status === 'recovering'
                ? 'border-success/40 bg-success/[0.04]'
                : failed > 0
                  ? 'border-warning/20 bg-white/[0.02]'
                  : 'border-white/5';
          const dotColor =
            status === 'broken'
              ? 'bg-error'
              : status === 'probing'
                // Steady amber pulse — connection is live, no evidence
                // of failure yet (could be a slow probe, could mean the
                // chaos wasn't disruptive after all).
                ? 'bg-warning animate-pulse'
                : 'bg-success';
          const onClick = () => {
            // Tell DemoHubLite to select this demo, then scroll the
            // demo section into view. DemoHubLite listens for the
            // `select-demo` custom event (handler added in this PR).
            window.dispatchEvent(
              new CustomEvent('select-demo', { detail: { demoId: demo.id } }),
            );
            document.getElementById('demo')?.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
            });
          };
          return (
            <button
              key={demo.id}
              onClick={onClick}
              className={`flex items-center gap-2 px-2 py-1.5 rounded border ${ringColor} text-left hover:bg-white/[0.04] transition-colors`}
              title={
                status === 'broken'
                  ? `Verified broken: ${verifiedFailures} real failure(s) observed since pause (${blockingDeps.join(', ')})`
                  : status === 'probing'
                    ? `Auto-probe firing against ${blockingDeps.join(', ')} dependency. No failures observed yet.`
                    : recovery
                      ? `Recovered ${recovery.ms}ms after resume`
                      : 'No dependency on currently-paused targets'
              }
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
              <span className="text-[10.5px] text-primary truncate flex-1">
                {demo.name}
              </span>
              {status === 'broken' && (
                <span className="text-[9px] text-error uppercase tracking-widest shrink-0 font-bold">
                  broken
                </span>
              )}
              {status === 'probing' && (
                <span className="text-[9px] text-warning/80 uppercase tracking-widest shrink-0">
                  probing
                </span>
              )}
              {status === 'recovering' && recovery && (
                <span className="text-[9px] text-success uppercase tracking-widest shrink-0 font-bold">
                  recovered {recovery.ms}ms
                </span>
              )}
              <span
                className={`text-[10px] tabular-nums shrink-0 ${
                  failed > 0 ? 'text-error/90' : 'text-muted'
                }`}
              >
                {success}
                <span className="text-muted/40">/</span>
                {failed}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

function normaliseChaos(raw: any): Record<string, ChaosTargetState> {
  // Server returns Dictionary<string, ChaosState>. SignalR's JSON contract
  // serialises record properties as camelCase; the dictionary keys remain
  // as the target ids.
  const out: Record<string, ChaosTargetState> = {};
  if (raw && typeof raw === 'object') {
    for (const [target, value] of Object.entries(raw)) {
      const v = value as any;
      out[target] = {
        target: v?.target ?? target,
        status: v?.status === 'paused' ? 'paused' : 'running',
        resumeAtUtc: v?.resumeAtUtc ?? null,
        remainingSeconds: typeof v?.remainingSeconds === 'number'
          ? v.remainingSeconds
          : null,
      };
    }
  }
  return out;
}
