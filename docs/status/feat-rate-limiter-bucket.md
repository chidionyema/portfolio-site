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

- [ ] **S1** — Replace numeric counters with horizontal token-bucket strip (`bucket.limit` circles, accent when full). **Commit**: `refactor(rate-limiter): token-bucket strip replaces counters`.
- [ ] **S2** — Wire drain animations on Send 1 / Send 5 / Send 12 (framer-motion scale-down + fade ~150ms; 50ms stagger between tokens for multi-spend). **Commit**: `feat(rate-limiter): visible token drain on send`.
- [ ] **S3** — Cooldown bar driven by `bucket.retryAfterSeconds` + refilling animation toward `bucket.resetAt`. **Commit**: `feat(rate-limiter): cooldown bar + refill animation`.
- [ ] **S4** — Drop the `allowed/rejected` summary tiles. The bucket IS the counter. **Commit**: `refactor(rate-limiter): bucket is the counter`.
- [ ] **S5** — `npm run build` green; manual smoke: spam Send-12 three times → bucket fully drains → next click shows `429 — retry in Ns`. Paste literal output below. **Commit**: `chore(rate-limiter): verification`.

## Last activity

—

## Last build output

```
(paste tail of `npm run build` here after each subtask)
```

## Last acceptance smoke

```
(one-line manual smoke note + screenshot path if you took one)
```

## Blockers

—
