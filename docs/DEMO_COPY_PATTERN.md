# Demo copy pattern

The site's biggest UX gap isn't visual. It's that the visitor presses
a button and doesn't know what they're looking at. Demos solve real
distributed-systems problems, but the visitor never gets told what the
problem IS.

This doc defines the 5-element copy pattern that applies to every demo
on the site. The companion doc `DEMO_COPY_TEMPLATES.md` has the actual
written copy for all 10 demos. The companion doc
`DEMO_COPY_STATUS.md` is the resume / checkpoint file for the agent
applying the copy.

## Why the current copy fails

`IdempotencyDemo` is the only demo on the site that lands at hiring
quality. It works because:

1. The headline is a **question the visitor has felt**: "what if I
   double-click Pay?"
2. The setup tells them **what to press and what to watch for**.
3. The replay's outcome is **verifiable without explanation** —
   same `orderId` comes back, the visitor reads two strings.
4. The fix is the **visible thing** — the idempotency key is
   rendered as a copy-to-clipboard token.

Every other demo misses at least three of those four. Cache
invalidation has L1/L2/DB bars without explaining what L1 even is.
Vault rotation animates a credential card without saying what
problem credential rotation solves. Circuit breaker shows a state
pill without framing why the visitor should care.

The fix isn't visual — the visuals are competent. The fix is the
copy.

## The 5-element pattern

Every demo gets:

### 1. Headline question

A sentence in plain English, in the form of a question the visitor
has either felt themselves or can immediately imagine feeling. NOT
engineering vocabulary as the primary affordance.

Good:
> "What happens to the customer's order if Stripe crashes
> mid-payment?"

Bad:
> "Saga compensation under broker partition"

The headline replaces the current `<h3>` at the top of every demo
card.

### 2. Setup line

One sentence under the headline, telling the visitor exactly what
to do and what to watch.

Good:
> "Press **Pay**. Then press **Crash payment service** before the
> third stage lights up. Watch the customer view on the left."

Bad:
> "Demo of the saga choreography pattern showing compensation."

Setup lines should use **bold** for the buttons the visitor will
press. They should name the location to watch ("on the left", "in
the timeline below", etc).

### 3. In-flight labels

Short phrases (≤ 8 words each) timed to existing animation states.
When the demo's existing visual changes, a label appears next to it
— ideally with a tooltip explaining the technical term. Labels
should let the visitor follow what's happening WITHOUT needing prior
distributed-systems knowledge.

Pattern: `<short label>` with optional tooltip `<expanded definition>`.

Good:
- *"Stock reserved on `catalog-svc-7a3f`."*
  *(tooltip: "The catalog service replica that handled this. There
  are two — Aspire load-balances across them.")*
- *"Outbox row written, waiting for broker."*
  *(tooltip: "An outbox row is a queued event sitting in the same
  database as your business state. It survives broker outages.")*

Bad:
- *"State transition fired"* (no concrete what / why)
- *"OnSagaStep event published"* (raw protocol vocab)

Labels appear briefly (2–3 seconds) and fade. They are scaffolding
for first-time understanding; experienced visitors can skim past
them.

### 4. Outcome banner

One or two sentences that appear when the demo reaches a terminal
state. Format:

> ✓ <one sentence: what just happened>. **Without this pattern**,
> <one sentence: what would have happened>. <Optional: where this
> bites in production>.

The "without this pattern" half is the most important — that's where
the visitor learns the consequence the demo prevents.

Good:
> ✓ The customer's order rolled back, the stock was returned, and
> the customer wasn't double-charged. **Without this pattern**, your
> order is in `Paid` state in your DB but Stripe never confirmed —
> you find out from a refund ticket the next morning.

Bad:
> ✓ Saga reached `Abandoned` state. Compensation event published.

### 5. Pattern line

One short line in monospace below the outcome, naming the pattern
and linking to the code:

```
Pattern: <name>. Code: <relative path to the .cs file>.
<Optional: 1 sentence on what was hard about it.>
```

Good:
> Pattern: transactional outbox + saga compensation. Code:
> `src/CheckoutOrchestrator/Application/Sagas/CheckoutSaga.cs`.
> The hard part wasn't the saga; it was making the compensation
> event survive a broker outage.

The pattern line is for the technical reviewer who skipped the
narrative — it gives them a single click to validate the claim.

## Hard rules — do not violate

- **Headline is a question.** Period. If you can't make a question
  work, the demo doesn't have a clear story and shouldn't ship.
- **No engineering vocab in the headline.** "Idempotency" / "saga" /
  "outbox" / "L1 cache" can appear in setup/labels/pattern, but
  never as the first thing the visitor reads.
- **Outcome MUST include "without this pattern".** Otherwise the
  visitor doesn't learn the consequence.
- **Labels with technical terms MUST have tooltips.** No naked jargon.
- **Pattern line MUST link to a real file.** No `#` placeholder
  links. If the file doesn't exist, the demo is making a claim it
  can't prove.

## Voice

Direct, opinionated, owns trade-offs. Match the voice of
`docs/CASE-STUDY.md` and the runbooks in `ritualworks-platform/docs/
runbooks/`. First-person where it lands ("I shipped this bug once.
That's why this demo exists.") but used sparingly so it has weight.

No marketing copy. No emoji except the single ✓ in outcome banners.
No "delighted", "powered by", "built with love".

## Out of scope

- The homepage hero. (See `SHOW_AND_TELL_DRAFT.md` for that —
  different artefact, larger format.)
- The about/CV section.
- Sidebar navigation copy.

This is the demo-card-level copy pass. The other surfaces follow
their own templates.
