# Technical Delivery Plan - Portfolio Showcase

**Version:** 1.0
**Status:** Master Implementation Guide
**Goal:** Deliver on every feature showcased in the UI

---

## Executive Summary

The portfolio UI showcases **9 interactive demos** demonstrating distributed systems expertise. This document is the **complete technical blueprint** to make every demo functional with real backend infrastructure.

### What We're Delivering

| Category | Features | Status |
|----------|----------|--------|
| **Core Demos** | 9 interactive demonstrations | UI Complete, Backend Pending |
| **Real-time** | SignalR event streaming | Spec Complete |
| **Infrastructure** | PostgreSQL, Redis, RabbitMQ | Spec Complete |
| **Observability** | Grafana metrics dashboard | Spec Complete |
| **Content** | 6 technical deep-dive posts | Planned |

---

## Part 1: Feature Inventory

### 1.1 All UI Features Requiring Backend

| # | Feature | UI Component | Backend Required | Infrastructure |
|---|---------|--------------|------------------|----------------|
| 1 | Saga/Checkout Flow | `CheckoutDemo.tsx` | Order API, Event publishing | PostgreSQL, RabbitMQ |
| 2 | Event Flow Visualization | `EventFlowDemo.tsx` | SignalR hub, MassTransit consumers | RabbitMQ, SignalR |
| 3 | Circuit Breaker | `CircuitBreakerDemo.tsx` | Polly policies, state broadcasting | Redis (state), SignalR |
| 4 | Credential Rotation | `VaultRotationDemo.tsx` | Rotation simulator, connection pool | Redis, SignalR |
| 5 | Idempotency | `IdempotencyDemo.tsx` | Redis idempotency keys | Redis |
| 6 | Cache Stampede | `CacheStampedeDemo.tsx` | Distributed locks, cache simulation | Redis |
| 7 | Cache Invalidation | `CacheInvalidationDemo.tsx` | Pub/sub, cache operations | Redis |
| 8 | Optimistic Concurrency | `ConcurrencyDemo.tsx` | EF Core RowVersion | PostgreSQL |
| 9 | Rate Limiting | `RateLimiterDemo.tsx` | .NET rate limiter + Redis backing | Redis |
| 10 | Real-time Events | All demos | SignalR hub | SignalR |
| 11 | Metrics Dashboard | Grafana embed | Prometheus metrics export | Grafana Cloud |
| 12 | Health Status | Hero stats | Health check endpoints | All services |

---

## Part 2: Infrastructure Architecture

