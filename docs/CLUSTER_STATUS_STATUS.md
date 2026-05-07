# Cluster status banner — implementation status

Resume mechanism for the agent applying `CLUSTER_STATUS_BANNER.md`.

## Branch

- **Branch**: `feat/cluster-status-banner`
- **Base**: portfolio-site `main`
- **Worktree**: `/Users/chidionyema/Documents/code/portfolio-site-cluster-banner`
  (operator: `git worktree add ../portfolio-site-cluster-banner -b feat/cluster-status-banner origin/main`)
- **Files owned**:
  - `src/components/system/ClusterStatusBanner.tsx` (new)
  - `src/components/system/ClusterErrorInline.tsx` (new)
  - `src/lib/cluster-status-context.tsx` (new)
  - `src/layouts/BaseLayout.astro` (small edit — embed banner)
  - The 10 demo component files in `src/components/demo/` (per-demo
    error wiring)
- **Files NOT owned**: anything outside the above. Frozen list per
  `PARALLEL_DEMO_WORK.md` Hard Rule 0 still applies.

## Subtasks

### Phase A — Core infra (~1.5 hours)

- [ ] **A1** — Create `ClusterErrorInline.tsx` per spec in
  `CLUSTER_STATUS_BANNER.md` § 2. ~30 LOC. **Commit**:
  `feat(system): inline cluster-error component`.

- [ ] **A2** — Create `cluster-status-context.tsx`. Provider polls
  `getHealthSnapshot()` every 5s; resolves to one of `'unknown' |
  'healthy' | 'degraded' | 'unreachable'` with 3-retry backoff
  before declaring unreachable. Exposes via React Context. ~80 LOC.
  **Commit**: `feat(system): cluster-status context provider`.

- [ ] **A3** — Create `ClusterStatusBanner.tsx`. Consumes the
  context. Renders nothing on `unknown`/`healthy`, amber chip on
  `degraded` (with affected service names from
  `HealthSnapshot.services[].status === 'offline'`), full red
  banner on `unreachable` (with the verbatim copy from
  CLUSTER_STATUS_BANNER.md § 1). ~80 LOC. **Commit**:
  `feat(system): cluster-status banner`.

- [ ] **A4** — Embed in `src/layouts/BaseLayout.astro` at the top
  of body. Wrap in the context provider so it's available to every
  page. **Commit**: `feat(layout): mount cluster-status banner +
  provider`.

- [ ] **A5** — `npm run build` green; paste tail below. Manual
  smoke: kill the cluster (`pkill -KILL -f
  "ritualworks-platform/src/.*\.Api"`), reload `:4321/` — red banner
  appears. Restart cluster — banner clears within 10s. **Commit**:
  `chore(cluster-status): phase A verification`.

### Phase B — Per-demo error wiring (~2 hours)

For each demo:
1. Add `useState<string | null>(null)` for error
2. Wrap existing primary action's try/catch to setError on failure
3. Render `<ClusterErrorInline message={error} />` next to the
   result area when error is set
4. Consume cluster-status context; disable primary button on
   `'unreachable'`; render "Cluster offline" note under headline
5. Build green between each demo
6. Commit: `feat(demo-X): cluster-status error fallback`

- [ ] **B1** — IdempotencyDemo
- [ ] **B2** — CheckoutDemo (saga)
- [ ] **B3** — RateLimiterDemo
- [ ] **B4** — VaultRotationDemo
- [ ] **B5** — CacheStampedeDemo
- [ ] **B6** — CacheInvalidationDemo
- [ ] **B7** — ConcurrencyDemo
- [ ] **B8** — CircuitBreakerDemo
- [ ] **B9** — EventFlowDemo
- [ ] **B10** — DistributedTracingDemo

### Phase C — Acceptance (run all five scenarios)

- [ ] **C1** — Cluster up: banner hidden, demos work as today.
- [ ] **C2** — Cluster down before page load: red banner; every
  demo shows "Cluster offline" under headline; primary buttons
  disabled.
- [ ] **C3** — Cluster goes down mid-session: banner appears within
  15s; new demo clicks show `<ClusterErrorInline />`.
- [ ] **C4** — Cluster recovers: banner disappears within 5s;
  demos re-enable.
- [ ] **C5** — One service offline (kill catalog only): amber
  banner names it; saga demo (which depends on catalog) shows
  inline error; vault demo (which doesn't) still works.

- [ ] Push branch `feat/cluster-status-banner`. Don't merge.

## Last activity

—

## Last build output

```
(paste tail of `npm run build` here at each phase boundary)
```

## Phase C smoke notes

```
C1 Cluster up:                —
C2 Cluster down on load:      —
C3 Mid-session cluster down:  —
C4 Cluster recovers:          —
C5 Single-service offline:    —
```

## Blockers

(If a structural problem emerges — context provider can't be
reached from Astro islands hydrated in different ways, the
HealthSnapshot type doesn't carry the data needed for the degraded
banner, etc — record here, commit, push, stop.)

—

## Resume protocol

1. Read `CLUSTER_STATUS_BANNER.md` end-to-end.
2. Read this file. Find the first unticked subtask.
3. `git status` in the worktree. If WIP exists, finish it as part
   of the current subtask, or stash with a clear name.
4. Continue from the first unticked subtask.

Phase A subtasks must complete before Phase B starts (B depends on
the context + components from A). Phase B subtasks are
independent of each other; safe to do in any order. Phase C runs
last — it's acceptance only, no code changes.
