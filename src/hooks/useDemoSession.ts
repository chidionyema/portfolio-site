import { useState, useEffect, useCallback } from 'react';
import { signalRClient } from '../lib/api/signalr';

const API_URL = import.meta.env.PUBLIC_API_URL || 'https://api.chidionyema.dev';

export interface DemoSessionState {
  sessionId: string;
  isConnected: boolean;
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
      try {
        const connection = signalRClient.getConnection();
        
        connection.on('OnSagaStep', (e) => mounted && setEvents(prev => [e, ...prev.slice(0, 20)]));
        connection.on('OnVaultRotation', (e) => mounted && setEvents(prev => [e, ...prev.slice(0, 20)]));
        connection.on('OnCacheEvent', (e) => mounted && setEvents(prev => [e, ...prev.slice(0, 20)]));
        connection.on('OnCircuitBreakerState', (e) => mounted && setEvents(prev => [e, ...prev.slice(0, 20)]));
        connection.on('OnEventFlow', (e) => mounted && setEvents(prev => [e, ...prev.slice(0, 20)]));
        connection.on('OnRateLimit', (e) => mounted && setEvents(prev => [e, ...prev.slice(0, 20)]));
        connection.on('OnConcurrency', (e) => mounted && setEvents(prev => [e, ...prev.slice(0, 20)]));

        await signalRClient.subscribe(sid!);
        
        if (mounted) setState(prev => ({ ...prev, isConnected: true }));
      } catch (err) {
        if (mounted) setState(prev => ({ ...prev, error: 'Failed to connect to cluster stream' }));
      }
    };

    connect();

    return () => {
      mounted = false;
    };
  }, [moduleName]);

  const executeCommand = useCallback(async (endpoint: string, payload: any = {}) => {
    try {
      const response = await fetch(`${API_URL}/api/demo${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Demo-Session': state.sessionId
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Cluster Error: ${response.status}`);
      }

      const data = await response.json();
      const traceId = response.headers.get('X-Trace-Id');
      
      return { ...data, traceId };
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
