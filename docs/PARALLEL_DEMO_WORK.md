# Parallel demo redesign — execution plan

The portfolio-site demo surface needs substantial UX work across ~10 demos
plus one backend consumer. Done sequentially by a single Gemini session
this is 12–15 hours wall-clock. Done in parallel across N sessions on
isolated branches it's 3–4 hours, with the user acting as the merge
coordinator.

This doc is the master plan. It defines:
- Which branches run in parallel
- Which files each branch owns (so two parallel agents never collide)
- Which files are FROZEN (no parallel branch may touch them)
- The status / checkpoint protocol per branch
- The merge sequence when branches complete

## Hard rules — read first

1. **One file = one branch.** No demo file may be edited by two
   concurrent branches. The ownership table below is binding.

2. **Shared infra is FROZEN during parallel work.** No parallel branch
   may modify any of:
   - `src/lib/api/demo-client.ts`
   - `src/lib/api/signalr.ts`
   - `src/hooks/useDemoSession.ts`
   - `src/hooks/useEventStream.ts`
   - `src/components/demo/DemoHubLite.tsx`
   - `src/components/demo/RequestReceipt.tsx`
   - `src/components/demo/DemoSidebar.tsx`
   - `src/components/demo/DemoContext.tsx`
   - `src/components/demo/CodeDrawer.tsx`
   - `src/components/demo/TraceViewer.tsx`
   - `src/lib/copy.ts`
   - `src/lib/trace-store.ts`

   If a branch genuinely needs a change in shared infra, it must
   **stop and report** in its status file. The user serialises any
   shared-infra change before resuming parallel work.

3. **Each branch reads its own status file.** Per-branch status files
   live at `docs/status/<branch-name>.md`. A fresh agent session
   resumes work by reading that file's last unticked subtask. Status
   files do not collide across branches.

4. **No branch merges itself.** Each branch pushes to origin and stops.
   The user (human merge coordinator) merges to `main` one at a time,
   in any order, fast-forward when possible. Each branch is independent
   so fast-forward is the expected case.

5. **The CHECKOUT_REDESIGN.md standards apply to every branch.** No
   `...` placeholders, no recursive listings, no `obj/`/`bin/`/
   `node_modules/` reads, no fabricated validation, no new
   dependencies, read budget ≤ 6 files before first edit, atomic
   commits, SSR-safe state init.

## Branch matrix

