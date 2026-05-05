import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Fingerprint,
  Database,
  RefreshCcw,
  Key,
  Server,
  Zap,
  Loader2,
  Trophy,
  Copy,
  Swords,
} from 'lucide-react';
import { useDemoSession } from '../../hooks/useDemoSession';

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:5050';

type LogStatus = 'created' | 'replay-cached' | 'replay-after-expiry' | 'race-winner' | 'race-loser' | 'error';

interface RequestLog {
  id: string;
  timestamp: Date;
  status: LogStatus;
  key: string;
  orderId?: string;
  latencyMs?: number;
}

interface ProcessResult {
  result: { orderId: string; status: string; processedAt: string };
  isDuplicate: boolean;
  isWinner: boolean;
  cacheAgeSeconds: number;
  expiresInSeconds: number;
  ttlSeconds: number;
}

interface RaceOutcome {
  requestIndex: number;
  isWinner: boolean;
  orderId: string;
  latencyMs: number;
}

interface RaceResponse {
  key: string;
  count: number;
  ttlSeconds: number;
  outcomes: RaceOutcome[];
}

const TTL_PRESETS = [10, 30, 120] as const;
type TtlPreset = (typeof TTL_PRESETS)[number];

export function IdempotencyDemo() {
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    crypto.randomUUID().split('-')[0].toUpperCase(),
  );
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [winnerOrderId, setWinnerOrderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRacing, setIsRacing] = useState(false);
  const [ttlPreset, setTtlPreset] = useState<TtlPreset>(30);
  const [expiresInSeconds, setExpiresInSeconds] = useState(0);
  const [lastRace, setLastRace] = useState<RaceResponse | null>(null);

  const { sessionId } = useDemoSession('idempotency');
  const expiryDeadline = useRef<number>(0);

  const generateKey = () => {
    setIdempotencyKey(crypto.randomUUID().split('-')[0].toUpperCase());
    setExpiresInSeconds(0);
    setWinnerOrderId(null);
    setLastRace(null);
  };

  // Tick down expiry from a wall-clock deadline so the countdown is honest
  // even if the page was backgrounded or a Race ran for a few hundred ms.
  useEffect(() => {
    if (expiresInSeconds <= 0) return;
    const id = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((expiryDeadline.current - Date.now()) / 1000));
      setExpiresInSeconds(remaining);
    }, 250);
    return () => clearInterval(id);
  }, [expiresInSeconds > 0]);

  const sendRequest = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/demo/idempotency/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Demo-Session': sessionId,
          'X-Idempotency-Key': idempotencyKey,
          'X-Idempotency-Ttl-Seconds': String(ttlPreset),
        },
        body: JSON.stringify({ action: 'CreateOrder', payload: { item: 'Widget', quantity: 1 } }),
      });
      const data = (await response.json()) as ProcessResult;

      const status: LogStatus = data.isDuplicate
        ? 'replay-cached'
        : winnerOrderId && winnerOrderId !== data.result.orderId
        ? 'replay-after-expiry'
        : 'created';

      setLogs((prev) =>
        [
          {
            id: crypto.randomUUID(),
            timestamp: new Date(),
            status,
            key: idempotencyKey,
            orderId: data.result.orderId,
          },
          ...prev,
        ].slice(0, 16),
      );

      // Track first-known winner so we can detect "replay after expiry" later.
      if (!data.isDuplicate) {
        setWinnerOrderId(data.result.orderId);
      }

      expiryDeadline.current = Date.now() + data.expiresInSeconds * 1000;
      setExpiresInSeconds(data.expiresInSeconds);
    } catch {
      setLogs((prev) =>
        [
          {
            id: crypto.randomUUID(),
            timestamp: new Date(),
            status: 'error' as const,
            key: idempotencyKey,
          },
          ...prev,
        ].slice(0, 16),
      );
    } finally {
      setIsLoading(false);
    }
  }, [idempotencyKey, sessionId, ttlPreset, winnerOrderId]);

  const fireRace = useCallback(async () => {
    setIsRacing(true);
    setLastRace(null);
    try {
      const response = await fetch(`${API_URL}/api/demo/idempotency/race`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Demo-Session': sessionId,
        },
        body: JSON.stringify({ key: idempotencyKey, count: 4, ttlSeconds: ttlPreset }),
      });
      const data = (await response.json()) as RaceResponse;
      setLastRace(data);

      const winner = data.outcomes.find((o) => o.isWinner);
      if (winner) {
        setWinnerOrderId(winner.orderId);
      }
      expiryDeadline.current = Date.now() + data.ttlSeconds * 1000;
      setExpiresInSeconds(data.ttlSeconds);

      // Each outcome becomes an audit-trail entry, preserving original order.
      const raceLogs: RequestLog[] = data.outcomes.map((o) => ({
        id: crypto.randomUUID(),
        timestamp: new Date(),
        status: o.isWinner ? 'race-winner' : 'race-loser',
        key: idempotencyKey,
        orderId: o.orderId,
        latencyMs: o.latencyMs,
      }));
      setLogs((prev) => [...raceLogs, ...prev].slice(0, 16));
    } catch {
      // ignore — UI shows previous state
    } finally {
      setIsRacing(false);
    }
  }, [idempotencyKey, sessionId, ttlPreset]);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 1,
    });

  const totalRequests = logs.length;
  const uniqueOrders = new Set(
    logs.filter((l) => l.status === 'created' || l.status === 'replay-after-expiry' || l.status === 'race-winner').map((l) => l.orderId),
  ).size;

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2.5">
            <Fingerprint className="w-4 h-4 text-accent" />
            Idempotency keys
          </h3>
        </div>

        <div className="surface p-8 shadow-2xl space-y-8 font-mono">
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-[0.4em] text-muted/60">
              Request_Header: X-Idempotency-Key
            </label>
            <div className="flex gap-2 p-1 bg-white/5 border border-white/5 rounded-2xl">
              <div className="flex-1 bg-black/40 px-6 py-4 rounded-xl font-mono text-base text-primary flex items-center justify-between shadow-inner">
                <span className="font-bold tracking-widest">{idempotencyKey}</span>
                <Key className="w-5 h-5 opacity-20" />
              </div>
              <button
                onClick={generateKey}
                disabled={isLoading || isRacing}
                className="focus-ring p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors disabled:opacity-20"
              >
                <RefreshCcw className="w-5 h-5" />
              </button>
            </div>
          </div>

          <details className="space-y-3 group/details">
            <summary className="text-[10px] font-black uppercase tracking-[0.4em] text-muted/60 cursor-pointer hover:text-secondary transition-colors list-none flex items-center gap-2">
              <span className="w-1 h-1 bg-accent rounded-full group-open/details:bg-success" />
              Advanced: Cache TTL Configuration
            </summary>
            <div className="pt-4 space-y-3">
              <div className="flex gap-2">
                {TTL_PRESETS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTtlPreset(t)}
                    disabled={isLoading || isRacing}
                    className={`focus-ring flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                      ttlPreset === t
                        ? 'bg-accent border-accent text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]'
                        : 'bg-white/5 border-white/5 text-muted hover:text-secondary hover:bg-white/10'
                    } disabled:opacity-30`}
                  >
                    {t}s
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted/60 leading-relaxed">
                Lower TTL → replays after expiry produce a NEW order. Higher TTL → replays return the cached one.
              </p>
            </div>
          </details>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={sendRequest}
              disabled={isLoading || isRacing}
              title="Sends a real order to the database. The system uses the key above to ensure we never bill you twice."
              className="focus-ring py-4 bg-white text-black font-black text-xs uppercase rounded-2xl tracking-widest hover:bg-slate-100 transition-all disabled:opacity-30 flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-current" />}
              Send request
            </button>
            <button
              onClick={fireRace}
              disabled={isLoading || isRacing}
              title="Fires 4 concurrent requests with the same idempotency key. Exactly one wins; the others read the winner's response. Reversible — clears the entry first."
              aria-label="Fire four concurrent requests with the same idempotency key"
              className="focus-ring py-4 bg-warning/10 hover:bg-warning/15 border border-warning/30 text-warning font-black text-xs uppercase tracking-widest rounded-2xl transition-all disabled:opacity-30 flex items-center justify-center gap-2"
            >
              {isRacing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Swords className="w-4 h-4" />}
              {isRacing ? 'Racing…' : 'Fire 4 in parallel'}
            </button>
          </div>

          <div className="space-y-6 pt-6 border-t border-white/5">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <Database className="w-4 h-4 text-muted/60" />
                <span className="text-[11px] font-bold text-secondary uppercase tracking-[0.2em]">
                  Key cache
                </span>
              </div>
              <AnimatePresence>
                {expiresInSeconds > 0 && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[10px] font-black text-success tracking-widest"
                  >
                    Key active
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            <div className="glass-subtle p-6 relative overflow-hidden min-h-[80px] flex flex-col justify-center">
              {expiresInSeconds > 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4 relative z-10"
                >
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                    <span className="text-secondary opacity-60">IDM_KEY: {idempotencyKey}</span>
                    <span className="text-warning tabular-nums">{expiresInSeconds}S_TTL</span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-success/60 shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                      animate={{ width: `${Math.max(0, (expiresInSeconds / ttlPreset) * 100)}%` }}
                      transition={{ duration: 0.25, ease: 'linear' }}
                    />
                  </div>
                </motion.div>
              ) : (
                <div className="text-center text-[11px] text-muted/40 italic">
                  Cache empty — first request will create a new entry.
                </div>
              )}
            </div>
          </div>

          <AnimatePresence>
            {lastRace && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="surface p-5 border border-warning/20 space-y-4"
              >
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.25em]">
                  <span className="text-warning">Race outcome — {lastRace.count} concurrent</span>
                  <span className="text-muted">key {lastRace.key}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {lastRace.outcomes.map((o) => (
                    <div
                      key={o.requestIndex}
                      className={`p-3 rounded-xl border ${
                        o.isWinner
                          ? 'border-success/40 bg-success/10'
                          : 'border-white/5 bg-white/[0.02]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] uppercase tracking-widest text-muted/50">
                          req {o.requestIndex}
                        </span>
                        {o.isWinner ? (
                          <Trophy className="w-3 h-3 text-success" />
                        ) : (
                          <Copy className="w-3 h-3 text-muted/60" />
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-secondary truncate">
                        {o.orderId.slice(0, 8)}…
                      </div>
                      <div className="text-[9px] text-muted/60 mt-1 tabular-nums">{o.latencyMs}ms</div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted/60 leading-relaxed">
                  One request creates the order; the rest read the winner&apos;s response.
                  Every loser&apos;s order id matches the winner&apos;s.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-2 gap-6 font-mono">
          <div className="surface p-6 flex flex-col items-center">
            <div className="text-3xl font-black text-primary tabular-nums tracking-tighter leading-none">
              {totalRequests.toString().padStart(2, '0')}
            </div>
            <div className="text-[9px] uppercase font-bold text-muted tracking-widest mt-2">
              Total_Requests
            </div>
          </div>
          <div className="surface p-6 flex flex-col items-center">
            <div className="text-3xl font-black text-success tabular-nums tracking-tighter leading-none">
              {uniqueOrders.toString().padStart(2, '0')}
            </div>
            <div className="text-[9px] uppercase font-bold text-muted tracking-widest mt-2">
              Unique_Commits
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-sm font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2.5">
          <Server className="w-4 h-4 text-muted" />
          Audit log
        </h3>

        <div className={`surface shadow-2xl h-[620px] flex flex-col overflow-hidden transition-all duration-500 ${isRacing ? 'border-error/40 ring-4 ring-error/5 shadow-[0_0_30px_rgba(239,68,68,0.1)]' : ''}`}>
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between font-mono text-[10px]">
            <span className="text-muted/60 tracking-widest uppercase font-black flex items-center gap-2">
              Recent requests 
              {isRacing && <span className="text-error animate-pulse">[RACING]</span>}
            </span>
            <Fingerprint className="w-4 h-4 text-accent/20" />
          </div>

          <div className="flex-1 overflow-y-auto font-mono text-[11px]">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#0d0d12] border-b border-white/10 z-10 text-muted/60 uppercase text-[10px] font-black tracking-widest">
                <tr>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4 text-right">State</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {logs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="py-24 text-center text-muted/20 italic uppercase tracking-[0.4em] font-black"
                      >
                        Fire a request from the controls above — this log will populate in real-time.
                      </td>
                    </tr>
                  ) : (
                    logs.map((req) => (
                      <motion.tr
                        key={req.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="group border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-6 py-4 text-muted/50 text-[10px]">[{formatTime(req.timestamp)}]</td>
                        <td className="px-6 py-4">
                          <ActionLabel status={req.status} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <StateBadge req={req} />
                        </td>
                      </motion.tr>
                    ))
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          <div className="p-6 glass-subtle border-t border-white/5 font-mono">
            <p className="text-[10px] text-muted/50 leading-relaxed uppercase tracking-widest text-center italic">
              Atomic claim via ConcurrentDictionary.AddOrUpdate. TTL: {ttlPreset}s.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionLabel({ status }: { status: LogStatus }) {
  const tone =
    status === 'created' || status === 'race-winner' || status === 'replay-after-expiry'
      ? 'text-success'
      : status === 'replay-cached' || status === 'race-loser'
      ? 'text-warning'
      : 'text-error';
  const label =
    status === 'created'
      ? 'Order Created (First hit)'
      : status === 'replay-cached'
      ? 'Replay (cached)'
      : status === 'replay-after-expiry'
      ? 'Replay after expiry'
      : status === 'race-winner'
      ? 'Race winner'
      : status === 'race-loser'
      ? 'Race loser'
      : 'Error';
  return <span className={`font-black uppercase tracking-tighter ${tone}`}>{label}</span>;
}

function StateBadge({ req }: { req: RequestLog }) {
  const isCacheHit = req.status === 'replay-cached' || req.status === 'race-loser';
  const isCommit = req.status === 'created' || req.status === 'race-winner' || req.status === 'replay-after-expiry';

  const tone = isCacheHit
    ? 'border-warning/30 bg-warning/10 text-warning'
    : isCommit
    ? 'border-success/30 bg-success/10 text-success'
    : 'border-error/30 bg-error/10 text-error';
  const label = isCacheHit
    ? 'Cache hit'
    : isCommit
    ? 'DB write'
    : 'Failure';

  return (
    <span
      className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-tighter ${tone}`}
    >
      {label}
      {req.latencyMs !== undefined && <span className="opacity-60 ml-2">{req.latencyMs}ms</span>}
    </span>
  );
}
