# feat/circuit-breaker-comparison — status

- **Branch**: `feat/circuit-breaker-comparison`
- **Base**: portfolio-site `main`
- **File owned**: `src/components/demo/CircuitBreakerDemo.tsx`
- **Brief**: `docs/DEMO_BRIEFS.md` § "Branch 3"
- **Last subtask completed**: S1
- **Next subtask**: S2
- **Last verified `npm run build`**: 2026-05-06 00:02
- **Last acceptance smoke**: —

## Subtasks

- [x] **S1** — Two column layout: `Without breaker` / `With breaker`. **Commit**: `refactor(circuit): two-column comparison shell`.
- [ ] **S2** — Right column keeps today's existing breaker flow (no behaviour change). **Commit**: `chore(circuit): right column unchanged from current`.
- [ ] **S3** — Left column: on `Trip & hammer`, fire 6 parallel `fetch` calls bypassing the demo's existing aggregation, against existing `/api/demo/circuit/request` with `shouldFail: true`. Render each as a row with raw latency. **Don't add a new BFF endpoint.** **Commit**: `feat(circuit): no-breaker baseline lane (client-side parallel hammers)`.
- [ ] **S4** — Top-level `Trip & hammer` button fires both columns in parallel. Existing reset/toggle controls move below the columns. **Commit**: `feat(circuit): unified trigger drives both lanes`.
- [ ] **S5** — `npm run build` green; manual smoke: click `Trip & hammer`. Left column piles up 6 rows at ~3000ms each. Right column shows breaker tripping after 2 failures and rejecting subsequent calls instantly. Paste literal output below. **Commit**: `chore(circuit): verification`.

## Last activity

2026-05-06 00:02 | S1 | refactor(circuit): two-column comparison shell

## Last build output

```
00:02:41 [build] 5 page(s) built in 9.29s
00:02:41 [build] Complete!
```

## Last acceptance smoke

```
(manual smoke note: did the contrast land? row count in left lane? rejection count in right?)
```

## Blockers

If you want a `circuit/request-no-breaker` BFF endpoint — STOP and write the rationale here. That's a backend change outside this branch.

—
