# Portfolio Showcase UI Specification

## Design Philosophy

**"Proof, Not Claims"** - Every element demonstrates capability through interaction, not text.

### Core Principles

1. **Show, Don't Tell** - Visitors see the system working, not read about it
2. **Progressive Disclosure** - Simple surface, depth on demand
3. **Real-Time Everything** - Live data, live events, live metrics
4. **Engineer's Aesthetic** - Dark mode, terminal vibes, but polished
5. **Zero Friction** - Demo works instantly, no signup, no loading

---

## Visual Design System

### Color Palette

```
┌─────────────────────────────────────────────────────────────────┐
│  DARK THEME (Primary)                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Background                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ #0a0a0f  │ │ #12121a  │ │ #1a1a24  │ │ #24242e  │           │
│  │ Base     │ │ Surface  │ │ Elevated │ │ Border   │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│                                                                 │
│  Accent Colors (Event Types)                                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ #22c55e  │ │ #3b82f6  │ │ #f59e0b  │ │ #ef4444  │           │
│  │ Success  │ │ Info     │ │ Warning  │ │ Error    │           │
│  │ Green    │ │ Blue     │ │ Amber    │ │ Red      │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│                                                                 │
│  Signature Gradient                                             │
│  ┌─────────────────────────────────────────────────┐           │
│  │ #6366f1 ──────────────────────────────▶ #8b5cf6 │           │
│  │ Indigo                                  Violet  │           │
│  └─────────────────────────────────────────────────┘           │
│                                                                 │
│  Text                                                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                        │
│  │ #f8fafc  │ │ #94a3b8  │ │ #64748b  │                        │
│  │ Primary  │ │ Secondary│ │ Muted    │                        │
│  └──────────┘ └──────────┘ └──────────┘                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Typography

```
┌─────────────────────────────────────────────────────────────────┐
│  TYPOGRAPHY SCALE                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Headings: Inter (Variable Weight)                              │
│  ─────────────────────────────────                              │
│  H1: 64px / 700 / -0.02em  "I build distributed systems"        │
│  H2: 48px / 600 / -0.01em  Section titles                       │
│  H3: 32px / 600 / 0        Subsection titles                    │
│  H4: 24px / 500 / 0        Card titles                          │
│                                                                 │
│  Body: Inter                                                    │
│  ─────────────────────────────────                              │
│  Large: 18px / 400 / 0.01em   Hero descriptions                 │
│  Base:  16px / 400 / 0        Body text                         │
│  Small: 14px / 400 / 0        Captions, labels                  │
│                                                                 │
│  Code: JetBrains Mono                                           │
│  ─────────────────────────────────                              │
│  Base:  14px / 400            Code blocks                       │
│  Small: 12px / 400            Inline code, logs                 │
│                                                                 │
│  Monospace Elements: SF Mono / JetBrains Mono                   │
│  ─────────────────────────────────                              │
│  Metrics, timestamps, IDs, correlation IDs                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Component Library

```
┌─────────────────────────────────────────────────────────────────┐
│  BUTTONS                                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Primary (Gradient)                                             │
│  ┌────────────────────────┐                                    │
│  │   ✨ Try Live Demo     │  bg: gradient, hover: glow effect  │
│  └────────────────────────┘                                    │
│                                                                 │
│  Secondary (Outline)                                            │
│  ┌────────────────────────┐                                    │
│  │   View Architecture    │  border: accent, bg: transparent   │
│  └────────────────────────┘                                    │
│                                                                 │
│  Danger (For "Break It" demos)                                  │
│  ┌────────────────────────┐                                    │
│  │   💥 Trigger Failure   │  bg: red-500/20, border: red-500   │
│  └────────────────────────┘                                    │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  CARDS                                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ┌─ Glass Card ────────────────────────────────────────┐ │   │
│  │ │                                                      │ │   │
│  │ │  bg: rgba(255,255,255,0.03)                         │ │   │
│  │ │  backdrop-filter: blur(12px)                        │ │   │
│  │ │  border: 1px solid rgba(255,255,255,0.08)           │ │   │
│  │ │  border-radius: 16px                                │ │   │
│  │ │                                                      │ │   │
│  │ └──────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ┌─ Metric Card ───────────────────────────────────────┐ │   │
│  │ │                                                      │ │   │
│  │ │  ┌─────────────────┐                                │ │   │
│  │ │  │ 99.9%           │  Large number, mono font       │ │   │
│  │ │  │ Uptime          │  Label below                   │ │   │
│  │ │  └─────────────────┘                                │ │   │
│  │ │                                                      │ │   │
│  │ └──────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  STATUS INDICATORS                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ● Healthy       (green, pulsing glow)                          │
│  ● Processing    (blue, spinning ring)                          │
│  ● Warning       (amber, gentle pulse)                          │
│  ● Error         (red, static)                                  │
│  ○ Idle          (gray, no animation)                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Page Structure

### Navigation

```
┌─────────────────────────────────────────────────────────────────┐
│  STICKY HEADER                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                          │   │
│  │  CO  Chidi Onyema      Demo  Architecture  Deep-Dives   │   │
│  │  ─────────────────                                       │   │
│  │  Logo/Name             Nav Links           [GitHub] [CV] │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  - Glassmorphism background                                     │
│  - Appears after scrolling past hero                            │
│  - Active section highlighted                                   │
│  - Mobile: Hamburger menu                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Section 1: Hero

The hero must instantly communicate competence and invite interaction.

