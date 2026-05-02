# Implementation Specification

This document provides complete, copy-paste ready code for implementing all demo features. An LLM should be able to execute this spec with minimal interpretation.

---

## Prerequisites

### Required NuGet Packages (ritualworks)
```xml
<!-- Already installed - verify these exist in .csproj -->
<PackageReference Include="Microsoft.AspNetCore.SignalR" Version="1.1.0" />
<PackageReference Include="StackExchange.Redis" Version="2.7.33" />
<PackageReference Include="Polly" Version="8.3.0" />
<PackageReference Include="MassTransit" Version="8.1.3" />
```

### Required npm Packages (portfolio-site)
```bash
npm install @microsoft/signalr
```

---

## Phase 1: Backend Infrastructure

### 1.1 Create DemoHub

**File**: `/Users/roseonyema/Documents/code/ritualworks/src/Api/Hubs/DemoHub.cs`

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace haworks.Api.Hubs;

/// <summary>
/// SignalR hub for real-time demo event notifications.
/// All demo components connect here to receive live updates.
/// </summary>
[AllowAnonymous]
public sealed class DemoHub : Hub
{
    private readonly ILogger<DemoHub> _logger;

    public DemoHub(ILogger<DemoHub> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Client calls this to subscribe to a specific demo session.
    /// </summary>
    public async Task SubscribeToSession(string sessionId)
    {
        if (!Guid.TryParse(sessionId, out var parsedSessionId))
        {
            _logger.LogWarning("Invalid session ID format: {SessionId}", sessionId);
            await Clients.Caller.SendAsync("OnError", "Invalid session ID format");
            return;
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, GetGroupName(parsedSessionId));
        _logger.LogDebug("Client {ConnectionId} subscribed to session {SessionId}", Context.ConnectionId, sessionId);
        await Clients.Caller.SendAsync("OnSubscribed", sessionId);
    }

    /// <summary>
    /// Client calls this to unsubscribe from a demo session.
    /// </summary>
    public async Task UnsubscribeFromSession(string sessionId)
    {
        if (!Guid.TryParse(sessionId, out var parsedSessionId))
        {
            return;
        }

        await Groups.RemoveFromGroupAsync(Context.ConnectionId, GetGroupName(parsedSessionId));
        _logger.LogDebug("Client {ConnectionId} unsubscribed from session {SessionId}", Context.ConnectionId, sessionId);
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogDebug("Client {ConnectionId} disconnected. Reason: {Exception}",
            Context.ConnectionId, exception?.Message ?? "normal");
        await base.OnDisconnectedAsync(exception);
    }

    private static string GetGroupName(Guid sessionId) => $"demo-{sessionId}";
}
```

---

### 1.2 Create IDemoHubNotifier Interface

**File**: `/Users/roseonyema/Documents/code/ritualworks/src/Application/Interfaces/IDemoHubNotifier.cs`

```csharp
namespace haworks.Application.Interfaces;

/// <summary>
/// Abstraction for sending real-time demo event notifications.
/// Implemented by SignalR hub in Api layer.
/// </summary>
public interface IDemoHubNotifier
{
    Task NotifySagaStepAsync(SagaStepEvent stepEvent, CancellationToken ct = default);
    Task NotifyCircuitBreakerStateAsync(CircuitBreakerStateEvent cbEvent, CancellationToken ct = default);
    Task NotifyCacheEventAsync(CacheEvent cacheEvent, CancellationToken ct = default);
    Task NotifyEventFlowAsync(EventFlowEvent flowEvent, CancellationToken ct = default);
    Task NotifyVaultRotationAsync(VaultRotationEvent rotationEvent, CancellationToken ct = default);
    Task NotifyRateLimitAsync(RateLimitEvent rateLimitEvent, CancellationToken ct = default);
}

// ============================================================================
// Event Records - Immutable DTOs for SignalR messages
// ============================================================================

public sealed record SagaStepEvent(
    Guid SessionId,
    string Step,
    string Service,
    string Status,  // "pending" | "processing" | "completed" | "failed" | "compensating"
    string Description,
    int ProgressPercent,
    DateTime Timestamp
);

public sealed record CircuitBreakerStateEvent(
    Guid SessionId,
    string State,  // "closed" | "open" | "half-open"
    int FailureCount,
    int SuccessCount,
    int RejectedCount,
    string? LastError,
    DateTime Timestamp
);

public sealed record CacheEvent(
    Guid SessionId,
    string Action,  // "get" | "set" | "hit" | "miss" | "invalidate" | "refresh"
    string Key,
    bool IsHit,
    int DbHits,
    string? Source,  // "L1" | "L2" | "database"
    DateTime Timestamp
);

public sealed record EventFlowEvent(
    Guid SessionId,
    string EventType,
    string Source,
    string Status,  // "published" | "persisted" | "dispatched" | "consumed" | "acknowledged"
    int QueueDepth,
    Dictionary<string, object>? Payload,
    DateTime Timestamp
);

public sealed record VaultRotationEvent(
    Guid SessionId,
    string Stage,  // "started" | "activated" | "grace_period" | "revoked"
    int Version,
    int? PreviousVersion,
    DateTime? GracePeriodEnds,
    DateTime Timestamp
);

public sealed record RateLimitEvent(
    Guid SessionId,
    bool Allowed,
    int Remaining,
    int Limit,
    DateTime ResetAt,
    int? RetryAfterSeconds,
    DateTime Timestamp
);
```

---

### 1.3 Create SignalRDemoHubNotifier Implementation

**File**: `/Users/roseonyema/Documents/code/ritualworks/src/Api/Hubs/SignalRDemoHubNotifier.cs`

```csharp
using haworks.Application.Interfaces;
using Microsoft.AspNetCore.SignalR;

namespace haworks.Api.Hubs;

/// <summary>
/// SignalR implementation of IDemoHubNotifier.
/// Sends real-time events to connected demo clients.
/// </summary>
public sealed class SignalRDemoHubNotifier : IDemoHubNotifier
{
    private readonly IHubContext<DemoHub> _hubContext;
    private readonly ILogger<SignalRDemoHubNotifier> _logger;

    public SignalRDemoHubNotifier(
        IHubContext<DemoHub> hubContext,
        ILogger<SignalRDemoHubNotifier> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task NotifySagaStepAsync(SagaStepEvent stepEvent, CancellationToken ct = default)
    {
        var groupName = GetGroupName(stepEvent.SessionId);
        await _hubContext.Clients.Group(groupName).SendAsync("OnSagaStep", stepEvent, ct);
        _logger.LogDebug("Sent saga step {Step} for session {SessionId}", stepEvent.Step, stepEvent.SessionId);
    }

    public async Task NotifyCircuitBreakerStateAsync(CircuitBreakerStateEvent cbEvent, CancellationToken ct = default)
    {
        var groupName = GetGroupName(cbEvent.SessionId);
        await _hubContext.Clients.Group(groupName).SendAsync("OnCircuitState", cbEvent, ct);
        _logger.LogDebug("Sent circuit state {State} for session {SessionId}", cbEvent.State, cbEvent.SessionId);
    }

    public async Task NotifyCacheEventAsync(CacheEvent cacheEvent, CancellationToken ct = default)
    {
        var groupName = GetGroupName(cacheEvent.SessionId);
        await _hubContext.Clients.Group(groupName).SendAsync("OnCacheEvent", cacheEvent, ct);
        _logger.LogDebug("Sent cache event {Action} for session {SessionId}", cacheEvent.Action, cacheEvent.SessionId);
    }

    public async Task NotifyEventFlowAsync(EventFlowEvent flowEvent, CancellationToken ct = default)
    {
        var groupName = GetGroupName(flowEvent.SessionId);
        await _hubContext.Clients.Group(groupName).SendAsync("OnEventFlow", flowEvent, ct);
        _logger.LogDebug("Sent event flow {Status} for session {SessionId}", flowEvent.Status, flowEvent.SessionId);
    }

    public async Task NotifyVaultRotationAsync(VaultRotationEvent rotationEvent, CancellationToken ct = default)
    {
        var groupName = GetGroupName(rotationEvent.SessionId);
        await _hubContext.Clients.Group(groupName).SendAsync("OnVaultRotation", rotationEvent, ct);
        _logger.LogDebug("Sent vault rotation {Stage} for session {SessionId}", rotationEvent.Stage, rotationEvent.SessionId);
    }

    public async Task NotifyRateLimitAsync(RateLimitEvent rateLimitEvent, CancellationToken ct = default)
    {
        var groupName = GetGroupName(rateLimitEvent.SessionId);
        await _hubContext.Clients.Group(groupName).SendAsync("OnRateLimit", rateLimitEvent, ct);
        _logger.LogDebug("Sent rate limit event for session {SessionId}, allowed: {Allowed}",
            rateLimitEvent.SessionId, rateLimitEvent.Allowed);
    }

    private static string GetGroupName(Guid sessionId) => $"demo-{sessionId}";
}
```

---

### 1.4 Create DemoOptions

**File**: `/Users/roseonyema/Documents/code/ritualworks/src/Infrastructure/Options/DemoOptions.cs`

```csharp
using System.ComponentModel.DataAnnotations;

namespace haworks.Infrastructure.Options;

/// <summary>
/// Configuration options for demo features.
/// </summary>
public sealed class DemoOptions
{
    public const string SectionName = "Demo";

    /// <summary>
    /// Whether demo endpoints are enabled.
    /// </summary>
    public bool Enabled { get; set; } = true;

    /// <summary>
    /// Session timeout in minutes. Sessions auto-cleanup after this duration.
    /// </summary>
    [Range(1, 60)]
    public int SessionTimeoutMinutes { get; set; } = 10;

