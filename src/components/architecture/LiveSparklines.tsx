import { useEffect, useMemo, useState } from 'react';
import { useClusterState } from '../../hooks/useClusterState';

/**
 * LiveSparklines — replaces the placeholder GrafanaPanel embeds.
 *
 * The Grafana panels were "Awaiting telemetry…" forever because the
 * dev cluster doesn't have Grafana Cloud wired. The metrics they
 * were trying to show (RPS, p99) can be computed directly from the
 * event stream the cluster store already collects, so this component
 * renders them as bar / line sparklines updated every second.
 *
 * Two charts:
 *   - Requests per second: 60s rolling window, one bar per second,
 *     red overlay showing 5xx within that bucket.
 *   - Response time p99: 60s rolling window of 6s buckets, line chart.
 *
 * No external service, no iframe, no auth token. Real data from the
 * actual cluster every visitor is hitting.
 */

const WINDOW_S = 60;
const TICK_MS = 1000;
const P99_BUCKET_S = 6;

export function LiveSparklines() {
  const { events } = useClusterState();
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), TICK_MS);
    return () => clearInterval(id);
  }, []);

  // Pre-compute per-second buckets for RPS, and per-bucket p99 for
  // response time, off the raw events.
  const rpsBuckets = useMemo(() => buildRpsBuckets(events), [events]);
  const p99Buckets = useMemo(() => buildP99Buckets(events), [events]);

  const totalReq = rpsBuckets.reduce((s, b) => s + b.total, 0);
  const totalErr = rpsBuckets.reduce((s, b) => s + b.errors, 0);
  const errRate = totalReq > 0 ? (totalErr / totalReq) * 100 : 0;

  const livePts = p99Buckets.filter((b) => b.p99 != null);
  const liveP99 =
    livePts.length > 0 ? livePts[livePts.length - 1].p99 ?? 0 : 0;

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <RpsChart buckets={rpsBuckets} totalReq={totalReq} errRate={errRate} />
      <P99Chart buckets={p99Buckets} liveP99={liveP99} />
    </div>
  );
}

interface RpsBucket {
  total: number;
  errors: number;
}

function buildRpsBuckets(
  events: ReturnType<typeof useClusterState>['events'],
): RpsBucket[] {
  const buckets: RpsBucket[] = Array.from({ length: WINDOW_S }, () => ({
    total: 0,
    errors: 0,
  }));
  const now = Date.now();
  for (const e of events) {
    const ts = Date.parse(e.ts);
    if (!Number.isFinite(ts)) continue;
    const ageS = Math.floor((now - ts) / 1000);
    if (ageS < 0 || ageS >= WINDOW_S) continue;
    const idx = WINDOW_S - 1 - ageS;
    buckets[idx].total++;
    if (e.status >= 500 || e.status === 0) buckets[idx].errors++;
  }
  return buckets;
}

interface P99Bucket {
  p99: number | null;
}

function buildP99Buckets(
  events: ReturnType<typeof useClusterState>['events'],
): P99Bucket[] {
  const numBuckets = Math.ceil(WINDOW_S / P99_BUCKET_S);
  const samples: number[][] = Array.from({ length: numBuckets }, () => []);
  const now = Date.now();
  for (const e of events) {
    const ts = Date.parse(e.ts);
    if (!Number.isFinite(ts)) continue;
    const ageS = Math.floor((now - ts) / 1000);
    if (ageS < 0 || ageS >= WINDOW_S) continue;
    const bucketIdx = numBuckets - 1 - Math.floor(ageS / P99_BUCKET_S);
    if (bucketIdx < 0 || bucketIdx >= numBuckets) continue;
    samples[bucketIdx].push(e.durationMs);
  }
  return samples.map((arr) => {
    if (arr.length === 0) return { p99: null };
    const sorted = arr.slice().sort((a, b) => a - b);
    const idx = Math.max(0, Math.ceil(sorted.length * 0.99) - 1);
    return { p99: sorted[idx] };
  });
}

