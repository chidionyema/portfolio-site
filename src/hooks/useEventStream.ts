import { useState, useEffect, useCallback, useRef } from 'react';

export interface StreamEvent {
  id: string;
  type: string;
  timestamp: Date;
  correlationId?: string;
  data?: any;
  status?: string;
}

interface UseEventStreamOptions {
  url: string;
  mode?: 'sse' | 'signalr';
  maxEvents?: number;
  filterTypes?: string[];
}

interface UseEventStreamReturn {
  events: any[];
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  clearEvents: () => void;
}

/**
 * Universal event stream hook.
 * Supports SSE (Server-Sent Events) and SignalR (via future extension).
 * Currently optimized for SSE for health and metrics.
 */
export function useEventStream({
  url,
  mode = 'sse',
  maxEvents = 50,
  filterTypes,
}: UseEventStreamOptions): UseEventStreamReturn {
  const [events, setEvents] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    if (mode === 'sse') {
      setIsConnecting(true);
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
      };

      es.onerror = (e) => {
        setIsConnected(false);
        setIsConnecting(false);
        setError(new Error('SSE connection failed'));
        es.close();
      };

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (filterTypes && !filterTypes.includes(data.type)) {
            return;
          }

          setEvents((prev) => {
            const next = [data, ...prev];
            return next.slice(0, maxEvents);
          });
        } catch (err) {
          console.error('Failed to parse SSE event data', err);
        }
      };
    }
    // SignalR mode would go here if needed, but demos use useDemoSession
  }, [url, mode, maxEvents, filterTypes]);

  useEffect(() => {
    connect();
    return () => {
      eventSourceRef.current?.close();
    };
  }, [connect]);

  const clearEvents = useCallback(() => setEvents([]), []);

  return {
    events,
    isConnected,
    isConnecting,
    error,
    clearEvents,
  };
}
