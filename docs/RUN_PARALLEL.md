# Running parallel Gemini sessions — paste-ready prompts

Open N terminals. In each, paste one of the prompts below. Each is
self-contained: it points the agent at the docs, names the branch,
and bounds the scope. The agent doesn't know it's parallel; that's
your job to coordinate.

## Setup (do once before fanning out)

In the portfolio-site repo, ensure `main` is current and the docs are
in place:

```bash
cd /Users/chidionyema/Documents/code/portfolio-site
git checkout main
git pull origin main
ls docs/CHECKOUT_REDESIGN.md docs/DEMO_BRIEFS.md \
   docs/DEMO_DESIGN_PRINCIPLES.md docs/PARALLEL_DEMO_WORK.md
```

All four files must exist. If any is missing, stop — the parallel
plan depends on them.

You can run any subset of the nine prompts. Suggested first batch
(no inter-branch dependencies, all small/medium effort):

- Branch 7 (concurrency conflict animation) — small, ~1h
- Branch 2 (rate limiter token bucket) — medium, ~1.5h
- Branch 6 (vault cred swap) — medium, ~1.5h
- Branch 9 (backend payment mock) — runs against ritualworks-platform, doesn't conflict with frontend branches

That's four parallel sessions, three of which finish in ~90 minutes
each, all touching different files. Merge them sequentially as they
complete.

The big one (Branch 1, checkout redesign) takes 3–4 hours; consider
running it in its own terminal alone or pairing with a small one.

## Standard preamble (every prompt)

Every prompt below opens with this preamble. The agent reads it,
internalises the constraints, then proceeds. Don't paraphrase — the
preamble's exact wording matters.

```
You are working on a single branch in /Users/chidionyema/Documents/code/portfolio-site
(or its sibling ritualworks-platform repo for backend branches).

Read these four docs end-to-end before your first edit:
1. docs/PARALLEL_DEMO_WORK.md   — file ownership, frozen list, merge protocol
2. docs/DEMO_DESIGN_PRINCIPLES.md — 10 cross-cutting design rules
3. The relevant per-branch brief: see specific section below
4. docs/status/<branch>.md if it exists; otherwise create it

Hard rules (non-negotiable):
- Stay strictly within the files this branch owns. Don't touch frozen-list files.
- No literal "..." placeholders in source. Ever.
- No recursive directory listings (no `ls -R`, no `tree`, no recursive grep).
- No reads under obj/, bin/, node_modules/, .vite/, dist/, logs/.
- Read budget: ≤6 files before your first edit.
- One commit per visibly-distinct subtask. Build green before next subtask.
- Update docs/status/<branch>.md after every subtask: tick the checkbox,
  paste the LITERAL output of `npm run build` (or `dotnet build` for backend),
  paste any acceptance command output verbatim. No fabrication.
- No new npm/NuGet dependencies.
- SSR-safe useState (empty initial + populate in useEffect).
- If blocked, write the blocker into the status file, commit, stop. Don't improvise.

When done: push the branch. Do NOT merge to main. Do NOT open a PR.
Report back with the branch name, the last commit SHA, and the literal
output of the acceptance command.
```

---

# Branch 1 — Checkout full redesign (Large)

```
[paste the standard preamble above, then:]

Branch: feat/checkout-redesign
Base:   portfolio-site main
Brief:  docs/CHECKOUT_REDESIGN.md (read END-TO-END, including standards section)
Status: docs/status/feat-checkout-redesign.md (create if absent)
File owned: src/components/demo/CheckoutDemo.tsx (and src/lib/copy.ts if you
            chose to put copy strings there per CHECKOUT_REDESIGN.md P1.1)

Phases P1.1 through P1.8 are spelled out in CHECKOUT_REDESIGN_STATUS.md
(if that file exists; otherwise the same plan is in CHECKOUT_REDESIGN.md
under "Layout — 45/55 split" and "Cut list").

Start with P1.1. After each subtask: commit, build green, paste the build
output literally into the status file, tick the checkbox, then move on.

Do not start P3 (backend payment mock). That is a separate branch.

When all of P1 (and P2 acceptance) is ticked, push feat/checkout-redesign
and stop.
```

---

# Branch 2 — RateLimiter token bucket (Medium)

