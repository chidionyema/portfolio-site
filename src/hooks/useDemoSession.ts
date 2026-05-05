import { useState, useEffect, useCallback } from 'react';
import { signalRClient } from '../lib/api/signalr';
import { traceStore } from '../lib/trace-store';

// Local-dev fallback. PUBLIC_API_URL is the source of truth (.env.local).
// The fallback used to point at production, which silently broke localhost
// dev whenever Astro failed to inject the env var into a client bundle.
const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:5050';

export interface DemoSessionState {
  sessionId: string;
  isConnected: boolean;
  lastSuccessAt: number | null;
  error: string | null;
  chaos: ChaosState;
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
    chaos: { latencyMs: 0, brokerDown: false, serviceFaulty: false }
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

    const connect = async () => {
      const tag = `[demo-session ${moduleName ?? 'shared'}]`;
      try {
        console.info(`${tag} getConnection()`);
        const connection = signalRClient.getConnection();

        connection.on('OnSagaStep', (e) => mounted && setEvents(prev => [e, ...prev.slice(0, 20)]));
        connection.on('OnVaultRotation', (e) => mounted && setEvents(prev => [e, ...prev.slice(0, 20)]));
        connection.on('OnCacheEvent', (e) => mounted && setEvents(prev => [e, ...prev.slice(0, 20)]));
        connection.on('OnCircuitBreakerState', (e) => mounted && setEvents(prev => [e, ...prev.slice(0, 20)]));
        connection.on('OnEventFlow', (e) => mounted && setEvents(prev => [e, ...prev.slice(0, 20)]));
        connection.on('OnRateLimit', (e) => mounted && setEvents(prev => [e, ...prev.slice(0, 20)]));
        connection.on('OnConcurrency', (e) => mounted && setEvents(prev => [e, ...prev.slice(0, 20)]));

        console.info(`${tag} subscribing sid=${sid}`);
        await signalRClient.subscribe(sid!);
        console.info(`${tag} connected`);

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

      setState(prev => ({ ...prev, lastSuccessAt: Date.now() }));

      return { ...data, traceId, latencyMs, statusCode, service };
    } catch (err: any) {
      console.error('Command Execution Failed:', err);
      throw err;
    }
  }, [state.sessionId, state.chaos]);

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
