# Cluster status banner — silent-failure UX fix

The site has a recurring failure mode: the visitor presses a demo
button, nothing happens, no error shown. The cluster might be down
locally, the BFF might be unreachable, the SignalR hub might be in
the middle of reconnecting — the visitor sees none of this. The
button just doesn't respond.

This is hostile to anyone except a senior engineer who'll open
DevTools. For everyone else (and for senior engineers who are time-
poor), it reads as "broken site, not coming back, close tab."

This doc specs the fix: a top-of-page status banner, per-demo
inline error fallback, and a first-paint empty state. Three small
components, ~150 LOC total, no backend changes.

## Three pieces

### 1. ClusterStatusBanner (top of every page)

A single `<ClusterStatusBanner />` injected at the top of
`src/layouts/BaseLayout.astro`. Polls `GET /api/health/snapshot`
every 5 seconds.

#### States

```
┌────────────────────────────────────────────────────────────────┐
│ Reachable + healthy → BANNER HIDDEN (not even a chip — no     │
│   need to clutter when things work; the demos themselves are   │
│   the "live" indicator)                                        │
├────────────────────────────────────────────────────────────────┤
│ Reachable + degraded (>= 1 service unhealthy in snapshot) →   │
│   AMBER banner: "Cluster degraded — some demos may not work   │
│   fully. Affected: <comma-separated service names from the    │
│   snapshot's services[].status === 'offline' entries>."       │
├────────────────────────────────────────────────────────────────┤
│ Unreachable (network error / 5xx after 3 retries) →           │
│   RED banner with setup instructions (see below).              │
└────────────────────────────────────────────────────────────────┘
```

#### Unreachable banner content (verbatim)

> **The live demos below need a running cluster.**
> This is a portfolio of working distributed systems patterns —
> the demos talk to a real .NET cluster, not a mocked frontend.
> If you want to run them yourself:
>
> ```
> git clone https://github.com/chidionyema/ritualworks-platform.git
> cd ritualworks-platform
> ./scripts/aspire-up.sh
> ```
>
> About 90 seconds to start. Or [contact me] for a recorded
> walkthrough.

The banner sets expectations BEFORE the visitor presses anything.
It's both honest about the local-cluster requirement and an
opportunity to land the candidate's value prop ("these are real
distributed systems patterns").

#### Implementation

- File: `src/components/system/ClusterStatusBanner.tsx` (~80 LOC)
- Astro client directive: `client:load` (must hydrate before any
  demo runs)
- Polls `getHealthSnapshot()` from `src/lib/api/demo-client.ts` —
  function already exists, returns `HealthSnapshot` type.
- Internal state: `'unknown' | 'healthy' | 'degraded' | 'unreachable'`.
- On first paint: state is `'unknown'`, banner hidden. After first
  poll resolves, banner shape decided. This avoids a flash of
  red on slow networks.
- Three retries with exponential backoff before declaring
  unreachable (so a momentary blip doesn't trigger the alarm).
- Uses Tailwind tokens already in the theme — `bg-error/10`
  border-error/30 text-error for red, `bg-warning/10` for amber.
- One stable height when visible (~96px desktop, ~140px mobile),
  no layout shift on state change between healthy/degraded
  (banner just hides on healthy).

### 2. ClusterErrorInline (per-demo failure UI)

When a demo's primary action fetch fails, the demo currently does
nothing visible. The fix: show an inline error message in the
result area where the success result would have appeared.

```tsx
// src/components/system/ClusterErrorInline.tsx (~30 LOC)
import { AlertTriangle } from 'lucide-react';

interface ClusterErrorInlineProps {
  message?: string;
}

export function ClusterErrorInline({ message }: ClusterErrorInlineProps) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl border border-error/30 bg-error/5">
      <AlertTriangle className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
      <div className="text-[11px] text-error/90 leading-relaxed">
        <strong className="font-black uppercase tracking-tight">Cluster unreachable.</strong>{' '}
        {message ?? 'See the banner above for setup instructions.'}
      </div>
    </div>
  );
}
```

Each demo's existing try/catch around fetch should set a local
`error: string | null` state on catch and render
`<ClusterErrorInline message={error} />` next to (or replacing)
the result area.

The pattern in each demo file:

```tsx
const [error, setError] = useState<string | null>(null);

const runAction = async () => {
  setError(null);
  try {
    const result = await executeCommand('/path');
    // … existing success handling
  } catch (e: any) {
    setError(e?.message ?? 'Cluster unreachable.');
  }
};

// In render:
{error && <ClusterErrorInline message={error} />}
{!error && /* existing result UI */}
```

### 3. First-paint empty state

When the page initially loads and the cluster snapshot returns
unreachable, every demo card should render in a "disabled-with-
explanation" state instead of a clickable-but-non-functional one.

Implementation: a context provider `ClusterStatusContext` that
exposes the current health state. Each demo consumes it. When
status is `'unreachable'`, the demo's primary button is disabled
AND a small inline note appears under the headline:

```
Cluster offline — see banner above to start the local stack.
```

This is the most important of the three pieces. It prevents the
very first interaction from being a silent failure. By the time
the visitor sees a clickable button, they know clicking will work.

## Per-demo wire-up checklist

Each of the 10 demos needs:
- [ ] Import `ClusterErrorInline`
- [ ] Add `error` local state
- [ ] Wrap each fetch with try/catch that sets `error`
- [ ] Render `<ClusterErrorInline />` when error is set
- [ ] Consume `ClusterStatusContext` (once it exists)
- [ ] Disable primary action button when status is `'unreachable'`
- [ ] Render the offline note under the headline

Effort: ~5 min per demo for the inline error wiring, ~5 min per
demo for the context wiring. ~100 min total across 10 demos, plus
~90 min for the banner + context provider + Astro layout
modification. Total ~3 hours.

## Out of scope

- Recovery UI (animated reconnect indicator, "trying to reconnect"
  micro-states). The banner shows the result; the visitor doesn't
  need fine-grained progress.
- Per-service health breakdown beyond the degraded banner's list of
  unhealthy service names. The status snapshot already provides
  this; surfacing it in detail is a future polish.
- Service worker / offline mode. Not relevant — the demos can't
  function without the cluster.

## Voice

The unreachable banner copy is the highest-leverage prose on the
site for a visitor who lands when the cluster is down. Treat it
like the homepage hero — every word matters.

The current draft above leads with "The live demos below need a
running cluster" which is honest, sets expectations, doesn't
apologise. Match the voice of `docs/CASE-STUDY.md` and the
runbooks (direct, opinionated, no marketing speak).

## Acceptance

After the fix lands:

1. **Cluster up**: page loads, banner is hidden, demos work as
   today.
2. **Cluster down before page load**: page loads with red banner;
   every demo card shows "Cluster offline" under its headline; all
   primary buttons disabled. No silent failures.
3. **Cluster goes down mid-session**: banner appears within 15
   seconds (3 retry × 5s polls); demos that fetched successfully
   stay in their last-known state but new clicks render
   `<ClusterErrorInline />`.
4. **Cluster recovers**: banner disappears within 5 seconds; demos
   re-enable.
5. **One service offline (e.g. catalog down)**: amber banner names
   it; the affected demos can be more specific in their inline
   error if they want, but minimum behaviour is the catch-all
   "Cluster unreachable" message.

If any of those don't hold, the fix isn't done.
