import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Clock, Server, AlertCircle, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { getTrace, type Trace, type Span } from '../../lib/api/demo-client';

interface TraceViewerProps {
  traceId: string;
}

const SERVICE_COLORS: Record<string, string> = {
  'orders-api': '#6366f1', // Indigo
  'orders-domain': '#818cf8',
  'inventory-service': '#f59e0b', // Amber
  'payments-service': '#10b981', // Emerald
  'notifications': '#ec4899', // Pink
  'shared-outbox': '#8b5cf6', // Violet
  'vault-service': '#06b6d4', // Cyan
};

export function TraceViewer({ traceId }: TraceViewerProps) {
  const [trace, setTrace] = useState<Trace | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [selectedSpan, setSelectedSpan] = useState<Span | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchTrace = async () => {
    if (!traceId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getTrace(traceId);
      setTrace(data);
    } catch (err: any) {
      if (err.status === 404 && retryCount < 3) {
        setError('Trace propagating... retrying');
        setTimeout(() => setRetryCount(prev => prev + 1), 2000);
      } else {
        setError(err.message || 'Failed to fetch trace');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (expanded && !trace && !loading) {
      fetchTrace();
    }
  }, [expanded, traceId, retryCount]);

  const sortedSpans = useMemo(() => {
    if (!trace) return [];
    return [...trace.spans].sort((a, b) => a.startMs - b.startMs);
  }, [trace]);

  const toggleExpand = () => setExpanded(!expanded);

  return (
    <div className="surface border-white/5 bg-black/40 overflow-hidden">
      <button 
        onClick={toggleExpand}
        className="w-full px-4 py-3 flex items-center justify-between group hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <Activity className={`w-4 h-4 ${expanded ? 'text-accent' : 'text-muted'}`} />
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-secondary group-hover:text-primary">
            Distributed_Trace // <span className="text-muted">{traceId.slice(0, 8)}...</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          {loading && <div className="w-3 h-3 border-b-2 border-accent rounded-full animate-spin" />}
          {expanded ? <ChevronDown className="w-4 h-4 text-muted" /> : <ChevronRight className="w-4 h-4 text-muted" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="p-6 border-t border-white/5 space-y-6">
              {error ? (
                <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
                  <AlertCircle className="w-8 h-8 text-warning opacity-50" />
                  <p className="text-xs font-mono text-muted uppercase tracking-widest">{error}</p>
                  {error.includes('retry') && <div className="w-32 h-1 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-accent" 
                      initial={{ width: 0 }} 
                      animate={{ width: '100%' }} 
                      transition={{ duration: 2 }} 
                    />
                  </div>}
                </div>
              ) : !trace ? (
                <div className="space-y-4 py-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-4 bg-white/5 rounded animate-pulse w-full" style={{ width: `${100 - i * 15}%`, marginLeft: `${i * 5}%` }} />
                  ))}
                </div>
              ) : (
                <>
                  {/* Waterfall Container */}
                  <div className="relative min-h-[200px] font-mono">
                    <div className="absolute inset-0 flex">
                      {[0, 25, 50, 75, 100].map(tick => (
                        <div key={tick} className="flex-1 border-r border-white/[0.03] relative">
                          <span className="absolute -top-6 right-0 text-[8px] text-muted/30">
                            {Math.round((trace.durationMs * tick) / 100)}ms
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="relative space-y-1.5 pt-4">
                      {sortedSpans.map(span => {
                        const width = (span.durationMs / trace.durationMs) * 100;
                        const left = (span.startMs / trace.durationMs) * 100;
                        const color = SERVICE_COLORS[span.service] || '#94a3b8';

                        return (
                          <div 
                            key={span.spanId} 
                            className="group/span relative h-6 cursor-pointer"
                            onClick={() => setSelectedSpan(span)}
                          >
                            <div 
                              className="absolute h-full rounded-[1px] transition-all group-hover/span:brightness-125"
                              style={{ 
                                left: `${left}%`, 
                                width: `${Math.max(width, 0.5)}%`, 
                                backgroundColor: color,
                                opacity: selectedSpan?.spanId === span.spanId ? 1 : 0.7
                              }}
                            >
                              <div className="absolute inset-0 flex items-center px-2 overflow-hidden whitespace-nowrap">
                                <span className="text-[8px] font-black uppercase text-black/80 tracking-tighter mix-blend-overlay">
                                  {span.operation}
                                </span>
                              </div>
                            </div>
                            
                            {/* Hover info */}
                            <div className="absolute left-0 -top-1 opacity-0 group-hover/span:opacity-100 pointer-events-none transition-opacity">
                               <span className="text-[8px] bg-black border border-white/10 px-1.5 py-0.5 rounded text-primary whitespace-nowrap">
                                  {span.service} | {span.durationMs}ms
                               </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Span Details */}
                  <AnimatePresence>
                    {selectedSpan && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/5 border border-white/10 p-5 space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Server className="w-3.5 h-3.5 text-accent-light" />
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">
                              Span_Details: {selectedSpan.operation}
                            </h4>
                          </div>
                          <button onClick={() => setSelectedSpan(null)} className="text-[9px] text-muted hover:text-primary uppercase font-bold">Close</button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-6 text-[10px] font-mono">
                          <div className="space-y-2">
                            <div className="flex justify-between border-b border-white/5 pb-1">
                              <span className="text-muted uppercase">Service</span>
                              <span className="text-secondary font-bold">{selectedSpan.service}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 pb-1">
                              <span className="text-muted uppercase">Duration</span>
                              <span className="text-secondary font-bold">{selectedSpan.durationMs}ms</span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 pb-1">
                              <span className="text-muted uppercase">Status</span>
                              <span className={selectedSpan.status === 'OK' ? 'text-success font-bold' : 'text-error font-bold'}>{selectedSpan.status}</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                             <div className="text-muted uppercase mb-1 flex items-center gap-1.5">
                                <Info className="w-3 h-3" /> Attributes
                             </div>
                             <div className="bg-black/40 p-2 max-h-[100px] overflow-y-auto text-[9px] text-muted/80">
                                {Object.entries(selectedSpan.attributes).map(([k, v]) => (
                                  <div key={k} className="flex justify-between gap-4">
                                    <span className="shrink-0">{k}:</span>
                                    <span className="text-secondary truncate">{String(v)}</span>
                                  </div>
                                ))}
                                {Object.keys(selectedSpan.attributes).length === 0 && <span className="italic">No attributes found.</span>}
                             </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex items-center justify-between pt-4 border-t border-white/5 text-[8px] font-mono text-muted uppercase tracking-widest">
                    <span>Source: Grafana Tempo</span>
                    <span>Retention: 10m (Redis Cache)</span>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
