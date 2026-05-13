import { Terminal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { traceStore } from "../../lib/trace-store";
import { Pill } from "../ui/Pill";
import { cn } from "../../lib/utils";
import type { RequestMetadata } from "../../lib/api/demo-client";

interface RequestReceiptProps {
  service: string;
  latencyMs: number;
  statusCode: number;
  traceId: string | null;
}

export function RequestReceipt({ service, latencyMs, statusCode, traceId }: RequestReceiptProps) {
  if (!traceId) return null;

  const variant = statusCode >= 200 && statusCode < 300 
    ? "success" 
    : statusCode === 429 || statusCode === 503
    ? "warning"
    : "error";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-center gap-2 font-mono text-[10px] py-2 border-t border-white/5 mt-4"
    >
      <div className="flex items-center gap-2 bg-white/5 px-2 py-0.5 rounded border border-white/5">
        <Terminal className="w-3 h-3 opacity-50 text-muted" />
        <span className="font-bold uppercase text-secondary">{service}</span>
        <span className="opacity-30">|</span>
        <span className="text-muted">{latencyMs}ms</span>
        <span className="opacity-30">|</span>
        <Pill variant={variant as any} className="px-1.5 py-0 rounded text-[9px]">{statusCode}</Pill>
      </div>

      <button
        onClick={() => traceStore.set(traceId)}
        className="flex items-center gap-1.5 bg-accent/10 hover:bg-accent/20 px-2 py-0.5 rounded border border-accent/20 text-accent transition-all group"
      >
        <span className="font-black uppercase tracking-widest">trace: {traceId.substring(0, 6)}</span>
      </button>
    </motion.div>
  );
}

export function RequestReceiptHistory({ receipts }: { receipts: RequestMetadata[] }) {
  return (
    <div className="space-y-1">
      <AnimatePresence initial={false}>
        {receipts.map((r, i) => (
          <RequestReceipt 
            key={r.traceId || i}
            service={r.service}
            latencyMs={r.latencyMs}
            statusCode={r.statusCode}
            traceId={r.traceId}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
