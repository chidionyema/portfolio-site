import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, ShieldCheck, ShieldAlert, ArrowRightLeft, KeyRound, Lock, Unlock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useDemoSession } from '../../hooks/useDemoSession';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Heading } from '../ui/Heading';
import { Stack } from '../ui/Stack';
import { Pill } from '../ui/Pill';
import { cn } from '../../lib/utils';
import type { RequestMetadata } from '../../lib/api/demo-client';
import { RequestReceipt } from './RequestReceipt';

type RotationStage = 'idle' | 'started' | 'activated' | 'grace_period' | 'revoked' | 'failed';

interface StageEntry {
  id: string;
  stage: RotationStage;
  timestamp: Date;
  version?: number;
  previousVersion?: number;
}

const STAGE_CONFIG: Record<RotationStage, { icon: typeof Key; color: string; bg: string; label: string; desc: string }> = {
  idle:         { icon: Key,            color: 'text-muted',   bg: 'bg-white/5',    label: 'Idle',           desc: 'Current lease active' },
  started:      { icon: ArrowRightLeft, color: 'text-warning', bg: 'bg-warning/10', label: 'Requesting',     desc: 'New credentials requested from Vault' },
  activated:    { icon: KeyRound,       color: 'text-accent',  bg: 'bg-accent/10',  label: 'Activated',      desc: 'New credentials applied to service' },
  grace_period: { icon: Unlock,         color: 'text-primary',  bg: 'bg-primary/10', label: 'Dual-Key',       desc: 'Both old + new credentials valid' },
  revoked:      { icon: Lock,           color: 'text-success', bg: 'bg-success/10', label: 'Complete',       desc: 'Old credentials revoked on Postgres' },
  failed:       { icon: XCircle,        color: 'text-error',   bg: 'bg-error/10',   label: 'Failed',         desc: 'Rotation failed — old credentials still active' },
};

const ROTATION_SEQUENCE: RotationStage[] = ['started', 'activated', 'grace_period', 'revoked'];

