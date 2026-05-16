import { useEffect, useRef, useState } from 'react';
import { Play, Hand } from 'lucide-react';
import { useClusterState } from '../../hooks/useClusterState';

/**
 * ChaosDrillController — the mode toggle + drill loop driver.
 *
 * Two modes:
 *   • Drill — auto-runs a 60-second chaos cycle on a rotating target
 *     (catalog → postgres → rabbitmq → payments → repeat). The visitor
 *     watches; nothing to click. Auto-pauses 30s, auto-resumes, waits
 *     ~25s steady, repeats.
 *   • Drive — disables the auto-loop. Visitor clicks topology nodes
 *     to fault-inject manually.
 *
 * Backed entirely by the existing /api/demo/chaos/{target}/pause and
 * /resume endpoints — no new BFF route needed. Pause requests are
 * fire-and-forget; the controller doesn't track responses, just tracks
 * its own clock-driven state machine.
 */

const DRILL_TARGETS = ['catalog', 'postgres', 'rabbitmq', 'payments'];
const PAUSE_DURATION_S = 30;
const COOL_DOWN_MS = 25_000;
const PAUSE_PHASE_MS = PAUSE_DURATION_S * 1000;

const API_URL = (
  import.meta.env.PUBLIC_API_URL ?? ''
).replace(/\/$/, '');

type Mode = 'drill' | 'drive';

export function ChaosDrillController() {
  const [mode, setMode] = useState<Mode>('drill');
  const { chaos } = useClusterState();
  const cycleIndexRef = useRef(0);
  const inflightRef = useRef(false);

  // Drill loop. Restarts whenever mode flips back to 'drill'.
  useEffect(() => {
    if (mode !== 'drill') return;
    let stopped = false;

    const fireOne = async () => {
      if (stopped || inflightRef.current) return;
      inflightRef.current = true;
      const target = DRILL_TARGETS[cycleIndexRef.current % DRILL_TARGETS.length];
      cycleIndexRef.current++;
      try {
        await fetch(`${API_URL}/api/demo/chaos/${target}/pause`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ durationSeconds: PAUSE_DURATION_S }),
        });
      } catch {
        // network blip — try the next cycle
      }
    };

    const cooldown = () => {
      if (stopped) return;
      inflightRef.current = false;
    };

    // First pause after a short ramp-up so the page has settled.
    const rampMs = 5_000;
    const initialPauseTimer = window.setTimeout(fireOne, rampMs);

    // After each pause completes, cool down and re-fire.
    const cycleTotalMs = PAUSE_PHASE_MS + COOL_DOWN_MS;
    const cooldownTimer = window.setInterval(() => {
      cooldown();
      fireOne();
    }, cycleTotalMs);

    return () => {
      stopped = true;
      clearTimeout(initialPauseTimer);
      clearInterval(cooldownTimer);
    };
  }, [mode]);

  // When toggling to drive mode while something is paused, leave it paused
  // (visitor wanted to inspect). When toggling to drill mode while paused,
  // also leave alone — the drill loop will pick up after current pause
  // ends naturally.
  const anyPaused = Object.values(chaos).some((c) => c.status === 'paused');

  return (
    <div className="rounded-md border border-white/[0.08] bg-black/40 p-3 md:p-4 flex items-center justify-between gap-4 font-mono">
      <div className="flex items-center gap-3">
        <ModeButton
          icon={Play}
          label="Drill"
          sub="auto-runs"
          active={mode === 'drill'}
          onClick={() => setMode('drill')}
        />
        <ModeButton
          icon={Hand}
          label="Drive it yourself"
          sub="click to pause"
          active={mode === 'drive'}
          onClick={() => setMode('drive')}
        />
      </div>
      <div className="text-[10px] uppercase tracking-[0.22em] text-muted/70 hidden md:block">
        {mode === 'drill'
          ? anyPaused
            ? 'cycle in progress · 30s pause + 25s cool-down'
            : `next pause in seconds · rotating ${DRILL_TARGETS.join(' / ')}`
          : 'click any node in the topology to pause it'}
      </div>
    </div>
  );
}

function ModeButton({
  icon: Icon,
  label,
  sub,
  active,
  onClick,
}: {
  icon: typeof Play;
  label: string;
  sub: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded border px-3 py-2 transition-colors ${
        active
          ? 'border-accent/60 bg-accent/[0.08] text-primary'
          : 'border-white/[0.08] bg-transparent text-secondary hover:border-white/[0.18] hover:text-primary'
      }`}
    >
      <Icon
        className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-accent' : 'text-muted/60'}`}
      />
      <div className="text-left">
        <div className="text-[11px] uppercase tracking-widest font-bold leading-none">
          {label}
        </div>
        <div className="text-[9.5px] text-muted/60 mt-0.5">{sub}</div>
      </div>
    </button>
  );
}
