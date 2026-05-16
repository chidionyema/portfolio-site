import React, { useEffect, useState } from 'react';

/**
 * HeroFingerprint
 *
 * One-line BFF identity stamp under the hero hook copy. Reads the
 * BFF's instance id, git SHA, and process start time from
 * /api/system/identity (mirrors the live console dock's hello payload
 * but over REST so the hero doesn't need its own SignalR connection).
 *
 * "Is this real?" should be answerable above the fold in one glance —
 * a fresh 7-character SHA + an uptime that visibly counts is harder
 * to fake than a static badge.
 */

const API_URL = (
  import.meta.env.PUBLIC_API_URL ?? ''
).replace(/\/$/, '');

interface SystemIdentity {
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
  const remM = m % 60;
  if (h < 24) return remM > 0 ? `${h}h ${remM}m` : `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export const HeroFingerprint: React.FC = () => {
  const [identity, setIdentity] = useState<SystemIdentity | null>(null);
  const [unreachable, setUnreachable] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/api/system/identity`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setIdentity(data);
      })
      .catch(() => {
        if (!cancelled) setUnreachable(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 1Hz tick so the uptime counter updates in place.
  useEffect(() => {
    if (!identity) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [identity]);

  if (unreachable) {
    return (
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-error/70 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" />
        backend unreachable · start the cluster:{' '}
        <code className="text-error/90">./scripts/aspire-up.sh</code>
      </div>
    );
  }

  if (!identity) {
    return (
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted/50 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-muted/40 animate-pulse" />
        verifying backend…
      </div>
    );
  }

  return (
    <div
      className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted/70 flex flex-wrap items-center gap-x-3 gap-y-1"
      title={`BFF process started ${identity.processStartedAt}`}
    >
      <span className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
        backend
      </span>
      <span className="text-secondary">
        {identity.service}-{identity.instanceId}
      </span>
      <span className="text-muted/40">·</span>
      <span className="text-muted">sha</span>
      <span className="text-secondary">{identity.gitSha}</span>
      <span className="text-muted/40">·</span>
      <span className="text-muted">uptime</span>
      <span className="text-secondary tabular-nums">
        {relativeAge(identity.processStartedAt)}
      </span>
    </div>
  );
};
