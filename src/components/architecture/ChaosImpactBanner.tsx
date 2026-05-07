import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import { useClusterState } from '../../hooks/useClusterState';
import type { ConsoleEvent } from '../../lib/cluster-store';

/**
 * ChaosImpactBanner — auto-narrates chaos in plain English.
 *
 * The whole point of /lab is "I pause something and immediately see
 * what happens to the actual requests." This banner does exactly that:
 * the moment a topology pause flips a target into "paused", it appears
 * with a featured failing request's full plain-English narrative —
 * which path was hit, which upstream the BFF tried, that the chaos
 * handler synthetically failed it in N ms instead of letting it hang
 * for 4s. As more failures land, the featured request rotates to the
 * latest one. No clicks needed.
 *
 * On resume it flips to a "system recovered" frame for ~10s, featuring
 * the first successful request after resume — proving the system
 * self-healed without intervention.
 *
 * Steady state: hidden.
 */

interface RunnerDep {
  name: string;
  pathPrefix: string;
  deps: string[];
}

const RUNNER_DEPS: RunnerDep[] = [
  { name: 'Idempotency',     pathPrefix: '/api/demo/idempotency',     deps: ['orders', 'postgres'] },
  { name: 'Cache',           pathPrefix: '/api/demo/cache/product',   deps: ['catalog', 'postgres'] },
  { name: 'Concurrency',     pathPrefix: '/api/demo/inventory',       deps: ['catalog', 'postgres'] },
  { name: 'Circuit breaker', pathPrefix: '/api/demo/circuit',         deps: ['catalog'] },
  { name: 'Vault',           pathPrefix: '/api/demo/vault',           deps: ['identity', 'vault'] },
  { name: 'Events',          pathPrefix: '/api/demo/events',          deps: ['payments', 'rabbitmq'] },
  { name: 'Saga',            pathPrefix: '/api/demo/saga',            deps: ['checkout', 'catalog', 'payments', 'rabbitmq'] },
  { name: 'Cache stampede',  pathPrefix: '/api/demo/cache/stampede',  deps: ['catalog', 'redis'] },
];

const RECOVERY_DISPLAY_MS = 12_000;

interface PauseSession {
  target: string;
  startedAtMs: number;
  failureCount: number;
  affectedRunners: Set<string>;
  /** Most recent 5xx event attributable to this pause. */
  lastFailure: ConsoleEvent | null;
}

interface ResumeSession {
  target: string;
  resumedAtMs: number;
  expiresAtMs: number;
  failureCount: number;
  affectedRunners: Set<string>;
  /** First 2xx event after resume that touched an affected runner. */
  firstRecovery: ConsoleEvent | null;
  firstRecoveryMs: number | null;
}

function runnerFor(path: string | undefined): RunnerDep | undefined {
  if (!path) return undefined;
  return RUNNER_DEPS.find((r) => path.startsWith(r.pathPrefix));
}

