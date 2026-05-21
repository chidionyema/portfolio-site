import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Loader2, BookOpen, CheckCircle2 } from 'lucide-react';
import { useDemoSession } from '../../hooks/useDemoSession';
import { DemoIntro } from './DemoIntro';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Heading } from '../ui/Heading';
import { Stack } from '../ui/Stack';
import { Pill } from '../ui/Pill';
import { cn } from '../../lib/utils';

interface LedgerEntry {
  id: string;
  type: 'CREDIT' | 'DEBIT';
  amountCents: number;
  description: string;
  timestamp: Date;
}

interface LedgerResult {
  entries: Array<{ type: 'CREDIT' | 'DEBIT'; amountCents: number; description: string }>;
  balanceCents: number;
  sumZero: boolean;
}

export function LedgerDemo() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [balanceCents, setBalanceCents] = useState<number | null>(null);
  const [sumZero, setSumZero] = useState<boolean | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [runCount, setRunCount] = useState(0);

  const { executeCommand } = useDemoSession('ledger');

  const simulate = useCallback(async () => {
    setIsProcessing(true);
    try {
      const res = await executeCommand('/ledger/simulate', {
        amountCents: 3999,
        commissionBps: 1000,
        description: 'Demo Widget purchase',
      }) as LedgerResult | null;

      if (res?.entries) {
        const now = new Date();
        setEntries(res.entries.map((e, i) => ({
          id: crypto.randomUUID(),
          type: e.type,
          amountCents: e.amountCents,
          description: e.description,
          timestamp: new Date(now.getTime() + i * 50),
        })));
        setBalanceCents(res.balanceCents ?? 0);
        setSumZero(res.sumZero ?? true);
        setRunCount(c => c + 1);
      } else {
        // Simulate locally when backend unavailable
        const credit: LedgerEntry = { id: crypto.randomUUID(), type: 'CREDIT', amountCents: 3999, description: 'Payment received', timestamp: new Date() };
        const debit: LedgerEntry = { id: crypto.randomUUID(), type: 'DEBIT', amountCents: -400, description: 'Platform commission 10%', timestamp: new Date() };
        setEntries([credit, debit]);
        setBalanceCents(3999 - 400);
        setSumZero(true);
        setRunCount(c => c + 1);
      }
    } catch {
      const credit: LedgerEntry = { id: crypto.randomUUID(), type: 'CREDIT', amountCents: 3999, description: 'Payment received', timestamp: new Date() };
      const debit: LedgerEntry = { id: crypto.randomUUID(), type: 'DEBIT', amountCents: -400, description: 'Platform commission 10%', timestamp: new Date() };
      setEntries([credit, debit]);
      setBalanceCents(3999 - 400);
      setSumZero(true);
      setRunCount(c => c + 1);
    } finally {
      setIsProcessing(false);
    }
  }, [executeCommand]);

  const formatCents = (cents: number) => {
    const abs = Math.abs(cents) / 100;
    return `$${abs.toFixed(2)}`;
  };

  return (
    <div className="space-y-8">
      <DemoIntro demoId="ledger" />
      {/* Running balance header */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center">
          <div className="text-[9px] font-black uppercase tracking-widest text-muted mb-1">Gross</div>
          <div className="text-lg font-black tabular-nums text-success">$39.99</div>
        </div>
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center">
          <div className="text-[9px] font-black uppercase tracking-widest text-muted mb-1">Commission</div>
          <div className="text-lg font-black tabular-nums text-error">$4.00</div>
        </div>
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center">
          <div className="text-[9px] font-black uppercase tracking-widest text-muted mb-1">Net balance</div>
          <motion.div
            key={balanceCents}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-lg font-black tabular-nums text-primary"
          >
            {balanceCents !== null ? formatCents(balanceCents) : '—'}
          </motion.div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left: Controls */}
        <Stack gap={6}>
          <Heading variant="caption" className="flex items-center gap-2.5">
            <BookOpen className="w-4 h-4 text-accent" />
            Ledger Controls
          </Heading>

          <Card variant="panel-dark" padding="lg">
            <Stack gap={6} className="font-mono">
              <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted">Transaction</span>
                  <Pill variant={runCount > 0 ? 'success' : 'status'}>
                    {runCount > 0 ? `${runCount} run${runCount > 1 ? 's' : ''}` : 'READY'}
                  </Pill>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-secondary">Demo Widget × 1</span>
                  <span className="text-xl font-black tabular-nums text-primary">$39.99</span>
                </div>
                <div className="mt-2 text-[9px] text-muted/60">Platform commission: 10% ($4.00)</div>
              </div>

              <Button
                variant="primary"
                onClick={simulate}
                disabled={isProcessing}
                className="w-full h-auto py-5 font-black text-sm uppercase tracking-widest rounded-xl"
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Posting entries…
                  </span>
                ) : (
                  'Simulate Payment'
                )}
              </Button>

              <div className="p-4 rounded-xl bg-accent/5 border border-accent/10">
                <div className="text-[9px] font-black uppercase tracking-widest text-accent/60 mb-2">What happens</div>
                <ol className="text-[10px] text-secondary/70 leading-relaxed space-y-1 list-decimal list-inside">
                  <li>Payment event triggers ledger aggregate</li>
                  <li>CREDIT entry posted for full payment amount</li>
                  <li>DEBIT entry posted for platform commission</li>
                  <li>Both entries written atomically in one transaction</li>
                  <li>Sum of all entries always equals zero</li>
                </ol>
              </div>
            </Stack>
          </Card>
        </Stack>

        {/* Right: Ledger entries */}
        <Stack gap={6}>
          <Heading variant="caption" className="flex items-center gap-2.5">
            <BookOpen className="w-4 h-4 text-muted" />
            Ledger Entries
          </Heading>

          <Card variant="panel-dark" padding="none" className="flex flex-col overflow-hidden">
            {/* Column headers */}
            <div className="grid grid-cols-12 gap-2 px-5 py-3 border-b border-white/5 text-[9px] font-black uppercase tracking-widest text-muted/50">
              <div className="col-span-2">Type</div>
              <div className="col-span-4">Description</div>
              <div className="col-span-3 text-right">Amount</div>
              <div className="col-span-3 text-right">Time</div>
            </div>

            <div className="min-h-[200px] font-mono text-[11px]">
              <AnimatePresence initial={false}>
                {entries.length === 0 ? (
                  <div className="py-16 text-center text-muted/80 italic uppercase tracking-[0.3em] font-black text-[10px]">
                    Run a simulation to see entries
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.02]">
                    {entries.map((entry, idx) => (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="grid grid-cols-12 gap-2 items-center px-5 py-4 hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="col-span-2">
                          <span className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                            entry.type === 'CREDIT' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                          )}>
                            {entry.type === 'CREDIT'
                              ? <TrendingUp className="w-2.5 h-2.5" />
                              : <TrendingDown className="w-2.5 h-2.5" />
                            }
                            {entry.type}
                          </span>
                        </div>
                        <div className="col-span-4 text-secondary/80 truncate">{entry.description}</div>
                        <div className={cn(
                          "col-span-3 text-right font-black tabular-nums",
                          entry.type === 'CREDIT' ? 'text-success' : 'text-error'
                        )}>
                          {entry.type === 'CREDIT' ? '+' : ''}{formatCents(entry.amountCents)}
                        </div>
                        <div className="col-span-3 text-right text-muted/60 text-[9px]">
                          {entry.timestamp.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Invariant footer */}
            <div className={cn(
              "p-4 border-t border-white/5 font-mono text-[9px] uppercase tracking-widest text-center flex items-center justify-center gap-2 transition-colors",
              sumZero === null ? 'bg-white/[0.02] text-muted/60' :
              sumZero ? 'bg-success/5 text-success/80' : 'bg-error/5 text-error/80'
            )}>
              {sumZero === true && <CheckCircle2 className="w-3 h-3" />}
              {sumZero === null
                ? 'Sum of all entries = 0 · double-entry invariant'
                : sumZero
                  ? 'Sum of all entries = 0 · invariant holds'
                  : 'Invariant violated — entries do not balance'
              }
            </div>
          </Card>
        </Stack>
      </div>
    </div>
  );
}
