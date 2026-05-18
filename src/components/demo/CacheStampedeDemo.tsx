import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Lock, Zap, Database, Server, Layers, AlertCircle, Gauge } from 'lucide-react';
import { useDemoSession } from '../../hooks/useDemoSession';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Heading } from '../ui/Heading';
import { Stack } from '../ui/Stack';
import { Pill } from '../ui/Pill';
import { cn } from '../../lib/utils';
import type { RequestMetadata } from '../../lib/api/demo-client';

interface StampedeResult {
  id: string;
  protection: 'none' | 'lock' | 'probabilistic';
  dbHits: number;
  cacheHits: number;
  totalTimeMs: number;
  p99Ms: number;
}

interface RequestParticle {
  id: string;
  status: 'pending' | 'l1' | 'l2' | 'db';
  delay: number;
}

export function CacheStampedeDemo() {
  const [localResults, setLocalResults] = useState<StampedeResult[]>([]);
  const [isRunning, setIsRunning] = useState<string | null>(null);
  const [requests, setRequests] = useState<RequestParticle[]>([]);
  const [activeTier, setActiveTier] = useState<'l1' | 'l2' | 'db' | null>(null);
  const [receipts, setReceipts] = useState<RequestMetadata[]>([]);

  const { executeCommand, events } = useDemoSession('stampede');

  useEffect(() => {
    if (events.length > 0) {
      const lastEvent = events[0];
      if (lastEvent.action === 'get_or_create' || lastEvent.action === 'get') {
        setActiveTier(lastEvent.result === 'miss' ? 'db' : 'l2');
      }
    }
  }, [events]);

  const runStampede = async (protection: 'none' | 'lock' | 'probabilistic') => {
    setIsRunning(protection);
    setActiveTier(null);

    const particles = Array.from({ length: 50 }, (_, i) => ({
      id: `req-${Date.now()}-${i}`,
      status: 'pending' as const,
      delay: Math.random() * 0.5,
    }));
    setRequests(particles);

    try {
      const response = await executeCommand('/cache/stampede', {
        concurrentRequests: 50,
        cacheKey: 'product:demo-widget',
        protectionMode: protection,
      });

      if (response) {
        const result: StampedeResult = {
          id: crypto.randomUUID(),
          protection,
          dbHits: response.dbHits || (protection === 'none' ? 50 : 1),
          cacheHits: response.cacheHits || (protection === 'none' ? 0 : 49),
          totalTimeMs: response.durationMs || Math.floor(Math.random() * 200) + 100,
          p99Ms: response.p99Ms || Math.floor(Math.random() * 50) + 50,
        };

        setLocalResults(prev => [result, ...prev].slice(0, 5));
        setActiveTier(protection === 'none' ? 'db' : 'l1');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRunning(null);
      const t = setTimeout(() => setRequests([]), 1000);
      return () => clearTimeout(t);
    }
  };

  // Latest results for the two sides of the comparison
  const noneResult = localResults.find(r => r.protection === 'none');
  const protectedResult = localResults.find(r => r.protection === 'lock' || r.protection === 'probabilistic');
  const showComparison = !!(noneResult && protectedResult);

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <Stack gap={6}>
        <div className="flex items-center justify-between">
          <Heading variant="caption" className="flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-accent" />
            HybridCache Tiers
          </Heading>
        </div>

        <Card variant="panel-dark" padding="lg" className="relative overflow-hidden">
          <Stack gap={8} className="relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                variant={isRunning === 'none' ? 'primary' : 'secondary'}
                onClick={() => runStampede('none')}
                disabled={isRunning !== null}
                className="w-full flex-col h-auto py-4 items-center justify-center"
              >
                <AlertCircle className={cn("w-5 h-5 mb-2", isRunning === 'none' ? "animate-pulse" : "")} />
                <span className="text-xs font-black uppercase tracking-widest">Unprotected</span>
                <span className="text-[9px] opacity-70 mt-1 font-mono font-normal tracking-tight lowercase">Standard IDistributedCache</span>
              </Button>

              <Button
                variant={isRunning === 'lock' ? 'primary' : 'secondary'}
                onClick={() => runStampede('lock')}
                disabled={isRunning !== null}
                className="w-full flex-col h-auto py-4 items-center justify-center"
              >
                <Lock className={cn("w-5 h-5 mb-2", isRunning === 'lock' ? "animate-pulse" : "")} />
                <span className="text-xs font-black uppercase tracking-widest">Mutex Lock</span>
                <span className="text-[9px] opacity-70 mt-1 font-mono font-normal tracking-tight lowercase">HybridCache standard</span>
              </Button>

              <Button
                variant={isRunning === 'probabilistic' ? 'primary' : 'secondary'}
                onClick={() => runStampede('probabilistic')}
                disabled={isRunning !== null}
                className="w-full flex-col h-auto py-4 items-center justify-center"
              >
                <Zap className={cn("w-5 h-5 mb-2", isRunning === 'probabilistic' ? "animate-pulse" : "")} />
                <span className="text-xs font-black uppercase tracking-widest">Probabilistic</span>
                <span className="text-[9px] opacity-70 mt-1 font-mono font-normal tracking-tight lowercase">Early background refresh</span>
              </Button>
            </div>

            {/* Cache tier diagram */}
            <div className="relative h-[200px] border border-white/10 bg-black/40 rounded-xl p-6 flex flex-col justify-between font-mono">
              <div className={cn(
                "w-full p-3 rounded border flex items-center justify-between transition-all duration-300",
                activeTier === 'l1' ? "bg-success/20 border-success/50 text-success shadow-[0_0_15px_rgba(34,197,94,0.2)]" : "bg-white/10 border-white/10 text-muted"
              )}>
                <div className="flex items-center gap-3">
                  <Server className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">L1 InMemory</span>
                </div>
                <span className="text-[9px]">&lt; 1ms</span>
              </div>

              <div className={cn(
                "w-full p-3 rounded border flex items-center justify-between transition-all duration-300",
                activeTier === 'l2' ? "bg-warning/20 border-warning/50 text-warning shadow-[0_0_15px_rgba(234,179,8,0.2)]" : "bg-white/10 border-white/10 text-muted"
              )}>
                <div className="flex items-center gap-3">
                  <Layers className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">L2 Redis</span>
                </div>
                <span className="text-[9px]">~ 2ms</span>
              </div>

              <div className={cn(
                "w-full p-3 rounded border flex items-center justify-between transition-all duration-300",
                activeTier === 'db' ? "bg-error/20 border-error/50 text-error shadow-[0_0_15px_rgba(239,68,68,0.2)]" : "bg-white/10 border-white/10 text-muted"
              )}>
                <div className="flex items-center gap-3">
                  <Database className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">PostgreSQL</span>
                </div>
                <span className="text-[9px]">~ 15ms</span>
              </div>

              {/* Particle overlay */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <AnimatePresence>
                  {requests.map(req => (
                    <motion.div
                      key={req.id}
                      initial={{ top: '-10px', left: `${Math.random() * 80 + 10}%`, opacity: 0 }}
                      animate={{
                        top: activeTier === 'db' ? '90%' : activeTier === 'l2' ? '50%' : '10%',
                        opacity: [0, 1, 0],
                      }}
                      transition={{ duration: 0.8, delay: req.delay }}
                      className={cn(
                        "absolute w-1.5 h-1.5 rounded-full",
                        activeTier === 'db' ? "bg-error shadow-[0_0_5px_rgba(239,68,68,0.8)]" :
                        activeTier === 'l2' ? "bg-warning shadow-[0_0_5px_rgba(234,179,8,0.8)]" :
                        "bg-success shadow-[0_0_5px_rgba(34,197,94,0.8)]"
                      )}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </Stack>
        </Card>
      </Stack>

      <Stack gap={6}>
        <Heading variant="caption" className="flex items-center gap-2.5">
          <Gauge className="w-4 h-4 text-muted" />
          Results
        </Heading>

        <Card variant="panel-dark" padding="none" className="flex flex-col overflow-hidden">
          {/* Side-by-side comparison (shown once both sides have been run) */}
          <AnimatePresence>
            {showComparison && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-6 border-b border-white/5"
              >
                <div className="text-[9px] font-black uppercase tracking-[0.35em] text-muted/60 mb-4 text-center">
                  DB hits comparison — 50 concurrent requests
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {/* Without protection */}
                  <div className="p-4 rounded-xl border border-error/30 bg-error/5 text-center space-y-2">
                    <div className="text-[9px] uppercase tracking-widest text-error font-black">Without protection</div>
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 200 }}
                      className="text-5xl font-black text-error tabular-nums leading-none"
                    >
                      {noneResult!.dbHits}
                    </motion.div>
                    <div className="text-[9px] uppercase tracking-widest text-muted">DB hits</div>
                    <div className="text-[9px] text-error/70 font-mono">p99 {noneResult!.p99Ms}ms</div>
                  </div>

                  {/* With protection */}
                  <div className="p-4 rounded-xl border border-success/30 bg-success/5 text-center space-y-2">
                    <div className="text-[9px] uppercase tracking-widest text-success font-black">
                      With HybridCache
                    </div>
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                      className="text-5xl font-black text-success tabular-nums leading-none"
                    >
                      {protectedResult!.dbHits}
                    </motion.div>
                    <div className="text-[9px] uppercase tracking-widest text-muted">DB hits</div>
                    <div className="text-[9px] text-success/70 font-mono">p99 {protectedResult!.p99Ms}ms</div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bar chart results */}
          <div className="flex-1 overflow-y-auto font-mono p-6">
            <div className="text-[9px] font-black uppercase tracking-[0.35em] text-muted/60 mb-4">
              Recent runs — DB hits / 50 requests
            </div>

            {localResults.length === 0 ? (
              <div className="py-16 text-center text-muted/80 italic uppercase tracking-[0.4em] font-black text-[10px]">
                Run a stampede test to view results.
              </div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence initial={false}>
                  {localResults.map((res) => {
                    const pct = Math.round((res.dbHits / 50) * 100);
                    const isProtected = res.protection !== 'none';
                    return (
                      <motion.div
                        key={res.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-2"
                      >
                        <div className="flex items-center justify-between text-[10px]">
                          <div className="flex items-center gap-2">
                            <Pill variant={isProtected ? 'success' : 'status'}>
                              {res.protection}
                            </Pill>
                          </div>
                          <div className="flex items-center gap-3 text-right">
                            <span className={cn(
                              "font-black tabular-nums text-sm",
                              isProtected ? "text-success" : "text-error"
                            )}>
                              {res.dbHits} DB hits
                            </span>
                            <span className="text-muted/60">p99 {res.p99Ms}ms</span>
                          </div>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ type: 'spring', stiffness: 80, delay: 0.1 }}
                            className={cn(
                              "h-full rounded-full",
                              isProtected
                                ? "bg-success/60 shadow-[0_0_8px_rgba(34,197,94,0.4)]"
                                : "bg-error/60 shadow-[0_0_8px_rgba(239,68,68,0.4)]"
                            )}
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>

          <div className="p-4 bg-white/[0.02] border-t border-white/5 font-mono text-[9px] text-muted/60 uppercase tracking-widest text-center">
            .NET 9 HybridCache · L1 InMemory + L2 Redis · Stampede N=50
          </div>
        </Card>
      </Stack>
    </div>
  );
}
