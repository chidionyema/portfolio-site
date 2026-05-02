# Demo API Integration Specification

This document specifies exactly how each portfolio demo interfaces with the RitualWorks backend API.

## Key Design Decisions

| Decision | Value | Rationale |
|----------|-------|-----------|
| **Authentication** | None (public endpoints) | Portfolio demos should be accessible without login |
| **Cache TTL** | 60 seconds | Shorter for demo visibility |
| **Rate Limit** | Configurable (default 10/10s) | Adjustable per demo session |
| **Concurrency** | Actual PostgreSQL `xmin` | Real optimistic locking, not simulated |
| **Session Expiry** | 10 minutes | Auto-cleanup of demo state |

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [API Configuration](#api-configuration)
3. [SignalR Connection](#signalr-connection)
4. [Demo 1: Saga (Checkout Flow)](#demo-1-saga-checkout-flow)
5. [Demo 2: Event Flow (Outbox Pattern)](#demo-2-event-flow-outbox-pattern)
6. [Demo 3: Circuit Breaker](#demo-3-circuit-breaker)
7. [Demo 4: Vault/Secrets Rotation](#demo-4-vaultsecrets-rotation)
8. [Demo 5: Idempotency](#demo-5-idempotency)
9. [Demo 6: Cache Stampede](#demo-6-cache-stampede)
10. [Demo 7: Cache Invalidation](#demo-7-cache-invalidation)
11. [Demo 8: Optimistic Concurrency](#demo-8-optimistic-concurrency)
12. [Demo 9: Rate Limiting](#demo-9-rate-limiting)
13. [Shared Types](#shared-types)
14. [Error Handling](#error-handling)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Portfolio Site (Astro + React)                   │
│                        https://chidionyema.dev                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  CheckoutDemo │  │  EventDemo   │  │ CircuitDemo  │  ...        │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                  │                       │
│         └────────────────┼──────────────────┘                       │
│                          │                                           │
│                    ┌─────▼─────┐                                    │
│                    │ useDemo() │  ← Shared React hook               │
│                    │   Hook    │                                    │
│                    └─────┬─────┘                                    │
│                          │                                           │
└──────────────────────────┼───────────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │ REST API       │ SignalR        │
          │ (Commands)     │ (Real-time)    │
          ▼                ▼                │
┌─────────────────────────────────────────────────────────────────────┐
│                    RitualWorks API (ASP.NET Core)                    │
│                      https://api.chidionyema.dev                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────┐    ┌─────────────────┐                        │
│  │  DemoController  │    │    DemoHub      │                        │
│  │  /api/demo/*     │    │  /hubs/demo     │                        │
│  └────────┬─────────┘    └────────┬────────┘                        │
│           │                       │                                  │
│           ▼                       ▼                                  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Existing Infrastructure                    │   │
│  │  • HybridCache        • MassTransit Sagas                    │   │
│  │  • ResiliencePolicy   • Vault Service                        │   │
│  │  • Redis              • PostgreSQL                           │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## API Configuration

### Environment Variables (Portfolio Site)

```env
# .env.development
PUBLIC_API_URL=http://localhost:5000
PUBLIC_SIGNALR_URL=http://localhost:5000/hubs/demo

# .env.production
PUBLIC_API_URL=https://api.chidionyema.dev
PUBLIC_SIGNALR_URL=https://api.chidionyema.dev/hubs/demo
```

### API Client Setup

```typescript
// src/lib/api/client.ts

const API_URL = import.meta.env.PUBLIC_API_URL;

export async function demoApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_URL}/api/demo${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new DemoApiError(response.status, error.message || 'API Error');
  }

  return response.json();
}

export class DemoApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'DemoApiError';
  }
}
```

---

## SignalR Connection

### Connection Manager

```typescript
// src/lib/api/signalr.ts

import * as signalR from '@microsoft/signalr';

const SIGNALR_URL = import.meta.env.PUBLIC_SIGNALR_URL;

let connection: signalR.HubConnection | null = null;

export async function connectToDemoHub(): Promise<signalR.HubConnection> {
  if (connection?.state === signalR.HubConnectionState.Connected) {
    return connection;
  }

  connection = new signalR.HubConnectionBuilder()
    .withUrl(SIGNALR_URL)
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .configureLogging(signalR.LogLevel.Information)
    .build();

  await connection.start();
  return connection;
}

export function disconnectFromDemoHub(): void {
  connection?.stop();
  connection = null;
}

// Subscribe to a demo session
export async function subscribeToDemoSession(sessionId: string): Promise<void> {
  const conn = await connectToDemoHub();
  await conn.invoke('SubscribeToSession', sessionId);
}

// Unsubscribe from a demo session
export async function unsubscribeFromDemoSession(sessionId: string): Promise<void> {
  const conn = await connectToDemoHub();
  await conn.invoke('UnsubscribeFromSession', sessionId);
}
```

### Event Types

```typescript
// src/lib/api/types.ts

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

export interface RateLimitEvent {
  sessionId: string;
  allowed: boolean;
  remaining: number;
  resetAt: string;
  retryAfter?: number;
  timestamp: string;
}
```

---

## Demo 1: Saga (Checkout Flow)

### Purpose
Demonstrates distributed transaction orchestration across bounded contexts with compensation on failure.

### UI Flow
1. User clicks "Run Saga"
2. Backend creates demo order and initiates saga
3. SignalR streams each step: Order → Stock → Payment → Complete
4. On failure, shows compensation flow
5. Timeline visualization updates in real-time

### API Contract

#### Start Saga Demo
```http
POST /api/demo/saga/start
Content-Type: application/json

{
  "scenarioType": "success" | "stockFailure" | "paymentFailure" | "timeout" | "networkTimeout" | "partialFailure",
  "simulatedDelayMs": 500
}
```

**Scenario Types:**
| Scenario | Description |
|----------|-------------|
| `success` | Happy path - all steps complete |
| `stockFailure` | Stock reservation fails, no compensation needed |
| `paymentFailure` | Payment fails after stock reserved, triggers compensation |
| `timeout` | Payment session expires, triggers compensation |
| `networkTimeout` | Simulates network timeout during payment call |
| `partialFailure` | Payment partially succeeds, complex compensation |
```

**Response (202 Accepted)**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "orderId": "ord_demo_123",
  "status": "initiated",
  "subscriptionToken": "hmac_token_for_signalr"
}
```

#### Get Saga Status (Polling Fallback)
```http
GET /api/demo/saga/{sessionId}
```

**Response**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "orderId": "ord_demo_123",
  "currentStep": "PaymentProcessing",
  "steps": [
    {
      "name": "OrderCreated",
      "service": "Orders",
      "status": "completed",
      "timestamp": "2024-01-15T10:00:00Z",
      "durationMs": 45
    },
    {
      "name": "StockReserved",
      "service": "Inventory",
      "status": "completed",
      "timestamp": "2024-01-15T10:00:00.5Z",
      "durationMs": 120
    },
    {
      "name": "PaymentProcessing",
      "service": "Payments",
      "status": "processing",
      "timestamp": "2024-01-15T10:00:01Z"
    }
  ],
  "isComplete": false,
  "isFailed": false
}
```

### SignalR Events

**Event Name**: `OnSagaStep`

```typescript
// Received for each saga step
{
  sessionId: "550e8400-e29b-41d4-a716-446655440000",
  step: "StockReserved",
  service: "Inventory",
  status: "completed",
  description: "Reserved 2 units of Widget Pro",
  progressPercent: 50,
  timestamp: "2024-01-15T10:00:00.5Z"
}
```

### Frontend Integration

```typescript
// src/components/demo/CheckoutDemo.tsx

import { useState, useEffect } from 'react';
import { demoApi } from '@/lib/api/client';
import { connectToDemoHub, subscribeToDemoSession } from '@/lib/api/signalr';
import type { SagaStepEvent } from '@/lib/api/types';

interface SagaStep {
  name: string;
  service: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'compensating';
  timestamp?: string;
}

export function CheckoutDemo() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [steps, setSteps] = useState<SagaStep[]>([
    { name: 'OrderCreated', service: 'Orders', status: 'pending' },
    { name: 'StockReserved', service: 'Inventory', status: 'pending' },
    { name: 'PaymentProcessed', service: 'Payments', status: 'pending' },
    { name: 'OrderCompleted', service: 'Orders', status: 'pending' },
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [scenario, setScenario] = useState<'success' | 'stockFailure' | 'paymentFailure'>('success');

  useEffect(() => {
    if (!sessionId) return;

    let mounted = true;

    const setupSignalR = async () => {
      const connection = await connectToDemoHub();
      await subscribeToDemoSession(sessionId);

      connection.on('OnSagaStep', (event: SagaStepEvent) => {
        if (!mounted || event.sessionId !== sessionId) return;

        setSteps(prev => prev.map(step =>
          step.name === event.step
            ? { ...step, status: event.status, timestamp: event.timestamp }
            : step
        ));

        if (event.status === 'completed' && event.step === 'OrderCompleted') {
          setIsRunning(false);
        }
        if (event.status === 'failed' || event.status === 'compensating') {
          // Trigger compensation visualization
        }
      });
    };

    setupSignalR();

    return () => {
      mounted = false;
    };
  }, [sessionId]);

  const runSaga = async () => {
    setIsRunning(true);
    setSteps(steps.map(s => ({ ...s, status: 'pending', timestamp: undefined })));

    try {
      const response = await demoApi<{ sessionId: string }>('/saga/start', {
        method: 'POST',
        body: JSON.stringify({ scenarioType: scenario, simulatedDelayMs: 500 }),
      });

      setSessionId(response.sessionId);
    } catch (error) {
      setIsRunning(false);
      console.error('Failed to start saga:', error);
    }
  };

  // ... render UI
}
```

---

## Demo 2: Event Flow (Outbox Pattern)

### Purpose
Demonstrates reliable event publishing using the transactional outbox pattern.

### UI Flow
1. User clicks "Trigger Event"
2. Shows event being written to outbox table (same transaction as data)
3. Shows outbox relay picking up event
4. Shows event published to message broker
5. Shows consumer processing and acknowledging

### API Contract

#### Trigger Event
```http
POST /api/demo/events/trigger
Content-Type: application/json

{
  "eventType": "OrderCreated" | "PaymentReceived" | "InventoryUpdated",
  "payload": {
    "orderId": "demo_123",
    "amount": 99.99
  }
}
```

**Response (202 Accepted)**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "eventId": "evt_demo_456",
  "status": "persisted"
}
```

### SignalR Events

**Event Name**: `OnEventFlow`

```typescript
// Step 1: Event written to outbox
{
  sessionId: "...",
  eventType: "OrderCreated",
  source: "OutboxTable",
  status: "persisted",
  queueDepth: 0,
  timestamp: "..."
}

// Step 2: Event dispatched by relay
{
  sessionId: "...",
  eventType: "OrderCreated",
  source: "OutboxRelay",
  status: "dispatched",
  queueDepth: 1,
  timestamp: "..."
}

// Step 3: Event consumed
{
  sessionId: "...",
  eventType: "OrderCreated",
  source: "OrderCreatedConsumer",
  status: "consumed",
  queueDepth: 0,
  timestamp: "..."
}

// Step 4: Event acknowledged
{
  sessionId: "...",
  eventType: "OrderCreated",
  source: "MessageBroker",
  status: "acknowledged",
  queueDepth: 0,
  timestamp: "..."
}
```

---

## Demo 3: Circuit Breaker

### Purpose
Demonstrates the circuit breaker pattern protecting against cascading failures.

### UI Flow
1. Shows circuit in "Closed" state (healthy)
2. User sends requests - some succeed, some fail
3. After N failures, circuit "Opens"
4. Requests are immediately rejected (fail-fast)
5. After timeout, circuit goes "Half-Open"
6. One test request determines if circuit closes or reopens

### API Contract

#### Make Request Through Circuit
```http
POST /api/demo/circuit/request
Content-Type: application/json

{
  "sessionId": "optional-existing-session",
  "shouldFail": false  // For demo control
}
```

**Response (200 OK - Circuit Closed)**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "success": true,
  "circuitState": "closed",
  "failureCount": 0,
  "successCount": 15,
  "responseTimeMs": 45
}
```

**Response (503 Service Unavailable - Circuit Open)**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "success": false,
  "circuitState": "open",
  "failureCount": 5,
  "rejectedCount": 3,
  "retryAfterSeconds": 25,
  "message": "Circuit is open. Request rejected without calling downstream service."
}
```

#### Toggle Failure Mode (Demo Control)
```http
POST /api/demo/circuit/toggle-failure
Content-Type: application/json

{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "failureMode": true
}
```

#### Reset Circuit (Demo Control)
```http
POST /api/demo/circuit/reset
Content-Type: application/json

{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### SignalR Events

**Event Name**: `OnCircuitState`

```typescript
{
  sessionId: "...",
  state: "open",
  failureCount: 5,
  successCount: 12,
  rejectedCount: 3,
  lastError: "Simulated downstream failure",
  timestamp: "..."
}
```

---

## Demo 4: Vault/Secrets Rotation

### Purpose
Demonstrates zero-downtime secret rotation using HashiCorp Vault.

### UI Flow
1. Shows current secret version and TTL
2. Timeline of rotation events
3. User can trigger manual rotation
4. Shows credential swap without connection drop
5. Old credential grace period before revocation

### API Contract

#### Get Vault Status
```http
GET /api/demo/vault/status
```

**Response**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "currentVersion": 3,
  "createdAt": "2024-01-15T10:00:00Z",
  "expiresAt": "2024-01-15T11:00:00Z",
  "ttlSeconds": 3420,
  "rotationSchedule": "0 * * * *",
  "nextRotation": "2024-01-15T11:00:00Z",
  "status": "active",
  "rotationHistory": [
    {
      "version": 3,
      "rotatedAt": "2024-01-15T10:00:00Z",
      "status": "active"
    },
    {
      "version": 2,
      "rotatedAt": "2024-01-15T09:00:00Z",
      "revokedAt": "2024-01-15T10:05:00Z",
      "status": "revoked"
    }
  ]
}
```

#### Trigger Demo Rotation
```http
POST /api/demo/vault/rotate
```

**Response (202 Accepted)**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "previousVersion": 3,
  "newVersion": 4,
  "status": "rotating"
}
```

### SignalR Events

**Event Name**: `OnVaultRotation`

```typescript
// Rotation started
{
  sessionId: "...",
  stage: "started",
  previousVersion: 3,
  newVersion: 4,
  timestamp: "..."
}

// New credential active
{
  sessionId: "...",
  stage: "activated",
  version: 4,
  timestamp: "..."
}

// Old credential in grace period
{
  sessionId: "...",
  stage: "grace_period",
  version: 3,
  gracePeriodEnds: "2024-01-15T10:05:00Z",
  timestamp: "..."
}

// Old credential revoked
{
  sessionId: "...",
  stage: "revoked",
  version: 3,
  timestamp: "..."
}
```

---

## Demo 5: Idempotency

### Purpose
Demonstrates duplicate request handling using idempotency keys.

### UI Flow
1. User enters idempotency key (or auto-generate)
2. First request: Creates order, stores key in Redis
3. Duplicate requests: Returns cached result, shows "Duplicate detected"
4. Shows Redis key TTL counting down
5. After expiry, same key creates new order

### API Contract

#### Process Idempotent Request
```http
POST /api/demo/idempotency/process
Content-Type: application/json
X-Idempotency-Key: idem_abc123

{
  "action": "CreateOrder",
  "payload": {
    "item": "Widget",
    "quantity": 1
  }
}
```

**Response (200 OK - First Request)**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "idempotencyKey": "idem_abc123",
  "isDuplicate": false,
  "result": {
    "orderId": "ord_demo_789",
    "status": "created"
  },
  "keyInfo": {
    "createdAt": "2024-01-15T10:00:00Z",
    "expiresAt": "2024-01-15T10:05:00Z",
    "ttlSeconds": 300
  }
}
```

**Response (200 OK - Duplicate Request)**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "idempotencyKey": "idem_abc123",
  "isDuplicate": true,
  "duplicateCount": 3,
  "result": {
    "orderId": "ord_demo_789",
    "status": "created"
  },
  "keyInfo": {
    "createdAt": "2024-01-15T10:00:00Z",
    "expiresAt": "2024-01-15T10:05:00Z",
    "ttlSeconds": 245
  },
  "message": "Duplicate request detected. Returning cached result."
}
```

#### Get Idempotency Key Status
```http
GET /api/demo/idempotency/key/{key}
```

**Response**
```json
{
  "key": "idem_abc123",
  "exists": true,
  "createdAt": "2024-01-15T10:00:00Z",
  "ttlSeconds": 245,
  "hitCount": 3,
  "cachedResult": {
    "orderId": "ord_demo_789"
  }
}
```

---

## Demo 6: Cache Stampede

### Purpose
Demonstrates thundering herd prevention using distributed locks and probabilistic refresh.

### UI Flow
1. User selects protection mode: None, Lock, or Probabilistic
2. Triggers N concurrent requests for same cache key
3. Shows real-time visualization of:
   - Requests hitting cache
   - Requests hitting database
   - Lock contention
4. Compares DB hit counts across modes

### API Contract

#### Simulate Stampede
```http
POST /api/demo/cache/stampede
Content-Type: application/json

{
  "concurrentRequests": 100,
  "cacheKey": "product:demo-widget",
  "protectionMode": "none" | "lock" | "probabilistic",
  "simulatedDbLatencyMs": 100
}
```

**Response**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "protectionMode": "lock",
  "totalRequests": 100,
  "cacheHits": 99,
  "cacheMisses": 1,
  "dbQueries": 1,
  "totalDurationMs": 450,
  "averageLatencyMs": 4.5,
  "p99LatencyMs": 105,
  "lockContentionCount": 99,
  "comparison": {
    "withoutProtection": {
      "estimatedDbQueries": 100,
      "estimatedDurationMs": 10000
    }
  }
}
```

### SignalR Events

**Event Name**: `OnCacheEvent`

```typescript
// Cache miss - acquiring lock
{
  sessionId: "...",
  action: "miss",
  key: "product:demo-widget",
  isHit: false,
  dbHits: 0,
  source: null,
  timestamp: "..."
}

// Lock acquired - fetching from DB
{
  sessionId: "...",
  action: "refresh",
  key: "product:demo-widget",
  isHit: false,
  dbHits: 1,
  source: "database",
  timestamp: "..."
}

// Other requests served from cache
{
  sessionId: "...",
  action: "hit",
  key: "product:demo-widget",
  isHit: true,
  dbHits: 1,
  source: "L1",  // or "L2" for Redis
  timestamp: "..."
}
```

---

## Demo 7: Cache Invalidation

### Purpose
Demonstrates cache invalidation with pub/sub for multi-instance consistency.

### Configuration
- **Cache TTL**: 60 seconds (shorter for demo visibility)
- **L1 (Memory)**: 15 seconds
- **L2 (Redis)**: 60 seconds

### UI Flow
1. Shows cached product with TTL countdown (60s)
2. User can read from cache (shows hit/miss)
3. User can update product (triggers invalidation)
4. Shows pub/sub message broadcast to all instances
5. Next read fetches fresh data

### API Contract

#### Get Cached Product
```http
GET /api/demo/cache/product/{id}
```

**Response**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "product": {
    "id": "prod_demo_123",
    "name": "Widget Pro",
    "price": 49.99,
    "version": 3
  },
  "cacheInfo": {
    "isHit": true,
    "source": "L1",
    "cachedAt": "2024-01-15T10:00:00Z",
    "ttlSeconds": 45,
    "totalTtlSeconds": 60
  }
}
```

#### Update Product (Triggers Invalidation)
```http
PUT /api/demo/cache/product/{id}
Content-Type: application/json

{
  "price": 59.99
}
```

**Response**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "product": {
    "id": "prod_demo_123",
    "name": "Widget Pro",
    "price": 59.99,
    "version": 4
  },
  "invalidation": {
    "cacheKeysInvalidated": ["product:prod_demo_123", "products:list"],
    "pubsubMessageSent": true,
    "instancesNotified": 3
  }
}
```

#### Manual Invalidation
```http
DELETE /api/demo/cache/product/{id}
```

**Response**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "invalidated": true,
  "cacheKey": "product:prod_demo_123",
  "pubsubMessageSent": true
}
```

---

## Demo 8: Optimistic Concurrency

### Purpose
Demonstrates conflict detection using **actual PostgreSQL `xmin` system column** (row version).

### Implementation
Uses EF Core's concurrency token mapped to PostgreSQL's `xmin`:
```csharp
// Entity configuration
entity.Property<uint>("xmin")
    .HasColumnType("xid")
    .ValueGeneratedOnAddOrUpdate()
    .IsConcurrencyToken();
```

### UI Flow
1. Shows inventory item with current quantity and version (actual DB version)
2. Two "users" can read the same item (both see v1)
3. User A updates (succeeds, now v2)
4. User B tries to update with stale v1 (conflict!)
5. Shows 409 response with `DbUpdateConcurrencyException` details

### API Contract

#### Get Inventory
```http
GET /api/demo/inventory/{id}
```

**Response**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "inventory": {
    "id": "inv_demo_123",
    "name": "Widget Pro",
    "quantity": 50,
    "version": 1
  }
}
```

**Headers**
```http
ETag: "1"
```

#### Update Inventory
```http
PUT /api/demo/inventory/{id}
Content-Type: application/json
If-Match: "1"

{
  "quantity": 45
}
```

**Response (200 OK - Success)**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "inventory": {
    "id": "inv_demo_123",
    "name": "Widget Pro",
    "quantity": 45,
    "version": 2
  },
  "previousVersion": 1
}
```

**Response (409 Conflict - Version Mismatch)**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "error": "ConcurrencyConflict",
  "message": "The resource was modified by another request",
  "yourVersion": 1,
  "currentVersion": 2,
  "currentState": {
    "id": "inv_demo_123",
    "name": "Widget Pro",
    "quantity": 45,
    "version": 2
  },
  "resolution": {
    "options": ["refetch_and_retry", "force_overwrite", "merge"],
    "recommended": "refetch_and_retry"
  }
}
```

---

## Demo 9: Rate Limiting

### Purpose
Demonstrates token bucket rate limiting with proper 429 responses.

### UI Flow
1. Shows token bucket with N tokens
2. User sends requests - tokens consumed
3. Shows remaining tokens and refill rate
4. When empty, requests get 429 + Retry-After
5. Tokens refill over time

### API Contract

#### Configure Rate Limit (Optional)
```http
POST /api/demo/ratelimit/configure
Content-Type: application/json

{
  "sessionId": "optional-existing-session",
  "permitLimit": 10,
  "windowSeconds": 10
}
```

**Response**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "bucket": {
    "limit": 10,
    "windowSeconds": 10,
    "remaining": 10
  }
}
```

#### Make Rate-Limited Request
```http
POST /api/demo/ratelimit/request
Content-Type: application/json

{
  "sessionId": "optional-existing-session"
}
```

**Response (200 OK - Allowed)**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "allowed": true,
  "bucket": {
    "remaining": 7,
    "limit": 10,
    "resetAt": "2024-01-15T10:00:10Z",
    "retryAfterSeconds": null
  },
  "requestNumber": 3
}
```

**Headers**
```http
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1705315210
```

**Response (429 Too Many Requests - Limited)**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "allowed": false,
  "bucket": {
    "remaining": 0,
    "limit": 10,
    "resetAt": "2024-01-15T10:00:10Z",
    "retryAfterSeconds": 7
  },
  "message": "Rate limit exceeded. Please retry after 7 seconds."
}
```

**Headers**
```http
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1705315210
Retry-After: 7
```

#### Send Burst (Demo Helper)
```http
POST /api/demo/ratelimit/burst
Content-Type: application/json

{
  "count": 15,
  "delayMs": 50
}
```

**Response**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "results": [
    { "requestNumber": 1, "allowed": true, "remaining": 9 },
    { "requestNumber": 2, "allowed": true, "remaining": 8 },
    // ...
    { "requestNumber": 11, "allowed": false, "remaining": 0, "retryAfter": 8 },
    // ...
  ],
  "summary": {
    "total": 15,
    "allowed": 10,
    "rejected": 5
  }
}
```

---

## Shared Types

### TypeScript Types for Frontend

```typescript
// src/lib/api/types.ts

export interface DemoSession {
  sessionId: string;
  createdAt: string;
  expiresAt: string;
}

export interface ApiResponse<T> {
  sessionId: string;
  data: T;
  timestamp: string;
}

export interface ApiError {
  status: number;
  error: string;
  message: string;
  details?: Record<string, unknown>;
}

// Demo-specific types
export interface SagaDemoState {
  sessionId: string;
  orderId: string;
  steps: SagaStep[];
  isComplete: boolean;
  isFailed: boolean;
  isCompensating: boolean;
}

export interface SagaStep {
  name: string;
  service: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'compensating';
  timestamp?: string;
  durationMs?: number;
  error?: string;
}

export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  successCount: number;
  rejectedCount: number;
  lastStateChange: string;
  retryAfterSeconds?: number;
}

export interface CacheState {
  key: string;
  value: unknown;
  source: 'L1' | 'L2' | 'database';
  ttlSeconds: number;
  version: number;
}

export interface RateLimitState {
  remaining: number;
  limit: number;
  resetAt: string;
  isLimited: boolean;
}
```

---

## Error Handling

### Standard Error Response

```json
{
  "error": "ErrorCode",
  "message": "Human-readable error message",
  "details": {
    "field": "Additional context"
  },
  "traceId": "abc123"
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `ValidationError` | 400 | Invalid request payload |
| `SessionNotFound` | 404 | Demo session expired or invalid |
| `ConcurrencyConflict` | 409 | Optimistic locking conflict |
| `RateLimitExceeded` | 429 | Too many requests |
| `CircuitOpen` | 503 | Circuit breaker is open |
| `ServiceUnavailable` | 503 | Downstream service unavailable |
| `InternalError` | 500 | Unexpected server error |

### Frontend Error Handling

```typescript
// src/lib/api/errors.ts

export function handleDemoError(error: unknown): string {
  if (error instanceof DemoApiError) {
    switch (error.status) {
      case 409:
        return 'Conflict detected - another request modified this resource';
      case 429:
        return 'Rate limited - please wait before retrying';
      case 503:
        return 'Service temporarily unavailable (circuit open)';
      default:
        return error.message;
    }
  }
  return 'An unexpected error occurred';
}
```

---

## Session Management

All demos use session IDs to:
1. Correlate SignalR events with specific demo runs
2. Isolate demo state between users
3. Enable cleanup of demo resources

Sessions expire after 10 minutes of inactivity.

```typescript
// Session auto-generation
const sessionId = crypto.randomUUID();

// Include in all requests
headers: {
  'X-Demo-Session': sessionId
}
```

---

## Next Steps

1. [ ] Create shared React hooks (`useDemo`, `useSignalR`)
2. [ ] Implement API client with proper error handling
3. [ ] Update each demo component to use real API
4. [ ] Add loading states and error boundaries
5. [ ] Test with local backend
6. [ ] Deploy and verify CORS
