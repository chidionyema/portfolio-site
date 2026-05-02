/**
 * SignalR Connection Manager
 *
 * Manages real-time connections to the demo hub for live event streaming.
 */

import * as signalR from '@microsoft/signalr';

const SIGNALR_URL = import.meta.env.PUBLIC_SIGNALR_URL || 'http://localhost:5000/hubs/demo';

// ============================================================================
// Event Types
// ============================================================================

export interface SagaStepEvent {
  sessionId: string;
  step: string;
  service: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'compensating';
  description: string;
  progressPercent: number;
  timestamp: string;
}

export interface CircuitBreakerEvent {
  sessionId: string;
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  successCount: number;
  rejectedCount: number;
  lastError?: string;
  timestamp: string;
}

export interface CacheEvent {
  sessionId: string;
  action: 'get' | 'set' | 'hit' | 'miss' | 'invalidate' | 'refresh';
  key: string;
  isHit: boolean;
  dbHits: number;
  source?: 'L1' | 'L2' | 'database';
  timestamp: string;
}

export interface EventFlowEvent {
  sessionId: string;
  eventType: string;
  source: string;
  status: 'published' | 'persisted' | 'dispatched' | 'consumed' | 'acknowledged';
  queueDepth: number;
  payload?: Record<string, unknown>;
  timestamp: string;
}

export interface VaultRotationEvent {
  sessionId: string;
  stage: 'started' | 'activated' | 'grace_period' | 'revoked';
  version: number;
  previousVersion?: number;
  gracePeriodEnds?: string;
  timestamp: string;
}

export interface RateLimitEvent {
  sessionId: string;
  allowed: boolean;
  remaining: number;
  resetAt: string;
  retryAfter?: number;
  timestamp: string;
}

// ============================================================================
// Connection Manager
// ============================================================================

let connection: signalR.HubConnection | null = null;
let connectionPromise: Promise<signalR.HubConnection> | null = null;

/**
 * Get or create the SignalR connection
 */
export async function getConnection(): Promise<signalR.HubConnection> {
  // Return existing connected connection
  if (connection?.state === signalR.HubConnectionState.Connected) {
    return connection;
  }

  // Return pending connection attempt
  if (connectionPromise) {
    return connectionPromise;
  }

  // Create new connection
  connectionPromise = createConnection();
  return connectionPromise;
}

async function createConnection(): Promise<signalR.HubConnection> {
  connection = new signalR.HubConnectionBuilder()
    .withUrl(SIGNALR_URL, {
      // Skip negotiation for WebSocket-only connection (faster)
      skipNegotiation: false,
      transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
    })
    .withAutomaticReconnect({
      nextRetryDelayInMilliseconds: (retryContext) => {
        // Exponential backoff: 0, 2s, 5s, 10s, 30s max
        const delays = [0, 2000, 5000, 10000, 30000];
        return delays[Math.min(retryContext.previousRetryCount, delays.length - 1)];
      },
    })
    .configureLogging(signalR.LogLevel.Information)
    .build();

  // Connection lifecycle logging
  connection.onreconnecting((error) => {
    console.log('[SignalR] Reconnecting...', error?.message);
  });

  connection.onreconnected((connectionId) => {
    console.log('[SignalR] Reconnected:', connectionId);
  });

  connection.onclose((error) => {
    console.log('[SignalR] Connection closed', error?.message);
    connectionPromise = null;
  });

  try {
    await connection.start();
    console.log('[SignalR] Connected to demo hub');
    return connection;
  } catch (error) {
    connectionPromise = null;
    throw error;
  }
}

/**
 * Disconnect from the SignalR hub
 */
export async function disconnect(): Promise<void> {
  if (connection) {
    await connection.stop();
    connection = null;
    connectionPromise = null;
  }
}

/**
 * Subscribe to a demo session
 */
export async function subscribeToSession(sessionId: string): Promise<void> {
  const conn = await getConnection();
  await conn.invoke('SubscribeToSession', sessionId);
  console.log('[SignalR] Subscribed to session:', sessionId);
}

