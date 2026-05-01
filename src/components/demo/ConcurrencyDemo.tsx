import { useState } from 'react';

interface InventoryState {
  quantity: number;
  version: number;
}

interface UserState {
  name: string;
  readQuantity: number | null;
  readVersion: number | null;
  newQuantity: string;
  status: 'idle' | 'reading' | 'saving' | 'success' | 'conflict';
  message: string;
}

export function ConcurrencyDemo() {
  const [inventory, setInventory] = useState<InventoryState>({ quantity: 50, version: 1 });
  const [userA, setUserA] = useState<UserState>({
    name: 'User A',
    readQuantity: null,
    readVersion: null,
    newQuantity: '',
    status: 'idle',
    message: ''
  });
  const [userB, setUserB] = useState<UserState>({
    name: 'User B',
    readQuantity: null,
    readVersion: null,
    newQuantity: '',
    status: 'idle',
    message: ''
  });
  const [isRacing, setIsRacing] = useState(false);

  const readInventory = async (user: 'A' | 'B') => {
    const setUser = user === 'A' ? setUserA : setUserB;
    setUser(prev => ({ ...prev, status: 'reading', message: 'Reading...' }));

    await new Promise(r => setTimeout(r, 200));

    setUser(prev => ({
      ...prev,
      readQuantity: inventory.quantity,
      readVersion: inventory.version,
      newQuantity: String(inventory.quantity - (user === 'A' ? 10 : 5)),
      status: 'idle',
      message: `Read: ${inventory.quantity} (v${inventory.version})`
    }));
  };

  const saveInventory = async (user: 'A' | 'B') => {
    const userState = user === 'A' ? userA : userB;
    const setUser = user === 'A' ? setUserA : setUserB;

    if (userState.readVersion === null) return;

    setUser(prev => ({ ...prev, status: 'saving', message: 'Saving...' }));
    await new Promise(r => setTimeout(r, 300));

    // Check version
    if (userState.readVersion !== inventory.version) {
      setUser(prev => ({
        ...prev,
        status: 'conflict',
        message: `Conflict! Expected v${userState.readVersion}, but current is v${inventory.version}`
      }));
      return;
    }

    // Success - update inventory
    const newQuantity = parseInt(userState.newQuantity);
    setInventory(prev => ({
      quantity: newQuantity,
      version: prev.version + 1
    }));

    setUser(prev => ({
      ...prev,
      status: 'success',
      message: `Saved: ${newQuantity} (v${inventory.version + 1})`
    }));
  };

  const raceUpdates = async () => {
    setIsRacing(true);

    // Reset states
    setUserA(prev => ({ ...prev, status: 'idle', message: '', readQuantity: null, readVersion: null }));
    setUserB(prev => ({ ...prev, status: 'idle', message: '', readQuantity: null, readVersion: null }));

    // Both read simultaneously
    await Promise.all([readInventory('A'), readInventory('B')]);
    await new Promise(r => setTimeout(r, 300));

    // Both try to save - A goes first
    await saveInventory('A');
    await new Promise(r => setTimeout(r, 200));

    // B tries to save with stale version
    await saveInventory('B');

    setIsRacing(false);
  };

  const reset = () => {
    setInventory({ quantity: 50, version: 1 });
    setUserA({ name: 'User A', readQuantity: null, readVersion: null, newQuantity: '', status: 'idle', message: '' });
    setUserB({ name: 'User B', readQuantity: null, readVersion: null, newQuantity: '', status: 'idle', message: '' });
  };

  const renderUser = (user: UserState, id: 'A' | 'B') => {
    const setUser = id === 'A' ? setUserA : setUserB;
    const borderColor = user.status === 'success' ? 'border-success' :
                        user.status === 'conflict' ? 'border-error' : 'border-border';

    return (
      <div className={`glass rounded-xl p-5 border-2 ${borderColor} transition-colors`}>
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-primary">{user.name}</h4>
          {user.status !== 'idle' && (
            <span className={`px-2 py-0.5 text-xs rounded-full ${
              user.status === 'success' ? 'bg-success/20 text-success' :
              user.status === 'conflict' ? 'bg-error/20 text-error' :
              'bg-info/20 text-info'
            }`}>
              {user.status}
            </span>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => readInventory(id)}
              disabled={isRacing}
              className="flex-1 py-2 rounded-lg border border-info/50 text-info hover:bg-info/10 transition-colors text-sm disabled:opacity-50"
            >
              Read
            </button>
            <button
              onClick={() => saveInventory(id)}
              disabled={isRacing || user.readVersion === null}
              className="flex-1 py-2 rounded-lg border border-success/50 text-success hover:bg-success/10 transition-colors text-sm disabled:opacity-50"
            >
              Save
            </button>
          </div>

          {user.readQuantity !== null && (
            <div className="p-3 bg-surface rounded-lg space-y-2 animate-fade-in">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Read Value</span>
                <span className="font-mono text-primary">{user.readQuantity}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Version</span>
                <span className="font-mono text-secondary">v{user.readVersion}</span>
              </div>
              <div>
                <label className="text-xs text-muted">New Value</label>
                <input
                  type="number"
                  value={user.newQuantity}
                  onChange={e => setUser(prev => ({ ...prev, newQuantity: e.target.value }))}
                  disabled={isRacing}
                  className="w-full px-3 py-2 bg-elevated rounded-lg text-primary outline-none mt-1"
                />
              </div>
            </div>
          )}

          {user.message && (
            <div className={`text-sm ${
              user.status === 'success' ? 'text-success' :
              user.status === 'conflict' ? 'text-error' : 'text-secondary'
            }`}>
              {user.message}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Current State */}
      <div className="glass rounded-xl p-6">
        <h3 className="text-lg font-semibold text-primary mb-4">Inventory Item: Widget Pro</h3>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted">Current Stock</div>
            <div className="text-4xl font-bold text-primary">{inventory.quantity}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted">Version</div>
            <div className="text-2xl font-mono text-accent">v{inventory.version}</div>
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={raceUpdates}
            disabled={isRacing}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-accent to-accent-light text-white font-medium disabled:opacity-50 transition-all"
          >
            {isRacing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span> Racing...
              </span>
            ) : (
              '⚡ Race Both Updates'
            )}
          </button>
          <button
            onClick={reset}
            disabled={isRacing}
            className="px-4 py-3 rounded-xl border border-border text-secondary hover:text-primary transition-colors disabled:opacity-50"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Users */}
      <div className="grid md:grid-cols-2 gap-4">
        {renderUser(userA, 'A')}
        {renderUser(userB, 'B')}
      </div>

      {/* Explanation */}
      <div className="glass rounded-xl p-6">
        <h4 className="font-semibold text-primary mb-3">How Optimistic Concurrency Works</h4>
        <div className="grid md:grid-cols-3 gap-4 text-sm text-secondary">
          <div className="p-3 bg-surface rounded-lg">
            <strong className="text-info">1. Read with Version</strong>
            <p className="mt-1">Each read includes the current version (ETag/RowVersion).</p>
          </div>
          <div className="p-3 bg-surface rounded-lg">
            <strong className="text-warning">2. Check on Write</strong>
            <p className="mt-1">On save, server checks if version matches. If not, reject.</p>
          </div>
          <div className="p-3 bg-surface rounded-lg">
            <strong className="text-error">3. Handle Conflict</strong>
            <p className="mt-1">Client refreshes data and retries, or notifies user.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
