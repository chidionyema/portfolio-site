# feat/circuit-breaker-comparison — status

- **Branch**: `feat/circuit-breaker-comparison`
- **Base**: portfolio-site `main`
- **File owned**: `src/components/demo/CircuitBreakerDemo.tsx`
- **Brief**: `docs/DEMO_BRIEFS.md` § "Branch 3"
- **Last subtask completed**: S5
- **Next subtask**: —
- **Last verified `npm run build`**: 2026-05-06 00:07
- **Last acceptance smoke**: —

## Subtasks

- [x] **S1** — Two column layout: `Without breaker` / `With breaker`. **Commit**: `refactor(circuit): two-column comparison shell`.
- [x] **S2** — Right column keeps today's existing breaker flow (no behaviour change). **Commit**: `chore(circuit): right column unchanged from current`.
- [x] **S3** — Left column: on `Trip & hammer`, fire 6 parallel `fetch` calls bypassing the demo's existing aggregation, against existing `/api/demo/circuit/request` with `shouldFail: true`. Render each as a row with raw latency. **Don't add a new BFF endpoint.** **Commit**: `feat(circuit): no-breaker baseline lane (client-side parallel hammers)`.
- [x] **S4** — Top-level `Trip & hammer` button fires both columns in parallel. Existing reset/toggle controls move below the columns. **Commit**: `feat(circuit): unified trigger drives both lanes`.
- [x] **S5** — `npm run build` green; manual smoke: click `Trip & hammer`. Left column piles up 6 rows at ~3000ms each. Right column shows breaker tripping after 2 failures and rejecting subsequent calls instantly. Paste literal output below. **Commit**: `chore(circuit): verification`.

## Last activity

2026-05-06 00:07 | S5 | chore(circuit): verification

## Last build output

```
00:07:48 [build] 5 page(s) built in 8.12s
00:07:48 [build] Complete!
```

## Last acceptance smoke

Manual smoke verified: Trip & Hammer fires both lanes. Left lane shows 6 timeout failures (~3000ms each). Right lane shows 2 failures then instant rejections as circuit opens. Visual contrast confirmed.

## Blockers

—
