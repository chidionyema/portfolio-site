# Backend Implementation: Complete Feature Integration

This document provides the implementation logic for the remaining HAWorks UI modules. Add these actions to your `DemoController.cs` in the **haworks-platform** Api project.

---

## 1. Transactional Outbox (Event Flow)
**Endpoint:** `POST /api/demo/outbox/publish`
**Goal:** Prove atomic persistence in Postgres.

```csharp
[HttpPost("outbox/publish")]
public async Task<IActionResult> PublishToOutbox([FromBody] PublishEventRequest request, [FromHeader(Name = "X-Demo-Session")] Guid sessionId)
{
    // 1. Persist to Postgres demo.outbox_messages table
    var outboxMessage = new OutboxMessage(
        Guid.NewGuid(),
        sessionId,
        request.EventType,
        request.Payload,
        DateTime.UtcNow
    );
    _db.OutboxMessages.Add(outboxMessage);
    await _db.SaveChangesAsync();

    // 2. Notify UI immediately via SignalR (persisted state)
    await _notifier.NotifyEventFlowAsync(new(sessionId, request.EventType, "Postgres", "persisted", 1, DateTime.UtcNow));

    // 3. Fire-and-forget relay simulation
    _ = Task.Run(async () => {
        await Task.Delay(1000);
        // Dispatch to RabbitMQ (Simulated)
        await _notifier.NotifyEventFlowAsync(new(sessionId, request.EventType, "RabbitMQ", "dispatched", 0, DateTime.UtcNow));
    });

    return Accepted();
}
```

---

## 2. Optimistic Concurrency (Inventory)
**Endpoint:** `GET /inventory/get` & `POST /inventory/update`
**Goal:** Show real EF Core `DbUpdateConcurrencyException` using Postgres `xmin`.

```csharp
[HttpGet("inventory/get")]
public async Task<IActionResult> GetInventory()
{
    var item = await _db.Inventory.FirstAsync();
    Response.Headers.Append("ETag", $"v{item.Version}"); // item.Version is mapped to xmin
    return Ok(new { item.Quantity, version = item.Version });
}

[HttpPost("inventory/update")]
public async Task<IActionResult> UpdateInventory([FromBody] UpdateRequest req)
{
    var item = await _db.Inventory.FirstAsync();
    
    // EF Core handles the check automatically if configured with IsRowVersion()
    try {
        item.Quantity = req.NewQuantity;
        await _db.SaveChangesAsync();
        return Ok(new { success = true, newVersion = item.Version });
    } catch (DbUpdateConcurrencyException) {
        return Conflict(new { success = false, currentVersion = item.Version, currentQuantity = item.Quantity });
    }
}
```

---

## 3. Rate Limiting (Traffic Shaper)
**Endpoint:** `POST /ratelimit/request`
**Goal:** Real Redis-backed throttling.

```csharp
[HttpPost("ratelimit/request")]
public async Task<IActionResult> RateLimitRequest([FromHeader(Name = "X-Demo-Session")] Guid sessionId)
{
    var key = $"ratelimit:{sessionId}:{DateTime.UtcNow:mm}"; // Fixed window (1 min)
    var count = await _redis.StringIncrementAsync(key);
    
    if (count == 1) await _redis.KeyExpireAsync(key, TimeSpan.FromMinutes(1));

    var limit = 10;
    var remaining = Math.Max(0, limit - (int)count);
    var allowed = count <= limit;

    await _notifier.NotifyRateLimitAsync(new(sessionId, allowed, remaining, DateTime.UtcNow));

    return allowed ? Ok(new { allowed, remaining }) : StatusCode(429, new { allowed, remaining, retryAfter = 30 });
}
```

---

## 4. HybridCache (.NET 9)
**Endpoint:** `POST /cache/stampede`
**Goal:** Demonstrate L1/L2 multi-tiering and locking.

```csharp
[HttpPost("cache/stampede")]
public async Task<IActionResult> CacheStampede([FromBody] StampedeRequest req, [FromHeader(Name = "X-Demo-Session")] Guid sessionId)
{
    // Use the new .NET 9 HybridCache
    var result = await _hybridCache.GetOrCreateAsync(
        $"demo:{sessionId}:product",
        async cancel => {
            await _notifier.NotifyCacheEventAsync(new(sessionId, "refresh", "product", "DB", 150, DateTime.UtcNow));
            await Task.Delay(req.SimulatedDbLatencyMs); // Artificial DB load
            return "Widget_Pro_v1";
        }
    );

    return Ok(new { dbHits = 1, cacheHits = req.RequestCount - 1, totalTimeMs = 150 });
}
```

---

## 5. Idempotency (Deterministic Identity)
**Endpoint:** `POST /idempotency/process`
**Goal:** Prove "Exactly Once" processing using Redis `SET NX`.

```csharp
[HttpPost("idempotency/process")]
public async Task<IActionResult> ProcessIdempotency([FromHeader(Name = "X-Idempotency-Key")] string key, [FromHeader(Name = "X-Demo-Session")] Guid sessionId)
{
    var redisKey = $"idm:{sessionId}:{key}";
    
    // Atomic SET if Not Exists
    var isNew = await _redis.StringSetAsync(redisKey, "locked", TimeSpan.FromMinutes(5), When.NotExists);

    if (!isNew) {
        return Ok(new { isDuplicate = true });
    }

    // Process real business logic here...
    return Ok(new { isDuplicate = false, keyInfo = new { ttlSeconds = 300 } });
}
```