```
┌─────────────────────────────────────────────────────────────────┐
│  HERO SECTION                                                   │
│  Height: 100vh                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                          │   │
│  │          I build distributed systems.                    │   │
│  │          Here's one running.                             │   │
│  │          ─────────────────────                           │   │
│  │          Gradient underline animation                    │   │
│  │                                                          │   │
│  │     .NET 9 · Clean Architecture · Event-Driven · DDD     │   │
│  │                                                          │   │
│  │  ┌──────────────────┐    ┌──────────────────┐           │   │
│  │  │  ✨ Try Demo     │    │  View Architecture │          │   │
│  │  └──────────────────┘    └──────────────────┘           │   │
│  │                                                          │   │
│  │  ─────────────────────────────────────────────────────  │   │
│  │                                                          │   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐           │   │
│  │  │ 5      │ │ 1,400+ │ │ 99.9%  │ │ <50ms  │           │   │
│  │  │Bounded │ │ Tests  │ │ Uptime │ │ P99    │           │   │
│  │  │Contexts│ │        │ │        │ │Latency │           │   │
│  │  └────────┘ └────────┘ └────────┘ └────────┘           │   │
│  │      ↑          ↑          ↑          ↑                 │   │
│  │   Animated counters that tick up on page load           │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  BACKGROUND:                                                    │
│  - Subtle animated grid pattern                                 │
│  - Floating nodes representing services (subtle)                │
│  - Connection lines that pulse occasionally                     │
│  - Dark gradient overlay                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Hero Animation Details

```javascript
// Animated background - subtle floating architecture nodes
const BackgroundAnimation = () => {
  // Nodes representing bounded contexts
  const nodes = [
    { id: 'catalog', label: 'Catalog', x: 20, y: 30 },
    { id: 'orders', label: 'Orders', x: 50, y: 50 },
    { id: 'payments', label: 'Payments', x: 80, y: 35 },
    { id: 'content', label: 'Content', x: 35, y: 70 },
    { id: 'identity', label: 'Identity', x: 65, y: 75 },
  ];

  // Occasional pulse along connection lines
  // Very subtle - shouldn't distract from text
};
```

---

## Section 2: Live Demo Hub

The centerpiece - an interactive demo that showcases the entire system.

```
┌─────────────────────────────────────────────────────────────────┐
│  LIVE DEMO SECTION                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  See It Working                                          │   │
│  │  ───────────────                                         │   │
│  │  Watch real events flow through a distributed system     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  TAB BAR                                                 │   │
│  │  ┌──────────┬─────────────┬───────────────┬───────────┐ │   │
│  │  │ Checkout │ Event Flow  │ Circuit Break │ Vault     │ │   │
│  │  │ ════════ │             │               │           │ │   │
│  │  └──────────┴─────────────┴───────────────┴───────────┘ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Content area changes based on selected tab]                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Tab 1: Checkout Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  CHECKOUT DEMO                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────┐  ┌─────────────────────────────────┐  │
│  │                     │  │                                  │  │
│  │  PRODUCT CARD       │  │  ORDER SUMMARY                   │  │
│  │  ─────────────      │  │  ─────────────                   │  │
│  │                     │  │                                  │  │
│  │  ┌───────────────┐  │  │  Clean Architecture Book  £49.99│  │
│  │  │  [Book Icon]  │  │  │  ─────────────────────────────  │  │
│  │  │               │  │  │  Subtotal:              £49.99  │  │
│  │  └───────────────┘  │  │  Tax (20%):              £9.99  │  │
│  │                     │  │  ─────────────────────────────  │  │
│  │  Clean Architecture │  │  Total:                 £59.98  │  │
│  │  Book               │  │                                  │  │
│  │                     │  │                                  │  │
│  │  £49.99             │  │  ┌──────────────────────────┐   │  │
│  │                     │  │  │    🛒 Process Checkout   │   │  │
│  │  [Add to Cart]      │  │  └──────────────────────────┘   │  │
│  │                     │  │                                  │  │
│  └─────────────────────┘  └─────────────────────────────────┘  │
│                                                                 │
│  ───────────────────────────────────────────────────────────   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  REAL-TIME EVENT STREAM                                  │   │
│  │  ──────────────────────                                  │   │
│  │                                                          │   │
│  │  ● 14:32:05.123  CheckoutInitiated     OrderId: 7f3a... │   │
│  │  ● 14:32:05.145  StockReserved         Items: 1         │   │
│  │  ● 14:32:05.156  OutboxEventCreated    Type: OrderCre...│   │
│  │  ● 14:32:05.189  PaymentSessionCreated SessionId: cs_...│   │
│  │  ○ Waiting for payment...                                │   │
│  │                                                          │   │
│  │  [Events appear in real-time via WebSocket]              │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Tab 2: Event Flow Visualization

