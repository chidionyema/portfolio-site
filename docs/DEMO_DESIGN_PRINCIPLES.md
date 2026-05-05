# Demo design principles

Every parallel branch must apply these. They are the difference between
"this demo functions" and "this demo lands".

If a design choice in your branch doesn't satisfy at least 5 of the 10
principles below, it's wrong — go back and rethink. Apply the
principles in the order listed; the earlier ones outrank the later ones.

## 1. First-paint clarity (≤2 seconds)

When the demo first renders, the viewer must know what to click within
two seconds. That means:
- ONE visually dominant primary action (button, control). Larger,
  brighter, or higher-contrast than everything else on the demo card.
- A default scenario / mode selected. Never make the viewer pick before
  they can act.
- A one-sentence "why this matters" line above the action. Not jargon
  — plain English. ("Stops abusive clients without blocking legitimate
  ones." Not "Sliding-window rate limiter with token bucket.")

## 2. Cause and effect in <100ms

Click → something visible happens. Network latency lives behind a
loading state, but the *click itself* must produce immediate feedback
(scale-down, ripple, colour flash). Never let the viewer wonder if
the click registered.

## 3. Show failure as clearly as success

Compensation flows, circuit-breaker open states, bucket exhaustion,
saga abandon — these are the moments that prove the system is real.
Treat them as first-class UX, not error states tucked into a corner.
Failure animations should be at least as expressive as success ones.

## 4. Big state changes, big visuals

Counters that change drive the eye. Render them at `text-3xl
font-black tabular-nums` minimum. State transitions use motion:
fade-in for new rows, scale + opacity for token drains, slide for
saga step transitions. Don't rely on subtle colour shifts the viewer
might miss.

## 5. One headline action per demo

The demo can have N controls, but ONE of them is the headline (the
one a press release would mention). Other controls are secondary —
visually quieter, smaller, off to the side. If two controls compete
for primacy, the demo is unclear about its own thesis.

Examples (from the briefs):
- RateLimiter: "Send 12" is the headline (drains the bucket
  visibly). "Send 1" / "Send 5" are progressive disclosure.
- Cache stampede: "Race" is the headline (fires all three modes).
- Vault: "Force credential rotation" is the headline.
- Circuit breaker: "Trip & hammer" is the headline (proves the
  contrast).

## 6. Customer vocabulary on top, engineering vocabulary below

When showing both:
- Customer label: regular text weight, primary colour, the visible
  element.
- Engineering label: `font-mono`, smaller, dimmer, secondary line.

Don't make the viewer translate engineering jargon to know what's
happening. Show the translation, with the engineering term as the
proof.

## 7. No fake metadata

Every hardcoded fake correlation ID, buffer hash, "Connected" badge
that isn't actually checking the connection, fake instance count, or
fake percentage poisons the credibility of the real things on the
page. If you can't show a real value, don't show one.

(Specific cuts: see `CHECKOUT_REDESIGN.md` § "Cut list" for examples.
The same principle applies across all branches.)

## 8. Receipts on every action

Every primary action in every demo gets a `RequestReceipt` strip
underneath: `[service · Nms · status] [trace ABC123 →]`. The
infrastructure is already in place (`useDemoSession.executeCommand`
returns the metadata; `RequestReceipt` and `RequestReceiptHistory`
components exist). Wire them in if your demo doesn't already have
them.

## 9. Empty / pending states matter

A blank panel with no affordance signals "this is broken". Always
render either:
- A clear pending message ("Click the button to start").
- A skeleton state if you're loading.
- The default success state if you have one.

Never an empty `<div>`.

## 10. One viewport per demo

The demo's primary content fits on a typical desktop viewport
(1280×720 or 1440×900) without internal scrolling. The viewer scrolls
demo-to-demo on the page, not inside a demo. If a demo's content
overflows, prioritise the headline action and the live state; collapse
the audit log under a hover-disclosure or footer.

---

## Anti-patterns to avoid (every branch)

- **Don't add chart libraries.** D3, recharts, chart.js, Three.js — none
  are in the stack and none are needed. Token buckets and ladders are
  divs and CSS transforms.
- **Don't add sound or haptics.** Senior eng audience reads marketing
  theatre as a negative signal. Motion serves information, not delight.
- **Don't redo typography or palette.** They're fine. The problem is
  what each demo *shows*, not how it looks.
- **Don't pixel-perfect mobile.** This is a senior-contractor portfolio
  reviewed on desktop. Don't break mobile, but don't optimise for it
  beyond "doesn't crash".
- **Don't chase Lighthouse 100.** Past 90 is vanity. The hydration
  fixes already addressed the real perf hits.
- **Don't introduce A/B variants, animations on hover that obscure
  click targets, parallax, or scroll-triggered surprises.** Engaging ≠
  flashy. Engaging = the viewer feels they understand the system.
