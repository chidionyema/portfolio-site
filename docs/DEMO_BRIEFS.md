# Demo redesign briefs (branches 2–8)

One section per demo. Each section is a self-contained design brief for
a single parallel branch. Read only the section that matches your
branch — don't read the others.

Apply the standards from `CHECKOUT_REDESIGN.md` § "Standards
(non-negotiable)" to every branch: no `...` placeholders, no recursive
listings, read budget ≤ 6 files, atomic commits, SSR-safe state init,
no new dependencies.

File ownership per branch is enforced in `PARALLEL_DEMO_WORK.md`. Don't
edit any file outside your branch's owned set.

---

## Branch 2 — `feat/rate-limiter-bucket`

**File owned**: `src/components/demo/RateLimiterDemo.tsx`

**Why**: Today's demo shows numeric counters. The user can't *feel* the
bucket draining. The bucket state IS the demo.

**Backend wire shape** (already returned by BFF, no backend change
needed): `{ allowed, bucket: { remaining, limit, resetAt,
retryAfterSeconds } }` from `POST /api/demo/ratelimit/request`.

**Design**:
1. Replace the numeric counters with a horizontal token-bucket strip:
   `bucket.limit` circles in a row, each ~24px diameter, accent colour
   when full.
2. On each `Send 1`, drain one token: scale-down + fade animation
   (`framer-motion`, ~150ms).
3. On `Send 5` / `Send 12`: drain N tokens with a 50ms stagger so the
   user *sees* them go.
4. When `bucket.remaining` hits 0 and a request returns `allowed: false`,
   render a prominent cooldown bar driven by `bucket.retryAfterSeconds`,
   with refilling animation toward `bucket.resetAt`.
5. Drop the existing `allowed/rejected` summary tiles. The bucket is
   the counter.
6. Keep the request log on the left as-is.

**Acceptance**:
- Visually: spam Send-12 three times in a row; bucket fully drains;
  next click shows "429 — retry in Ns" with countdown.
- `npm run build` green.
- No console warnings about hydration mismatch.

---

## Branch 3 — `feat/circuit-breaker-comparison`

**File owned**: `src/components/demo/CircuitBreakerDemo.tsx`

**Why**: Today's demo shows breaker behaviour in isolation. The teaching
moment is the *contrast* between "no breaker, every request waits 3s for
timeout, threads pile up" vs "breaker, instant rejected once tripped".

**Backend wire shape** (no backend change): existing
`POST /api/demo/circuit/request` returns
`{ circuitState, failureCount, successCount, rejectedCount, isRejected,
responseTimeMs }`.

**Design**:
1. Layout: two columns labelled `Without breaker` / `With breaker`.
2. **Right column** (`With breaker`): keep today's existing flow.
3. **Left column** (`Without breaker`): on `Trip & hammer`, fire 6
   parallel `fetch` calls *bypassing* the demo's existing aggregation;
   render each fetch as a row showing its raw latency. Use the existing
   `circuit/request` endpoint with `shouldFail: true` — let each call
   wait the full 3s timeout. Don't try to track circuit state in this
   column; the column's purpose is to show the timeout cliff.
4. Big `Trip & hammer` button at the top fires both columns in parallel
   so the user can watch the contrast unfold side-by-side.
5. Keep the existing reset / toggle controls below.

**Constraint**: **don't add a new BFF endpoint**. If you find yourself
wanting `circuit/request-no-breaker`, stop and report — that's a backend
change outside this branch's scope.

**Acceptance**:
- Click `Trip & hammer`: left column shows 6 rows piling up at ~3000ms
  each; right column shows the breaker tripping after 2 failures and
  rejecting subsequent calls instantly.
- `npm run build` green.

---

## Branch 4 — `feat/cache-stampede-lanes`

**File owned**: `src/components/demo/CacheStampedeDemo.tsx`

**Why**: Today's demo has three sequential buttons (`none` / `lock` /
`probabilistic`). Each click runs *one* protection mode. The teaching
moment is the *comparison*. Run all three at once.

**Backend wire shape** (no backend change): `POST /api/demo/cache/stampede`
returns `{ totalRequests, cacheHits, cacheMisses, dbQueries,
totalDurationMs, averageLatencyMs }`.

**Design**:
1. Replace the three sequential buttons with a single `Race` action
   that fires all three protection modes in parallel via `Promise.all`.
2. Three-column layout, one column per protection mode. Columns labelled
   `none` / `lock` / `probabilistic` in `font-mono`.
