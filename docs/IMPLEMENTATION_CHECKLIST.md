# Implementation Checklist

## Overview

This checklist tracks the implementation of all 9 demos connecting the portfolio site to the RitualWorks backend.

**Documents Created:**
- `docs/DEMO_API_INTEGRATION.md` - Full API specification for all demos
- `docs/TECHNICAL_DELIVERY_PLAN.md` - Original technical plan
- `src/lib/api/demo-client.ts` - API client for all demo endpoints
- `src/lib/api/signalr.ts` - SignalR connection manager
- `src/hooks/useDemo.ts` - React hooks for each demo

**RitualWorks Integration Plan:**
- `ritualworks/docs/DEMO_INTEGRATION_PLAN.md` - Backend integration plan

---

## Phase 1: Backend Infrastructure

### 1.1 SignalR Hub Setup
- [ ] Create `/src/Api/Hubs/DemoHub.cs`
- [ ] Create `/src/Application/Interfaces/IDemoHubNotifier.cs`
- [ ] Create `/src/Api/Hubs/SignalRDemoHubNotifier.cs`
- [ ] Register SignalR services in `InfrastructureExtensions.cs`
- [ ] Map hub endpoint in `MiddlewareExtensions.cs`: `app.MapHub<DemoHub>("/hubs/demo")`

### 1.2 Demo Controller Skeleton
- [ ] Create `/src/Api/Controllers/DemoController.cs`
- [ ] Add demo endpoint stubs for all 9 demos
- [ ] Configure CORS for portfolio site origins

### 1.3 Demo Options
- [ ] Create `/src/Infrastructure/Options/DemoOptions.cs`
- [ ] Add to `appsettings.json`:
  ```json
  {
    "Demo": {
      "Enabled": true,
      "SessionTimeoutMinutes": 10
    }
  }
  ```

---

## Phase 2: Demo 1 - Saga (Checkout Flow)

**Uses existing infrastructure - minimal new code needed.**

### Backend
- [ ] Add `/api/demo/saga/start` endpoint to `DemoController`
- [ ] Add `/api/demo/saga/{sessionId}` GET endpoint
- [ ] Wire saga state changes to `DemoHub` notifications
- [ ] Add demo scenario support (success, stockFailure, paymentFailure)

### Frontend
- [ ] Update `CheckoutDemo.tsx` to use `useSagaDemo()` hook
- [ ] Connect to real API endpoints
- [ ] Add scenario selector (success/failure modes)
- [ ] Test SignalR real-time updates

### Validation
- [ ] Verify saga steps appear in real-time
- [ ] Verify compensation flow on failure
- [ ] Test with network latency

---

## Phase 3: Demo 2 - Event Flow (Outbox Pattern)

### Backend
- [ ] Create `DemoEventConsumer.cs` in `/src/Infrastructure/Messaging/Consumers/`
- [ ] Add `/api/demo/events/trigger` endpoint
- [ ] Emit SignalR events at each outbox stage:
  - Persisted to outbox
  - Dispatched by relay
  - Consumed
  - Acknowledged

### Frontend
- [ ] Update `EventFlowDemo.tsx` to use API
- [ ] Add pipeline visualization
- [ ] Show queue depth in real-time

### Validation
- [ ] Verify all 4 stages appear in order
- [ ] Test with message broker delays

---

## Phase 4: Demo 3 - Circuit Breaker

### Backend
- [ ] Create `DemoCircuitBreakerService.cs`
- [ ] Add `/api/demo/circuit/request` endpoint
- [ ] Add `/api/demo/circuit/toggle-failure` endpoint
- [ ] Add `/api/demo/circuit/reset` endpoint
- [ ] Track circuit state per session
- [ ] Emit SignalR events on state changes

### Frontend
- [ ] Update `CircuitBreakerDemo.tsx` to use `useCircuitBreakerDemo()` hook
- [ ] Add failure mode toggle
- [ ] Show state transitions (closed → open → half-open)

