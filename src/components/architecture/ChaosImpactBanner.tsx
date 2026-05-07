import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useClusterState } from '../../hooks/useClusterState';

/**
 * ChaosImpactBanner — explicit cause-and-effect for chaos actions.
 *
 * Sits at the top of /lab. Hidden in steady state. The moment a
 * topology pause flips a target into "paused", it appears with the
 * paused service named, the list of pattern runners that depend on
 * that service, and a live failure counter for each one (counting
 * 5xx events seen on those runners' paths since the pause began).
 *
 * On resume it doesn't immediately disappear — it flips to a
 * "recovery" frame for ~10s, recording the time-to-first-success
 * for each affected runner so the visitor sees:
 *
 *   pause → "events runner failed 3 times in 8s since pause"
 *   resume → "events runner recovered in 1.2s"
 *
 * Then it fades out. Cause, effect, recovery — without scanning
 * nine runner cards.
 */

interface RunnerDep {
  /** Runner card id, matches the LabAutoRunners spec.id */
  runnerId: string;
  /** Display name */
  name: string;
  /** Path prefix the runner hits — used to attribute failures */
  pathPrefix: string;
  /** Chaos targets this runner depends on */
  deps: string[];
}

const RUNNER_DEPS: RunnerDep[] = [
  { runnerId: 'idempotency', name: 'Idempotency',     pathPrefix: '/api/demo/idempotency', deps: ['orders', 'postgres'] },
  { runnerId: 'cache',        name: 'Cache',          pathPrefix: '/api/demo/cache/product', deps: ['catalog', 'postgres'] },
  { runnerId: 'concurrency',  name: 'Concurrency',    pathPrefix: '/api/demo/inventory',  deps: ['catalog', 'postgres'] },
  { runnerId: 'circuit',      name: 'Circuit breaker', pathPrefix: '/api/demo/circuit',    deps: ['catalog'] },
  { runnerId: 'ratelimit',    name: 'Rate limit',     pathPrefix: '/api/demo/ratelimit',   deps: [] },
  { runnerId: 'vault',        name: 'Vault status',   pathPrefix: '/api/demo/vault',       deps: ['identity', 'vault'] },
  { runnerId: 'events',       name: 'Event flow',     pathPrefix: '/api/demo/events',      deps: ['payments', 'rabbitmq'] },
  { runnerId: 'saga',         name: 'Saga',           pathPrefix: '/api/demo/saga',        deps: ['checkout', 'catalog', 'payments', 'rabbitmq'] },
  { runnerId: 'stampede',     name: 'Cache stampede', pathPrefix: '/api/demo/cache/stampede', deps: ['catalog', 'redis'] },
];

const RECOVERY_DISPLAY_MS = 10_000;

interface PauseSession {
  target: string;
  startedAtMs: number;
  failureCounts: Record<string, number>; // runnerId -> 5xx count
  recoveredAt: Record<string, { firstSuccessTs: number }>;
}

interface ResumeSession {
  target: string;
  resumedAtMs: number;
  expiresAtMs: number;
  recoveryTimes: Record<string, number | null>; // runnerId -> ms to first success after resume
  affectedRunners: string[];
}

