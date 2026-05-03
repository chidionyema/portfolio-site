# Technical Master Plan: Interactive Production Playground

**Goal:** Transform the portfolio into a live, interactive "Production Playground" where hiring managers can interact with, stress-test, and break a real distributed system built on .NET 9.

---

## 1. System Architecture & Foundation

### 1.1 The "Isolation" Strategy
To allow multiple simultaneous visitors without cross-talk:
*   **Session ID:** Every visitor gets a unique `X-Demo-Session-ID`.
*   **Scoped Data:** Postgres records for the Concurrency/Outbox demos will be logically scoped or dynamically created per session.
*   **Redis Key Space:** Idempotency and Rate Limit keys will be prefixed: `demo:{session_id}:*`.

### 1.2 The "Heartbeat" (SignalR DemoHub)
A centralized SignalR Hub in the `.NET 9` cluster will broadcast internal system events.
*   **Events:** `OnSagaStep`, `OnOutboxRelay`, `OnCacheHit`, `OnCircuitStateChange`, `OnVaultRotation`.
*   **Telemetry:** Every event includes a `TraceId` and `CorrelationId` to prove clean architecture.

---

## 2. Infrastructure-Active Modules

### 2.1 Distributed Saga (Orchestration)
*   **Mechanism:** Real MassTransit `Automatonymous` state machine.
*   **Playground:** User picks a "Path" (Happy, Stock Out, Payment Fail).
*   **Proof:** SignalR emits the *actual* state transitions from the backend.

### 2.2 Transactional Outbox (Guaranteed Delivery)
*   **Mechanism:** `demo.outbox_messages` table in Postgres + Background Relay Service.
*   **Playground:** A "Break Message Broker" button in the Chaos Engine.
*   **Proof:** User sees messages pile up in the DB table, then "drain" instantly to RabbitMQ when the broker is restored.

### 2.3 HybridCache L1/L2 (.NET 9)
*   **Mechanism:** `Microsoft.Extensions.Caching.Hybrid`.
*   **Playground:** "Clear Local L1" vs "Clear Redis L2".
*   **Proof:** A latency bar chart showing:
    *   L1 (Memory): ~0.1ms
    *   L2 (Upstash Redis): ~15ms
    *   L3 (Neon Postgres): ~150ms

### 2.4 Vault Rotation (Zero-Downtime)
*   **Mechanism:** Dynamic Database Secrets engine in HashiCorp Vault.
*   **Playground:** "Trigger Rotation" button.
*   **Proof:** A live "Connection Pool" visualizer showing the active connections draining from `User_V1` and spawning for `User_V2` with zero failed requests in the log.

---

## 3. The "Playground Engine" (New Features)

### 3.1 The Global Chaos Engine
A persistent control panel in the UI to inject real faults:
*   **Latency Injection:** Wraps backend calls in a Polly `Hedging` or `Timeout` policy that adds `Thread.Sleep` based on Chaos state.
*   **Downstream Faults:** Forces a "Service B" (simulated) to return 503s to trigger the Circuit Breaker.
*   **Broker Partition:** Stops the Outbox Relay task to show queueing.

### 3.2 The "Traffic Storm" Generator
*   **Mechanism:** A client-side Web Worker or backend "Batch Command".
*   **Action:** Dispatches 100 simultaneous requests to the **Rate Limiter** or **Cache Stampede** endpoints.
*   **Visual:** 100 "Traffic Particles" hit the Gateway. Hiring managers see the Token Bucket drain and the "Wait/Lock" logic in action.

---

## 4. Technical Implementation Roadmap

### Phase 1: Backend Infrastructure (2 Days)
1.  Implement `DemoHub` and `IDemoHubNotifier`.
2.  Set up `DemoController` with basic session management.
3.  Deploy basic `.NET 9` API to Fly.io.

### Phase 2: Patterns & Infrastructure (3 Days)
1.  **Postgres:** Create `demo` schema and migrations for Outbox and Inventory.
2.  **Redis:** Configure Upstash for Rate Limiting and HybridCache.
3.  **RabbitMQ:** Connect CloudAMQP for MassTransit Saga events.

### Phase 3: High-Fidelity Visualizers (2 Days)
1.  Build the **System Topology Map** component.
2.  Build the **Connection Pool** and **Latency Speedometer** components.
3.  Integrate the **Chaos Engine** state into the `useDemoSession` hook.

### Phase 4: Polish & "View Source" (1 Day)
1.  Add "View Backend Source" tabs to every module showing the actual C# code (e.g., the `ProcessOrderSaga.cs`).
2.  Final UX pass for "2-second attention" validation.

---

## 5. Verification Commands
```bash
# Verify Backend Build
dotnet build ritualworks.sln

# Verify Frontend Integrity
npm run build

# Verify Real-time Connection
curl -X POST https://api.chidionyema.dev/api/demo/heartbeat
```