```
[paste the standard preamble, then:]

Branch: feat/rate-limiter-bucket
Base:   portfolio-site main
Brief:  docs/DEMO_BRIEFS.md § "Branch 2 — feat/rate-limiter-bucket" ONLY
        (don't read other branches' sections)
Status: docs/status/feat-rate-limiter-bucket.md (create if absent, structure
        per docs/PARALLEL_DEMO_WORK.md "Per-branch status protocol")
File owned: src/components/demo/RateLimiterDemo.tsx

Subtasks (you decide the granularity but expect 3–5):
- Replace numeric counters with horizontal token-bucket strip.
- Wire drain animations on Send 1 / Send 5 / Send 12.
- Cooldown bar driven by retryAfterSeconds + refilling animation.
- Drop the allowed/rejected summary tiles.

Acceptance: spam Send-12 three times; bucket fully drains; next click shows
429 + retry countdown. Paste npm run build tail + a one-line manual smoke
note into the status file.

Push feat/rate-limiter-bucket when done.
```

---

# Branch 3 — CircuitBreaker side-by-side (Medium)

```
[paste the standard preamble, then:]

Branch: feat/circuit-breaker-comparison
Base:   portfolio-site main
Brief:  docs/DEMO_BRIEFS.md § "Branch 3" ONLY
Status: docs/status/feat-circuit-breaker-comparison.md
File owned: src/components/demo/CircuitBreakerDemo.tsx

Critical constraint: don't add a new BFF endpoint. The "no breaker"
column simulates the timeout cliff client-side by firing 6 parallel
fetches against the existing /api/demo/circuit/request with shouldFail.

If you find yourself wanting circuit/request-no-breaker on the BFF, stop
and report — that's a backend change outside this branch.

Acceptance: click Trip & hammer. Left column piles up at ~3000ms each;
right column shows breaker tripping after 2 failures and rejecting
subsequent calls instantly. Paste build output + manual smoke into status.

Push feat/circuit-breaker-comparison.
```

---

# Branch 4 — CacheStampede three lanes (Medium)

```
[paste the standard preamble, then:]

Branch: feat/cache-stampede-lanes
Base:   portfolio-site main
Brief:  docs/DEMO_BRIEFS.md § "Branch 4" ONLY
Status: docs/status/feat-cache-stampede-lanes.md
File owned: src/components/demo/CacheStampedeDemo.tsx

Replace three sequential buttons with a single Race that fires all three
protection modes in parallel via Promise.all. Three columns labelled
none / lock / probabilistic, each populates asynchronously from its own
response. Bar that scales with dbQueries shows none clearly hammering
the DB while lock and probabilistic stay flat.

Acceptance: Race fires all three; none's bar visibly dominates. Paste
build output + smoke into status.

Push feat/cache-stampede-lanes.
```

---

# Branch 5 — CacheInvalidation L1/L2/DB ripple (Medium)

```
[paste the standard preamble, then:]

Branch: feat/cache-invalidation-ripple
Base:   portfolio-site main
Brief:  docs/DEMO_BRIEFS.md § "Branch 5" ONLY
Status: docs/status/feat-cache-invalidation-ripple.md
File owned: src/components/demo/CacheInvalidationDemo.tsx

Three horizontal bars labelled L1 (in-process) / L2 (Redis) / DB
(Postgres). Read animation highlights the bar that served (from
cacheInfo.source). Update animates a wave L1 -> L2 -> DB on
invalidation. Next read post-invalidate flips source to database, then
back to L1 on subsequent reads.

Acceptance: Read / Read / Update / Read / Read sequence; each transition
visibly animates. Paste build output + smoke into status.

Push feat/cache-invalidation-ripple.
```

---

# Branch 6 — VaultRotation cred swap (Medium)

```
[paste the standard preamble, then:]

Branch: feat/vault-cred-swap
Base:   portfolio-site main
Brief:  docs/DEMO_BRIEFS.md § "Branch 6" ONLY
Status: docs/status/feat-vault-cred-swap.md
File owned: src/components/demo/VaultRotationDemo.tsx

Foreground the Force credential rotation button. Two cred cards
side-by-side: v(n) active, v(n+1) standby. On rotation: v(n) slides out,
v(n+1) takes active position, v(n+2) appears in standby. Drop the giant
central TTL countdown — TTL becomes small text on the active card. Add
a fake "App connection" badge that stays green throughout rotation.

Acceptance: rotation animates, app-connection badge stays green. Paste
build output + smoke into status.

Push feat/vault-cred-swap.
```

---

# Branch 7 — Concurrency conflict animation (Small)

```
[paste the standard preamble, then:]

Branch: feat/concurrency-conflict-anim
Base:   portfolio-site main
Brief:  docs/DEMO_BRIEFS.md § "Branch 7" ONLY
Status: docs/status/feat-concurrency-conflict-anim.md
File owned: src/components/demo/ConcurrencyDemo.tsx

On 409 conflict: shake the loser's card (framer-motion x: [-4,4,-4,4,0],
~300ms), red border flash ~800ms, snap loser's readVersion/readQuantity
to the winner's values with a highlight pulse. Winner gets a brief
green-accent pulse on the success row. No other changes.

Acceptance: Race updates triggers both saves; one wins, the other shakes
+ snaps. Paste build output + smoke into status.

Push feat/concurrency-conflict-anim.
```