export function ChaosImpactBanner() {
  const { chaos, events } = useClusterState();
  const [, setTick] = useState(0);

  // Per-target session state. Refs because we want to mutate without
  // causing re-renders on every event — the 1Hz tick drives display.
  const pauseSessionsRef = useRef<Record<string, PauseSession>>({});
  const resumeSessionsRef = useRef<ResumeSession[]>([]);
  const prevChaosRef = useRef<Record<string, 'paused' | 'running'>>({});
  const eventOffsetRef = useRef(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Detect chaos transitions. New pause -> open a session; resume ->
  // close the pause session and open a recovery window.
  useEffect(() => {
    const now = Date.now();
    const prev = prevChaosRef.current;
    const next: Record<string, 'paused' | 'running'> = {};

    for (const [target, state] of Object.entries(chaos)) {
      next[target] = state.status === 'paused' ? 'paused' : 'running';
      const wasPaused = prev[target] === 'paused';
      const isPaused = state.status === 'paused';

      if (!wasPaused && isPaused) {
        pauseSessionsRef.current[target] = {
          target,
          startedAtMs: now,
          failureCounts: {},
          recoveredAt: {},
        };
      } else if (wasPaused && !isPaused) {
        const session = pauseSessionsRef.current[target];
        if (session) {
          // Open a recovery window listing the runners that saw failures
          const affectedRunners = Object.keys(session.failureCounts).filter(
            (id) => session.failureCounts[id] > 0,
          );
          resumeSessionsRef.current.push({
            target,
            resumedAtMs: now,
            expiresAtMs: now + RECOVERY_DISPLAY_MS,
            affectedRunners,
            recoveryTimes: Object.fromEntries(
              affectedRunners.map((id) => [id, null]),
            ),
          });
          delete pauseSessionsRef.current[target];
        }
      }
    }
    prevChaosRef.current = next;
  }, [chaos]);

  // Walk new events; attribute 5xx to runner failure counters in active
  // pause sessions; on resume sessions, record first 2xx for each
  // affected runner.
  useEffect(() => {
    if (events.length === 0) return;
    // events are stored newest-first. The cluster store caps at 200, so
    // each consumer can replay safely. We scan the front slice that's
    // newer than the last offset.
    const fresh = events.slice(0, events.length - eventOffsetRef.current);
    eventOffsetRef.current = events.length;

    for (const ev of fresh) {
      const runner = RUNNER_DEPS.find((r) => ev.path?.startsWith(r.pathPrefix));
      if (!runner) continue;
      const isFailure = ev.status >= 500 || ev.status === 0;

      // Pause sessions: count failures for runners that depend on the
      // paused target.
      for (const session of Object.values(pauseSessionsRef.current)) {
        if (!runner.deps.includes(session.target)) continue;
        if (isFailure) {
          session.failureCounts[runner.runnerId] =
            (session.failureCounts[runner.runnerId] ?? 0) + 1;
        }
      }

      // Resume sessions: capture time-to-first-success for affected runners.
      for (const session of resumeSessionsRef.current) {
        if (!session.affectedRunners.includes(runner.runnerId)) continue;
        if (session.recoveryTimes[runner.runnerId] != null) continue;
        if (!isFailure) {
          session.recoveryTimes[runner.runnerId] =
            Date.now() - session.resumedAtMs;
        }
      }
    }
  }, [events]);

  // Compute display state for current paused targets + active resume windows
  const now = Date.now();
  const pausedSessions = Object.values(pauseSessionsRef.current);
  const liveResumeSessions = resumeSessionsRef.current.filter(
    (r) => r.expiresAtMs > now,
  );
  // Prune expired
  resumeSessionsRef.current = liveResumeSessions;

  if (pausedSessions.length === 0 && liveResumeSessions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 mb-6">
      {pausedSessions.map((session) => (
        <PausePanel key={session.target} session={session} now={now} />
      ))}
      {liveResumeSessions.map((session) => (
        <ResumePanel key={session.resumedAtMs} session={session} now={now} />
      ))}
    </div>
  );
}

function PausePanel({ session, now }: { session: PauseSession; now: number }) {
  const elapsedSec = Math.floor((now - session.startedAtMs) / 1000);
  const affected = RUNNER_DEPS.filter((r) =>
    r.deps.includes(session.target),
  );
  const totalFailures = Object.values(session.failureCounts).reduce(
    (a, b) => a + b,
    0,
  );

  return (
    <div className="rounded-lg border border-error/40 bg-error/[0.06] p-5 font-mono">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-error shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="text-sm font-bold text-error mb-1">
            <span className="uppercase tracking-widest">{session.target}</span>
            <span className="text-error/70 font-normal"> paused</span>
            <span className="text-error/50 font-normal"> · {elapsedSec}s ago</span>
          </div>
          <div className="text-[11px] text-secondary mb-3">
            {affected.length} runner{affected.length === 1 ? '' : 's'} depend on{' '}
            {session.target}.{' '}
            {totalFailures > 0
              ? `${totalFailures} 5xx observed since the pause.`
              : 'Watching the wire — failures will appear here as they land.'}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {affected.map((r) => {
              const fails = session.failureCounts[r.runnerId] ?? 0;
              return (
                <div
                  key={r.runnerId}
                  className={`rounded border px-3 py-2 text-[10.5px] flex items-center justify-between ${
                    fails > 0
                      ? 'border-error/40 bg-error/[0.08] text-error'
                      : 'border-error/15 text-muted/60'
                  }`}
                >
                  <span className="uppercase tracking-widest">{r.name}</span>
                  <span className="tabular-nums font-bold">
                    {fails > 0 ? `${fails} failed` : 'waiting…'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function ResumePanel({ session, now }: { session: ResumeSession; now: number }) {
  const elapsedMs = now - session.resumedAtMs;
  const affected = RUNNER_DEPS.filter((r) =>
    session.affectedRunners.includes(r.runnerId),
  );

  return (
    <div className="rounded-lg border border-success/40 bg-success/[0.06] p-5 font-mono">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="text-sm font-bold text-success mb-1">
            <span className="uppercase tracking-widest">{session.target}</span>
            <span className="text-success/70 font-normal"> resumed</span>
            <span className="text-success/50 font-normal">
              {' '}
              · {Math.floor(elapsedMs / 1000)}s ago
            </span>
          </div>
          {affected.length === 0 ? (
            <div className="text-[11px] text-muted/70">
              No failures observed during the pause window.
            </div>
          ) : (
            <>
              <div className="text-[11px] text-secondary mb-3">
                Watching the affected runners for first successful response after
                resume.
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {affected.map((r) => {
                  const recoveryMs = session.recoveryTimes[r.runnerId];
                  return (
                    <div
                      key={r.runnerId}
                      className={`rounded border px-3 py-2 text-[10.5px] flex items-center justify-between ${
                        recoveryMs == null
                          ? 'border-warning/30 text-warning'
                          : 'border-success/40 bg-success/[0.08] text-success'
                      }`}
                    >
                      <span className="uppercase tracking-widest">{r.name}</span>
                      <span className="tabular-nums font-bold">
                        {recoveryMs == null
                          ? 'pending'
                          : `recovered ${recoveryMs}ms`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
