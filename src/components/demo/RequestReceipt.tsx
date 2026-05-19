import { motion, AnimatePresence } from 'framer-motion';
import { Activity } from 'lucide-react';

interface RequestReceiptProps {
  traceId?: string | null;
  latencyMs?: number;
  statusCode?: number;
  service?: string;
  className?: string;
}

export function RequestReceipt({ traceId, latencyMs, statusCode, service, className = '' }: RequestReceiptProps) {
  if (!traceId && !latencyMs) return null;

  const statusColor = !statusCode ? 'text-muted'
    : statusCode < 300 ? 'text-success'
    : statusCode < 500 ? 'text-warning'
    : 'text-error';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className={`flex items-center gap-3 px-3 py-1.5 rounded bg-black/40 border border-white/5 font-mono text-[10px] tracking-wide ${className}`}
      >
        <Activity className="w-3 h-3 text-accent shrink-0" />
        {service && <span className="text-secondary/60">{service}</span>}
        {statusCode && <span className={statusColor}>{statusCode}</span>}
        {latencyMs !== undefined && (
          <span className="text-secondary/50">{latencyMs}ms</span>
        )}
        {traceId && (
          <span className="text-muted truncate max-w-[140px]" title={traceId}>
            trace:{traceId.slice(0, 12)}
          </span>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

interface ReceiptEntry {
  traceId?: string | null;
  latencyMs?: number;
  statusCode?: number;
  service?: string;
  timestamp?: number;
}

export function RequestReceiptHistory({ receipts }: { receipts: ReceiptEntry[] }) {
  if (!receipts.length) return null;

  return (
    <div className="space-y-1 mt-3">
      <p className="text-[9px] uppercase tracking-widest text-muted mb-1">Recent Requests</p>
      {receipts.slice(-5).reverse().map((r, i) => (
        <RequestReceipt
          key={i}
          traceId={r.traceId}
          latencyMs={r.latencyMs}
          statusCode={r.statusCode}
          service={r.service}
          className="opacity-80"
        />
      ))}
    </div>
  );
}
