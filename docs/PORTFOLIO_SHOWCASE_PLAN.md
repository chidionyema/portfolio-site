# HaWorks Portfolio Showcase Plan

## The Goal

Create **chidionyema.dev** (or similar) that:
1. Showcases the architecture with live, working demos
2. Proves you built it (code walkthroughs, not just diagrams)
3. Costs almost nothing to run
4. Removes all doubt for hiring managers

---

## The Concept: "Proof, Not Claims"

Most developer portfolios say "I know distributed systems." Yours will say "Here's one running. Try it."

```
┌─────────────────────────────────────────────────────────────────┐
│                     chidionyema.dev                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ LIVE DEMO    │  │ ARCHITECTURE │  │ CODE         │           │
│  │              │  │              │  │ DEEP-DIVES   │           │
│  │ Try checkout │  │ Interactive  │  │              │           │
│  │ Watch events │  │ diagrams     │  │ "How I built │           │
│  │ See queues   │  │ Click to     │  │ transactional│           │
│  │ Real metrics │  │ explore      │  │ outbox"      │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ MONITORING   │  │ GITHUB       │  │ ABOUT/CV     │           │
│  │              │  │              │  │              │           │
│  │ Live Grafana │  │ Sanitised    │  │ PDF download │           │
│  │ dashboard    │  │ source code  │  │ Contact      │           │
│  │ embedded     │  │              │  │              │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Architecture: Free/Cheap Hosting Stack

### The Problem
Full HaWorks needs: 5 PostgreSQL DBs, Redis, RabbitMQ, Vault, MinIO, ClamAV.
Running 24/7 on cloud = £100-200/month.

### The Solution: Demo Mode Architecture

Simplify for showcase while keeping the impressive parts visible.

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRODUCTION SHOWCASE STACK                     │
│                         (All Free Tier)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐     ┌─────────────────┐                    │
│  │ Cloudflare      │     │ Fly.io          │                    │
│  │ Pages           │────▶│ (Free Tier)     │                    │
│  │ (Static Site)   │     │                 │                    │
│  │                 │     │ .NET 9 API      │                    │
│  │ - Portfolio     │     │ - Scales to 0   │                    │
│  │ - Docs          │     │ - Wakes on req  │                    │
│  │ - Architecture  │     │ - 3 shared CPUs │                    │
│  │   diagrams      │     │                 │                    │
│  │                 │     │ 256MB RAM       │                    │
│  └─────────────────┘     └────────┬────────┘                    │
│         FREE                      │                              │
│                                   │                              │
│         ┌─────────────────────────┼─────────────────────────┐   │
│         │                         │                         │   │
│         ▼                         ▼                         ▼   │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐│
│  │ Neon        │         │ Upstash     │         │ CloudAMQP   ││
│  │ PostgreSQL  │         │ Redis       │         │ RabbitMQ    ││
│  │             │         │             │         │             ││
│  │ Free: 0.5GB │         │ Free: 10K   │         │ Free: 1M    ││
│  │ 1 DB, multi │         │ cmds/day    │         │ msgs/month  ││
│  │ schema      │         │             │         │             ││
│  └─────────────┘         └─────────────┘         └─────────────┘│
│       FREE                    FREE                   FREE        │
│                                                                  │
│  ┌─────────────┐         ┌─────────────┐                        │
│  │ Grafana     │         │ GitHub      │                        │
│  │ Cloud       │         │ (Public)    │                        │
│  │             │         │             │                        │
│  │ Free: 3     │         │ Sanitised   │                        │
│  │ dashboards  │         │ source      │                        │
│  └─────────────┘         └─────────────┘                        │
│       FREE                    FREE                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

TOTAL COST: ~£10/year (domain only)
```

---

## What To Demo (The Impressive Parts)

### 1. Live Checkout Flow
Visitor clicks "Try Demo" and:
- Adds products to cart
- Initiates checkout
- Sees order created
- Watches payment event flow through queue
- Order completes