```
┌─────────────────────────────────────────────────────────────────┐
│  EVENT FLOW VISUALIZATION                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                          │   │
│  │     SAGA VISUALIZATION (Horizontal Flow)                 │   │
│  │                                                          │   │
│  │  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌───────┐ │   │
│  │  │ Checkout│───▶│  Stock  │───▶│ Payment │───▶│ Order │ │   │
│  │  │ Started │    │Reserved │    │ Created │    │Complete│ │   │
│  │  │   ✓     │    │   ✓     │    │   ●     │    │   ○   │ │   │
│  │  └─────────┘    └─────────┘    └─────────┘    └───────┘ │   │
│  │       │              │              │              │     │   │
│  │       ▼              ▼              ▼              ▼     │   │
│  │    23ms           45ms           ---            ---      │   │
│  │                                                          │   │
│  │  Legend: ✓ Complete  ● In Progress  ○ Pending           │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────┐ ┌────────────────────────────┐   │
│  │  OUTBOX TABLE (Live)     │ │  MESSAGE QUEUE             │   │
│  │  ─────────────────────   │ │  ─────────────             │   │
│  │                          │ │                             │   │
│  │  ID    │ Type    │Status │ │  Queue: orders.created     │   │
│  │  ──────┼─────────┼────── │ │  ● Messages: 3             │   │
│  │  7f3a  │OrderCr..│ ● Pend│ │  ● Consumers: 2            │   │
│  │  8b2c  │StockRe..│ ✓ Pub │ │  ● Rate: 12/sec            │   │
│  │  9d4e  │Payment..│ ✓ Pub │ │                             │   │
│  │                          │ │  [Live depth visualization] │   │
│  │  [Updates in real-time]  │ │                             │   │
│  └──────────────────────────┘ └────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  WHY THIS MATTERS                                        │   │
│  │  ─────────────────                                       │   │
│  │                                                          │   │
│  │  The transactional outbox ensures events are NEVER lost. │   │
│  │  Even if RabbitMQ is down, events wait in the database   │   │
│  │  and are delivered when it recovers.                     │   │
│  │                                                          │   │
│  │  [View the code →]                                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Tab 3: Circuit Breaker Demo

```
┌─────────────────────────────────────────────────────────────────┐
│  CIRCUIT BREAKER DEMO                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Resilience in Action                                    │   │
│  │  ────────────────────                                    │   │
│  │  See how the system handles external service failures    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌────────────────────────────┐ ┌──────────────────────────┐   │
│  │                            │ │                           │   │
│  │  CIRCUIT STATE             │ │  CONTROLS                 │   │
│  │  ─────────────             │ │  ────────                 │   │
│  │                            │ │                           │   │
│  │  ┌────────────────────┐    │ │  ┌─────────────────────┐ │   │
│  │  │                    │    │ │  │ 💥 Simulate Failure │ │   │
│  │  │   ┌────────────┐   │    │ │  └─────────────────────┘ │   │
│  │  │   │            │   │    │ │                           │   │
│  │  │   │   CLOSED   │   │    │ │  Payment provider will   │   │
│  │  │   │     ●      │   │    │ │  start returning errors  │   │
│  │  │   │            │   │    │ │                           │   │
│  │  │   └────────────┘   │    │ │  ┌─────────────────────┐ │   │
│  │  │                    │    │ │  │ ⚡ Send Request     │ │   │
│  │  │   Failures: 0/5    │    │ │  └─────────────────────┘ │   │
│  │  │                    │    │ │                           │   │
│  │  └────────────────────┘    │ │  Sends a payment request │   │
│  │                            │ │  to see the response     │   │
│  │                            │ │                           │   │
│  └────────────────────────────┘ └──────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  REQUEST LOG                                             │   │
│  │  ───────────                                             │   │
│  │                                                          │   │
│  │  14:35:01  POST /api/payments  ✓ 200 OK        45ms     │   │
│  │  14:35:02  POST /api/payments  ✓ 200 OK        38ms     │   │
│  │  14:35:03  POST /api/payments  ✗ 503 Error     timeout  │   │
│  │  14:35:04  POST /api/payments  ✗ 503 Error     timeout  │   │
│  │  14:35:05  POST /api/payments  ✗ 503 Error     timeout  │   │
│  │  14:35:05  CIRCUIT OPENED - Requests will fail fast     │   │
│  │  14:35:06  POST /api/payments  ⚡ REJECTED      2ms     │   │
│  │  14:35:07  POST /api/payments  ⚡ REJECTED      1ms     │   │
│  │                                                          │   │
│  │  [Notice: Rejections are instant - no timeout wait]      │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  STATE MACHINE                                           │   │
│  │  ─────────────                                           │   │
│  │                                                          │   │
│  │   CLOSED ──(5 failures)──▶ OPEN ──(30s)──▶ HALF-OPEN    │   │
│  │      ▲                                          │        │   │
│  │      └────────────(success)─────────────────────┘        │   │
│  │                                                          │   │
│  │   Current: CLOSED  │  Failures: 0/5  │  Next test: --   │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Tab 4: Vault Credential Rotation