    /// <summary>
    /// Default cache TTL for demo products (seconds).
    /// </summary>
    [Range(10, 300)]
    public int CacheTtlSeconds { get; set; } = 60;

    /// <summary>
    /// Default rate limit: requests per window.
    /// </summary>
    [Range(1, 100)]
    public int RateLimitPermitLimit { get; set; } = 10;

    /// <summary>
    /// Default rate limit: window size in seconds.
    /// </summary>
    [Range(1, 60)]
    public int RateLimitWindowSeconds { get; set; } = 10;

    /// <summary>
    /// Simulated database latency for cache demos (ms).
    /// </summary>
    [Range(0, 1000)]
    public int SimulatedDbLatencyMs { get; set; } = 100;

    /// <summary>
    /// Idempotency key TTL in seconds.
    /// </summary>
    [Range(60, 600)]
    public int IdempotencyKeyTtlSeconds { get; set; } = 300;

    /// <summary>
    /// Circuit breaker failure threshold.
    /// </summary>
    [Range(1, 20)]
    public int CircuitBreakerThreshold { get; set; } = 5;

    /// <summary>
    /// Circuit breaker open duration in seconds.
    /// </summary>
    [Range(5, 120)]
    public int CircuitBreakerDurationSeconds { get; set; } = 30;
}
```

---

### 1.5 Create Demo Session State

**File**: `/Users/roseonyema/Documents/code/ritualworks/src/Infrastructure/Demo/DemoSessionState.cs`

```csharp
using System.Collections.Concurrent;

namespace haworks.Infrastructure.Demo;

/// <summary>
/// In-memory state for demo sessions. Each session is isolated.
/// </summary>
public sealed class DemoSessionState
{
    public Guid SessionId { get; init; } = Guid.NewGuid();
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
    public DateTime LastAccessedAt { get; set; } = DateTime.UtcNow;

    // Circuit Breaker State
    public string CircuitState { get; set; } = "closed";
    public int CircuitFailureCount { get; set; }
    public int CircuitSuccessCount { get; set; }
    public int CircuitRejectedCount { get; set; }
    public bool CircuitFailureMode { get; set; }
    public DateTime? CircuitOpenedAt { get; set; }

    // Rate Limit State
    public int RateLimitPermitLimit { get; set; } = 10;
    public int RateLimitWindowSeconds { get; set; } = 10;
    public int RateLimitTokens { get; set; } = 10;
    public DateTime RateLimitWindowStart { get; set; } = DateTime.UtcNow;

    // Inventory State (for concurrency demo)
    public int InventoryQuantity { get; set; } = 50;
    public int InventoryVersion { get; set; } = 1;

    // Cache State
    public DemoProduct? CachedProduct { get; set; }
    public DateTime? CachedAt { get; set; }
}

public sealed record DemoProduct(
    string Id,
    string Name,
    decimal Price,
    int Version
);

/// <summary>
/// Thread-safe session store with automatic cleanup.
/// </summary>
public sealed class DemoSessionStore
{
    private readonly ConcurrentDictionary<Guid, DemoSessionState> _sessions = new();
    private readonly TimeSpan _sessionTimeout;

    public DemoSessionStore(TimeSpan sessionTimeout)
    {
        _sessionTimeout = sessionTimeout;
    }

    public DemoSessionState GetOrCreate(Guid? sessionId = null)
    {
        CleanupExpiredSessions();

        if (sessionId.HasValue && _sessions.TryGetValue(sessionId.Value, out var existing))
        {
            existing.LastAccessedAt = DateTime.UtcNow;
            return existing;
        }

        var newSession = new DemoSessionState();
        _sessions[newSession.SessionId] = newSession;
        return newSession;
    }

    public DemoSessionState? Get(Guid sessionId)
    {
        if (_sessions.TryGetValue(sessionId, out var session))
        {
            session.LastAccessedAt = DateTime.UtcNow;
            return session;
        }
        return null;
    }

    public void Remove(Guid sessionId)
    {
        _sessions.TryRemove(sessionId, out _);
    }

    private void CleanupExpiredSessions()
    {
        var cutoff = DateTime.UtcNow - _sessionTimeout;
        var expiredKeys = _sessions
            .Where(kvp => kvp.Value.LastAccessedAt < cutoff)
            .Select(kvp => kvp.Key)
            .ToList();

        foreach (var key in expiredKeys)
        {
            _sessions.TryRemove(key, out _);
        }
    }
}
```

---

### 1.6 Create DemoController

**File**: `/Users/roseonyema/Documents/code/ritualworks/src/Api/Controllers/DemoController.cs`

```csharp
using haworks.Application.Interfaces;
using haworks.Infrastructure.Demo;
using haworks.Infrastructure.Options;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace haworks.Api.Controllers;

/// <summary>
/// Demo endpoints for portfolio showcase.
/// All endpoints are public (no authentication required).
/// </summary>
[ApiController]
[Route("api/demo")]
[AllowAnonymous]
public sealed class DemoController : ControllerBase
{
    private readonly DemoSessionStore _sessionStore;
    private readonly IDemoHubNotifier _hubNotifier;
    private readonly DemoOptions _options;
    private readonly ILogger<DemoController> _logger;

    public DemoController(
        DemoSessionStore sessionStore,
        IDemoHubNotifier hubNotifier,
        IOptions<DemoOptions> options,
        ILogger<DemoController> logger)
    {
        _sessionStore = sessionStore;
        _hubNotifier = hubNotifier;
        _options = options.Value;
        _logger = logger;
    }

    // ========================================================================
    // SAGA DEMO
    // ========================================================================

    [HttpPost("saga/start")]
    [ProducesResponseType(typeof(SagaStartResponse), StatusCodes.Status202Accepted)]
    public async Task<IActionResult> StartSaga([FromBody] StartSagaRequest request, CancellationToken ct)
    {
        var session = _sessionStore.GetOrCreate();
        var orderId = $"ord_demo_{Guid.NewGuid().ToString()[..8]}";

        _logger.LogInformation("Starting saga demo. Session: {SessionId}, Scenario: {Scenario}",
            session.SessionId, request.ScenarioType);

        // Start saga simulation in background
        _ = RunSagaSimulationAsync(session.SessionId, orderId, request.ScenarioType, request.SimulatedDelayMs, ct);

        return Accepted(new SagaStartResponse(
            session.SessionId,
            orderId,
            "initiated",
            string.Empty // No token needed for demo
        ));
    }

    private async Task RunSagaSimulationAsync(
        Guid sessionId,
        string orderId,
        string scenario,
        int delayMs,
        CancellationToken ct)
    {
        var steps = new[]
        {
            ("OrderCreated", "Orders", "Order aggregate created", 25),
            ("StockReserved", "Inventory", "Reserved 2 units of Widget Pro", 50),
            ("PaymentProcessed", "Payments", "Payment session created", 75),
            ("OrderCompleted", "Orders", "Order confirmed and finalized", 100)
        };

        try
        {
            for (int i = 0; i < steps.Length; i++)
            {
                var (step, service, description, progress) = steps[i];

                // Send "processing" status
                await _hubNotifier.NotifySagaStepAsync(new SagaStepEvent(
                    sessionId, step, service, "processing", $"Processing: {description}", progress - 10, DateTime.UtcNow
                ), ct);

                await Task.Delay(delayMs, ct);

                // Check for failure scenarios
                if (ShouldFail(scenario, step))
                {
                    await _hubNotifier.NotifySagaStepAsync(new SagaStepEvent(
                        sessionId, step, service, "failed", $"Failed: {GetFailureReason(scenario)}", progress, DateTime.UtcNow
                    ), ct);

                    // Trigger compensation if needed
                    if (i > 0)
                    {
                        await RunCompensationAsync(sessionId, steps.Take(i).Reverse().ToArray(), delayMs, ct);
                    }
                    return;
                }

                // Send "completed" status
                await _hubNotifier.NotifySagaStepAsync(new SagaStepEvent(
                    sessionId, step, service, "completed", description, progress, DateTime.UtcNow
                ), ct);
            }
        }
        catch (OperationCanceledException)
        {
            _logger.LogDebug("Saga simulation cancelled for session {SessionId}", sessionId);
        }
    }

    private async Task RunCompensationAsync(
        Guid sessionId,
        (string step, string service, string description, int progress)[] stepsToCompensate,
        int delayMs,
        CancellationToken ct)
    {
        foreach (var (step, service, _, _) in stepsToCompensate)
        {
            await _hubNotifier.NotifySagaStepAsync(new SagaStepEvent(
                sessionId, step, service, "compensating", $"Rolling back: {step}", 0, DateTime.UtcNow
            ), ct);

            await Task.Delay(delayMs / 2, ct);

            await _hubNotifier.NotifySagaStepAsync(new SagaStepEvent(
                sessionId, $"{step}Reverted", service, "completed", $"Compensated: {step}", 0, DateTime.UtcNow
            ), ct);
        }
    }

    private static bool ShouldFail(string scenario, string step) => scenario switch
    {
        "stockFailure" => step == "StockReserved",
        "paymentFailure" => step == "PaymentProcessed",
        "networkTimeout" => step == "PaymentProcessed",
        "partialFailure" => step == "OrderCompleted",
        _ => false
    };

    private static string GetFailureReason(string scenario) => scenario switch
    {
        "stockFailure" => "Insufficient stock available",
        "paymentFailure" => "Payment declined by provider",
        "networkTimeout" => "Network timeout connecting to payment provider",
        "partialFailure" => "Partial failure during finalization",
        _ => "Unknown error"
    };

