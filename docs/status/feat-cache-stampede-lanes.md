# feat/cache-stampede-lanes — status

- **Branch**: `feat/cache-stampede-lanes`
- **Base**: portfolio-site `main`
- **File owned**: `src/components/demo/CacheStampedeDemo.tsx`
- **Brief**: `docs/DEMO_BRIEFS.md` § "Branch 4"
- **Last subtask completed**: —
- **Next subtask**: S1
- **Last verified `npm run build`**: not yet
- **Last acceptance smoke**: —

## Subtasks

- [ ] **S1** — Replace three sequential buttons with a single `Race` action that fires all three protection modes via `Promise.all` against `POST /api/demo/cache/stampede`. **Commit**: `refactor(stampede): single Race action`.
- [ ] **S2** — Three-column layout labelled `none` / `lock` / `probabilistic` in `font-mono`. **Commit**: `feat(stampede): three-lane comparison layout`.
- [ ] **S3** — Each column shows live `dbQueries`, `cacheHits`, `cacheMisses`, `totalDurationMs`. Update asynchronously as each response arrives (don't wait for all three). **Commit**: `feat(stampede): async per-lane updates`.
- [ ] **S4** — Horizontal bar scaling with `dbQueries` so `none` visibly dominates. Use a shared max across lanes for fair comparison. **Commit**: `feat(stampede): db-queries bar makes contrast visceral`.
- [ ] **S5** — `npm run build` green; manual smoke: click `Race`. Three columns populate within ~2s. The `none` column's bar visibly dominates the others. Paste literal output below. **Commit**: `chore(stampede): verification`.

## Last activity

—

## Last build output

```
(paste tail of `npm run build` here)
```

## Last acceptance smoke

```
(did `none` clearly dominate? approximate dbQueries values across lanes?)
```

## Blockers

—
