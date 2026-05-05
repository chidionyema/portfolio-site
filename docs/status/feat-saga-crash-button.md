# feat/saga-crash-button — status

- **Branch**: `feat/saga-crash-button`
- **Base**: portfolio-site `main`
- **File owned**: `src/components/demo/CheckoutDemo.tsx`
- **Brief**: `docs/DEMO_INTUITION_PATTERN.md` § "Branch 2"
- **Last subtask completed**: —
- **Next subtask**: S0 (decision)
- **Last verified `npm run build`**: not yet
- **Last acceptance smoke**: —
- **Approach taken**: TBD (record (a) ChaosButton wire, (b) scenarioType passed at Pay, or (c) NEW backend endpoint required → stop and report)

## Subtasks

- [ ] **S0** — Decide approach. Read `src/components/demo/ChaosButton.tsx` and `lib/api/demo-client.ts triggerChaos()`. If a `payments-kill` (or similar) chaos scenario exists, take approach (a). If not, take approach (b) — pass `scenarioType: 'paymentFailure' | 'stockFailure'` to the existing `executeCommand('/saga/start', ...)` based on which crash button is armed. If neither path is sufficient, take approach (c) — write the blocker, commit, push, stop. Record decision in **Approach taken** above. **Commit**: `chore(saga): record crash-button approach`.
- [ ] **S1** — Add an `Inject failure` subsection to the engineering pane (right side). Two buttons: `Crash payment service` and `Drop stock to zero`. Buttons are ARMED on click (red border, "armed" label) but don't fire anything yet. Only one can be armed at a time. **Commit**: `feat(saga): inject-failure controls (armed state)`.
- [ ] **S2** — Wire the armed state into the Pay button's flow. When the user clicks Pay with a crash armed, dispatch the saga with the corresponding scenario or chaos trigger (per the approach decided in S0). The Pay button briefly notes "with injected failure: <type>" so cause and effect are visible. **Commit**: `feat(saga): armed crash dispatches with Pay`.
- [ ] **S3** — Verify compensation visibility. With `Crash payment service` armed and Pay clicked: saga reaches `StockReservedState`, then `Abandoned` with payment_failed reason. Compensation drawer auto-pops showing stock release. Customer pane shows "Card declined — your items are released." **Commit**: `feat(saga): wire compensation drawer to crash flows`.
- [ ] **S4** — `npm run build` green; manual smoke (with Aspire running):
  1. No crash armed → Pay → Completed receipt.
  2. Arm `Crash payment service` → Pay → Abandoned + payment-failed compensation visible.
  3. Arm `Drop stock to zero` → Pay → Abandoned + stock-failed compensation visible.
  Paste literal outputs below. **Commit**: `chore(saga): verification`.

## Last activity

—

## Last build output

```
(paste tail of `npm run build` here)
```

## Last acceptance smoke

```
(scenario-by-scenario smoke notes; saga IDs welcome)
```

## Blockers

If S0 lands on approach (c), write the rationale here and STOP. Don't improvise a backend change.

—
