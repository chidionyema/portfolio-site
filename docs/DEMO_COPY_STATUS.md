# Demo copy rewrite — status / checkpoint log

Resume mechanism for the agent applying `DEMO_COPY_TEMPLATES.md`
to the actual demo components. Tick each `[x]` only after the copy
is wired into the component AND `npm run build` is green AND a
visual smoke note is recorded.

## Branch

- **Branch**: `feat/demo-copy-rewrite`
- **Base**: portfolio-site `main`
- **Worktree**: `/Users/chidionyema/Documents/code/portfolio-site-copy-rewrite`
  (operator creates with `git worktree add ../portfolio-site-copy-rewrite -b feat/demo-copy-rewrite`)
- **Files owned**: the 10 demo files in `src/components/demo/`,
  plus `src/lib/copy.ts` if you choose to extract shared strings.
- **Files NOT owned**: anything outside `src/components/demo/` or
  `src/lib/copy.ts`. Frozen list still applies (see
  `PARALLEL_DEMO_WORK.md` Hard Rule 0).

## Per-demo subtasks

For each demo, the work is the same shape:
1. Read the demo's section in `DEMO_COPY_TEMPLATES.md`.
2. Read the existing component to find where the current `<h3>`,
   description, success/failure pills, and animation states live.
3. Replace headline + setup line near the top of the component.
4. Wire in-flight labels into existing animation states (you may
   need to add one short rendering block per label state).
5. Replace the outcome banner.
6. Add the pattern line at the bottom of the demo card.
7. `npm run build` green; paste tail of build output below the
   demo's checklist.
8. Manual smoke note: hard-refresh `:4321/`, navigate to demo,
   press its primary action, confirm the new copy actually appears
   in the visible state changes. One sentence.
9. Commit: `feat(demo-copy): apply 5-element pattern to <demo-name>`.

### Demos

- [ ] **2 — CheckoutDemo** (saga). File: `src/components/demo/CheckoutDemo.tsx`. Section: §2 in templates.
- [ ] **3 — RateLimiterDemo**. File: `src/components/demo/RateLimiterDemo.tsx`. Section: §3.
- [ ] **4 — VaultRotationDemo**. File: `src/components/demo/VaultRotationDemo.tsx`. Section: §4.
- [ ] **5 — CacheStampedeDemo**. File: `src/components/demo/CacheStampedeDemo.tsx`. Section: §5.
- [ ] **6 — CacheInvalidationDemo**. File: `src/components/demo/CacheInvalidationDemo.tsx`. Section: §6.
- [ ] **7 — ConcurrencyDemo**. File: `src/components/demo/ConcurrencyDemo.tsx`. Section: §7.
- [ ] **8 — CircuitBreakerDemo**. File: `src/components/demo/CircuitBreakerDemo.tsx`. Section: §8.
- [ ] **9 — EventFlowDemo**. File: `src/components/demo/EventFlowDemo.tsx`. Section: §9.
- [ ] **10 — DistributedTracingDemo**. File: `src/components/demo/DistributedTracingDemo.tsx`. Section: §10.

(Demo 1, IdempotencyDemo, is the reference standard and is **not**
edited.)

### Final acceptance

- [ ] All 9 demos ticked above
- [ ] `npm run build` green: paste tail below
- [ ] Manual smoke: open every demo in the browser, press primary
  action, verify new headline + outcome are visible. One sentence
  per demo.
- [ ] Push branch `feat/demo-copy-rewrite`. Don't merge.

## Last activity

(Replace this line each subtask: `YYYY-MM-DD HH:MM | demo-N | one line`)

—

## Last build output

```
(paste tail of `npm run build` here)
```

## Smoke notes (per-demo, one line each)

```
2 CheckoutDemo:        (your one-line note here)
3 RateLimiterDemo:     —
4 VaultRotationDemo:   —
5 CacheStampedeDemo:   —
6 CacheInvalidationDemo: —
7 ConcurrencyDemo:     —
8 CircuitBreakerDemo:  —
9 EventFlowDemo:       —
10 DistributedTracingDemo: —
```

## Blockers

(If you hit a structural problem the templates don't anticipate —
e.g. a component has no clear place for the in-flight labels, or
the file paths in the pattern lines don't exist in the repo —
record it here, commit, push, stop. Don't improvise around it.)

—

## Resume protocol (if a fresh session takes over)

1. Read `DEMO_COPY_PATTERN.md` end-to-end (the rules).
2. Read this file to find the FIRST unticked demo. That's where you
   resume.
3. Read ONLY that demo's section in `DEMO_COPY_TEMPLATES.md`.
4. Run `git status` in the worktree. If there's uncommitted work,
   it's the previous agent's WIP — finish it as part of the current
   demo, or stash with a clear name and start fresh from this demo.
5. Begin the per-demo subtask shape above.
