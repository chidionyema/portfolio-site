import { ExternalLink, Terminal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { traceStore } from '../../lib/trace-store';

interface RequestReceiptProps {
  service: string;
  latencyMs: number;
  statusCode: number;
  traceId: string | null;
}

export function RequestReceipt({ service, latencyMs, statusCode, traceId }: RequestReceiptProps) {
  if (!traceId) return null;

  const statusColor = statusCode >= 200 && statusCode < 300 
    ? 'text-success' 
    : statusCode === 429 || statusCode === 503
    ? 'text-warning'
    : 'text-error';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-center gap-2 font-mono text-[10px] text-muted py-2 px-1 border-t border-white/5 mt-4"
    >
      <div className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded border border-white/5">
        <Terminal className="w-3 h-3 opacity-50" />
        <span className="font-black uppercase tracking-tighter text-secondary">{service}</span>
        <span className="opacity-30">·</span>
        <span className="font-bold">{latencyMs}ms</span>
        <span className="opacity-30">·</span>
        <span className={`${statusColor} font-black`}>{statusCode}</span>
      </div>

      <button
        onClick={() => traceStore.set(traceId)}
        className="flex items-center gap-1.5 bg-accent/10 hover:bg-accent/20 px-2 py-0.5 rounded border border-accent/20 text-accent-light transition-all group"
      >
        <span className="font-black uppercase tracking-tighter">trace {traceId.substring(0, 6)}</span>
        <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
      </button>
    </motion.div>
  );
}

interface RequestReceiptHistoryProps {
  receipts: RequestMetadata[];
}

import type { RequestMetadata } from '../../lib/api/demo-client';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export function RequestReceiptHistory({ receipts }: RequestReceiptHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  if (receipts.length === 0) return null;

  const latest = receipts[0];
  const history = receipts.slice(1, 4); // Show last 3 in history

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between group">
        <RequestReceipt 
          service={latest.service} 
          latencyMs={latest.latencyMs} 
          statusCode={latest.statusCode} 
          traceId={latest.traceId} 
        />
        {history.length > 0 && (
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="mt-4 p-1 hover:bg-white/5 rounded transition-colors text-muted opacity-0 group-hover:opacity-100"
          >
            <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>
      
      <AnimatePresence>
        {isOpen && history.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden pl-4 border-l border-white/10 space-y-1"
          >
            {history.map((r, i) => (
              <RequestReceipt 
                key={`${r.traceId}-${i}`}
                service={r.service} 
                latencyMs={r.latencyMs} 
                statusCode={r.statusCode} 
                traceId={r.traceId} 
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
