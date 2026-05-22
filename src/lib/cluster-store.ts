import * as signalR from '@microsoft/signalr';

/**
 * Shared cluster state store.
 *
 * Module-level singleton that owns the page's view of the live
 * cluster — one SignalR connection, periodic REST polls — and
 * exposes derived state to every component that subscribes via
 * `useClusterState`.
 *
 * Why this exists: before the store, every status-displaying component
 * fetched the system independently (StatusStrip via SSE, LiveTopologyMap
 * via its own SignalR + polls, LiveConsoleDock via another SignalR,
 * HeroFingerprint via a one-shot REST). Each rendered its own truth
 * with no shared agreement. Pause payments via the topology and the
 * top-of-page StatusStrip kept showing payments as green — the page
 * contradicted itself.
 *
 * The fix is structural: a single source of truth that combines health
 * (from /api/health/snapshot) with chaos state (from /api/v1/demo/chaos/state
 * + the `OnChaosState` SignalR push). When chaos is paused on a target,
 * the corresponding service's `displayStatus` is forced to "offline"
 * regardless of what its underlying /health probe still reports.
 *
 * Astro-island compatibility: each `client:*` directive creates its own
 * React root, so React Context can't reach across islands. A
 * module-level singleton works because every island shares the same JS
 * module graph — they all see the same `clusterStore` instance.
 */

// Vite needs to see the literal `import.meta.env.PUBLIC_API_URL` access
// pattern to statically inline the value at build time. The earlier
// `(import.meta as any).env?.PUBLIC_API_URL` form with the `as any` cast
// + optional chaining defeated the static replacement and the deployed
// bundle ended up calling localhost:5050 — see the production console
// errors that surfaced after the single-page collapse.
const API_URL = (
  import.meta.env.PUBLIC_API_URL ?? ''
).replace(/\/$/, '');

export interface UpstreamHop {
  service: string;
  instanceId: string;
}

export interface ConsoleEvent {
  ts: string;
  service: string;
  instanceId: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  traceId?: string | null;
  correlationId?: string | null;
  upstreams: UpstreamHop[];
}

export interface ConsoleHello {
  service: string;
  instanceId: string;
  gitSha: string;
  processStartedAt: string;
}

export interface ChaosTargetState {
  target: string;
  status: 'running' | 'paused';
  resumeAtUtc: string | null;
  remainingSeconds: number | null;
}

export interface ServiceHealth {
  id: string;
  name: string;
  status: 'online' | 'degraded' | 'offline';
  latencyMs: number;
  message: string | null;
}

export interface HealthSnapshot {
  services: ServiceHealth[];
  systemStatus: string;
  p99LatencyMs: number;
  availability: number | null;
  timestamp: string;
}

export interface DerivedService extends ServiceHealth {
  /** True iff this service has been paused via the topology chaos panel. */
  chaosPaused: boolean;
  /** Health status combined with chaos override. */
  displayStatus: ServiceHealth['status'];
}

export type ConnectionState = 'connecting' | 'connected' | 'disconnected';

/**
 * The three rotating canonical journeys the BFF's JourneyScheduler fires
 * on a ~20s loop. Each one exercises distinct cluster patterns and the
 * frontend canvas choreographs its topology animation around them.
 */
export type JourneyKind = 'place-order-saga' | 'idempotent-retry' | 'occ-race';

export interface JourneySession {
  journey: JourneyKind;
  sessionId: string;
  startedAt: string;
  endedAt?: string;
  ok?: boolean;
}

export interface ClusterState {
  events: ConsoleEvent[];
  identity: ConsoleHello | null;
  chaos: Record<string, ChaosTargetState>;
  health: HealthSnapshot | null;
  services: DerivedService[];
  /** Aggregate status: degraded whenever any chaos target is paused. */
  systemStatus: string;
  connectionState: ConnectionState;
  /** Active journey if one is currently running, null otherwise. */
  currentJourney: JourneySession | null;
  /** Last 5 completed journeys, newest first. */
  recentJourneys: JourneySession[];
}