    [HttpGet("saga/{sessionId}")]
    [ProducesResponseType(typeof(SagaStatusResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public IActionResult GetSagaStatus(Guid sessionId)
    {
        var session = _sessionStore.Get(sessionId);
        if (session == null)
        {
            return NotFound(new { error = "SessionNotFound", message = "Demo session not found or expired" });
        }

        // Return current state (simplified - real impl would track steps)
        return Ok(new SagaStatusResponse(sessionId, "ord_demo_xxx", "completed", true, false));
    }

    // ========================================================================
    // CIRCUIT BREAKER DEMO
    // ========================================================================

    [HttpPost("circuit/request")]
    [ProducesResponseType(typeof(CircuitBreakerResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(CircuitBreakerResponse), StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> CircuitBreakerRequest([FromBody] CircuitBreakerRequestDto request, CancellationToken ct)
    {
        var session = _sessionStore.GetOrCreate(request.SessionId);
        var now = DateTime.UtcNow;

        // Check if circuit should transition from open to half-open
        if (session.CircuitState == "open" && session.CircuitOpenedAt.HasValue)
        {
            var openDuration = now - session.CircuitOpenedAt.Value;
            if (openDuration.TotalSeconds >= _options.CircuitBreakerDurationSeconds)
            {
                session.CircuitState = "half-open";
                await NotifyCircuitState(session, ct);
            }
        }

        // Circuit is open - reject immediately
        if (session.CircuitState == "open")
        {
            session.CircuitRejectedCount++;
            await NotifyCircuitState(session, ct);

            var retryAfter = _options.CircuitBreakerDurationSeconds -
                (int)(now - session.CircuitOpenedAt!.Value).TotalSeconds;

            return StatusCode(503, new CircuitBreakerResponse(
                session.SessionId,
                false,
                session.CircuitState,
                session.CircuitFailureCount,
                session.CircuitSuccessCount,
                session.CircuitRejectedCount,
                retryAfter,
                "Circuit is open. Request rejected without calling downstream service."
            ));
        }

        // Simulate request (success or failure based on mode)
        var shouldFail = session.CircuitFailureMode || request.ShouldFail;

        if (shouldFail)
        {
            session.CircuitFailureCount++;
            session.CircuitSuccessCount = 0; // Reset on failure

            if (session.CircuitFailureCount >= _options.CircuitBreakerThreshold)
            {
                session.CircuitState = "open";
                session.CircuitOpenedAt = now;
            }

            await NotifyCircuitState(session, ct);

            return Ok(new CircuitBreakerResponse(
                session.SessionId,
                false,
                session.CircuitState,
                session.CircuitFailureCount,
                session.CircuitSuccessCount,
                session.CircuitRejectedCount,
                null,
                "Simulated downstream failure"
            ));
        }

        // Success
        session.CircuitSuccessCount++;
        if (session.CircuitState == "half-open")
        {
            session.CircuitState = "closed";
            session.CircuitFailureCount = 0;
        }

        await NotifyCircuitState(session, ct);

        return Ok(new CircuitBreakerResponse(
            session.SessionId,
            true,
            session.CircuitState,
            session.CircuitFailureCount,
            session.CircuitSuccessCount,
            session.CircuitRejectedCount,
            null,
            null
        ));
    }

    [HttpPost("circuit/toggle-failure")]
    public async Task<IActionResult> ToggleCircuitFailure([FromBody] ToggleFailureRequest request, CancellationToken ct)
    {
        var session = _sessionStore.Get(request.SessionId);
        if (session == null)
        {
            return NotFound(new { error = "SessionNotFound" });
        }

        session.CircuitFailureMode = request.FailureMode;
        await NotifyCircuitState(session, ct);

        return Ok(new { session.SessionId, session.CircuitFailureMode });
    }

    [HttpPost("circuit/reset")]
    public async Task<IActionResult> ResetCircuit([FromBody] SessionRequest request, CancellationToken ct)
    {
        var session = _sessionStore.Get(request.SessionId);
        if (session == null)
        {
            return NotFound(new { error = "SessionNotFound" });
        }

        session.CircuitState = "closed";
        session.CircuitFailureCount = 0;
        session.CircuitSuccessCount = 0;
        session.CircuitRejectedCount = 0;
        session.CircuitFailureMode = false;
        session.CircuitOpenedAt = null;

        await NotifyCircuitState(session, ct);

        return Ok(new { session.SessionId, message = "Circuit reset" });
    }

    private async Task NotifyCircuitState(DemoSessionState session, CancellationToken ct)
    {
        await _hubNotifier.NotifyCircuitBreakerStateAsync(new CircuitBreakerStateEvent(
            session.SessionId,
            session.CircuitState,
            session.CircuitFailureCount,
            session.CircuitSuccessCount,
            session.CircuitRejectedCount,
            session.CircuitFailureMode ? "Failure mode enabled" : null,
            DateTime.UtcNow
        ), ct);
    }

    // ========================================================================
    // IDEMPOTENCY DEMO
    // ========================================================================

    [HttpPost("idempotency/process")]
    public async Task<IActionResult> ProcessIdempotent(
        [FromBody] IdempotencyRequest request,
        [FromHeader(Name = "X-Idempotency-Key")] string idempotencyKey,
        CancellationToken ct)
    {
        var session = _sessionStore.GetOrCreate();

        // In real impl, check Redis for existing key
        // For demo, use in-memory simulation
        var cacheKey = $"idempotency:{idempotencyKey}";
        var isDuplicate = IdempotencyCache.TryGet(cacheKey, out var cached);

        if (isDuplicate && cached != null)
        {
            cached.HitCount++;
            return Ok(new IdempotencyResponse(
                session.SessionId,
                idempotencyKey,
                true,
                cached.HitCount,
                cached.Result,
                new KeyInfo(cached.CreatedAt, cached.ExpiresAt, (int)(cached.ExpiresAt - DateTime.UtcNow).TotalSeconds),
                "Duplicate request detected. Returning cached result."
            ));
        }

        // First request - create order
        var orderId = $"ord_demo_{Guid.NewGuid().ToString()[..8]}";
        var result = new OrderResult(orderId, "created");
        var now = DateTime.UtcNow;
        var expiresAt = now.AddSeconds(_options.IdempotencyKeyTtlSeconds);

        IdempotencyCache.Set(cacheKey, new CachedIdempotencyResult(result, now, expiresAt));

        return Ok(new IdempotencyResponse(
            session.SessionId,
            idempotencyKey,
            false,
            null,
            result,
            new KeyInfo(now, expiresAt, _options.IdempotencyKeyTtlSeconds),
            null
        ));
    }

    [HttpGet("idempotency/key/{key}")]
    public IActionResult GetIdempotencyKey(string key)
    {
        var cacheKey = $"idempotency:{key}";
        var exists = IdempotencyCache.TryGet(cacheKey, out var cached);

        if (!exists || cached == null)
        {
            return Ok(new { key, exists = false });
        }

        return Ok(new
        {
            key,
            exists = true,
            createdAt = cached.CreatedAt,
            ttlSeconds = (int)(cached.ExpiresAt - DateTime.UtcNow).TotalSeconds,
            hitCount = cached.HitCount,
            cachedResult = cached.Result
        });
    }

    // ========================================================================
    // RATE LIMIT DEMO
    // ========================================================================

    [HttpPost("ratelimit/configure")]
    public IActionResult ConfigureRateLimit([FromBody] RateLimitConfigRequest request)
    {
        var session = _sessionStore.GetOrCreate(request.SessionId);
        session.RateLimitPermitLimit = request.PermitLimit;
        session.RateLimitWindowSeconds = request.WindowSeconds;
        session.RateLimitTokens = request.PermitLimit;
        session.RateLimitWindowStart = DateTime.UtcNow;

        return Ok(new
        {
            session.SessionId,
            bucket = new
            {
                limit = session.RateLimitPermitLimit,
                windowSeconds = session.RateLimitWindowSeconds,
                remaining = session.RateLimitTokens
            }
        });
    }

    [HttpPost("ratelimit/request")]
    public async Task<IActionResult> RateLimitedRequest([FromBody] SessionRequest? request, CancellationToken ct)
    {
        var session = _sessionStore.GetOrCreate(request?.SessionId);
        var now = DateTime.UtcNow;

        // Check if window has reset
        var windowElapsed = now - session.RateLimitWindowStart;
        if (windowElapsed.TotalSeconds >= session.RateLimitWindowSeconds)
        {
            session.RateLimitTokens = session.RateLimitPermitLimit;
            session.RateLimitWindowStart = now;
        }

        var resetAt = session.RateLimitWindowStart.AddSeconds(session.RateLimitWindowSeconds);
        var allowed = session.RateLimitTokens > 0;

        if (allowed)
        {
            session.RateLimitTokens--;
        }

        var retryAfter = allowed ? null : (int?)(resetAt - now).TotalSeconds;

        await _hubNotifier.NotifyRateLimitAsync(new RateLimitEvent(
            session.SessionId,
            allowed,
            session.RateLimitTokens,
            session.RateLimitPermitLimit,
            resetAt,
            retryAfter,
            now
        ), ct);

        Response.Headers.Append("X-RateLimit-Limit", session.RateLimitPermitLimit.ToString());
        Response.Headers.Append("X-RateLimit-Remaining", session.RateLimitTokens.ToString());
        Response.Headers.Append("X-RateLimit-Reset", new DateTimeOffset(resetAt).ToUnixTimeSeconds().ToString());

        if (!allowed)
        {
            Response.Headers.Append("Retry-After", retryAfter.ToString());
            return StatusCode(429, new RateLimitResponse(
                session.SessionId,
                false,
                new BucketInfo(session.RateLimitTokens, session.RateLimitPermitLimit, resetAt, retryAfter),
                "Rate limit exceeded. Please retry after the specified time."
            ));
        }

        return Ok(new RateLimitResponse(
            session.SessionId,
            true,
            new BucketInfo(session.RateLimitTokens, session.RateLimitPermitLimit, resetAt, null),
            null
        ));
    }

    [HttpPost("ratelimit/burst")]
    public async Task<IActionResult> RateLimitBurst([FromBody] BurstRequest request, CancellationToken ct)
    {
        var session = _sessionStore.GetOrCreate();
        var results = new List<BurstResult>();

        for (int i = 0; i < request.Count; i++)
        {
            var now = DateTime.UtcNow;
            var windowElapsed = now - session.RateLimitWindowStart;
            if (windowElapsed.TotalSeconds >= session.RateLimitWindowSeconds)
            {
                session.RateLimitTokens = session.RateLimitPermitLimit;
                session.RateLimitWindowStart = now;
            }

            var allowed = session.RateLimitTokens > 0;
            if (allowed) session.RateLimitTokens--;

            var resetAt = session.RateLimitWindowStart.AddSeconds(session.RateLimitWindowSeconds);
            var retryAfter = allowed ? null : (int?)(resetAt - now).TotalSeconds;

            results.Add(new BurstResult(i + 1, allowed, session.RateLimitTokens, retryAfter));

            if (request.DelayMs > 0)
            {
                await Task.Delay(request.DelayMs, ct);
            }
        }

        return Ok(new
        {
            session.SessionId,
            results,
            summary = new
            {
                total = results.Count,
                allowed = results.Count(r => r.Allowed),
                rejected = results.Count(r => !r.Allowed)
            }
        });
    }

    // ========================================================================
    // CACHE DEMO
    // ========================================================================

    [HttpGet("cache/product/{id}")]
    public async Task<IActionResult> GetCachedProduct(string id, CancellationToken ct)
    {
        var session = _sessionStore.GetOrCreate();
        var now = DateTime.UtcNow;

        bool isHit = session.CachedProduct != null &&
                     session.CachedAt.HasValue &&
                     (now - session.CachedAt.Value).TotalSeconds < _options.CacheTtlSeconds;

        string source;
        if (isHit)
        {
            source = "L1";
        }
        else
        {
            // Simulate DB fetch
            await Task.Delay(_options.SimulatedDbLatencyMs, ct);
            session.CachedProduct = new DemoProduct(id, "Widget Pro", 49.99m, 1);
            session.CachedAt = now;
            source = "database";
        }

        var ttlRemaining = isHit
            ? _options.CacheTtlSeconds - (int)(now - session.CachedAt!.Value).TotalSeconds
            : _options.CacheTtlSeconds;

        await _hubNotifier.NotifyCacheEventAsync(new CacheEvent(
            session.SessionId,
            isHit ? "hit" : "miss",
            $"product:{id}",
            isHit,
            isHit ? 0 : 1,
            source,
            now
        ), ct);

        return Ok(new CachedProductResponse(
            session.SessionId,
            session.CachedProduct!,
            new CacheInfo(isHit, source, session.CachedAt!.Value, ttlRemaining, _options.CacheTtlSeconds)
        ));
    }

    [HttpPut("cache/product/{id}")]
    public async Task<IActionResult> UpdateProduct(string id, [FromBody] UpdateProductRequest request, CancellationToken ct)
    {
        var session = _sessionStore.GetOrCreate();
        var now = DateTime.UtcNow;

        // Update product
        var newVersion = (session.CachedProduct?.Version ?? 0) + 1;
        session.CachedProduct = new DemoProduct(id, "Widget Pro", request.Price, newVersion);
        session.CachedAt = now;

        // Notify invalidation
        await _hubNotifier.NotifyCacheEventAsync(new CacheEvent(
            session.SessionId,
            "invalidate",
            $"product:{id}",
            false,
            1,
            null,
            now
        ), ct);

        return Ok(new
        {
            session.SessionId,
            product = session.CachedProduct,
            invalidation = new
            {
                cacheKeysInvalidated = new[] { $"product:{id}", "products:list" },
                pubsubMessageSent = true,
                instancesNotified = 3
            }
        });
    }

    [HttpDelete("cache/product/{id}")]
    public async Task<IActionResult> InvalidateCache(string id, CancellationToken ct)
    {
        var session = _sessionStore.GetOrCreate();

        session.CachedProduct = null;
        session.CachedAt = null;

        await _hubNotifier.NotifyCacheEventAsync(new CacheEvent(
            session.SessionId,
            "invalidate",
            $"product:{id}",
            false,
            0,
            null,
            DateTime.UtcNow
        ), ct);

        return Ok(new
        {
            session.SessionId,
            invalidated = true,
            cacheKey = $"product:{id}",
            pubsubMessageSent = true
        });
    }

    [HttpPost("cache/stampede")]
    public async Task<IActionResult> SimulateStampede([FromBody] StampedeRequest request, CancellationToken ct)
    {
        var session = _sessionStore.GetOrCreate();
        var now = DateTime.UtcNow;

        int dbQueries;
        int cacheHits;
        int cacheMisses;

        switch (request.ProtectionMode)
        {
            case "none":
                // All requests hit DB
                dbQueries = request.ConcurrentRequests;
                cacheHits = 0;
                cacheMisses = request.ConcurrentRequests;
                await Task.Delay(request.SimulatedDbLatencyMs * request.ConcurrentRequests / 10, ct);
                break;

            case "lock":
            case "probabilistic":
                // Only first request hits DB
                dbQueries = 1;
                cacheHits = request.ConcurrentRequests - 1;
                cacheMisses = 1;
                await Task.Delay(request.SimulatedDbLatencyMs + 50, ct);
                break;

            default:
                return BadRequest(new { error = "Invalid protection mode" });
        }

        var totalDuration = request.ProtectionMode == "none"
            ? request.SimulatedDbLatencyMs * request.ConcurrentRequests / 10
            : request.SimulatedDbLatencyMs + 50;

        return Ok(new StampedeResponse(
            session.SessionId,
            request.ProtectionMode,
            request.ConcurrentRequests,
            cacheHits,
            cacheMisses,
            dbQueries,
            totalDuration,
            (double)totalDuration / request.ConcurrentRequests,
            request.SimulatedDbLatencyMs + 5,
            cacheHits
        ));
    }

    // ========================================================================
    // CONCURRENCY DEMO
    // ========================================================================

    [HttpGet("inventory/{id}")]
    public IActionResult GetInventory(string id)
    {
        var session = _sessionStore.GetOrCreate();

        Response.Headers.Append("ETag", $"\"{session.InventoryVersion}\"");

        return Ok(new InventoryResponse(
            session.SessionId,
            new InventoryItem(id, "Widget Pro", session.InventoryQuantity, session.InventoryVersion)
        ));
    }

    [HttpPut("inventory/{id}")]
    public IActionResult UpdateInventory(
        string id,
        [FromBody] UpdateInventoryRequest request,
        [FromHeader(Name = "If-Match")] string? ifMatch)
    {
        var session = _sessionStore.GetOrCreate();

        // Parse expected version from If-Match header
        if (string.IsNullOrEmpty(ifMatch))
        {
            return BadRequest(new { error = "MissingIfMatch", message = "If-Match header is required" });
        }

        var expectedVersion = int.Parse(ifMatch.Trim('"'));

        // Check for conflict
        if (expectedVersion != session.InventoryVersion)
        {
            return Conflict(new
            {
                session.SessionId,
                error = "ConcurrencyConflict",
                message = "The resource was modified by another request",
                yourVersion = expectedVersion,
                currentVersion = session.InventoryVersion,
                currentState = new InventoryItem(id, "Widget Pro", session.InventoryQuantity, session.InventoryVersion),
                resolution = new
                {
                    options = new[] { "refetch_and_retry", "force_overwrite", "merge" },
                    recommended = "refetch_and_retry"
                }
            });
        }

        // Update successful
        var previousVersion = session.InventoryVersion;
        session.InventoryQuantity = request.Quantity;
        session.InventoryVersion++;

        Response.Headers.Append("ETag", $"\"{session.InventoryVersion}\"");

        return Ok(new
        {
            session.SessionId,
            inventory = new InventoryItem(id, "Widget Pro", session.InventoryQuantity, session.InventoryVersion),
            previousVersion
        });
    }

    // ========================================================================
    // VAULT DEMO
    // ========================================================================

    [HttpGet("vault/status")]
    public IActionResult GetVaultStatus()
    {
        var session = _sessionStore.GetOrCreate();
        var now = DateTime.UtcNow;

        return Ok(new VaultStatusResponse(
            session.SessionId,
            CurrentVersion: 3,
            CreatedAt: now.AddHours(-1),
            ExpiresAt: now.AddMinutes(30),
            TtlSeconds: 1800,
            RotationSchedule: "0 * * * *",
            NextRotation: now.AddMinutes(30),
            Status: "active",
            RotationHistory: new[]
            {
                new RotationHistoryItem(3, now.AddHours(-1), null, "active"),
                new RotationHistoryItem(2, now.AddHours(-2), now.AddHours(-1).AddMinutes(5), "revoked"),
                new RotationHistoryItem(1, now.AddHours(-3), now.AddHours(-2).AddMinutes(5), "revoked")
            }
        ));
    }

    [HttpPost("vault/rotate")]
    public async Task<IActionResult> TriggerVaultRotation(CancellationToken ct)
    {
        var session = _sessionStore.GetOrCreate();

        // Simulate rotation stages via SignalR
        _ = SimulateVaultRotationAsync(session.SessionId, ct);

        return Accepted(new
        {
            session.SessionId,
            previousVersion = 3,
            newVersion = 4,
            status = "rotating"
        });
    }

    private async Task SimulateVaultRotationAsync(Guid sessionId, CancellationToken ct)
    {
        var now = DateTime.UtcNow;

        // Stage 1: Started
        await _hubNotifier.NotifyVaultRotationAsync(new VaultRotationEvent(
            sessionId, "started", 4, 3, null, now
        ), ct);

        await Task.Delay(500, ct);

        // Stage 2: Activated
        await _hubNotifier.NotifyVaultRotationAsync(new VaultRotationEvent(
            sessionId, "activated", 4, null, null, DateTime.UtcNow
        ), ct);

        await Task.Delay(500, ct);

        // Stage 3: Grace period
        var gracePeriodEnds = DateTime.UtcNow.AddSeconds(10);
        await _hubNotifier.NotifyVaultRotationAsync(new VaultRotationEvent(
            sessionId, "grace_period", 3, null, gracePeriodEnds, DateTime.UtcNow
        ), ct);

        await Task.Delay(2000, ct);

        // Stage 4: Revoked
        await _hubNotifier.NotifyVaultRotationAsync(new VaultRotationEvent(
            sessionId, "revoked", 3, null, null, DateTime.UtcNow
        ), ct);
    }

    // ========================================================================
    // EVENT FLOW DEMO
    // ========================================================================

    [HttpPost("events/trigger")]
    public async Task<IActionResult> TriggerEventFlow([FromBody] TriggerEventRequest request, CancellationToken ct)
    {
        var session = _sessionStore.GetOrCreate();
        var eventId = $"evt_demo_{Guid.NewGuid().ToString()[..8]}";

        // Simulate event flow stages via SignalR
        _ = SimulateEventFlowAsync(session.SessionId, request.EventType, eventId, ct);

        return Accepted(new
        {
            session.SessionId,
            eventId,
            status = "persisted"
        });
    }

    private async Task SimulateEventFlowAsync(Guid sessionId, string eventType, string eventId, CancellationToken ct)
    {
        var payload = new Dictionary<string, object> { ["eventId"] = eventId };

        // Stage 1: Persisted to outbox
        await _hubNotifier.NotifyEventFlowAsync(new EventFlowEvent(
            sessionId, eventType, "OutboxTable", "persisted", 0, payload, DateTime.UtcNow
        ), ct);

        await Task.Delay(300, ct);

        // Stage 2: Dispatched by relay
        await _hubNotifier.NotifyEventFlowAsync(new EventFlowEvent(
            sessionId, eventType, "OutboxRelay", "dispatched", 1, payload, DateTime.UtcNow
        ), ct);

        await Task.Delay(200, ct);

        // Stage 3: Consumed
        await _hubNotifier.NotifyEventFlowAsync(new EventFlowEvent(
            sessionId, eventType, $"{eventType}Consumer", "consumed", 0, payload, DateTime.UtcNow
        ), ct);

        await Task.Delay(100, ct);

        // Stage 4: Acknowledged
        await _hubNotifier.NotifyEventFlowAsync(new EventFlowEvent(
            sessionId, eventType, "MessageBroker", "acknowledged", 0, payload, DateTime.UtcNow
        ), ct);
    }
}

// ============================================================================
// Request/Response DTOs
// ============================================================================

public sealed record StartSagaRequest(
    string ScenarioType = "success",
    int SimulatedDelayMs = 500
);

public sealed record SagaStartResponse(
    Guid SessionId,
    string OrderId,
    string Status,
    string SubscriptionToken
);

public sealed record SagaStatusResponse(
    Guid SessionId,
    string OrderId,
    string CurrentStep,
    bool IsComplete,
    bool IsFailed
);

public sealed record CircuitBreakerRequestDto(
    Guid? SessionId,
    bool ShouldFail = false
);

public sealed record CircuitBreakerResponse(
    Guid SessionId,
    bool Success,
    string CircuitState,
    int FailureCount,
    int SuccessCount,
    int RejectedCount,
    int? RetryAfterSeconds,
    string? Message
);

public sealed record ToggleFailureRequest(Guid SessionId, bool FailureMode);

public sealed record SessionRequest(Guid SessionId);

public sealed record IdempotencyRequest(string Action, Dictionary<string, object> Payload);

public sealed record IdempotencyResponse(
    Guid SessionId,
    string IdempotencyKey,
    bool IsDuplicate,
    int? DuplicateCount,
    OrderResult Result,
    KeyInfo KeyInfo,
    string? Message
);

public sealed record OrderResult(string OrderId, string Status);

public sealed record KeyInfo(DateTime CreatedAt, DateTime ExpiresAt, int TtlSeconds);

public sealed record RateLimitConfigRequest(
    Guid? SessionId,
    int PermitLimit = 10,
    int WindowSeconds = 10
);

public sealed record RateLimitResponse(
    Guid SessionId,
    bool Allowed,
    BucketInfo Bucket,
    string? Message
);

public sealed record BucketInfo(int Remaining, int Limit, DateTime ResetAt, int? RetryAfterSeconds);

public sealed record BurstRequest(int Count, int DelayMs = 50);

public sealed record BurstResult(int RequestNumber, bool Allowed, int Remaining, int? RetryAfter);

public sealed record CachedProductResponse(
    Guid SessionId,
    DemoProduct Product,
    CacheInfo CacheInfo
);

public sealed record CacheInfo(
    bool IsHit,
    string Source,
    DateTime CachedAt,
    int TtlSeconds,
    int TotalTtlSeconds
);

public sealed record UpdateProductRequest(decimal Price);

public sealed record StampedeRequest(
    int ConcurrentRequests = 100,
    string CacheKey = "product:demo-widget",
    string ProtectionMode = "lock",
    int SimulatedDbLatencyMs = 100
);

public sealed record StampedeResponse(
    Guid SessionId,
    string ProtectionMode,
    int TotalRequests,
    int CacheHits,
    int CacheMisses,
    int DbQueries,
    int TotalDurationMs,
    double AverageLatencyMs,
    int P99LatencyMs,
    int LockContentionCount
);

public sealed record InventoryResponse(Guid SessionId, InventoryItem Inventory);

public sealed record InventoryItem(string Id, string Name, int Quantity, int Version);

public sealed record UpdateInventoryRequest(int Quantity);

public sealed record VaultStatusResponse(
    Guid SessionId,
    int CurrentVersion,
    DateTime CreatedAt,
    DateTime ExpiresAt,
    int TtlSeconds,
    string RotationSchedule,
    DateTime NextRotation,
    string Status,
    RotationHistoryItem[] RotationHistory
);

public sealed record RotationHistoryItem(int Version, DateTime RotatedAt, DateTime? RevokedAt, string Status);

public sealed record TriggerEventRequest(
    string EventType = "OrderCreated",
    Dictionary<string, object>? Payload = null
);

// ============================================================================
// Simple In-Memory Idempotency Cache (for demo purposes)
// ============================================================================

public static class IdempotencyCache
{
    private static readonly Dictionary<string, CachedIdempotencyResult> _cache = new();

    public static bool TryGet(string key, out CachedIdempotencyResult? result)
    {
        lock (_cache)
        {
            if (_cache.TryGetValue(key, out result))
            {
                if (DateTime.UtcNow < result.ExpiresAt)
                {
                    return true;
                }
                _cache.Remove(key);
            }
            result = null;
            return false;
        }
    }

    public static void Set(string key, CachedIdempotencyResult result)
    {
        lock (_cache)
        {
            _cache[key] = result;
        }
    }
}

public sealed class CachedIdempotencyResult
{
    public OrderResult Result { get; }
    public DateTime CreatedAt { get; }
    public DateTime ExpiresAt { get; }
    public int HitCount { get; set; }

    public CachedIdempotencyResult(OrderResult result, DateTime createdAt, DateTime expiresAt)
    {
        Result = result;
        CreatedAt = createdAt;
        ExpiresAt = expiresAt;
        HitCount = 0;
    }
}
```

---

### 1.7 Register Services

**File to modify**: `/Users/roseonyema/Documents/code/ritualworks/src/Infrastructure/Extensions/InfrastructureExtensions.cs`

**Add these lines** in the `AddInfrastructureServices` method:

```csharp
// Add after other service registrations

// Demo services
services.AddSingleton(new DemoSessionStore(TimeSpan.FromMinutes(10)));
services.AddScoped<IDemoHubNotifier, SignalRDemoHubNotifier>();

// Demo options
services.AddOptions<DemoOptions>()
    .Bind(configuration.GetSection(DemoOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();

// SignalR
services.AddSignalR();
```

**Add these using statements** at the top:
```csharp
using haworks.Api.Hubs;
using haworks.Infrastructure.Demo;
using haworks.Infrastructure.Options;
```

---

### 1.8 Map SignalR Hub

**File to modify**: `/Users/roseonyema/Documents/code/ritualworks/src/Infrastructure/Extensions/MiddlewareExtensions.cs`

**Add this line** after `app.MapControllers();`:

```csharp
// Map SignalR hubs
app.MapHub<DemoHub>("/hubs/demo");
app.MapHub<CheckoutHub>("/hubs/checkout");
```

**Add using statement**:
```csharp
using haworks.Api.Hubs;
```

---

### 1.9 Add CORS Configuration

**File to modify**: `/Users/roseonyema/Documents/code/ritualworks/src/Infrastructure/Extensions/SecurityExtensions.cs`

**Find the CORS policy configuration** and add portfolio site origins:

```csharp
policy.WithOrigins(
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:4321",    // Astro dev server
    "https://chidionyema.dev",
    "https://www.chidionyema.dev"
)
.AllowAnyHeader()
.AllowAnyMethod()
.AllowCredentials();  // Required for SignalR
```

---

### 1.10 Add Demo Config to appsettings.json

**File to modify**: `/Users/roseonyema/Documents/code/ritualworks/src/Api/appsettings.json`

**Add this section**:

```json
{
  "Demo": {
    "Enabled": true,
    "SessionTimeoutMinutes": 10,
    "CacheTtlSeconds": 60,
    "RateLimitPermitLimit": 10,
    "RateLimitWindowSeconds": 10,
    "SimulatedDbLatencyMs": 100,
    "IdempotencyKeyTtlSeconds": 300,
    "CircuitBreakerThreshold": 5,
    "CircuitBreakerDurationSeconds": 30
  }
}
```

---

## Phase 2: Frontend Integration

### 2.1 Environment Variables

**File**: `/Users/roseonyema/Documents/code/portfolio-site/.env.development`

```env
PUBLIC_API_URL=http://localhost:5000
PUBLIC_SIGNALR_URL=http://localhost:5000/hubs/demo
```

**File**: `/Users/roseonyema/Documents/code/portfolio-site/.env.production`

```env
PUBLIC_API_URL=https://api.chidionyema.dev
PUBLIC_SIGNALR_URL=https://api.chidionyema.dev/hubs/demo
```

---

## Verification Checklist

After implementation, verify:

1. [ ] `dotnet build` succeeds in ritualworks
2. [ ] `npm run dev` succeeds in portfolio-site
3. [ ] API responds at `http://localhost:5000/api/demo/saga/start`
4. [ ] SignalR connects at `http://localhost:5000/hubs/demo`
5. [ ] CORS allows requests from `http://localhost:4321`
6. [ ] Each demo endpoint returns expected response format

---

## Test Commands

```bash
# Test saga endpoint
curl -X POST http://localhost:5000/api/demo/saga/start \
  -H "Content-Type: application/json" \
  -d '{"scenarioType": "success", "simulatedDelayMs": 500}'

# Test circuit breaker
curl -X POST http://localhost:5000/api/demo/circuit/request \
  -H "Content-Type: application/json" \
  -d '{"shouldFail": false}'

# Test rate limiter
curl -X POST http://localhost:5000/api/demo/ratelimit/request \
  -H "Content-Type: application/json" \
  -d '{}'

# Test idempotency
curl -X POST http://localhost:5000/api/demo/idempotency/process \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: test-key-123" \
  -d '{"action": "CreateOrder", "payload": {}}'
```

---

## Error Handling

All endpoints return consistent error format:

```json
{
  "error": "ErrorCode",
  "message": "Human-readable message",
  "details": {}
}
```

| Error Code | HTTP Status | When |
|------------|-------------|------|
| `SessionNotFound` | 404 | Session ID not found or expired |
| `ConcurrencyConflict` | 409 | Version mismatch in inventory update |
| `RateLimitExceeded` | 429 | No tokens remaining |
| `ValidationError` | 400 | Invalid request body |

---

## Phase 3: Real Infrastructure Integration

This phase replaces in-memory simulations with actual PostgreSQL and Redis.

### 3.1 PostgreSQL Entity for Concurrency Demo

**File**: `/Users/roseonyema/Documents/code/ritualworks/src/Domain/Entities/Demo/DemoInventory.cs`

```csharp
namespace haworks.Domain.Entities.Demo;

/// <summary>
/// Demo inventory entity with PostgreSQL xmin-based optimistic concurrency.
/// The xmin system column is automatically updated by PostgreSQL on each row update.
/// </summary>
public sealed class DemoInventory
{
    public Guid Id { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public int Quantity { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    /// <summary>
    /// PostgreSQL xmin system column - updated automatically on each row modification.
    /// Used for optimistic concurrency control.
    /// </summary>
    public uint Xmin { get; private set; }

    private DemoInventory() { } // EF Core

    public static DemoInventory Create(string name, int quantity)
    {
        return new DemoInventory
        {
            Id = Guid.NewGuid(),
            Name = name,
            Quantity = quantity,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    public void UpdateQuantity(int newQuantity)
    {
        Quantity = newQuantity;
        UpdatedAt = DateTime.UtcNow;
    }
}
```

---

### 3.2 EF Core Configuration for xmin

**File**: `/Users/roseonyema/Documents/code/ritualworks/src/Infrastructure/Persistence/Configurations/DemoInventoryConfiguration.cs`

```csharp
using haworks.Domain.Entities.Demo;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace haworks.Infrastructure.Persistence.Configurations;

/// <summary>
/// EF Core configuration for DemoInventory with PostgreSQL xmin concurrency token.
/// </summary>
public sealed class DemoInventoryConfiguration : IEntityTypeConfiguration<DemoInventory>
{
    public void Configure(EntityTypeBuilder<DemoInventory> builder)
    {
        builder.ToTable("demo_inventory", "demo");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.Id)
            .HasColumnName("id")
            .ValueGeneratedNever();

        builder.Property(e => e.Name)
            .HasColumnName("name")
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(e => e.Quantity)
            .HasColumnName("quantity")
            .IsRequired();

        builder.Property(e => e.CreatedAt)
            .HasColumnName("created_at")
            .IsRequired();

        builder.Property(e => e.UpdatedAt)
            .HasColumnName("updated_at")
            .IsRequired();

        // PostgreSQL xmin system column for optimistic concurrency
        // xmin is automatically updated by PostgreSQL on every row update
        builder.Property(e => e.Xmin)
            .HasColumnName("xmin")
            .HasColumnType("xid")
            .IsRowVersion()
            .IsConcurrencyToken();

        // Seed default demo inventory item
        builder.HasData(new
        {
            Id = Guid.Parse("00000000-0000-0000-0000-000000000001"),
            Name = "Widget Pro",
            Quantity = 50,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
    }
}
```

---

### 3.3 Add DbSet to DemoDbContext

**File**: `/Users/roseonyema/Documents/code/ritualworks/src/Infrastructure/Persistence/DemoDbContext.cs`

```csharp
using haworks.Domain.Entities.Demo;
using Microsoft.EntityFrameworkCore;

namespace haworks.Infrastructure.Persistence;

/// <summary>
/// DbContext for demo-specific entities.
/// Uses separate schema to avoid polluting main contexts.
/// </summary>
public sealed class DemoDbContext : DbContext
{
    public DemoDbContext(DbContextOptions<DemoDbContext> options) : base(options) { }

    public DbSet<DemoInventory> DemoInventory => Set<DemoInventory>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfiguration(new Configurations.DemoInventoryConfiguration());
        base.OnModelCreating(modelBuilder);
    }
}
```

---

### 3.4 Register DemoDbContext

**Add to InfrastructureExtensions.cs** (after other DbContext registrations):

```csharp
// Demo DbContext - uses catalog database with separate schema
services.AddDbContext<DemoDbContext>(options =>
{
    var connectionString = configuration.GetConnectionString("catalog");
    options.UseNpgsql(connectionString);
});
```

---

### 3.5 Migration for Demo Schema

**Run this command** to create the migration:

```bash
dotnet ef migrations add AddDemoInventory \
  -p src -s src \
  --context DemoDbContext \
  -o Infrastructure/Persistence/Migrations/Demo
```

**Or create manually** in `/Users/roseonyema/Documents/code/ritualworks/src/Infrastructure/Persistence/Migrations/Demo/`:

```csharp
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace haworks.Infrastructure.Persistence.Migrations.Demo;

public partial class AddDemoInventory : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.EnsureSchema("demo");

        migrationBuilder.CreateTable(
            name: "demo_inventory",
            schema: "demo",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                quantity = table.Column<int>(type: "integer", nullable: false),
                created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_demo_inventory", x => x.id);
            });

        // Seed default item
        migrationBuilder.InsertData(
            schema: "demo",
            table: "demo_inventory",
            columns: new[] { "id", "name", "quantity", "created_at", "updated_at" },
            values: new object[] {
                Guid.Parse("00000000-0000-0000-0000-000000000001"),
                "Widget Pro",
                50,
                DateTime.UtcNow,
                DateTime.UtcNow
            });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "demo_inventory", schema: "demo");
    }
}
```

---

### 3.6 Updated Concurrency Demo Endpoints (Real PostgreSQL)

**Replace the concurrency section in DemoController.cs**:

```csharp
// ========================================================================
// CONCURRENCY DEMO (Real PostgreSQL with xmin)
// ========================================================================

private readonly DemoDbContext _demoDb;

// Add DemoDbContext to constructor:
public DemoController(
    DemoSessionStore sessionStore,
    IDemoHubNotifier hubNotifier,
    IOptions<DemoOptions> options,
    DemoDbContext demoDb,  // Add this
    ILogger<DemoController> logger)
{
    _sessionStore = sessionStore;
    _hubNotifier = hubNotifier;
    _options = options.Value;
    _demoDb = demoDb;  // Add this
    _logger = logger;
}

[HttpGet("inventory/{id}")]
[ProducesResponseType(typeof(InventoryResponse), StatusCodes.Status200OK)]
[ProducesResponseType(StatusCodes.Status404NotFound)]
public async Task<IActionResult> GetInventory(Guid id, CancellationToken ct)
{
    var session = _sessionStore.GetOrCreate();

    var inventory = await _demoDb.DemoInventory
        .AsNoTracking()
        .FirstOrDefaultAsync(i => i.Id == id, ct);

    if (inventory == null)
    {
        // Return default demo inventory if not found
        inventory = await GetOrCreateDefaultInventoryAsync(ct);
    }

    // Return xmin as version in ETag header
    Response.Headers.Append("ETag", $"\"{inventory.Xmin}\"");

    return Ok(new InventoryResponse(
        session.SessionId,
        new InventoryItem(
            inventory.Id.ToString(),
            inventory.Name,
            inventory.Quantity,
            (int)inventory.Xmin  // PostgreSQL xmin as version
        )
    ));
}

[HttpPut("inventory/{id}")]
[ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
[ProducesResponseType(typeof(object), StatusCodes.Status409Conflict)]
[ProducesResponseType(StatusCodes.Status400BadRequest)]
public async Task<IActionResult> UpdateInventory(
    Guid id,
    [FromBody] UpdateInventoryRequest request,
    [FromHeader(Name = "If-Match")] string? ifMatch,
    CancellationToken ct)
{
    var session = _sessionStore.GetOrCreate();

    if (string.IsNullOrEmpty(ifMatch))
    {
        return BadRequest(new { error = "MissingIfMatch", message = "If-Match header is required for optimistic concurrency" });
    }

    // Parse expected xmin from If-Match header
    if (!uint.TryParse(ifMatch.Trim('"'), out var expectedXmin))
    {
        return BadRequest(new { error = "InvalidIfMatch", message = "If-Match header must be a valid xmin value" });
    }

    var inventory = await _demoDb.DemoInventory.FindAsync(new object[] { id }, ct);
    if (inventory == null)
    {
        inventory = await GetOrCreateDefaultInventoryAsync(ct);
        if (inventory.Id != id)
        {
            return NotFound(new { error = "NotFound", message = "Inventory item not found" });
        }
    }

    // Check for version mismatch (optimistic concurrency)
    if (inventory.Xmin != expectedXmin)
    {
        _logger.LogInformation(
            "Concurrency conflict detected. Expected xmin: {Expected}, Actual xmin: {Actual}",
            expectedXmin, inventory.Xmin);

        return Conflict(new
        {
            session.SessionId,
            error = "ConcurrencyConflict",
            message = "The resource was modified by another request. Your version is stale.",
            yourVersion = expectedXmin,
            currentVersion = inventory.Xmin,
            currentState = new InventoryItem(
                inventory.Id.ToString(),
                inventory.Name,
                inventory.Quantity,
                (int)inventory.Xmin
            ),
            resolution = new
            {
                options = new[] { "refetch_and_retry", "force_overwrite", "merge" },
                recommended = "refetch_and_retry",
                explanation = "Fetch the latest version, apply your changes, and retry with the new ETag"
            }
        });
    }

    // Update with optimistic concurrency
    var previousXmin = inventory.Xmin;
    inventory.UpdateQuantity(request.Quantity);

    try
    {
        await _demoDb.SaveChangesAsync(ct);
    }
    catch (DbUpdateConcurrencyException ex)
    {
        _logger.LogWarning(ex, "Database concurrency exception during inventory update");

        // Reload current state
        await _demoDb.Entry(inventory).ReloadAsync(ct);

        return Conflict(new
        {
            session.SessionId,
            error = "ConcurrencyConflict",
            message = "Concurrent modification detected at database level",
            yourVersion = expectedXmin,
            currentVersion = inventory.Xmin,
            currentState = new InventoryItem(
                inventory.Id.ToString(),
                inventory.Name,
                inventory.Quantity,
                (int)inventory.Xmin
            )
        });
    }

    Response.Headers.Append("ETag", $"\"{inventory.Xmin}\"");

    return Ok(new
    {
        session.SessionId,
        inventory = new InventoryItem(
            inventory.Id.ToString(),
            inventory.Name,
            inventory.Quantity,
            (int)inventory.Xmin
        ),
        previousVersion = (int)previousXmin
    });
}

[HttpPost("inventory/reset")]
[ProducesResponseType(StatusCodes.Status200OK)]
public async Task<IActionResult> ResetInventory(CancellationToken ct)
{
    var session = _sessionStore.GetOrCreate();

    var inventory = await _demoDb.DemoInventory
        .FirstOrDefaultAsync(i => i.Id == Guid.Parse("00000000-0000-0000-0000-000000000001"), ct);

    if (inventory != null)
    {
        inventory.UpdateQuantity(50);
        await _demoDb.SaveChangesAsync(ct);
    }

    return Ok(new { session.SessionId, message = "Inventory reset to 50 units" });
}

private async Task<DemoInventory> GetOrCreateDefaultInventoryAsync(CancellationToken ct)
{
    var defaultId = Guid.Parse("00000000-0000-0000-0000-000000000001");
    var inventory = await _demoDb.DemoInventory.FindAsync(new object[] { defaultId }, ct);

    if (inventory == null)
    {
        inventory = DemoInventory.Create("Widget Pro", 50);
        // Set the fixed ID for demo
        typeof(DemoInventory).GetProperty("Id")!.SetValue(inventory, defaultId);
        _demoDb.DemoInventory.Add(inventory);
        await _demoDb.SaveChangesAsync(ct);
    }

    return inventory;
}
```

---

### 3.7 Redis Idempotency Service

**File**: `/Users/roseonyema/Documents/code/ritualworks/src/Infrastructure/Demo/RedisIdempotencyService.cs`

```csharp
using StackExchange.Redis;
using System.Text.Json;

namespace haworks.Infrastructure.Demo;

/// <summary>
/// Redis-backed idempotency key storage.
/// Keys are stored with TTL and automatically expire.
/// </summary>
public interface IIdempotencyService
{
    Task<IdempotencyResult?> GetAsync(string key, CancellationToken ct = default);
    Task SetAsync(string key, IdempotencyResult result, TimeSpan ttl, CancellationToken ct = default);
    Task<bool> ExistsAsync(string key, CancellationToken ct = default);
    Task<IdempotencyKeyInfo?> GetKeyInfoAsync(string key, CancellationToken ct = default);
}

public sealed record IdempotencyResult(
    string OrderId,
    string Status,
    DateTime CreatedAt,
    int HitCount = 0
);

public sealed record IdempotencyKeyInfo(
    string Key,
    bool Exists,
    DateTime? CreatedAt,
    int? TtlSeconds,
    int? HitCount,
    IdempotencyResult? CachedResult
);

public sealed class RedisIdempotencyService : IIdempotencyService
{
    private readonly IConnectionMultiplexer _redis;
    private readonly ILogger<RedisIdempotencyService> _logger;
    private const string KeyPrefix = "demo:idempotency:";

    public RedisIdempotencyService(
        IConnectionMultiplexer redis,
        ILogger<RedisIdempotencyService> logger)
    {
        _redis = redis;
        _logger = logger;
    }

    public async Task<IdempotencyResult?> GetAsync(string key, CancellationToken ct = default)
    {
        var db = _redis.GetDatabase();
        var redisKey = $"{KeyPrefix}{key}";

        var value = await db.StringGetAsync(redisKey);
        if (value.IsNullOrEmpty)
        {
            return null;
        }

        var result = JsonSerializer.Deserialize<IdempotencyResult>(value!);
        if (result == null) return null;

        // Increment hit count
        var hitCountKey = $"{redisKey}:hits";
        await db.StringIncrementAsync(hitCountKey);

        var hitCount = (int)await db.StringGetAsync(hitCountKey);
        return result with { HitCount = hitCount };
    }

    public async Task SetAsync(string key, IdempotencyResult result, TimeSpan ttl, CancellationToken ct = default)
    {
        var db = _redis.GetDatabase();
        var redisKey = $"{KeyPrefix}{key}";

        var json = JsonSerializer.Serialize(result);
        await db.StringSetAsync(redisKey, json, ttl);

        // Initialize hit counter with same TTL
        var hitCountKey = $"{redisKey}:hits";
        await db.StringSetAsync(hitCountKey, "0", ttl);

        _logger.LogDebug("Set idempotency key {Key} with TTL {Ttl}", key, ttl);
    }

    public async Task<bool> ExistsAsync(string key, CancellationToken ct = default)
    {
        var db = _redis.GetDatabase();
        return await db.KeyExistsAsync($"{KeyPrefix}{key}");
    }

    public async Task<IdempotencyKeyInfo?> GetKeyInfoAsync(string key, CancellationToken ct = default)
    {
        var db = _redis.GetDatabase();
        var redisKey = $"{KeyPrefix}{key}";

        var exists = await db.KeyExistsAsync(redisKey);
        if (!exists)
        {
            return new IdempotencyKeyInfo(key, false, null, null, null, null);
        }

        var value = await db.StringGetAsync(redisKey);
        var ttl = await db.KeyTimeToLiveAsync(redisKey);
        var hitCount = (int)await db.StringGetAsync($"{redisKey}:hits");

        var result = value.HasValue
            ? JsonSerializer.Deserialize<IdempotencyResult>(value!)
            : null;

        return new IdempotencyKeyInfo(
            key,
            true,
            result?.CreatedAt,
            (int?)ttl?.TotalSeconds,
            hitCount,
            result
        );
    }
}
```

---

### 3.8 Register Redis Idempotency Service

**Add to InfrastructureExtensions.cs**:

```csharp
// Redis idempotency service (demo)
services.AddSingleton<IIdempotencyService, RedisIdempotencyService>();
```

---

### 3.9 Updated Idempotency Demo Endpoints (Real Redis)

**Replace the idempotency section in DemoController.cs**:

```csharp
// ========================================================================
// IDEMPOTENCY DEMO (Real Redis)
// ========================================================================

private readonly IIdempotencyService _idempotencyService;

// Add to constructor:
public DemoController(
    DemoSessionStore sessionStore,
    IDemoHubNotifier hubNotifier,
    IOptions<DemoOptions> options,
    DemoDbContext demoDb,
    IIdempotencyService idempotencyService,  // Add this
    ILogger<DemoController> logger)
{
    _sessionStore = sessionStore;
    _hubNotifier = hubNotifier;
    _options = options.Value;
    _demoDb = demoDb;
    _idempotencyService = idempotencyService;  // Add this
    _logger = logger;
}

[HttpPost("idempotency/process")]
[ProducesResponseType(typeof(IdempotencyResponse), StatusCodes.Status200OK)]
[ProducesResponseType(StatusCodes.Status400BadRequest)]
public async Task<IActionResult> ProcessIdempotent(
    [FromBody] IdempotencyRequest request,
    [FromHeader(Name = "X-Idempotency-Key")] string? idempotencyKey,
    CancellationToken ct)
{
    var session = _sessionStore.GetOrCreate();

    if (string.IsNullOrWhiteSpace(idempotencyKey))
    {
        return BadRequest(new
        {
            error = "MissingIdempotencyKey",
            message = "X-Idempotency-Key header is required"
        });
    }

    // Check Redis for existing key
    var existingResult = await _idempotencyService.GetAsync(idempotencyKey, ct);

    if (existingResult != null)
    {
        _logger.LogInformation(
            "Duplicate request detected. Key: {Key}, HitCount: {HitCount}",
            idempotencyKey, existingResult.HitCount);

        var keyInfo = await _idempotencyService.GetKeyInfoAsync(idempotencyKey, ct);

        return Ok(new IdempotencyResponse(
            session.SessionId,
            idempotencyKey,
            true,  // isDuplicate
            existingResult.HitCount,
            new OrderResult(existingResult.OrderId, existingResult.Status),
            new KeyInfo(
                existingResult.CreatedAt,
                existingResult.CreatedAt.AddSeconds(_options.IdempotencyKeyTtlSeconds),
                keyInfo?.TtlSeconds ?? _options.IdempotencyKeyTtlSeconds
            ),
            "Duplicate request detected. Returning cached result from Redis."
        ));
    }

    // First request - create order
    var orderId = $"ord_demo_{Guid.NewGuid().ToString()[..8]}";
    var now = DateTime.UtcNow;

    var result = new IdempotencyResult(orderId, "created", now);
    var ttl = TimeSpan.FromSeconds(_options.IdempotencyKeyTtlSeconds);

    await _idempotencyService.SetAsync(idempotencyKey, result, ttl, ct);

    _logger.LogInformation(
        "Created new idempotency key in Redis. Key: {Key}, OrderId: {OrderId}, TTL: {Ttl}s",
        idempotencyKey, orderId, _options.IdempotencyKeyTtlSeconds);

    return Ok(new IdempotencyResponse(
        session.SessionId,
        idempotencyKey,
        false,  // isDuplicate
        null,
        new OrderResult(orderId, "created"),
        new KeyInfo(now, now.AddSeconds(_options.IdempotencyKeyTtlSeconds), _options.IdempotencyKeyTtlSeconds),
        null
    ));
}

[HttpGet("idempotency/key/{key}")]
[ProducesResponseType(typeof(IdempotencyKeyInfo), StatusCodes.Status200OK)]
public async Task<IActionResult> GetIdempotencyKey(string key, CancellationToken ct)
{
    var keyInfo = await _idempotencyService.GetKeyInfoAsync(key, ct);

    if (keyInfo == null || !keyInfo.Exists)
    {
        return Ok(new { key, exists = false });
    }

    return Ok(new
    {
        key = keyInfo.Key,
        exists = keyInfo.Exists,
        createdAt = keyInfo.CreatedAt,
        ttlSeconds = keyInfo.TtlSeconds,
        hitCount = keyInfo.HitCount,
        cachedResult = keyInfo.CachedResult != null ? new
        {
            orderId = keyInfo.CachedResult.OrderId,
            status = keyInfo.CachedResult.Status
        } : null
    });
}

[HttpDelete("idempotency/key/{key}")]
[ProducesResponseType(StatusCodes.Status200OK)]
public async Task<IActionResult> DeleteIdempotencyKey(string key, CancellationToken ct)
{
    var db = _redis.GetDatabase();
    var deleted = await db.KeyDeleteAsync($"demo:idempotency:{key}");
    await db.KeyDeleteAsync($"demo:idempotency:{key}:hits");

    return Ok(new { key, deleted });
}

// Add IConnectionMultiplexer to constructor for delete endpoint
private readonly IConnectionMultiplexer _redis;

// Updated full constructor:
public DemoController(
    DemoSessionStore sessionStore,
    IDemoHubNotifier hubNotifier,
    IOptions<DemoOptions> options,
    DemoDbContext demoDb,
    IIdempotencyService idempotencyService,
    IConnectionMultiplexer redis,  // Add for delete endpoint
    ILogger<DemoController> logger)
{
    _sessionStore = sessionStore;
    _hubNotifier = hubNotifier;
    _options = options.Value;
    _demoDb = demoDb;
    _idempotencyService = idempotencyService;
    _redis = redis;
    _logger = logger;
}
```

---

### 3.10 Add Using Statements to DemoController

Add at the top of `DemoController.cs`:

```csharp
using haworks.Domain.Entities.Demo;
using haworks.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;
```

---

### 3.11 Test Commands for Real Infrastructure

```bash
# Test PostgreSQL concurrency (xmin)
# First GET to get current version
curl -i http://localhost:5000/api/demo/inventory/00000000-0000-0000-0000-000000000001

# Note the ETag header value (e.g., "12345")
# Then PUT with that version
curl -X PUT http://localhost:5000/api/demo/inventory/00000000-0000-0000-0000-000000000001 \
  -H "Content-Type: application/json" \
  -H "If-Match: \"12345\"" \
  -d '{"quantity": 45}'

# Simulate conflict - use stale version
curl -X PUT http://localhost:5000/api/demo/inventory/00000000-0000-0000-0000-000000000001 \
  -H "Content-Type: application/json" \
  -H "If-Match: \"12345\"" \
  -d '{"quantity": 40}'
# Should return 409 Conflict

# Test Redis idempotency
# First request creates order
curl -X POST http://localhost:5000/api/demo/idempotency/process \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: my-unique-key-123" \
  -d '{"action": "CreateOrder", "payload": {}}'

# Second request returns cached result
curl -X POST http://localhost:5000/api/demo/idempotency/process \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: my-unique-key-123" \
  -d '{"action": "CreateOrder", "payload": {}}'

# Check key info
curl http://localhost:5000/api/demo/idempotency/key/my-unique-key-123

# Verify in Redis CLI
redis-cli
> KEYS demo:idempotency:*
> GET demo:idempotency:my-unique-key-123
> TTL demo:idempotency:my-unique-key-123
```

---

## Appendix A: Microservices Deployment

If bounded contexts are deployed as separate microservices, the demo architecture changes:

### A.1 Demo Aggregator Service Pattern

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           API Gateway                                     │
│  Routes: /api/demo/* → Demo Aggregator                                   │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                       Demo Aggregator Service                             │
│  • SignalR Hub (DemoHub)                                                 │
│  • Subscribes to events from all services                                │
│  • Correlates by SessionId                                               │
│  • Pushes to connected clients                                           │
└──────────────────────────────────────────────────────────────────────────┘
          │                         │                         │
          ▼                         ▼                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Orders Service │     │ Payments Service│     │ Catalog Service │
│  Publishes:     │     │  Publishes:     │     │  Publishes:     │
│  - SagaStep     │     │  - PaymentEvent │     │  - StockEvent   │
│  - OrderCreated │     │  - CircuitState │     │  - CacheEvent   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### A.2 Event Contracts

Each service publishes demo events through the message bus:

```csharp
// Shared contracts package
namespace haworks.Contracts.Demo;

public sealed record DemoSagaStepEvent(
    Guid SessionId,
    string Step,
    string Service,
    string Status,
    string Description,
    DateTime Timestamp
);

public sealed record DemoCircuitBreakerEvent(
    Guid SessionId,
    string State,
    int FailureCount,
    DateTime Timestamp
);
```

### A.3 Aggregator Consumer

```csharp
public sealed class DemoEventAggregatorConsumer :
    IConsumer<DemoSagaStepEvent>,
    IConsumer<DemoCircuitBreakerEvent>
{
    private readonly IHubContext<DemoHub> _hubContext;

    public async Task Consume(ConsumeContext<DemoSagaStepEvent> context)
    {
        var @event = context.Message;
        await _hubContext.Clients
            .Group($"demo-{@event.SessionId}")
            .SendAsync("OnSagaStep", @event);
    }

    public async Task Consume(ConsumeContext<DemoCircuitBreakerEvent> context)
    {
        var @event = context.Message;
        await _hubContext.Clients
            .Group($"demo-{@event.SessionId}")
            .SendAsync("OnCircuitState", @event);
    }
}
```

### A.4 Correlation Header Propagation

Each microservice must propagate demo session IDs through HTTP headers:

```csharp
// Middleware in each service
public class DemoSessionPropagationMiddleware
{
    public async Task InvokeAsync(HttpContext context, RequestDelegate next)
    {
        if (context.Request.Headers.TryGetValue("X-Demo-Session-Id", out var sessionId))
        {
            // Store in AsyncLocal for access in handlers
            DemoSessionContext.Current = new DemoSession(Guid.Parse(sessionId!));
        }
        await next(context);
    }
}
```

### A.5 Key Differences from Monolith

| Aspect | Monolith | Microservices |
|--------|----------|---------------|
| SignalR Hub | Same process as business logic | Separate aggregator service |
| Event delivery | Direct method call | Message bus (RabbitMQ) |
| Session state | Single in-memory store | Redis (shared across services) |
| Database | Direct DbContext access | Each service owns its DB |
| Correlation | Local context | Header propagation required |
| Deployment | Single artifact | N+1 services (N bounded contexts + aggregator) |

The frontend code and API contracts remain **identical** - only the backend architecture changes.
