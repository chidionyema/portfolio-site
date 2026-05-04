import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Zap, Database, User, ShieldCheck, Save, ArrowRightLeft } from 'lucide-react';
import { useDemoSession } from '../../hooks/useDemoSession';

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
    name: 'User_A', readQuantity: null, readVersion: null, newQuantity: '', status: 'idle', message: ''
  });
  const [userB, setUserB] = useState<UserState>({
    name: 'User_B', readQuantity: null, readVersion: null, newQuantity: '', status: 'idle', message: ''
  });
  const [isRacing, setIsRacing] = useState(false);

  const { executeCommand, events, isConnected } = useDemoSession('concurrency');

  useEffect(() => {
     if (events.length > 0) {
        const lastEvent = events[0];
        if (lastEvent.action === 'update_inventory' && lastEvent.status === 'conflict') {
           fetchInventory(); // Refresh local state on conflict
        }
     }
  }, [events]);

  const fetchInventory = async (user?: 'A' | 'B') => {
    const setUser = user === 'A' ? setUserA : user === 'B' ? setUserB : null;
    if (setUser) setUser(prev => ({ ...prev, status: 'reading', message: 'Fetching_State...' }));
    try {
      const result = await executeCommand('/inventory/demo-stock');
      setInventory({ quantity: result.inventory.quantity, version: result.inventory.version });
      if (setUser) {
         setUser(prev => ({
            ...prev,
            readQuantity: result.inventory.quantity,
            readVersion: result.inventory.version,
            newQuantity: String(result.inventory.quantity - (user === 'A' ? 10 : 5)),
            status: 'idle',
            message: `Snapshot: v${result.inventory.version}`
         }));
      }
    } catch (err) {}
  };

  useEffect(() => { fetchInventory(); }, []);

  const saveInventory = async (user: 'A' | 'B') => {
    const userState = user === 'A' ? userA : userB;
    const setUser = user === 'A' ? setUserA : setUserB;
    if (userState.readVersion === null) return;
    setUser(prev => ({ ...prev, status: 'saving', message: 'Committing...' }));
    try {
      // The backend expects If-Match header for optimistic concurrency.
      const response = await fetch(`${import.meta.env.PUBLIC_API_URL || 'http://localhost:5000'}/api/demo/inventory/demo-stock`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'If-Match': `"${userState.readVersion}"`
        },
        body: JSON.stringify({ quantity: parseInt(userState.newQuantity) }),
      });

      const result = await response.json();

      if (response.ok) {
         setInventory({ quantity: result.inventory.quantity, version: result.inventory.version });
         setUser(prev => ({ ...prev, status: 'success', message: `Committed: v${result.inventory.version}` }));
      } else if (response.status === 409) {
         setUser(prev => ({ ...prev, status: 'conflict', message: `Conflict: v${result.currentVersion} Found` }));
         setInventory(prev => ({ ...prev, version: result.currentVersion }));
      }
    } catch (err: any) {
       setUser(prev => ({ ...prev, status: 'conflict', message: 'Update Failed' }));
    }
  };

  const raceUpdates = async () => {
    setIsRacing(true);
    await Promise.all([fetchInventory('A'), fetchInventory('B')]);
    await new Promise(r => setTimeout(r, 800));
    await saveInventory('A');
    await new Promise(r => setTimeout(r, 600));
    await saveInventory('B');
    setIsRacing(false);
  };

  const renderUser = (user: UserState, id: 'A' | 'B') => {
    const isActive = user.status !== 'idle';
    return (
      <div className={`surface p-8 shadow-xl transition-all border-2 ${user.status === 'conflict' ? 'border-error/50 shadow-error/10' : 'border-transparent'}`}>
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
                <User className={`w-5 h-5 ${id === 'A' ? 'text-accent' : 'text-purple-400'}`} />
             </div>
             <h4 className="font-bold text-primary uppercase tracking-widest">{user.name}</h4>
          </div>
          <AnimatePresence>
            {isActive && (
              <motion.span initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full ${
                user.status === 'success' ? 'bg-success text-white' :
                user.status === 'conflict' ? 'bg-error text-white' :
                'bg-info text-white animate-pulse'
              }`}>
                {user.status}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => fetchInventory(id)}
              disabled={isRacing || isActive || !isConnected}
              className="py-3 px-4 glass-subtle text-[10px] font-black uppercase tracking-[0.2em] text-muted hover:text-primary transition-all disabled:opacity-20"
            >
              Get_Snapshot
            </button>
            <button
              onClick={() => saveInventory(id)}
              disabled={isRacing || user.readVersion === null || isActive || !isConnected}
              className="py-3 px-4 glass-subtle text-[10px] font-black uppercase tracking-[0.2em] text-muted hover:text-success transition-all disabled:opacity-20"
            >
              Put_Commit
            </button>
          </div>

          <AnimatePresence>
            {user.readQuantity !== null && (
               <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 font-mono">
                  <div className="p-5 bg-black/40 border border-white/5 rounded-2xl space-y-2 text-[11px]">
                     <div className="flex justify-between">
                        <span className="text-muted/60 uppercase font-black tracking-widest">Snapshot_Value</span>
                        <span className="text-secondary font-bold">{user.readQuantity} units</span>
                     </div>
                     <div className="flex justify-between">
                        <span className="text-muted/60 uppercase font-black tracking-widest">Snapshot_ETag</span>
                        <span className="text-accent-light font-black">v{user.readVersion}</span>
                     </div>
                  </div>
                  
                  <div className="space-y-2">
                     <label className="text-[10px] text-muted font-black uppercase tracking-[0.3em] ml-1">Draft_Update</label>
                     <div className="relative">
                        <input
                           type="number"
                           value={user.newQuantity}
                           onChange={e => id === 'A' ? setUserA(prev => ({ ...prev, newQuantity: e.target.value })) : setUserB(prev => ({ ...prev, newQuantity: e.target.value }))}
                           disabled={isRacing || isActive}
                           className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-primary outline-none font-mono text-base focus:border-accent/40 transition-colors"
                        />
                        <Save className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 opacity-20" />
                     </div>
                  </div>
               </motion.div>
            )}
          </AnimatePresence>

          {user.message && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`text-[10px] font-mono font-black p-3 rounded-xl border-l-4 bg-black/40 ${user.status === 'conflict' ? 'border-error text-error' : user.status === 'success' ? 'border-success text-success' : 'border-info text-info'}`}>
              {user.message.toUpperCase()}
            </motion.div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-10">
      <div className="surface p-10 shadow-2xl relative overflow-hidden font-mono">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none grayscale">
           <Database className="w-64 h-64 text-white" />
        </div>
        
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12 relative z-10">
          <div className="text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-3 mb-6">
               <div className="w-2 h-2 bg-success rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
               <h3 className="text-xs font-black text-muted uppercase tracking-[0.4em] whitespace-nowrap">Production_Cluster_State</h3>
            </div>
            <div className="flex items-baseline justify-center lg:justify-start gap-8">
              <div className="text-8xl font-black text-primary tracking-tighter tabular-nums leading-none">{inventory.quantity}</div>
              <div className="px-5 py-2 bg-white/5 border border-white/10 rounded-full text-accent-light font-black text-xs tracking-[0.2em] uppercase">
                 ETag_v{inventory.version}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-5 w-full md:w-auto min-w-[320px]">
            <button
               onClick={raceUpdates}
               disabled={isRacing || !isConnected}
               className="py-5 px-8 bg-white text-black font-black text-sm uppercase rounded-2xl transition-all shadow-[0_20px_50px_rgba(255,255,255,0.1)] flex items-center justify-center gap-4 disabled:opacity-20"
            >
               {isRacing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 fill-current" />}
               Trigger_Atomic_Race
            </button>
            <div className="flex items-center justify-between px-2 font-black uppercase tracking-widest text-[9px]">
               <div className="flex items-center gap-2.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-success shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 'bg-muted'}`} />
                  <span className="text-muted">{isConnected ? 'Live_Sync_Active' : 'Offline_Snapshot'}</span>
               </div>
               <button onClick={() => fetchInventory()} className="text-secondary hover:text-primary underline underline-offset-8 decoration-white/10">Synchronize_State</button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {renderUser(userA, 'A')}
        {renderUser(userB, 'B')}
      </div>

      <div className="glass-subtle p-5 flex items-center gap-6 font-mono">
         <ShieldCheck className="w-6 h-6 text-success opacity-50 shrink-0" />
         <p className="text-[10px] text-muted font-bold leading-relaxed uppercase tracking-widest">
            Entity_Framework_Core [OptimisticConcurrency] engine engaged. <br/>
            The second commit will trigger a real [DbUpdateConcurrencyException] at the data layer.
         </p>
      </div>
    </div>
  );
}
