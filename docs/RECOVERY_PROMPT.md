# RECOVERY_PROMPT — pick up a stuck branch from a prior Gemini session

Use this when a previous Gemini session stalled, was killed, or
returned without a clean `BRANCH: … LAST SHA: …` report. A fresh
agent reads the branch's state from origin + the status file and
resumes from the right place.

Before pasting, replace `<BRANCH>` on the first line with the branch
the previous agent was working on. If you don't know the branch:
- For frontend branches (1–8) it's `feat/<demo>-<thing>`. List in
  `docs/PARALLEL_DEMO_WORK.md` matrix.
- For backend (#9) it's `feat/checkout-payment-mock` in the
  `ritualworks-platform` repo.

If you don't know which one stalled, run this in your spectator
terminal first to find candidates:

```bash
cd /Users/chidionyema/Documents/code/portfolio-site
git fetch origin --prune
git for-each-ref --sort=-committerdate \
  --format='%(committerdate:short) %(refname:short)' \
  refs/remotes/origin/feat/ | head -20
```

Then pass the branch with the most recent activity to the recovery
prompt below.

---

```
RECOVERY MODE — a previous Gemini session was working on a branch
and either stalled, was killed, or returned without confirmation.
Your job: re-establish state, decide where to resume, finish or
escalate.

The branch you are recovering is:

  <BRANCH>

(If <BRANCH> is literally the word "<BRANCH>", stop immediately and
ask the operator which branch to recover.)

Do every phase in order. Don't skip. Don't reorder.

================================================================
PHASE 0 — Identify the working repo
================================================================
Frontend branches (anything except feat/checkout-payment-mock):
  cd /Users/chidionyema/Documents/code/portfolio-site

Backend branch (feat/checkout-payment-mock):
  cd /Users/chidionyema/Documents/code/ritualworks-platform

================================================================
PHASE 1 — Sync the branch
================================================================
git fetch origin --prune
git checkout main          # frontend
   # OR
git checkout feat/portfolio-ui-completion-gemini   # backend (#9 only)
git pull --ff-only

# Now switch to the recovery target.
git checkout <BRANCH> 2>/dev/null || git checkout -b <BRANCH> origin/<BRANCH>

# If git says the branch doesn't exist on origin either:
#   The previous agent never claimed it (or claimed and force-deleted).
#   Stop. Tell the operator: "Branch <BRANCH> has no origin trace; restart fresh
#   with the SUPER_PROMPT instead."

git pull --ff-only origin <BRANCH>

================================================================
PHASE 2 — Read the standing orders (same as the super-prompt)
================================================================
Read end-to-end, in this order:
  1. docs/PARALLEL_DEMO_WORK.md
  2. docs/DEMO_DESIGN_PRINCIPLES.md

(For backend branch, these docs live in /Users/chidionyema/Documents/code/portfolio-site/docs/.
You read them from there but work in ritualworks-platform.)

DO NOT read DEMO_BRIEFS.md yet. DO NOT investigate the repo. No
recursive listings, no obj/ bin/ node_modules/ reads.

================================================================
PHASE 3 — Inspect prior session's state
================================================================
Capture all of this verbatim before deciding what to do:

a) git log on the branch:
     git log --oneline main..HEAD     # frontend
       OR for backend:
     git log --oneline feat/portfolio-ui-completion-gemini..HEAD

b) Working-tree status:
     git status --short

c) Stashes (a prior agent may have stashed):
     git stash list

d) The status file:
     - Branches 1, 9: docs/CHECKOUT_REDESIGN_STATUS.md
     - Branches 2–8: docs/status/<branch>.md   (e.g. docs/status/feat-rate-limiter-bucket.md)

   Note the FIRST unticked checkbox (or confirm all are ticked).
   Note any text in the "Blockers" section.
   Note whether "Last build output" and "Last acceptance test" are
   populated (literal output) or empty.

================================================================
PHASE 4 — Decide where to resume
================================================================
Pick exactly ONE of these cases. State your choice out loud
("Resuming case <N>: ...") before acting.

CASE A — Branch is complete and acceptance is pasted, but the prior
agent never pushed or never reported:
  Symptoms: every checkbox ticked; "Last acceptance test" has real
  output; git log shows the verification commit.
  Action: git push origin <BRANCH>; emit the standard report
  (BRANCH/COMMITS/LAST SHA/ACCEPTANCE/STATUS FILE); STOP.

CASE B — Branch is complete except acceptance:
  Symptoms: every checkbox ticked but "Last acceptance test" is empty
  (or contains placeholder text).
  Action: run the brief's acceptance command(s). Paste LITERAL output
  into the status file. Final commit chore(<scope>): verification.
  Push. Report. STOP.

CASE C — Subtasks remaining, no Blocker, working tree clean:
  Symptoms: at least one unticked checkbox; Blockers section is "—" or empty.
  Action: read your brief (only your branch's section in DEMO_BRIEFS.md
  for branches 2–8; CHECKOUT_REDESIGN.md for branches 1, 9). Resume
  from the FIRST unticked checkbox per the super-prompt's PHASE 5
  protocol.

CASE D — Working tree dirty (uncommitted changes):
  Symptoms: git status shows modified or untracked files.
  Action:
    1) git diff > /tmp/recovery-<BRANCH>.diff (just so it's saved).
    2) Decide: do these changes correspond to the next unticked subtask?
       - If YES (they look like in-progress implementation): finish them,
         build green, paste output, tick the checkbox, commit. Then
         continue with the NEXT unticked subtask.
       - If NO (or you can't tell): git stash push -m "recovery <BRANCH> $(date -Iseconds)"
         and proceed with the next unticked subtask. Do NOT discard.
         The stash gives the operator a chance to recover lost work.

CASE E — Blocker text present:
  Symptoms: the "Blockers" section contains a real description (not "—").
  Action:
    Read the blocker carefully. Two outcomes:
    - The blocker is resolvable WITHIN the rules (e.g. "couldn't find
      the file X" — and you can find it; or "build error in Y" — and
      you can fix it). Resolve it, write a one-line resolution note
      below the original blocker text ("Resolved YYYY-MM-DD HH:MM by:
      <one line>"), and resume from the next unticked subtask.
    - The blocker requires a rule violation, a new dependency, a file
      outside the branch's owned set, a backend change for a frontend
      branch, etc. DO NOT improvise around it. Append a one-line
      "Cannot recover — operator action needed because: <reason>" to
      the Blockers section, commit the status file, push, STOP.
      Report back with: "RECOVERY HALTED — see Blockers in <status file>".

CASE F — Branch is ahead of main but the status file is missing
or empty:
  Symptoms: git log shows commits but the status file doesn't exist
  or has no checklists.
  Action: this is unusual. Stop. Ask operator: "Branch <BRANCH> has
  commits but no status file at <expected path>. Should I create one
  by inferring subtasks from the brief, or escalate?"

================================================================
PHASE 5 — Execute (same as super-prompt PHASE 5)
================================================================
For each remaining unticked subtask:
  1. Implement (only files your branch owns).
  2. Build (npm run build / dotnet build).
  3. Green: paste literal tail into status. Tick. Commit.
     Red: fix or write Blockers + push + stop.
  4. Move on.

================================================================
PHASE 6 — Acceptance (same)
================================================================
Brief's acceptance command. Literal output. Pasted. Committed.

================================================================
PHASE 7 — Push and report
================================================================
git push origin <BRANCH>

Report:
  RECOVERED BRANCH: <BRANCH>
  RESUMED FROM CASE: <A/B/C/D/E/F>
  ADDITIONAL COMMITS THIS SESSION: <count>
  LAST SHA: <short>
  ACCEPTANCE OUTPUT:
  <paste>
  STATUS FILE: <path>

Then STOP.

================================================================
HARD RULES (same as super-prompt — short version here)
================================================================
- No "..." placeholders. Ever.
- No fabricated output. Real bytes.
- No recursive listings; no reads under obj/, bin/, node_modules/, .vite/,
  dist/, logs/.
- Read budget: ≤ 6 source files before first edit (docs don't count).
- No new dependencies.
- SSR-safe useState.
- Stay inside this branch's owned files. Frozen list is in PARALLEL_DEMO_WORK.md.
- Apply the 10 principles in DEMO_DESIGN_PRINCIPLES.md.

================================================================
IF YOU GET STUCK DURING RECOVERY
================================================================
Re-read the status file. Find the first unticked checkbox or the
case-specific action item. Begin there.

If you stall on the SAME subtask the previous agent stalled on,
that's a stronger signal something's wrong. Append to Blockers:
"Two sessions stalled at <subtask>: <what you tried>." Commit,
push, stop. The operator will investigate.
```

---

## Operator usage notes

- The recovery prompt is idempotent at PHASE 1. Running it twice
  on a branch that's already pushed and clean is safe — the second
  run hits CASE A and just re-emits the report.
- Cases D (dirty tree) and E (blocker) are the most likely real
  cases when an agent has stalled. The protocol forces the recovering
  agent to be explicit about which case applies before acting, which
  prevents confusing "improvise around the blocker" failures.
- If a recovery agent reports `RECOVERY HALTED`, read the Blockers
  section yourself. Often the right move is to relax a constraint
  (allow a small file outside the owned set; allow a one-line dep
  change) and either retry recovery or take over manually.
- If two recovery attempts on the same branch both halt with
  similar Blocker text, the brief itself is wrong — escalate up the
  stack and revise the brief before sending another agent.
