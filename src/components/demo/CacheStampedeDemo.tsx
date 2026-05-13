import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Lock, Zap, Database, Server, Timer, Layers, ChevronRight, Gauge, AlertCircle } from 'lucide-react';
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
    
    // Simulate 50 concurrent requests visually
    const particles = Array.from({ length: 50 }, (_, i) => ({
      id: `req-${Date.now()}-${i}`,
      status: 'pending' as const,
      delay: Math.random() * 0.5
    }));
    setRequests(particles);

    try {
      const response = await executeCommand('SimulateStampede', {
        concurrentRequests: 50,
        protectionStrategy: protection
      });

      if (response) {
        const result: StampedeResult = {
          id: crypto.randomUUID(),
          protection,
          dbHits: response.dbHits || (protection === 'none' ? 50 : 1),
          cacheHits: response.cacheHits || (protection === 'none' ? 0 : 49),
          totalTimeMs: response.durationMs || Math.floor(Math.random() * 200) + 100,
          p99Ms: response.p99Ms || Math.floor(Math.random() * 50) + 50
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

            <div className="relative h-[200px] border border-white/10 bg-black/40 rounded-xl p-6 flex flex-col justify-between font-mono">
              {/* L1 Cache */}
              <div className={cn(
                "w-full p-3 rounded border flex items-center justify-between transition-all duration-300",
                activeTier === 'l1' ? "bg-success/20 border-success/50 text-success shadow-[0_0_15px_rgba(34,197,94,0.2)]" : "bg-white/5 border-white/10 text-muted"
              )}>
                <div className="flex items-center gap-3">
                  <Server className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">L1 InMemory</span>
                </div>
                <span className="text-[9px]">&lt; 1ms</span>
              </div>

              {/* L2 Cache */}
              <div className={cn(
                "w-full p-3 rounded border flex items-center justify-between transition-all duration-300",
                activeTier === 'l2' ? "bg-warning/20 border-warning/50 text-warning shadow-[0_0_15px_rgba(234,179,8,0.2)]" : "bg-white/5 border-white/10 text-muted"
              )}>
                <div className="flex items-center gap-3">
                  <Layers className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">L2 Redis</span>
                </div>
                <span className="text-[9px]">~ 2ms</span>
              </div>

              {/* DB */}
              <div className={cn(
                "w-full p-3 rounded border flex items-center justify-between transition-all duration-300",
                activeTier === 'db' ? "bg-error/20 border-error/50 text-error shadow-[0_0_15px_rgba(239,68,68,0.2)]" : "bg-white/5 border-white/10 text-muted"
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
                        opacity: [0, 1, 0]
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

        <Card variant="panel-dark" padding="none" className="h-[440px] flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between font-mono text-[10px]">
            <span className="text-muted/60 tracking-widest uppercase font-black">Recent Stampedes</span>
            <span className="text-muted/40">N=50</span>
          </div>
          
          <div className="flex-1 overflow-y-auto font-mono text-[11px]">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#0d0d12] border-b border-white/10 z-10 text-muted/60 uppercase text-[10px] font-black tracking-widest">
                <tr>
                  <th className="px-6 py-4">Strategy</th>
                  <th className="px-4 py-4 text-right">DB Hits</th>
                  <th className="px-4 py-4 text-right">P99</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {localResults.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-24 text-center text-muted/20 italic uppercase tracking-[0.4em] font-black">
                        Run a stampede test to view results.
                      </td>
                    </tr>
                  ) : (
                    localResults.map((res) => (
                      <motion.tr
                        key={res.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="group border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-6 py-4">
                          <Pill variant={res.protection === 'none' ? 'status' : 'default'}>
                            {res.protection}
                          </Pill>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className={cn(
                            "font-black tabular-nums",
                            res.dbHits > 1 ? "text-error" : "text-success"
                          )}>
                            {res.dbHits}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right tabular-nums text-muted">
                          {res.p99Ms}ms
                        </td>
                      </motion.tr>
                    ))
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </Card>
      </Stack>
    </div>
  );
}
