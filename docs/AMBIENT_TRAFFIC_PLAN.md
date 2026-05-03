# Technical Plan: Ambient Traffic & Real-Time Metrics

**Objective:** Ensure the HAWorks dashboard is never "cold." We will implement a background traffic engine that continuously puts data through the production cluster, providing real-time metrics and a "living" UI even between visitor interactions.

---

## 1. The "Ambient Pulse" Engine (.NET 9)

### 1.1 TrafficGeneratorWorker.cs
A background service (`IHostedService`) in the `ritualworks` Api project.

*   **Role:** Every 15-60 seconds (randomized jitter), it dispatches a real MediatR command (e.g., `ProcessOrderCommand` or `RefreshCacheCommand`).
*   **Tenant:** These commands are marked with a specific `System_Automated` tenant ID.
*   **Goal:** This ensures that the **Transactional Outbox** always has a heartbeat and **MassTransit Sagas** are always firing.

### 1.2 Global Telemetry Group (SignalR)
*   **The Change:** The `DemoHub` will now support a **`GlobalSystemPulse`** group.
*   **Logic:** 
    *   **Manual Actions:** Broadcast to `demo-{sessionId}` (Only the user who triggered it sees it).
    *   **Ambient Traffic:** Broadcast to `GlobalSystemPulse` (Everyone on the site sees it).
*   **Effect:** The "Live Event Ticker" at the top of the site will scroll with real system activity from all over the world.

---

## 2. Real Metric Aggregation

### 2.1 Telemetry Aggregator
Instead of hardcoding "42ms latency" in the UI, we will pull it from the real **OpenTelemetry** or **App Insights** metrics.

*   **Endpoint:** `GET /api/system/metrics`
*   **Data Points:**
    *   **24h Ingress:** Real count of records in `demo.outbox_messages`.
    *   **P99 Latency:** Real duration of the last 100 `ProcessOrder` commands.
    *   **Availability:** Real health check status of the Fly.io nodes.

---

## 3. UI Visualization: "System vs. User"

### 3.1 The "Global Pulse" Overlay
We will add a subtle "Global Activity" indicator to the UI.
*   **Visual:** When an automated system order happens, a ghost-white pulse travels across the **System Topology Map**.
*   **Visual:** When the *visitor* clicks a button, a primary-accent (Indigo) pulse travels across the map.
*   **Benefit:** This proves to the Hiring Manager that "People (and systems) are using this right now."

---

## 4. Implementation Steps

### Phase 1: The Heartbeat
1.  Implement `TrafficGeneratorWorker.cs` in the backend.
2.  Update the `SignalRDemoHubNotifier` to support `BroadcastToGlobalAsync`.

### Phase 2: Live Metrics API
1.  Add a `MetricsService` that queries the `demo` database and Redis for real counts.
2.  Expose `GET /api/system/metrics`.

### Phase 3: UI Integration
1.  Update the `Hero` metrics to poll the real `/api/system/metrics` every 30 seconds.
2.  Update `useDemoSession` to listen to the `GlobalSystemPulse` SignalR group.
3.  Add "Automated Task" labels to events in the telemetry streams that didn't originate from the current session.