/**
 * Unsubscribe from a demo session
 */
export async function unsubscribeFromSession(sessionId: string): Promise<void> {
  const conn = await getConnection();
  await conn.invoke('UnsubscribeFromSession', sessionId);
  console.log('[SignalR] Unsubscribed from session:', sessionId);
}

// ============================================================================
// Event Handlers
// ============================================================================

type EventHandler<T> = (event: T) => void;

const eventHandlers = {
  sagaStep: new Set<EventHandler<SagaStepEvent>>(),
  circuitBreaker: new Set<EventHandler<CircuitBreakerEvent>>(),
  cache: new Set<EventHandler<CacheEvent>>(),
  eventFlow: new Set<EventHandler<EventFlowEvent>>(),
  vaultRotation: new Set<EventHandler<VaultRotationEvent>>(),
  rateLimit: new Set<EventHandler<RateLimitEvent>>(),
};

let handlersRegistered = false;

async function ensureHandlersRegistered(): Promise<void> {
  if (handlersRegistered) return;

  const conn = await getConnection();

  conn.on('OnSagaStep', (event: SagaStepEvent) => {
    eventHandlers.sagaStep.forEach((handler) => handler(event));
  });

  conn.on('OnCircuitState', (event: CircuitBreakerEvent) => {
    eventHandlers.circuitBreaker.forEach((handler) => handler(event));
  });

  conn.on('OnCacheEvent', (event: CacheEvent) => {
    eventHandlers.cache.forEach((handler) => handler(event));
  });

  conn.on('OnEventFlow', (event: EventFlowEvent) => {
    eventHandlers.eventFlow.forEach((handler) => handler(event));
  });

  conn.on('OnVaultRotation', (event: VaultRotationEvent) => {
    eventHandlers.vaultRotation.forEach((handler) => handler(event));
  });

  conn.on('OnRateLimit', (event: RateLimitEvent) => {
    eventHandlers.rateLimit.forEach((handler) => handler(event));
  });

  handlersRegistered = true;
}

/**
 * Subscribe to saga step events
 */
export async function onSagaStep(handler: EventHandler<SagaStepEvent>): Promise<() => void> {
  await ensureHandlersRegistered();
  eventHandlers.sagaStep.add(handler);
  return () => eventHandlers.sagaStep.delete(handler);
}

/**
 * Subscribe to circuit breaker events
 */
export async function onCircuitBreaker(handler: EventHandler<CircuitBreakerEvent>): Promise<() => void> {
  await ensureHandlersRegistered();
  eventHandlers.circuitBreaker.add(handler);
  return () => eventHandlers.circuitBreaker.delete(handler);
}

/**
 * Subscribe to cache events
 */
export async function onCacheEvent(handler: EventHandler<CacheEvent>): Promise<() => void> {
  await ensureHandlersRegistered();
  eventHandlers.cache.add(handler);
  return () => eventHandlers.cache.delete(handler);
}

/**
 * Subscribe to event flow events
 */
export async function onEventFlow(handler: EventHandler<EventFlowEvent>): Promise<() => void> {
  await ensureHandlersRegistered();
  eventHandlers.eventFlow.add(handler);
  return () => eventHandlers.eventFlow.delete(handler);
}

/**
 * Subscribe to vault rotation events
 */
export async function onVaultRotation(handler: EventHandler<VaultRotationEvent>): Promise<() => void> {
  await ensureHandlersRegistered();
  eventHandlers.vaultRotation.add(handler);
  return () => eventHandlers.vaultRotation.delete(handler);
}

/**
 * Subscribe to rate limit events
 */
export async function onRateLimit(handler: EventHandler<RateLimitEvent>): Promise<() => void> {
  await ensureHandlersRegistered();
  eventHandlers.rateLimit.add(handler);
  return () => eventHandlers.rateLimit.delete(handler);
}
