# feat/cache-inval-customer-tab — status

- **Branch**: `feat/cache-inval-customer-tab`
- **Base**: portfolio-site `main`
- **File owned**: `src/components/demo/CacheInvalidationDemo.tsx`
- **Brief**: `docs/DEMO_INTUITION_PATTERN.md` § "Branch 3"
- **Last subtask completed**: —
- **Next subtask**: S1
- **Last verified `npm run build`**: not yet
- **Last acceptance smoke**: —

## Subtasks

- [ ] **S1** — Restructure the demo into two side-by-side panes labelled **Tab A: Admin** and **Tab B: Customer**. The existing read/update/invalidate controls move into Tab A. Tab B is a fake browser frame (rounded rectangle, faux URL bar reading `https://shop.example.com/widget`, product name + current cached price). **Commit**: `refactor(cache-inval): two-tab admin/customer split`.
- [ ] **S2** — Drive Tab B from the most recent SignalR `OnCacheEvent` (or, fallback, the most recent successful read from the BFF cache endpoint). Tab B is presentational only — no separate fetch, no second session. **Commit**: `feat(cache-inval): customer tab subscribes to invalidation events`.
- [ ] **S3** — On price update in Tab A: brief highlight pulse on Tab B's price when it updates. Tab B's status line shows `Stale — refreshing in Ns` during the invalidation window, then flips back to `Live`. **Commit**: `feat(cache-inval): customer-tab stale/live status`.
- [ ] **S4** — Relocate the L1/L2/DB tier bars + propagation wave below the two-tab view as secondary evidence (not the headline). Drop any tile that doesn't serve the two-tab framing. **Commit**: `refactor(cache-inval): demote tier bars to evidence row`.
- [ ] **S5** — `npm run build` green; manual smoke: initial state both tabs same price + Tab B reads `Live`. Click Update in Tab A: Tab B updates within ~1s with pulse; brief `Stale` status; tier bars animate the propagation wave. Paste literal output below. **Commit**: `chore(cache-inval): verification`.

## Last activity

—

## Last build output

```
(paste tail of `npm run build` here)
```

## Last acceptance smoke

```
(did Tab B update visibly? did the stale window appear? was the tier wave still visible?)
```

## Blockers

—