---

# Branch 8 — EventFlow polish (Small)

```
[paste the standard preamble, then:]

Branch: feat/eventflow-polish
Base:   portfolio-site main
Brief:  docs/DEMO_BRIEFS.md § "Branch 8" ONLY
Status: docs/status/feat-eventflow-polish.md
File owned: src/components/demo/EventFlowDemo.tsx

Replace queuedCount numeric tile with a horizontal queue bar that fills
proportionally to depth. Threshold lines at 10 / 50 / 100. Pause/resume
is the primary action; bar visibly fills on pause, drains on resume.
Show last ~5 events as horizontal rows with stage progress
(persisted -> relayed -> consumed). Keep chaos toggle.

Acceptance: pause; trigger 10 events; bar fills. Resume; bar drains;
events advance. Paste build output + smoke into status.

Push feat/eventflow-polish.
```

---

# Branch 9 — Backend payment mock (Medium, BACKEND repo)

```
[paste the standard preamble, but adapt: this branch is in
/Users/chidionyema/Documents/code/ritualworks-platform, not portfolio-site.]

Branch: feat/checkout-payment-mock
Base:   ritualworks-platform feat/portfolio-ui-completion-gemini
Brief:  /Users/chidionyema/Documents/code/portfolio-site/docs/CHECKOUT_REDESIGN.md
        § "Backend work — PaymentSessionRequestedConsumer (demo mode)"
Status: /Users/chidionyema/Documents/code/portfolio-site/docs/status/feat-checkout-payment-mock.md
        (cross-repo — keep status in portfolio-site so the user has all
         branch statuses in one place)
File owned (the only files this branch may modify):
- src/Payments/Payments.Application/Consumers/PaymentSessionRequestedConsumer.cs (NEW)
- The Payments DI / MassTransit registration site (search
  AddConsumer<PaymentWebhookValidatedConsumer> to find it; add the
  new consumer registration there).
- src/Payments/Payments.Api/appsettings.Development.json (only to add
  Payments:DemoMode = true if not present).

Don't touch any frontend file. Don't touch any other backend service
(Catalog, Orders, Identity, BffWeb, CheckoutOrchestrator).

Pattern reference: Catalog/Catalog.Application/Consumers/StockReservationRequestedConsumer.cs
(committed in d36e239 on feat/portfolio-ui-completion-gemini). Mirror
its DI shape, publish-before-save discipline, outbox-friendly atomicity.

Acceptance:
  SAGA=$(curl -sS -X POST http://localhost:5050/api/demo/saga/start \
    -H 'Content-Type: application/json' \
    -d '{"scenarioType":"success","simulatedDelayMs":500}' | jq -r .sessionId)
  sleep 5
  curl -sS http://localhost:5050/api/demo/saga/$SAGA | jq -r .status

Pass: status returns "Completed". Then re-run with paymentFailure;
status must return "Abandoned" with failureReason matching
payment_session_failed.

Paste both literal outputs into the status file. Push feat/checkout-payment-mock.
Don't merge.
```

---

## Coordinating the merges (your job, not Gemini's)

When a branch reports complete:

1. Pull and review the status file: every checkbox ticked, build output
   pasted, acceptance pasted with real values.
2. `git checkout main` (in the relevant repo).
3. `git merge --ff-only <branch>`.
4. `git push origin main`.
5. Other in-flight branches: ask each agent (in its terminal) to
   `git pull origin main` and `git rebase main`. Fast-forward is the
   expected outcome since file ownership is non-overlapping. If a
   rebase produces conflicts, the matrix in PARALLEL_DEMO_WORK.md was
   violated — investigate manually before continuing.

The merge order doesn't matter (branches are independent). Order them
by however you want to ship — ideally smallest first to build
confidence before the big checkout one lands.

## When something goes wrong

- **An agent gets stuck thinking**: Esc, then send a one-liner telling
  it to read its status file, find the next unticked subtask, and start
  there. The status file is the recovery lifeline.
- **An agent fabricates results**: the status file demands literal
  output. If you spot a paste that looks too clean (no warnings, no
  timing variance, plausible-but-rounded numbers), re-run the command
  yourself before merging.
- **Two agents accidentally edit the same file**: the second one's
  push will fail at rebase. Cancel one of them; let the other finish;
  redo the second one fresh.
- **A branch goes stale waiting on something**: kill it, document why
  in the status file, move on. Don't accumulate half-finished branches.
