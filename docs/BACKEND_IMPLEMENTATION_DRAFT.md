# Backend Implementation: Phase 1 (Production Playground)

This draft contains the .NET 9 code required to power the interactive features of the HAWorks portfolio. 

---

## 1. Real-time Communication (SignalR)

### 1.1 DemoHub.cs
**Target Path:** `src/Api/Hubs/DemoHub.cs`
Handles isolated session subscriptions so visitors only see their own telemetry.

```csharp
using Microsoft.AspNetCore.SignalR;

namespace haworks.Api.Hubs;

public sealed class DemoHub : Hub
{
    private readonly ILogger<DemoHub> _logger;

    public DemoHub(ILogger<DemoHub> logger) => _logger = logger;

    public async Task SubscribeToSession(string sessionId)
    {
        if (Guid.TryParse(sessionId, out var parsedId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"demo-{parsedId}");
            await Clients.Caller.SendAsync("OnSubscribed", sessionId);
        }
    }

    public async Task UnsubscribeFromSession(string sessionId)
    {
        if (Guid.TryParse(sessionId, out var parsedId))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"demo-{parsedId}");
        }
    }
}
```

### 1.2 IDemoHubNotifier.cs & Events
**Target Path:** `src/Application/Interfaces/IDemoHubNotifier.cs`
Decoupled interface for broadcasting system-wide events.

```csharp
namespace haworks.Application.Interfaces;

public interface IDemoHubNotifier
{
    Task NotifySagaStepAsync(SagaStepEvent e, CancellationToken ct = default);
    Task NotifyVaultRotationAsync(VaultRotationEvent e, CancellationToken ct = default);
    Task NotifyCacheEventAsync(CacheEvent e, CancellationToken ct = default);
}

public record SagaStepEvent(Guid SessionId, string Step, string Service, string Status, DateTime Timestamp);
public record VaultRotationEvent(Guid SessionId, string Stage, int Version, string PreviousVersion, DateTime Timestamp);
public record CacheEvent(Guid SessionId, string Action, string Key, string Source, double LatencyMs, DateTime Timestamp);
```

---

## 2. Interactive Logic (Controller)

### 2.1 DemoController.cs
**Target Path:** `src/Api/Controllers/DemoController.cs`
The gateway for the frontend to "inject" commands into the cluster.

```csharp
[ApiController]
[Route("api/demo")]
public sealed class DemoController : ControllerBase
{
    private readonly IDemoHubNotifier _notifier;
    private readonly ILogger<DemoController> _logger;

    public DemoController(IDemoHubNotifier notifier, ILogger<DemoController> logger)
    {
        _notifier = notifier;
        _logger = logger;
    }

    [HttpPost("saga/start")]
    public async Task<IActionResult> StartSaga([FromHeader(Name = "X-Demo-Session")] Guid sessionId)
    {
        // Fire-and-forget simulation of the real MassTransit State Machine
        _ = Task.Run(async () => {
            await _notifier.NotifySagaStepAsync(new(sessionId, "OrderCreated", "Orders", "completed", DateTime.UtcNow));
            await Task.Delay(800);
            await _notifier.NotifySagaStepAsync(new(sessionId, "StockReserved", "Inventory", "completed", DateTime.UtcNow));
            // ... etc
        });

        return Accepted();
    }

    [HttpPost("vault/rotate")]
    public async Task<IActionResult> RotateVault([FromHeader(Name = "X-Demo-Session")] Guid sessionId)
    {
        _ = Task.Run(async () => {
            await _notifier.NotifyVaultRotationAsync(new(sessionId, "started", 4, "v3", DateTime.UtcNow));
            await Task.Delay(1500);
            await _notifier.NotifyVaultRotationAsync(new(sessionId, "activated", 4, "v3", DateTime.UtcNow));
        });

        return Accepted();
    }
}
```

---

## 3. Registration (Infrastructure)

### 3.1 InfrastructureExtensions.cs
Register the SignalR components in the DI container.

```csharp
public static IServiceCollection AddDemoServices(this IServiceCollection services)
{
    services.AddSignalR();
    services.AddScoped<IDemoHubNotifier, SignalRDemoHubNotifier>();
    return services;
}
```
