import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Flame, Timer, Loader2 } from 'lucide-react';
import { triggerChaos } from '../../lib/api/demo-client';
import { TraceViewer } from './TraceViewer';

interface ChaosButtonProps {
  scenario: string;
  label: string;
  durationSeconds?: number;
}

/**
 * ChaosButton
 * Triggers a real backend fault scenario.
 * Surfaces the trace ID and provides a countdown while the fault is active.
 */
export const ChaosButton: React.FC<ChaosButtonProps> = ({ 
  scenario, 
  label, 
  durationSeconds = 30 
}) => {
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [traceId, setTraceId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  const handleClick = async () => {
    if (isActive || isLoading) return;

    setIsLoading(true);
    try {
      const response = await triggerChaos(scenario, durationSeconds);
      setTraceId(response.trace_id);
      setIsActive(true);
      setCountdown(durationSeconds);

      // Start countdown
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (error) {
      console.error('Chaos injection failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleClick}
        disabled={isActive || isLoading}
        className={`
          relative flex items-center justify-between w-full px-4 py-3 
          border font-mono text-[10px] uppercase tracking-widest transition-all
          ${isActive 
            ? 'border-destructive bg-destructive/10 text-destructive cursor-wait' 
            : 'border-muted hover:border-destructive/50 hover:bg-destructive/5 text-muted-foreground hover:text-destructive'
          }
          disabled:opacity-50
        `}
      >
        <div className="flex items-center gap-3">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isActive ? (
            <Flame className="w-4 h-4 animate-pulse" />
          ) : (
            <Zap className="w-4 h-4" />
          )}
          <span>{label}</span>
        </div>

        {isActive && (
          <div className="flex items-center gap-2 font-mono">
            <Timer className="w-3 h-3" />
            <span>{countdown}s</span>
          </div>
        )}
      </button>

      <AnimatePresence>
        {traceId && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border border-muted/50 bg-muted/5 p-4"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[9px] font-mono uppercase text-muted italic">Chaos Trace</span>
              <span className="text-[9px] font-mono text-muted">{traceId}</span>
            </div>
            <TraceViewer traceId={traceId} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
