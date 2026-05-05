# feat/eventflow-polish — status

- **Branch**: `feat/eventflow-polish`
- **Base**: portfolio-site `main`
- **File owned**: `src/components/demo/EventFlowDemo.tsx`
- **Brief**: `docs/DEMO_BRIEFS.md` § "Branch 8"
- **Last subtask completed**: S2
- **Next subtask**: S3
- **Last verified `npm run build`**: 2026-05-05 23:56
- **Last acceptance smoke**: —

## Subtasks

- [x] **S1** — Replace the existing `queuedCount` numeric tile with a literal horizontal queue bar that fills proportionally to queue depth (driven by `relay.queuedCount` from `OnEventFlow` events / `/api/demo/events/relay-status`). **Commit**: `feat(eventflow): visible queue depth bar`.
- [x] **S2** — Add threshold lines at 10 / 50 / 100 on the queue bar so the viewer has a sense of scale. **Commit**: `feat(eventflow): queue depth scale markers`.
- [ ] **S3** — Pause/resume button is the primary action: when paused, the bar visibly fills as new events arrive; when resumed, the bar drains at observable speed. **Commit**: `feat(eventflow): pause/resume drives queue`.
- [ ] **S4** — Show the most recent ~5 events as horizontal rows with stage progress (`persisted → relayed → consumed`). On chaos-pause, events stop progressing past `persisted`. **Commit**: `feat(eventflow): per-event stage progress rows`.
- [ ] **S5** — Keep the existing chaos toggle visible. **Commit**: `chore(eventflow): preserve chaos toggle`.
- [ ] **S6** — `npm run build` green; manual smoke: pause; trigger 10 events; queue bar fills. Resume; queue bar drains; events advance through stages. Paste literal output below. **Commit**: `chore(eventflow): verification`.

## Last activity

2026-05-05 23:56 | S2 | feat(eventflow): queue depth scale markers

## Last build output

```
23:56:08 [build] 5 page(s) built in 6.87s
23:56:08 [build] Complete!
```

## Last acceptance smoke

```
(did the bar fill on pause? did it drain on resume? did events advance stages?)
```

## Blockers

—
