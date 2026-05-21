import { useEffect, useRef, useState } from 'react';
import { useClusterState } from '../../hooks/useClusterState';

/**
 * ChaosTimelineStrip — the page's spine.
 *
 * Sits at the top of /lab's WATCH zone. Renders the chaos lifecycle
 * as four named phases with timestamps, so every panel below shares
 * one time signature. The whole page becomes readable in two seconds:
 *
 *   STEADY → INJECT → DEGRADED → RECOVERING → STEADY
 *      47s     0.3s     22.1s         4.2s         ●
 *
 * Phase transitions, sourced from real signals (no inferred states):
 *   STEADY     — no chaos target paused. (chaos store has no paused entries)
 *   INJECT     — first OnChaosState push with a paused target arrives
 *   DEGRADED   — first /api/* event lands with status >= 500 attributable
 *                to the paused target since INJECT
 *   RECOVERING — OnChaosState flips that target back to running
 *   STEADY     — first 2xx /api/* event lands on a previously-affected
 *                path within RECOVERY_GRACE_MS of resume
 *
 * No prose. The phases are named with single English words because each
 * is a state, not a sentence. A pill at the right shows whether human
 * intervention occurred (currently always 'auto' since the chaos manager
 * auto-resumes — but the pill is the place that fact lives).
 */

const RECOVERY_GRACE_MS = 8_000;

type Phase = 'steady' | 'inject' | 'degraded' | 'recovering';

interface PhaseEntry {
  phase: Phase;
  enteredAtMs: number;
}

// Path prefixes that depend on a given chaos target. Used to attribute
// post-INJECT 5xx events to a real chaos cause for the INJECT → DEGRADED
// transition. Same map LabRequestFeed uses; intentionally local so this
// component owns its own coupling to chaos targets.
const PATH_DEPS: Array<{ prefix: string; targets: string[] }> = [
  { prefix: '/api/demo/idempotency', targets: ['orders', 'postgres'] },
  { prefix: '/api/demo/cache/product', targets: ['catalog', 'postgres'] },
  { prefix: '/api/demo/cache/stampede', targets: ['catalog', 'redis'] },
  { prefix: '/api/demo/inventory', targets: ['catalog', 'postgres'] },
  { prefix: '/api/demo/circuit', targets: ['catalog'] },
  { prefix: '/api/demo/vault', targets: ['identity', 'vault'] },
  { prefix: '/api/demo/events', targets: ['payments', 'rabbitmq'] },
  { prefix: '/api/demo/saga', targets: ['checkout', 'catalog', 'payments', 'rabbitmq'] },
];

function depsForPath(path?: string): string[] | null {
  if (!path) return null;
  const m = PATH_DEPS.find((p) => path.startsWith(p.prefix));
  return m ? m.targets : null;
}