**What they see:** Real distributed transaction with compensation.

### 2. Event Flow Visualisation
Real-time view of messages flowing through RabbitMQ:
```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│ Checkout│────▶│ Stock   │────▶│ Payment │────▶│ Order   │
│ Command │     │ Reserved│     │ Created │     │ Complete│
└─────────┘     └─────────┘     └─────────┘     └─────────┘
     ▲               │               │               │
     │               ▼               ▼               ▼
   [User]      [Consumer]      [Consumer]      [Consumer]
                  Logs            Logs            Logs
```

Use WebSocket to push events to a visual timeline in the UI.

### 3. Outbox Pattern Demo
Show the outbox table updating in real-time:
- Event written to OutboxMessage
- Background process picks it up
- Published to RabbitMQ
- Marked as processed

Proves: "Events and data are atomic. Nothing gets lost."

### 4. Circuit Breaker Demo
Button: "Simulate Payment Provider Failure"
- Shows circuit opening after N failures
- Shows requests failing fast (not timing out)
- Shows circuit half-open after duration
- Shows recovery

### 5. Metrics Dashboard (Embedded Grafana)
Read-only embed showing:
- Request rate
- Error rate
- Queue depth
- Response times
- Circuit breaker state

### 6. Architecture Explorer
Interactive diagram where clicking on components shows:
- The code for that component
- Why it's designed that way
- Link to the file in GitHub

---

## Demo Mode Simplifications

| Production | Demo Mode | Why |
|------------|-----------|-----|
| 5 PostgreSQL databases | 1 Neon DB, 5 schemas | Free tier limit |
| HashiCorp Vault | Environment variables | Vault concepts documented, not running |
| MinIO | Cloudflare R2 or skip | Not core to the showcase |
| ClamAV | Skip | Not core to the showcase |
| Full resilience | Keep circuit breaker, simplify others | Show the pattern |

**What we keep running:**
- .NET 9 API with full Clean Architecture
- PostgreSQL with all 5 bounded contexts (as schemas)
- Redis for caching
- RabbitMQ for messaging
- MassTransit with outbox
- Real consumers processing events
- Grafana dashboard

