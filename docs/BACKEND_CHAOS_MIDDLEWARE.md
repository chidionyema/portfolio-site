# Backend Implementation: Chaos Middleware (.NET 9)

Add this middleware to your `haworks-platform` **Api** project to enable the Production Playground's interactive fault injection.

---

## 1. Create the Middleware
**Target Path:** `src/Api/Middleware/ChaosMiddleware.cs`

```csharp
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace haworks.Api.Middleware;

/// <summary>
/// Intercepts chaos-injection headers from the portfolio frontend 
/// and simulates real-world system faults.
/// </summary>
public sealed class ChaosMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ChaosMiddleware> _logger;

    public ChaosMiddleware(RequestDelegate next, ILogger<ChaosMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // 1. Latency Injection (X-Chaos-Latency: {ms})
        if (context.Request.Headers.TryGetValue("X-Chaos-Latency", out var latencyValue) && 
            int.TryParse(latencyValue, out var latencyMs) && latencyMs > 0)
        {
            _logger.LogWarning("[CHAOS] Injecting {Latency}ms artificial latency", latencyMs);
            await Task.Delay(latencyMs);
        }

        // 2. Service Failure Simulation (X-Chaos-Faulty: true)
        if (context.Request.Headers.TryGetValue("X-Chaos-Faulty", out var faultyValue) && 
            faultyValue == "true")
        {
            // Simulate a 20% random failure rate to stress test the Circuit Breaker
            if (Random.Shared.Next(0, 100) < 20)
            {
                _logger.LogError("[CHAOS] Injecting synthetic 503 Service Unavailable");
                context.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsJsonAsync(new { 
                    error = "ChaosFault", 
                    message = "Chaos Engine: Synthetic Downstream Fault" 
                });
                return;
            }
        }

        await _next(context);
    }
}
```

---

## 2. Register the Middleware
**File:** `src/Api/Program.cs` (or your middleware extension file)

```csharp
// Register near the start of the pipeline, before controllers
if (app.Environment.IsDevelopment() || app.Environment.IsEnvironment("Demo"))
{
    app.UseMiddleware<ChaosMiddleware>();
}
```

---

## 3. Verify in .NET Aspire
When running the `haworks.AppHost`, you can monitor the **[CHAOS]** log entries in the Aspire Dashboard console every time you adjust the sliders in the portfolio UI.
