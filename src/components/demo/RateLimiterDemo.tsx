import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gauge, Timer, AlertCircle, BarChart3 } from 'lucide-react';
import { useDemoSession } from '../../hooks/useDemoSession';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Heading } from '../ui/Heading';
import { Stack } from '../ui/Stack';
import { Pill } from '../ui/Pill';
import { cn } from '../../lib/utils';
import { CLUSTER_LABEL } from '../../lib/copy';
import type { RateLimitEvent } from '../../lib/api/signalr';
import type { RequestMetadata } from '../../lib/api/demo-client';

interface RequestLog {
  id: string;
  timestamp: Date;
  status: 'allowed' | 'limited';
  remaining: number;
}

export function RateLimiterDemo() {
  const [tokens, setTokens] = useState(5);
  const maxTokens = 5;
  const windowSeconds = 60;
  const [localRequests, setLocalRequests] = useState<RequestLog[]>([]);
  const [retryAfter, setRetryAfter] = useState(0);
  const [receipts, setReceipts] = useState<RequestMetadata[]>([]);

  const { executeCommand, events } = useDemoSession('ratelimit');

  useEffect(() => {
     if (events.length > 0) {
        const lastEvent = events[0] as RateLimitEvent;
        setTokens(lastEvent.remaining);
        if (lastEvent.retryAfterSeconds) setRetryAfter(lastEvent.retryAfterSeconds);
     }
  }, [events]);

  useEffect(() => {
    if (retryAfter <= 0) return;
    const interval = setInterval(() => setRetryAfter(prev => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(interval);
  }, [retryAfter]);

  const sendRequest = useCallback(async () => {
    try {
      const isAllowed = tokens > 0;
      setTokens(prev => Math.max(0, prev - 1));
      
      if (!isAllowed) {
        setRetryAfter(60); // Demo default
      }

      setLocalRequests(prev => [{
        id: crypto.randomUUID(),
        timestamp: new Date(),
        status: isAllowed ? 'allowed' : 'limited',
        remaining: Math.max(0, tokens - 1)
      }, ...prev].slice(0, 10));

      const res = await executeCommand('/ratelimit/request');
      if (res?.metadata) {
        setReceipts(prev => [res.metadata, ...prev].slice(0, 5));
      }
    } catch (e) {
      console.error(e);
    }
  }, [tokens, executeCommand]);

  const burstRequest = useCallback(() => {
    for(let i=0; i<6; i++) {
      setTimeout(sendRequest, i * 50);
    }
  }, [sendRequest]);

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <Stack gap={6}>
        <div className="flex items-center justify-between">
          <Heading variant="caption" className="flex items-center gap-2.5">
            <Gauge className="w-4 h-4 text-accent" />
            Token Bucket
          </Heading>
        </div>

        <Card variant="panel-dark" padding="lg">
          <Stack gap={8} className="font-mono">
            <Stack gap={4}>
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-secondary/90">
                <span>Limit Policy</span>
                <Pill variant={retryAfter > 0 ? 'error' : 'success'}>
                  {retryAfter > 0 ? 'THROTTLED' : 'ACCEPTING'}
                </Pill>
              </div>

              <div className={cn(
                "p-6 rounded-xl border relative overflow-hidden transition-colors",
                retryAfter > 0 ? "bg-error/5 border-error/30" : "bg-black/40 border-white/5"
              )}>
                {retryAfter > 0 && (
                  <div className="absolute inset-0 bg-error/5 animate-pulse pointer-events-none" />
                )}
                
                <div className="flex justify-between items-end mb-6 relative z-10">
                  <div className="space-y-1">
                    <div className="text-3xl font-black tabular-nums transition-colors">
                      <span className={tokens === 0 ? 'text-error' : 'text-primary'}>{tokens}</span>
                      <span className="text-secondary/90">/{maxTokens}</span>
                    </div>
                    <div className="text-[9px] uppercase tracking-widest text-muted">Available Tokens</div>
                  </div>
                  
                  {retryAfter > 0 && (
                    <div className="text-right">
                      <div className="text-xl font-black text-warning tabular-nums">{retryAfter}s</div>
                      <div className="text-[9px] uppercase tracking-widest text-warning/70">Retry After</div>
                    </div>
                  )}
                </div>

                <div className="flex gap-1 relative z-10">
                  {Array.from({ length: maxTokens }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex-1 h-3 rounded-full transition-all duration-300",
                        i < tokens ? "bg-success shadow-[0_0_10px_rgba(34,197,94,0.5)]" : "bg-white/10"
                      )}
                    />
                  ))}
                </div>
              </div>
            </Stack>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="primary"
                onClick={sendRequest}
                disabled={retryAfter > 0}
                className="w-full h-auto py-4 font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2"
              >
                Send Request
              </Button>
              <Button
                variant="secondary"
                onClick={burstRequest}
                disabled={retryAfter > 0}
                className="w-full h-auto py-4 font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 border-warning/30 text-warning hover:bg-warning/10"
              >
                Burst (6x)
              </Button>
            </div>
          </Stack>
        </Card>
      </Stack>

      <Stack gap={6}>
        <Heading variant="caption" className="flex items-center gap-2.5">
          <BarChart3 className="w-4 h-4 text-muted" />
          Traffic Log
        </Heading>

        <Card variant="panel-dark" padding="none" className="h-[440px] flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto font-mono text-[11px]">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#0d0d12] border-b border-white/10 z-10 text-secondary/90 uppercase text-[10px] font-black tracking-widest">
                <tr>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Result</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {localRequests.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-24 text-center text-secondary/90 italic uppercase tracking-[0.4em] font-black">
                        Send traffic to view results
                      </td>
                    </tr>
                  ) : (
                    localRequests.map((req) => (
                      <motion.tr
                        key={req.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="group border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-6 py-4 text-secondary/90 text-[10px]">
                          {req.timestamp.toLocaleTimeString()}
                        </td>
                        <td className="px-6 py-4">
                          {req.status === 'allowed' ? (
                            <span className="text-success uppercase font-black tracking-wider">200 OK</span>
                          ) : (
                            <span className="text-error uppercase font-black tracking-wider flex items-center gap-2">
                              <AlertCircle className="w-3 h-3" />
                              429 Too Many Requests
                            </span>
                          )}
                        </td>
                      </motion.tr>
                    ))
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </Card>
      </Stack>
    </div>
  );
}