Each row is one independent branch. All off portfolio-site `main` unless
noted. **Files owned** = the only files this branch may modify (plus the
branch's own `docs/status/<branch>.md`).

| # | Branch | Demo / Concern | Files owned | Estimated effort | Depends on |
|---|---|---|---|---|---|
| 1 | `feat/checkout-redesign` | Checkout (full redesign) | `src/components/demo/CheckoutDemo.tsx` | L (3–4h) | — |
| 2 | `feat/rate-limiter-bucket` | RateLimiter token-bucket viz | `src/components/demo/RateLimiterDemo.tsx` | M (1–2h) | — |
| 3 | `feat/circuit-breaker-comparison` | CircuitBreaker side-by-side baseline lane | `src/components/demo/CircuitBreakerDemo.tsx` | M (1–2h) | — |
| 4 | `feat/cache-stampede-lanes` | CacheStampede three lanes simultaneously | `src/components/demo/CacheStampedeDemo.tsx` | M (1–2h) | — |
| 5 | `feat/cache-invalidation-ripple` | CacheInvalidation L1/L2/DB ripple | `src/components/demo/CacheInvalidationDemo.tsx` | M (1–2h) | — |
| 6 | `feat/vault-cred-swap` | VaultRotation v(n)/v(n+1) layout, foreground trigger | `src/components/demo/VaultRotationDemo.tsx` | M (1–2h) | — |
| 7 | `feat/concurrency-conflict-anim` | Concurrency loser-shake / winner-snap animation | `src/components/demo/ConcurrencyDemo.tsx` | S (~1h) | — |
| 8 | `feat/eventflow-polish` | EventFlow visible queue depth + pause/resume narrative | `src/components/demo/EventFlowDemo.tsx` | S (~1h) | — |
| 9 | `feat/checkout-payment-mock` (backend) | Payments demo-mode consumer | `ritualworks-platform/src/Payments/Payments.Application/Consumers/PaymentSessionRequestedConsumer.cs` (new) + Payments DI registration | M (1–2h) | Branch 1 (only at MERGE time, not implementation time) |

`feat/distributed-tracing-promote` and `IdempotencyDemo` are intentionally
absent from the matrix — both are already in good shape per the earlier
review.

## Per-branch design briefs

Each branch has its own design doc in `docs/`:

- **Branch 1 / 9 (checkout, payment-mock)**: see `CHECKOUT_REDESIGN.md`
  end-to-end. P1 phases = branch 1, P3 phases = branch 9.
- **Branches 2–8**: see `DEMO_BRIEFS.md` (one short section per demo
  with the design recommendation, the file:line cuts, and the
  acceptance criterion).

**Every branch must also read `DEMO_DESIGN_PRINCIPLES.md` end-to-end
before its first edit.** That doc encodes the cross-cutting
"intuitive + engaging" rules that distinguish a demo that *functions*
from one that *lands*. The per-branch briefs are necessary but not
sufficient — the principles doc is what makes the work feel like one
coherent product, not 9 disconnected components.

## Per-branch status protocol

Each branch maintains `docs/status/<branch>.md`. The file is the
checkpoint mechanism. Required sections:

```markdown
# <branch> — status

- **Branch**: <branch>
- **Base**: <base-branch>
- **Last subtask completed**: —
- **Next subtask**: <id>
- **Last verified `npm run build`**: not yet
- **Last acceptance test**: —

## Subtasks
- [ ] S1 — <one-line>
- [ ] S2 — …
…

## Last activity
(YYYY-MM-DD HH:MM | subtask | one line)

## Last build output
(literal tail of npm run build)

## Last acceptance test output
(literal terminal output)

## Blockers
(if any — write here, commit, stop)
```

Update after every subtask. Tick `[x]` only after the commit lands AND
the build is green AND the acceptance command output is pasted literally
below.

## Resume protocol (any session, any branch)

1. Read `PARALLEL_DEMO_WORK.md` (this file).
2. Read `CHECKOUT_REDESIGN.md` for standards (apply to all branches).
3. Read the branch's design brief: either `CHECKOUT_REDESIGN.md` (for
   branches 1, 9) or the relevant section of `DEMO_BRIEFS.md` (for
   branches 2–8).
4. Read `docs/status/<branch>.md` to find the next unticked subtask.
5. `git checkout <branch>` (create from base if it doesn't exist;
   bases are in the branch matrix).
6. `git status` and `git log --oneline -5` to confirm the prior
   session's work is committed. Don't overwrite uncommitted changes.
7. Begin the next subtask. Update **Last activity** as you go.

## Merge protocol (user-driven, sequential)

When a branch reports complete (status file shows all `[x]`, build
green, acceptance pasted):

1. User pulls `main`, fast-forward merges the branch.
2. User pushes `main`.
3. Other in-flight branches rebase onto the new `main`. Fast-forward
   is the expected outcome since file ownership is non-overlapping.
4. If a rebase produces conflicts, the matrix above was violated.
   Hold the conflict for the user to resolve manually.

## What this plan deliberately does NOT include

- **Multi-agent coordination.** No agent in any branch references this
  file at runtime. Each branch's prompt names the design brief, the
  status file, and the file ownership for *that* branch only. Agents
  don't know they're parallel; that's the user's concern.
- **Backend orchestration.** The backend payment-mock branch (#9) is
  independent of frontend branches. It can run in parallel. Its
  acceptance test (saga goes to `Completed`) doesn't require any
  frontend branch to have shipped.
- **Anything in `ritualworks-platform` other than the payment consumer.**
  All other backend work (saga compensations, observability, tracing)
  is out of scope for this parallel cycle.
