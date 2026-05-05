import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Shield, Activity, RefreshCw, Key, Database, ArrowRightLeft, AlertCircle } from 'lucide-react';
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
  const [version, setVersion] = useState<number | null>(null);
  const [credential, setCredential] = useState<Credential | null>(null);
  const [localLogs, setLocalLogs] = useState<LogEntry[]>([]);
  const [requests, setRequests] = useState<boolean[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [ttlProgress, setTtlProgress] = useState(100);
  const [isRotating, setIsRotating] = useState(false);
  const [receipts, setReceipts] = useState<RequestMetadata[]>([]);

  const { executeCommand, events } = useDemoSession('vault');

  // Initial load
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(`${import.meta.env.PUBLIC_API_URL || 'http://localhost:5050'}/api/demo/vault/status`);
        const data = await response.json();
        const v = data.currentVersion || 1;
        setVersion(v);
        setCredential({
          id: data.sessionId,
          username: `v-app-role-${v}`,
          issuedAt: new Date(),
          expiresAt: new Date(Date.now() + (data.ttlSeconds * 1000))
        });
      } catch (err) {}
    };
    fetchStatus();
  }, []);

  useEffect(() => {
     if (events.length > 0) {
        const lastEvent = events[0] as VaultRotationEvent;
        
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
           setVersion(lastEvent.version);
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

        <div className="surface p-8 shadow-2xl relative overflow-hidden space-y-8">
          <button 
            onClick={triggerRotation}
            disabled={isRotating}
            className="w-full py-4 bg-accent text-white font-black text-xs uppercase tracking-[0.3em] rounded-xl shadow-[0_10px_30px_-5px_rgba(99,102,241,0.5)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-20 flex items-center justify-center gap-3"
          >
             {isRotating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
             Force credential rotation
          </button>

          <div className="relative h-[180px] overflow-hidden">
             <AnimatePresence mode="popLayout" initial={false}>
                <motion.div 
                   key={version}
                   initial={{ x: 100, opacity: 0 }}
                   animate={{ x: 0, opacity: 1 }}
                   exit={{ x: -100, opacity: 0 }}
                   transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                   className="grid grid-cols-2 gap-4 absolute inset-0"
                >
                   {/* Active Card v(n) */}
                   <div className="glass-subtle rounded-2xl p-5 border border-white/10 space-y-4">
                      <div className="flex items-center justify-between">
                         <div className="p-2 bg-success/20 text-success rounded-lg">
                            <Key className="w-4 h-4" />
                         </div>
                         <div className="text-[10px] font-black text-success uppercase tracking-widest">Active</div>
                      </div>
                      <div>
                         <div className="text-[10px] text-muted font-bold uppercase tracking-widest mb-1">Version</div>
                         <div className="text-xl font-mono font-black text-primary">v({version || 'n'})</div>
                      </div>
                      <div className="pt-2 border-t border-white/5">
                         <div className="text-[9px] text-muted font-bold uppercase tracking-widest mb-1">Expires in</div>
                         <div className="text-sm font-mono font-bold text-accent-light tabular-nums">
                            {credential ? formatTime(credential.expiresAt) : '---'}
                         </div>
                      </div>
                   </div>

                   {/* Standby Card v(n+1) */}
                   <div className="glass-subtle rounded-2xl p-5 border border-white/5 opacity-40 space-y-4">
                      <div className="flex items-center justify-between">
                         <div className="p-2 bg-white/5 text-muted rounded-lg">
                            <Key className="w-4 h-4" />
                         </div>
                         <div className="text-[10px] font-black text-muted uppercase tracking-widest">Standby</div>
                      </div>
                      <div>
                         <div className="text-[10px] text-muted font-bold uppercase tracking-widest mb-1">Version</div>
                         <div className="text-xl font-mono font-black text-muted">v({version ? version + 1 : 'n+1'})</div>
                      </div>
                      <div className="pt-2 border-t border-white/5">
                         <div className="text-[9px] text-muted font-bold uppercase tracking-widest mb-1">Status</div>
                         <div className="text-xs font-black text-muted uppercase tracking-widest">
                            Ready
                         </div>
                      </div>
                   </div>
                </motion.div>
             </AnimatePresence>
          </div>

          {credential ? (
            <div className="space-y-8 relative z-10">
              <div className="grid gap-6">
                <div className="space-y-2 pt-4 border-t border-white/5">
                  <label className="text-[10px] uppercase tracking-[0.4em] font-black text-muted/60">Username</label>
                  <div className="text-sm bg-white/5 border border-white/10 px-4 py-3 rounded-xl flex items-center justify-between font-mono">
                     <span className="text-accent-light font-bold">{credential.username}</span>
                     {isRotating && <RefreshCw className="w-4 h-4 text-warning animate-spin" />}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.4em] font-black text-muted/60">Access token</label>
                  <div className="flex gap-2">
                    <div className="text-sm bg-white/5 border border-white/10 px-4 py-3 rounded-xl flex-1 text-muted tracking-[0.4em] font-black font-mono overflow-hidden truncate">
                      {showPassword ? 'sha256:a9f2b48c1e...' : '••••••••••••••••'}
                    </div>
                    <button 
                      onClick={() => setShowPassword(!showPassword)} 
                      className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors text-muted hover:text-primary"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
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

              {/* App Connection Pane */}
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-success/10 text-success rounded-lg">
                       <Database className="w-4 h-4" />
                    </div>
                    <div>
                       <div className="text-[10px] font-bold text-primary uppercase tracking-widest leading-none mb-1">App connection</div>
                       <div className="text-[9px] text-muted font-mono uppercase tracking-tighter opacity-60">Session pooling active</div>
                    </div>
                 </div>
                 <div className="flex items-center gap-2 px-3 py-1.5 bg-success/20 border border-success/30 rounded-full">
                    <div className="w-2 h-2 bg-success rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                    <span className="text-[9px] font-black text-success uppercase tracking-widest">Connected</span>
                 </div>
              </div>

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
