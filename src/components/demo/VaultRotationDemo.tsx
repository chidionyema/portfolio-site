import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Key, RefreshCw, Check, Clock, Shield, Eye, EyeOff } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { cn } from '../../lib/utils';

interface Credential {
  id: string;
  username: string;
  password: string;
  issuedAt: Date;
  expiresAt: Date;
  status: 'active' | 'expiring' | 'rotating' | 'expired';
}

interface RotationLog {
  id: string;
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'warning';
}

interface RequestDot {
  id: string;
  success: boolean;
}

export function VaultRotationDemo() {
  const [credential, setCredential] = useState<Credential | null>(null);
  const [logs, setLogs] = useState<RotationLog[]>([]);
  const [requests, setRequests] = useState<RequestDot[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [isSpeedUp, setIsSpeedUp] = useState(false);
  const [ttlProgress, setTtlProgress] = useState(100);

  const TTL_SECONDS = isSpeedUp ? 10 : 120; // 10s for demo, 2min normally
  const ROTATION_THRESHOLD = 0.8; // Rotate at 80% TTL

  const addLog = useCallback((message: string, type: RotationLog['type'] = 'info') => {
    setLogs((prev) => [
      {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        message,
        type,
      },
      ...prev.slice(0, 19),
    ]);
  }, []);

  const generateCredential = useCallback((): Credential => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + TTL_SECONDS * 1000);
    const randomId = Math.random().toString(36).substring(2, 8);

    return {
      id: crypto.randomUUID(),
      username: `v-app-role-${randomId}`,
      password: Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(''),
      issuedAt: now,
      expiresAt,
      status: 'active',
    };
  }, [TTL_SECONDS]);

  // Initialize credential
  useEffect(() => {
    const newCred = generateCredential();
    setCredential(newCred);
    addLog(`Credential issued: ${newCred.username}`, 'info');
    addLog('Connection pool updated (warm)', 'success');
  }, [generateCredential, addLog]);

  // TTL countdown and rotation
  useEffect(() => {
    if (!credential) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const total = credential.expiresAt.getTime() - credential.issuedAt.getTime();
      const remaining = credential.expiresAt.getTime() - now;
      const progress = Math.max(0, (remaining / total) * 100);

      setTtlProgress(progress);

      // Check for rotation threshold
      if (progress <= (1 - ROTATION_THRESHOLD) * 100 && credential.status === 'active') {
        // Start rotation
        setCredential((prev) => prev ? { ...prev, status: 'rotating' } : null);
        addLog(`Rotation triggered (${Math.round(ROTATION_THRESHOLD * 100)}% TTL reached)`, 'warning');
        addLog('New credential requested from Vault', 'info');

        // Simulate rotation delay
        setTimeout(() => {
          const newCred = generateCredential();
          setCredential(newCred);
          addLog(`New credential issued: ${newCred.username}`, 'info');
          addLog('Connection pool updated (graceful)', 'success');
          addLog('Old connections draining...', 'info');

          setTimeout(() => {
            addLog('Old credential expired (0 active connections)', 'success');
          }, 2000);
        }, 500);
      }

      // Expired
      if (progress <= 0 && credential.status !== 'rotating') {
        setCredential((prev) => prev ? { ...prev, status: 'expired' } : null);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [credential, generateCredential, addLog, ROTATION_THRESHOLD]);

  // Simulate requests
  useEffect(() => {
    const interval = setInterval(() => {
      const success = credential?.status !== 'expired';
      setRequests((prev) => [
        { id: crypto.randomUUID(), success },
        ...prev.slice(0, 99),
      ]);
    }, 200);

    return () => clearInterval(interval);
  }, [credential]);

  const formatTimeRemaining = (expiresAt: Date): string => {
    const remaining = Math.max(0, expiresAt.getTime() - Date.now());
    const seconds = Math.floor(remaining / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const statusConfig = {
    active: { color: 'success', label: 'Active', icon: Shield },
    expiring: { color: 'warning', label: 'Expiring', icon: Clock },
    rotating: { color: 'info', label: 'Rotating', icon: RefreshCw },
    expired: { color: 'error', label: 'Expired', icon: Key },
  };

  const currentStatus = credential ? statusConfig[credential.status] : null;

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Current Credentials */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Current Credentials</span>
            {currentStatus && (
              <Badge variant={currentStatus.color as 'success' | 'warning' | 'info' | 'error'}>
                {currentStatus.label}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {credential && (
            <>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted block mb-1">Username</label>
                  <div className="font-mono text-sm bg-surface px-3 py-2 rounded-lg">
                    {credential.username}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted block mb-1">Password</label>
                  <div className="flex items-center gap-2">
                    <div className="font-mono text-sm bg-surface px-3 py-2 rounded-lg flex-1 overflow-hidden">
                      {showPassword ? credential.password : '••••••••••••••••'}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* TTL Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-secondary">TTL Remaining</span>
                  <span className="font-mono text-primary">
                    {formatTimeRemaining(credential.expiresAt)}
                  </span>
                </div>
                <div className="h-2 bg-surface rounded-full overflow-hidden">
                  <motion.div
                    className={cn(
                      'h-full rounded-full transition-colors',
                      ttlProgress > 40 ? 'bg-success' :
                      ttlProgress > 20 ? 'bg-warning' : 'bg-error'
                    )}
                    animate={{ width: `${ttlProgress}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
                <div className="text-xs text-muted">
                  Rotation at {Math.round(ROTATION_THRESHOLD * 100)}% TTL
                </div>
              </div>
            </>
          )}

          <Button
            variant="secondary"
            onClick={() => setIsSpeedUp(!isSpeedUp)}
            className="w-full"
          >
            {isSpeedUp ? (
              <>
                <Clock className="w-4 h-4" />
                Normal Speed (2 min TTL)
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Speed Up Demo (10s TTL)
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Request Monitor */}
      <Card>
        <CardHeader>
          <CardTitle>Request Monitor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-secondary">
              Requests during credential rotation (all should succeed):
            </div>

            {/* Request dots visualization */}
            <div className="flex flex-wrap gap-0.5 p-3 bg-surface rounded-lg min-h-[100px]">
              {requests.map((req) => (
                <motion.div
                  key={req.id}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={cn(
                    'w-2 h-2 rounded-full',
                    req.success ? 'bg-success' : 'bg-error'
                  )}
                />
              ))}
            </div>

            <div className="flex justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-success" />
                <span className="text-secondary">
                  Success: {requests.filter((r) => r.success).length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-error" />
                <span className="text-secondary">
                  Failed: {requests.filter((r) => !r.success).length}
                </span>
              </div>
            </div>

            <div className="p-3 bg-success/10 border border-success/30 rounded-lg text-sm text-success">
              <Check className="w-4 h-4 inline mr-2" />
              Zero downtime during credential rotation
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rotation Log */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Rotation Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-[200px] overflow-y-auto space-y-1">
            {logs.map((log) => (
              <div
                key={log.id}
                className={cn(
                  'flex items-center gap-3 px-3 py-1.5 text-sm',
                  {
                    'text-secondary': log.type === 'info',
                    'text-success': log.type === 'success',
                    'text-warning': log.type === 'warning',
                  }
                )}
              >
                <span className="font-mono text-xs text-muted w-20 shrink-0">
                  {log.timestamp.toLocaleTimeString()}
                </span>
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full shrink-0',
                    {
                      'bg-info': log.type === 'info',
                      'bg-success': log.type === 'success',
                      'bg-warning': log.type === 'warning',
                    }
                  )}
                />
                <span>{log.message}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
