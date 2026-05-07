import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Activity, RefreshCw, Key, Database, ArrowRightLeft, AlertCircle } from 'lucide-react';
import { useDemoSession } from '../../hooks/useDemoSession';
import type { VaultRotationEvent } from '../../lib/api/signalr';
import { RequestReceiptHistory } from './RequestReceipt';
import type { RequestMetadata } from '../../lib/api/demo-client';

interface Credential {
  id: string;
  username: string;
  issuedAt: Date;
  expiresAt: Date;
}

interface LogEntry {
  id: string;
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}
export function VaultRotationDemo() {
  const [credential, setCredential] = useState<Credential | null>(null);
  const [localLogs, setLocalLogs] = useState<LogEntry[]>([]);
  const [requests, setRequests] = useState<boolean[]>([]);
  const [ttlProgress, setTtlProgress] = useState(100);
  const [isRotating, setIsRotating] = useState(false);
  const [receipts, setReceipts] = useState<RequestMetadata[]>([]);

  const { executeCommand, events } = useDemoSession('vault');

  // Initial load — reads the real /api/demo/vault/status which proxies
  // to identity-svc, which makes a live HTTP probe to vault's
  // /v1/sys/health on every call (no fallback / no static state).
  // Response shape: { status, roleName, leaseTtlSeconds, leaseExpiry,
  // vaultStatusCode, vaultBody }. A 503 here means the vault container
  // is paused or unreachable — let the credential stay null so the
  // card shows "Initializing…" instead of inventing values.
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(`${import.meta.env.PUBLIC_API_URL || 'http://localhost:5050'}/api/demo/vault/status`);
        if (!response.ok) return;
        const data = await response.json();
        const ttl = typeof data.leaseTtlSeconds === 'number' && data.leaseTtlSeconds > 0
          ? data.leaseTtlSeconds
          : 60; // No lease issued yet — show a 60s placeholder window
        setCredential({
          id: data.roleName ?? 'haworks-identity',
          username: data.roleName ?? 'haworks-identity',
          issuedAt: new Date(),
          expiresAt: new Date(Date.now() + ttl * 1000),
        });
      } catch (err) {}
    };
    fetchStatus();
  }, []);

  useEffect(() => {
     if (events.length > 0) {
        const lastEvent = events[0] as VaultRotationEvent;
        
        // Map backend stages to frontend stages
        const stage = lastEvent.stage === 'rotating' ? 'started' : 
                      lastEvent.stage === 'rotated' ? 'activated' : lastEvent.stage;

        const messageMap: Record<string, string> = {
           started: `Rotation requested. Generating new dynamic PostgreSQL role...`,
           activated: `New credential active: v-app-role-${lastEvent.version}. Swapping connection pool...`,
           grace_period: `v-${lastEvent.previousVersion} entered grace period.`,
           revoked: `Revoked legacy credential v-${lastEvent.version}.`
        };

        setLocalLogs(prev => [{
           id: crypto.randomUUID(),
           timestamp: new Date(lastEvent.timestamp),
           message: messageMap[stage] || `Vault Stage: ${lastEvent.stage}`,
           type: stage === 'activated' ? 'success' : stage === 'started' ? 'warning' : 'info'
        }, ...prev.slice(0, 12)]);

        if (stage === 'started') {
           setIsRotating(true);
        }

        if (stage === 'activated') {
           setIsRotating(false);
           setCredential({
              id: lastEvent.sessionId,
              username: `v-app-role-${lastEvent.version}`,
              issuedAt: new Date(lastEvent.timestamp),
              expiresAt: new Date(Date.now() + 60000)
           });
        }
     }
  }, [events]);

  const triggerRotation = async () => {
     try {
        const result = await executeCommand('/vault/rotate');
        setReceipts(prev => [result, ...prev].slice(0, 10));
        setIsRotating(true);
        setLocalLogs(prev => [{
           id: crypto.randomUUID(),
           timestamp: new Date(),
           message: `Manual rotation triggered.`,
           type: 'warning'
        }, ...prev.slice(0, 12)]);
     } catch (err) {}
  };

  useEffect(() => {
    if (!credential) return;
    const interval = setInterval(() => {
      const remaining = credential.expiresAt.getTime() - Date.now();
      setTtlProgress(Math.max(0, (remaining / 60000) * 100));
    }, 100);
    return () => clearInterval(interval);
  }, [credential]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRequests(prev => [true, ...prev.slice(0, 59)]);
    }, 150);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (d: Date) => {
    const remaining = Math.max(0, d.getTime() - Date.now());
    const secs = Math.floor(remaining / 1000);
    return `${secs}.${Math.floor((remaining % 1000) / 100)}s`;
  };

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <div className="space-y-6">
         <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-accent" />
            Active credential
          </h3>
        </div>

        <div className="surface p-8 shadow-2xl relative overflow-hidden space-y-10">
          <div className="flex items-center justify-between">
             <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${isRotating ? 'bg-warning text-black shadow-[0_0_20px_rgba(245,158,11,0.4)]' : 'bg-white/5 text-secondary'} transition-all`}>
                   <Key className="w-6 h-6" />
                </div>
                <div>
                   <h4 className="text-lg font-bold text-primary leading-none mb-1">Dynamic Postgres role</h4>
                   <p className="text-[10px] text-muted font-mono uppercase tracking-widest opacity-60">HashiCorp Vault Engine</p>
                </div>
             </div>
             <div className="text-right">
                <div className="text-3xl font-mono font-black text-primary tracking-tighter tabular-nums leading-none mb-1">
                   {credential ? formatTime(credential.expiresAt) : '---'}
                </div>
                <div className="text-[9px] uppercase tracking-[0.3em] text-muted font-bold">TTL_Remaining</div>
             </div>
          </div>

          {credential ? (
            <div className="space-y-8 relative z-10">
              <div className="grid gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.4em] font-black text-muted/60">Username</label>
                  <div className="text-sm bg-white/5 border border-white/10 px-4 py-3 rounded-xl flex items-center justify-between font-mono">
                     <span className="text-accent-light font-bold">{credential.username}</span>
                     {isRotating && <RefreshCw className="w-4 h-4 text-warning animate-spin" />}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.4em] font-black text-muted/60">
                    Vault role
                  </label>
                  <div className="text-sm bg-white/5 border border-white/10 px-4 py-3 rounded-xl flex-1 text-muted tracking-widest font-mono overflow-hidden truncate">
                    {credential.id} · dynamic Postgres credentials issued on demand
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                 <div className="flex justify-between text-[9px] font-black text-muted/60 uppercase tracking-widest">
                    <span>Provisioned</span>
                    <span className="text-warning/60">Rotation threshold</span>
                 </div>
                 <div className="h-2 bg-white/5 rounded-full overflow-hidden relative border border-white/5">
                    <div className="absolute top-0 bottom-0 w-px bg-warning/40 z-10" style={{ left: '80%' }} />
                    <motion.div
                      className={`h-full relative ${isRotating ? 'bg-warning shadow-[0_0_10px_rgba(245,158,11,0.5)]' : ttlProgress > 20 ? 'bg-success' : 'bg-error'}`}
                      style={{ width: `${ttlProgress}%` }}
                      transition={{ duration: 0.1, ease: 'linear' }}
                    />
                 </div>
              </div>

              <button 
                onClick={triggerRotation}
                disabled={isRotating}
                className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.4em] text-muted hover:text-primary hover:bg-white/10 transition-all disabled:opacity-20"
              >
                 Force rotation
              </button>

              <RequestReceiptHistory receipts={receipts} />
            </div>
          ) : (
            <div className="py-24 text-center">
               <div className="inline-block p-4 rounded-full border-2 border-white/5 border-t-accent animate-spin mb-6" />
               <p className="text-[10px] font-mono text-muted uppercase tracking-[0.4em] animate-pulse">Initializing secure session…</p>
            </div>
          )}
        </div>

      </div>

      <div className="space-y-6">
         <h3 className="text-sm font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2.5">
           <Activity className="w-4 h-4 text-accent" />
           Audit log
         </h3>

        <div className="surface p-8 shadow-2xl space-y-8">
           <div className="space-y-4 font-mono">
              <div className="text-[10px] font-black text-muted uppercase tracking-widest flex items-center justify-between">
                 <span>Ingress traffic</span>
                 <div className="flex gap-4 text-[8px] font-black">
                    <span className="flex items-center gap-1.5 text-success/60"><div className="w-1.5 h-1.5 bg-success rounded-full" /> 200_OK</span>
                    <span className="flex items-center gap-1.5 text-error/60"><div className="w-1.5 h-1.5 bg-error rounded-full" /> 403_DENIED</span>
                 </div>
              </div>
              <div className="flex flex-wrap gap-1">
                 {requests.map((success, i) => (
                    <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} className={`w-3 h-3 rounded-sm ${success ? 'bg-success/40' : 'bg-error/40'}`} />
                 ))}
              </div>
           </div>

           <div className="glass-subtle p-6 flex flex-col h-[230px] overflow-hidden">
              <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                 <ArrowRightLeft className="w-4 h-4 text-muted/60" />
                 <span className="text-[10px] font-black text-secondary uppercase tracking-[0.2em]">Auth events</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-4 font-mono">
                 <AnimatePresence initial={false}>
                    {localLogs.map((log) => (
                       <motion.div key={log.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex gap-4 text-[10px] items-start">
                          <span className="text-muted/60 whitespace-nowrap">[{log.timestamp.toLocaleTimeString('en-GB', { hour12: false, fractionalSecondDigits: 1 })}]</span>
                          <span className={`font-bold uppercase tracking-tight ${log.type === 'success' ? 'text-success/80' : log.type === 'warning' ? 'text-warning/80' : 'text-secondary/80'}`}>
                             {log.message}
                          </span>
                       </motion.div>
                    ))}
                 </AnimatePresence>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