```
┌─────────────────────────────────────────────────────────────────┐
│  ZERO-DOWNTIME CREDENTIAL ROTATION                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Database Credentials That Rotate Themselves             │   │
│  │  ───────────────────────────────────────────             │   │
│  │  Watch credentials expire and refresh with zero downtime │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────┐ ┌────────────────────────────┐   │
│  │                          │ │                             │   │
│  │  CURRENT CREDENTIALS     │ │  CREDENTIAL TIMELINE        │   │
│  │  ───────────────────     │ │  ────────────────────       │   │
│  │                          │ │                             │   │
│  │  ┌────────────────────┐  │ │  ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░   │   │
│  │  │                    │  │ │  └── 67% remaining ──┘      │   │
│  │  │  Username:         │  │ │                             │   │
│  │  │  v-app-role-7f3a2b │  │ │  Issued:  14:30:00          │   │
│  │  │                    │  │ │  Expires: 14:32:00          │   │
│  │  │  Password:         │  │ │  TTL:     2 minutes         │   │
│  │  │  ●●●●●●●●●●●●●●●●  │  │ │                             │   │
│  │  │                    │  │ │  Rotation at: 14:31:20      │   │
│  │  │  TTL: 1:20         │  │ │  (80% of TTL)               │   │
│  │  │  ════════════░░░   │  │ │                             │   │
│  │  │                    │  │ │                             │   │
│  │  └────────────────────┘  │ │                             │   │
│  │                          │ │                             │   │
│  └──────────────────────────┘ └────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ROTATION LOG                                            │   │
│  │  ────────────                                            │   │
│  │                                                          │   │
│  │  14:30:00  ● Credential issued: v-app-role-7f3a2b       │   │
│  │  14:30:00  ✓ Connection pool updated (warm)             │   │
│  │  14:31:20  ○ Rotation triggered (80% TTL reached)       │   │
│  │  14:31:20  ● New credential requested from Vault        │   │
│  │  14:31:20  ● New credential issued: v-app-role-9d4e8c   │   │
│  │  14:31:21  ✓ Connection pool updated (graceful)         │   │
│  │  14:31:21  ✓ Old connections draining...                │   │
│  │  14:32:00  ✓ Old credential expired (0 active conns)    │   │
│  │                                                          │   │
│  │  Requests served during rotation: 47                     │   │
│  │  Requests failed: 0                                      │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  REQUEST MONITOR (During Rotation)                       │   │
│  │  ────────────────────────────────                        │   │
│  │                                                          │   │
│  │  ┌──────────────────────────────────────────────────┐   │   │
│  │  │ ✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓  │   │   │
│  │  │ ████████████████│████████████████                 │   │   │
│  │  │                 ↑                                 │   │   │
│  │  │           Rotation here                           │   │   │
│  │  │         (no visible impact)                       │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  │                                                          │   │
│  │  [View the rotation code →]                              │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Section 3: Architecture Explorer

Interactive architecture diagram that lets visitors explore the system.

```
┌─────────────────────────────────────────────────────────────────┐
│  ARCHITECTURE EXPLORER                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  System Architecture                                     │   │
│  │  ───────────────────                                     │   │
│  │  Click any component to see the code and learn why       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                          │   │
│  │                    ┌─────────────┐                       │   │
│  │                    │   Client    │                       │   │
│  │                    │   (React)   │                       │   │
│  │                    └──────┬──────┘                       │   │
│  │                           │                              │   │
│  │                           ▼                              │   │
│  │                    ┌─────────────┐                       │   │
│  │                    │    API      │                       │   │
│  │                    │  Gateway    │                       │   │
│  │                    └──────┬──────┘                       │   │
│  │                           │                              │   │
│  │      ┌────────────────────┼────────────────────┐        │   │
│  │      │                    │                    │        │   │
│  │      ▼                    ▼                    ▼        │   │
│  │ ┌─────────┐         ┌─────────┐         ┌─────────┐     │   │
│  │ │ Catalog │◀───────▶│ Orders  │◀───────▶│Payments │     │   │
│  │ │ Context │  events │ Context │  events │ Context │     │   │
│  │ └────┬────┘         └────┬────┘         └────┬────┘     │   │
│  │      │                   │                   │          │   │
│  │      └─────────┬─────────┴─────────┬─────────┘          │   │
│  │                │                   │                    │   │
│  │                ▼                   ▼                    │   │
│  │         ┌──────────┐        ┌──────────┐                │   │
│  │         │ RabbitMQ │        │PostgreSQL│                │   │
│  │         │  + Outbox│        │(5 schemas)│               │   │
│  │         └──────────┘        └──────────┘                │   │
│  │                                                          │   │
│  │  [Interactive - nodes highlight on hover]                │   │
│  │  [Click opens detail panel]                              │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  DETAIL PANEL (appears when component clicked)           │   │
│  │  ─────────────────────────────────────────────           │   │
│  │                                                          │   │
│  │  Orders Context                                          │   │
│  │  ══════════════                                          │   │
│  │                                                          │   │
│  │  Responsibilities:                                       │   │
│  │  • Order lifecycle management                            │   │
│  │  • Cart operations                                       │   │
│  │  • Checkout orchestration                                │   │
│  │                                                          │   │
│  │  Key Patterns:                                           │   │
│  │  • CQRS (Commands/Queries separated)                     │   │
│  │  • Saga for distributed transactions                     │   │
│  │  • Transactional outbox for event delivery               │   │
│  │                                                          │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │  // ProcessCheckoutCommandHandler.cs             │    │   │
│  │  │                                                   │    │   │
│  │  │  public async Task<Result<Guid>> Handle(         │    │   │
│  │  │      ProcessCheckoutCommand cmd,                 │    │   │
│  │  │      CancellationToken ct)                       │    │   │
│  │  │  {                                               │    │   │
│  │  │      // Reserve stock atomically                 │    │   │
│  │  │      await _stockService.ReserveAsync(...);      │    │   │
│  │  │                                                   │    │   │
│  │  │      // Create order                             │    │   │
│  │  │      var order = Order.Create(...);              │    │   │
│  │  │                                                   │    │   │
│  │  │      // Publish event (outbox pattern)           │    │   │
│  │  │      await _publisher.PublishAsync(              │    │   │
│  │  │          new OrderCreatedEvent {...});           │    │   │
│  │  │  }                                               │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  │                                                          │   │
│  │  [View full file on GitHub →]                            │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Section 4: Deep-Dives (Technical Posts)

