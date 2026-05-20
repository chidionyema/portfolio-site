/**
 * Demo API Client
 *
 * Centralized client for all demo API calls to the RitualWorks backend.
 * Each demo component uses this to interface with real infrastructure.
 */

// Local-dev fallback. PUBLIC_API_URL is the source of truth (.env.local).
// Was http://localhost:5000 — that port is squatted by macOS Control
// Center (AirPlay Receiver) so it silently 404'd in dev.
const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:5050';

// ============================================================================
// Types
// ============================================================================

export interface DemoSession {
  sessionId: string;
}

export interface SagaStartResponse extends DemoSession {
  orderId: string;
  status: string;
  subscriptionToken: string;
}

export interface SagaStep {
  name: string;
  service: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'compensating';
  timestamp?: string;
  durationMs?: number;
}

export interface CircuitBreakerResponse extends DemoSession {
  success: boolean;
  circuitState: 'closed' | 'open' | 'half-open';
  failureCount: number;
  successCount: number;
  rejectedCount: number;
  responseTimeMs?: number;
  retryAfterSeconds?: number;
  message?: string;
}

export interface IdempotencyResponse extends DemoSession {
  idempotencyKey: string;
  isDuplicate: boolean;
  duplicateCount?: number;
  result: {
    orderId: string;
    status: string;
  };
  keyInfo: {
    createdAt: string;
    expiresAt: string;
    ttlSeconds: number;
  };
}

export interface StampedeResponse extends DemoSession {
  protectionMode: 'none' | 'lock' | 'probabilistic';
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  dbQueries: number;
  totalDurationMs: number;
  averageLatencyMs: number;
}

export interface CachedProductResponse extends DemoSession {
  product: {
    id: string;
    name: string;
    price: number;
    version: number;
  };
  cacheInfo: {
    isHit: boolean;
    source: 'L1' | 'L2' | 'database';
    cachedAt: string;
    ttlSeconds: number;
    totalTtlSeconds: number;
  };
}

export interface InventoryResponse extends DemoSession {
  inventory: {
    id: string;
    name: string;
    quantity: number;
    version: number;
  };
}

export interface RateLimitResponse extends DemoSession {
  allowed: boolean;
  bucket: {
    remaining: number;
    limit: number;
    resetAt: string;
    retryAfterSeconds: number | null;
  };
  requestNumber?: number;
}

export interface ServiceHealth {
  id: string;
  name: string;
  status: 'online' | 'degraded' | 'offline';
  latencyMs: number;
  message?: string;
}

export interface HealthSnapshot {
  services: ServiceHealth[];
  systemStatus: 'healthy' | 'degraded' | 'down';
  p99LatencyMs: number;
  availability: number;
  timestamp: string;
}

export interface Span {
  spanId: string;
  parentSpanId: string | null;
  service: string;
  operation: string;
  startMs: number;
  durationMs: number;
  status: 'OK' | 'Error';
  attributes: Record<string, any>;
}

export interface Trace {
  traceId: string;
  rootSpanId: string;
  durationMs: number;
  spans: Span[];
}

export interface LiveMetrics {
  ingressEvents24h: number;
  // Server returns null for any metric we don't yet track honestly. The
  // LiveMetricsRow renders an em-dash when a value is null instead of
  // inventing a number.
  clusterAvailability: number | null;
  p99LatencyMs: number;
  activeSessions: number;
  timestamp: string;
}

export interface VaultStatusResponse extends DemoSession {
  currentVersion: number;
  createdAt: string;
  expiresAt: string;
  ttlSeconds: number;
  nextRotation: string;
  status: string;
  rotationHistory: Array<{
    version: number;
    rotatedAt: string;
    revokedAt?: string;
    status: string;
  }>;
}

// ============================================================================
// Error Handling
// ============================================================================

export class DemoApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DemoApiError';
  }
}

export interface RequestMetadata {
  traceId: string | null;
  latencyMs: number;
  statusCode: number;
  service: string;
}

async function handleResponse<T>(response: Response, start: number, path: string): Promise<T & RequestMetadata> {
  const latencyMs = Math.round(performance.now() - start);
  const statusCode = response.status;
  const traceId = response.headers.get('X-Trace-Id');
  const service = response.headers.get('X-Service-Id') || inferService(path);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new DemoApiError(
      response.status,
      error.error || 'UnknownError',
      error.message || `API Error: ${response.status}`,
      error.details
    );
  }
  const data = await response.json();
  return { ...data, traceId, latencyMs, statusCode, service };
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
  if (path.includes('health')) return 'bff-web-health';
  if (path.includes('metrics')) return 'bff-web-metrics';
  return 'bff-web';
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Saga scenario types
 */
