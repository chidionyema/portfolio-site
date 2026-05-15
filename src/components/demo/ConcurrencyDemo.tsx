import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCcw, Activity, ShieldAlert, GitCommit, ListEnd, ShieldCheck, Play } from 'lucide-react';
import { useDemoSession } from '../../hooks/useDemoSession';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Heading } from '../ui/Heading';
import { Stack } from '../ui/Stack';
import { Pill } from '../ui/Pill';
import { cn } from '../../lib/utils';
import type { RequestMetadata } from '../../lib/api/demo-client';

interface ConcurrencyResult {
  id: string;
  timestamp: Date;
  status: 'success' | 'conflict' | 'error';
  workerId: number;
  newVersion: number;
}

export function ConcurrencyDemo() {
  const [logs, setLogs] = useState<ConcurrencyResult[]>([]);
  const [currentVersion, setCurrentVersion] = useState(1);
  const [isRacing, setIsRacing] = useState(false);
  const [receipts, setReceipts] = useState<RequestMetadata[]>([]);

  const { executeCommand, events } = useDemoSession('concurrency');

  useEffect(() => {
    if (events.length > 0) {
      const lastEvent = events[0];
      if (lastEvent.version) {
        setCurrentVersion(lastEvent.version as number);
      }
    }
  }, [events]);

  const sendRequest = async (workerId: number) => {
    try {
      const res = await executeCommand('/cache/product/demo', {}, {method: 'GET'});
      
      const success = res?.success;
      setLogs(prev => [{
        id: crypto.randomUUID(),
        timestamp: new Date(),
        status: success ? 'success' : 'conflict',
        workerId,
        newVersion: success ? res?.newVersion || currentVersion + 1 : currentVersion
      }, ...prev].slice(0, 10));

      if (success && res?.newVersion) {
        setCurrentVersion(res.newVersion);
      }

      if (res?.metadata) setReceipts(prev => [res.metadata, ...prev].slice(0, 5));
    } catch (e) {
      setLogs(prev => [{
        id: crypto.randomUUID(),
        timestamp: new Date(),
        status: 'error',
        workerId,
        newVersion: currentVersion
      }, ...prev].slice(0, 10));
    }
  };

  const fireRace = useCallback(async () => {
    setIsRacing(true);
    // Fire 3 workers nearly simultaneously to trigger OptimisticConcurrencyException
    await Promise.allSettled([
      sendRequest(1),
      new Promise(r => setTimeout(r, 10)).then(() => sendRequest(2)),
      new Promise(r => setTimeout(r, 20)).then(() => sendRequest(3))
    ]);
    setIsRacing(false);
  }, [currentVersion, executeCommand]);

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <Stack gap={6}>
        <div className="flex items-center justify-between">
          <Heading variant="caption" className="flex items-center gap-2.5">
            <GitCommit className="w-4 h-4 text-accent" />
            Entity Versioning
          </Heading>
        </div>

        <Card variant="panel-dark" padding="lg">
          <Stack gap={8} className="font-mono">
            <Stack gap={4}>
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted/90">
                <span>Postgres Row State</span>
                <Pill variant="status">
                  xmin tracked
                </Pill>
              </div>

              <div className="p-6 rounded-xl border relative overflow-hidden transition-colors bg-black/40 border-white/5 flex items-center justify-between">
                <div className="space-y-1 z-10">
                  <div className="text-[10px] uppercase tracking-widest text-muted">Product ID</div>
                  <div className="text-sm font-black">prod_demo_123</div>
                </div>
                
                <div className="space-y-1 z-10 text-right">
                  <div className="text-[10px] uppercase tracking-widest text-muted">Row Version (xmin)</div>
                  <div className="text-3xl font-black text-primary tabular-nums">
                    v{currentVersion}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-white/10 border border-white/10 flex items-start gap-3">
                <ListEnd className="w-4 h-4 text-muted shrink-0 mt-0.5" />
                <p className="text-[10px] leading-relaxed text-muted uppercase tracking-widest">
                  EF Core uses a hidden xmin column as a concurrency token. Updates check "WHERE id = X AND xmin = Y".
                </p>
              </div>
            </Stack>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="primary"
                onClick={() => sendRequest(0)}
                disabled={isRacing}
                className="w-full h-auto py-4 font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2"
              >
                Single Update
              </Button>
              <Button
                variant="secondary"
                onClick={fireRace}
                disabled={isRacing}
                className="w-full h-auto py-4 font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 border-warning/30 text-warning hover:bg-warning/10"
              >
                {isRacing ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Race 3 Workers
              </Button>
            </div>
          </Stack>
        </Card>
      </Stack>

      <Stack gap={6}>
        <Heading variant="caption" className="flex items-center gap-2.5">
          <Activity className="w-4 h-4 text-muted" />
          Commit Log
        </Heading>

        <Card variant="panel-dark" padding="none" className="h-[440px] flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto font-mono text-[11px]">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#0d0d12] border-b border-white/10 z-10 text-muted/90 uppercase text-[10px] font-black tracking-widest">
                <tr>
                  <th className="px-6 py-4">Worker</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-24 text-center text-muted/80 italic uppercase tracking-[0.4em] font-black">
                        Trigger an update to view results
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <motion.tr
                        key={log.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="group border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-6 py-4 text-muted/80 font-black">
                          Worker {log.workerId}
                        </td>
                        <td className="px-6 py-4">
                          {log.status === 'success' ? (
                            <span className="text-success uppercase font-black tracking-wider flex items-center gap-2">
                              <ShieldCheck className="w-3 h-3" />
                              Committed v{log.newVersion}
                            </span>
                          ) : log.status === 'conflict' ? (
                            <span className="text-warning uppercase font-black tracking-wider flex items-center gap-2">
                              <ShieldAlert className="w-3 h-3" />
                              Rejected (Stale Version)
                            </span>
                          ) : (
                            <span className="text-error uppercase font-black tracking-wider">
                              Error
                            </span>
                          )}
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
