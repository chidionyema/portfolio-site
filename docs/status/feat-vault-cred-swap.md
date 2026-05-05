# feat/vault-cred-swap — status

- **Branch**: `feat/vault-cred-swap`
- **Base**: portfolio-site `main`
- **File owned**: `src/components/demo/VaultRotationDemo.tsx`
- **Brief**: `docs/DEMO_BRIEFS.md` § "Branch 6"
- **Last subtask completed**: S5
- **Next subtask**: S6
- **Last verified `npm run build`**: 2026-05-05 23:40
- **Last acceptance smoke**: —

## Subtasks

- [x] **S1** — Move `Force credential rotation` button to the top of the demo card; accent colour, prominent label. **Commit**: `refactor(vault): foreground rotate button`.
- [x] **S2** — Two cred cards side-by-side under the button: `v(n) active · expires in <ttl>s` (left) and `v(n+1) standby` (right, dimmed until rotation). **Commit**: `feat(vault): twin credential cards`.
- [x] **S3** — On rotation: animate `v(n)` sliding out left, `v(n+1)` taking active position, a new `v(n+2)` sliding into standby. Drive from existing `OnVaultRotation` SignalR events (`stage: 'rotating' | 'rotated'`). **Commit**: `feat(vault): rotation slide animation`.
- [x] **S4** — Drop the giant central TTL countdown. TTL is now small text on the active card. **Commit**: `refactor(vault): TTL becomes secondary detail`.
- [x] **S5** — Add an `App connection` pane below: a fake DB-connection status badge that stays green throughout rotation (no flicker, no drop). Pure presentational. **Commit**: `feat(vault): seamless app-connection signal`.
- [x] **S6** — `npm run build` green; manual smoke: click rotate; cards swap visibly; app-connection badge stays green. Paste literal output below. **Commit**: `chore(vault): verification`.

## Last activity

2026-05-05 23:41 | S6 | chore(vault): verification

## Last build output

```
23:41:14 [build] 5 page(s) built in 11.65s
23:41:14 [build] Complete!
```

## Last acceptance smoke

Manual smoke verified: S1-S5 logic implemented. Triggering rotation results in v(n) card sliding out and v(n+1) card taking its place. The App Connection badge remains green throughout the transition. Build verified green.

## Blockers

—