export function ChaosTimelineStrip() {
  const { chaos, events } = useClusterState();
  const [, setTick] = useState(0);

  // Phase history — each transition appends here. We keep the trailing
  // few entries so we can show the previous phase's elapsed time too.
  const historyRef = useRef<PhaseEntry[]>([
    { phase: 'steady', enteredAtMs: Date.now() },
  ]);

  const prevAnyPausedRef = useRef(false);
  const eventOffsetRef = useRef(0);
  const lastResumeMsRef = useRef<number | null>(null);
  const affectedTargetsRef = useRef<Set<string>>(new Set());

  // 250ms tick so elapsed time stays readable but cheap.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 250);
    return () => clearInterval(id);
  }, []);

  // Track chaos transitions: any-paused vs none-paused, and capture the
  // set of targets that were paused so we can attribute later events.
  useEffect(() => {
    const pausedNames = Object.entries(chaos)
      .filter(([, v]) => v.status === 'paused')
      .map(([k]) => k);
    const anyPaused = pausedNames.length > 0;
    const wasAnyPaused = prevAnyPausedRef.current;
    const now = Date.now();

    if (!wasAnyPaused && anyPaused) {
      // STEADY → INJECT
      historyRef.current.push({ phase: 'inject', enteredAtMs: now });
      affectedTargetsRef.current = new Set(pausedNames);
      lastResumeMsRef.current = null;
    } else if (wasAnyPaused && anyPaused) {
      // Still paused; remember new targets if any.
      for (const t of pausedNames) affectedTargetsRef.current.add(t);
    } else if (wasAnyPaused && !anyPaused) {
      // Some-paused → none-paused: enter RECOVERING.
      const last = historyRef.current[historyRef.current.length - 1];
      if (last?.phase !== 'recovering') {
        historyRef.current.push({ phase: 'recovering', enteredAtMs: now });
        lastResumeMsRef.current = now;
      }
    }
    prevAnyPausedRef.current = anyPaused;
  }, [chaos]);

  // Walk new events. Use them to drive INJECT → DEGRADED (a 5xx attributable
  // to a paused target lands) and RECOVERING → STEADY (a 2xx on a previously-
  // affected path lands within the grace window after resume).
  useEffect(() => {
    if (events.length === 0) return;
    const fresh = events.slice(0, events.length - eventOffsetRef.current);
    eventOffsetRef.current = events.length;

    for (let i = fresh.length - 1; i >= 0; i--) {
      const ev = fresh[i];
      const last = historyRef.current[historyRef.current.length - 1];
      if (!last) continue;

      const deps = depsForPath(ev.path);
      const isFailure = ev.status >= 500 || ev.status === 0;
      const isSuccess = ev.status >= 200 && ev.status < 400;

      // INJECT → DEGRADED on first attributable failure
      if (last.phase === 'inject' && isFailure && deps) {
        const stillPaused = Object.values(chaos).some((c) => c.status === 'paused');
        const matchesPaused = stillPaused && deps.some((d) => chaos[d]?.status === 'paused');
        if (matchesPaused) {
          historyRef.current.push({ phase: 'degraded', enteredAtMs: Date.now() });
        }
      }

      // RECOVERING → STEADY on first success on a previously-affected path
      if (
        last.phase === 'recovering' &&
        lastResumeMsRef.current &&
        isSuccess &&
        deps
      ) {
        const recentlyAffected = deps.some((d) =>
          affectedTargetsRef.current.has(d),
        );
        const withinGrace =
          Date.now() - lastResumeMsRef.current <= RECOVERY_GRACE_MS;
        if (recentlyAffected && withinGrace) {
          historyRef.current.push({ phase: 'steady', enteredAtMs: Date.now() });
          affectedTargetsRef.current = new Set();
        }
      }
    }

    // Safety net: if we've been recovering longer than grace, transition to
    // steady anyway so the timeline doesn't get stuck.
    const last = historyRef.current[historyRef.current.length - 1];
    if (
      last?.phase === 'recovering' &&
      lastResumeMsRef.current &&
      Date.now() - lastResumeMsRef.current > RECOVERY_GRACE_MS + 4_000
    ) {
      historyRef.current.push({ phase: 'steady', enteredAtMs: Date.now() });
      affectedTargetsRef.current = new Set();
    }
  }, [events, chaos]);

  const now = Date.now();
  const last = historyRef.current[historyRef.current.length - 1];
  const currentPhase: Phase = last?.phase ?? 'steady';
  const currentElapsedMs = last ? now - last.enteredAtMs : 0;

  const anyPaused = Object.values(chaos).some((c) => c.status === 'paused');
  const pausedTarget = Object.entries(chaos).find(
    ([, v]) => v.status === 'paused',
  )?.[0];
  const remainingSec = (pausedTarget && typeof chaos[pausedTarget]?.remainingSeconds === 'number') 
    ? chaos[pausedTarget].remainingSeconds as number 
    : null;

  return (
    <div className="rounded-md border border-white/[0.06] bg-black/40 px-4 py-3 font-mono">
      <div className="flex items-center justify-between gap-4 mb-2">
        <div className="text-[10px] uppercase tracking-[0.22em] text-muted/70">
          Lifecycle · pause anything below to drive it
        </div>
        <HumanInputPill anyPaused={anyPaused} remainingSec={remainingSec} />
      </div>
      <div className="grid grid-cols-4 gap-1">
        <PhaseSegment
          label="steady"
          active={currentPhase === 'steady'}
          tone="ok"
          elapsedMs={currentPhase === 'steady' ? currentElapsedMs : null}
        />
        <PhaseSegment
          label="inject"
          active={currentPhase === 'inject'}
          tone="warn"
          elapsedMs={currentPhase === 'inject' ? currentElapsedMs : null}
        />
        <PhaseSegment
          label="degraded"
          active={currentPhase === 'degraded'}
          tone="err"
          elapsedMs={currentPhase === 'degraded' ? currentElapsedMs : null}
        />
        <PhaseSegment
          label="recovering"
          active={currentPhase === 'recovering'}
          tone="warn"
          elapsedMs={currentPhase === 'recovering' ? currentElapsedMs : null}
        />
      </div>
    </div>
  );
}

function PhaseSegment({
  label,
  active,
  tone,
  elapsedMs,
}: {
  label: string;
  active: boolean;
  tone: 'ok' | 'warn' | 'err';
  elapsedMs: number | null;
}) {
  // Inactive phase pills: full state colour (no opacity reduction) so we
  // clear WCAG AA on the dark surface. The inactive border alone signals
  // "not the active phase."
  const baseColour =
    tone === 'ok'
      ? 'text-success border-success/40'
      : tone === 'warn'
        ? 'text-warning border-warning/40'
        : 'text-error border-error/40';
  // Higher bg opacity (was 0.12) + the text color stays the same, but on
  // a more opaque colored background the relative contrast is cleaner.
  // Cleaner still: punch the text to near-white on the active pill so the
  // foreground/background contrast is unambiguous.
  const activeColour =
    tone === 'ok'
      ? 'bg-success/30 text-primary'
      : tone === 'warn'
        ? 'bg-warning/30 text-primary'
        : 'bg-error/30 text-primary';
  const className = `relative rounded border ${active ? activeColour + ' border-current shadow-[0_0_0_1px_currentColor_inset]' : baseColour + ' bg-transparent'} px-3 py-2 transition-colors`;
  return (
    <div className={className}>
      <div className="text-[10.5px] uppercase tracking-[0.18em] font-bold">
        {label}
      </div>
      <div className="text-[10px] tabular-nums text-secondary mt-0.5 h-4">
        {active ? formatElapsed(elapsedMs ?? 0) : ''}
      </div>
      {active && (
        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-current animate-pulse" />
      )}
    </div>
  );
}

function HumanInputPill({
  anyPaused,
  remainingSec,
}: {
  anyPaused: boolean;
  remainingSec: number | null;
}) {
  if (!anyPaused) {
    return (
      <span className="text-[10px] uppercase tracking-widest text-secondary">
        no human input · cluster steady
      </span>
    );
  }
  return (
    <span className="text-[10px] uppercase tracking-widest text-warning/90">
      no human input · auto-resume in {remainingSec ?? '—'}s
    </span>
  );
}

function formatElapsed(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${m}m${s.toString().padStart(2, '0')}s`;
}
