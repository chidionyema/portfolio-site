import { useState, useEffect, useCallback } from 'react';

interface Credential {
  id: string;
  username: string;
  issuedAt: Date;
  expiresAt: Date;
}

interface LogEntry {
  id: string;
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'warning';
}

export function VaultRotationDemo() {
  const [credential, setCredential] = useState<Credential | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [requests, setRequests] = useState<boolean[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [isSpeedUp, setIsSpeedUp] = useState(true); // Start fast for demo
  const [ttlProgress, setTtlProgress] = useState(100);
  const [isRotating, setIsRotating] = useState(false);

  const TTL = isSpeedUp ? 10000 : 120000;
  const ROTATION_THRESHOLD = 0.8;

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [{ id: crypto.randomUUID(), timestamp: new Date(), message, type }, ...prev.slice(0, 15)]);
  }, []);

  const generateCredential = useCallback((): Credential => {
    const now = new Date();
    return {
      id: crypto.randomUUID(),
      username: `v-app-role-${Math.random().toString(36).substring(2, 8)}`,
      issuedAt: now,
      expiresAt: new Date(now.getTime() + TTL),
    };
  }, [TTL]);

  // Initialize
  useEffect(() => {
    const cred = generateCredential();
    setCredential(cred);
    addLog(`Credential issued: ${cred.username}`, 'info');
    addLog('Connection pool updated (warm)', 'success');
  }, [generateCredential, addLog]);

  // TTL countdown
  useEffect(() => {
    if (!credential) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const total = credential.expiresAt.getTime() - credential.issuedAt.getTime();
      const remaining = credential.expiresAt.getTime() - now;
      const progress = Math.max(0, (remaining / total) * 100);
      setTtlProgress(progress);

      // Rotation trigger
      if (progress <= (1 - ROTATION_THRESHOLD) * 100 && !isRotating) {
        setIsRotating(true);
        addLog(`Rotation triggered (${Math.round(ROTATION_THRESHOLD * 100)}% TTL)`, 'warning');
        addLog('New credential requested from Vault', 'info');

        setTimeout(() => {
          const newCred = generateCredential();
          setCredential(newCred);
          setIsRotating(false);
          addLog(`New credential issued: ${newCred.username}`, 'info');
          addLog('Connection pool updated (graceful)', 'success');
          setTimeout(() => addLog('Old credential expired (0 active conns)', 'success'), 1500);
        }, 500);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [credential, isRotating, generateCredential, addLog]);

  // Simulate requests
  useEffect(() => {
    const interval = setInterval(() => {
      setRequests(prev => [true, ...prev.slice(0, 99)]);
    }, 150);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (d: Date) => {
    const remaining = Math.max(0, d.getTime() - Date.now());
    const secs = Math.floor(remaining / 1000);
    return `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`;
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Credentials */}
      <div className="glass rounded-xl p-6">
        <h3 className="text-lg font-semibold text-primary mb-4 flex items-center justify-between">
          Current Credentials
          <span className={`px-2 py-0.5 text-xs rounded-full ${isRotating ? 'bg-warning/20 text-warning animate-pulse' : 'bg-success/20 text-success'}`}>
            {isRotating ? 'Rotating...' : 'Active'}
          </span>
        </h3>

        {credential && (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted block mb-1">Username</label>
              <div className="font-mono text-sm bg-surface px-3 py-2 rounded-lg">{credential.username}</div>
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">Password</label>
              <div className="flex items-center gap-2">
                <div className="font-mono text-sm bg-surface px-3 py-2 rounded-lg flex-1">
                  {showPassword ? '7f3a2b9c4d8e1f0a' : '••••••••••••••••'}
                </div>
                <button onClick={() => setShowPassword(!showPassword)} className="px-3 py-2 rounded-lg bg-elevated hover:bg-border transition-colors text-sm">
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {/* TTL Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-secondary">TTL Remaining</span>
                <span className="font-mono text-primary">{formatTime(credential.expiresAt)}</span>
              </div>
              <div className="h-2 bg-surface rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-100 ${ttlProgress > 40 ? 'bg-success' : ttlProgress > 20 ? 'bg-warning' : 'bg-error'}`}
                  style={{ width: `${ttlProgress}%` }}
                />
              </div>
              <div className="text-xs text-muted">Rotation at {Math.round(ROTATION_THRESHOLD * 100)}% TTL</div>
            </div>
          </div>
        )}

        <button
          onClick={() => setIsSpeedUp(!isSpeedUp)}
          className="w-full mt-4 py-2 rounded-lg border border-border text-secondary hover:text-primary hover:border-accent transition-colors text-sm"
        >
          {isSpeedUp ? '🐢 Normal Speed (2 min TTL)' : '🚀 Speed Up (10s TTL)'}
        </button>
      </div>

      {/* Request Monitor */}
      <div className="glass rounded-xl p-6">
        <h3 className="text-lg font-semibold text-primary mb-4">Request Monitor</h3>
        <p className="text-sm text-secondary mb-4">Requests during credential rotation (all should succeed):</p>

        <div className="flex flex-wrap gap-0.5 p-3 bg-surface rounded-lg min-h-[80px]">
          {requests.map((success, i) => (
            <div key={i} className={`w-2 h-2 rounded-full ${success ? 'bg-success' : 'bg-error'} animate-fade-in`} style={{ animationDelay: `${i * 10}ms` }} />
          ))}
        </div>

        <div className="flex justify-between text-sm mt-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-success" />
            <span className="text-secondary">Success: {requests.filter(r => r).length}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-error" />
            <span className="text-secondary">Failed: {requests.filter(r => !r).length}</span>
          </div>
        </div>

        <div className="mt-4 p-3 bg-success/10 border border-success/30 rounded-lg text-sm text-success flex items-center gap-2">
          ✓ Zero downtime during credential rotation
        </div>
      </div>

      {/* Log */}
      <div className="lg:col-span-2 glass rounded-xl p-6">
        <h3 className="text-lg font-semibold text-primary mb-4">Rotation Log</h3>
        <div className="max-h-[150px] overflow-y-auto space-y-1">
          {logs.map((log, i) => (
            <div
              key={log.id}
              className={`flex items-center gap-3 px-3 py-1.5 text-sm animate-fade-in ${
                log.type === 'success' ? 'text-success' : log.type === 'warning' ? 'text-warning' : 'text-secondary'
              }`}
              style={{ animationDelay: `${i * 20}ms` }}
            >
              <span className="font-mono text-xs text-muted w-20 shrink-0">{log.timestamp.toLocaleTimeString()}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${log.type === 'success' ? 'bg-success' : log.type === 'warning' ? 'bg-warning' : 'bg-info'}`} />
              <span>{log.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
