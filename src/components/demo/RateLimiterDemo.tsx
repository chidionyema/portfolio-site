import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gauge, AlertCircle, BarChart3, CheckCircle2, Timer } from 'lucide-react';
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
import { RequestReceipt } from './RequestReceipt';
import { RealSystemBanner } from './RealSystemBanner';
import { WhatToWatch } from './WhatToWatch';

interface RequestLog {
  id: string;
  timestamp: Date;
  status: 'allowed' | 'limited';
  remaining: number;
}

interface BurstBar {
  id: string;
  index: number;
  status: 'allowed' | 'limited';
}

export function RateLimiterDemo() {
  const [tokens, setTokens] = useState(5);
  const maxTokens = 5;
  const windowSeconds = 60;
  const [localRequests, setLocalRequests] = useState<RequestLog[]>([]);
  const [retryAfter, setRetryAfter] = useState(0);
  const [windowReset, setWindowReset] = useState(0);
  const [burstBars, setBurstBars] = useState<BurstBar[]>([]);
  const [receipts, setReceipts] = useState<RequestMetadata[]>([]);
  const [receipt, setReceipt] = useState<RequestMetadata | null>(null);

  const { executeCommand, events, metadata } = useDemoSession('ratelimit');

  useEffect(() => {
    if (events.length > 0) {
      const lastEvent = events[0] as RateLimitEvent;
      setTokens(lastEvent.remaining);
      if (lastEvent.retryAfterSeconds) setRetryAfter(lastEvent.retryAfterSeconds);
    }
  }, [events]);

  // Countdown for retryAfter
  useEffect(() => {
    if (retryAfter <= 0) return;
    const interval = setInterval(() => setRetryAfter(prev => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(interval);
  }, [retryAfter]);

  // Window reset countdown — tracks seconds until next full window
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const secondsIntoMinute = now.getSeconds();
      setWindowReset(windowSeconds - secondsIntoMinute);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const sendRequest = useCallback(async (amount: number = 1) => {
    try {
      const res = await executeCommand('/ratelimit/request', { amount });
      if (res) {
        setReceipt(res as RequestMetadata);
        if (res?.metadata) {
          setReceipts(prev => [res.metadata, ...prev].slice(0, 5));
        }
        
        // SignalR will handle the state update via the events listener,
        // but we can optimistically update or just rely on the event.
        // The brief says the BFF returns the bucket state.
      }
      
      const log: RequestLog = {
        id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
        timestamp: new Date(),
        status: tokens >= amount ? 'allowed' : 'limited',
        remaining: Math.max(0, tokens - amount),
      };
      setLocalRequests(prev => [log, ...prev].slice(0, 10));

    } catch (e) {
      console.error(e);
    }
  }, [tokens, executeCommand]);

  const burstRequest = useCallback((amount: number) => {
    // For visual effect, we can stagger the calls if the backend supports it,
    // or just fire them. The brief says "drain N tokens with a 50ms stagger".
    for (let i = 0; i < amount; i++) {
      setTimeout(() => sendRequest(1), i * 50);
    }
  }, [sendRequest]);

  return (
    <div className="space-y-6">
      <RealSystemBanner metadata={metadata} />
      <WhatToWatch demoId="ratelimit" />
    <div className="grid lg:grid-cols-2 gap-8">
      <Stack gap={6}>
        <div className="flex items-center justify-between">
          <Heading variant="caption" className="flex items-center gap-2.5">
            <Gauge className="w-4 h-4 text-accent" />
            Token Bucket Limiter
          </Heading>
        </div>

        <Card variant="panel-dark" padding="lg">
          <Stack gap={8} className="font-mono">
            <Stack gap={4}>
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-secondary/90">
                <span>Bucket State</span>
                <Pill variant={retryAfter > 0 ? 'error' : 'success'}>
                  {retryAfter > 0 ? 'THROTTLED' : 'ACCEPTING'}
                </Pill>
              </div>

              <div className={cn(
                "p-8 rounded-xl border relative overflow-hidden transition-all duration-500",
                retryAfter > 0 ? "bg-error/[0.03] border-error/30" : "bg-black/40 border-white/5"
              )}>
                {/* Token Bucket Strip */}
                <div className="flex flex-wrap justify-center gap-3 mb-10">
                  {Array.from({ length: maxTokens }).map((_, i) => {
                    const isFull = i < tokens;
                    return (
                      <motion.div
                        key={i}
                        initial={false}
                        animate={{
                          scale: isFull ? 1 : 0.8,
                          opacity: isFull ? 1 : 0.2,
                          backgroundColor: isFull ? "var(--color-accent, #6366f1)" : "rgba(255,255,255,0.1)"
                        }}
                        className={cn(
                          "w-6 h-6 rounded-full border border-white/10",
                          isFull && "shadow-[0_0_15px_rgba(99,102,241,0.4)]"
                        )}
                      />
                    );
                  })}
                </div>

                {/* Cooldown / Progress */}
                <div className="relative h-1 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    className={cn("h-full", retryAfter > 0 ? "bg-error" : "bg-accent")}
                    animate={{ 
                      width: retryAfter > 0 
                        ? `${(retryAfter / windowSeconds) * 100}%` 
                        : `${((windowSeconds - windowReset) / windowSeconds) * 100}%` 
                    }}
                    transition={{ duration: 1, ease: 'linear' }}
                  />
                </div>

                <div className="flex justify-between mt-3 text-[9px] uppercase tracking-[0.2em] font-black">
                  <div className="flex flex-col">
                    <span className="text-muted/50 mb-1">Capacity</span>
                    <span className="text-primary">{tokens} / {maxTokens}</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-muted/50 mb-1">{retryAfter > 0 ? 'Retry in' : 'Refill in'}</span>
                    <span className={cn(retryAfter > 0 ? "text-error" : "text-secondary")}>
                      {retryAfter > 0 ? retryAfter : windowReset}s
                    </span>
                  </div>
                </div>
              </div>
            </Stack>

            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="primary"
                onClick={() => sendRequest(1)}
                disabled={retryAfter > 0}
                className="py-3 font-black text-[9px] uppercase tracking-widest rounded-xl"
              >
                Send 1
              </Button>
              <Button
                variant="secondary"
                onClick={() => burstRequest(5)}
                disabled={retryAfter > 0}
                className="py-3 font-black text-[9px] uppercase tracking-widest rounded-xl border-white/10"
              >
                Send 5
              </Button>
              <Button
                variant="secondary"
                onClick={() => burstRequest(12)}
                disabled={retryAfter > 0}
                className="py-3 font-black text-[9px] uppercase tracking-widest rounded-xl border-warning/20 text-warning hover:bg-warning/10"
              >
                Send 12
              </Button>
            </div>

            <RequestReceipt
              traceId={receipt?.traceId}
              latencyMs={receipt?.latencyMs}
              statusCode={receipt?.statusCode}
              service={receipt?.service}
            />
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
                  <th className="px-4 py-4 text-right">Remaining</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {localRequests.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-24 text-center text-secondary/90 italic uppercase tracking-[0.4em] font-black">
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
                            <span className="text-success uppercase font-black tracking-wider flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-success" />
                              200 OK
                            </span>
                          ) : (
                            <span className="text-error uppercase font-black tracking-wider flex items-center gap-1.5">
                              <AlertCircle className="w-3 h-3" />
                              429 Too Many
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className={cn(
                            "font-black tabular-nums text-[10px]",
                            req.remaining === 0 ? 'text-error' : req.remaining <= 2 ? 'text-warning' : 'text-success'
                          )}>
                            {req.remaining}/{maxTokens}
                          </span>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-white/[0.02] border-t border-white/5 font-mono text-[9px] text-muted/60 uppercase tracking-widest text-center">
            Fixed window rate limiter · {maxTokens} req / {windowSeconds}s · ASP.NET Core RateLimiter middleware
          </div>
        </Card>
      </Stack>
    </div>
    </div>
  );
}