```
┌─────────────────────────────────────────────────────────────────┐
│  DEEP-DIVES SECTION                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Technical Deep-Dives                                    │   │
│  │  ────────────────────                                    │   │
│  │  How I built it, and why                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌───────────────────┐ ┌───────────────────┐ ┌─────────────┐   │
│  │                   │ │                   │ │             │   │
│  │  Transactional    │ │  CQRS with        │ │  Circuit    │   │
│  │  Outbox in .NET   │ │  MediatR          │ │  Breakers   │   │
│  │                   │ │                   │ │             │   │
│  │  ─────────────    │ │  ─────────────    │ │ ─────────── │   │
│  │                   │ │                   │ │             │   │
│  │  How to guarantee │ │  Separating reads │ │ Protecting  │   │
│  │  event delivery   │ │  from writes for  │ │ your app    │   │
│  │  with atomicity   │ │  better scaling   │ │ from flaky  │   │
│  │                   │ │                   │ │ dependencies│   │
│  │                   │ │                   │ │             │   │
│  │  [Read →]         │ │  [Read →]         │ │ [Read →]    │   │
│  │                   │ │                   │ │             │   │
│  └───────────────────┘ └───────────────────┘ └─────────────┘   │
│                                                                 │
│  ┌───────────────────┐ ┌───────────────────┐ ┌─────────────┐   │
│  │                   │ │                   │ │             │   │
│  │  Vault Credential │ │  Testing Event-   │ │  Clean      │   │
│  │  Rotation         │ │  Driven Systems   │ │  Arch in    │   │
│  │                   │ │                   │ │  Practice   │   │
│  │  ─────────────    │ │  ─────────────    │ │ ─────────── │   │
│  │                   │ │                   │ │             │   │
│  │  Zero-downtime    │ │  MassTransit test │ │ Layer rules │   │
│  │  database creds   │ │  harness and      │ │ that work   │   │
│  │  with HashiCorp   │ │  Testcontainers   │ │ in the real │   │
│  │  Vault            │ │                   │ │ world       │   │
│  │                   │ │                   │ │             │   │
│  │  [Read →]         │ │  [Read →]         │ │ [Read →]    │   │
│  │                   │ │                   │ │             │   │
│  └───────────────────┘ └───────────────────┘ └─────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Deep-Dive Article Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  ARTICLE PAGE                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                          │   │
│  │  Building a Transactional Outbox in .NET                 │   │
│  │  ═══════════════════════════════════════                 │   │
│  │                                                          │   │
│  │  12 min read  •  Patterns  •  MassTransit               │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                          │   │
│  │  The Problem                                             │   │
│  │  ───────────                                             │   │
│  │                                                          │   │
│  │  When you save data to a database AND publish an event,  │   │
│  │  you have a dual-write problem:                          │   │
│  │                                                          │   │
│  │  ```csharp                                               │   │
│  │  await _db.SaveChangesAsync();  // What if this succeeds │   │
│  │  await _bus.Publish(event);     // But this fails?       │   │
│  │  ```                                                     │   │
│  │                                                          │   │
│  │  Your database has the data, but the event was never     │   │
│  │  published. Downstream systems are now inconsistent.     │   │
│  │                                                          │   │
│  │  [Diagram showing the problem]                           │   │
│  │                                                          │   │
│  │  The Solution                                            │   │
│  │  ────────────                                            │   │
│  │                                                          │   │
│  │  The transactional outbox pattern stores events in the   │   │
│  │  same transaction as your data...                        │   │
│  │                                                          │   │
│  │  [Code with syntax highlighting]                         │   │
│  │  [Link to actual file in repo]                           │   │
│  │  [Interactive demo embed]                                │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────┐                                      │
│  │  TABLE OF CONTENTS   │  (Sticky sidebar on desktop)         │
│  │  ──────────────────  │                                      │
│  │                      │                                      │
│  │  • The Problem       │                                      │
│  │  • The Solution      │                                      │
│  │  • Implementation    │                                      │
│  │  • Testing           │                                      │
│  │  • Production Tips   │                                      │
│  │                      │                                      │
│  └──────────────────────┘                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Section 5: Live Metrics Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  METRICS DASHBOARD                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  System Health                                           │   │
│  │  ─────────────                                           │   │
│  │  Live metrics from the running system                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐   │
│  │            │ │            │ │            │ │            │   │
│  │   99.9%    │ │    47ms    │ │   0.01%    │ │    127     │   │
│  │   ══════   │ │   ══════   │ │   ══════   │ │   ══════   │   │
│  │   Uptime   │ │  P99 Lat   │ │ Error Rate │ │  Req/min   │   │
│  │            │ │            │ │            │ │            │   │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  REQUEST RATE                                            │   │
│  │  ────────────                                            │   │
│  │                                                          │   │
│  │  150│                              ╭─╮                   │   │
│  │     │                         ╭───╯  ╰──╮               │   │
│  │ 100│    ╭──╮                 ╯          ╰──╮            │   │
│  │     │ ──╯  ╰─────────────────               ╰───        │   │
│  │  50│                                                     │   │
│  │     │                                                    │   │
│  │   0│────────────────────────────────────────────────    │   │
│  │     -5m        -4m        -3m        -2m        -1m  now │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────┐ ┌────────────────────────────┐   │
│  │  CIRCUIT BREAKERS        │ │  MESSAGE QUEUES            │   │
│  │  ────────────────        │ │  ──────────────            │   │
│  │                          │ │                             │   │
│  │  Stripe      ● CLOSED    │ │  orders.created        3   │   │
│  │  PayPal      ● CLOSED    │ │  payments.completed    0   │   │
│  │  Catalog     ● CLOSED    │ │  stock.reserved        1   │   │
│  │                          │ │  notifications         12  │   │
│  │  All systems healthy     │ │                             │   │
│  │                          │ │  Total throughput: 42/s    │   │
│  └──────────────────────────┘ └────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Section 6: About & Contact

```
┌─────────────────────────────────────────────────────────────────┐
│  ABOUT SECTION                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                          │   │
│  │  ┌──────────────┐                                        │   │
│  │  │              │   Chidi Onyema                         │   │
│  │  │    Photo     │   ══════════════                       │   │
│  │  │              │                                        │   │
│  │  └──────────────┘   Senior .NET Contractor               │   │
│  │                     London, UK                           │   │
│  │                                                          │   │
│  │  20 years building software. These days I split my time  │   │
│  │  between writing code and leading teams. My sweet spot   │   │
│  │  is roles where I can do both.                           │   │
│  │                                                          │   │
│  │  Recent work includes migrating legacy systems to .NET   │   │
│  │  Core, building security platforms processing millions   │   │
│  │  of events, and delivering UK Government services.       │   │
│  │                                                          │   │
│  │  I know when to use patterns and when they're overkill.  │   │
│  │                                                          │   │
│  │  ┌─────────────────┐  ┌─────────────────┐               │   │
│  │  │  Download CV    │  │  GitHub         │               │   │
│  │  └─────────────────┘  └─────────────────┘               │   │
│  │                                                          │   │
│  │  ┌─────────────────┐  ┌─────────────────┐               │   │
│  │  │  LinkedIn       │  │  Email          │               │   │
│  │  └─────────────────┘  └─────────────────┘               │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Mobile Responsive Design