export type SagaScenario =
  | 'success'
  | 'stockFailure'
  | 'paymentFailure'
  | 'timeout'
  | 'networkTimeout'
  | 'partialFailure';

/**
 * Start a saga demonstration
 */
export async function startSagaDemo(
  scenarioType: SagaScenario = 'success',
  simulatedDelayMs = 500
) {
  const start = performance.now();
  const path = '/api/demo/saga/start';
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenarioType, simulatedDelayMs }),
  });
  return handleResponse<SagaStartResponse>(response, start, path);
}

/**
 * Get current saga status (polling fallback)
 */
export async function getSagaStatus(sessionId: string) {
  const start = performance.now();
  const path = `/api/demo/saga/${sessionId}`;
  const response = await fetch(`${API_URL}${path}`);
  return handleResponse<{
    sessionId: string;
    orderId: string;
    currentStep: string;
    steps: SagaStep[];
    isComplete: boolean;
    isFailed: boolean;
  }>(response, start, path);
}

/**
 * Trigger event flow demonstration
 */
export async function triggerEventFlow(
  eventType: 'OrderCreated' | 'PaymentReceived' | 'InventoryUpdated',
  payload: Record<string, unknown> = {}
) {
  const start = performance.now();
  const path = '/api/demo/events/trigger';
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventType, payload }),
  });
  return handleResponse<DemoSession & { eventId: string; status: string }>(response, start, path);
}

/**
 * Make a request through the circuit breaker
 */
export async function circuitBreakerRequest(
  sessionId?: string,
  shouldFail = false
) {
  const start = performance.now();
  const path = '/api/demo/circuit/request';
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, shouldFail }),
  });
  return handleResponse<CircuitBreakerResponse>(response, start, path);
}

/**
 * Toggle circuit breaker failure mode
 */
export async function toggleCircuitFailure(
  sessionId: string,
  failureMode: boolean
) {
  const start = performance.now();
  const path = '/api/demo/circuit/toggle-failure';
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, failureMode }),
  });
  return handleResponse<DemoSession>(response, start, path);
}

/**
 * Reset circuit breaker
 */
export async function resetCircuit(sessionId: string) {
  const start = performance.now();
  const path = '/api/demo/circuit/reset';
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });
  return handleResponse<DemoSession>(response, start, path);
}

/**
 * Get vault status
 */
export async function getVaultStatus() {
  const start = performance.now();
  const path = '/api/demo/vault/status';
  const response = await fetch(`${API_URL}${path}`);
  return handleResponse<VaultStatusResponse>(response, start, path);
}

/**
 * Trigger vault rotation demo
 */
export async function triggerVaultRotation() {
  const start = performance.now();
  const path = '/api/demo/vault/rotate';
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
  });
  return handleResponse<DemoSession & {
    previousVersion: number;
    newVersion: number;
    status: string;
  }>(response, start, path);
}

/**
 * Process idempotent request
 */
export async function processIdempotentRequest(
  idempotencyKey: string,
  action: string,
  payload: Record<string, unknown>
) {
  const start = performance.now();
  const path = '/api/demo/idempotency/process';
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({ action, payload }),
  });
  return handleResponse<IdempotencyResponse>(response, start, path);
}

/**
 * Get idempotency key status
 */
export async function getIdempotencyKeyStatus(key: string) {
  const start = performance.now();
  const path = `/api/demo/idempotency/key/${encodeURIComponent(key)}`;
  const response = await fetch(`${API_URL}${path}`);
  return handleResponse<{
    key: string;
    exists: boolean;
    createdAt?: string;
    ttlSeconds?: number;
    hitCount?: number;
  }>(response, start, path);
}

/**
 * Simulate cache stampede
 */
export async function simulateStampede(
  concurrentRequests: number,
  protectionMode: 'none' | 'lock' | 'probabilistic',
  simulatedDbLatencyMs = 100
) {
  const start = performance.now();
  const path = '/api/demo/cache/stampede';
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      concurrentRequests,
      cacheKey: 'product:demo-widget',
      protectionMode,
      simulatedDbLatencyMs,
    }),
  });
  return handleResponse<StampedeResponse>(response, start, path);
}

/**
 * Get demo product ID
 */
export async function getDemoProduct() {
  const start = performance.now();
  const path = '/api/demo/cache/product/demo';
  const response = await fetch(`${API_URL}${path}`);
  return handleResponse<{ id: string }>(response, start, path);
}