export function ChaosImpactBanner() {
  const { chaos, events } = useClusterState();
  const [, setTick] = useState(0);

  const pauseSessionsRef = useRef<Record<string, PauseSession>>({});
  const resumeSessionsRef = useRef<ResumeSession[]>([]);
  const prevChaosRef = useRef<Record<string, 'paused' | 'running'>>({});
  const eventOffsetRef = useRef(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 750);
    return () => clearInterval(id);
  }, []);

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
          failureCount: 0,
          affectedRunners: new Set(),
          lastFailure: null,
        };
      } else if (wasPaused && !isPaused) {
        const session = pauseSessionsRef.current[target];
        if (session) {
          resumeSessionsRef.current.push({
            target,
            resumedAtMs: now,
            expiresAtMs: now + RECOVERY_DISPLAY_MS,
            failureCount: session.failureCount,
            affectedRunners: session.affectedRunners,
            firstRecovery: null,
            firstRecoveryMs: null,
          });
          delete pauseSessionsRef.current[target];
        }
      }
    }
    prevChaosRef.current = next;
  }, [chaos]);

  useEffect(() => {
    if (events.length === 0) return;
    const fresh = events.slice(0, events.length - eventOffsetRef.current);
    eventOffsetRef.current = events.length;

    // events are newest-first; iterate oldest-first so lastFailure
    // ends up pointing to the genuinely most recent failure.
    for (let i = fresh.length - 1; i >= 0; i--) {
      const ev = fresh[i];
      const runner = runnerFor(ev.path);
      if (!runner) continue;
      const isFailure = ev.status >= 500 || ev.status === 0;

      for (const session of Object.values(pauseSessionsRef.current)) {
        if (!runner.deps.includes(session.target)) continue;
        if (isFailure) {
          session.failureCount += 1;
          session.affectedRunners.add(runner.name);
          session.lastFailure = ev;
        }
      }

      for (const session of resumeSessionsRef.current) {
        if (!session.affectedRunners.has(runner.name)) continue;
        if (session.firstRecovery != null) continue;
        if (!isFailure) {
          session.firstRecovery = ev;
          session.firstRecoveryMs = Date.now() - session.resumedAtMs;
        }
      }
    }
  }, [events]);

  const now = Date.now();
  const pausedSessions = Object.values(pauseSessionsRef.current);
  const liveResumeSessions = resumeSessionsRef.current.filter(
    (r) => r.expiresAtMs > now,
  );
  resumeSessionsRef.current = liveResumeSessions;

  if (pausedSessions.length === 0 && liveResumeSessions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mb-6">
      {pausedSessions.map((s) => (
        <PausePanel key={s.target} session={s} now={now} />
      ))}
      {liveResumeSessions.map((s) => (
        <ResumePanel key={s.resumedAtMs} session={s} />
      ))}
    </div>
  );
}

function PausePanel({ session, now }: { session: PauseSession; now: number }) {
  const elapsedSec = Math.floor((now - session.startedAtMs) / 1000);
  const ev = session.lastFailure;

  return (
    <div className="rounded-lg border border-error/40 bg-error/[0.06] p-5 md:p-6">
      <div className="flex items-start gap-3 mb-4">
        <AlertTriangle className="w-5 h-5 text-error shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="text-base text-primary font-semibold mb-1">
            You paused <span className="text-error uppercase tracking-widest">{session.target}</span>.
            {session.failureCount === 0
              ? ' Watching the wire — failures will appear here as they land.'
              : ` ${session.failureCount} request${session.failureCount === 1 ? '' : 's'} ${session.failureCount === 1 ? 'has' : 'have'} failed since you paused (${elapsedSec}s ago).`}
          </div>
          <div className="text-[12px] text-secondary">
            Affected demos: {[...session.affectedRunners].join(', ') || 'none yet'}
          </div>
        </div>
      </div>

      {ev ? (
        <FeaturedRequest
          ev={ev}
          tone="error"
          headline={`Most recent failure · ${formatAge(now - Date.parse(ev.ts))} ago`}
          narrative={
            <>
              The BFF tried to call{' '}
              <strong>{(ev.upstreams[0]?.service ?? 'an upstream').replace('-svc', '')}</strong>
              , which depends on <strong>{session.target}</strong> (which you
              just paused). The BFF's chaos handler intercepted the call
              before any network activity and threw a synthetic 503 in{' '}
              <strong>{ev.durationMs.toFixed(0)}ms</strong>.{' '}
              <span className="text-muted/80">
                Without the handler this would have hung for the full 4s
                HttpClient timeout per upstream attempt.
              </span>
            </>
          }
        />
      ) : (
        <div className="rounded border border-error/20 bg-black/30 p-4 text-[12px] text-muted/70 italic">
          No failures yet — the runners take a few seconds to circle back to a path that depends on {session.target}.
        </div>
      )}
    </div>
  );
}

