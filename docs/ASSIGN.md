# Branch assignment cheat sheet

Use this to decide which branch goes in which terminal. Drop the
matching prompt block from `docs/RUN_PARALLEL.md` into each terminal.

## Sizing

| Effort | Branch # | Branch | Time |
|---|---|---|---|
| L | 1 | `feat/checkout-redesign` | 3–4 h |
| M | 2 | `feat/rate-limiter-bucket` | 1.5–2 h |
| M | 3 | `feat/circuit-breaker-comparison` | 1.5–2 h |
| M | 4 | `feat/cache-stampede-lanes` | 1.5–2 h |
| M | 5 | `feat/cache-invalidation-ripple` | 1.5–2 h |
| M | 6 | `feat/vault-cred-swap` | 1.5–2 h |
| M | 9 | `feat/checkout-payment-mock` *(backend)* | 1–2 h |
| S | 7 | `feat/concurrency-conflict-anim` | ~1 h |
| S | 8 | `feat/eventflow-polish` | ~1 h |

## Recommended fan-outs

### 4 terminals (best balance, ~3.5 h wall-clock)

| Terminal | Branch | Why this slot |
|---|---|---|
| T1 | 1 (checkout) | The big one — deserves a dedicated terminal |
| T2 | 9 (backend payment mock) | Different repo, no frontend conflict |
| T3 | 2 (rate limiter), then 7 (concurrency) | Medium first, small after — terminal stays busy |
| T4 | 6 (vault), then 8 (eventflow) | Same logic |

If T3 / T4 finish their first task, drop the prompt for the second
into the same terminal (they'll see `git status` clean on a new branch
and proceed).

### 6 terminals (faster but more merging, ~2.5 h wall-clock)

| Terminal | Branch |
|---|---|
| T1 | 1 (checkout, biggest) |
| T2 | 9 (backend) |
| T3 | 2 (rate limiter) |
| T4 | 6 (vault) |
| T5 | 4 (cache stampede) |
| T6 | 7 (concurrency, smallest) — finishes first, then takes 8 (eventflow) |

Skipping branches 3 (circuit) and 5 (cache invalidation) in this batch;
run them in a second wave after the first wave ships.

### 9 terminals (max parallel, fastest if you can monitor them)

One terminal per branch. Wall-clock ≈ the longest single branch (~4 h
for branch 1). Heavy merge coordination — rebase each in-flight branch
after every merge to `main`.

## Per-branch starter check

Before dropping the prompt into a terminal, verify the branch's status
file exists. All seven non-checkout branches have pre-populated status
files at `docs/status/feat-<branch-suffix>.md`. Branches 1 and 9 use
`docs/CHECKOUT_REDESIGN_STATUS.md` (P1.* and P3.* phases respectively).

If a status file is missing, the prompt tells the agent to create one.
The agent should populate it with subtasks based on the brief — but
pre-existing files save it from inventing structure (and from getting
stuck).

## Watching for stuck agents

Symptoms of stuck Gemini:
- Spinning "Thinking…" for >2 min with no tool call.
- Reading the same file repeatedly.
- Doing `ls -R` or recursive `find` (it shouldn't — your prompt
  forbids this).
- Pasting suspiciously round / clean validation output.

Recovery: Esc, then send:
> Read `docs/status/<branch>.md`. Find the next unticked subtask.
> Begin there. Do not re-read other docs. Do not investigate the
> repo structure. Just execute the subtask.

If it stalls a second time, kill the session, restart, paste the same
recovery one-liner. The status file is the lifeline.
