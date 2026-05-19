import { useEffect, useState } from 'react';

interface ServiceHealth {
  name: string;
  status: 'online' | 'degraded' | 'offline';
}

interface HealthSnapshot {
  services: ServiceHealth[];
  p99LatencyMs?: number;
}

const STATUS_COLOR: Record<ServiceHealth['status'], string> = {
  online: 'bg-green-400',
  degraded: 'bg-yellow-400',
  offline: 'bg-red-500',
};

const STATUS_TEXT: Record<ServiceHealth['status'], string> = {
  online: 'text-green-400',
  degraded: 'text-yellow-400',
  offline: 'text-red-500',
};

export function LiveHealthStrip() {
  const [snapshot, setSnapshot] = useState<HealthSnapshot | null>(null);
  const [error, setError] = useState(false);

  const fetchHealth = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.PUBLIC_API_URL}/api/health/snapshot`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (!res.ok) throw new Error('non-2xx');
      const data: HealthSnapshot = await res.json();
      setSnapshot(data);
      setError(false);
    } catch {
      setError(true);
    }
  };

  useEffect(() => {
    fetchHealth();
    const id = setInterval(fetchHealth, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="w-full bg-[#0d0f12] border-b border-white/[0.06] px-4 py-2">
      <div className="max-w-6xl mx-auto flex items-center gap-4 flex-wrap">
        <span className="font-mono text-[10px] uppercase tracking-widest text-white/30 shrink-0">
          cluster
        </span>

        {error || !snapshot ? (
          <span className="font-mono text-[11px] text-white/30">
            {error ? 'Cluster status unavailable' : 'Loading…'}
          </span>
        ) : (
          <>
            <div className="flex items-center gap-3 flex-wrap">
              {snapshot.services.map((svc) => (
                <div key={svc.name} className="flex items-center gap-1.5">
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_COLOR[svc.status]}`}
                    aria-hidden="true"
                  />
                  <span
                    className={`font-mono text-[11px] ${STATUS_TEXT[svc.status]}`}
                  >
                    {svc.name}
                  </span>
                </div>
              ))}
            </div>

            {snapshot.p99LatencyMs !== undefined && (
              <span className="ml-auto font-mono text-[11px] text-white/30 shrink-0">
                p99&nbsp;
                <span className="text-white/60">{snapshot.p99LatencyMs}ms</span>
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