/**
 * Maps a service id from the /api/health/snapshot payload to the chaos
 * target id used by /api/v1/demo/chaos/{target}/pause. The two name spaces
 * mostly align but not always: the snapshot uses `mq` for RabbitMQ where
 * the chaos manager uses `rabbitmq`. Postgres/Redis/Vault aren't in the
 * snapshot at all (they're inferred via service health, not directly
 * health-checked) — pausing them doesn't override any specific service
 * row, but it does flip the global systemStatus to degraded.
 */
const SNAPSHOT_TO_CHAOS: Record<string, string> = {
  identity: 'identity',
  catalog: 'catalog',
  orders: 'orders',
  payments: 'payments',
  checkout: 'checkout',
  mq: 'rabbitmq',
};

const HEALTH_POLL_MS = 5_000;
const CHAOS_POLL_MS = 10_000;
const MAX_EVENTS = 200;

const MAX_RECENT_JOURNEYS = 5;

const SSR_SNAPSHOT: ClusterState = {
  events: [],
  identity: null,
  chaos: {},
  health: null,
  services: [],
  systemStatus: 'unknown',
  connectionState: 'connecting',
  currentJourney: null,
  recentJourneys: [],
};

class ClusterStore {
  private state: ClusterState = SSR_SNAPSHOT;
  private listeners = new Set<() => void>();
  private connection: signalR.HubConnection | null = null;
  private healthInterval: number | null = null;
  private chaosInterval: number | null = null;
  private initialized = false;

