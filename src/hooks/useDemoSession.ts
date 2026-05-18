import { useState, useEffect, useCallback } from 'react';
import { signalRClient } from '../lib/api/signalr';
import { traceStore } from '../lib/trace-store';

// Local-dev fallback. PUBLIC_API_URL is the source of truth (.env.local).
// The fallback used to point at production, which silently broke localhost
// dev whenever Astro failed to inject the env var into a client bundle.
const API_URL = import.meta.env.PUBLIC_API_URL ?? '';

export interface InstanceMetadata {
  bff?: { instance: string; region: string };
  upstreams?: Array<{ service: string; instance?: string | null }>;
  timestamp?: string;
}

export interface DemoSessionState {
  sessionId: string;
  isConnected: boolean;
  lastSuccessAt: number | null;
  error: string | null;
  chaos: ChaosState;
  metadata: InstanceMetadata | null;
}

export interface ChaosState {
  latencyMs: number;
  brokerDown: boolean;
  serviceFaulty: boolean;
}

export function useDemoSession(moduleName?: string) {
  const [state, setState] = useState<DemoSessionState>({
    sessionId: '',
    isConnected: false,
    lastSuccessAt: typeof window !== 'undefined' ? Date.now() : null,
    error: null,
    chaos: { latencyMs: 0, brokerDown: false, serviceFaulty: false },
    metadata: null,
  });

  const [events, setEvents] = useState<any[]>([]);

  // Persistent Session ID
  useEffect(() => {
    let sid = localStorage.getItem('ha_demo_session_id');
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem('ha_demo_session_id', sid);
    }
    setState(prev => ({ ...prev, sessionId: sid! }));

    let mounted = true;
    const EVENT_NAMES = ['OnSagaStep', 'OnVaultRotation', 'OnCacheEvent', 'OnCircuitBreakerState', 'OnEventFlow', 'OnRateLimit', 'OnConcurrency'] as const;
    const handler = (e: any) => mounted && setEvents(prev => [e, ...prev.slice(0, 20)]);
    let connection: ReturnType<typeof signalRClient.getConnection> | null = null;

    const connect = async () => {
      const tag = `[demo-session ${moduleName ?? 'shared'}]`;
      try {
        connection = signalRClient.getConnection();
        EVENT_NAMES.forEach(name => connection!.on(name, handler));

        await signalRClient.subscribe(sid!);

        if (mounted) setState(prev => ({ ...prev, isConnected: true }));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`${tag} connect failed:`, message, err);
        if (mounted) setState(prev => ({ ...prev, error: `SignalR: ${message}` }));
      }
    };

    connect();

    return () => {
      mounted = false;
      if (connection) {
        EVENT_NAMES.forEach(name => connection!.off(name, handler));
      }
    };
  }, [moduleName]);

  const executeCommand = useCallback(async (endpoint: string, payload: any = {}, options: { method?: string, headers?: Record<string, string> } = {}) => {
    const start = performance.now();
    const method = options.method || 'POST';
    try {
      const fetchOptions: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Demo-Session': state.sessionId,
          ...options.headers
        },
      };

      if (method !== 'GET' && method !== 'HEAD') {
        fetchOptions.body = JSON.stringify(payload);
      }

      const response = await fetch(`${API_URL}/api/demo${endpoint}`, fetchOptions);

      const latencyMs = Math.round(performance.now() - start);
      const statusCode = response.status;
      const service = response.headers.get('X-Service-Id') || inferService(endpoint);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Cluster Error: ${response.status}`);
      }

      const data = await response.json();
      const traceId = response.headers.get('X-Trace-Id');
      if (traceId) traceStore.set(traceId);

      if (data._metadata) {
        setState(prev => ({ ...prev, lastSuccessAt: Date.now(), metadata: data._metadata }));
      } else {
        setState(prev => ({ ...prev, lastSuccessAt: Date.now() }));
      }

      return { ...data, traceId, latencyMs, statusCode, service };
    } catch (err: any) {
      console.error('Command Execution Failed:', err);
      throw err;
    }
  }, [state.sessionId]);

  const updateChaos = (chaos: ChaosState) => {
    setState(prev => ({ ...prev, chaos }));
  };

  return {
    ...state,
    events,
    executeCommand,
    updateChaos,
    clearEvents: () => setEvents([]),
  };
}

function inferService(path: string): string {
  if (path.includes('circuit')) return 'catalog-svc-demo';
  if (path.includes('idempotency')) return 'bff-web-cache';
  if (path.includes('ratelimit')) return 'gateway-limiter';
  if (path.includes('vault')) return 'vault-manager';
  if (path.includes('cache')) return 'inventory-cache';
  if (path.includes('inventory')) return 'inventory-db';
  if (path.includes('saga')) return 'order-orchestrator';
  if (path.includes('events')) return 'event-bus';
  return 'bff-web';
}
