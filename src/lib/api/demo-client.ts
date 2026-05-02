/**
 * Demo API Client
 *
 * Centralized client for all demo API calls to the RitualWorks backend.
 * Each demo component uses this to interface with real infrastructure.
 */

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:5000';

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

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new DemoApiError(
      response.status,
      error.error || 'UnknownError',
      error.message || `API Error: ${response.status}`,
      error.details
    );
  }
  return response.json();
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
): Promise<SagaStartResponse> {
  const response = await fetch(`${API_URL}/api/demo/saga/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenarioType, simulatedDelayMs }),
  });
  return handleResponse(response);
}

/**
 * Get current saga status (polling fallback)
 */
export async function getSagaStatus(sessionId: string): Promise<{
  sessionId: string;
  orderId: string;
  currentStep: string;
  steps: SagaStep[];
  isComplete: boolean;
  isFailed: boolean;
}> {
  const response = await fetch(`${API_URL}/api/demo/saga/${sessionId}`);
  return handleResponse(response);
}

/**
 * Trigger event flow demonstration
 */
export async function triggerEventFlow(
  eventType: 'OrderCreated' | 'PaymentReceived' | 'InventoryUpdated',
  payload: Record<string, unknown> = {}
): Promise<DemoSession & { eventId: string; status: string }> {
  const response = await fetch(`${API_URL}/api/demo/events/trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventType, payload }),
  });
  return handleResponse(response);
}

/**
 * Make a request through the circuit breaker
 */
export async function circuitBreakerRequest(
  sessionId?: string,
  shouldFail = false
): Promise<CircuitBreakerResponse> {
  const response = await fetch(`${API_URL}/api/demo/circuit/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, shouldFail }),
  });
  return handleResponse(response);
}

/**
 * Toggle circuit breaker failure mode
 */
export async function toggleCircuitFailure(
  sessionId: string,
  failureMode: boolean
): Promise<DemoSession> {
  const response = await fetch(`${API_URL}/api/demo/circuit/toggle-failure`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, failureMode }),
  });
  return handleResponse(response);
}

/**
 * Reset circuit breaker
 */
export async function resetCircuit(sessionId: string): Promise<DemoSession> {
  const response = await fetch(`${API_URL}/api/demo/circuit/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });
  return handleResponse(response);
}

/**
 * Get vault status
 */
export async function getVaultStatus(): Promise<VaultStatusResponse> {
  const response = await fetch(`${API_URL}/api/demo/vault/status`);
  return handleResponse(response);
}

/**
 * Trigger vault rotation demo
 */
export async function triggerVaultRotation(): Promise<DemoSession & {
  previousVersion: number;
  newVersion: number;
  status: string;
}> {
  const response = await fetch(`${API_URL}/api/demo/vault/rotate`, {
    method: 'POST',
  });
  return handleResponse(response);
}

/**
 * Process idempotent request
 */
export async function processIdempotentRequest(
  idempotencyKey: string,
  action: string,
  payload: Record<string, unknown>
): Promise<IdempotencyResponse> {
  const response = await fetch(`${API_URL}/api/demo/idempotency/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({ action, payload }),
  });
  return handleResponse(response);
}

/**
 * Get idempotency key status
 */
export async function getIdempotencyKeyStatus(key: string): Promise<{
  key: string;
  exists: boolean;
  createdAt?: string;
  ttlSeconds?: number;
  hitCount?: number;
}> {
  const response = await fetch(`${API_URL}/api/demo/idempotency/key/${encodeURIComponent(key)}`);
  return handleResponse(response);
}

/**
 * Simulate cache stampede
 */
export async function simulateStampede(
  concurrentRequests: number,
  protectionMode: 'none' | 'lock' | 'probabilistic',
  simulatedDbLatencyMs = 100
): Promise<StampedeResponse> {
  const response = await fetch(`${API_URL}/api/demo/cache/stampede`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      concurrentRequests,
      cacheKey: 'product:demo-widget',
      protectionMode,
      simulatedDbLatencyMs,
    }),
  });
  return handleResponse(response);
}

/**
 * Get cached product
 */
export async function getCachedProduct(productId: string): Promise<CachedProductResponse> {
  const response = await fetch(`${API_URL}/api/demo/cache/product/${productId}`);
  return handleResponse(response);
}

/**
 * Update product (triggers cache invalidation)
 */
export async function updateProduct(
  productId: string,
  updates: { price?: number; name?: string }
): Promise<CachedProductResponse & {
  invalidation: {
    cacheKeysInvalidated: string[];
    pubsubMessageSent: boolean;
    instancesNotified: number;
  };
}> {
  const response = await fetch(`${API_URL}/api/demo/cache/product/${productId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return handleResponse(response);
}

/**
 * Invalidate cache manually
 */
export async function invalidateCache(productId: string): Promise<DemoSession & {
  invalidated: boolean;
  cacheKey: string;
  pubsubMessageSent: boolean;
}> {
  const response = await fetch(`${API_URL}/api/demo/cache/product/${productId}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
}

/**
 * Get inventory with version
 */
export async function getInventory(inventoryId: string): Promise<InventoryResponse> {
  const response = await fetch(`${API_URL}/api/demo/inventory/${inventoryId}`);
  return handleResponse(response);
}

/**
 * Update inventory with optimistic concurrency
 */
export async function updateInventory(
  inventoryId: string,
  quantity: number,
  expectedVersion: number
): Promise<InventoryResponse & { previousVersion: number }> {
  const response = await fetch(`${API_URL}/api/demo/inventory/${inventoryId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'If-Match': `"${expectedVersion}"`,
    },
    body: JSON.stringify({ quantity }),
  });
  return handleResponse(response);
}

/**
 * Configure rate limit for demo session
 */
export async function configureRateLimit(
  permitLimit = 10,
  windowSeconds = 10,
  sessionId?: string
): Promise<RateLimitResponse> {
  const response = await fetch(`${API_URL}/api/demo/ratelimit/configure`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, permitLimit, windowSeconds }),
  });
  return handleResponse(response);
}

/**
 * Make rate-limited request
 */
export async function rateLimitedRequest(sessionId?: string): Promise<RateLimitResponse> {
  const response = await fetch(`${API_URL}/api/demo/ratelimit/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });
  return handleResponse(response);
}

/**
 * Send burst of rate-limited requests
 */
export async function sendRateLimitBurst(
  count: number,
  delayMs = 50
): Promise<{
  sessionId: string;
  results: Array<{ requestNumber: number; allowed: boolean; remaining: number; retryAfter?: number }>;
  summary: { total: number; allowed: number; rejected: number };
}> {
  const response = await fetch(`${API_URL}/api/demo/ratelimit/burst`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ count, delayMs }),
  });
  return handleResponse(response);
}
