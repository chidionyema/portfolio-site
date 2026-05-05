# feat/concurrency-conflict-anim — status

- **Branch**: `feat/concurrency-conflict-anim`
- **Base**: portfolio-site `main`
- **File owned**: `src/components/demo/ConcurrencyDemo.tsx`
- **Brief**: `docs/DEMO_BRIEFS.md` § "Branch 7"
- **Last subtask completed**: —
- **Next subtask**: S1
- **Last verified `npm run build`**: not yet
- **Last acceptance smoke**: —

## Subtasks

- [ ] **S1** — On 409 conflict for the loser: shake the lane card with `framer-motion` (`x: [-4, 4, -4, 4, 0]`, ~300ms duration). **Commit**: `feat(concurrency): loser shake on conflict`.
- [ ] **S2** — Add red border flash on the loser for ~800ms post-shake. **Commit**: `feat(concurrency): loser red flash`.
- [ ] **S3** — Snap loser's `readVersion` / `readQuantity` to the winner's values with a brief highlight pulse on the new value. **Commit**: `feat(concurrency): loser snaps to winner state`.
- [ ] **S4** — Winner lane: brief green-accent pulse on the success row. **Commit**: `feat(concurrency): winner success pulse`.
- [ ] **S5** — `npm run build` green; manual smoke: click `Race updates`; one lane wins (green pulse), the other shakes + flashes red + snaps to the winner's values. Paste literal output below. **Commit**: `chore(concurrency): verification`.

## Last activity

—

## Last build output

```
(paste tail of `npm run build` here)
```

## Last acceptance smoke

```
(did the loser shake + snap? did the winner pulse?)
```

## Blockers

—
