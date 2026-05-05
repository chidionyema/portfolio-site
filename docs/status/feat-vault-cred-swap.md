# feat/vault-cred-swap — status

- **Branch**: `feat/vault-cred-swap`
- **Base**: portfolio-site `main`
- **File owned**: `src/components/demo/VaultRotationDemo.tsx`
- **Brief**: `docs/DEMO_BRIEFS.md` § "Branch 6"
- **Last subtask completed**: —
- **Next subtask**: S1
- **Last verified `npm run build`**: not yet
- **Last acceptance smoke**: —

## Subtasks

- [x] **S1** — Move `Force credential rotation` button to the top of the demo card; accent colour, prominent label. **Commit**: `refactor(vault): foreground rotate button`.
- [x] **S2** — Two cred cards side-by-side under the button: `v(n) active · expires in <ttl>s` (left) and `v(n+1) standby` (right, dimmed until rotation). **Commit**: `feat(vault): twin credential cards`.
- [ ] **S3** — On rotation: animate `v(n)` sliding out left, `v(n+1)` taking active position, a new `v(n+2)` sliding into standby. Drive from existing `OnVaultRotation` SignalR events (`stage: 'rotating' | 'rotated'`). **Commit**: `feat(vault): rotation slide animation`.
- [ ] **S4** — Drop the giant central TTL countdown. TTL is now small text on the active card. **Commit**: `refactor(vault): TTL becomes secondary detail`.
- [ ] **S5** — Add an `App connection` pane below: a fake DB-connection status badge that stays green throughout rotation (no flicker, no drop). Pure presentational. **Commit**: `feat(vault): seamless app-connection signal`.
- [ ] **S6** — `npm run build` green; manual smoke: click rotate; cards swap visibly; app-connection badge stays green. Paste literal output below. **Commit**: `chore(vault): verification`.

## Last activity

2026-05-05 23:37 | S2 | feat(vault): twin credential cards

## Last build output

```
23:37:01 [build] 5 page(s) built in 106.13s
23:37:01 [build] Complete!
```

## Last acceptance smoke

```
(did v(n) slide out cleanly? did the badge stay green?)
```

## Blockers

—
