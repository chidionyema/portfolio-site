import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Clock, AlertCircle, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { cn, formatTimestamp, truncateId } from '../../lib/utils';
import { Badge } from '../ui/Badge';
import { StatusIndicator } from '../ui/StatusIndicator';

export interface EventData {
  id: string;
  type: string;
  timestamp: Date;
  correlationId: string;
  data: Record<string, unknown>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

interface EventStreamProps {
  events: EventData[];
  maxHeight?: string;
  showCorrelationId?: boolean;
  className?: string;
}

const statusConfig = {
  pending: { icon: Clock, color: 'info' as const, label: 'Pending' },
  processing: { icon: Clock, color: 'warning' as const, label: 'Processing' },
  completed: { icon: Check, color: 'success' as const, label: 'Completed' },
  failed: { icon: AlertCircle, color: 'error' as const, label: 'Failed' },
};

export function EventStream({
  events,
  maxHeight = '400px',
  showCorrelationId = true,
  className,
}: EventStreamProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'glass-subtle rounded-xl overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusIndicator status="success" pulse />
          <span className="text-sm font-medium text-primary">Real-time Events</span>
        </div>
        <Badge variant="outline">{events.length} events</Badge>
      </div>

      {/* Event list */}
      <div
        className="overflow-y-auto no-scrollbar"
        style={{ maxHeight }}
      >
        {events.length === 0 ? (
          <div className="p-8 text-center text-secondary">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Waiting for events...</p>
            <p className="text-sm text-muted mt-1">
              Try the checkout demo to see events flow
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {events.map((event, index) => {
              const config = statusConfig[event.status];
              const Icon = config.icon;
              const isExpanded = expandedId === event.id;

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                  className={cn(
                    'border-b border-white/5 last:border-0',
                    'hover:bg-white/[0.02] transition-colors cursor-pointer'
                  )}
                  onClick={() => toggleExpand(event.id)}
                >
                  <div className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {/* Status icon */}
                      <div
                        className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center',
                          {
                            'bg-success/20 text-success': event.status === 'completed',
                            'bg-info/20 text-info': event.status === 'pending',
                            'bg-warning/20 text-warning': event.status === 'processing',
                            'bg-error/20 text-error': event.status === 'failed',
                          }
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>

                      {/* Timestamp */}
                      <span className="text-xs font-mono text-muted w-24 shrink-0">
                        {formatTimestamp(event.timestamp)}
                      </span>

                      {/* Event type */}
                      <span className="text-sm font-medium text-primary truncate flex-1">
                        {event.type}
                      </span>

                      {/* Correlation ID */}
                      {showCorrelationId && (
                        <button
                          onClick={(e) => handleCopyId(event.correlationId, e)}
                          className="flex items-center gap-1.5 text-xs font-mono text-muted hover:text-secondary transition-colors"
                        >
                          {copiedId === event.correlationId ? (
                            <Check className="w-3 h-3 text-success" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          {truncateId(event.correlationId)}
                        </button>
                      )}

                      {/* Expand toggle */}
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted" />
                      )}
                    </div>

                    {/* Expanded details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 ml-9"
                        >
                          <pre className="text-xs font-mono bg-surface rounded-lg p-3 overflow-x-auto">
                            {JSON.stringify(event.data, null, 2)}
                          </pre>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
