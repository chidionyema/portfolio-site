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

  const sendRequest = useCallback(async () => {
    try {
      const isAllowed = tokens > 0;
      const newTokens = Math.max(0, tokens - 1);
      setTokens(newTokens);

      if (!isAllowed) {
        setRetryAfter(windowReset);
      }

      const log: RequestLog = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        status: isAllowed ? 'allowed' : 'limited',
        remaining: newTokens,
      };

      setLocalRequests(prev => [log, ...prev].slice(0, 10));

      const res = await executeCommand('/ratelimit/request', {});
      if (res) {
        setReceipt(res as RequestMetadata);
        if (res?.metadata) {
          setReceipts(prev => [res.metadata, ...prev].slice(0, 5));
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [tokens, windowReset, executeCommand]);

  const burstRequest = useCallback(() => {
    const results: BurstBar[] = [];
    let currentTokens = tokens;

    for (let i = 0; i < 6; i++) {
      const isAllowed = currentTokens > 0;
      if (isAllowed) currentTokens--;
      results.push({
        id: crypto.randomUUID(),
        index: i + 1,
        status: isAllowed ? 'allowed' : 'limited',
      });
    }

    setBurstBars(results);
    for (let i = 0; i < 6; i++) {
      setTimeout(sendRequest, i * 50);
    }
  }, [sendRequest, tokens]);

  return (
    <div className="space-y-6">
      <RealSystemBanner metadata={metadata} />
      <WhatToWatch demoId="ratelimit" />
    <div className="grid lg:grid-cols-2 gap-8">
      <Stack gap={6}>
        <div className="flex items-center justify-between">
          <Heading variant="caption" className="flex items-center gap-2.5">
            <Gauge className="w-4 h-4 text-accent" />
            Fixed Window Limiter
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
                      <motion.span
                        key={tokens}
                        initial={{ scale: 1.2 }}
                        animate={{ scale: 1 }}
                        className={tokens === 0 ? 'text-error' : 'text-primary'}
                      >
                        {tokens}
                      </motion.span>
                      <span className="text-secondary/90">/{maxTokens}</span>
                    </div>
                    <div className="text-[9px] uppercase tracking-widest text-muted">Available Tokens</div>
                  </div>

                  {/* Window reset countdown */}
                  <div className="text-right">
                    <div className={cn(
                      "text-xl font-black tabular-nums",
                      retryAfter > 0 ? 'text-error' : 'text-secondary/70'
                    )}>
                      {retryAfter > 0 ? retryAfter : windowReset}s
                    </div>
                    <div className={cn(
                      "text-[9px] uppercase tracking-widest",
                      retryAfter > 0 ? 'text-error/70' : 'text-muted/60'
                    )}>
                      {retryAfter > 0 ? 'Retry After' : 'Window Reset'}
                    </div>
                  </div>
                </div>

                {/* Token bar */}
                <div className="flex gap-1 relative z-10">
                  {Array.from({ length: maxTokens }).map((_, i) => (
                    <motion.div
                      key={i}
                      animate={i < tokens ? { opacity: 1 } : { opacity: 0.15 }}
                      transition={{ duration: 0.2 }}
                      className={cn(
                        "flex-1 h-3 rounded-full transition-colors duration-300",
                        i < tokens ? "bg-success shadow-[0_0_10px_rgba(34,197,94,0.5)]" : "bg-white/10"
                      )}
                    />
                  ))}
                </div>

                {/* Window reset progress bar */}
                <div className="mt-3 relative z-10">
                  <div className="h-0.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-accent/40"
                      animate={{ width: `${((windowSeconds - windowReset) / windowSeconds) * 100}%` }}
                      transition={{ duration: 1, ease: 'linear' }}
                    />
                  </div>
                  <div className="flex justify-between text-[8px] text-muted/30 mt-1">
                    <span>window start</span>
                    <span>reset in {windowReset}s</span>
                  </div>
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

            {/* Burst result bars */}
            <AnimatePresence>
              {burstBars.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.3em]">
                    <span className="text-success">{burstBars.filter(b => b.status === 'allowed').length} allowed</span>
                    <span className="text-muted/40">/</span>
                    <span className="text-error">{burstBars.filter(b => b.status === 'limited').length} rejected</span>
                  </div>
                  <div className="flex gap-1.5">
                    {burstBars.map((bar, i) => (
                      <motion.div
                        key={bar.id}
                        initial={{ scaleY: 0, opacity: 0 }}
                        animate={{ scaleY: 1, opacity: 1 }}
                        transition={{ delay: i * 0.06, type: 'spring', stiffness: 300 }}
                        style={{ originY: 1 }}
                        className="flex-1 flex flex-col items-center gap-1"
                      >
                        <div className={cn(
                          "w-full rounded-sm",
                          bar.status === 'allowed'
                            ? "h-8 bg-success/70 shadow-[0_0_6px_rgba(34,197,94,0.5)]"
                            : "h-4 bg-error/70 shadow-[0_0_6px_rgba(239,68,68,0.5)]"
                        )} />
                        <div className={cn(
                          "text-[8px] font-black",
                          bar.status === 'allowed' ? 'text-success' : 'text-error'
                        )}>
                          {bar.index}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <div className="flex justify-between text-[8px] font-mono">
                    <span className="text-success flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5" /> 200 OK
                    </span>
                    <span className="text-error flex items-center gap-1">
                      <AlertCircle className="w-2.5 h-2.5" /> 429 Too Many
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

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
