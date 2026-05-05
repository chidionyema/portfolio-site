# feat/cache-invalidation-ripple — status

- **Branch**: `feat/cache-invalidation-ripple`
- **Base**: portfolio-site `main`
- **File owned**: `src/components/demo/CacheInvalidationDemo.tsx`
- **Brief**: `docs/DEMO_BRIEFS.md` § "Branch 5"
- **Last subtask completed**: S2
- **Next subtask**: S3
- **Last verified `npm run build`**: 2026-05-05 23:46
- **Last acceptance smoke**: —

## Subtasks

- [x] **S1** — Three horizontal bars at top: `L1 (in-process)` / `L2 (Redis)` / `DB (Postgres)`. Each bar shows TTL countdown when populated, empty state when invalidated. **Commit**: `feat(cache-inval): three-tier ladder UI`.
- [x] **S2** — Read animation: highlight the bar that served the response (mapped from `cacheInfo.source`). **Commit**: `feat(cache-inval): read highlights serving tier`.
- [ ] **S3** — Update animates a wave from L1 → L2 → DB (each bar empties left-to-right, ~300ms stagger). Then `pubsubMessageSent` shows a small radio-wave icon pulsing once. **Commit**: `feat(cache-inval): invalidation propagation wave`.
- [ ] **S4** — Next read post-invalidate: source flips to `database` (visible bar animation), then back to `L1` on subsequent reads (cache refilled). **Commit**: `feat(cache-inval): post-invalidate refill animation`.
- [ ] **S5** — `npm run build` green; manual smoke: Read / Read / Update / Read / Read sequence; each transition visibly animates. Paste literal output below. **Commit**: `chore(cache-inval): verification`.

## Last activity

2026-05-05 23:46 | S2 | feat(cache-inval): read highlights serving tier

## Last build output

```
23:46:29 [build] 5 page(s) built in 7.70s
23:46:29 [build] Complete!
```

## Last acceptance smoke

```
(did the sequence animate? which transition was the most visible?)
```

## Blockers

—