function ResumePanel({ session }: { session: ResumeSession }) {
  const ev = session.firstRecovery;

  return (
    <div className="rounded-lg border border-success/40 bg-success/[0.06] p-5 md:p-6">
      <div className="flex items-start gap-3 mb-4">
        <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="text-base text-primary font-semibold mb-1">
            <span className="text-success uppercase tracking-widest">{session.target}</span>{' '}
            resumed.
            {session.failureCount === 0
              ? ' No failures observed during the pause window — runners didn\'t happen to hit a dependent path.'
              : session.firstRecoveryMs != null
                ? ` System recovered in ${session.firstRecoveryMs}ms.`
                : ' Waiting for the first successful request after resume…'}
          </div>
          {session.affectedRunners.size > 0 && (
            <div className="text-[12px] text-secondary">
              {session.failureCount} request{session.failureCount === 1 ? '' : 's'} failed during the pause across:{' '}
              {[...session.affectedRunners].join(', ')}
            </div>
          )}
        </div>
      </div>

      {ev && (
        <FeaturedRequest
          ev={ev}
          tone="success"
          headline={`First successful request after resume · ${session.firstRecoveryMs}ms`}
          narrative={
            <>
              <strong>
                {(ev.upstreams[0]?.service ?? 'the BFF').replace('-svc', '')}
              </strong>{' '}
              is back. The BFF received the request and returned{' '}
              <strong>{ev.status}</strong> in{' '}
              <strong>{ev.durationMs.toFixed(0)}ms</strong>{' '}
              {ev.upstreams.length > 0 ? (
                <>
                  after fanning out to{' '}
                  {ev.upstreams.length} upstream service
                  {ev.upstreams.length === 1 ? '' : 's'}.
                </>
              ) : (
                <>after handling it in-process.</>
              )}{' '}
              <span className="text-muted/80">
                The chaos handler is no longer intercepting outbound calls;
                requests flow normally.
              </span>
            </>
          }
        />
      )}
    </div>
  );
}

function FeaturedRequest({
  ev,
  tone,
  headline,
  narrative,
}: {
  ev: ConsoleEvent;
  tone: 'error' | 'success';
  headline: string;
  narrative: React.ReactNode;
}) {
  const borderColor = tone === 'error' ? 'border-error/25' : 'border-success/25';
  const labelColor = tone === 'error' ? 'text-error/80' : 'text-success/80';
  const statusColor = tone === 'error' ? 'text-error' : 'text-success';

  return (
    <div className={`rounded border ${borderColor} bg-black/35 p-4 font-mono space-y-3`}>
      <div className={`text-[10px] uppercase tracking-widest ${labelColor}`}>
        {headline}
      </div>

      <div className="grid grid-cols-[60px_50px_1fr_70px] gap-3 items-center text-[11.5px]">
        <span className={`font-bold tabular-nums ${statusColor}`}>
          {ev.status || 'ERR'}
        </span>
        <span className="font-bold text-accent">{ev.method}</span>
        <span className="text-secondary truncate" title={ev.path}>
          {ev.path}
        </span>
        <span className="text-muted/70 tabular-nums text-right">
          {ev.durationMs.toFixed(0)}ms
        </span>
      </div>

      <p className="text-[12px] text-primary leading-relaxed">{narrative}</p>

      <HopStrip ev={ev} tone={tone} />
    </div>
  );
}

function HopStrip({ ev, tone }: { ev: ConsoleEvent; tone: 'error' | 'success' }) {
  const failTone = tone === 'error' ? 'text-error border-error/40' : 'text-success border-success/40';
  const upstream = ev.upstreams[0];

  return (
    <div className="flex items-center gap-2 text-[10.5px] text-muted overflow-x-auto pb-1">
      <Hop label="browser" />
      <ArrowRight className="w-3 h-3 text-muted/40 shrink-0" />
      <Hop label={`bff-web · ${ev.instanceId.slice(0, 6)}`} />
      <ArrowRight className="w-3 h-3 text-muted/40 shrink-0" />
      {upstream ? (
        <Hop
          label={`${upstream.service.replace('-svc', '')} · ${upstream.instanceId.slice(0, 6)}`}
          extraClass={failTone}
        />
      ) : (
        <Hop label="(no upstream — chaos blocked)" extraClass={failTone} />
      )}
      <ArrowRight className="w-3 h-3 text-muted/40 shrink-0" />
      <Hop
        label={`${ev.status || 'ERR'} · ${ev.durationMs.toFixed(0)}ms`}
        extraClass={failTone}
      />
    </div>
  );
}

function Hop({ label, extraClass }: { label: string; extraClass?: string }) {
  return (
    <span
      className={`shrink-0 rounded border border-white/[0.08] bg-black/30 px-2 py-1 ${extraClass ?? 'text-secondary'}`}
    >
      {label}
    </span>
  );
}

function formatAge(ms: number): string {
  if (ms < 1000) return 'just now';
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s`;
  return `${Math.floor(ms / 60_000)}m`;
}
