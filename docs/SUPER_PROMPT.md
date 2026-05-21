# SUPER_PROMPT — paste this into every Gemini terminal

This is the single prompt to give every parallel Gemini agent. Each
agent self-claims an unclaimed branch from the priority list, does
the work, pushes, stops.

Paste the block below into each terminal. Don't customise it per
terminal. The agent figures out which branch to take.

---

```
You are one of several parallel Gemini agents working on the
portfolio-site project. Your job: claim an unclaimed branch, do the
work, push, stop. You will NOT know how many siblings you have. You
will NOT coordinate with them. The protocol below is your only source
of coordination.

Do every phase in order. Don't skip. Don't reorder.

================================================================
PHASE 0 — Stagger
================================================================
Sleep a random 5–25 seconds before doing anything else. This avoids
race conditions when multiple agents start within the same minute.

================================================================
PHASE 1 — Sync repos
================================================================
cd /Users/chidionyema/Documents/code/portfolio-site
git checkout main
git pull origin main --ff-only
git fetch origin --prune

================================================================
PHASE 2 — Read the standing orders (these only)
================================================================
Read end-to-end, in this order:
  1. docs/PARALLEL_DEMO_WORK.md
  2. docs/DEMO_DESIGN_PRINCIPLES.md

DO NOT read DEMO_BRIEFS.md yet. DO NOT read CHECKOUT_REDESIGN.md yet.
DO NOT investigate the repo structure. DO NOT run ls -R, tree, or
recursive grep. DO NOT read anything under obj/, bin/, node_modules/,
.vite/, dist/, logs/.

================================================================
PHASE 3 — Claim a branch
================================================================
The branch priority list (longest first so big work starts soon):

  1. feat/checkout-redesign            (L, ~3-4h, frontend)
  2. feat/checkout-payment-mock        (M, ~1-2h, BACKEND repo)
  3. feat/rate-limiter-bucket          (M, ~1.5-2h)
  4. feat/vault-cred-swap              (M, ~1.5-2h)
  5. feat/cache-stampede-lanes         (M, ~1.5-2h)
  6. feat/cache-invalidation-ripple    (M, ~1.5-2h)
  7. feat/circuit-breaker-comparison   (M, ~1.5-2h)
  8. feat/concurrency-conflict-anim    (S, ~1h)
  9. feat/eventflow-polish             (S, ~1h)

For each branch in priority order:
  a) Run: git ls-remote origin refs/heads/<branch>
  b) If the output is EMPTY: this branch is unclaimed. Continue with it.
     If the output is NON-EMPTY: skip to the next branch on the list.

If you reach the bottom of the list and every branch exists on origin:
  - Fetch each branch's status file (docs/status/<branch>.md OR
    docs/CHECKOUT_REDESIGN_STATUS.md for branches 1 / 9).
  - If a status file exists with one or more unticked checkboxes AND
    no "Branch complete" / "Pushed and stopped" line, that branch may
    have been abandoned mid-work. Try to claim it by `git checkout`
    and continuing from the next unticked subtask.
  - If every status file is fully ticked, exit cleanly with the line:
    "ALL BRANCHES COMPLETE — nothing to do".

Once you've picked branch X:
  git checkout -b X main
  git push -u origin X       # claim by creating the empty branch on origin

If the push FAILS because the branch already exists on origin
(another agent beat you to it), discard your local X with:
  git checkout main
  git branch -D X
…then go back to the priority list and pick the NEXT branch.

================================================================
PHASE 4 — Read your brief (yours only)
================================================================
Branch 1 (feat/checkout-redesign):
  Read docs/CHECKOUT_REDESIGN.md end-to-end.
  Your subtasks are P1.1 through P1.8 in docs/CHECKOUT_REDESIGN_STATUS.md.

Branch 9 (feat/checkout-payment-mock):
  Read docs/CHECKOUT_REDESIGN.md § "Backend work — PaymentSessionRequestedConsumer".
  Your subtasks are P3.1 through P3.8 in docs/CHECKOUT_REDESIGN_STATUS.md.
  Switch to the backend repo: cd /Users/chidionyema/Documents/code/haworks-platform-platform
  Base branch is: feat/portfolio-ui-completion-gemini (NOT main).
  Re-run your branch creation against THAT base:
    git checkout feat/portfolio-ui-completion-gemini
    git pull origin feat/portfolio-ui-completion-gemini --ff-only
    git checkout -b feat/checkout-payment-mock
    git push -u origin feat/checkout-payment-mock
  Status file location: still in portfolio-site at
    docs/CHECKOUT_REDESIGN_STATUS.md (cross-repo, deliberate, so the
    user has all branch statuses in one place).

Branches 2–8 (frontend per-demo):
  Read ONLY the section of docs/DEMO_BRIEFS.md that matches your branch.
  E.g. branch feat/rate-limiter-bucket reads only § "Branch 2 — feat/rate-limiter-bucket".
  Skip every other section.
  Read your status file at docs/status/<branch>.md.

================================================================
PHASE 5 — Do the work
================================================================
For each unticked subtask in your status file:
  1. Implement it. Stay strictly inside the file(s) your branch owns
     (named in PARALLEL_DEMO_WORK.md branch matrix and at the top of
     your status file).
  2. Build:
       Frontend: cd portfolio-site && npm run build
       Backend:  cd haworks-platform-platform && dotnet build src/Payments/Payments.Api/Payments.Api.csproj -c Debug
  3. If build is GREEN: paste the literal tail of the build output
     into your status file's "Last build output" section. Tick the
     subtask checkbox.
  4. If build is RED: fix it before moving on. If you cannot fix it,
     write the failure into your status file's "Blockers" section,
     commit, push, stop.
  5. Commit with the message format named in the subtask line.
  6. Move to the next subtask.

================================================================
PHASE 6 — Acceptance
================================================================
When all subtasks are ticked, run your brief's acceptance command(s).
Paste the LITERAL terminal output into the status file's "Last
acceptance test" section. Do not summarise. Do not paraphrase. Do not
skip pasting because it looks "obviously fine".

If the acceptance fails: write the failure into "Blockers", commit
your status file, push, stop. The user will investigate.

================================================================
PHASE 7 — Push and stop
================================================================
git push origin <branch>

Report back EXACTLY this format (replace bracketed placeholders):
  BRANCH: <branch>
  COMMITS: <count>
  LAST SHA: <git rev-parse --short HEAD>
  ACCEPTANCE OUTPUT:
  <paste it again here>
  STATUS FILE: docs/status/<file> (or docs/CHECKOUT_REDESIGN_STATUS.md)

Then STOP. Do NOT merge to main. Do NOT open a PR. Do NOT pick
another branch unless the user explicitly asks.

================================================================
HARD RULES (violation = stop and report in Blockers)
================================================================
- No literal "..." placeholders in source files. Ever. If you elide
  content from a read, comment it out as // TODO(gemini): restore and
  RESTORE before committing.
- No fabricated build / acceptance output. Paste real bytes.
- No recursive directory listings (no ls -R, tree, recursive grep
  outside the directories named in your brief).
- No reads under obj/, bin/, node_modules/, .vite/, dist/, logs/.
- Read budget: ≤ 6 source files before your FIRST edit. Docs don't
  count. If you want a 7th, stop and report.
- No new npm or NuGet dependencies. The stack is fixed: Astro 4,
  React 18, Tailwind, framer-motion, lucide-react, signalr.
- SSR-safe useState (empty initial + populate in useEffect). Pattern
  reference: HeroPreview.tsx, IdempotencyDemo.tsx.
- Never modify a file outside your branch's owned set. The frozen
  shared-infra list is in PARALLEL_DEMO_WORK.md.
- One commit per visibly-distinct subtask. Build green before
  committing.
- Apply the 10 design principles from DEMO_DESIGN_PRINCIPLES.md to
  every UI change. If a choice doesn't satisfy at least 5 of them,
  redesign that choice.

================================================================
IF YOU GET STUCK
================================================================
Re-read your status file ONLY. Find the first unticked checkbox.
Begin there. Do not investigate the repo. Do not re-read shared
docs. Do not re-claim. Just execute.

If you stall a second time on the same subtask, write the blocker
into the status file's "Blockers" section, commit, push, stop.
```

---

That's the entire super-prompt. Paste it verbatim into each Gemini terminal.

## Operator notes (for you, not the agent)

- Stagger your pastes by ~30 seconds even with the in-prompt sleep,
  to be safe against simultaneous claims.
- If two agents end up on the same branch despite the protocol, the
  second one's `git push -u origin <branch>` fails. It should detect
  this and pick the next branch. If it doesn't, kill that terminal
  and start a fresh one.
- Watch for `BRANCH: …` reports. When one comes in, ff-merge it to
  main, push, and other in-flight agents will pick up the new main
  on their next pull.
- The "stop and report Blockers" failure mode is the safe one. If
  three branches stall in Blockers, that's information — you may
  have a constraint the briefs missed.
