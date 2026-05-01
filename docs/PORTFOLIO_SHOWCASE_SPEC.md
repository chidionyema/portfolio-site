# HaWorks Portfolio Showcase - Technical Specification

**Version:** 1.0
**Status:** Ready for Implementation
**Estimated Build Time:** 10-14 days

---

## Table of Contents

1. [Overview](#1-overview)
2. [Final Architecture Decisions](#2-final-architecture-decisions)
3. [Infrastructure Setup](#3-infrastructure-setup)
4. [Demo Mode API Implementation](#4-demo-mode-api-implementation)
5. [Credential Rotation Demo](#5-credential-rotation-demo)
6. [Event Streaming System](#6-event-streaming-system)
7. [Frontend Specification](#7-frontend-specification)
8. [Database Schema](#8-database-schema)
9. [Deployment Pipeline](#9-deployment-pipeline)
10. [Content Specification](#10-content-specification)
11. [Testing the Showcase](#11-testing-the-showcase)
12. [Implementation Checklist](#12-implementation-checklist)

---

## 1. Overview

### What We're Building

A live portfolio site at **chidionyema.dev** demonstrating:

| Feature | What Visitors See | What It Proves |
|---------|-------------------|----------------|
| Checkout Flow | Add to cart → Pay → Order complete | Distributed transactions, saga pattern |
| Event Timeline | Real-time events flowing | Event-driven architecture, MassTransit |
| Outbox Viewer | Events written → published atomically | Transactional outbox pattern |
| Circuit Breaker | "Break payment" → fast failures → recovery | Resilience patterns |
| Credential Rotation | Live credentials rotating, zero downtime | Production-grade security |
| Metrics Dashboard | Request rate, errors, queue depth | Observability mindset |
| Code Deep-Dives | Technical blog posts with code | Understanding, not just implementation |

### Success Criteria

- [ ] Visitor can complete a checkout in under 30 seconds
- [ ] Event timeline updates within 500ms of event occurring
- [ ] Credential rotation visible without any request failures
- [ ] Site loads in under 2 seconds
- [ ] Works on mobile
- [ ] Total monthly cost: £0 (excluding domain)

---

## 2. Final Architecture Decisions

No more options. These are the decisions.

### Hosting

| Component | Provider | Plan | Reason |
|-----------|----------|------|--------|
| Static Site | Cloudflare Pages | Free | Fastest, free SSL, global CDN |
| .NET API | Fly.io | Free (1 machine) | Scales to zero, good .NET support |
| PostgreSQL | Neon | Free | Serverless, auto-sleep, branching |
| Redis | Upstash | Free | Serverless, per-request pricing |
| RabbitMQ | CloudAMQP | Little Lemur (Free) | Managed, sufficient for demo |
| Monitoring | Grafana Cloud | Free | 10K series, embeddable |
| Domain | Cloudflare Registrar | ~£8/year | Cheapest, integrated |

### API Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Fly.io Machine                            │
│                         (256MB RAM)                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    .NET 9 API                            │    │
│  │                                                          │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │    │
│  │  │  Controllers │  │  SignalR Hub │  │  Background  │   │    │
│  │  │  /api/*      │  │  /hubs/events│  │  Services    │   │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │    │
│  │                                                          │    │
│  │  ┌──────────────────────────────────────────────────┐   │    │
│  │  │              MassTransit + Outbox                 │   │    │
│  │  │         (In-Process for Demo Mode)                │   │    │
│  │  └──────────────────────────────────────────────────┘   │    │
│  │                                                          │    │
│  │  ┌──────────────────────────────────────────────────┐   │    │
│  │  │           Credential Rotation Service             │   │    │
│  │  │      (Simulates Vault for zero-downtime demo)     │   │    │
│  │  └──────────────────────────────────────────────────┘   │    │
│  │                                                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
   ┌──────────┐     ┌──────────┐     ┌──────────┐
   │   Neon   │     │ Upstash  │     │CloudAMQP │
   │PostgreSQL│     │  Redis   │     │ RabbitMQ │
   └──────────┘     └──────────┘     └──────────┘
```

### Frontend Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Cloudflare Pages                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Astro Static Site                                               │
│  ├── / (Landing)                                                 │
│  ├── /demo (React Island - Interactive)                          │
│  ├── /architecture (MDX + Mermaid diagrams)                      │
│  ├── /deep-dives/* (MDX blog posts)                              │
│  ├── /metrics (Grafana embed)                                    │
│  └── /about (Static)                                             │
│                                                                  │
│  React Islands for:                                              │
│  - Checkout flow component                                       │
│  - Event timeline (WebSocket)                                    │
│  - Circuit breaker demo                                          │
│  - Credential rotation viewer                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Infrastructure Setup

### 3.1 Domain & DNS (Cloudflare)

```bash
# 1. Register domain at Cloudflare Registrar
#    chidionyema.dev (~£8/year)

# 2. DNS Records (set up after deploying services)
# Type  Name              Content
# A     @                 <Fly.io IP>
# CNAME api               <app-name>.fly.dev
# CNAME www               <pages-project>.pages.dev
```

### 3.2 Neon PostgreSQL

```bash
# 1. Create account at neon.tech
# 2. Create project: "haworks-demo"
# 3. Create database: "haworks"
# 4. Note connection string (pooled):
#    postgres://user:pass@ep-xxx.eu-central-1.aws.neon.tech/haworks?sslmode=require

# 5. Create schemas (run in Neon SQL Editor):
```

```sql
-- Create schemas for bounded contexts
CREATE SCHEMA IF NOT EXISTS catalog;
CREATE SCHEMA IF NOT EXISTS orders;
CREATE SCHEMA IF NOT EXISTS payments;
CREATE SCHEMA IF NOT EXISTS content;
CREATE SCHEMA IF NOT EXISTS identity;
CREATE SCHEMA IF NOT EXISTS demo;  -- For demo-specific tables

-- Grant permissions
GRANT ALL ON SCHEMA catalog TO neondb_owner;
GRANT ALL ON SCHEMA orders TO neondb_owner;
GRANT ALL ON SCHEMA payments TO neondb_owner;
GRANT ALL ON SCHEMA content TO neondb_owner;
GRANT ALL ON SCHEMA identity TO neondb_owner;
GRANT ALL ON SCHEMA demo TO neondb_owner;
```

### 3.3 Upstash Redis

```bash
# 1. Create account at upstash.com
# 2. Create database: "haworks-demo"
# 3. Region: EU (or closest to Fly.io region)
# 4. Note connection details:
#    UPSTASH_REDIS_URL=redis://default:xxx@eu1-xxx.upstash.io:6379
```

### 3.4 CloudAMQP RabbitMQ

```bash
# 1. Create account at cloudamqp.com
# 2. Create instance: "haworks-demo"
# 3. Plan: Little Lemur (Free)
# 4. Region: EU (match others)
# 5. Note AMQP URL:
#    amqps://user:pass@rattlesnake.rmq.cloudamqp.com/vhost
```

### 3.5 Fly.io Setup

```bash
# 1. Install flyctl
curl -L https://fly.io/install.sh | sh

# 2. Login
fly auth login

# 3. Create app (don't deploy yet)
fly apps create haworks-demo-api

# 4. Set secrets
fly secrets set \
  DATABASE_URL="postgres://..." \
  REDIS_URL="redis://..." \
  RABBITMQ_URL="amqps://..." \
  ASPNETCORE_ENVIRONMENT="Demo" \
  --app haworks-demo-api

# 5. Create fly.toml (see section 9)
```

### 3.6 Grafana Cloud

```bash
# 1. Create account at grafana.com
# 2. Create stack (free tier)
# 3. Note Prometheus remote write URL
# 4. Create API key for writing metrics
# 5. Create dashboard (see section 7.6)
# 6. Get embed URL for dashboard
```

---

## 4. Demo Mode API Implementation

### 4.1 Project Structure Changes

```
src/
├── Api/
│   ├── Program.cs                    # Modified for Demo mode
│   ├── Hubs/
│   │   └── EventStreamHub.cs         # NEW: SignalR hub
│   ├── Controllers/
│   │   └── DemoController.cs         # NEW: Demo-specific endpoints
│   └── appsettings.Demo.json         # NEW: Demo configuration
│
├── Infrastructure/
│   ├── Demo/                         # NEW: Demo mode services
│   │   ├── CredentialRotationSimulator.cs
│   │   ├── DemoEventBroadcaster.cs
│   │   └── DemoDataSeeder.cs
│   └── Extensions/
│       └── DemoServiceExtensions.cs  # NEW: Demo DI registration
```

### 4.2 Demo Configuration

```json
// src/Api/appsettings.Demo.json
{
  "Demo": {
    "Enabled": true,
    "ResetDataOnStartup": true,
    "CredentialRotation": {
      "Enabled": true,
      "RotationIntervalSeconds": 30,
      "CredentialTTLSeconds": 45
    },
    "CircuitBreaker": {
      "FailureThreshold": 3,
      "DurationSeconds": 15
    },
    "EventBroadcast": {
      "Enabled": true,
      "DelayMs": 100
    }
  },
  "ConnectionStrings": {
    "Default": "Host=...neon.tech;Database=haworks;SearchPath=catalog,orders,payments,content,identity"
  }
}
```

### 4.3 Program.cs Modifications

```csharp
// src/Api/Program.cs

var builder = WebApplication.CreateBuilder(args);

// Detect demo mode
var isDemoMode = builder.Environment.IsEnvironment("Demo") ||
                 builder.Configuration.GetValue<bool>("Demo:Enabled");

if (isDemoMode)
{
    builder.Services.AddDemoMode(builder.Configuration);
}
else
{
    builder.Services.AddProductionMode(builder.Configuration);
}

// Common services
builder.Services.AddSignalR();
builder.Services.AddCors(options =>
{
    options.AddPolicy("Demo", policy =>
    {
        policy.WithOrigins(
            "https://chidionyema.dev",
            "http://localhost:4321"  // Astro dev
        )
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials();
    });
});

var app = builder.Build();

// Seed demo data on startup
if (isDemoMode)
{
    using var scope = app.Services.CreateScope();
    var seeder = scope.ServiceProvider.GetRequiredService<IDemoDataSeeder>();
    await seeder.SeedAsync();
}

app.UseCors("Demo");
app.MapControllers();
app.MapHub<EventStreamHub>("/hubs/events");

app.Run();
```

### 4.4 Demo Service Extensions

```csharp
// src/Infrastructure/Extensions/DemoServiceExtensions.cs

namespace haworks.Infrastructure.Extensions;

public static class DemoServiceExtensions
{
    public static IServiceCollection AddDemoMode(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Single connection string, multiple schemas
        var connectionString = configuration.GetConnectionString("Default");

        // DbContexts with schema search paths
        services.AddDbContext<CatalogDbContext>(options =>
            options.UseNpgsql(connectionString, npgsql =>
                npgsql.MigrationsHistoryTable("__EFMigrationsHistory", "catalog")));

        services.AddDbContext<OrderDbContext>(options =>
            options.UseNpgsql(connectionString, npgsql =>
                npgsql.MigrationsHistoryTable("__EFMigrationsHistory", "orders")));

        services.AddDbContext<PaymentDbContext>(options =>
            options.UseNpgsql(connectionString, npgsql =>
                npgsql.MigrationsHistoryTable("__EFMigrationsHistory", "payments")));

        // Simplified MassTransit for demo (in-memory + RabbitMQ hybrid)
        services.AddMassTransit(x =>
        {
            x.AddConsumers(typeof(CheckoutInitiatedConsumer).Assembly);

            x.UsingRabbitMq((context, cfg) =>
            {
                var rabbitUrl = configuration.GetConnectionString("RabbitMQ");
                cfg.Host(new Uri(rabbitUrl));

                // Add outbox for demo
                cfg.UseMessageRetry(r => r.Intervals(100, 200, 500));

                cfg.ConfigureEndpoints(context);
            });

            // Entity Framework Outbox
            x.AddEntityFrameworkOutbox<OrderDbContext>(o =>
            {
                o.UsePostgres();
                o.UseBusOutbox();
            });
        });

        // Demo-specific services
        services.AddSingleton<ICredentialRotationSimulator, CredentialRotationSimulator>();
        services.AddSingleton<IDemoEventBroadcaster, DemoEventBroadcaster>();
        services.AddScoped<IDemoDataSeeder, DemoDataSeeder>();

        // Hosted service for credential rotation demo
        services.AddHostedService<CredentialRotationBackgroundService>();

        // Resilience with demo-friendly timeouts
        services.AddDemoResilience(configuration);

        return services;
    }

    private static IServiceCollection AddDemoResilience(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var settings = configuration.GetSection("Demo:CircuitBreaker");
        var threshold = settings.GetValue<int>("FailureThreshold");
        var duration = settings.GetValue<int>("DurationSeconds");

        services.AddResiliencePipeline("demo-payment", builder =>
        {
            builder
                .AddCircuitBreaker(new CircuitBreakerStrategyOptions
                {
                    FailureRatio = 0.5,
                    MinimumThroughput = threshold,
                    BreakDuration = TimeSpan.FromSeconds(duration),
                    OnOpened = args =>
                    {
                        // Broadcast circuit state change
                        var broadcaster = args.Context.ServiceProvider?
                            .GetService<IDemoEventBroadcaster>();
                        broadcaster?.BroadcastCircuitState("payment", "open");
                        return ValueTask.CompletedTask;
                    },
                    OnClosed = args =>
                    {
                        var broadcaster = args.Context.ServiceProvider?
                            .GetService<IDemoEventBroadcaster>();
                        broadcaster?.BroadcastCircuitState("payment", "closed");
                        return ValueTask.CompletedTask;
                    }
                })
                .AddRetry(new RetryStrategyOptions
                {
                    MaxRetryAttempts = 2,
                    Delay = TimeSpan.FromMilliseconds(200)
                });
        });

        return services;
    }
}
```

### 4.5 Demo Controller

```csharp
// src/Api/Controllers/DemoController.cs

namespace haworks.Api.Controllers;

[ApiController]
[Route("api/demo")]
public class DemoController : ControllerBase
{
    private readonly IDemoDataSeeder _seeder;
    private readonly ICredentialRotationSimulator _credentialSimulator;
    private readonly IDemoEventBroadcaster _broadcaster;
    private readonly ResiliencePipeline _paymentPipeline;

    public DemoController(
        IDemoDataSeeder seeder,
        ICredentialRotationSimulator credentialSimulator,
        IDemoEventBroadcaster broadcaster,
        [FromKeyedServices("demo-payment")] ResiliencePipeline paymentPipeline)
    {
        _seeder = seeder;
        _credentialSimulator = credentialSimulator;
        _broadcaster = broadcaster;
        _paymentPipeline = paymentPipeline;
    }

    /// <summary>
    /// Reset demo data to initial state
    /// </summary>
    [HttpPost("reset")]
    public async Task<IActionResult> ResetDemo(CancellationToken ct)
    {
        await _seeder.ResetAsync(ct);
        await _broadcaster.BroadcastAsync("DemoReset", new { Timestamp = DateTime.UtcNow });
        return Ok(new { Message = "Demo data reset" });
    }

    /// <summary>
    /// Get current credential rotation state
    /// </summary>
    [HttpGet("credentials")]
    public IActionResult GetCredentialState()
    {
        var state = _credentialSimulator.GetCurrentState();
        return Ok(state);
    }

    /// <summary>
    /// Force credential rotation (for demo purposes)
    /// </summary>
    [HttpPost("credentials/rotate")]
    public async Task<IActionResult> ForceRotation(CancellationToken ct)
    {
        await _credentialSimulator.ForceRotationAsync(ct);
        return Ok(new { Message = "Rotation triggered" });
    }

    /// <summary>
    /// Simulate payment provider failure (opens circuit breaker)
    /// </summary>
    [HttpPost("circuit-breaker/fail")]
    public async Task<IActionResult> SimulatePaymentFailure(CancellationToken ct)
    {
        // Simulate failures to trip circuit breaker
        for (int i = 0; i < 5; i++)
        {
            try
            {
                await _paymentPipeline.ExecuteAsync(async token =>
                {
                    throw new HttpRequestException("Simulated payment provider failure");
                }, ct);
            }
            catch { /* Expected */ }
        }

        return Ok(new { Message = "Circuit breaker should now be open" });
    }

    /// <summary>
    /// Get circuit breaker state
    /// </summary>
    [HttpGet("circuit-breaker/state")]
    public IActionResult GetCircuitState()
    {
        // Return current circuit state
        return Ok(new
        {
            Payment = _broadcaster.GetCircuitState("payment")
        });
    }

    /// <summary>
    /// Get outbox messages (for visualization)
    /// </summary>
    [HttpGet("outbox")]
    public async Task<IActionResult> GetOutboxMessages(
        [FromServices] OrderDbContext db,
        CancellationToken ct)
    {
        var messages = await db.Database
            .SqlQuery<OutboxMessageDto>($"""
                SELECT "MessageId", "MessageType", "SentTime", "Headers"
                FROM orders."OutboxMessage"
                ORDER BY "SentTime" DESC
                LIMIT 20
                """)
            .ToListAsync(ct);

        return Ok(messages);
    }
}

public record OutboxMessageDto(
    Guid MessageId,
    string MessageType,
    DateTime? SentTime,
    string Headers);
```

---

## 5. Credential Rotation Demo

This is the centrepiece for showing zero-downtime rotation.

### 5.1 How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                  CREDENTIAL ROTATION FLOW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐      Every 30s      ┌─────────────────┐    │
│  │   Credential    │ ──────────────────▶ │   New Creds     │    │
│  │   Simulator     │                      │   Generated     │    │
│  │                 │                      │                 │    │
│  │  TTL: 45s       │                      │  cred_v2        │    │
│  │  Current: v1    │                      │  TTL: 45s       │    │
│  └────────┬────────┘                      └────────┬────────┘    │
│           │                                        │             │
│           │ Broadcast to UI                        │             │
│           ▼                                        ▼             │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                     SignalR Hub                              ││
│  │                                                              ││
│  │  Event: CredentialRotating { old: v1, new: v2, at: ... }    ││
│  │  Event: CredentialRotated { active: v2, connections: 12 }   ││
│  │  Event: OldCredentialExpired { expired: v1 }                ││
│  └─────────────────────────────────────────────────────────────┘│
│           │                                                      │
│           │ WebSocket                                            │
│           ▼                                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Frontend UI                               ││
│  │                                                              ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          ││
│  │  │ Credential  │  │ Connection  │  │ Request     │          ││
│  │  │ Timeline    │  │ Pool Status │  │ Counter     │          ││
│  │  │             │  │             │  │             │          ││
│  │  │ v1 ████░░░  │  │ Active: 12  │  │ Total: 847  │          ││
│  │  │ v2 ░░░░░░░  │  │ Draining: 3 │  │ Errors: 0   │          ││
│  │  │    ↑ new    │  │             │  │             │          ││
│  │  └─────────────┘  └─────────────┘  └─────────────┘          ││
│  │                                                              ││
│  │  "Zero failed requests during rotation"                      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Credential Rotation Simulator

```csharp
// src/Infrastructure/Demo/CredentialRotationSimulator.cs

namespace haworks.Infrastructure.Demo;

public interface ICredentialRotationSimulator
{
    CredentialState GetCurrentState();
    Task ForceRotationAsync(CancellationToken ct);
    event EventHandler<CredentialRotationEvent>? OnRotation;
}

public class CredentialRotationSimulator : ICredentialRotationSimulator
{
    private readonly ILogger<CredentialRotationSimulator> _logger;
    private readonly IDemoEventBroadcaster _broadcaster;
    private readonly TimeSpan _rotationInterval;
    private readonly TimeSpan _credentialTTL;

    private CredentialState _currentState;
    private int _version = 1;
    private int _totalRequests = 0;
    private int _requestsDuringRotation = 0;
    private int _failedDuringRotation = 0;

    public event EventHandler<CredentialRotationEvent>? OnRotation;

    public CredentialRotationSimulator(
        ILogger<CredentialRotationSimulator> logger,
        IDemoEventBroadcaster broadcaster,
        IConfiguration configuration)
    {
        _logger = logger;
        _broadcaster = broadcaster;

        var settings = configuration.GetSection("Demo:CredentialRotation");
        _rotationInterval = TimeSpan.FromSeconds(settings.GetValue<int>("RotationIntervalSeconds"));
        _credentialTTL = TimeSpan.FromSeconds(settings.GetValue<int>("CredentialTTLSeconds"));

        _currentState = CreateNewCredential();
    }

    public CredentialState GetCurrentState() => _currentState with
    {
        TotalRequests = _totalRequests,
        RequestsDuringLastRotation = _requestsDuringRotation,
        FailedDuringLastRotation = _failedDuringRotation
    };

    public async Task ForceRotationAsync(CancellationToken ct)
    {
        var oldCredential = _currentState;
        var newCredential = CreateNewCredential();

        _logger.LogInformation(
            "Rotating credentials: {OldVersion} -> {NewVersion}",
            oldCredential.Version, newCredential.Version);

        // Broadcast: Rotation starting
        await _broadcaster.BroadcastAsync("CredentialRotating", new
        {
            OldVersion = oldCredential.Version,
            NewVersion = newCredential.Version,
            OldExpiresAt = oldCredential.ExpiresAt,
            Timestamp = DateTime.UtcNow
        });

        // Simulate connection pool drain (the interesting part)
        _requestsDuringRotation = 0;
        _failedDuringRotation = 0;

        // In real Vault: connections using old creds finish their work
        // New connections get new creds
        // Old creds remain valid until TTL expires

        await _broadcaster.BroadcastAsync("ConnectionPoolDraining", new
        {
            OldConnections = Random.Shared.Next(5, 15),
            DrainStarted = DateTime.UtcNow
        });

        // Simulate drain time (1-2 seconds)
        await Task.Delay(TimeSpan.FromSeconds(1.5), ct);

        // Switch to new credential
        _currentState = newCredential;

        await _broadcaster.BroadcastAsync("CredentialRotated", new
        {
            ActiveVersion = newCredential.Version,
            ActiveConnections = Random.Shared.Next(10, 20),
            OldVersion = oldCredential.Version,
            OldExpiresIn = (oldCredential.ExpiresAt - DateTime.UtcNow).TotalSeconds,
            Timestamp = DateTime.UtcNow
        });

        // Fire event for any listeners
        OnRotation?.Invoke(this, new CredentialRotationEvent
        {
            OldVersion = oldCredential.Version,
            NewVersion = newCredential.Version,
            RotatedAt = DateTime.UtcNow
        });

        _logger.LogInformation(
            "Rotation complete. Requests during rotation: {Count}, Failed: {Failed}",
            _requestsDuringRotation, _failedDuringRotation);

        // Schedule old credential expiry broadcast
        _ = Task.Run(async () =>
        {
            var remainingTTL = oldCredential.ExpiresAt - DateTime.UtcNow;
            if (remainingTTL > TimeSpan.Zero)
            {
                await Task.Delay(remainingTTL, ct);
            }

            await _broadcaster.BroadcastAsync("OldCredentialExpired", new
            {
                ExpiredVersion = oldCredential.Version,
                Timestamp = DateTime.UtcNow
            });
        }, ct);
    }

    public void RecordRequest(bool success)
    {
        Interlocked.Increment(ref _totalRequests);

        // If we're in rotation window, track it
        if (_currentState.IsInRotationWindow)
        {
            Interlocked.Increment(ref _requestsDuringRotation);
            if (!success)
            {
                Interlocked.Increment(ref _failedDuringRotation);
            }
        }
    }

    private CredentialState CreateNewCredential()
    {
        _version++;
        var now = DateTime.UtcNow;

        return new CredentialState
        {
            Version = $"cred_v{_version}",
            Username = $"demo_user_{_version}",
            IssuedAt = now,
            ExpiresAt = now.Add(_credentialTTL),
            RotationDue = now.Add(_rotationInterval),
            TTLSeconds = (int)_credentialTTL.TotalSeconds
        };
    }
}

public record CredentialState
{
    public required string Version { get; init; }
    public required string Username { get; init; }
    public required DateTime IssuedAt { get; init; }
    public required DateTime ExpiresAt { get; init; }
    public required DateTime RotationDue { get; init; }
    public required int TTLSeconds { get; init; }

    public int TotalRequests { get; init; }
    public int RequestsDuringLastRotation { get; init; }
    public int FailedDuringLastRotation { get; init; }

    public double RemainingTTLSeconds => (ExpiresAt - DateTime.UtcNow).TotalSeconds;
    public double TimeUntilRotationSeconds => (RotationDue - DateTime.UtcNow).TotalSeconds;
    public bool IsInRotationWindow => TimeUntilRotationSeconds <= 5;
}

public record CredentialRotationEvent
{
    public required string OldVersion { get; init; }
    public required string NewVersion { get; init; }
    public required DateTime RotatedAt { get; init; }
}
```

### 5.3 Credential Rotation Background Service

```csharp
// src/Infrastructure/Demo/CredentialRotationBackgroundService.cs

namespace haworks.Infrastructure.Demo;

public class CredentialRotationBackgroundService : BackgroundService
{
    private readonly ICredentialRotationSimulator _simulator;
    private readonly IConfiguration _configuration;
    private readonly ILogger<CredentialRotationBackgroundService> _logger;

    public CredentialRotationBackgroundService(
        ICredentialRotationSimulator simulator,
        IConfiguration configuration,
        ILogger<CredentialRotationBackgroundService> logger)
    {
        _simulator = simulator;
        _configuration = configuration;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var intervalSeconds = _configuration.GetValue<int>("Demo:CredentialRotation:RotationIntervalSeconds");
        var interval = TimeSpan.FromSeconds(intervalSeconds);

        _logger.LogInformation("Credential rotation service started. Interval: {Interval}s", intervalSeconds);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(interval, stoppingToken);
                await _simulator.ForceRotationAsync(stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during credential rotation");
            }
        }
    }
}
```

### 5.4 What Visitors See

The frontend shows:

```
┌─────────────────────────────────────────────────────────────────┐
│           ZERO-DOWNTIME CREDENTIAL ROTATION                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Current Credential: cred_v7                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 32s remaining        │
│                                                                  │
│  Next rotation in: 18 seconds                                    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  ROTATION HISTORY                                           ││
│  │                                                             ││
│  │  12:03:45  cred_v7 activated                                ││
│  │  12:03:44  Connection pool drained (12 → 0 old connections) ││
│  │  12:03:43  cred_v7 issued, cred_v6 draining                 ││
│  │  12:03:15  cred_v6 activated                                ││
│  │  ...                                                        ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  STATS                                                      ││
│  │                                                             ││
│  │  Total requests:           847                              ││
│  │  Requests during rotation: 23                               ││
│  │  Failed during rotation:   0  ✓                             ││
│  │                                                             ││
│  │  "Zero failed requests across 6 credential rotations"       ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  [Force Rotation Now]                                            │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  HOW IT WORKS                                                    │
│                                                                  │
│  In production, this uses HashiCorp Vault with dynamic          │
│  database credentials. The pattern:                              │
│                                                                  │
│  1. Vault issues short-lived credentials (TTL: 1 hour)          │
│  2. Before expiry, the app requests new credentials             │
│  3. New connections use new creds, old connections drain        │
│  4. Old credentials remain valid until their TTL expires        │
│  5. Zero downtime: requests never see auth failures             │
│                                                                  │
│  [View the Vault integration code on GitHub]                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Event Streaming System

### 6.1 SignalR Hub

```csharp
// src/Api/Hubs/EventStreamHub.cs

namespace haworks.Api.Hubs;

public class EventStreamHub : Hub
{
    private readonly ILogger<EventStreamHub> _logger;

    public EventStreamHub(ILogger<EventStreamHub> logger)
    {
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        _logger.LogInformation("Client connected: {ConnectionId}", Context.ConnectionId);
        await Groups.AddToGroupAsync(Context.ConnectionId, "event-watchers");
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation("Client disconnected: {ConnectionId}", Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }

    // Client can request current state on connect
    public async Task RequestCurrentState()
    {
        await Clients.Caller.SendAsync("CurrentState", new
        {
            Timestamp = DateTime.UtcNow,
            Message = "Connected to event stream"
        });
    }
}
```

### 6.2 Event Broadcaster

```csharp
// src/Infrastructure/Demo/DemoEventBroadcaster.cs

namespace haworks.Infrastructure.Demo;

public interface IDemoEventBroadcaster
{
    Task BroadcastAsync<T>(string eventType, T payload);
    void BroadcastCircuitState(string service, string state);
    string GetCircuitState(string service);
}

public class DemoEventBroadcaster : IDemoEventBroadcaster
{
    private readonly IHubContext<EventStreamHub> _hubContext;
    private readonly ILogger<DemoEventBroadcaster> _logger;
    private readonly ConcurrentDictionary<string, string> _circuitStates = new();

    public DemoEventBroadcaster(
        IHubContext<EventStreamHub> hubContext,
        ILogger<DemoEventBroadcaster> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task BroadcastAsync<T>(string eventType, T payload)
    {
        var envelope = new EventEnvelope
        {
            Type = eventType,
            Payload = payload,
            Timestamp = DateTime.UtcNow,
            Id = Guid.NewGuid()
        };

        _logger.LogDebug("Broadcasting event: {EventType}", eventType);

        await _hubContext.Clients.Group("event-watchers")
            .SendAsync("EventReceived", envelope);
    }

    public void BroadcastCircuitState(string service, string state)
    {
        _circuitStates[service] = state;

        _ = BroadcastAsync("CircuitStateChanged", new
        {
            Service = service,
            State = state,
            Timestamp = DateTime.UtcNow
        });
    }

    public string GetCircuitState(string service)
    {
        return _circuitStates.GetValueOrDefault(service, "closed");
    }
}

public record EventEnvelope
{
    public required string Type { get; init; }
    public required object? Payload { get; init; }
    public required DateTime Timestamp { get; init; }
    public required Guid Id { get; init; }
}
```

### 6.3 Consumer Event Broadcasting

Modify consumers to broadcast events:

```csharp
// Modify existing consumer to broadcast

internal sealed class CheckoutInitiatedConsumer : IConsumer<CheckoutInitiatedEvent>
{
    private readonly IDemoEventBroadcaster _broadcaster;
    private readonly ILogger<CheckoutInitiatedConsumer> _logger;
    // ... other dependencies

    public async Task Consume(ConsumeContext<CheckoutInitiatedEvent> context)
    {
        var @event = context.Message;

        // Broadcast to UI watchers
        await _broadcaster.BroadcastAsync("CheckoutInitiated", new
        {
            OrderId = @event.OrderId,
            CustomerId = @event.CustomerId,
            TotalAmount = @event.TotalAmount,
            ItemCount = @event.Items.Count
        });

        // Normal processing continues...
        _logger.LogInformation("Processing checkout for order {OrderId}", @event.OrderId);

        // After processing
        await _broadcaster.BroadcastAsync("StockReserved", new
        {
            OrderId = @event.OrderId,
            ReservedItems = @event.Items.Count
        });
    }
}
```

---

## 7. Frontend Specification

### 7.1 Project Setup

```bash
# Create Astro project
npm create astro@latest chidionyema-portfolio -- --template minimal

cd chidionyema-portfolio

# Add integrations
npx astro add react
npx astro add tailwind
npx astro add mdx

# Add dependencies
npm install @microsoft/signalr
npm install mermaid
npm install framer-motion
npm install @heroicons/react
```

### 7.2 Project Structure

```
chidionyema-portfolio/
├── astro.config.mjs
├── tailwind.config.mjs
├── src/
│   ├── layouts/
│   │   └── BaseLayout.astro
│   │
│   ├── pages/
│   │   ├── index.astro                 # Landing page
│   │   ├── demo.astro                  # Interactive demo
│   │   ├── architecture.astro          # Architecture diagrams
│   │   ├── metrics.astro               # Grafana embed
│   │   ├── about.astro                 # About + CV
│   │   └── deep-dives/
│   │       ├── index.astro             # Blog listing
│   │       ├── transactional-outbox.mdx
│   │       ├── cqrs-mediatr.mdx
│   │       ├── circuit-breaker.mdx
│   │       ├── vault-rotation.mdx
│   │       └── testing-events.mdx
│   │
│   ├── components/
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   │
│   │   └── react/                      # React islands
│   │       ├── CheckoutDemo.tsx
│   │       ├── EventTimeline.tsx
│   │       ├── CircuitBreakerDemo.tsx
│   │       ├── CredentialRotationDemo.tsx
│   │       ├── OutboxViewer.tsx
│   │       └── hooks/
│   │           └── useSignalR.ts
│   │
│   ├── styles/
│   │   └── global.css
│   │
│   └── content/
│       └── config.ts                   # Content collections
│
├── public/
│   ├── cv.pdf
│   └── og-image.png
│
└── package.json
```

### 7.3 SignalR Hook

```typescript
// src/components/react/hooks/useSignalR.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import * as signalR from '@microsoft/signalr';

const API_URL = import.meta.env.PUBLIC_API_URL || 'https://api.chidionyema.dev';

interface EventEnvelope {
  type: string;
  payload: unknown;
  timestamp: string;
  id: string;
}

export function useSignalR() {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<EventEnvelope[]>([]);
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_URL}/hubs/events`)
      .withAutomaticReconnect()
      .build();

    connection.on('EventReceived', (event: EventEnvelope) => {
      setEvents(prev => [event, ...prev].slice(0, 50)); // Keep last 50
    });

    connection.onreconnecting(() => setConnected(false));
    connection.onreconnected(() => setConnected(true));
    connection.onclose(() => setConnected(false));

    connection.start()
      .then(() => {
        setConnected(true);
        connectionRef.current = connection;
      })
      .catch(err => console.error('SignalR connection error:', err));

    return () => {
      connection.stop();
    };
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return { connected, events, clearEvents };
}
```

### 7.4 Event Timeline Component

```tsx
// src/components/react/EventTimeline.tsx

import { useSignalR } from './hooks/useSignalR';
import { motion, AnimatePresence } from 'framer-motion';

const eventColors: Record<string, string> = {
  CheckoutInitiated: 'bg-blue-500',
  StockReserved: 'bg-green-500',
  PaymentCreated: 'bg-yellow-500',
  PaymentCompleted: 'bg-green-600',
  OrderCompleted: 'bg-purple-500',
  CircuitStateChanged: 'bg-red-500',
  CredentialRotating: 'bg-orange-500',
  CredentialRotated: 'bg-teal-500',
};

export function EventTimeline() {
  const { connected, events, clearEvents } = useSignalR();

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-gray-400 text-sm">
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <button
          onClick={clearEvents}
          className="text-gray-400 hover:text-white text-sm"
        >
          Clear
        </button>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {events.map(event => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-start gap-3 text-sm"
            >
              <span className="text-gray-500 font-mono w-20 flex-shrink-0">
                {new Date(event.timestamp).toLocaleTimeString()}
              </span>
              <div
                className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                  eventColors[event.type] || 'bg-gray-500'
                }`}
              />
              <div className="flex-1">
                <span className="text-white font-medium">{event.type}</span>
                <pre className="text-gray-400 text-xs mt-1 overflow-x-auto">
                  {JSON.stringify(event.payload, null, 2)}
                </pre>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {events.length === 0 && (
          <p className="text-gray-500 text-center py-8">
            Waiting for events... Try the checkout demo!
          </p>
        )}
      </div>
    </div>
  );
}
```

### 7.5 Credential Rotation Component

```tsx
// src/components/react/CredentialRotationDemo.tsx

import { useState, useEffect } from 'react';
import { useSignalR } from './hooks/useSignalR';
import { motion } from 'framer-motion';

interface CredentialState {
  version: string;
  username: string;
  issuedAt: string;
  expiresAt: string;
  rotationDue: string;
  ttlSeconds: number;
  totalRequests: number;
  requestsDuringLastRotation: number;
  failedDuringLastRotation: number;
  remainingTTLSeconds: number;
  timeUntilRotationSeconds: number;
}

const API_URL = import.meta.env.PUBLIC_API_URL || 'https://api.chidionyema.dev';

export function CredentialRotationDemo() {
  const [state, setState] = useState<CredentialState | null>(null);
  const [rotationHistory, setRotationHistory] = useState<string[]>([]);
  const { events } = useSignalR();

  // Poll for current state
  useEffect(() => {
    const fetchState = async () => {
      try {
        const res = await fetch(`${API_URL}/api/demo/credentials`);
        const data = await res.json();
        setState(data);
      } catch (err) {
        console.error('Failed to fetch credential state:', err);
      }
    };

    fetchState();
    const interval = setInterval(fetchState, 1000);
    return () => clearInterval(interval);
  }, []);

  // Track rotation events
  useEffect(() => {
    const rotationEvents = events.filter(e =>
      ['CredentialRotating', 'CredentialRotated', 'ConnectionPoolDraining', 'OldCredentialExpired'].includes(e.type)
    );

    if (rotationEvents.length > 0) {
      const latest = rotationEvents[0];
      setRotationHistory(prev => [
        `${new Date(latest.timestamp).toLocaleTimeString()} - ${latest.type}`,
        ...prev
      ].slice(0, 10));
    }
  }, [events]);

  const forceRotation = async () => {
    await fetch(`${API_URL}/api/demo/credentials/rotate`, { method: 'POST' });
  };

  if (!state) {
    return <div className="animate-pulse bg-gray-800 h-64 rounded-lg" />;
  }

  const ttlPercentage = (state.remainingTTLSeconds / state.ttlSeconds) * 100;

  return (
    <div className="bg-gray-900 rounded-lg p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-white text-lg font-semibold">Zero-Downtime Credential Rotation</h3>
          <p className="text-gray-400 text-sm mt-1">
            Watch credentials rotate without any failed requests
          </p>
        </div>
        <button
          onClick={forceRotation}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
        >
          Force Rotation Now
        </button>
      </div>

      {/* Current Credential */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-400">Current Credential</span>
          <span className="text-white font-mono">{state.version}</span>
        </div>

        {/* TTL Progress Bar */}
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className={`h-full ${ttlPercentage > 30 ? 'bg-green-500' : ttlPercentage > 10 ? 'bg-yellow-500' : 'bg-red-500'}`}
            initial={{ width: '100%' }}
            animate={{ width: `${ttlPercentage}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>TTL</span>
          <span>{Math.round(state.remainingTTLSeconds)}s remaining</span>
        </div>
      </div>

      {/* Next Rotation */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex justify-between">
          <span className="text-gray-400">Next rotation in</span>
          <span className={`font-mono ${state.timeUntilRotationSeconds < 10 ? 'text-orange-500' : 'text-white'}`}>
            {Math.round(state.timeUntilRotationSeconds)}s
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-white">{state.totalRequests}</div>
          <div className="text-gray-400 text-sm">Total Requests</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-white">{state.requestsDuringLastRotation}</div>
          <div className="text-gray-400 text-sm">During Rotation</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <div className={`text-2xl font-bold ${state.failedDuringLastRotation === 0 ? 'text-green-500' : 'text-red-500'}`}>
            {state.failedDuringLastRotation}
          </div>
          <div className="text-gray-400 text-sm">Failed</div>
        </div>
      </div>

      {/* Zero Failures Badge */}
      {state.failedDuringLastRotation === 0 && state.totalRequests > 0 && (
        <div className="bg-green-900/50 border border-green-500/50 rounded-lg p-3 text-center">
          <span className="text-green-400">
            ✓ Zero failed requests across all credential rotations
          </span>
        </div>
      )}

      {/* Rotation History */}
      <div>
        <h4 className="text-gray-400 text-sm mb-2">Rotation History</h4>
        <div className="bg-gray-800 rounded-lg p-3 max-h-32 overflow-y-auto">
          {rotationHistory.length > 0 ? (
            <ul className="space-y-1 text-sm font-mono">
              {rotationHistory.map((entry, i) => (
                <li key={i} className="text-gray-300">{entry}</li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">Waiting for rotation events...</p>
          )}
        </div>
      </div>

      {/* How It Works */}
      <details className="text-sm">
        <summary className="text-gray-400 cursor-pointer hover:text-white">
          How it works (production uses HashiCorp Vault)
        </summary>
        <div className="mt-3 text-gray-400 space-y-2">
          <p>
            In production, this system uses HashiCorp Vault with dynamic database credentials:
          </p>
          <ol className="list-decimal list-inside space-y-1 pl-2">
            <li>Vault issues short-lived credentials (TTL: 1 hour)</li>
            <li>Before expiry, the app requests new credentials</li>
            <li>New connections use new creds, old connections drain</li>
            <li>Old credentials remain valid until their TTL expires</li>
            <li>Zero downtime: requests never see auth failures</li>
          </ol>
          <a
            href="https://github.com/chidionyema/haworks/tree/main/src/Infrastructure/Vault"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline inline-block mt-2"
          >
            View the Vault integration code on GitHub →
          </a>
        </div>
      </details>
    </div>
  );
}
```

### 7.6 Checkout Demo Component

```tsx
// src/components/react/CheckoutDemo.tsx

import { useState } from 'react';
import { motion } from 'framer-motion';

const API_URL = import.meta.env.PUBLIC_API_URL || 'https://api.chidionyema.dev';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
}

const DEMO_PRODUCTS: Product[] = [
  { id: '1', name: 'Clean Architecture Book', price: 29.99, stock: 10 },
  { id: '2', name: 'DDD Masterclass', price: 49.99, stock: 5 },
  { id: '3', name: 'Event Sourcing Guide', price: 39.99, stock: 8 },
];

type CheckoutState = 'idle' | 'adding' | 'checking-out' | 'processing' | 'complete' | 'error';

export function CheckoutDemo() {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [state, setState] = useState<CheckoutState>('idle');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addToCart = (productId: string) => {
    setCart(prev => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1
    }));
  };

  const cartTotal = Object.entries(cart).reduce((total, [id, qty]) => {
    const product = DEMO_PRODUCTS.find(p => p.id === id);
    return total + (product?.price || 0) * qty;
  }, 0);

  const cartItems = Object.entries(cart).filter(([_, qty]) => qty > 0);

  const checkout = async () => {
    setState('checking-out');
    setError(null);

    try {
      const items = cartItems.map(([id, qty]) => ({
        productId: id,
        quantity: qty
      }));

      const response = await fetch(`${API_URL}/api/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          customerEmail: 'demo@example.com',
          idempotencyKey: crypto.randomUUID()
        })
      });

      if (!response.ok) {
        throw new Error('Checkout failed');
      }

      const result = await response.json();
      setState('processing');

      // Poll for completion
      const checkStatus = async () => {
        const statusRes = await fetch(`${API_URL}/api/orders/${result.orderId}`);
        const order = await statusRes.json();

        if (order.status === 'Completed' || order.status === 'Paid') {
          setState('complete');
          setOrderId(result.orderId);
        } else if (order.status === 'Failed') {
          throw new Error('Order failed');
        } else {
          setTimeout(checkStatus, 500);
        }
      };

      setTimeout(checkStatus, 1000);

    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const reset = async () => {
    setCart({});
    setState('idle');
    setOrderId(null);
    setError(null);
    await fetch(`${API_URL}/api/demo/reset`, { method: 'POST' });
  };

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <h3 className="text-white text-lg font-semibold mb-4">Try the Checkout Flow</h3>

      {/* Products */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {DEMO_PRODUCTS.map(product => (
          <div key={product.id} className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-white font-medium">{product.name}</h4>
            <p className="text-green-400 font-mono">£{product.price}</p>
            <p className="text-gray-500 text-sm">Stock: {product.stock}</p>
            <button
              onClick={() => addToCart(product.id)}
              disabled={state !== 'idle'}
              className="mt-2 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white py-1 rounded text-sm"
            >
              Add to Cart {cart[product.id] ? `(${cart[product.id]})` : ''}
            </button>
          </div>
        ))}
      </div>

      {/* Cart */}
      {cartItems.length > 0 && state === 'idle' && (
        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400">Cart Total:</span>
            <span className="text-white font-mono">£{cartTotal.toFixed(2)}</span>
          </div>
          <button
            onClick={checkout}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded font-medium"
          >
            Checkout Now
          </button>
        </div>
      )}

      {/* Status */}
      {state !== 'idle' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-lg p-4 ${
            state === 'complete' ? 'bg-green-900/50 border border-green-500/50' :
            state === 'error' ? 'bg-red-900/50 border border-red-500/50' :
            'bg-blue-900/50 border border-blue-500/50'
          }`}
        >
          {state === 'checking-out' && (
            <p className="text-blue-400">Creating order...</p>
          )}
          {state === 'processing' && (
            <p className="text-blue-400">Processing payment... Watch the event timeline!</p>
          )}
          {state === 'complete' && (
            <div>
              <p className="text-green-400 font-medium">Order Complete!</p>
              <p className="text-green-300 text-sm mt-1">Order ID: {orderId}</p>
            </div>
          )}
          {state === 'error' && (
            <p className="text-red-400">{error}</p>
          )}
        </motion.div>
      )}

      {/* Reset */}
      {(state === 'complete' || state === 'error') && (
        <button
          onClick={reset}
          className="mt-4 w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded"
        >
          Reset Demo
        </button>
      )}

      <p className="text-gray-500 text-xs mt-4">
        This is a real distributed transaction. Watch the Event Timeline to see
        events flow through the message queue in real-time.
      </p>
    </div>
  );
}
```

### 7.7 Grafana Dashboard Embed

```astro
---
// src/pages/metrics.astro
import BaseLayout from '../layouts/BaseLayout.astro';

const GRAFANA_EMBED_URL = import.meta.env.GRAFANA_EMBED_URL;
---

<BaseLayout title="Live Metrics">
  <div class="max-w-6xl mx-auto px-4 py-12">
    <h1 class="text-3xl font-bold text-white mb-4">Live System Metrics</h1>
    <p class="text-gray-400 mb-8">
      Real-time observability dashboard showing request rates, error rates, and queue depth.
    </p>

    <div class="bg-gray-900 rounded-lg overflow-hidden">
      <iframe
        src={GRAFANA_EMBED_URL}
        width="100%"
        height="600"
        frameborder="0"
        class="w-full"
      />
    </div>

    <div class="mt-8 bg-gray-800 rounded-lg p-6">
      <h2 class="text-xl font-semibold text-white mb-4">What You're Seeing</h2>
      <ul class="space-y-2 text-gray-400">
        <li>• <strong>Request Rate:</strong> HTTP requests per second to the API</li>
        <li>• <strong>Error Rate:</strong> Percentage of requests returning 5xx errors</li>
        <li>• <strong>Queue Depth:</strong> Messages waiting in RabbitMQ</li>
        <li>• <strong>Response Time:</strong> P50, P95, P99 latency percentiles</li>
        <li>• <strong>Circuit Breaker:</strong> State of payment provider circuit</li>
      </ul>
    </div>
  </div>
</BaseLayout>
```

---

## 8. Database Schema

### 8.1 Schema Setup Script

```sql
-- Run this in Neon SQL Editor after creating the database

-- Schemas
CREATE SCHEMA IF NOT EXISTS catalog;
CREATE SCHEMA IF NOT EXISTS orders;
CREATE SCHEMA IF NOT EXISTS payments;
CREATE SCHEMA IF NOT EXISTS content;
CREATE SCHEMA IF NOT EXISTS identity;
CREATE SCHEMA IF NOT EXISTS demo;

-- Demo-specific: Event log for visualization
CREATE TABLE demo.event_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_event_log_created ON demo.event_log(created_at DESC);

-- Demo-specific: Credential rotation history
CREATE TABLE demo.credential_rotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    old_version VARCHAR(50),
    new_version VARCHAR(50) NOT NULL,
    rotated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    requests_during_rotation INT NOT NULL DEFAULT 0,
    failed_during_rotation INT NOT NULL DEFAULT 0
);
```

### 8.2 EF Core Migration for Demo Mode

```csharp
// Create a migration specifically for demo mode schema mappings

// In each DbContext, configure schema:
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    modelBuilder.HasDefaultSchema("orders");  // or "catalog", etc.

    // ... existing configuration
}
```

---

## 9. Deployment Pipeline

### 9.1 Fly.io Configuration

```toml
# fly.toml

app = "haworks-demo-api"
primary_region = "lhr"  # London

[build]
  dockerfile = "Dockerfile.demo"

[env]
  ASPNETCORE_ENVIRONMENT = "Demo"
  ASPNETCORE_URLS = "http://+:8080"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = true      # Scale to zero
  auto_start_machines = true     # Wake on request
  min_machines_running = 0       # Allow full scale-down

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 256
```

### 9.2 Demo Dockerfile

```dockerfile
# Dockerfile.demo

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy csproj and restore
COPY ["src/Api/Api.csproj", "Api/"]
COPY ["src/Application/Application.csproj", "Application/"]
COPY ["src/Domain/Domain.csproj", "Domain/"]
COPY ["src/Infrastructure/Infrastructure.csproj", "Infrastructure/"]
RUN dotnet restore "Api/Api.csproj"

# Copy everything and build
COPY src/ .
RUN dotnet publish "Api/Api.csproj" -c Release -o /app/publish

# Runtime image
FROM mcr.microsoft.com/dotnet/aspnet:9.0-alpine AS runtime
WORKDIR /app

# Security: non-root user
RUN adduser -D appuser
USER appuser

COPY --from=build /app/publish .

EXPOSE 8080
ENTRYPOINT ["dotnet", "Api.dll"]
```

### 9.3 GitHub Actions Workflow

```yaml
# .github/workflows/deploy-demo.yml

name: Deploy Demo

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy-api:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: superfly/flyctl-actions/setup-flyctl@master

      - run: flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install and build
        working-directory: ./portfolio
        run: |
          npm ci
          npm run build
        env:
          PUBLIC_API_URL: https://api.chidionyema.dev

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: chidionyema-portfolio
          directory: ./portfolio/dist
```

---

## 10. Content Specification

### 10.1 Deep-Dive Posts

Each post follows this structure:

```markdown
---
title: "Building a Transactional Outbox in .NET"
description: "How to ensure events and data are saved atomically"
pubDate: 2026-04-26
tags: ["dotnet", "architecture", "events"]
---

## The Problem

[2-3 paragraphs explaining the dual-write problem]

## The Solution

[Explanation with diagram]

## Implementation

[Code walkthrough with actual HaWorks code]

```csharp
// Actual code from the repo
```

## Testing

[How to test this pattern]

## Trade-offs

[Honest discussion of complexity vs. benefit]

## Try It

[Link to live demo where they can see this working]

## Source Code

[Link to GitHub files]
```

### 10.2 Required Posts

| Post | Key Points |
|------|------------|
| Transactional Outbox | Dual-write problem, MassTransit outbox, exactly-once delivery |
| CQRS with MediatR | When to use, handler structure, validation pipeline |
| Circuit Breaker Patterns | Polly, state machine, testing, live demo |
| Zero-Downtime Vault Rotation | Dynamic creds, connection pool, the interceptor pattern |
| Testing Event-Driven Systems | MassTransit harness, Testcontainers, consumer testing |
| Clean Architecture in Practice | Layer rules, when to break them, architecture tests |

---

## 11. Testing the Showcase

### 11.1 API Health Checks

```bash
# After deployment, verify:

# Health endpoint
curl https://api.chidionyema.dev/health

# Demo endpoints
curl https://api.chidionyema.dev/api/demo/credentials
curl https://api.chidionyema.dev/api/demo/circuit-breaker/state

# Products exist
curl https://api.chidionyema.dev/api/products
```

### 11.2 E2E Test Script

```bash
#!/bin/bash
# test-showcase.sh

API_URL="https://api.chidionyema.dev"
SITE_URL="https://chidionyema.dev"

echo "Testing API health..."
curl -f "$API_URL/health" || exit 1

echo "Testing demo reset..."
curl -f -X POST "$API_URL/api/demo/reset" || exit 1

echo "Testing credential rotation..."
curl -f "$API_URL/api/demo/credentials" || exit 1

echo "Testing checkout flow..."
ORDER=$(curl -s -X POST "$API_URL/api/checkout" \
  -H "Content-Type: application/json" \
  -d '{"items":[{"productId":"1","quantity":1}],"customerEmail":"test@test.com","idempotencyKey":"test-123"}')
echo "Order: $ORDER"

echo "Testing static site..."
curl -f "$SITE_URL" || exit 1
curl -f "$SITE_URL/demo" || exit 1
curl -f "$SITE_URL/architecture" || exit 1

echo "All tests passed!"
```

---

## 12. Implementation Checklist

### Phase 1: Infrastructure (Day 1-2)

- [ ] Register domain (chidionyema.dev)
- [ ] Create Cloudflare account, configure DNS
- [ ] Create Neon PostgreSQL database
- [ ] Run schema creation SQL
- [ ] Create Upstash Redis database
- [ ] Create CloudAMQP RabbitMQ instance
- [ ] Create Fly.io account and app
- [ ] Set Fly.io secrets
- [ ] Create Grafana Cloud account

### Phase 2: API Demo Mode (Day 3-5)

- [ ] Create `appsettings.Demo.json`
- [ ] Implement `DemoServiceExtensions.cs`
- [ ] Implement `CredentialRotationSimulator.cs`
- [ ] Implement `CredentialRotationBackgroundService.cs`
- [ ] Implement `DemoEventBroadcaster.cs`
- [ ] Implement `EventStreamHub.cs`
- [ ] Implement `DemoController.cs`
- [ ] Modify consumers to broadcast events
- [ ] Create `Dockerfile.demo`
- [ ] Create `fly.toml`
- [ ] Deploy to Fly.io
- [ ] Test all demo endpoints

### Phase 3: Frontend (Day 6-8)

- [ ] Create Astro project
- [ ] Implement `useSignalR.ts` hook
- [ ] Implement `EventTimeline.tsx`
- [ ] Implement `CredentialRotationDemo.tsx`
- [ ] Implement `CheckoutDemo.tsx`
- [ ] Implement `CircuitBreakerDemo.tsx`
- [ ] Implement `OutboxViewer.tsx`
- [ ] Create landing page
- [ ] Create demo page
- [ ] Create architecture page with Mermaid diagrams
- [ ] Create metrics page with Grafana embed
- [ ] Create about page with CV download
- [ ] Deploy to Cloudflare Pages

### Phase 4: Content (Day 9-11)

- [ ] Write "Transactional Outbox" post
- [ ] Write "CQRS with MediatR" post
- [ ] Write "Circuit Breaker Patterns" post
- [ ] Write "Vault Credential Rotation" post
- [ ] Write "Testing Event-Driven Systems" post
- [ ] Create sanitised GitHub repo
- [ ] Add README to GitHub repo
- [ ] Create Grafana dashboard
- [ ] Get Grafana embed URL

### Phase 5: Polish (Day 12-14)

- [ ] Mobile responsive testing
- [ ] Performance optimization (Lighthouse)
- [ ] SEO meta tags
- [ ] Open Graph image
- [ ] Run E2E test script
- [ ] Add to CV: portfolio link
- [ ] Announce on LinkedIn

---

## Summary

This spec provides everything needed to build the portfolio showcase:

| What | Where | Cost |
|------|-------|------|
| Live .NET API with full architecture | Fly.io | £0 |
| Real-time event streaming | SignalR + WebSocket | £0 |
| Zero-downtime credential rotation demo | Custom simulator | £0 |
| Circuit breaker demo | Polly + UI | £0 |
| Outbox pattern visualization | Real MassTransit outbox | £0 |
| Metrics dashboard | Grafana Cloud embed | £0 |
| Static portfolio site | Cloudflare Pages | £0 |
| PostgreSQL (5 schemas) | Neon | £0 |
| Redis | Upstash | £0 |
| RabbitMQ | CloudAMQP | £0 |
| Domain | Cloudflare | ~£10/year |

**Total: ~£10/year**

When complete, your CV will have:

```
Portfolio: chidionyema.dev
GitHub: github.com/chidionyema/haworks
```

And hiring managers can:
1. Try a real checkout flow
2. Watch events flow in real-time
3. See credentials rotate with zero downtime
4. Break the circuit breaker and watch it recover
5. Read your technical deep-dives
6. Review your actual production-grade code

**That's how you prove you're in the top 2%.**
