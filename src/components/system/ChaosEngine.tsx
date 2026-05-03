import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Timer, ServerOff, RefreshCw, X, ShieldAlert, Activity } from 'lucide-react';

export interface ChaosState {
  latencyMs: number;
  brokerDown: boolean;
  serviceFaulty: boolean;
}

interface ChaosEngineProps {
  onStateChange: (state: ChaosState) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function ChaosEngine({ onStateChange, isOpen, onClose }: ChaosEngineProps) {
  const [state, setState] = useState<ChaosState>({
    latencyMs: 0,
    brokerDown: false,
    serviceFaulty: false,
  });

  const updateState = (update: Partial<ChaosState>) => {
    const next = { ...state, ...update };
    setState(next);
    onStateChange(next);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />
          
          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-sm bg-base border-l border-white/10 z-[101] shadow-2xl p-8 flex flex-col"
          >
            <div className="flex items-center justify-between mb-12">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-error/10 border border-error/20 rounded-lg text-error">
                     <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                     <h3 className="font-mono text-sm font-black uppercase tracking-[0.2em] text-primary leading-none">Chaos_Engine_v1</h3>
                     <span className="text-[9px] font-mono text-muted uppercase tracking-widest">Fault_Injection_Controller</span>
                  </div>
               </div>
               <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-muted">
                  <X className="w-5 h-5" />
               </button>
            </div>

            <div className="space-y-10 flex-1">
               {/* Latency Injection */}
               <div className="space-y-4">
                  <div className="flex items-center justify-between font-mono">
                     <label className="text-[10px] font-black uppercase tracking-widest text-secondary flex items-center gap-2">
                        <Timer className="w-4 h-4 text-warning" />
                        Latency_Injection
                     </label>
                     <span className="text-xs font-bold text-primary tabular-nums">+{state.latencyMs}ms</span>
                  </div>
                  <input 
                    type="range" min="0" max="2000" step="100"
                    value={state.latencyMs}
                    onChange={(e) => updateState({ latencyMs: parseInt(e.target.value) })}
                    className="w-full accent-accent bg-white/5 h-1.5 rounded-full appearance-none cursor-pointer"
                  />
                  <p className="text-[9px] text-muted font-mono uppercase tracking-tight">Applies Thread.Sleep to all cluster responses.</p>
               </div>

               {/* Broker Partition */}
               <div className="space-y-4">
                  <div className="flex items-center justify-between">
                     <label className="text-[10px] font-black uppercase tracking-widest text-secondary flex items-center gap-2">
                        <ServerOff className="w-4 h-4 text-error" />
                        Broker_Partition
                     </label>
                     <button 
                       onClick={() => updateState({ brokerDown: !state.brokerDown })}
                       className={`w-12 h-6 rounded-full p-1 transition-colors ${state.brokerDown ? 'bg-error' : 'bg-white/10'}`}
                     >
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${state.brokerDown ? 'translate-x-6' : 'translate-x-0'}`} />
                     </button>
                  </div>
                  <p className="text-[9px] text-muted font-mono uppercase tracking-tight">Simulates CloudAMQP unreachable state. Watch Transactional Outbox depth grow.</p>
               </div>

               {/* Service Faults */}
               <div className="space-y-4">
                  <div className="flex items-center justify-between">
                     <label className="text-[10px] font-black uppercase tracking-widest text-secondary flex items-center gap-2">
                        <Activity className="w-4 h-4 text-accent" />
                        Service_Degradation
                     </label>
                     <button 
                       onClick={() => updateState({ serviceFaulty: !state.serviceFaulty })}
                       className={`w-12 h-6 rounded-full p-1 transition-colors ${state.serviceFaulty ? 'bg-accent' : 'bg-white/10'}`}
                     >
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${state.serviceFaulty ? 'translate-x-6' : 'translate-x-0'}`} />
                     </button>
                  </div>
                  <p className="text-[9px] text-muted font-mono uppercase tracking-tight">Forces 10% error rate on Inventory context to trigger Circuit Breakers.</p>
               </div>
            </div>

            <div className="pt-8 border-t border-white/5">
               <div className="flex items-center gap-2 text-success font-mono text-[9px] font-black uppercase tracking-widest">
                  <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
                  Telemetry_Relay: Active
               </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