export function VaultRotationDemo() {
  const [stages, setStages] = useState<StageEntry[]>([]);
  const [currentStage, setCurrentStage] = useState<RotationStage>('idle');
  const [isRotating, setIsRotating] = useState(false);
  const [vaultStatus, setVaultStatus] = useState<{ version: number; status: string } | null>(null);
  const [receipts, setReceipts] = useState<RequestMetadata[]>([]);
  const [receipt, setReceipt] = useState<RequestMetadata | null>(null);

  const { executeCommand, events } = useDemoSession('vault');

  // Map SignalR VaultRotation events to stages
  useEffect(() => {
    if (events.length === 0) return;
    const last = events[0];
    if (!last.stage) return;

    const stageMap: Record<string, RotationStage> = {
      started: 'started',
      'credentials-fetched': 'activated',
      applied: 'activated',
      activated: 'activated',
      validated: 'grace_period',
      grace_period: 'grace_period',
      'revoked-old': 'revoked',
      revoked: 'revoked',
      failed: 'failed',
    };

    const mapped = stageMap[last.stage] ?? last.stage as RotationStage;
    if (mapped === currentStage) return;

    setCurrentStage(mapped);
    setStages(prev => [{
      id: crypto.randomUUID(),
      stage: mapped,
      timestamp: new Date(last.timestamp ?? Date.now()),
      version: last.version,
      previousVersion: last.previousVersion,
    }, ...prev].slice(0, 20));

    if (mapped === 'revoked' || mapped === 'failed') {
      setIsRotating(false);
    }
  }, [events]);

  const checkStatus = useCallback(async () => {
    try {
      const res = await executeCommand('/vault/status', {}, { method: 'GET' });
      if (res) {
        setVaultStatus({ version: res.currentVersion ?? 0, status: res.status ?? 'unknown' });
        setReceipts(prev => [res, ...prev].slice(0, 5));
        setReceipt(res as RequestMetadata);
      }
    } catch {
      /* fallback to null when vault status endpoint is unreachable */
      setVaultStatus(null);
    }
  }, [executeCommand]);

  useEffect(() => { checkStatus(); }, []);

  const rotateCredentials = useCallback(async () => {
    setIsRotating(true);
    setCurrentStage('started');
    setStages([{
      id: crypto.randomUUID(),
      stage: 'started',
      timestamp: new Date(),
    }]);

    try {
      const res = await executeCommand('/vault/rotate', {});
      if (res) {
        setReceipts(prev => [res, ...prev].slice(0, 5));
        setReceipt(res as RequestMetadata);
      }
    } catch {
      /* rotation API unreachable — surface failure via stage UI, non-fatal */
      setIsRotating(false);
      setCurrentStage('failed');
    }
  }, [executeCommand]);

  const config = STAGE_CONFIG[currentStage];

  return (
    <div className="space-y-8">
      {/* Stage Timeline */}
      <div className="relative">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 relative">
          {/* Connecting line */}
          <div className="absolute top-8 left-[12.5%] right-[12.5%] h-px bg-white/10 hidden md:block" />

          {ROTATION_SEQUENCE.map((stage, i) => {
            const cfg = STAGE_CONFIG[stage];
            const Icon = cfg.icon;
            const seqIdx = ROTATION_SEQUENCE.indexOf(currentStage);
            const stageIdx = i;
            const isDone = seqIdx > stageIdx || (currentStage === 'revoked' && stageIdx <= seqIdx);
            const isActive = currentStage === stage;
            const isPending = seqIdx < stageIdx && currentStage !== 'idle';
            const isIdle = currentStage === 'idle';

            return (
              <div key={stage} className="flex flex-col items-center text-center relative z-10">
                <motion.div
                  animate={isActive ? { scale: [1, 1.15, 1] } : {}}
                  transition={{ duration: 0.6, repeat: isActive && isRotating ? Infinity : 0 }}
                  className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all duration-500",
                    isActive ? `${cfg.bg} ${cfg.color} border-current shadow-lg` :
                    isDone ? 'bg-success/10 text-success border-success/40' :
                    'bg-white/5 text-muted/30 border-white/10'
                  )}
                >
                  {isDone && !isActive ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : isActive && isRotating ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Icon className="w-6 h-6" />
                  )}
                </motion.div>

                <div className={cn(
                  "mt-3 text-[9px] font-black uppercase tracking-widest transition-colors",
                  isActive ? cfg.color : isDone ? 'text-success' : 'text-muted/30'
                )}>
                  {cfg.label}
                </div>
                <div className={cn(
                  "mt-1 text-[8px] leading-tight max-w-[100px] transition-colors",
                  isActive ? 'text-secondary' : isDone ? 'text-success/60' : 'text-muted/20'
                )}>
                  {cfg.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dual-Key Overlap Indicator */}
      <AnimatePresence>
        {currentStage === 'grace_period' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card variant="panel-dark" padding="md" className="border border-primary/20 bg-primary/[0.03]">
              <div className="flex items-center justify-center gap-6 font-mono">
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-10 h-10 rounded-lg bg-warning/20 border border-warning/30 flex items-center justify-center"
                  >
                    <Key className="w-5 h-5 text-warning" />
                  </motion.div>
                  <div className="text-[9px] uppercase tracking-widest">
                    <div className="text-warning font-black">v{stages[0]?.previousVersion ?? '?'}</div>
                    <div className="text-muted">old (fading)</div>
                  </div>
                </div>

                <div className="text-[10px] text-primary font-black uppercase tracking-widest px-4 py-2 bg-primary/10 rounded-lg border border-primary/20">
                  Both valid
                </div>

                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-10 h-10 rounded-lg bg-success/20 border border-success/30 flex items-center justify-center"
                  >
                    <KeyRound className="w-5 h-5 text-success" />
                  </motion.div>
                  <div className="text-[9px] uppercase tracking-widest">
                    <div className="text-success font-black">v{stages[0]?.version ?? '?'}</div>
                    <div className="text-muted">new (active)</div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left: Controls */}
        <Stack gap={6}>
          <Card variant="panel-dark" padding="lg">
            <Stack gap={6} className="font-mono">
              {/* Current state */}
              <div className={cn(
                "p-5 rounded-xl border transition-all duration-500",
                config.bg, `border-${config.color.replace('text-', '')}/30`
              )}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className={cn("w-5 h-5", vaultStatus ? 'text-success' : 'text-error')} />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      PG_ROLE: identity_owner
                    </span>
                  </div>
                  <Pill variant={vaultStatus ? 'success' : 'error'}>
                    {vaultStatus ? 'ACTIVE' : 'UNREACHABLE'}
                  </Pill>
                </div>
                {vaultStatus && (
                  <div className="flex items-center justify-between text-[10px] text-muted pt-3 border-t border-white/5">
                    <span>Lease version: <span className="text-primary font-black">v{vaultStatus.version}</span></span>
                    <span>Status: <span className="text-success font-black">{vaultStatus.status}</span></span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="primary"
                  onClick={checkStatus}
                  disabled={isRotating}
                  className="w-full h-auto py-4 font-black text-xs uppercase tracking-widest rounded-xl flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Verify
                </Button>
                <Button
                  variant="secondary"
                  onClick={rotateCredentials}
                  disabled={isRotating}
                  className={cn(
                    "w-full h-auto py-4 font-black text-xs uppercase tracking-widest rounded-xl flex items-center justify-center gap-2",
                    isRotating ? "bg-warning/20 border-warning/40 text-warning" : "border-warning/30 text-warning hover:bg-warning/10"
                  )}
                >
                  {isRotating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
                  {isRotating ? 'Rotating...' : 'Rotate now'}
                </Button>
              </div>

              <p className="text-[10px] text-muted/60 leading-relaxed">
                Triggers real HashiCorp Vault credential rotation on identity-svc.
                Watch the 4 stages stream in via SignalR as the lease cycles.
              </p>

              <RequestReceipt
                traceId={receipt?.traceId}
                latencyMs={receipt?.latencyMs}
                statusCode={receipt?.statusCode}
                service={receipt?.service}
              />
            </Stack>
          </Card>
        </Stack>

        {/* Right: Stage History */}
        <Stack gap={6}>
          <Heading variant="caption" className="flex items-center gap-2.5">
            <Key className="w-4 h-4 text-muted" />
            Rotation History
          </Heading>

          <Card variant="panel-dark" padding="none" className="h-[440px] flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto font-mono text-[11px]">
              <AnimatePresence initial={false}>
                {stages.length === 0 ? (
                  <div className="py-24 text-center text-muted/80 italic uppercase tracking-[0.4em] font-black">
                    Trigger a rotation to see stages stream in
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.02]">
                    {stages.map((entry) => {
                      const cfg = STAGE_CONFIG[entry.stage];
                      const Icon = cfg.icon;
                      return (
                        <motion.div
                          key={entry.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors"
                        >
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", cfg.bg)}>
                            <Icon className={cn("w-4 h-4", cfg.color)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={cn("text-[10px] font-black uppercase tracking-widest", cfg.color)}>
                              {cfg.label}
                            </div>
                            <div className="text-[9px] text-muted mt-0.5">
                              {cfg.desc}
                              {entry.version && <span className="ml-2 text-primary">v{entry.version}</span>}
                            </div>
                          </div>
                          <div className="text-[9px] text-muted/60 tabular-nums shrink-0">
                            {entry.timestamp.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </AnimatePresence>
            </div>

            <div className="p-4 bg-white/[0.02] border-t border-white/5 font-mono text-[9px] text-muted/60 uppercase tracking-widest text-center">
              Vault AppRole · RS256 JWT · 15-min dual-key overlap · zero dropped connections
            </div>
          </Card>
        </Stack>
      </div>
    </div>
  );
}
