# feat/rate-limiter-mash — status

- **Branch**: `feat/rate-limiter-mash`
- **Base**: portfolio-site `main`
- **File owned**: `src/components/demo/RateLimiterDemo.tsx`
- **Brief**: `docs/DEMO_INTUITION_PATTERN.md` § "Branch 1"
- **Last subtask completed**: —
- **Next subtask**: S1
- **Last verified `npm run build`**: not yet
- **Last acceptance smoke**: —

## Subtasks

- [ ] **S1** — Add a primary `Mash for 5 seconds` button. When pressed, fires one request every ~150ms for 5s (~33 requests) against existing `POST /api/demo/ratelimit/request`. Update bucket state from each response. **Commit**: `feat(rate-limiter): mash-for-5s primary action`.
- [ ] **S2** — When `bucket.remaining` hits 0 and a response returns `allowed: false`, render an inline strip below the button: `429 — retry in Ns` with live countdown driven by `bucket.retryAfterSeconds`. After the countdown reaches 0, the bucket visibly refills. **Commit**: `feat(rate-limiter): inline 429 + retry countdown`.
- [ ] **S3** — Demote existing Send 1 / Send 5 / Send 12 buttons to a smaller secondary row below the headline. Drop any leftover allowed/rejected summary tiles. **Commit**: `refactor(rate-limiter): demote granular controls; mash is the headline`.
- [ ] **S4** — `npm run build` green; manual smoke: click Mash. Tokens drain visibly within ~750ms. After ~5 sends the inline 429 strip appears with countdown. Countdown ticks down to zero; bucket refills. Paste literal output below. **Commit**: `chore(rate-limiter): verification`.

## Last activity

—

## Last build output

```
(paste tail of `npm run build` here after each subtask)
```

## Last acceptance smoke

```
(one-line manual smoke note: did Mash visibly drain + 429 fire + countdown work?)
```

## Blockers

—
