import { useEffect, useState } from "react";
import { allDemos } from "./DemoSidebar";
import { DEMO_CONTEXT } from "../../lib/demo-context";

// Map demo IDs to the service key that must be present in the health snapshot
const DEMO_SERVICE_MAP: Record<string, string | null> = {
  checkout:    "catalog",
  circuit:     "catalog",
  stampede:    "catalog",
  cache:       "catalog",
  concurrency: "catalog",
  events:      "payments",
  refund:      "payments",
  idempotency: "orders",
  vault:       "identity",
  ratelimit:   null,          // BFF-only, always live
  ledger:      "payouts",
  erasure:     "privacy",
  cdcsearch:   "search",
};

interface ServiceHealth {
  id: string;
  name: string;
  status: string;
}

interface HealthResponse {
  services?: ServiceHealth[];
  systemStatus?: string;
}

export function DemoStatusGrid() {
  const [serviceMap, setServiceMap] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiUrl = import.meta.env.PUBLIC_API_URL ?? "";
    fetch(`${apiUrl}/api/health/snapshot`, { signal: AbortSignal.timeout(5000) })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: HealthResponse | null) => {
        if (data?.services) {
          const map: Record<string, string> = {};
          for (const svc of data.services) {
            map[svc.id] = svc.status;
          }
          setServiceMap(map);
        } else {
          setServiceMap({});
        }
      })
      .catch(() => setServiceMap({}))
      .finally(() => setLoading(false));
  }, []);

  function isLive(demoId: string): boolean | null {
    if (loading) return null;
    const requiredService = DEMO_SERVICE_MAP[demoId];
    if (requiredService === null) return true; // ratelimit / BFF-only
    if (!serviceMap || Object.keys(serviceMap).length === 0) return false;
    const status = serviceMap[requiredService];
    return status === "online";
  }

  return (
    <div className="mb-10 min-h-[180px]">
      <p className="text-xs font-mono uppercase tracking-widest text-muted mb-3">
        Live service status
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
        {allDemos.map((demo) => {
          const live = isLive(demo.id);
          const ctx = DEMO_CONTEXT[demo.id];
          return (
            <a
              key={demo.id}
              href={`/demos?demo=${demo.id}`}
              className="group flex flex-col gap-1.5 p-3 rounded-lg border border-border bg-surface hover:border-accent/40 hover:bg-surface-warm transition-all"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-semibold text-primary truncate leading-tight">
                  {demo.label}
                </span>
                <span
                  className="shrink-0 w-2 h-2 rounded-full"
                  style={{
                    backgroundColor:
                      live === null
                        ? "var(--color-muted, #888)"
                        : live
                        ? "var(--color-success, #22c55e)"
                        : "#6b7280",
                    opacity: live === null ? 0.4 : 1,
                  }}
                  title={
                    live === null
                      ? "Checking..."
                      : live
                      ? "Backend responding"
                      : "Backend offline"
                  }
                />
              </div>
              {ctx && (
                <p className="text-[10px] text-muted leading-snug line-clamp-2">
                  {ctx.businessOutcome}
                </p>
              )}
            </a>
          );
        })}
      </div>
    </div>
  );
}