**What we document but don't run:**
- Vault (show the code, explain the pattern, link to tests)
- MinIO (show the abstraction, explain it's swappable)
- Full chaos testing (show the test code)

---

## Site Structure

```
chidionyema.dev/
├── / (Landing)
│   ├── Hero: "I build distributed systems. Here's one running."
│   ├── Quick stats: "5 bounded contexts, 1400 tests, 99.9% uptime"
│   └── CTA: "Try the Demo" / "View Architecture"
│
├── /demo (Live Demo)
│   ├── Checkout flow (interactive)
│   ├── Event timeline (real-time WebSocket)
│   ├── Outbox viewer
│   └── "Break it" buttons (circuit breaker, etc.)
│
├── /architecture (Interactive Diagrams)
│   ├── System overview (clickable)
│   ├── Bounded contexts
│   ├── Event flows
│   └── Each component links to code
│
├── /deep-dives (Technical Blog Posts)
│   ├── "How I Implemented Transactional Outbox"
│   ├── "CQRS in Practice: Commands vs Queries"
│   ├── "Circuit Breaker Patterns with Polly"
│   ├── "Vault Credential Rotation (Zero Downtime)"
│   ├── "Testing Event-Driven Systems"
│   └── Each post has code snippets + GitHub links
│
├── /metrics (Embedded Grafana)
│   └── Read-only dashboard showing live system
│
├── /code (GitHub Links)
│   ├── Link to sanitised public repo
│   ├── Highlighted files to look at
│   └── Architecture decision records
│
└── /about
    ├── Brief bio
    ├── CV download (PDF)
    └── Contact
```

---

## Technical Implementation

### Frontend: Static Site
**Option A: Next.js on Vercel (Free)**
- React-based, good for interactive diagrams
- Easy deployment
- Good DX

**Option B: Astro on Cloudflare Pages (Free)**
- Lighter weight
- Better performance
- Still supports React components where needed

**Recommendation:** Astro. Faster, simpler, free on Cloudflare.

### Backend: .NET API on Fly.io
Fly.io free tier:
- 3 shared CPUs
- 256MB RAM
- Scales to 0 (no cost when idle)
- Wakes in ~2 seconds on first request

**Demo Mode Configuration:**
```csharp
// Program.cs - Demo mode detection
if (builder.Environment.IsEnvironment("Demo"))
{
    // Single connection string, multiple schemas
    builder.Services.AddDbContext<CatalogDbContext>(o =>
        o.UseNpgsql(conn, x => x.MigrationsHistoryTable("__EFMigrationsHistory", "catalog")));

    // Simplified resilience (faster demo)
    builder.Services.AddResilienceDemo();

    // WebSocket for event streaming to UI
    builder.Services.AddEventStreamHub();
}
```

### Database: Neon PostgreSQL
Free tier: 0.5GB storage, 1 database, branching.

Use schemas for bounded contexts:
```sql
CREATE SCHEMA catalog;
CREATE SCHEMA orders;
CREATE SCHEMA payments;
CREATE SCHEMA content;
CREATE SCHEMA identity;
```

### Redis: Upstash
Free tier: 10,000 commands/day. Plenty for a demo.

### RabbitMQ: CloudAMQP
Free "Little Lemur" plan: 1M messages/month, 20 connections.

### Monitoring: Grafana Cloud
Free tier: 10,000 series, 3 dashboards, 14-day retention.
Enough to show real metrics.

---

## Event Streaming to UI

For the real-time event visualization, add a SignalR hub:

```csharp
// EventStreamHub.cs
public class EventStreamHub : Hub
{
    public async Task SubscribeToEvents()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, "event-watchers");
    }
}

// In consumers, broadcast events
public class CheckoutInitiatedConsumer : IConsumer<CheckoutInitiatedEvent>
{
    private readonly IHubContext<EventStreamHub> _hub;

    public async Task Consume(ConsumeContext<CheckoutInitiatedEvent> context)
    {
        // Normal processing...

        // Broadcast to UI watchers
        await _hub.Clients.Group("event-watchers").SendAsync("EventReceived", new
        {
            Type = "CheckoutInitiated",
            OrderId = context.Message.OrderId,
            Timestamp = DateTime.UtcNow
        });
    }
}
```

Frontend shows events flowing in real-time as visitors interact with the demo.

---

## Content: Deep-Dive Posts

Write 5-6 technical posts that showcase your thinking. These are gold for hiring managers.

### Post 1: "Building a Transactional Outbox in .NET"
- The problem (dual-write)
- The solution (outbox pattern)
- MassTransit implementation
- Code walkthrough
- Testing strategy
- Link to actual code

### Post 2: "CQRS with MediatR: When and Why"
- Command vs Query separation
- Handler structure
- Validation pipeline
- When CQRS is overkill
- Real examples from HaWorks

### Post 3: "Circuit Breaker Patterns for Payment Integrations"
- Why payments need resilience
- Polly implementation
- State machine (closed → open → half-open)
- Testing circuit breakers
- Live demo link

### Post 4: "Zero-Downtime Vault Credential Rotation"
- The problem (credential expiry under load)
- Dynamic credentials
- Connection pool management
- Testing with Testcontainers
- (Note: "Full Vault not running in demo due to cost, but here's the code and tests")

### Post 5: "Testing Event-Driven Systems"
- MassTransit test harness
- Testcontainers for RabbitMQ
- Consumer testing patterns
- Saga testing
- 1400 tests and why

### Post 6: "Clean Architecture in Practice"
- Layer structure
- Dependency rules
- Architecture tests that enforce it
- Trade-offs and when to break rules

---

## GitHub: Sanitised Public Repo

Create a public version of HaWorks:

**Remove:**
- Any real credentials (already using Vault, so should be none)
- Company-specific business logic (if any)
- Anything embarrassing

**Keep:**
- Full architecture
- All patterns
- Tests
- Documentation

**Add:**
- Detailed README
- Architecture diagrams
- "Start here" guide
- License (MIT or similar)

---

## Implementation Roadmap

### Phase 1: Infrastructure (1-2 days)
- [ ] Register domain (chidionyema.dev or similar)
- [ ] Set up Cloudflare account (free)
- [ ] Set up Fly.io account (free)
- [ ] Set up Neon PostgreSQL (free)
- [ ] Set up Upstash Redis (free)
- [ ] Set up CloudAMQP RabbitMQ (free)

### Phase 2: Demo Mode API (2-3 days)
- [ ] Create "Demo" environment configuration
- [ ] Adapt connection strings for single DB with schemas
- [ ] Add SignalR hub for event streaming
- [ ] Add demo-friendly endpoints (reset data, simulate failures)
- [ ] Deploy to Fly.io
- [ ] Test end-to-end

### Phase 3: Static Site (2-3 days)
- [ ] Set up Astro project
- [ ] Landing page
- [ ] Architecture diagrams (use Mermaid or Excalidraw)
- [ ] Demo page with checkout flow
- [ ] Event timeline component
- [ ] Deploy to Cloudflare Pages

### Phase 4: Content (3-4 days)
- [ ] Write deep-dive posts (can do over time)
- [ ] Sanitise and publish GitHub repo
- [ ] Set up Grafana Cloud dashboard
- [ ] Embed dashboard in site

### Phase 5: Polish (1-2 days)
- [ ] Mobile responsive
- [ ] Performance optimization
- [ ] SEO basics
- [ ] CV download
- [ ] Contact form

**Total: 10-14 days of focused work**

Or spread over a few weeks doing evenings/weekends.

---

## Cost Summary

| Service | Monthly Cost |
|---------|--------------|
| Domain (chidionyema.dev) | ~£0.80 |
| Cloudflare Pages | £0 |
| Fly.io (free tier) | £0 |
| Neon PostgreSQL | £0 |
| Upstash Redis | £0 |
| CloudAMQP RabbitMQ | £0 |
| Grafana Cloud | £0 |
| **Total** | **~£10/year** |

---

## What Hiring Managers See

When they visit your site:

1. **Immediate proof:** "This person built a working distributed system, not just a todo app"

2. **Interactive demo:** They can click through checkout, see events flow, break things

3. **Architecture depth:** Interactive diagrams showing bounded contexts, event flows

4. **Code quality:** GitHub link to real, tested, documented code

5. **Technical writing:** Deep-dive posts proving you understand the "why" not just "how"

6. **Production thinking:** Metrics dashboard, observability, resilience patterns

7. **Modern stack:** .NET 9, MassTransit, Kubernetes concepts, Vault patterns

This removes ALL doubt. They've seen it working.

---

## Alternative: Video-First Approach

If you want faster time-to-value, consider:

1. **Record Loom videos** of the local Aspire environment running
2. **Upload to YouTube** (unlisted or public)
3. **Simple static site** with videos embedded + architecture docs
4. **GitHub link**

Less impressive than live demo, but 80% of the impact with 20% of the effort.

Could do videos first, add live demo later.

---

## The Line for Your CV

Once live:

```
GitHub: github.com/chidionyema/haworks
Portfolio: chidionyema.dev
```

Or in the profile:

> "See my distributed systems work live at chidionyema.dev"

---

## Questions to Decide

1. **Domain name?** chidionyema.dev, chidionyema.com, onyema.dev?

2. **Live demo vs video first?** Live is more impressive but more work.

3. **How much to sanitise?** Is HaWorks releasable as-is or needs cleanup?

4. **Timeline?** Want this in 2 weeks or OK with a month?

5. **Deep-dives:** Write them all upfront or publish one per week?

---

*This showcase will put you in the top 1% of candidates. Most developers have a GitHub with incomplete projects. You'll have a live distributed system they can interact with.*
