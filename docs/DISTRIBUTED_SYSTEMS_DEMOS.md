# Distributed Systems Demos - Implementation Plan

**Version:** 1.0
**Status:** Ready for Implementation

---

## Overview

These demos showcase real distributed systems challenges with **live backend integration**. Each demo connects to the deployed .NET API and demonstrates actual behavior, not simulations.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Cloudflare Pages)                  │
│                                                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │ Idempotency │ │   Cache     │ │    Rate     │               │
│  │    Demo     │ │  Stampede   │ │   Limiter   │               │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘               │
│         │               │               │                       │
│         └───────────────┼───────────────┘                       │
│                         │                                       │
│                    SignalR + REST                               │
│                         │                                       │
└─────────────────────────┼───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Fly.io - .NET 9)                    │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Demo Controller                        │  │
│  │  /api/demo/idempotency/*                                 │  │
│  │  /api/demo/cache/*                                       │  │
│  │  /api/demo/concurrency/*                                 │  │
│  │  /api/demo/ratelimit/*                                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                         │                                       │
│         ┌───────────────┼───────────────┐                       │
│         │               │               │                       │
│         ▼               ▼               ▼                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │   Upstash   │ │    Neon     │ │  CloudAMQP  │               │
│  │    Redis    │ │ PostgreSQL  │ │  RabbitMQ   │               │
│  │             │ │             │ │             │               │
│  │ • Idempotency│ │ • RowVersion│ │ • Events    │               │
│  │ • Cache     │ │ • Inventory │ │             │               │
│  │ • Rate Limit│ │             │ │             │               │
│  │ • Locks     │ │             │ │             │               │
│  └─────────────┘ └─────────────┘ └─────────────┘               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Demo 1: Idempotency

### The Problem

In distributed systems, network failures mean requests can be retried. Without idempotency:
- User clicks "Pay" twice → charged twice
- Retry after timeout → duplicate order
- Webhook delivered twice → double processing

### The Solution

Every mutating request includes an **idempotency key**. The server:
1. Checks if key exists in Redis
2. If exists: return cached response (no side effects)
3. If not: process request, store result with TTL

### API Specification

```
POST /api/demo/idempotency/order
Headers:
  Idempotency-Key: {client-generated-uuid}
Body:
  { "amount": 99.99, "item": "Demo Product" }

Response (first request):
  201 Created
  { "orderId": "...", "status": "created", "cached": false }

Response (duplicate request, same key):
  200 OK
  { "orderId": "...", "status": "created", "cached": true }
```

### Backend Implementation

```csharp
// POST /api/demo/idempotency/order
[HttpPost("idempotency/order")]
public async Task<IActionResult> CreateIdempotentOrder(
    [FromHeader(Name = "Idempotency-Key")] string idempotencyKey,
    [FromBody] CreateOrderRequest request,
    CancellationToken ct)
{
    // 1. Check Redis for existing result
    var cacheKey = $"idempotency:{idempotencyKey}";
    var cached = await _redis.StringGetAsync(cacheKey);

    if (cached.HasValue)
    {
        await _broadcaster.BroadcastAsync("IdempotencyHit", new {
            Key = idempotencyKey,
            Message = "Duplicate request blocked"
        });

        var result = JsonSerializer.Deserialize<OrderResult>(cached!);
        return Ok(result with { Cached = true });
    }

    // 2. Process the order
    var orderId = Guid.NewGuid();
    var result = new OrderResult(orderId, "created", false);

    // 3. Store result with 5 minute TTL
    await _redis.StringSetAsync(
        cacheKey,
        JsonSerializer.Serialize(result),
        TimeSpan.FromMinutes(5)
    );

    await _broadcaster.BroadcastAsync("IdempotencyMiss", new {
        Key = idempotencyKey,
        OrderId = orderId,
        Message = "New order created"
    });

    return Created($"/orders/{orderId}", result);
}
```

### Redis Data Structure

```
Key: idempotency:{uuid}
Value: {"orderId":"...","status":"created","cached":false}
TTL: 300 seconds (5 minutes)
```

### Frontend Component

Shows:
- Input for idempotency key (auto-generated or custom)
- Multiple "Create Order" buttons to simulate duplicates
- Visual counter: "Orders Created: 1 (despite N requests)"
- Redis key TTL countdown
- Real-time event log via SignalR

---

## Demo 2: Cache Stampede Prevention

### The Problem

When a popular cache key expires:
1. 1000 concurrent requests arrive
2. All see cache miss
3. All query database simultaneously
4. Database overwhelmed → cascade failure

Also known as: **Thundering Herd**, **Dog-Pile Effect**

### The Solution

**Option A: Distributed Lock**
- First request acquires lock, rebuilds cache
- Other requests wait for lock release, then read cache

**Option B: Probabilistic Early Refresh**
- Cache items refresh randomly before expiry
- Spreads rebuild load over time

### API Specification

```
POST /api/demo/cache/stampede
Body:
  {
    "requestCount": 100,
    "protection": "none" | "lock" | "probabilistic",
    "simulatedDbLatency": 50
  }

Response:
  {
    "dbHits": 100,        // Without protection
    "dbHits": 1,          // With lock protection
    "cacheHits": 99,
    "totalTimeMs": 2340,  // Without protection
    "totalTimeMs": 85     // With protection
  }
```

### Backend Implementation

```csharp
[HttpPost("cache/stampede")]
public async Task<IActionResult> SimulateStampede(
    [FromBody] StampedeRequest request,
    CancellationToken ct)
{
    var cacheKey = "demo:stampede:product";
    var lockKey = "demo:stampede:lock";

    // Clear cache to simulate expiry
    await _redis.KeyDeleteAsync(cacheKey);

    var dbHits = 0;
    var cacheHits = 0;
    var sw = Stopwatch.StartNew();

    var tasks = Enumerable.Range(0, request.RequestCount)
        .Select(async i =>
        {
            if (request.Protection == "lock")
            {
                return await GetWithLock(cacheKey, lockKey, request.SimulatedDbLatency);
            }
            else if (request.Protection == "probabilistic")
            {
                return await GetWithProbabilisticRefresh(cacheKey, request.SimulatedDbLatency);
            }
            else
            {
                return await GetNoProtection(cacheKey, request.SimulatedDbLatency);
            }
        });

    var results = await Task.WhenAll(tasks);

    dbHits = results.Count(r => r.WasDbHit);
    cacheHits = results.Count(r => !r.WasDbHit);

    await _broadcaster.BroadcastAsync("StampedeResult", new {
        Protection = request.Protection,
        DbHits = dbHits,
        CacheHits = cacheHits,
        TotalTimeMs = sw.ElapsedMilliseconds
    });

    return Ok(new {
        DbHits = dbHits,
        CacheHits = cacheHits,
        TotalTimeMs = sw.ElapsedMilliseconds,
        Protection = request.Protection
    });
}

private async Task<CacheResult> GetWithLock(string cacheKey, string lockKey, int dbLatency)
{
    // Try cache first
    var cached = await _redis.StringGetAsync(cacheKey);
    if (cached.HasValue)
        return new CacheResult(false);

    // Acquire distributed lock
    var lockAcquired = await _redis.LockTakeAsync(lockKey, "1", TimeSpan.FromSeconds(10));

    if (lockAcquired)
    {
        try
        {
            // Double-check cache
            cached = await _redis.StringGetAsync(cacheKey);
            if (cached.HasValue)
                return new CacheResult(false);

            // Simulate DB query
            await Task.Delay(dbLatency);

            // Populate cache
            await _redis.StringSetAsync(cacheKey, "data", TimeSpan.FromMinutes(5));
            return new CacheResult(true);
        }
        finally
        {
            await _redis.LockReleaseAsync(lockKey, "1");
        }
    }
    else
    {
        // Wait for lock holder to populate cache
        await Task.Delay(dbLatency + 10);
        return new CacheResult(false);
    }
}
```

### Frontend Component

Shows:
- Three buttons: "No Protection", "With Lock", "Probabilistic"
- Side-by-side comparison visualization
- DB hits counter (animated)
- Total time comparison
- Visual explanation of the pattern

---

## Demo 3: Cache Invalidation

### The Problem

> "There are only two hard things in Computer Science: cache invalidation and naming things."

When data changes:
- How do all cache instances know?
- How do we avoid serving stale data?
- How do we avoid thundering herd on invalidation?

### The Solution

**Write-Through with Pub/Sub Invalidation:**
1. Write to database
2. Publish invalidation message to Redis pub/sub
3. All instances receive message, clear local cache
4. Next read populates cache from DB

### API Specification

```
GET /api/demo/cache/product/{id}
Response:
  {
    "id": "123",
    "name": "Widget",
    "price": 49.99,
    "cacheStatus": "hit" | "miss",
    "cachedAt": "2024-01-01T12:00:00Z",
    "ttlSeconds": 298
  }

PUT /api/demo/cache/product/{id}
Body:
  { "name": "Widget Pro", "price": 59.99 }
Response:
  { "invalidatedInstances": 2, "newVersion": "v8" }

POST /api/demo/cache/invalidate/{id}
Response:
  { "invalidated": true, "key": "product:123" }
```

### Backend Implementation

```csharp
[HttpPut("cache/product/{id}")]
public async Task<IActionResult> UpdateProduct(
    string id,
    [FromBody] UpdateProductRequest request,
    CancellationToken ct)
{
    // 1. Update database
    var product = await _db.Products.FindAsync(id, ct);
    product.Name = request.Name;
    product.Price = request.Price;
    product.Version++;
    await _db.SaveChangesAsync(ct);

    // 2. Invalidate cache
    var cacheKey = $"product:{id}";
    await _redis.KeyDeleteAsync(cacheKey);

    // 3. Publish invalidation to all instances
    await _redis.PublishAsync("cache:invalidate", cacheKey);

    // 4. Broadcast to UI
    await _broadcaster.BroadcastAsync("CacheInvalidated", new {
        Key = cacheKey,
        NewVersion = $"v{product.Version}",
        InvalidatedAt = DateTime.UtcNow
    });

    return Ok(new {
        InvalidatedInstances = 2, // Simulated for demo
        NewVersion = $"v{product.Version}"
    });
}

// Background service subscribes to invalidation channel
public class CacheInvalidationSubscriber : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        var sub = _redis.GetSubscriber();
        await sub.SubscribeAsync("cache:invalidate", (channel, message) =>
        {
            _logger.LogInformation("Cache invalidated: {Key}", message);
            // Clear local memory cache if applicable
        });
    }
}
```

### Frontend Component

Shows:
- Current product state with cache status indicator
- "Read" button showing HIT/MISS
- "Update" button triggering invalidation
- Real-time log of invalidation events across "instances"
- TTL countdown bar

---

## Demo 4: Optimistic Concurrency

### The Problem

Two users edit the same record simultaneously:
1. User A reads: Stock = 100
2. User B reads: Stock = 100
3. User A saves: Stock = 90 (sold 10)
4. User B saves: Stock = 95 (sold 5)
5. **Result: Stock = 95, but 15 were sold!**

### The Solution

**Optimistic Locking with Version/ETag:**
- Each record has a version number (or timestamp)
- On update, check version matches
- If mismatch: reject update, force refresh

### API Specification

```
GET /api/demo/concurrency/inventory/{id}
Response:
  {
    "id": "123",
    "name": "Widget",
    "quantity": 50,
    "version": "v7",
    "etag": "abc123"
  }

PUT /api/demo/concurrency/inventory/{id}
Headers:
  If-Match: "abc123"
Body:
  { "quantity": 45 }

Response (success):
  200 OK
  { "quantity": 45, "version": "v8", "etag": "def456" }

Response (conflict):
  409 Conflict
  {
    "error": "Version mismatch",
    "currentQuantity": 48,
    "currentVersion": "v8",
    "yourVersion": "v7"
  }
```

### Backend Implementation

```csharp
public class InventoryItem
{
    public string Id { get; set; }
    public string Name { get; set; }
    public int Quantity { get; set; }

    [Timestamp]
    public byte[] RowVersion { get; set; }  // EF Core concurrency token
}

[HttpPut("concurrency/inventory/{id}")]
public async Task<IActionResult> UpdateInventory(
    string id,
    [FromHeader(Name = "If-Match")] string etag,
    [FromBody] UpdateInventoryRequest request,
    CancellationToken ct)
{
    var item = await _db.Inventory.FindAsync(id, ct);

    // Check version matches
    var currentEtag = Convert.ToBase64String(item.RowVersion);
    if (currentEtag != etag)
    {
        await _broadcaster.BroadcastAsync("ConcurrencyConflict", new {
            ItemId = id,
            ExpectedVersion = etag,
            ActualVersion = currentEtag,
            CurrentQuantity = item.Quantity
        });

        return Conflict(new {
            Error = "Version mismatch",
            CurrentQuantity = item.Quantity,
            CurrentVersion = currentEtag,
            YourVersion = etag
        });
    }

    try
    {
        item.Quantity = request.Quantity;
        await _db.SaveChangesAsync(ct);

        var newEtag = Convert.ToBase64String(item.RowVersion);

        await _broadcaster.BroadcastAsync("ConcurrencySuccess", new {
            ItemId = id,
            OldVersion = etag,
            NewVersion = newEtag,
            NewQuantity = item.Quantity
        });

        return Ok(new {
            Quantity = item.Quantity,
            Version = newEtag
        });
    }
    catch (DbUpdateConcurrencyException)
    {
        // Another request beat us - reload and return conflict
        await _db.Entry(item).ReloadAsync(ct);

        return Conflict(new {
            Error = "Concurrent modification detected",
            CurrentQuantity = item.Quantity,
            CurrentVersion = Convert.ToBase64String(item.RowVersion)
        });
    }
}
```

### Frontend Component

Shows:
- Two "user" panels side by side
- Both read same initial value
- Both can modify independently
- "Race Both Updates" button
- Visual result: one succeeds, one gets conflict
- Explanation of resolution strategy

---

## Demo 5: Rate Limiting

### The Problem

Without rate limiting:
- Bots scrape your API
- Single user exhausts resources
- DDoS attacks succeed
- Costs explode (pay-per-request services)

### The Solution

**Token Bucket / Sliding Window:**
- Each client has a "bucket" of tokens
- Each request consumes a token
- Tokens replenish over time
- When empty: 429 Too Many Requests

### API Specification

```
POST /api/demo/ratelimit/request
Headers:
  X-Client-Id: {client-identifier}

Response (allowed):
  200 OK
  X-RateLimit-Limit: 10
  X-RateLimit-Remaining: 7
  X-RateLimit-Reset: 1704067200
  { "allowed": true, "remaining": 7 }

Response (exceeded):
  429 Too Many Requests
  Retry-After: 5
  X-RateLimit-Limit: 10
  X-RateLimit-Remaining: 0
  X-RateLimit-Reset: 1704067200
  { "allowed": false, "retryAfter": 5 }

GET /api/demo/ratelimit/status
Response:
  {
    "limit": 10,
    "remaining": 7,
    "resetAt": "2024-01-01T12:01:00Z",
    "windowSeconds": 10
  }
```

### Backend Implementation

```csharp
// Using .NET 7+ built-in rate limiting with Redis backing
builder.Services.AddRateLimiter(options =>
{
    options.AddPolicy("demo", context =>
        RateLimitPartition.GetSlidingWindowLimiter(
            partitionKey: context.Request.Headers["X-Client-Id"].ToString(),
            factory: _ => new SlidingWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromSeconds(10),
                SegmentsPerWindow = 2
            }));

    options.OnRejected = async (context, token) =>
    {
        context.HttpContext.Response.StatusCode = 429;
        context.HttpContext.Response.Headers["Retry-After"] = "5";

        await context.HttpContext.Response.WriteAsJsonAsync(new {
            Allowed = false,
            RetryAfter = 5
        }, token);
    };
});

[HttpPost("ratelimit/request")]
[EnableRateLimiting("demo")]
public async Task<IActionResult> RateLimitedEndpoint()
{
    // Get current rate limit status from Redis
    var clientId = Request.Headers["X-Client-Id"].ToString();
    var key = $"ratelimit:{clientId}";
    var remaining = await _redis.StringGetAsync(key);

    await _broadcaster.BroadcastAsync("RateLimitRequest", new {
        ClientId = clientId,
        Allowed = true,
        Remaining = remaining
    });

    return Ok(new {
        Allowed = true,
        Remaining = remaining
    });
}
```

### Redis Data Structure (Sliding Window)

```
Key: ratelimit:{clientId}:{windowStart}
Value: request count in this segment
TTL: window duration

Example (10 req/10s with 2 segments):
  ratelimit:abc123:1704067200 = 3  (first 5 seconds)
  ratelimit:abc123:1704067205 = 4  (second 5 seconds)
  Total in window: 7, Remaining: 3
```

### Frontend Component

Shows:
- Token bucket visualization (filling/draining)
- "Send Request" buttons (1, 5, 20 burst)
- Request log with status codes
- Remaining tokens counter
- Auto-refill animation
- Retry-After countdown when limited

---

## Frontend Performance Requirements

All demos must be **blazing fast**:

### Mandatory Patterns

1. **No Framer Motion** - Use CSS animations only
2. **React.lazy()** - Each demo lazy loaded
3. **CSS transforms** - GPU-accelerated animations
4. **Suspense fallbacks** - Lightweight loading states
5. **No heavy dependencies** - Vanilla React + CSS

### Animation Patterns

```css
/* GPU-accelerated fade-in */
@keyframes fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fade-in 0.3s ease-out forwards;
}