```
┌───────────────────────────────────────┐
│  MOBILE LAYOUT (< 768px)              │
├───────────────────────────────────────┤
│                                       │
│  ┌───────────────────────────────┐   │
│  │  ≡  Chidi Onyema    [GitHub] │   │
│  └───────────────────────────────┘   │
│                                       │
│  ┌───────────────────────────────┐   │
│  │                               │   │
│  │  I build distributed         │   │
│  │  systems. Here's one         │   │
│  │  running.                    │   │
│  │                               │   │
│  │  ┌─────────────────────────┐ │   │
│  │  │     ✨ Try Demo        │ │   │
│  │  └─────────────────────────┘ │   │
│  │                               │   │
│  │  ┌──────┐ ┌──────┐           │   │
│  │  │ 5    │ │1400+ │           │   │
│  │  │Contxs│ │Tests │           │   │
│  │  └──────┘ └──────┘           │   │
│  │  ┌──────┐ ┌──────┐           │   │
│  │  │99.9% │ │<50ms │           │   │
│  │  │Uptime│ │P99   │           │   │
│  │  └──────┘ └──────┘           │   │
│  │                               │   │
│  └───────────────────────────────┘   │
│                                       │
│  [Demo tabs become accordion]         │
│  [Architecture becomes vertical]      │
│  [Cards stack vertically]             │
│                                       │
└───────────────────────────────────────┘
```

---

## Animation & Micro-interactions

### Page Load Sequence