function RpsChart({
  buckets,
  totalReq,
  errRate,
}: {
  buckets: RpsBucket[];
  totalReq: number;
  errRate: number;
}) {
  const maxBucket = Math.max(1, ...buckets.map((b) => b.total));
  const width = 600;
  const height = 120;
  const barWidth = width / buckets.length;

  return (
    <div className="rounded-md border border-white/[0.06] bg-black/30 p-5 font-mono">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <div className="text-[10px] text-muted/70 uppercase tracking-widest">
            Requests / second
          </div>
          <div className="text-2xl text-primary tabular-nums font-bold">
            {(totalReq / WINDOW_S).toFixed(1)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-muted/70 uppercase tracking-widest">
            Error rate
          </div>
          <div
            className={`text-2xl tabular-nums font-bold ${
              errRate > 10
                ? 'text-error'
                : errRate > 1
                  ? 'text-warning'
                  : 'text-success'
            }`}
          >
            {errRate.toFixed(1)}%
          </div>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-24"
        preserveAspectRatio="none"
      >
        {buckets.map((b, i) => {
          if (b.total === 0) return null;
          const h = (b.total / maxBucket) * (height - 4);
          const errH = (b.errors / maxBucket) * (height - 4);
          const x = i * barWidth;
          const y = height - h;
          return (
            <g key={i}>
              <rect
                x={x + 0.5}
                y={y}
                width={barWidth - 1}
                height={h}
                fill="rgb(91 63 214 / 0.6)"
              />
              {errH > 0 && (
                <rect
                  x={x + 0.5}
                  y={height - errH}
                  width={barWidth - 1}
                  height={errH}
                  fill="rgb(220 38 38 / 0.85)"
                />
              )}
            </g>
          );
        })}
        <line x1={0} y1={height - 0.5} x2={width} y2={height - 0.5} stroke="rgb(255 255 255 / 0.1)" />
      </svg>

      <div className="flex justify-between text-[9px] text-muted/50 mt-1 tabular-nums">
        <span>-{WINDOW_S}s</span>
        <span>now</span>
      </div>
    </div>
  );
}

function P99Chart({
  buckets,
  liveP99,
}: {
  buckets: P99Bucket[];
  liveP99: number;
}) {
  const filled = buckets.filter((b) => b.p99 != null);
  const maxP99 = Math.max(50, ...filled.map((b) => b.p99 ?? 0));
  const width = 600;
  const height = 120;
  const stepX = width / (buckets.length - 1 || 1);

  const points = buckets
    .map((b, i) => (b.p99 == null ? null : { x: i * stepX, y: height - (b.p99 / maxP99) * (height - 8) - 4 }))
    .filter(Boolean) as Array<{ x: number; y: number }>;

  const polyline =
    points.length > 0
      ? points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
      : '';

  return (
    <div className="rounded-md border border-white/[0.06] bg-black/30 p-5 font-mono">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <div className="text-[10px] text-muted/70 uppercase tracking-widest">
            Response time (p99)
          </div>
          <div className="text-2xl text-primary tabular-nums font-bold">
            {liveP99.toFixed(0)}ms
          </div>
        </div>
        <div className="text-right text-[10px] text-muted/70 tabular-nums">
          peak {maxP99.toFixed(0)}ms · trailing {WINDOW_S}s
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-24"
        preserveAspectRatio="none"
      >
        <line x1={0} y1={height - 0.5} x2={width} y2={height - 0.5} stroke="rgb(255 255 255 / 0.1)" />
        {points.length > 0 && (
          <polyline
            fill="none"
            stroke="rgb(91 63 214)"
            strokeWidth={2}
            points={polyline}
          />
        )}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={2.5} fill="rgb(91 63 214)" />
        ))}
      </svg>

      <div className="flex justify-between text-[9px] text-muted/50 mt-1 tabular-nums">
        <span>-{WINDOW_S}s</span>
        <span>now</span>
      </div>
    </div>
  );
}