/* Progress bar animation */
.progress-bar {
  transition: width 0.3s ease-out;
  will-change: width;
}

/* Pulse for active states */
.animate-pulse-slow {
  animation: pulse 3s ease-in-out infinite;
}
```

### Component Size Budget

| Component | Max Bundle Size |
|-----------|-----------------|
| IdempotencyDemo | < 5KB |
| CacheStampedeDemo | < 6KB |
| CacheInvalidationDemo | < 5KB |
| ConcurrencyDemo | < 6KB |
| RateLimiterDemo | < 5KB |

---

## SignalR Events

All demos broadcast events to the shared SignalR hub:

| Event | Payload | Demo |
|-------|---------|------|
| `IdempotencyHit` | `{ key, message }` | Idempotency |
| `IdempotencyMiss` | `{ key, orderId, message }` | Idempotency |
| `StampedeResult` | `{ protection, dbHits, cacheHits, totalTimeMs }` | Cache Stampede |
| `CacheInvalidated` | `{ key, newVersion, invalidatedAt }` | Cache Invalidation |
| `CacheHit` | `{ key, ttlSeconds }` | Cache Invalidation |
| `CacheMiss` | `{ key }` | Cache Invalidation |
| `ConcurrencyConflict` | `{ itemId, expectedVersion, actualVersion }` | Concurrency |
| `ConcurrencySuccess` | `{ itemId, oldVersion, newVersion }` | Concurrency |
| `RateLimitRequest` | `{ clientId, allowed, remaining }` | Rate Limiter |
| `RateLimitExceeded` | `{ clientId, retryAfter }` | Rate Limiter |

---

## Implementation Checklist

### Backend (haworks-platform repo)

- [ ] Add `DemoController` endpoints for all 5 demos
- [ ] Implement Redis-backed idempotency
- [ ] Implement distributed lock for cache stampede
- [ ] Implement pub/sub cache invalidation
- [ ] Add EF Core RowVersion to demo entities
- [ ] Configure .NET rate limiting with Redis
- [ ] Add SignalR broadcast calls to all endpoints
- [ ] Write integration tests with Testcontainers

### Frontend (portfolio-site repo)

- [ ] Create `IdempotencyDemo.tsx`
- [ ] Create `CacheStampedeDemo.tsx`
- [ ] Create `CacheInvalidationDemo.tsx`
- [ ] Create `ConcurrencyDemo.tsx`
- [ ] Create `RateLimiterDemo.tsx`
- [ ] Add lazy loading to `DemoHubLite.tsx`
- [ ] Create shared hooks for API calls
- [ ] Add CSS animations
- [ ] Test performance (Lighthouse)

### Documentation

- [ ] Add deep-dive posts for each pattern
- [ ] Link demos to code in GitHub
- [ ] Add "How It Works" sections to each demo

---

## Deployment

### Environment Variables

```bash
# Frontend (.env)
PUBLIC_API_URL=https://api.chidionyema.dev

# Backend (Fly.io secrets)
REDIS_URL=redis://...upstash.io
DATABASE_URL=postgres://...neon.tech
```

### API Endpoints Base

All demo endpoints live under:
```
https://api.chidionyema.dev/api/demo/
```

With CORS configured for:
- `https://chidionyema.dev`
- `http://localhost:4321` (dev)