```
┌─────────────────────────────────────────────────────────────────┐
│  LOAD SEQUENCE (Staggered reveal)                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  0ms     Logo fades in                                          │
│  100ms   Hero headline types in (or fades up)                   │
│  300ms   Tech stack badges slide in from bottom                 │
│  500ms   CTA buttons fade in                                    │
│  700ms   Metric counters start counting up                      │
│  1000ms  Background animation begins (subtle)                   │
│                                                                 │
│  Total: ~1.2s to fully interactive                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Interaction Animations

```
┌─────────────────────────────────────────────────────────────────┐
│  MICRO-INTERACTIONS                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Buttons:                                                       │
│  - Hover: Scale 1.02, subtle glow appears                       │
│  - Click: Scale 0.98, haptic feedback (if supported)            │
│  - Loading: Spinner replaces text                               │
│                                                                 │
│  Cards:                                                         │
│  - Hover: Subtle lift (translateY -2px), border brightens       │
│  - Click: Ripple effect from click point                        │
│                                                                 │
│  Events (in stream):                                            │
│  - New event: Slides in from left, brief highlight glow         │
│  - Success: Green checkmark animates in                         │
│  - Error: Red X with shake animation                            │
│                                                                 │
│  Circuit Breaker:                                               │
│  - State change: Smooth color transition                        │
│  - Opening: Red pulse animation                                 │
│  - Closing: Green pulse animation                               │
│                                                                 │
│  Credential Rotation:                                           │
│  - TTL bar: Smooth countdown                                    │
│  - Rotation: Old cred fades, new slides in                      │
│  - Success: Checkmark pulse                                     │
│                                                                 │
│  Architecture Diagram:                                          │
│  - Hover node: Highlight + connected edges glow                 │
│  - Click: Panel slides in from right                            │
│  - Data flow: Animated dots along edges                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND TECH STACK                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Framework:        Astro 4.x                                    │
│                    - Static-first, ships zero JS by default     │
│                    - React islands for interactive components   │
│                    - Excellent performance                      │
│                                                                 │
│  Interactive:      React 18                                     │
│                    - Only loaded where needed                   │
│                    - Hydrated on client                         │
│                                                                 │
│  Styling:          TailwindCSS 3.x                              │
│                    - Utility-first, fast iteration              │
│                    - Dark mode built-in                         │
│                    - Custom design tokens                       │
│                                                                 │
│  Animation:        Framer Motion                                │
│                    - Declarative animations                     │
│                    - Gesture support                            │
│                    - Layout animations                          │
│                                                                 │
│  Diagrams:         React Flow                                   │
│                    - Interactive node graphs                    │
│                    - Custom node components                     │
│                    - Pan/zoom built-in                          │
│                                                                 │
│  Charts:           Recharts                                     │
│                    - React-native charts                        │
│                    - Real-time updates                          │
│                    - Responsive                                 │
│                                                                 │
│  Real-time:        @microsoft/signalr                           │
│                    - WebSocket connection to API                │
│                    - Auto-reconnect                             │
│                                                                 │
│  Code Highlight:   Shiki                                        │
│                    - VS Code-quality highlighting               │
│                    - Supports .NET/C#                           │
│                                                                 │
│  Icons:            Lucide React                                 │
│                    - Consistent icon set                        │
│                    - Tree-shakeable                             │
│                                                                 │
│  Deployment:       Cloudflare Pages                             │
│                    - Free tier                                  │
│                    - Global CDN                                 │
│                    - Automatic deployments                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
portfolio-site/
├── src/
│   ├── components/
│   │   ├── ui/                    # Base components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── StatusIndicator.tsx
│   │   │   └── MetricCard.tsx
│   │   │
│   │   ├── layout/
│   │   │   ├── Header.astro
│   │   │   ├── Footer.astro
│   │   │   ├── Navigation.tsx
│   │   │   └── MobileMenu.tsx
│   │   │
│   │   ├── hero/
│   │   │   ├── Hero.astro
│   │   │   ├── AnimatedBackground.tsx
│   │   │   ├── MetricCounter.tsx
│   │   │   └── TechBadges.tsx
│   │   │
│   │   ├── demo/
│   │   │   ├── DemoHub.tsx        # Main demo container
│   │   │   ├── CheckoutDemo.tsx
│   │   │   ├── EventFlowDemo.tsx
│   │   │   ├── CircuitBreakerDemo.tsx
│   │   │   ├── VaultRotationDemo.tsx
│   │   │   ├── EventStream.tsx
│   │   │   ├── OutboxViewer.tsx
│   │   │   ├── QueueDepthChart.tsx
│   │   │   └── SagaVisualization.tsx
│   │   │
│   │   ├── architecture/
│   │   │   ├── ArchitectureExplorer.tsx
│   │   │   ├── SystemDiagram.tsx
│   │   │   ├── ComponentDetail.tsx
│   │   │   └── CodePreview.tsx
│   │   │
│   │   ├── metrics/
│   │   │   ├── MetricsDashboard.tsx
│   │   │   ├── RequestRateChart.tsx
│   │   │   ├── CircuitBreakerStatus.tsx
│   │   │   └── QueueMetrics.tsx
│   │   │
│   │   └── about/
│   │       ├── About.astro
│   │       └── ContactButtons.tsx
│   │
│   ├── hooks/
│   │   ├── useSignalR.ts
│   │   ├── useEventStream.ts
│   │   ├── useMetrics.ts
│   │   └── useAnimatedCounter.ts
│   │
│   ├── lib/
│   │   ├── api.ts                 # API client
│   │   ├── signalr.ts            # SignalR connection
│   │   └── utils.ts
│   │
│   ├── styles/
│   │   ├── global.css
│   │   └── tokens.css            # Design tokens
│   │
│   ├── content/
│   │   └── deep-dives/           # MDX articles
│   │       ├── transactional-outbox.mdx
│   │       ├── cqrs-mediatr.mdx
│   │       ├── circuit-breakers.mdx
│   │       ├── vault-rotation.mdx
│   │       ├── testing-eda.mdx
│   │       └── clean-architecture.mdx
│   │
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   └── ArticleLayout.astro
│   │
│   └── pages/
│       ├── index.astro            # Home page
│       ├── demo.astro             # Demo page (if separate)
│       ├── architecture.astro
│       ├── deep-dives/
│       │   ├── index.astro
│       │   └── [...slug].astro
│       └── about.astro
│
├── public/
│   ├── fonts/
│   ├── images/
│   └── cv.pdf
│
├── astro.config.mjs
├── tailwind.config.mjs
├── package.json
└── tsconfig.json
```

---

## Key Component Specifications

### 1. EventStream Component

```typescript
// src/components/demo/EventStream.tsx