### Validation
- [ ] Verify circuit opens after 5 failures
- [ ] Verify half-open after timeout
- [ ] Verify reset functionality

---

## Phase 5: Demo 4 - Vault/Secrets

### Backend
- [ ] Add `/api/demo/vault/status` endpoint
- [ ] Add `/api/demo/vault/rotate` endpoint (demo rotation)
- [ ] Return mock rotation history
- [ ] Emit SignalR events during rotation stages

### Frontend
- [ ] Update `VaultRotationDemo.tsx` to use API
- [ ] Show TTL countdown
- [ ] Show rotation stages in real-time

### Validation
- [ ] Verify rotation events stream correctly
- [ ] Test grace period visualization

---

## Phase 6: Demo 5 - Idempotency

### Backend
- [ ] Create `IdempotencyService.cs` in `/src/Infrastructure/Demo/`
- [ ] Use Redis for idempotency key storage
- [ ] Add `/api/demo/idempotency/process` endpoint
- [ ] Add `/api/demo/idempotency/key/{key}` GET endpoint
- [ ] Track duplicate counts and TTL

### Frontend
- [ ] Update `IdempotencyDemo.tsx` to use `useIdempotencyDemo()` hook
- [ ] Show TTL countdown
- [ ] Show duplicate detection

### Validation
- [ ] Verify first request creates order
- [ ] Verify duplicate requests return cached result
- [ ] Verify TTL expiry allows new order

---

## Phase 7: Demo 6 - Cache Stampede

### Backend
- [ ] Create `DemoStampedeSimulator.cs`
- [ ] Add `/api/demo/cache/stampede` endpoint
- [ ] Support three modes: none, lock, probabilistic
- [ ] Use existing `HybridCache` infrastructure
- [ ] Track DB hit counts

### Frontend
- [ ] Update `CacheStampedeDemo.tsx` to use API
- [ ] Add mode selector
- [ ] Show side-by-side comparison
- [ ] Visualize DB hit counts

### Validation
- [ ] Verify 100 requests → 1 DB hit with lock protection
- [ ] Verify 100 requests → 100 DB hits without protection
- [ ] Compare latency metrics

---

## Phase 8: Demo 7 - Cache Invalidation

### Backend
- [ ] Add `/api/demo/cache/product/{id}` GET endpoint
- [ ] Add `/api/demo/cache/product/{id}` PUT endpoint
- [ ] Add `/api/demo/cache/product/{id}` DELETE endpoint
- [ ] Use `HybridCache` for caching
- [ ] Implement Redis pub/sub for invalidation broadcast
- [ ] Emit SignalR events for cache operations

### Frontend
- [ ] Update `CacheInvalidationDemo.tsx` to use `useCacheDemo()` hook
- [ ] Show TTL countdown
- [ ] Show cache hit/miss status
- [ ] Log invalidation events

### Validation
- [ ] Verify cache hits return quickly
- [ ] Verify update triggers invalidation
- [ ] Verify pub/sub broadcast

---

## Phase 9: Demo 8 - Optimistic Concurrency

### Backend
- [ ] Create `DemoInventory` entity with `RowVersion`
- [ ] Add migration for demo_inventory table
- [ ] Add `/api/demo/inventory/{id}` GET endpoint (returns ETag)
- [ ] Add `/api/demo/inventory/{id}` PUT endpoint (requires If-Match)
- [ ] Return 409 on version mismatch

### Frontend
- [ ] Update `ConcurrencyDemo.tsx` to use `useConcurrencyDemo()` hook
- [ ] Show version numbers
- [ ] Show conflict detection

### Validation
- [ ] Verify concurrent updates cause conflict
- [ ] Verify 409 response includes current state
- [ ] Test "Race Both Updates" flow

---

## Phase 10: Demo 9 - Rate Limiting