/**
 * Get cached product
 */
export async function getCachedProduct(productId: string) {
  const start = performance.now();
  const path = `/api/demo/cache/product/${productId}`;
  const response = await fetch(`${API_URL}${path}`);
  return handleResponse<CachedProductResponse>(response, start, path);
}

/**
 * Update product (triggers cache invalidation)
 */
export async function updateProduct(
  productId: string,
  updates: { price?: number; name?: string }
) {
  const start = performance.now();
  const path = `/api/demo/cache/product/${productId}`;
  const response = await fetch(`${API_URL}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return handleResponse<CachedProductResponse & {
    invalidation: {
      cacheKeysInvalidated: string[];
      pubsubMessageSent: boolean;
      instancesNotified: number;
    };
  }>(response, start, path);
}

/**
 * Invalidate cache manually
 */
export async function invalidateCache(productId: string) {
  const start = performance.now();
  const path = `/api/demo/cache/product/${productId}`;
  const response = await fetch(`${API_URL}${path}`, {
    method: 'DELETE',
  });
  return handleResponse<DemoSession & {
    invalidated: boolean;
    cacheKey: string;
    pubsubMessageSent: boolean;
  }>(response, start, path);
}

/**
 * Get inventory with version
 */
export async function getInventory(inventoryId: string) {
  const start = performance.now();
  const path = `/api/demo/inventory/${inventoryId}`;
  const response = await fetch(`${API_URL}${path}`);
  return handleResponse<InventoryResponse>(response, start, path);
}

/**
 * Update inventory with optimistic concurrency
 */
export async function updateInventory(
  inventoryId: string,
  quantity: number,
  expectedVersion: number
) {
  const start = performance.now();
  const path = `/api/demo/inventory/${inventoryId}`;
  const response = await fetch(`${API_URL}${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'If-Match': `"${expectedVersion}"`,
    },
    body: JSON.stringify({ quantity }),
  });
  return handleResponse<InventoryResponse & { previousVersion: number }>(response, start, path);
}

/**
 * Configure rate limit for demo session
 */
export async function configureRateLimit(
  permitLimit = 10,
  windowSeconds = 10,
  sessionId?: string
) {
  const start = performance.now();
  const path = '/api/demo/ratelimit/configure';
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, permitLimit, windowSeconds }),
  });
  return handleResponse<RateLimitResponse>(response, start, path);
}

/**
 * Make rate-limited request
 */
export async function rateLimitedRequest(sessionId?: string) {
  const start = performance.now();
  const path = '/api/demo/ratelimit/request';
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });
  return handleResponse<RateLimitResponse>(response, start, path);
}

/**
 * Send burst of rate-limited requests
 */
export async function sendRateLimitBurst(
  count: number,
  delayMs = 50
) {
  const start = performance.now();
  const path = '/api/demo/ratelimit/burst';
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ count, delayMs }),
  });
  return handleResponse<{
    sessionId: string;
    results: Array<{ requestNumber: number; allowed: boolean; remaining: number; retryAfter?: number }>;
    summary: { total: number; allowed: number; rejected: number };
  }>(response, start, path);
}

/**
 * Get system health snapshot
 */
export async function getHealthSnapshot() {
  const start = performance.now();
  const path = '/api/health/snapshot';
  const response = await fetch(`${API_URL}${path}`);
  return handleResponse<HealthSnapshot>(response, start, path);
}

/**
 * Get health stream URL
 */
export function getHealthStreamUrl(): string {
  return `${API_URL}/api/health/stream`;
}

/**
 * Get system metrics snapshot
 */
export async function getMetricsSnapshot() {
  const start = performance.now();
  const path = '/api/metrics/snapshot';
  const response = await fetch(`${API_URL}${path}`);
  return handleResponse<LiveMetrics>(response, start, path);
}

/**
 * Get metrics stream URL
 */
export function getMetricsStreamUrl(): string {
  return `${API_URL}/api/metrics/stream`;
}

/**
 * Trigger Chaos Scenario
 */
export async function triggerChaos(scenario: string, durationSeconds: number) {
  const start = performance.now();
  const path = '/api/demo/chaos/trigger';
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario, durationSeconds }),
  });
  return handleResponse<{ trace_id: string }>(response, start, path);
}

/**
 * Get trace by ID from Grafana Tempo (via Backend)
 */
export async function getTrace(traceId: string) {
  const start = performance.now();
  const path = `/api/traces/${traceId}`;
  const response = await fetch(`${API_URL}${path}`);
  return handleResponse<Trace>(response, start, path);
}
