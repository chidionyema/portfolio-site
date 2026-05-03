import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Circle, Loader2, Play, ArrowRight, Activity, Database, RefreshCcw, AlertCircle } from 'lucide-react';
import { useDemoSession } from '../../hooks/useDemoSession';
import type { SagaStepEvent } from '../../lib/api/signalr';
import { TraceViewer } from './TraceViewer';
import { ChaosButton } from './ChaosButton';

interface EventData {
  id: string;
  type: string;
  timestamp: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'compensating';
  description?: string;
  context?: string;
  sagaState?: string;
}

type Scenario = 'success' | 'stockFailure' | 'paymentFailure';

export function CheckoutDemo() {
  const [localEvents, setLocalEvents] = useState<EventData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [scenario, setScenario] = useState<Scenario>('success');
  const [sagaState, setSagaState] = useState<string>('Initial');
  const [activeTraceId, setActiveTraceId] = useState<string | null>(null);

  const { executeCommand, events: remoteEvents, isConnected } = useDemoSession('checkout');

  useEffect(() => {
     if (remoteEvents.length > 0) {
        const lastEvent = remoteEvents[0] as SagaStepEvent;
        
        setLocalEvents(prev => [{
           id: crypto.randomUUID(),
           type: lastEvent.step,
           context: lastEvent.service,
           timestamp: new Date(lastEvent.timestamp),
           status: lastEvent.status,
           description: lastEvent.description,
           sagaState: lastEvent.step
        }, ...prev]);

        setSagaState(lastEvent.step);
        
        if (lastEvent.status === 'success' && (lastEvent.step === 'completed' || lastEvent.step === 'finalized')) {
           setIsProcessing(false);
           setOrderComplete(true);
        }
        
        if (lastEvent.status === 'failed' || lastEvent.step === 'stock_failed' || lastEvent.step === 'payment_failed') {
           setIsProcessing(false);
        }
     }
  }, [remoteEvents]);

  const runSimulation = async () => {
    setIsProcessing(true);
    setOrderComplete(false);
    setLocalEvents([]);
    setSagaState('Initial');
    setActiveTraceId(null);
    try {
      await executeCommand('/saga/start', { scenarioType: scenario, simulatedDelayMs: 500 });
    } catch (err) {
      setIsProcessing(false);
    }
  };

  const formatTime = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 1 });

  return (
    <div className="grid lg:grid-cols-2 gap-8 relative">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2.5">
            <Activity className="w-4 h-4 text-accent" />
            Distributed_Saga_Orchestrator
          </h3>
        </div>

        <div className="surface p-8 shadow-2xl space-y-8">
          <div className="space-y-4">
             <label className="text-[10px] font-black text-muted uppercase tracking-[0.3em]">Select Execution Path</label>
             <div className="flex gap-2">
                {(['success', 'stockFailure', 'paymentFailure'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setScenario(s)}
                    disabled={isProcessing}
                    className={`flex-1 py-3 px-2 rounded-xl text-[10px] font-bold uppercase transition-all border ${
                      scenario === s 
                        ? 'bg-accent border-accent text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]' 
                        : 'bg-white/5 border-white/5 text-muted hover:text-secondary hover:bg-white/10'
                    } disabled:opacity-30`}
                  >
                    {s === 'success' ? 'Path_Happy' : s === 'stockFailure' ? 'Fault_Stock' : 'Fault_Pay'}
                  </button>
                ))}
             </div>
          </div>

          <div className="glass-subtle p-6 relative overflow-hidden">
             <div className="flex items-center justify-between relative z-10 text-[10px] font-bold uppercase tracking-widest text-muted/40">
                <span className={sagaState === 'Initial' || sagaState === 'initiated' ? 'text-primary' : ''}>Initial</span>
                <div className="h-px bg-white/10 flex-1 mx-4" />
                <span className={sagaState === 'stock_reserved' ? 'text-info' : ''}>Stock</span>
                <div className="h-px bg-white/10 flex-1 mx-4" />
                <span className={sagaState === 'payment_ready' ? 'text-info' : ''}>Payment</span>
                <div className="h-px bg-white/10 flex-1 mx-4" />
                <span className={sagaState === 'completed' ? 'text-success' : ''}>Done</span>
             </div>
             
             <AnimatePresence>
               {(sagaState === 'stock_failed' || sagaState === 'payment_failed' || sagaState === 'compensated') && (
                 <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 pt-6 border-t border-white/5 flex items-center justify-center gap-3 text-warning font-black tracking-widest uppercase text-xs">
                   <RefreshCcw className="w-4 h-4 animate-spin-slow" />
                   Rollback_In_Progress
                 </motion.div>
               )}
             </AnimatePresence>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <button
              onClick={runSimulation}
              disabled={isProcessing || !isConnected}
              className="w-full py-5 bg-white text-black font-black text-sm uppercase rounded-2xl hover:bg-slate-100 transition-all shadow-[0_20px_40px_-12px_rgba(255,255,255,0.2)] disabled:opacity-20 flex items-center justify-center gap-3"
            >
              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
              {isProcessing ? 'Saga_Executing...' : 'Dispatch_New_Order'}
            </button>

            <ChaosButton 
              scenario="inventory-kill" 
              label="Kill Inventory Mid-Saga" 
              durationSeconds={10} 
            />
          </div>

          <AnimatePresence>
             {activeTraceId && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                   <TraceViewer traceId={activeTraceId} />
                </motion.div>
             )}
          </AnimatePresence>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-sm font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2.5">
          <Database className="w-4 h-4 text-muted" />
          Real-time_Telemetry_Stream
        </h3>
        
        <div className="surface shadow-2xl h-[480px] flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between font-mono text-[10px]">
            <span className="text-muted font-bold uppercase">Buffer: <span className="text-accent-light">{isProcessing || localEvents.length > 0 ? 'f4a9b21c' : '---'}</span></span>
            <div className="flex items-center gap-2">
               <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
               <span className="text-success font-black">Connected</span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto font-mono text-[11px]">
             <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-[#0d0d12] border-b border-white/10 z-10">
                   <tr className="text-muted/40 uppercase text-[10px] font-black tracking-widest">
                      <th className="px-6 py-3">Time</th>
                      <th className="px-6 py-3">Event_Type</th>
                      <th className="px-6 py-3 text-right">Status</th>
                   </tr>
                </thead>
                <tbody>
                   <AnimatePresence initial={false}>
                     {localEvents.length === 0 ? (
                       <tr>
                          <td colSpan={3} className="py-24 text-center text-muted/20 italic uppercase tracking-widest font-black">Awaiting_Ingress_Data...</td>
                       </tr>
                     ) : (
                       localEvents.map((e) => (
                         <motion.tr
                           key={e.id}
                           initial={{ opacity: 0, x: -10 }}
                           animate={{ opacity: 1, x: 0 }}
                           className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors"
                         >
                           <td className="px-6 py-4 text-muted/50 text-[10px]">[{formatTime(e.timestamp)}]</td>
                           <td className="px-6 py-4 text-secondary font-bold">{e.type}</td>
                           <td className="px-6 py-4 text-right">
                              <span className={`text-[10px] font-black uppercase tracking-tighter ${
                                e.status === 'completed' ? 'text-success' : 
                                e.status === 'failed' ? 'text-error' : 
                                e.status === 'compensating' ? 'text-warning' : 'text-info'
                              }`}>
                                 {e.status}
                              </span>
                           </td>
                         </motion.tr>
                       ))
                     )}
                   </AnimatePresence>
                </tbody>
             </table>
          </div>
        </div>
      </div>
    </div>
  );
}
