import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Zap, Loader2, AlertTriangle, ShieldCheck, ShieldAlert, Cpu, Activity, Timer, AlertCircle } from 'lucide-react';
import { useDemoSession } from '../../hooks/useDemoSession';
import type { CircuitBreakerEvent } from '../../lib/api/signalr';

type CircuitState = 'closed' | 'open' | 'half-open';

interface ResilienceLog {
  id: string;
  timestamp: Date;
  pattern: 'CircuitBreaker' | 'Hedging' | 'Bulkhead';
  status: 'success' | 'failure' | 'hedged' | 'rejected';
  message: string;
  latency: number;
}

export function CircuitBreakerDemo() {
  const [circuitState, setCircuitState] = useState<CircuitState>('closed');
  const [failures, setFailures] = useState(0);
  const [localLogs, setLocalLogs] = useState<ResilienceLog[]>([]);
  const [isSimulatingSlow, setIsSimulatingSlow] = useState(false);
  const [isSimulatingError, setIsSimulatingError] = useState(false);
  const [bulkheadUsage, setBulkheadUsage] = useState(0);

  const { executeCommand, events, isConnected } = useDemoSession('circuit');

  const THRESHOLD = 2; // Matches backend ResilienceOptions
  const BULKHEAD_LIMIT = 5;

  useEffect(() => {
     if (events.length > 0) {
        const lastEvent = events[0] as CircuitBreakerEvent;
        if (lastEvent.state) {
           setCircuitState(lastEvent.state);
        }
        // Backend doesn't send failureCount yet in the event, but we can track locally or wait for update
     }
  }, [events]);

  const runRequest = async () => {
    const start = Date.now();
    try {
      const result = await executeCommand('/circuit/request', {
        shouldFail: isSimulatingError
      });
      
      setLocalLogs(prev => [{
         id: crypto.randomUUID(),
         timestamp: new Date(),
         pattern: 'CircuitBreaker',
         status: result.success ? 'success' : 'failure',
         message: result.success ? `Request successful` : (result.isRejected ? 'Rejected: Circuit Open' : result.error || 'Failed'),
         latency: Date.now() - start
      }, ...prev.slice(0, 15)]);

      if (!result.success) {
         setFailures(prev => Math.min(prev + 1, THRESHOLD));
      } else {
         setFailures(0);
      }
    } catch (err) {
       setLocalLogs(prev => [{
          id: crypto.randomUUID(),
          timestamp: new Date(),
          pattern: 'CircuitBreaker',
          status: 'failure',
          message: 'Network Error / Timeout',
          latency: Date.now() - start
       }, ...prev.slice(0, 15)]);
    }
  };

  const toggleFailureMode = async () => {
     try {
        await executeCommand('/circuit/toggle-failure', { failureMode: !isSimulatingError });
        setIsSimulatingError(!isSimulatingError);
     } catch (err) {}
  };

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-accent" />
            Resilience_Policy_Pipeline
          </h3>
        </div>

        <div className="surface p-8 shadow-2xl space-y-10">
           <div className="flex items-center justify-between px-2">
              {[
                { label: 'Bulkhead', icon: Cpu, status: bulkheadUsage >= BULKHEAD_LIMIT ? 'error' : 'success' },
                { label: 'Circuit', icon: Zap, status: circuitState === 'open' ? 'error' : circuitState === 'half-open' ? 'warning' : 'success' },
                { label: 'Hedging', icon: Timer, status: isSimulatingSlow ? 'warning' : 'success' }
              ].map((step, i) => (
                <div key={step.label} className="flex flex-col items-center gap-3">
                   <div className={`p-4 rounded-2xl border-2 transition-all duration-500 ${
                      step.status === 'success' ? 'bg-success/10 border-success/40 text-success shadow-[0_0_15px_rgba(34,197,94,0.2)]' :
                      step.status === 'warning' ? 'bg-warning/10 border-warning/40 text-warning shadow-[0_0_15px_rgba(245,158,11,0.2)]' :
                      'bg-error/10 border-error/40 text-error shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                   }`}>
                      <step.icon className="w-6 h-6" />
                   </div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-muted">{step.label}</span>
                </div>
              ))}
           </div>

           <div className="space-y-4">
              <div className="flex justify-between text-[10px] font-mono font-bold uppercase tracking-widest text-muted">
                 <span>Bulkhead_Parallelism</span>
                 <span className={bulkheadUsage >= BULKHEAD_LIMIT ? 'text-error animate-pulse' : 'text-primary'}>
                   {bulkheadUsage} / {BULKHEAD_LIMIT} Slots
                 </span>
              </div>
              <div className="flex gap-1.5 h-2">
                 {[...Array(BULKHEAD_LIMIT)].map((_, i) => (
                   <div key={i} className={`flex-1 rounded-full transition-colors ${i < bulkheadUsage ? 'bg-accent shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-white/5'}`} />
                 ))}
              </div>
           </div>

           <div className="glass-subtle p-6 flex items-center justify-between font-mono">
              <div className="space-y-1">
                 <div className="text-[10px] font-black text-muted uppercase tracking-widest">Circuit_State</div>
                 <div className={`text-xl font-black uppercase tracking-tight ${circuitState === 'open' ? 'text-error' : circuitState === 'half-open' ? 'text-warning' : 'text-success'}`}>
                    {circuitState}
                 </div>
              </div>
              <div className="flex gap-2">
                 {[...Array(THRESHOLD)].map((_, i) => (
                   <div key={i} className={`w-1.5 h-6 rounded-sm ${i < failures ? 'bg-error shadow-[0_0_8px_rgba(239,68,68,0.4)]' : 'bg-white/5'}`} />
                 ))}
              </div>
           </div>

           <button
             onClick={runRequest}
             disabled={!isConnected}
             className="w-full py-5 bg-white text-black font-black text-sm uppercase rounded-2xl hover:bg-slate-100 transition-all shadow-[0_20px_40px_-12px_rgba(255,255,255,0.2)] disabled:opacity-20 flex items-center justify-center gap-3"
           >
             <Activity className="w-5 h-5" />
             Execute_Policy_Pipeline
           </button>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-sm font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2.5">
          <ShieldAlert className="w-4 h-4 text-error" />
          Fault_Injection_Control
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
           <button 
             onClick={() => setIsSimulatingSlow(!isSimulatingSlow)}
             className={`p-6 rounded-2xl border transition-all text-left space-y-3 ${isSimulatingSlow ? 'bg-warning/10 border-warning/40 text-warning shadow-xl' : 'surface text-secondary hover:bg-white/5'}`}
           >
              <Timer className="w-6 h-6" />
              <div>
                 <div className="text-xs font-black uppercase tracking-widest">Latent_Service</div>
                 <div className="text-[10px] opacity-60 font-mono mt-1">Inject 2000ms Delay</div>
              </div>
           </button>
           <button 
             onClick={toggleFailureMode}
             className={`p-6 rounded-2xl border transition-all text-left space-y-3 ${isSimulatingError ? 'bg-error/10 border-error/40 text-error shadow-xl' : 'surface text-secondary hover:bg-white/5'}`}
           >
              <ShieldAlert className="w-6 h-6" />
              <div>
                 <div className="text-xs font-black uppercase tracking-widest">Faulty_Service</div>
                 <div className="text-[10px] opacity-60 font-mono mt-1">Inject 503 Errors</div>
              </div>
           </button>
        </div>

        <div className="surface shadow-2xl flex-1 h-[270px] flex flex-col overflow-hidden font-mono">
           <div className="px-6 py-4 border-b border-white/5 text-[10px] font-black text-muted uppercase tracking-[0.2em]">
              Resilience_Audit_Trail
           </div>
           <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              <AnimatePresence initial={false}>
                {localLogs.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted/20 text-[10px] font-black uppercase tracking-[0.4em] italic">
                    Pipeline_Idle
                  </div>
                ) : (
                  localLogs.map((log) => (
                    <motion.div key={log.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className={`flex items-center justify-between p-3 rounded-lg border-l-2 bg-white/[0.01] ${
                        log.status === 'success' ? 'border-success/40 text-success/80' :
                        log.status === 'hedged' ? 'border-warning/40 text-warning/80' :
                        'border-error/40 text-error/80'
                      }`}
                    >
                      <div className="flex items-center gap-3 text-[10px] font-bold">
                         <span className="opacity-30">[{log.pattern}]</span>
                         <span className="truncate max-w-[180px] uppercase">{log.message}</span>
                      </div>
                      <span className="opacity-40 text-[9px] tabular-nums">{log.latency}ms</span>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
           </div>
        </div>
      </div>
    </div>
  );
}