interface Event {
  id: string;
  type: string;
  timestamp: Date;
  correlationId: string;
  data: Record<string, unknown>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

interface EventStreamProps {
  maxEvents?: number;  // Default 50
  filterTypes?: string[];
  showCorrelationId?: boolean;
}

// Features:
// - WebSocket connection via SignalR
// - Auto-reconnect with exponential backoff
// - Virtual scrolling for performance
// - Filter by event type
// - Click to expand event details
// - Copy correlation ID
// - Status indicators with animations
```

### 2. CircuitBreakerDemo Component

```typescript
// src/components/demo/CircuitBreakerDemo.tsx

interface CircuitState {
  name: string;
  state: 'closed' | 'open' | 'half-open';
  failures: number;
  threshold: number;
  nextRetry?: Date;
  lastFailure?: Date;
}

// Features:
// - Visual state machine diagram
// - "Simulate Failure" button
// - "Send Request" button
// - Request log with timing
// - State transition animations
// - Countdown timer when open
```

### 3. VaultRotationDemo Component

```typescript
// src/components/demo/VaultRotationDemo.tsx

interface Credential {
  username: string;
  issuedAt: Date;
  expiresAt: Date;
  ttlSeconds: number;
  status: 'active' | 'expiring' | 'expired';
}

// Features:
// - Current credential display (masked password)
// - TTL countdown bar (animated)
// - Rotation timeline visualization
// - Request monitor showing zero-downtime
// - Log of rotation events
// - "Speed up rotation" button for demo
```

### 4. ArchitectureExplorer Component

```typescript
// src/components/architecture/ArchitectureExplorer.tsx

interface ArchitectureNode {
  id: string;
  type: 'context' | 'infrastructure' | 'external';
  label: string;
  description: string;
  patterns: string[];
  codeFile?: string;
  codeSnippet?: string;
  githubUrl?: string;
}

// Features:
// - React Flow diagram
// - Custom node components
// - Animated edge connections
// - Click to open detail panel
// - Code preview with syntax highlighting
// - Link to GitHub
// - Pan and zoom
```

---

## Performance Requirements

```
┌─────────────────────────────────────────────────────────────────┐
│  PERFORMANCE TARGETS                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Core Web Vitals:                                               │
│  ─────────────────                                              │
│  LCP (Largest Contentful Paint):  < 2.5s                        │
│  FID (First Input Delay):         < 100ms                       │
│  CLS (Cumulative Layout Shift):   < 0.1                         │
│                                                                 │
│  Bundle Size:                                                   │
│  ────────────                                                   │
│  Initial JS:                      < 100KB gzipped               │
│  Total JS (after islands load):   < 300KB gzipped               │
│                                                                 │
│  Loading Strategy:                                              │
│  ─────────────────                                              │
│  - Critical CSS inlined                                         │
│  - Non-critical CSS lazy loaded                                 │
│  - React hydrated only on interactive components                │
│  - Images: WebP with fallback, lazy loaded                      │
│  - Fonts: Preloaded, font-display: swap                         │
│                                                                 │
│  Lighthouse Score Target: 95+                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Accessibility Requirements

```
┌─────────────────────────────────────────────────────────────────┐
│  ACCESSIBILITY (WCAG 2.1 AA)                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Color Contrast:                                                │
│  ───────────────                                                │
│  - Text on background: minimum 4.5:1                            │
│  - Large text (18px+): minimum 3:1                              │
│  - Interactive elements: clear focus states                     │
│                                                                 │
│  Keyboard Navigation:                                           │
│  ────────────────────                                           │
│  - All interactive elements focusable                           │
│  - Logical tab order                                            │
│  - Skip links for main content                                  │
│  - Escape closes modals/panels                                  │
│                                                                 │
│  Screen Readers:                                                │
│  ───────────────                                                │
│  - Semantic HTML (nav, main, article, section)                  │
│  - ARIA labels for icons and complex components                 │
│  - Live regions for real-time updates                           │
│  - Alt text for all images                                      │
│                                                                 │
│  Reduced Motion:                                                │
│  ───────────────                                                │
│  - @media (prefers-reduced-motion: reduce)                      │
│  - Disable animations for users who prefer                      │
│  - Keep essential transitions (state changes)                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## SEO & Meta

```html
<!-- Default meta tags -->
<title>Chidi Onyema | Senior .NET Architect - Live System Demo</title>
<meta name="description" content="See a distributed system running live.
  .NET 9, Clean Architecture, Event-Driven, DDD. Try the interactive demo.">

<!-- Open Graph -->
<meta property="og:title" content="Chidi Onyema - Distributed Systems Demo">
<meta property="og:description" content="I build distributed systems. Here's one running.">
<meta property="og:image" content="/og-image.png">
<meta property="og:type" content="website">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Chidi Onyema - Live .NET Architecture Demo">
<meta name="twitter:description" content="Interactive demo of Clean Architecture,
  CQRS, Event Sourcing, and more.">

<!-- Structured Data -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Chidi Onyema",
  "jobTitle": "Senior .NET Contractor",
  "url": "https://chidionyema.dev",
  "sameAs": [
    "https://linkedin.com/in/chidionyema",
    "https://github.com/chidionyema"
  ]
}
</script>
```

---

## Implementation Priority

### Phase 1: Foundation (Days 1-2)
- [ ] Astro project setup
- [ ] TailwindCSS configuration
- [ ] Design tokens (colors, typography)
- [ ] Base components (Button, Card, Badge)
- [ ] Layout components (Header, Footer)
- [ ] Hero section (static)

### Phase 2: Interactive Core (Days 3-5)
- [ ] SignalR hook and connection
- [ ] EventStream component
- [ ] CheckoutDemo component
- [ ] Basic API integration

### Phase 3: Advanced Demos (Days 6-8)
- [ ] CircuitBreakerDemo
- [ ] VaultRotationDemo
- [ ] SagaVisualization
- [ ] OutboxViewer

### Phase 4: Architecture Explorer (Days 9-10)
- [ ] React Flow setup
- [ ] Custom node components
- [ ] Detail panel
- [ ] Code preview integration

### Phase 5: Polish (Days 11-14)
- [ ] Animations and transitions
- [ ] Mobile responsive
- [ ] Deep-dive articles (2-3)
- [ ] Performance optimization
- [ ] SEO and meta tags
- [ ] Accessibility audit

---

## Success Criteria

```
┌─────────────────────────────────────────────────────────────────┐
│  WHAT HIRING MANAGERS SHOULD EXPERIENCE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Within 5 seconds:                                              │
│  - "This person builds real distributed systems"                │
│  - Clear call-to-action to try demo                             │
│  - Professional, polished appearance                            │
│                                                                 │
│  Within 30 seconds:                                             │
│  - Demo is running, seeing real events                          │
│  - Understanding this is a live system                          │
│  - Impressed by the production quality                          │
│                                                                 │
│  Within 2 minutes:                                              │
│  - Explored multiple demo features                              │
│  - Clicked through architecture diagram                         │
│  - Seen actual code snippets                                    │
│  - Understood the depth of implementation                       │
│                                                                 │
│  After leaving:                                                 │
│  - "I need to interview this person"                            │
│  - "They clearly know what they're doing"                       │
│  - Bookmarked the site for reference                            │
│  - Shared with colleagues                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

*This UI will put you in the top 0.1% of developer portfolios. Most show static diagrams and bullet points. Yours lets hiring managers interact with a real distributed system.*
