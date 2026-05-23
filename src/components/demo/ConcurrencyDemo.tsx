import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCcw, Activity, ShieldAlert, GitCommit, ListEnd, ShieldCheck, Play, User, RotateCw } from 'lucide-react';
import { useDemoSession } from '../../hooks/useDemoSession';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Heading } from '../ui/Heading';
import { Stack } from '../ui/Stack';
import { Pill } from '../ui/Pill';
import { cn } from '../../lib/utils';
import type { RequestMetadata } from '../../lib/api/demo-client';
import { RequestReceipt } from './RequestReceipt';
import { DemoIntro } from './DemoIntro';

interface ConcurrencyResult {
  id: string;
  timestamp: Date;
  status: 'success' | 'conflict' | 'error';
  workerId: number;
  newVersion: number;
}

type PanelState = 'idle' | 'pending' | 'success' | 'conflict';

interface UserPanel {
  label: string;
  quantity: number;
  version: number;
  state: PanelState;
  lastError: string | null;
}

const INITIAL_PANEL: UserPanel = {
  label: '',
  quantity: 10,
  version: 1,
  state: 'idle',
  lastError: null,
};

export function ConcurrencyDemo() {
  const [logs, setLogs] = useState<ConcurrencyResult[]>([]);
  const [currentVersion, setCurrentVersion] = useState(1);
  const [isRacing, setIsRacing] = useState(false);
  const [receipts, setReceipts] = useState<RequestMetadata[]>([]);
  const [receipt, setReceipt] = useState<RequestMetadata | null>(null);

  // Per-user panels
  const [userA, setUserA] = useState<UserPanel>({ ...INITIAL_PANEL, label: 'User A', quantity: 10 });
  const [userB, setUserB] = useState<UserPanel>({ ...INITIAL_PANEL, label: 'User B', quantity: 25 });

  const { executeCommand, events, metadata } = useDemoSession('concurrency');
  const productIdRef = useRef<string | null>(null);

  useEffect(() => {
    executeCommand('/cache/product/demo', {}, { method: 'GET' })
      .then((res: any) => {
        if (res?.id) productIdRef.current = res.id;
      })
      .catch(() => {});
  }, [executeCommand]);

  useEffect(() => {
    if (events.length > 0) {
      const lastEvent = events[0];
      if (lastEvent.version) {
        setCurrentVersion(lastEvent.version as number);
      }
    }
  }, [events]);

  const sendUserRequest = async (user: 'A' | 'B') => {
    const productId = productIdRef.current;
    if (!productId) return;

    const setPanel = user === 'A' ? setUserA : setUserB;
    const panel = user === 'A' ? userA : userB;

    setPanel(p => ({ ...p, state: 'pending', lastError: null }));

    try {
      const res = await executeCommand(`/inventory/${productId}`, { quantity: panel.quantity }, {
        method: 'PUT',
        headers: { 'If-Match': `"${currentVersion}"` },
      });
      if (res?.traceId || res?.latencyMs) setReceipt(res as RequestMetadata);

      const success = res?.success !== false && !res?.error;
      const newVersion = res?.inventory?.version ? parseInt(res.inventory.version) : currentVersion + 1;

      if (success) {
        setPanel(p => ({ ...p, state: 'success', version: newVersion, lastError: null }));
        setCurrentVersion(newVersion);
        // Fade back to idle after glow
        setTimeout(() => setPanel(p => ({ ...p, state: 'idle' })), 2000);
      } else {
        setPanel(p => ({ ...p, state: 'conflict', lastError: '409 Conflict. stale version' }));
        setTimeout(() => setPanel(p => ({ ...p, state: 'idle' })), 3000);
      }

      setLogs(prev => [{
        id: crypto.randomUUID(),
        timestamp: new Date(),
        status: success ? 'success' as const : 'conflict' as const,
        workerId: user === 'A' ? 0 : 1,
        newVersion: success ? newVersion : currentVersion,
      }, ...prev].slice(0, 10));
    } catch {
      /* network error treated as conflict. surfaces in panel UI */
      setPanel(p => ({ ...p, state: 'conflict', lastError: '409 Conflict. stale version' }));
      setTimeout(() => setPanel(p => ({ ...p, state: 'idle' })), 3000);
      setLogs(prev => [{
        id: crypto.randomUUID(),
        timestamp: new Date(),
        status: 'conflict' as const,
        workerId: user === 'A' ? 0 : 1,
        newVersion: currentVersion,
      }, ...prev].slice(0, 10));
    }
  };

  const retryUserB = () => {
    // Sync userB to current version then re-send
    setUserB(p => ({ ...p, version: currentVersion, lastError: null }));
    sendUserRequest('B');
  };

  const fireRace = useCallback(async () => {
    const productId = productIdRef.current;
    if (!productId) return;

    setIsRacing(true);
    setUserA(p => ({ ...p, state: 'pending' }));
    setUserB(p => ({ ...p, state: 'pending' }));

    const sendRaw = async (workerId: number) => {
      try {
        const res = await executeCommand(`/inventory/${productId}`, { quantity: workerId * 10 }, {
          method: 'PUT',
          headers: { 'If-Match': `"${currentVersion}"` },
        });
        const success = res?.success !== false && !res?.error;
        const newVersion = res?.inventory?.version ? parseInt(res.inventory.version) : currentVersion + 1;

        setLogs(prev => [{
          id: crypto.randomUUID(),
          timestamp: new Date(),
          status: success ? 'success' as const : 'conflict' as const,
          workerId,
          newVersion: success ? newVersion : currentVersion,
        }, ...prev].slice(0, 10));

        if (success) setCurrentVersion(newVersion);
        return { success, newVersion };
      } catch {
        /* network error. log as conflict so the race UI reflects the failure */
        setLogs(prev => [{
          id: crypto.randomUUID(),
          timestamp: new Date(),
          status: 'conflict' as const,
          workerId,
          newVersion: currentVersion,
        }, ...prev].slice(0, 10));
        return { success: false, newVersion: currentVersion };
      }
    };

    const [r1, , r3] = await Promise.all([
      sendRaw(1),
      new Promise(r => setTimeout(r, 10)).then(() => sendRaw(2)),
      new Promise(r => setTimeout(r, 20)).then(() => sendRaw(3)),
    ]);

    setUserA(p => ({ ...p, state: r1.success ? 'success' : 'conflict', version: r1.newVersion }));
    setUserB(p => ({ ...p, state: r3.success ? 'success' : 'conflict', lastError: r3.success ? null : '409 Conflict. stale version' }));
    setTimeout(() => {
      setUserA(p => ({ ...p, state: 'idle' }));
      setUserB(p => ({ ...p, state: 'idle' }));
    }, 2500);

    setIsRacing(false);
  }, [currentVersion, executeCommand]);

  return (
    <div className="space-y-8">
      <DemoIntro demoId="concurrency" />

      {/* Split-panel user editors */}
      <div className="grid md:grid-cols-2 gap-4">
        {([
          { key: 'A' as const, panel: userA, setter: setUserA },
          { key: 'B' as const, panel: userB, setter: setUserB },
        ]).map(({ key, panel, setter }) => (
          <motion.div
            key={key}
            animate={
              panel.state === 'success'
                ? { 
                    boxShadow: ['0 0 0px rgba(34,197,94,0)', '0 0 24px rgba(34,197,94,0.4)', '0 0 0px rgba(34,197,94,0)'],
                    scale: [1, 1.02, 1]
                  }
                : panel.state === 'conflict'
                ? { 
                    x: [-4, 4, -4, 4, 0],
                    boxShadow: ['0 0 0px rgba(239,68,68,0)', '0 0 32px rgba(239,68,68,0.5)', '0 0 0px rgba(239,68,68,0)'],
                    borderColor: ['rgba(239,68,68,0.08)', 'rgba(239,68,68,0.8)', 'rgba(239,68,68,0.08)']
                  }
                : {}
            }
            transition={{ duration: panel.state === 'conflict' ? 0.4 : 0.6 }}
            className={cn(
              "rounded-2xl border-2 p-5 space-y-4 font-mono transition-colors duration-300",
              panel.state === 'success' ? 'border-success/50 bg-success/5' :
              panel.state === 'conflict' ? 'border-error/50 bg-error/5' :
              panel.state === 'pending' ? 'border-accent/30 bg-accent/5' :
              'border-white/[0.08] bg-white/[0.02]'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center",
                  panel.state === 'success' ? 'bg-success/20 text-success' :
                  panel.state === 'conflict' ? 'bg-error/20 text-error' :
                  'bg-white/10 text-muted'
                )}>
                  <User className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">
                  {panel.label}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {panel.state === 'pending' && (
                  <RotateCw className="w-3 h-3 text-accent animate-spin" />
                )}
                <Pill variant={
                  panel.state === 'success' ? 'success' :
                  panel.state === 'conflict' ? 'error' :
                  panel.state === 'pending' ? 'status' : 'default'
                }>
                  {panel.state === 'success' ? 'Committed' :
                   panel.state === 'conflict' ? '409 Conflict' :
                   panel.state === 'pending' ? 'Saving…' : 'Ready'}
                </Pill>
              </div>
            </div>

            {/* Product row */}
            <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[9px] uppercase tracking-widest text-muted">Product</span>
                <span className="text-[10px] font-black text-primary">prod_demo_widget</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[9px] uppercase tracking-widest text-muted">Quantity</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setter(p => ({ ...p, quantity: Math.max(1, p.quantity - 5) }))}
                    className="w-10 h-10 rounded bg-white/10 text-secondary hover:text-primary text-sm flex items-center justify-center"
                    disabled={panel.state === 'pending' || isRacing}
                  >−</button>
                  <motion.span 
                    animate={panel.state === 'conflict' ? { 
                      scale: [1, 1.4, 1],
                      color: ['#ffffff', '#f87171', '#ffffff'] 
                    } : {}}
                    className="text-sm font-black text-primary tabular-nums w-8 text-center"
                  >
                    {panel.quantity}
                  </motion.span>
                  <button
                    onClick={() => setter(p => ({ ...p, quantity: p.quantity + 5 }))}
                    className="w-10 h-10 rounded bg-white/10 text-secondary hover:text-primary text-sm flex items-center justify-center"
                    disabled={panel.state === 'pending' || isRacing}
                  >+</button>
                </div>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-white/5">
                <span className="text-[9px] uppercase tracking-widest text-muted">xmin version</span>
                <motion.span
                  key={currentVersion}
                  initial={{ scale: 1.3, color: '#a78bfa' }}
                  animate={{ 
                    scale: 1, 
                    color: '#ffffff',
                    backgroundColor: panel.state === 'conflict' ? ['rgba(239,68,68,0)', 'rgba(239,68,68,0.2)', 'rgba(239,68,68,0)'] : 'transparent'
                  }}
                  className="text-lg font-black tabular-nums px-1 rounded"
                >
                  v{currentVersion}
                </motion.span>
              </div>
            </div>


            {/* Error / conflict message */}
            <AnimatePresence>
              {panel.state === 'conflict' && panel.lastError && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0, boxShadow: ['0 0 0px rgba(239,68,68,0)', '0 0 16px rgba(239,68,68,0.5)', '0 0 0px rgba(239,68,68,0)'] }}
                  transition={{ boxShadow: { duration: 0.8, repeat: 2 } }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-error/10 border border-error/40 ring-1 ring-error/30"
                >
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-3.5 h-3.5 text-error shrink-0" />
                    <span className="text-[9px] font-black text-error uppercase tracking-wider">{panel.lastError}</span>
                  </div>
                  {key === 'B' && (
                    <button
                      onClick={retryUserB}
                      className="text-[9px] font-black uppercase tracking-widest text-accent hover:text-primary px-2 py-1 rounded bg-accent/10 border border-accent/20 transition-colors"
                    >
                      Retry
                    </button>
                  )}
                </motion.div>
              )}
              {panel.state === 'success' && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-success shrink-0" />
                  <span className="text-[9px] font-black text-success uppercase tracking-wider">
                    Committed. version incremented to v{currentVersion}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Save button */}
            <Button
              variant="primary"
              onClick={() => sendUserRequest(key)}
              disabled={panel.state === 'pending' || isRacing}
              className="w-full h-auto py-3 font-black text-[10px] uppercase tracking-widest rounded-xl flex items-center justify-center gap-2"
            >
              {panel.state === 'pending'
                ? <><RotateCw className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                : `Save. ${panel.label}`}
            </Button>
          </motion.div>
        ))}
      </div>

      {/* Info + Race button */}
      <div className="grid md:grid-cols-[1fr_auto] gap-4 items-start">
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-3 font-mono">
          <ListEnd className="w-4 h-4 text-muted shrink-0 mt-0.5" />
          <p className="text-[10px] leading-relaxed text-muted uppercase tracking-widest">
            EF Core uses a hidden xmin column as a concurrency token. Updates check{' '}
            <span className="text-primary">"WHERE id = X AND xmin = Y"</span>.
            The second writer to reach Postgres receives a 409.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={fireRace}
          disabled={isRacing}
          className="h-auto py-4 px-6 font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 border-warning/30 text-warning hover:bg-warning/10 whitespace-nowrap"
        >
          {isRacing ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          Race 3 Workers
        </Button>
      </div>

      <RequestReceipt
        traceId={receipt?.traceId}
        latencyMs={receipt?.latencyMs}
        statusCode={receipt?.statusCode}
        service={receipt?.service}
      />

      {/* Commit log */}
      <div className="grid lg:grid-cols-[1fr_1fr] gap-8">
        <Stack gap={4}>
          <Heading variant="caption" className="flex items-center gap-2.5">
            <Activity className="w-4 h-4 text-muted" />
            Commit Log
          </Heading>

          <Card variant="panel-dark" padding="none" className="overflow-hidden">
            <div className="font-mono text-[11px]">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#0d0d12] border-b border-white/10 text-muted/90 uppercase text-[10px] font-black tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Worker</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence initial={false}>
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="py-16 text-center text-muted/80 italic uppercase tracking-[0.4em] font-black">
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
                            {log.workerId === 0 ? 'User A' : log.workerId === 1 ? 'User B' : `Worker ${log.workerId}`}
                          </td>
                          <td className="px-6 py-4">
                            {log.status === 'success' ? (
                              <span className="text-success uppercase font-black tracking-wider flex items-center gap-2">
                                <ShieldCheck className="w-3 h-3" />
                                Committed v{log.newVersion}
                              </span>
                            ) : log.status === 'conflict' ? (
                              <span className="text-error uppercase font-black tracking-wider flex items-center gap-2">
                                <ShieldAlert className="w-3 h-3" />
                                409 Conflict
                              </span>
                            ) : (
                              <span className="text-error uppercase font-black tracking-wider">Error</span>
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

        {/* Version timeline */}
        <Stack gap={4}>
          <Heading variant="caption" className="flex items-center gap-2.5">
            <GitCommit className="w-4 h-4 text-muted" />
            Version Timeline
          </Heading>

          <Card variant="panel-dark" padding="lg" className="font-mono">
            <div className="space-y-2">
              {logs.length === 0 ? (
                <div className="py-8 text-center text-muted/80 italic uppercase tracking-[0.4em] font-black text-[10px]">
                  No commits yet
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {[...logs].slice(0, 8).map((log, i) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-3"
                    >
                      <div className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        log.status === 'success' ? 'bg-success shadow-[0_0_6px_rgba(34,197,94,0.7)]' :
                        'bg-error shadow-[0_0_6px_rgba(239,68,68,0.7)]'
                      )} />
                      {i < logs.slice(0, 8).length - 1 && (
                        <div className="absolute ml-[3px] mt-5 w-px h-5 bg-white/10" />
                      )}
                      <div className={cn(
                        "flex-1 flex items-center justify-between text-[10px] px-3 py-2 rounded-lg",
                        log.status === 'success' ? 'bg-success/5' : 'bg-error/5'
                      )}>
                        <span className={log.status === 'success' ? 'text-success font-black' : 'text-error font-black'}>
                          {log.status === 'success' ? `v${log.newVersion} committed` : 'rejected'}
                        </span>
                        <span className="text-muted/50 text-[9px]">
                          {log.workerId === 0 ? 'User A' : log.workerId === 1 ? 'User B' : `W${log.workerId}`}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-[10px]">
              <span className="text-muted/60 uppercase tracking-widest">Current xmin</span>
              <motion.span
                key={currentVersion}
                initial={{ scale: 1.2, color: '#a78bfa' }}
                animate={{ scale: 1, color: '#ffffff' }}
                className="text-2xl font-black tabular-nums"
              >
                v{currentVersion}
              </motion.span>
            </div>
          </Card>
        </Stack>
      </div>
    </div>
  );
}
