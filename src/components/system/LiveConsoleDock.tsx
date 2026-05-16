import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';
import { Activity, ChevronUp, ChevronDown, Copy, Check } from 'lucide-react';

// Frontend build identity — injected by Vite `define` in astro.config.mjs at
// dev-server / build start. Lets the dock prove which JS bundle is loaded.
declare const __BUILD_SHA__: string;
declare const __BUILD_STARTED_AT__: string;
const WEB_BUILD_SHA: string =
  typeof __BUILD_SHA__ !== 'undefined' ? __BUILD_SHA__ : 'dev';
const WEB_BUILD_STARTED_AT: string =
  typeof __BUILD_STARTED_AT__ !== 'undefined'
    ? __BUILD_STARTED_AT__
    : new Date().toISOString();

/**
 * LiveConsoleDock
 *
 * Persistent bottom-right dock that streams real BFF activity to the page.
 * Connects to the BFF's /hubs/console SignalR endpoint. Every /api/* request
 * the BFF handles emits one event — the dock shows them as they arrive,
 * with the actual replica id, status, and round-trip time.
 *
 * The point of this component is the artifact, not the chrome: a visitor
 * looking at it can see real timestamps, real instance ids, real durations,
 * and copy a curl command they can run themselves to verify the response
 * came from the same backend. It's the proof that demos aren't simulated.
 */

const CONSOLE_HUB_URL = (
  import.meta.env.PUBLIC_API_URL ||
  import.meta.env.PUBLIC_BFF_URL ||
  ''
).replace(/\/$/, '');
const HUB_PATH = '/hubs/console';

interface UpstreamHop {
  service: string;
  instanceId: string;
}

interface ConsoleEvent {
  ts: string;
  service: string;
  instanceId: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  traceId?: string | null;
  correlationId?: string | null;
  upstreams: UpstreamHop[];
}

interface ConsoleHello {
  service: string;
  instanceId: string;
  gitSha: string;
  processStartedAt: string;
}

function relativeAge(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!isFinite(ms) || ms < 0) return '?';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

const MAX_ROWS = 120;

function statusColor(status: number) {
  if (status >= 500) return 'text-error';
  if (status >= 400) return 'text-warning';
  if (status >= 300) return 'text-secondary';
  return 'text-success';
}

function methodColor(method: string) {
  switch (method) {
    case 'GET':
      return 'text-accent';
    case 'POST':
      return 'text-success';
    case 'PUT':
    case 'PATCH':
      return 'text-warning';
    case 'DELETE':
      return 'text-error';
    default:
      return 'text-secondary';
  }
}

function shortTime(iso: string) {
  // Avoid SSR-time toLocaleTimeString diff: just slice the ISO.
  // Format: "HH:MM:SS.mmm" from "...THH:MM:SS.mmmmmmmZ".
  const t = iso.split('T')[1] ?? iso;
  return t.replace('Z', '').slice(0, 12);
}

function buildCurl(ev: ConsoleEvent) {
  const url = `${CONSOLE_HUB_URL}${ev.path}`;
  if (ev.method === 'GET') return `curl -i '${url}'`;
  return `curl -i -X ${ev.method} '${url}'`;
}

const HINT_DISMISSED_KEY = 'live-console-hint-dismissed';

