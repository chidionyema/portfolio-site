import { useState, useEffect, useCallback } from 'react';
import { useSignalR } from './useSignalR';

export interface StreamEvent {
  id: string;
  type: string;
  timestamp: Date;
  correlationId: string;
  data: Record<string, unknown>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

interface UseEventStreamOptions {
  hubUrl: string;
  maxEvents?: number;
  filterTypes?: string[];
}

interface UseEventStreamReturn {
  events: StreamEvent[];
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  clearEvents: () => void;
}

export function useEventStream({
  hubUrl,
  maxEvents = 50,
  filterTypes,
}: UseEventStreamOptions): UseEventStreamReturn {
  const [events, setEvents] = useState<StreamEvent[]>([]);

  const { connectionState, error, subscribe } = useSignalR({
    url: hubUrl,
    autoConnect: true,
  });

  const isConnected = connectionState === 'Connected';
  const isConnecting = connectionState === 'Connecting' || connectionState === 'Reconnecting';

  // Subscribe to events
  useEffect(() => {
    const unsubscribe = subscribe<StreamEvent>('EventReceived', (event) => {
      // Filter by type if specified
      if (filterTypes && !filterTypes.includes(event.type)) {
        return;
      }

      setEvents((prev) => {
        const newEvents = [
          {
            ...event,
            timestamp: new Date(event.timestamp),
          },
          ...prev,
        ];
        // Limit to maxEvents
        return newEvents.slice(0, maxEvents);
      });
    });

    return unsubscribe;
  }, [subscribe, maxEvents, filterTypes]);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return {
    events,
    isConnected,
    isConnecting,
    error,
    clearEvents,
  };
}
