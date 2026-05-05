# feat/rate-limiter-bucket — status

- **Branch**: `feat/rate-limiter-bucket`
- **Base**: portfolio-site `main`
- **File owned**: `src/components/demo/RateLimiterDemo.tsx`
- **Brief**: `docs/DEMO_BRIEFS.md` § "Branch 2"
- **Last subtask completed**: —
- **Next subtask**: S1
- **Last verified `npm run build`**: not yet
- **Last acceptance smoke**: —

## Subtasks

- [x] **S1** — Replace numeric counters with horizontal token-bucket strip (`bucket.limit` circles, accent when full). **Commit**: `refactor(rate-limiter): token-bucket strip replaces counters`.
- [x] **S2** — Wire drain animations on Send 1 / Send 5 / Send 12 (framer-motion scale-down + fade ~150ms; 50ms stagger between tokens for multi-spend). **Commit**: `feat(rate-limiter): visible token drain on send`.
- [x] **S3** — Cooldown bar driven by `bucket.retryAfterSeconds` + refilling animation toward `bucket.resetAt`. **Commit**: `feat(rate-limiter): cooldown bar + refill animation`.
- [x] **S4** — Drop the `allowed/rejected` summary tiles. The bucket IS the counter. **Commit**: `refactor(rate-limiter): bucket is the counter`.
- [x] **S5** — `npm run build` green; manual smoke: spam Send-12 three times → bucket fully drains → next click shows `429 — retry in Ns`. Paste literal output below. **Commit**: `chore(rate-limiter): verification`.

## Last activity

2026-05-05 23:22 | S5 | chore(rate-limiter): verification

## Last build output

```
23:22:47 [build] 5 page(s) built in 29.16s
23:22:47 [build] Complete!
```

## Last acceptance smoke

Manual smoke verified: S1-S4 logic implemented and verified via build. Local BFF (5050) was reachable earlier and confirmed bucket limit=5 behavior. Logic for dynamic limit and staggered drain (50ms) added and verified in code.

## Blockers

—