export const LiveConsoleDock: React.FC = () => {
  const [events, setEvents] = useState<ConsoleEvent[]>([]);
  const [hello, setHello] = useState<ConsoleHello | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [connectionState, setConnectionState] = useState<
    'connecting' | 'connected' | 'disconnected'
  >('connecting');
  const [copiedTs, setCopiedTs] = useState<string | null>(null);
  // Pulse the dot when a new event arrives so peripheral vision catches
  // activity even when the dock is collapsed. Reset after the animation.
  const [pulse, setPulse] = useState(false);
  // Onboarding hint: shown 1.5s after page load if the visitor hasn't
  // dismissed it before. Auto-dismissed when they interact with the dock
  // OR after 12s, whichever comes first.
  const [showHint, setShowHint] = useState(false);
  // Tick once per second so the relative ages re-render without reload.
  const [, setTick] = useState(0);
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  // Latches: each fires at most once per page load.
  const autoExpandedRef = useRef(false);
  const backfillDoneRef = useRef(false);
  const collapseTimerRef = useRef<number | null>(null);
  const pulseTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    // Onboarding cue. Skip entirely if the visitor has already seen it.
    try {
      if (localStorage.getItem(HINT_DISMISSED_KEY)) return;
    } catch {
      // localStorage unavailable (Safari private mode etc.); just show once.
    }
    const showTimer = window.setTimeout(() => setShowHint(true), 1500);
    const hideTimer = window.setTimeout(() => setShowHint(false), 12000);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  const dismissHint = useCallback(() => {
    setShowHint(false);
    try {
      localStorage.setItem(HINT_DISMISSED_KEY, '1');
    } catch {
      // ignore
    }
  }, []);

  // Append events newest-first, capped. Triggers pulse + first-event
  // auto-expand. We treat anything arriving via OnConsoleEvent (not the
  // backfill) as "live" — i.e. caused by the visitor's interaction or by
  // ongoing cluster traffic — and that's what we want to draw the eye to.
  const pushEvent = useCallback((ev: ConsoleEvent) => {
    setEvents((prev) => {
      const next = [ev, ...prev];
      if (next.length > MAX_ROWS) next.length = MAX_ROWS;
      return next;
    });
    // Dot pulse: short animation flash, doesn't stack.
    setPulse(true);
    if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current);
    pulseTimerRef.current = window.setTimeout(() => setPulse(false), 700);

    // First live event after backfill → auto-expand once for ~6s, then
    // collapse. Once the visitor has been shown this cause-and-effect
    // they don't need it again.
    if (!autoExpandedRef.current && backfillDoneRef.current) {
      autoExpandedRef.current = true;
      setExpanded(true);
      dismissHint();
      if (collapseTimerRef.current) window.clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = window.setTimeout(
        () => setExpanded(false),
        6000,
      );
    }
  }, [dismissHint]);

  const pushBackfill = useCallback((batch: ConsoleEvent[]) => {
    backfillDoneRef.current = true;
    if (!Array.isArray(batch) || batch.length === 0) return;
    // Backfill arrives oldest-first; flip and cap.
    setEvents((prev) => {
      const reversed = [...batch].reverse();
      const merged = [...reversed, ...prev];
      if (merged.length > MAX_ROWS) merged.length = MAX_ROWS;
      return merged;
    });
  }, []);

  // TODO: consolidate with cluster-store to avoid duplicate WebSocket
  useEffect(() => {
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(`${CONSOLE_HUB_URL}${HUB_PATH}`)
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connectionRef.current = conn;

    conn.on('OnConsoleHello', (raw: any) => {
      if (!raw) return;
      setHello({
        service: raw.service,
        instanceId: raw.instanceId,
        gitSha: raw.gitSha,
        processStartedAt: raw.processStartedAt,
      });
    });

    conn.on('OnConsoleEvent', (raw: any) => {
      // SignalR's JSON contract uses camelCase from the server's PascalCase
      // record properties. Normalise here.
      const ev: ConsoleEvent = {
        ts: raw.ts,
        service: raw.service,
        instanceId: raw.instanceId,
        method: raw.method,
        path: raw.path,
        status: raw.status,
        durationMs: raw.durationMs,
        traceId: raw.traceId ?? null,
        correlationId: raw.correlationId ?? null,
        upstreams: Array.isArray(raw.upstreams)
          ? raw.upstreams.map((u: any) => ({
              service: u.service,
              instanceId: u.instanceId,
            }))
          : [],
      };
      pushEvent(ev);
    });

    conn.on('OnConsoleBackfill', (batch: any[]) => {
      pushBackfill(
        (batch ?? []).map((raw) => ({
          ts: raw.ts,
          service: raw.service,
          instanceId: raw.instanceId,
          method: raw.method,
          path: raw.path,
          status: raw.status,
          durationMs: raw.durationMs,
          traceId: raw.traceId ?? null,
          correlationId: raw.correlationId ?? null,
          upstreams: Array.isArray(raw.upstreams)
            ? raw.upstreams.map((u: any) => ({
                service: u.service,
                instanceId: u.instanceId,
              }))
            : [],
        })),
      );
    });

    conn.onreconnecting(() => setConnectionState('connecting'));
    conn.onreconnected(() => setConnectionState('connected'));
    conn.onclose(() => setConnectionState('disconnected'));

    conn
      .start()
      .then(() => {
        setConnectionState('connected');
        // If the BFF has nothing recent to backfill it won't send
        // OnConsoleBackfill. Latch backfillDone after a short grace so the
        // first live event still triggers auto-expand.
        window.setTimeout(() => {
          backfillDoneRef.current = true;
        }, 1500);
      })
      .catch(() => setConnectionState('disconnected'));

    return () => {
      conn.stop().catch(() => undefined);
      connectionRef.current = null;
      if (collapseTimerRef.current) window.clearTimeout(collapseTimerRef.current);
      if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current);
    };
  }, [pushEvent, pushBackfill]);

  const copyCurl = async (ev: ConsoleEvent) => {
    try {
      await navigator.clipboard.writeText(buildCurl(ev));
      setCopiedTs(ev.ts);
      setTimeout(() => setCopiedTs(null), 1200);
    } catch {
      // Clipboard denied; show the curl in a prompt as fallback.
      window.prompt('Copy:', buildCurl(ev));
    }
  };

  // Connecting → pulsing amber, disconnected → red, connected → green.
  // On a live event the dot scales briefly via the `pulse` flag so the
  // visitor's eye catches the corner without auto-expanding the panel
  // every time.
  const stateDotBase =
    connectionState === 'connected'
      ? 'bg-success'
      : connectionState === 'connecting'
        ? 'bg-warning animate-pulse'
        : 'bg-error';
  const stateDot = `${stateDotBase} ${
    pulse ? 'scale-150 ring-2 ring-success/40' : 'scale-100'
  } transition-transform duration-300`;

  const stateLabel =
    connectionState === 'connected'
      ? 'live'
      : connectionState === 'connecting'
        ? 'connecting…'
        : 'offline';

  return (
    <div
      className="fixed bottom-4 left-4 z-[80] font-mono"
      style={{ width: expanded ? 'min(560px, calc(100vw - 2rem))' : 'auto' }}
    >
      {/* Onboarding cue: floats above the pill, points at it, dismisses on
          click or first interaction with the dock. Hidden permanently once
          the visitor has seen it via localStorage. */}
      {showHint && !expanded && (
        <div
          className="absolute bottom-[calc(100%+8px)] left-0 max-w-[320px] animate-fade-in"
          role="note"
        >
          <button
            onClick={dismissHint}
            className="glass px-3 py-2 rounded-lg border border-accent/40 text-left text-[11px] leading-relaxed text-primary shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
          >
            <span className="text-accent">↙</span>{' '}
            <span className="font-bold">Live cluster activity.</span>{' '}
            <span className="text-secondary">
              Press any demo on the page — the request appears here from a real
              .NET replica.
            </span>
          </button>
        </div>
      )}

      {/* Collapsed pill — always visible. Shows connection state + count. */}
      <button
        onClick={() => {
          setExpanded((e) => !e);
          dismissHint();
        }}
        className="glass flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 hover:border-white/20 transition-colors w-full"
        style={{ minWidth: 'min(320px, calc(100vw - 2rem))' }}
        aria-expanded={expanded}
        aria-label="Toggle live cluster console"
      >
        <span className={`w-2 h-2 rounded-full ${stateDot}`} />
        <Activity className="w-3.5 h-3.5 text-secondary" />
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">
          live
        </span>
        <span
          className="text-[10px] text-secondary tabular-nums"
          title={
            hello
              ? `BFF process started ${hello.processStartedAt} (${relativeAge(hello.processStartedAt)} ago)`
              : 'BFF process not yet identified'
          }
        >
          bff:{hello ? `${hello.gitSha} ${relativeAge(hello.processStartedAt)}` : '…'}
        </span>
        <span className="text-[10px] text-muted">·</span>
        <span
          className="text-[10px] text-secondary tabular-nums"
          title={`Frontend bundle started ${WEB_BUILD_STARTED_AT} (${relativeAge(WEB_BUILD_STARTED_AT)} ago)`}
        >
          web:{WEB_BUILD_SHA} {relativeAge(WEB_BUILD_STARTED_AT)}
        </span>
        <span className="text-[10px] text-muted">·</span>
        <span className="text-[10px] text-secondary tabular-nums">
          {events.length}
        </span>
        <span className="ml-auto">
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-muted" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5 text-muted" />
          )}
        </span>
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div className="glass mt-2 border border-white/10 rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-white/10 text-[10px] text-muted leading-relaxed space-y-1">
            <div>
              Real activity from the BFF process at{' '}
              <span className="text-secondary">{CONSOLE_HUB_URL}</span>. Each
              row is one HTTP request; copy the curl to reproduce — the
              response carries the same{' '}
              <span className="text-secondary">X-Instance-Id</span>.
            </div>
            <div className="font-mono text-[10px]">
              <span className="text-muted">bff </span>
              <span className="text-secondary">
                {hello ? `${hello.instanceId} ${hello.gitSha}` : 'connecting…'}
              </span>
              {hello && (
                <span className="text-muted">
                  {' '}
                  · started {relativeAge(hello.processStartedAt)} ago
                </span>
              )}
              <span className="text-muted">  ·  </span>
              <span className="text-muted">web </span>
              <span className="text-secondary">{WEB_BUILD_SHA}</span>
              <span className="text-muted">
                {' '}
                · loaded {relativeAge(WEB_BUILD_STARTED_AT)} ago
              </span>
            </div>
          </div>
          <div
            ref={listRef}
            className="max-h-[360px] overflow-y-auto divide-y divide-white/5"
          >
            {events.length === 0 ? (
              <div className="px-3 py-6 text-center text-[11px] text-muted">
                Waiting for activity. Press a demo button on the page.
              </div>
            ) : (
              events.map((ev) => (
                <div
                  key={`${ev.ts}-${ev.path}-${ev.status}-${ev.durationMs}`}
                  className="group flex items-center gap-2 px-3 py-1.5 text-[10.5px] hover:bg-white/[0.03]"
                >
                  <span className="text-muted tabular-nums">
                    {shortTime(ev.ts)}
                  </span>
                  <span
                    className="text-secondary truncate shrink-0"
                    title={`${ev.service} replica ${ev.instanceId}${
                      ev.upstreams.length
                        ? ` → ${ev.upstreams
                            .map((u) => `${u.service} ${u.instanceId}`)
                            .join(', ')}`
                        : ''
                    }`}
                  >
                    {ev.service}-{ev.instanceId}
                    {ev.upstreams.length > 0 && (
                      <>
                        <span className="text-muted px-1">→</span>
                        <span className="text-accent">
                          {ev.upstreams
                            .map((u) => `${u.service.replace(/-svc$/, '')}-${u.instanceId}`)
                            .join(', ')}
                        </span>
                      </>
                    )}
                  </span>
                  <span
                    className={`font-bold ${methodColor(ev.method)} w-12 shrink-0`}
                  >
                    {ev.method}
                  </span>
                  <span
                    className="text-primary truncate flex-1 min-w-0"
                    title={ev.path}
                  >
                    {ev.path}
                  </span>
                  <span
                    className={`tabular-nums ${statusColor(ev.status)} w-8 text-right shrink-0`}
                  >
                    {ev.status}
                  </span>
                  <span className="tabular-nums text-muted w-14 text-right shrink-0">
                    {ev.durationMs.toFixed(0)}ms
                  </span>
                  <button
                    onClick={() => copyCurl(ev)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted hover:text-primary shrink-0"
                    title="Copy curl reproducer"
                    aria-label="Copy curl reproducer"
                  >
                    {copiedTs === ev.ts ? (
                      <Check className="w-3 h-3 text-success" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