3. Each column shows live `dbQueries`, `cacheHits`, `cacheMisses`,
   `totalDurationMs` from its `/cache/stampede` response. Update
   asynchronously as each response arrives (don't wait for all three).
4. Visual emphasis: the `none` column should clearly *hammer the DB*
   (high `dbQueries` count, big number). The `lock` / `probabilistic`
   columns should stay near-flat. Use a horizontal bar that scales with
   `dbQueries` so the difference is visceral, not numeric only.

**Acceptance**:
- Click `Race`. Three columns populate within 2s. The `none` column's
  bar visibly dominates the others.
- `npm run build` green.

---

## Branch 5 — `feat/cache-invalidation-ripple`

**File owned**: `src/components/demo/CacheInvalidationDemo.tsx`

**Why**: The demo updates a price and shows an "invalidated" boolean.
The teaching moment is the *propagation* across cache layers (L1
in-process → L2 Redis → DB Postgres → pubsub fanout). Show it.

**Backend wire shape** (no backend change): existing
`GET /api/demo/cache/product/{id}` returns
`{ product, cacheInfo: { isHit, source, cachedAt, ttlSeconds } }`. The
PUT returns `{ ..., invalidation: { cacheKeysInvalidated, pubsubMessageSent,
instancesNotified } }`.

**Design**:
1. Add three horizontal bars at the top of the demo, labelled
   `L1 (in-process)` / `L2 (Redis)` / `DB (Postgres)`. Each bar shows
   a TTL countdown when populated, empty state when invalidated.
2. On `Read`: highlight the bar that served the response (mapped from
   `cacheInfo.source`). If `database`, the read populates L1 and L2 on
   the next read — show that on the *next* read animation.
3. On `Update`: animate a wave from L1 → L2 → DB indicating the
   invalidation propagation (each bar empties left-to-right, ~300ms
   stagger). Then `pubsubMessageSent` shows a small radio-wave icon
   pulsing once.
4. On the next `Read` post-invalidate: the source flips to `database`
   (visible bar animation), then back to L1 on subsequent reads (cache
   refilled).

**Acceptance**:
- Click sequence: Read (L1 populates), Read (L1 hit), Update (wave
  empties all three), Read (DB hit), Read (L1 hit).
- Each transition visibly animates.
- `npm run build` green.

---

## Branch 6 — `feat/vault-cred-swap`

**File owned**: `src/components/demo/VaultRotationDemo.tsx`

**Why**: Today the demo is dominated by a giant TTL countdown. The
trigger button is buried and undersized. Customers complaining "the
vault demo is just a clock". Foreground the action; show the *cred
swap* visually.

**Backend wire shape** (no backend change): existing
`POST /api/demo/vault/rotate` returns
`{ previousVersion, newVersion, status }`. SignalR pushes
`OnVaultRotation` events with `stage: 'rotating' | 'rotated'`.

**Design**:
1. Move the `Force credential rotation` button to the top of the demo
   card, accent colour, prominent label.
2. Show two credential cards side-by-side under the button:
   - Left: `v(n) active · expires in <ttl>s` (current state)
   - Right: `v(n+1) standby` (greyed until rotation begins)
3. On rotation: animate `v(n)` sliding out to the left, `v(n+1)` sliding
   into the active position, a new `v(n+2)` sliding into standby.
4. Drop the giant central countdown numeric. The TTL is now small text
   on the active card.
5. Add an "App connection" pane below: a small badge showing a fake
   DB connection that *stays green throughout rotation* (no flicker,
   no drop). This proves seamless rotation — the actual selling point.
6. Keep the rotation history log if it exists — it's useful evidence.

**Acceptance**:
- Click Force rotate; v(n) slides out, v(n+1) becomes active,
  v(n+2) appears in standby. App-connection badge stays green.
- `npm run build` green.

---

## Branch 7 — `feat/concurrency-conflict-anim`

**File owned**: `src/components/demo/ConcurrencyDemo.tsx`

**Why**: The demo's whole point is two users colliding on the same row.
The collision *moment* is currently shown as text ("Conflict: v2 Found").
Make it visceral.

**Backend wire shape** (no backend change): existing
`PUT /api/demo/inventory/{id}` returns 200 on success, 409 with
`{ currentVersion }` on conflict.

**Design**:
1. Both User_A and User_B lanes start the same way (read inventory,
   prepare a save).
2. On 409 conflict for the loser: shake animation
   (`framer-motion`: `x: [-4, 4, -4, 4, 0]`, ~300ms), red border flash
   for ~800ms, then snap loser's `readVersion`/`readQuantity` to the
   winner's values with a brief highlight pulse on the new value.
3. Winner lane: brief green-accent pulse on the success row to mark
   "this is the winner".
4. Don't change the existing read/save controls — only the post-409
   visual.

**Acceptance**:
- `Race updates` triggers both saves in parallel; one wins, the other
  shakes + snaps to the winner's version.
- `npm run build` green.

---

## Branch 8 — `feat/eventflow-polish`

**File owned**: `src/components/demo/EventFlowDemo.tsx`

**Why**: The outbox + RabbitMQ relay demo (with chaos pause/resume) is
the strongest "production distributed system" demo on the page. Today
it's mid-grid and undersold.

**Backend wire shape** (no backend change): existing
`POST /api/demo/events/trigger`, `GET /api/demo/events/relay-status`.
SignalR `OnEventFlow` pushes `{ stage: 'persisted' | 'relayed' |
'consumed' }`.

**Design**:
1. Replace the existing `queuedCount` numeric tile with a literal
   horizontal queue bar that fills proportionally to queue depth.
   Threshold lines at 10 / 50 / 100 give scale.
2. Pause/resume button is the primary action. When paused, the bar
   visibly fills as new events arrive. When resumed, the bar drains
   at observable speed.
3. Three-stage event ladder per event: `persisted → relayed → consumed`.
   Show the most recent ~5 events as horizontal rows with which stages
   they've passed. On chaos-pause, events stop progressing past
   `persisted` — that's the demo.
4. Keep the existing chaos toggle visible.

**Acceptance**:
- Pause relay; trigger 10 events; queue bar visibly fills.
- Resume; queue bar drains; events advance through stages.
- `npm run build` green.

---

## Standards reminder (every branch)

- Per-branch status file at `docs/status/<branch>.md` updated after
  every subtask.
- One commit per subtask, build green before next subtask.
- No `...` placeholders. Ever.
- No recursive directory listings.
- Read budget ≤ 6 files before first edit.
- No new npm dependencies.
- SSR-safe `useState` (empty initial + populate in `useEffect`).
- Push the branch when done. Don't merge to main.
- If blocked, write the blocker into the status file, commit, stop.