  /** Bound for useSyncExternalStore. */
  subscribe = (fn: () => void): (() => void) => {
    this.ensureInit();
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  /** Bound for useSyncExternalStore. */
  getSnapshot = (): ClusterState => this.state;

  /** Stable empty snapshot for SSR — same reference every call. */
  getServerSnapshot = (): ClusterState => SSR_SNAPSHOT;

  /**
   * Lazy-init on first subscriber. Safe to call repeatedly; only
   * the first call wires up SignalR + polling.
   */
  private ensureInit() {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    const conn = new signalR.HubConnectionBuilder()
      .withUrl(`${API_URL}/hubs/console`)
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();
    this.connection = conn;

    conn.on('OnConsoleHello', (raw: any) => {
      if (!raw) return;
      this.update({
        identity: {
          service: raw.service,
          instanceId: raw.instanceId,
          gitSha: raw.gitSha,
          processStartedAt: raw.processStartedAt,
        },
      });
    });

    conn.on('OnConsoleEvent', (raw: any) => {
      const ev = this.normaliseEvent(raw);
      this.update({
        events: [ev, ...this.state.events].slice(0, MAX_EVENTS),
      });
    });

    conn.on('OnConsoleBackfill', (batch: any[]) => {
      const evs = (batch ?? []).map(this.normaliseEvent).reverse();
      this.update({
        events: [...evs, ...this.state.events].slice(0, MAX_EVENTS),
      });
    });

    conn.on('OnChaosState', (raw: any) => {
      const next = this.normaliseChaos(raw);
      this.update({ chaos: next });
      this.recomputeDerivedServices();
    });

    conn.on('OnJourneyStart', (raw: any) => {
      const j = this.normaliseJourney(raw);
      if (!j) return;
      this.update({ currentJourney: j });
    });

    conn.on('OnJourneyEnd', (raw: any) => {
      const j = this.normaliseJourney(raw);
      if (!j) return;
      const next = [j, ...this.state.recentJourneys].slice(0, MAX_RECENT_JOURNEYS);
      this.update({
        currentJourney:
          this.state.currentJourney?.sessionId === j.sessionId
            ? null
            : this.state.currentJourney,
        recentJourneys: next,
      });
    });

    conn.onreconnecting(() => this.update({ connectionState: 'connecting' }));
    conn.onreconnected(() => this.update({ connectionState: 'connected' }));
    conn.onclose(() => this.update({ connectionState: 'disconnected' }));

    conn
      .start()
      .then(() => this.update({ connectionState: 'connected' }))
      .catch(() => this.update({ connectionState: 'disconnected' }));

    // Initial REST fetches + polling
    void this.refreshChaos();
    void this.refreshHealth();
    this.healthInterval = window.setInterval(() => void this.refreshHealth(), HEALTH_POLL_MS);
    this.chaosInterval = window.setInterval(() => void this.refreshChaos(), CHAOS_POLL_MS);
  }

  private normaliseEvent = (raw: any): ConsoleEvent => ({
    ts: raw.ts,
    service: raw.service,
    instanceId: raw.instanceId,
    method: raw.method,
    path: raw.path,
    status: raw.status,
    durationMs: raw.durationMs,
    traceId: raw.traceId ?? null,
    correlationId: raw.correlationId ?? null,
    upstreams: Array.isArray(raw.upstreams)
      ? raw.upstreams.map((u: any) => ({
          service: u.service,
          instanceId: u.instanceId,
        }))
      : [],
  });

  private normaliseJourney = (raw: any): JourneySession | null => {
    if (!raw || typeof raw !== 'object') return null;
    const journey = raw.journey;
    const sessionId = raw.sessionId;
    if (
      journey !== 'place-order-saga' &&
      journey !== 'idempotent-retry' &&
      journey !== 'occ-race'
    ) {
      return null;
    }
    if (typeof sessionId !== 'string' || sessionId.length === 0) return null;
    return {
      journey,
      sessionId,
      startedAt: typeof raw.startedAt === 'string' ? raw.startedAt : new Date().toISOString(),
      endedAt: typeof raw.endedAt === 'string' ? raw.endedAt : undefined,
      ok: typeof raw.ok === 'boolean' ? raw.ok : undefined,
    };
  };

  private normaliseChaos = (raw: any): Record<string, ChaosTargetState> => {
    const out: Record<string, ChaosTargetState> = {};
    if (raw && typeof raw === 'object') {
      for (const [target, value] of Object.entries(raw)) {
        const v = value as Record<string, unknown>;
        out[target] = {
          target: (typeof v?.target === 'string' ? v.target : target),
          status: v?.status === 'paused' ? 'paused' : 'running',
          resumeAtUtc: typeof v?.resumeAtUtc === 'string' ? v.resumeAtUtc : null,
          remainingSeconds:
            typeof v?.remainingSeconds === 'number' ? v.remainingSeconds : null,
        };
      }
    }
    return out;
  };

  private async refreshHealth() {
    try {
      const r = await fetch(`${API_URL}/api/health/snapshot`, {
        cache: 'no-store',
      });
      if (!r.ok) return;
      const data = (await r.json()) as HealthSnapshot;
      this.update({ health: data });
      this.recomputeDerivedServices();
    } catch {
      // ignore — backend may be temporarily unreachable
    }
  }

  private async refreshChaos() {
    try {
      const r = await fetch(`${API_URL}/api/v1/demo/chaos/state`, {
        cache: 'no-store',
      });
      if (!r.ok) return;
      const data = await r.json();
      this.update({ chaos: this.normaliseChaos(data) });
      this.recomputeDerivedServices();
    } catch {
      // ignore — chaos endpoint is dev-only and may 403 in prod
    }
  }

  /**
   * Combines the latest health snapshot with chaos state to produce
   * the canonical "what is this service actually doing" view used by
   * the StatusStrip, topology footer, and any other indicator. A paused
   * target overrides its service's status to "offline" regardless of
   * what the service's own /health probe still reports — service-chaos
   * is BFF-side fault injection, the underlying process stays up so the
   * raw probe lies.
   */
  private recomputeDerivedServices() {
    const services: DerivedService[] = (this.state.health?.services ?? []).map(
      (s) => {
        const chaosId = SNAPSHOT_TO_CHAOS[s.id];
        const chaosPaused = chaosId
          ? this.state.chaos[chaosId]?.status === 'paused'
          : false;
        return {
          ...s,
          chaosPaused,
          displayStatus: chaosPaused ? 'offline' : s.status,
        };
      },
    );

    const anyChaosPaused = Object.values(this.state.chaos).some(
      (c) => c.status === 'paused',
    );
    let systemStatus = this.state.health?.systemStatus ?? 'unknown';
    if (anyChaosPaused) systemStatus = 'degraded';

    this.update({ services, systemStatus });
  }

  private update(partial: Partial<ClusterState>) {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((fn) => fn());
  }
}

export const clusterStore = new ClusterStore();