### Backend
- [ ] Create custom rate limit policy for demo (10 req/10s)
- [ ] Add `/api/demo/ratelimit/request` endpoint
- [ ] Add `/api/demo/ratelimit/burst` endpoint
- [ ] Return X-RateLimit-* headers
- [ ] Return Retry-After on 429

### Frontend
- [ ] Update `RateLimiterDemo.tsx` to use `useRateLimiterDemo()` hook
- [ ] Show token bucket visualization
- [ ] Show request log with status

### Validation
- [ ] Verify 10 requests allowed per 10s
- [ ] Verify 429 after exhaustion
- [ ] Verify Retry-After header

---

## Phase 11: Integration & Testing

### CORS Configuration
- [ ] Add portfolio site origins to CORS policy:
  ```csharp
  .WithOrigins(
    "http://localhost:4321",
    "https://chidionyema.dev"
  )
  ```

### End-to-End Testing
- [ ] Test all demos on localhost
- [ ] Test SignalR reconnection handling
- [ ] Test error states and fallbacks
- [ ] Test mobile responsiveness

### Performance
- [ ] Verify demo endpoints don't impact production
- [ ] Add rate limiting to demo endpoints
- [ ] Monitor SignalR connection count

---

## Phase 12: Deployment

### Backend Deployment
- [ ] Deploy RitualWorks with demo endpoints
- [ ] Verify SignalR WebSocket upgrade works
- [ ] Configure production CORS

### Frontend Deployment
- [ ] Update `.env.production` with API URLs
- [ ] Deploy portfolio site
- [ ] Verify cross-origin connectivity

### Monitoring
- [ ] Add demo-specific telemetry
- [ ] Monitor error rates
- [ ] Set up alerts for demo failures

---

## File Summary

### Portfolio Site (New Files)
```
src/
├── lib/api/
│   ├── demo-client.ts    ✅ Created
│   └── signalr.ts        ✅ Created
├── hooks/
│   └── useDemo.ts        ✅ Created
docs/
├── DEMO_API_INTEGRATION.md  ✅ Created
└── IMPLEMENTATION_CHECKLIST.md  ✅ Created (this file)
```

### RitualWorks (To Create)
```
src/
├── Api/
│   ├── Controllers/
│   │   └── DemoController.cs
│   └── Hubs/
│       └── DemoHub.cs
├── Application/
│   └── Interfaces/
│       └── IDemoHubNotifier.cs  ✅ Created
├── Infrastructure/
│   ├── Demo/
│   │   ├── IdempotencyService.cs
│   │   ├── DemoCircuitBreakerService.cs
│   │   ├── DemoCacheService.cs
│   │   └── DemoStampedeSimulator.cs
│   └── Options/
│       └── DemoOptions.cs
└── Domain/
    └── Entities/
        └── DemoInventory.cs
```

---

## Estimated Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Backend Infrastructure | 1 day | None |
| Phase 2: Saga Demo | 0.5 day | Phase 1 |
| Phase 3: Event Flow Demo | 1 day | Phase 1 |
| Phase 4: Circuit Breaker Demo | 1 day | Phase 1 |
| Phase 5: Vault Demo | 0.5 day | Phase 1 |
| Phase 6: Idempotency Demo | 1 day | Phase 1 |
| Phase 7: Stampede Demo | 1 day | Phase 1 |
| Phase 8: Cache Invalidation Demo | 1 day | Phase 1 |
| Phase 9: Concurrency Demo | 1 day | Phase 1 |
| Phase 10: Rate Limit Demo | 0.5 day | Phase 1 |
| Phase 11: Integration & Testing | 1 day | All phases |
| Phase 12: Deployment | 0.5 day | Phase 11 |

**Total: ~10 days**

---

## Success Criteria

For each demo:
1. ✅ Real API calls (not mock data)
2. ✅ Real-time updates via SignalR
3. ✅ Proper error handling
4. ✅ Works on localhost and production
5. ✅ Mobile responsive
6. ✅ Sub-second latency for interactions
