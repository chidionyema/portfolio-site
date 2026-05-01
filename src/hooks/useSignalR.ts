import { useEffect, useState, useCallback, useRef } from 'react';
import * as signalR from '@microsoft/signalr';

interface UseSignalROptions {
  url: string;
  autoConnect?: boolean;
  onConnected?: () => void;
  onDisconnected?: (error?: Error) => void;
  onReconnecting?: () => void;
}

interface UseSignalRReturn {
  connection: signalR.HubConnection | null;
  connectionState: signalR.HubConnectionState;
  error: Error | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  subscribe: <T>(event: string, handler: (data: T) => void) => () => void;
  invoke: <T>(method: string, ...args: unknown[]) => Promise<T>;
}

export function useSignalR({
  url,
  autoConnect = true,
  onConnected,
  onDisconnected,
  onReconnecting,
}: UseSignalROptions): UseSignalRReturn {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [connectionState, setConnectionState] = useState<signalR.HubConnectionState>(
    signalR.HubConnectionState.Disconnected
  );
  const [error, setError] = useState<Error | null>(null);
  const handlersRef = useRef<Map<string, Set<(data: unknown) => void>>>(new Map());

  // Initialize connection
  useEffect(() => {
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(url)
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          // Exponential backoff: 0, 2s, 4s, 8s, then max 30s
          const delay = Math.min(
            Math.pow(2, retryContext.previousRetryCount) * 1000,
            30000
          );
          return delay;
        },
      })
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    // Connection state handlers
    newConnection.onclose((err) => {
      setConnectionState(signalR.HubConnectionState.Disconnected);
      if (err) setError(err);
      onDisconnected?.(err);
    });

    newConnection.onreconnecting((err) => {
      setConnectionState(signalR.HubConnectionState.Reconnecting);
      if (err) setError(err);
      onReconnecting?.();
    });

    newConnection.onreconnected(() => {
      setConnectionState(signalR.HubConnectionState.Connected);
      setError(null);
      onConnected?.();
    });

    setConnection(newConnection);

    return () => {
      newConnection.stop();
    };
  }, [url]);

  // Auto-connect
  useEffect(() => {
    if (autoConnect && connection) {
      connect();
    }
  }, [connection, autoConnect]);

  const connect = useCallback(async () => {
    if (!connection) return;
    if (connection.state === signalR.HubConnectionState.Connected) return;

    try {
      setConnectionState(signalR.HubConnectionState.Connecting);
      await connection.start();
      setConnectionState(signalR.HubConnectionState.Connected);
      setError(null);
      onConnected?.();
    } catch (err) {
      setError(err as Error);
      setConnectionState(signalR.HubConnectionState.Disconnected);
    }
  }, [connection, onConnected]);

  const disconnect = useCallback(async () => {
    if (!connection) return;
    await connection.stop();
    setConnectionState(signalR.HubConnectionState.Disconnected);
  }, [connection]);

  const subscribe = useCallback(
    <T>(event: string, handler: (data: T) => void) => {
      if (!connection) return () => {};

      // Track handlers
      if (!handlersRef.current.has(event)) {
        handlersRef.current.set(event, new Set());
      }
      handlersRef.current.get(event)!.add(handler as (data: unknown) => void);

      // Register with SignalR
      connection.on(event, handler);

      // Return unsubscribe function
      return () => {
        connection.off(event, handler);
        handlersRef.current.get(event)?.delete(handler as (data: unknown) => void);
      };
    },
    [connection]
  );

  const invoke = useCallback(
    async <T>(method: string, ...args: unknown[]): Promise<T> => {
      if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
        throw new Error('Not connected to hub');
      }
      return connection.invoke<T>(method, ...args);
    },
    [connection]
  );

  return {
    connection,
    connectionState,
    error,
    connect,
    disconnect,
    subscribe,
    invoke,
  };
}
