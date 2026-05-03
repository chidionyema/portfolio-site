import { motion, AnimatePresence } from 'framer-motion';
import { Database, Zap, RefreshCw, Check, AlertCircle } from 'lucide-react';

interface Connection {
  id: string;
  status: 'active' | 'draining' | 'idle';
  version: string;
}

interface ConnectionPoolMonitorProps {
  activeVersion: string;
  previousVersion: string | null;
  isRotating: boolean;
  activeCount: number;
}

export function ConnectionPoolMonitor({ activeVersion, previousVersion, isRotating, activeCount }: ConnectionPoolMonitorProps) {
  // Generate dummy connection dots for visualization
  const connections: Connection[] = Array.from({ length: 16 }).map((_, i) => ({
    id: `conn-${i}`,
    status: i < activeCount ? (isRotating ? 'draining' : 'active') : 'idle',
    version: i < activeCount ? (isRotating ? previousVersion || activeVersion : activeVersion) : activeVersion
  }));

  return (
    <div className="surface p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5 text-accent" />
          <h4 className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-secondary">Connection_Pool_LHR_01</h4>
        </div>
        <div className="flex items-center gap-4 font-mono text-[9px] font-black uppercase tracking-widest">
           <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-success rounded-none" />
              <span className="text-success">Active</span>
           </div>
           <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-warning rounded-none animate-pulse" />
              <span className="text-warning">Draining</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-8 gap-2">
        {connections.map((conn) => (
          <motion.div
            key={conn.id}
            initial={false}
            animate={{ 
              backgroundColor: conn.status === 'active' ? '#22c55e' : conn.status === 'draining' ? '#f59e0b' : 'rgba(255,255,255,0.05)',
              scale: conn.status === 'idle' ? 0.9 : 1
            }}
            className="aspect-square rounded-sm border border-white/5 shadow-inner flex items-center justify-center relative overflow-hidden"
          >
             {conn.status !== 'idle' && (
               <span className="text-[8px] font-black text-black opacity-40 z-10">{conn.version}</span>
             )}
             {conn.status === 'draining' && (
                <motion.div 
                  className="absolute inset-0 bg-white/20"
                  animate={{ y: ['0%', '100%'] }}
                  transition={{ repeat: Infinity, duration: 0.6, ease: 'linear' }}
                />
             )}
          </motion.div>
        ))}
      </div>

      <div className="pt-4 border-t border-white/5 space-y-3">
         <div className="flex justify-between items-center font-mono text-[10px] uppercase font-black tracking-widest">
            <span className="text-muted/40">Active_Version:</span>
            <span className="text-primary">{activeVersion}</span>
         </div>
         {isRotating && (
           <motion.div 
             initial={{ opacity: 0 }} animate={{ opacity: 1 }}
             className="flex justify-between items-center font-mono text-[10px] uppercase font-black tracking-widest text-warning"
           >
              <span>Draining_Legacy:</span>
              <span>{previousVersion}</span>
           </motion.div>
         )}
      </div>

      <div className="p-3 bg-success/5 border border-success/10 rounded-xl flex items-center justify-between">
         <div className="flex items-center gap-2 text-success font-black text-[9px] uppercase tracking-widest">
            <Check className="w-3.5 h-3.5" />
            Zero_Packet_Loss_Swap
         </div>
         <div className="text-lg font-mono font-black text-success tabular-nums leading-none">0</div>
      </div>
    </div>
  );
}