### 2.1 Production Stack

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PRODUCTION ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                    CLOUDFLARE PAGES (Frontend)                      │ │
│  │                                                                      │ │
│  │  Astro Static Site                                                   │ │
│  │  ├── React Islands (lazy loaded)                                    │ │
│  │  ├── SignalR WebSocket connection                                   │ │
│  │  └── REST API calls                                                 │ │
│  │                                                                      │ │
│  │  URL: https://chidionyema.dev                                       │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                    │                                     │
│                                    │ HTTPS                               │
│                                    ▼                                     │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                      FLY.IO (.NET 9 API)                            │ │
│  │                                                                      │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │ │
│  │  │ Controllers │  │ SignalR Hub │  │ Background  │                 │ │
│  │  │ /api/demo/* │  │ /hubs/events│  │ Services    │                 │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                 │ │
│  │                                                                      │ │
│  │  ┌─────────────────────────────────────────────────────────────┐   │ │
│  │  │                    MassTransit + Outbox                      │   │ │
│  │  │              (Consumers broadcast to SignalR)                │   │ │
│  │  └─────────────────────────────────────────────────────────────┘   │ │
│  │                                                                      │ │
│  │  URL: https://api.chidionyema.dev                                   │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                    │                                     │
│         ┌──────────────────────────┼──────────────────────────┐         │
│         │                          │                          │         │
│         ▼                          ▼                          ▼         │
│  ┌─────────────┐           ┌─────────────┐           ┌─────────────┐   │
│  │    NEON     │           │   UPSTASH   │           │  CLOUDAMQP  │   │
│  │ PostgreSQL  │           │    Redis    │           │  RabbitMQ   │   │
│  │             │           │             │           │             │   │
│  │ • Orders    │           │ • Idempotency│          │ • Events    │   │
│  │ • Inventory │           │ • Cache     │           │ • Sagas     │   │
│  │ • Payments  │           │ • Locks     │           │             │   │
│  │ • Outbox    │           │ • Rate Limit│           │             │   │
│  └─────────────┘           └─────────────┘           └─────────────┘   │
│       FREE                      FREE                      FREE          │
│                                                                          │
│  ┌─────────────┐                                                        │
│  │   GRAFANA   │                                                        │
│  │    Cloud    │                                                        │
│  │             │                                                        │
│  │ • Metrics   │                                                        │
│  │ • Dashboard │                                                        │
│  └─────────────┘                                                        │
│       FREE                                                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Infrastructure Setup Checklist

| Service | Provider | Plan | Setup Steps | Secrets Needed |
|---------|----------|------|-------------|----------------|
| Domain | Cloudflare | ~£10/yr | Register, configure DNS | N/A |
| Frontend | Cloudflare Pages | Free | Connect GitHub repo | `CLOUDFLARE_API_TOKEN` |
| API | Fly.io | Free | `fly launch`, configure secrets | `FLY_API_TOKEN` |
| Database | Neon | Free | Create DB, run schema SQL | `DATABASE_URL` |
| Cache | Upstash | Free | Create Redis database | `REDIS_URL` |
| Queue | CloudAMQP | Free | Create instance | `RABBITMQ_URL` |
| Metrics | Grafana Cloud | Free | Create stack, dashboard | `GRAFANA_EMBED_URL` |

---

## Part 3: Backend API Specification

### 3.1 API Endpoint Summary

```
BASE URL: https://api.chidionyema.dev

/api/demo/
├── /checkout                    POST   - Initiate order saga
├── /reset                       POST   - Reset demo data
│
├── /idempotency/
│   └── /order                   POST   - Create order with idempotency key
│
├── /cache/
│   ├── /product/{id}            GET    - Read from cache
│   ├── /product/{id}            PUT    - Update + invalidate
│   ├── /invalidate/{id}         POST   - Manual invalidate
│   └── /stampede                POST   - Simulate cache stampede
│
├── /concurrency/
│   └── /inventory/{id}          GET    - Read with version
│   └── /inventory/{id}          PUT    - Update with optimistic lock
│
├── /ratelimit/
│   ├── /request                 POST   - Rate-limited endpoint
│   └── /status                  GET    - Current limit status
│
├── /circuit-breaker/
│   ├── /state                   GET    - Get circuit state
│   └── /fail                    POST   - Simulate failures
│
├── /credentials/
│   ├── /                        GET    - Current credential state
│   └── /rotate                  POST   - Force rotation
│
└── /outbox                      GET    - View outbox messages

/hubs/
└── /events                      WebSocket - SignalR event stream

/health                          GET    - Health check
/metrics                         GET    - Prometheus metrics
```

### 3.2 Detailed Endpoint Specifications

#### 3.2.1 Checkout/Saga Demo

```http
POST /api/demo/checkout
Content-Type: application/json

{
  "items": [
    { "productId": "prod-1", "quantity": 2 }
  ],
  "customerEmail": "demo@example.com",
  "idempotencyKey": "uuid-here"
}

Response 201:
{
  "orderId": "ord-uuid",
  "status": "processing",
  "sagaId": "saga-uuid"
}

SignalR Events Emitted:
- OrderCreated { orderId, timestamp }
- StockReserved { orderId, items }
- PaymentInitiated { orderId, amount }
- PaymentCompleted { orderId, paymentId }
- OrderConfirmed { orderId }
- SagaCompleted { sagaId, duration }
```

#### 3.2.2 Idempotency Demo

```http
POST /api/demo/idempotency/order
Headers:
  Idempotency-Key: abc-123-xyz
Content-Type: application/json

{
  "amount": 99.99,
  "item": "Demo Product"
}

Response 201 (first request):
{
  "orderId": "ord-uuid",
  "status": "created",
  "cached": false,
  "keyTTL": 300
}

Response 200 (duplicate request):
{
  "orderId": "ord-uuid",
  "status": "created",
  "cached": true,
  "keyTTL": 285
}

SignalR Events:
- IdempotencyMiss { key, orderId }
- IdempotencyHit { key, message: "Duplicate blocked" }
```

#### 3.2.3 Cache Stampede Demo

```http
POST /api/demo/cache/stampede
Content-Type: application/json

{
  "requestCount": 100,
  "protection": "none" | "lock" | "probabilistic",
  "simulatedDbLatencyMs": 50
}

Response 200:
{
  "protection": "lock",
  "dbHits": 1,
  "cacheHits": 99,
  "totalTimeMs": 65,
  "comparison": {
    "withoutProtection": { "dbHits": 100, "timeMs": 2340 }
  }
}

SignalR Events:
- StampedeStarted { requestCount, protection }
- StampedeComplete { dbHits, cacheHits, timeMs }
```

#### 3.2.4 Cache Invalidation Demo

```http
GET /api/demo/cache/product/123

Response 200:
{
  "id": "123",
  "name": "Widget Pro",
  "price": 49.99,
  "cacheStatus": "hit",
  "cachedAt": "2024-01-01T12:00:00Z",
  "ttlSeconds": 298,
  "version": 7
}

PUT /api/demo/cache/product/123
Content-Type: application/json

{
  "name": "Widget Pro Max",
  "price": 59.99
}

Response 200:
{
  "id": "123",
  "version": 8,
  "invalidatedAt": "2024-01-01T12:05:00Z",
  "publishedTo": "cache:invalidate"
}

SignalR Events:
- CacheHit { key, ttl }
- CacheMiss { key }
- CacheUpdated { key, version }
- CacheInvalidated { key, publishedTo }
```

#### 3.2.5 Concurrency Demo

```http
GET /api/demo/concurrency/inventory/widget-1

Response 200:
{
  "id": "widget-1",
  "name": "Widget Pro",
  "quantity": 50,
  "version": "v7",
  "etag": "abc123base64"
}

PUT /api/demo/concurrency/inventory/widget-1
Headers:
  If-Match: "abc123base64"
Content-Type: application/json

{
  "quantity": 45
}

Response 200 (success):
{
  "id": "widget-1",
  "quantity": 45,
  "version": "v8",
  "etag": "def456base64"
}

Response 409 (conflict):
{
  "error": "ConcurrencyConflict",
  "message": "Resource was modified by another request",
  "currentQuantity": 48,
  "currentVersion": "v8",
  "yourVersion": "v7",
  "suggestion": "Refresh and retry"
}

SignalR Events:
- ConcurrencySuccess { itemId, oldVersion, newVersion }
- ConcurrencyConflict { itemId, expectedVersion, actualVersion }
```

#### 3.2.6 Rate Limiter Demo

```http
POST /api/demo/ratelimit/request
Headers:
  X-Client-Id: demo-client-1

Response 200 (allowed):
Headers:
  X-RateLimit-Limit: 10
  X-RateLimit-Remaining: 7
  X-RateLimit-Reset: 1704067200

{
  "allowed": true,
  "remaining": 7,
  "limit": 10,
  "resetAt": "2024-01-01T12:01:00Z"
}

Response 429 (exceeded):
Headers:
  Retry-After: 5
  X-RateLimit-Limit: 10
  X-RateLimit-Remaining: 0

{
  "allowed": false,
  "remaining": 0,
  "retryAfter": 5,
  "message": "Rate limit exceeded"
}

GET /api/demo/ratelimit/status
Headers:
  X-Client-Id: demo-client-1

Response 200:
{
  "clientId": "demo-client-1",
  "limit": 10,
  "remaining": 7,
  "windowSeconds": 10,
  "resetAt": "2024-01-01T12:01:00Z"
}

SignalR Events:
- RateLimitRequest { clientId, allowed, remaining }
- RateLimitExceeded { clientId, retryAfter }
```

#### 3.2.7 Circuit Breaker Demo

```http
GET /api/demo/circuit-breaker/state

Response 200:
{
  "service": "payment",
  "state": "closed" | "open" | "half-open",
  "failureCount": 3,
  "threshold": 5,
  "lastFailure": "2024-01-01T12:00:00Z",
  "nextRetry": "2024-01-01T12:00:30Z"
}

POST /api/demo/circuit-breaker/fail

Response 200:
{
  "failuresTriggered": 5,
  "circuitState": "open",
  "message": "Circuit breaker opened"
}

POST /api/demo/circuit-breaker/request

Response 200 (circuit closed):
{
  "success": true,
  "latencyMs": 45
}

Response 503 (circuit open):
{
  "success": false,
  "error": "Circuit breaker is open",
  "retryAfter": 25
}

SignalR Events:
- CircuitStateChanged { service, oldState, newState }
- CircuitRequestAllowed { service, latencyMs }
- CircuitRequestRejected { service, state }
```

#### 3.2.8 Credential Rotation Demo

```http
GET /api/demo/credentials

Response 200:
{
  "currentVersion": "cred_v7",
  "username": "demo_user_7",
  "issuedAt": "2024-01-01T12:00:00Z",
  "expiresAt": "2024-01-01T12:00:45Z",
  "rotationDue": "2024-01-01T12:00:30Z",
  "ttlSeconds": 45,
  "remainingTTL": 32,
  "stats": {
    "totalRequests": 847,
    "requestsDuringLastRotation": 23,
    "failedDuringLastRotation": 0
  }
}

POST /api/demo/credentials/rotate

Response 200:
{
  "oldVersion": "cred_v7",
  "newVersion": "cred_v8",
  "rotatedAt": "2024-01-01T12:00:30Z",
  "connectionsDrained": 12
}

SignalR Events:
- CredentialRotating { oldVersion, newVersion }
- ConnectionPoolDraining { oldConnections }
- CredentialRotated { activeVersion, activeConnections }
- OldCredentialExpired { expiredVersion }
```

---

## Part 4: Database Schema

### 4.1 PostgreSQL Schema (Neon)

```sql
-- ===========================================
-- DEMO SCHEMA
-- ===========================================

CREATE SCHEMA IF NOT EXISTS demo;

-- Orders for checkout demo
CREATE TABLE demo.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_email VARCHAR(255) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    saga_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Order items
CREATE TABLE demo.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES demo.orders(id),
    product_id VARCHAR(50) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL
);

-- Inventory for concurrency demo
CREATE TABLE demo.inventory (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    version INT NOT NULL DEFAULT 1,
    row_version BYTEA,  -- For EF Core optimistic concurrency
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Products for cache demo
CREATE TABLE demo.products (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    version INT NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Credential rotation history
CREATE TABLE demo.credential_rotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    old_version VARCHAR(50),
    new_version VARCHAR(50) NOT NULL,
    rotated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    requests_during_rotation INT NOT NULL DEFAULT 0,
    failed_during_rotation INT NOT NULL DEFAULT 0,
    connections_drained INT NOT NULL DEFAULT 0
);

-- Event log for visualization
CREATE TABLE demo.event_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    aggregate_id VARCHAR(100),
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_event_log_created ON demo.event_log(created_at DESC);
CREATE INDEX idx_event_log_type ON demo.event_log(event_type);

-- MassTransit Outbox (auto-created but documented here)
-- This is created by MassTransit EF Core outbox
CREATE TABLE demo.outbox_message (
    message_id UUID PRIMARY KEY,
    message_type VARCHAR(255) NOT NULL,
    body JSONB NOT NULL,
    sent_time TIMESTAMPTZ,
    headers JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed data
INSERT INTO demo.inventory (id, name, quantity, version) VALUES
    ('widget-1', 'Widget Pro', 50, 1),
    ('gadget-1', 'Gadget Plus', 100, 1),
    ('device-1', 'Device Max', 25, 1);

INSERT INTO demo.products (id, name, price, version) VALUES
    ('prod-1', 'Widget Pro', 49.99, 1),
    ('prod-2', 'Gadget Plus', 29.99, 1),
    ('prod-3', 'Device Max', 99.99, 1);
```

### 4.2 Redis Data Structures (Upstash)

```
# Idempotency Keys
idempotency:{key}
  Type: STRING
  Value: JSON { orderId, status, createdAt }
  TTL: 300 seconds (5 minutes)

# Cache
cache:product:{id}
  Type: STRING
  Value: JSON { id, name, price, version, cachedAt }
  TTL: 300 seconds

# Cache Stampede Lock
lock:cache:product:{id}
  Type: STRING
  Value: "1"
  TTL: 10 seconds (lock timeout)

# Rate Limiting (Sliding Window)
ratelimit:{clientId}:{windowStart}
  Type: STRING
  Value: request count
  TTL: window duration

# Circuit Breaker State
circuit:{service}:state
  Type: STRING
  Value: "closed" | "open" | "half-open"

circuit:{service}:failures
  Type: STRING
  Value: failure count
  TTL: reset duration

# Credential Rotation
credentials:current
  Type: HASH
  Fields: version, username, issuedAt, expiresAt

credentials:stats
  Type: HASH
  Fields: totalRequests, lastRotationRequests, lastRotationFailures

# Pub/Sub Channels
cache:invalidate
  - Published when cache key invalidated
  - Payload: cache key name

credentials:rotation
  - Published when rotation occurs
  - Payload: { oldVersion, newVersion }
```

---

## Part 5: SignalR Event Streaming

### 5.1 Hub Implementation

```csharp
// EventStreamHub.cs

public class EventStreamHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, "demo-watchers");

        // Send current state on connect
        await Clients.Caller.SendAsync("Connected", new {
            ConnectionId = Context.ConnectionId,
            Timestamp = DateTime.UtcNow
        });

        await base.OnConnectedAsync();
    }

    public async Task SubscribeToDemo(string demoType)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"demo:{demoType}");
    }
}
```

### 5.2 Event Broadcaster Service

```csharp
// IDemoEventBroadcaster.cs

public interface IDemoEventBroadcaster
{
    Task BroadcastAsync<T>(string eventType, T payload);
    Task BroadcastToDemo<T>(string demoType, string eventType, T payload);
}

// DemoEventBroadcaster.cs

public class DemoEventBroadcaster : IDemoEventBroadcaster
{
    private readonly IHubContext<EventStreamHub> _hub;

    public async Task BroadcastAsync<T>(string eventType, T payload)
    {
        await _hub.Clients.Group("demo-watchers").SendAsync("EventReceived", new {
            Type = eventType,
            Payload = payload,
            Timestamp = DateTime.UtcNow,
            Id = Guid.NewGuid()
        });
    }

    public async Task BroadcastToDemo<T>(string demoType, string eventType, T payload)
    {
        await _hub.Clients.Group($"demo:{demoType}").SendAsync("EventReceived", new {
            Type = eventType,
            Demo = demoType,
            Payload = payload,
            Timestamp = DateTime.UtcNow,
            Id = Guid.NewGuid()
        });
    }
}
```

### 5.3 All SignalR Events

| Event | Demo | Payload |
|-------|------|---------|
| `Connected` | All | `{ connectionId, timestamp }` |
| `OrderCreated` | Saga | `{ orderId, customerId, amount }` |
| `StockReserved` | Saga | `{ orderId, items }` |
| `PaymentInitiated` | Saga | `{ orderId, amount }` |
| `PaymentCompleted` | Saga | `{ orderId, paymentId }` |
| `OrderConfirmed` | Saga | `{ orderId }` |
| `SagaCompleted` | Saga | `{ sagaId, durationMs }` |
| `OutboxEventStored` | Events | `{ messageId, type }` |
| `OutboxEventPublished` | Events | `{ messageId }` |
| `IdempotencyHit` | Idempotency | `{ key, message }` |
| `IdempotencyMiss` | Idempotency | `{ key, orderId }` |
| `StampedeStarted` | Stampede | `{ requestCount, protection }` |
| `StampedeComplete` | Stampede | `{ dbHits, cacheHits, timeMs }` |
| `CacheHit` | Cache | `{ key, ttl }` |
| `CacheMiss` | Cache | `{ key }` |
| `CacheInvalidated` | Cache | `{ key, version }` |
| `ConcurrencySuccess` | Concurrency | `{ itemId, oldVersion, newVersion }` |
| `ConcurrencyConflict` | Concurrency | `{ itemId, expected, actual }` |
| `RateLimitRequest` | RateLimit | `{ clientId, allowed, remaining }` |
| `RateLimitExceeded` | RateLimit | `{ clientId, retryAfter }` |
| `CircuitStateChanged` | Circuit | `{ service, oldState, newState }` |
| `CredentialRotating` | Vault | `{ oldVersion, newVersion }` |
| `CredentialRotated` | Vault | `{ activeVersion }` |
| `ConnectionPoolDraining` | Vault | `{ oldConnections }` |

---

## Part 6: Implementation Roadmap

### Phase 1: Infrastructure Setup (Day 1)

```bash
# 1. Domain & DNS
- Register chidionyema.dev at Cloudflare (~£10)
- Configure DNS records

# 2. Neon PostgreSQL
- Create account at neon.tech
- Create database "haworks-demo"
- Run schema SQL (Part 4.1)
- Note connection string

# 3. Upstash Redis
- Create account at upstash.com
- Create database "haworks-demo"
- Note UPSTASH_REDIS_URL

# 4. CloudAMQP RabbitMQ
- Create account at cloudamqp.com
- Create "Little Lemur" instance
- Note AMQP URL

# 5. Fly.io
- Create account, install flyctl
- Create app: fly apps create haworks-demo-api
- Set secrets (DATABASE_URL, REDIS_URL, RABBITMQ_URL)

# 6. Grafana Cloud
- Create account at grafana.com
- Create stack
- Create dashboard
- Get embed URL
```

### Phase 2: Core Backend (Days 2-4)

**Day 2: Project Setup & SignalR**
- [ ] Create `Demo` environment configuration
- [ ] Set up SignalR hub (`EventStreamHub`)
- [ ] Create `IDemoEventBroadcaster` service
- [ ] Configure CORS for frontend
- [ ] Deploy skeleton to Fly.io
- [ ] Test SignalR connection from frontend

**Day 3: Database & Core APIs**
- [ ] Set up EF Core with Neon connection
- [ ] Create demo entities (Order, Inventory, Product)
- [ ] Implement health check endpoint
- [ ] Implement `/api/demo/reset` endpoint
- [ ] Implement checkout/saga flow API
- [ ] Add MassTransit with outbox

**Day 4: Redis Integration**
- [ ] Set up StackExchange.Redis with Upstash
- [ ] Implement idempotency middleware
- [ ] Implement cache service
- [ ] Implement distributed lock service
- [ ] Implement rate limiter with Redis backing

### Phase 3: Demo Features (Days 5-7)

**Day 5: Idempotency & Cache**
- [ ] `/api/demo/idempotency/order` endpoint
- [ ] `/api/demo/cache/product/{id}` GET/PUT
- [ ] `/api/demo/cache/invalidate/{id}`
- [ ] Redis pub/sub for invalidation
- [ ] SignalR event broadcasting

**Day 6: Stampede & Concurrency**
- [ ] `/api/demo/cache/stampede` endpoint
- [ ] Distributed lock implementation
- [ ] Probabilistic early refresh
- [ ] `/api/demo/concurrency/inventory/{id}` GET/PUT
- [ ] EF Core RowVersion handling
- [ ] 409 conflict responses

**Day 7: Rate Limit & Circuit Breaker**
- [ ] `/api/demo/ratelimit/*` endpoints
- [ ] Sliding window implementation
- [ ] 429 responses with Retry-After
- [ ] `/api/demo/circuit-breaker/*` endpoints
- [ ] Polly circuit breaker integration
- [ ] State broadcasting

### Phase 4: Credential Rotation (Day 8)

- [ ] `CredentialRotationSimulator` service
- [ ] Background service for auto-rotation
- [ ] `/api/demo/credentials` endpoints
- [ ] Connection pool simulation
- [ ] "Zero failed requests" tracking
- [ ] SignalR rotation events

### Phase 5: Observability (Day 9)

- [ ] Add OpenTelemetry metrics
- [ ] Configure Prometheus endpoint
- [ ] Create Grafana dashboard
- [ ] Add dashboard panels:
  - Request rate
  - Error rate
  - Response time (P50, P95, P99)
  - Queue depth
  - Circuit breaker state
- [ ] Embed dashboard in frontend

### Phase 6: Frontend Integration (Day 10)

- [ ] Update `useSignalR` hook with real API URL
- [ ] Connect each demo to real endpoints
- [ ] Add error handling for API failures
- [ ] Add loading states
- [ ] Test all demos end-to-end

### Phase 7: Testing & Polish (Days 11-12)

- [ ] Write integration tests with Testcontainers
- [ ] Test all API endpoints
- [ ] Test SignalR reconnection
- [ ] Performance testing (Lighthouse)
- [ ] Mobile responsiveness check
- [ ] Error scenarios testing
- [ ] Update hero stats with real metrics

### Phase 8: Content (Days 13-14)

- [ ] Write deep-dive: "Transactional Outbox Pattern"
- [ ] Write deep-dive: "Idempotency in Distributed Systems"
- [ ] Write deep-dive: "Cache Stampede Prevention"
- [ ] Write deep-dive: "Optimistic Concurrency Control"
- [ ] Write deep-dive: "Rate Limiting Strategies"
- [ ] Write deep-dive: "Circuit Breaker Pattern"

---

## Part 7: Testing Strategy

### 7.1 Unit Tests

```csharp
// IdempotencyServiceTests.cs
public class IdempotencyServiceTests
{
    [Fact]
    public async Task CreateOrder_WithNewKey_ReturnsCreated()
    {
        // Arrange
        var redis = new Mock<IConnectionMultiplexer>();
        var service = new IdempotencyService(redis.Object);

        // Act
        var result = await service.CreateOrderAsync("key-1", request);

        // Assert
        Assert.False(result.Cached);
        Assert.NotNull(result.OrderId);
    }

    [Fact]
    public async Task CreateOrder_WithExistingKey_ReturnsCached()
    {
        // Arrange - key already exists

        // Act
        var result = await service.CreateOrderAsync("key-1", request);

        // Assert
        Assert.True(result.Cached);
    }
}
```

### 7.2 Integration Tests

```csharp
// DemoApiIntegrationTests.cs
public class DemoApiIntegrationTests : IClassFixture<DemoApiFixture>
{
    [Fact]
    public async Task Checkout_PublishesEventsToSignalR()
    {
        // Arrange
        var signalRConnection = await ConnectToHub();
        var events = new List<object>();
        signalRConnection.On("EventReceived", (object e) => events.Add(e));

        // Act
        await _client.PostAsync("/api/demo/checkout", checkoutRequest);
        await Task.Delay(1000); // Wait for events

        // Assert
        Assert.Contains(events, e => e.Type == "OrderCreated");
        Assert.Contains(events, e => e.Type == "SagaCompleted");
    }

    [Fact]
    public async Task RateLimit_Returns429AfterExceedingLimit()
    {
        // Act - send 15 requests
        var responses = new List<HttpResponseMessage>();
        for (int i = 0; i < 15; i++)
        {
            responses.Add(await _client.PostAsync("/api/demo/ratelimit/request", null));
        }

        // Assert
        Assert.Equal(10, responses.Count(r => r.StatusCode == HttpStatusCode.OK));
        Assert.Equal(5, responses.Count(r => r.StatusCode == HttpStatusCode.TooManyRequests));
    }
}
```

### 7.3 E2E Test Script

```bash
#!/bin/bash
# test-portfolio.sh

API_URL="https://api.chidionyema.dev"
SITE_URL="https://chidionyema.dev"

echo "=== Portfolio E2E Tests ==="

# Health check
echo "Testing health..."
curl -sf "$API_URL/health" || { echo "FAIL: Health check"; exit 1; }
echo "OK"

# Reset demo
echo "Testing reset..."
curl -sf -X POST "$API_URL/api/demo/reset" || { echo "FAIL: Reset"; exit 1; }
echo "OK"

# Idempotency
echo "Testing idempotency..."
KEY=$(uuidgen)
R1=$(curl -s -X POST "$API_URL/api/demo/idempotency/order" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $KEY" \
  -d '{"amount": 99.99}')
R2=$(curl -s -X POST "$API_URL/api/demo/idempotency/order" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $KEY" \
  -d '{"amount": 99.99}')

echo "$R1" | jq -e '.cached == false' > /dev/null || { echo "FAIL: First request"; exit 1; }
echo "$R2" | jq -e '.cached == true' > /dev/null || { echo "FAIL: Duplicate"; exit 1; }
echo "OK"

# Rate limiting
echo "Testing rate limiting..."
for i in {1..15}; do
  RESP=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$API_URL/api/demo/ratelimit/request" \
    -H "X-Client-Id: test-client")
  if [ "$i" -le 10 ]; then
    [ "$RESP" == "200" ] || { echo "FAIL: Request $i should be 200"; exit 1; }
  else
    [ "$RESP" == "429" ] || { echo "FAIL: Request $i should be 429"; exit 1; }
  fi
done
echo "OK"

# Frontend
echo "Testing frontend..."
curl -sf "$SITE_URL" > /dev/null || { echo "FAIL: Homepage"; exit 1; }
echo "OK"

echo "=== All tests passed! ==="
```

---

## Part 8: File Structure

### Backend (haworks-platform repo additions)

```
src/
├── Api/
│   ├── Controllers/
│   │   └── DemoController.cs           # All demo endpoints
│   ├── Hubs/
│   │   └── EventStreamHub.cs           # SignalR hub
│   └── appsettings.Demo.json           # Demo environment config
│
├── Infrastructure/
│   ├── Demo/
│   │   ├── Services/
│   │   │   ├── IdempotencyService.cs
│   │   │   ├── CacheService.cs
│   │   │   ├── DistributedLockService.cs
│   │   │   ├── RateLimitService.cs
│   │   │   ├── CredentialRotationSimulator.cs
│   │   │   └── DemoEventBroadcaster.cs
│   │   ├── BackgroundServices/
│   │   │   └── CredentialRotationBackgroundService.cs
│   │   └── DemoServiceExtensions.cs
│   │
│   └── Persistence/
│       └── DemoDbContext.cs            # Demo schema context

tests/
└── Integration/
    └── Demo/
        ├── IdempotencyTests.cs
        ├── CacheStampedeTests.cs
        ├── ConcurrencyTests.cs
        ├── RateLimitTests.cs
        └── CircuitBreakerTests.cs
```

### Frontend (portfolio-site repo)

```
src/
├── components/
│   ├── demo/
│   │   ├── CheckoutDemo.tsx            ✓ Complete
│   │   ├── EventFlowDemo.tsx           ✓ Complete
│   │   ├── CircuitBreakerDemo.tsx      ✓ Complete
│   │   ├── VaultRotationDemo.tsx       ✓ Complete
│   │   ├── IdempotencyDemo.tsx         ✓ Complete
│   │   ├── CacheStampedeDemo.tsx       ✓ Complete
│   │   ├── CacheInvalidationDemo.tsx   ✓ Complete
│   │   ├── ConcurrencyDemo.tsx         ✓ Complete
│   │   ├── RateLimiterDemo.tsx         ✓ Complete
│   │   └── DemoHubLite.tsx             ✓ Complete
│   │
│   └── hooks/
│       └── useSignalR.ts               → Update with real API
│
├── content/
│   └── deep-dives/
│       ├── transactional-outbox.mdx    → Write
│       ├── idempotency.mdx             → Write
│       ├── cache-patterns.mdx          → Write
│       ├── optimistic-concurrency.mdx  → Write
│       ├── rate-limiting.mdx           → Write
│       └── circuit-breaker.mdx         → Write
│
└── pages/
    ├── index.astro                      ✓ Complete
    ├── architecture.astro               → Add real diagrams
    └── deep-dives/
        └── [...slug].astro              → MDX rendering
```

---

## Part 9: Success Criteria

### Functional Requirements

| Demo | Success Criteria | Verification |
|------|------------------|--------------|
| Saga | Order flows through all stages, events visible in real-time | Click checkout, see 6 events |
| Event Flow | Outbox messages visible, published status updates | Watch outbox table update |
| Circuit Breaker | Opens after 5 failures, recovers after 30s | Click fail 5x, wait, verify |
| Vault | Zero failed requests during rotation | Watch counter stay at 0 |
| Idempotency | Duplicate requests return cached response | Click 3x, see 1 order |
| Cache Stampede | 1 DB hit with lock vs 100 without | Compare side-by-side |
| Cache Invalidation | Update triggers invalidation event | See pub/sub log |
| Concurrency | Conflict detected, 409 returned | Race two updates |
| Rate Limit | 429 after 10 requests | Send 15 rapid requests |

### Performance Requirements

| Metric | Target |
|--------|--------|
| Initial page load | < 2 seconds |
| Time to interactive | < 3 seconds |
| Demo response time | < 500ms |
| SignalR event latency | < 200ms |
| Lighthouse Performance | > 90 |

### Reliability Requirements

| Requirement | Implementation |
|-------------|----------------|
| SignalR reconnection | Automatic with exponential backoff |
| API error handling | Graceful degradation, user feedback |
| Demo reset | Clean state restoration |
| Rate limit fairness | Per-client sliding window |

---

## Part 10: Go-Live Checklist

### Pre-Launch

- [ ] All infrastructure provisioned
- [ ] All API endpoints working
- [ ] All demos functional end-to-end
- [ ] SignalR streaming working
- [ ] Grafana dashboard embedded
- [ ] Deep-dive posts written
- [ ] Mobile responsive verified
- [ ] Lighthouse score > 90
- [ ] E2E tests passing
- [ ] Error handling tested

### Launch Day

- [ ] DNS propagation confirmed
- [ ] HTTPS working
- [ ] API responding
- [ ] SignalR connecting
- [ ] Run full E2E test suite
- [ ] Monitor error rates
- [ ] Share on LinkedIn

### Post-Launch

- [ ] Monitor Grafana metrics
- [ ] Check error logs
- [ ] Gather feedback
- [ ] Iterate on content
- [ ] Add more deep-dives

---

## Summary

This document provides the **complete technical blueprint** to deliver every feature shown in the portfolio UI.

**Total Estimated Effort:** 14 days

**Monthly Cost:** ~£1 (domain only)

**Result:** A live, working demonstration of distributed systems expertise that hiring managers can interact with, proving you're in the top 2%.
