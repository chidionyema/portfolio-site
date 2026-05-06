import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Zap, Database, User, ShieldCheck, Save, ArrowRightLeft, Check } from 'lucide-react';
import { useDemoSession } from '../../hooks/useDemoSession';
import { RequestReceiptHistory } from './RequestReceipt';
import type { RequestMetadata } from '../../lib/api/demo-client';

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
  const [receipts, setReceipts] = useState<RequestMetadata[]>([]);
  const [lastAction, setLastAction] = useState<{ label: string; tooltip: string } | null>(null);

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
      const result = await executeCommand('/inventory/demo-stock', {}, { method: 'GET' });
      setReceipts(prev => [result, ...prev].slice(0, 10));
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
      const result = await executeCommand('/inventory/demo-stock', 
        { quantity: parseInt(userState.newQuantity) },
        { 
          method: 'PUT',
          headers: { 'If-Match': `"${userState.readVersion}"` }
        }
      );
      setReceipts(prev => [result, ...prev].slice(0, 10));

      setInventory({ quantity: result.inventory.quantity, version: result.inventory.version });
      setUser(prev => ({ ...prev, status: 'success', message: `Committed: v${result.inventory.version}` }));
      
      setLastAction({ 
        label: `Winner: version v${userState.readVersion} → v${result.inventory.version} committed.`, 
        tooltip: "The first request to reach the database claims the version increment." 
      });
    } catch (err: any) {
       setUser(prev => ({ ...prev, status: 'conflict', message: 'Update Failed' }));
       setLastAction({ 
         label: `Conflict: expected v${userState.readVersion}, found v${inventory.version}.`, 
         tooltip: "The second request tried to update version 1, but found the database is already at version 2. It must refresh and try again." 
       });
    }
  };

  const raceUpdates = async () => {
    setIsRacing(true);
    setLastAction({ label: "Concurrent updates dispatched.", tooltip: "" });
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
      <motion.div 
        animate={user.status === 'success' ? { 
           backgroundColor: ['rgba(34,197,94,0)', 'rgba(34,197,94,0.1)', 'rgba(34,197,94,0)'],
           scale: [1, 1.02, 1]
        } : {}}
        className={`surface p-8 shadow-xl transition-all border-2 ${user.status === 'conflict' ? 'border-error/50 shadow-error/10' : user.status === 'success' ? 'border-success/50 shadow-success/10' : 'border-transparent'}`}
      >
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
              disabled={isRacing || isActive}
              className="py-3 px-4 glass-subtle text-[10px] font-black uppercase tracking-[0.2em] text-muted hover:text-primary transition-all disabled:opacity-20"
            >
              Get_Snapshot
            </button>
            <button
              onClick={() => saveInventory(id)}
              disabled={isRacing || user.readVersion === null || isActive}
              className="py-3 px-4 glass-subtle text-[10px] font-black uppercase tracking-[0.2em] text-muted hover:text-success transition-all disabled:opacity-20"
            >
              Commit
            </button>
          </div>

          <AnimatePresence>
            {user.readQuantity !== null && (
               <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 font-mono">
                  <div className="p-5 bg-black/40 border border-white/5 rounded-2xl space-y-2 text-[11px]">
                     <div className="flex justify-between">
                        <span className="text-muted/60 uppercase font-black tracking-widest">Snapshot value</span>
                        <span className="text-secondary font-bold">{user.readQuantity} units</span>
                     </div>
                     <div className="flex justify-between">
                        <span className="text-muted/60 uppercase font-black tracking-widest">ETag</span>
                        <span className="text-accent-light font-black">v{user.readVersion}</span>
                     </div>
                  </div>
                  
                  <div className="space-y-2">
                     <label className="text-[10px] text-muted font-black uppercase tracking-[0.3em] ml-1">New value</label>
                     <motion.div 
                        animate={user.status === 'conflict' ? { 
                           x: [0, -10, 10, -10, 10, 0],
                           backgroundColor: ['rgba(255,255,255,0.05)', 'rgba(239,68,68,0.2)', 'rgba(255,255,255,0.05)']
                        } : {}}
                        transition={{ duration: 0.4 }}
                        className="relative rounded-2xl overflow-hidden"
                     >
                        <input
                           type="number"
                           value={user.newQuantity}
                           onChange={e => id === 'A' ? setUserA(prev => ({ ...prev, newQuantity: e.target.value })) : setUserB(prev => ({ ...prev, newQuantity: e.target.value }))}
                           disabled={isRacing || isActive}
                           className={`w-full px-5 py-4 bg-white/5 border rounded-2xl text-primary outline-none font-mono text-base transition-colors ${user.status === 'conflict' ? 'border-error' : 'border-white/10 focus:border-accent/40'}`}
                        />
                        <Save className={`absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${user.status === 'conflict' ? 'text-error' : 'opacity-20'}`} />
                     </motion.div>
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
      </motion.div>
    );
  };

  const isRaceOutcomeVisible = userA.status !== 'idle' && userB.status !== 'idle' && !isRacing;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2.5">
          <Database className="w-4 h-4 text-accent" />
          Two staff members edit the same product at the same time. How do you prevent one person's changes from being silently overwritten?
        </h3>
        <p className="text-xs text-muted leading-relaxed">
          Press <strong>Trigger race</strong>. Two requests will fire at once. One will succeed; the other will receive a '409 Conflict' because the version it tried to update is already out of date.
        </p>
      </div>

      <div className="surface p-10 shadow-2xl relative overflow-hidden font-mono">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none grayscale">
           <Database className="w-64 h-64 text-white" />
        </div>
        
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12 relative z-10">
          <div className="text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-3 mb-6">
               <div className="w-2 h-2 bg-success rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
               <h3 className="text-[10px] font-black text-muted uppercase tracking-[0.4em] whitespace-nowrap">Live inventory</h3>
            </div>
            <div className="flex items-baseline justify-center lg:justify-start gap-8">
              <motion.div 
                 animate={isRacing ? { scale: [1, 1.05, 1] } : (userA.status === 'success' || userB.status === 'success' ? { scale: [1, 1.2, 1], color: ['#fff', '#22c55e', '#fff'] } : {})}
                 transition={{ repeat: isRacing ? Infinity : 0, duration: isRacing ? 0.5 : 0.8 }}
                 className="text-8xl font-black text-primary tracking-tighter tabular-nums leading-none"
              >
                 {inventory.quantity}
              </motion.div>
              <div className="px-5 py-2 bg-white/5 border border-white/10 rounded-full text-accent-light font-black text-xs tracking-[0.2em] uppercase">
                 ETag_v{inventory.version}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-5 w-full md:w-auto min-w-[320px]">
            <button
               onClick={raceUpdates}
               disabled={isRacing}
               className="py-5 px-8 bg-white text-black font-black text-sm uppercase rounded-2xl transition-all shadow-[0_20px_50px_rgba(255,255,255,0.1)] flex items-center justify-center gap-4 disabled:opacity-20"
            >
               {isRacing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 fill-current" />}
               Trigger race
            </button>
            <div className="flex items-center justify-between px-2 font-black uppercase tracking-widest text-[9px]">
               <div className="flex items-center gap-2.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-success shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 'bg-muted'}`} />
                  <span className="text-muted">{isConnected ? 'Live' : 'Offline'}</span>
               </div>
               <button onClick={() => fetchInventory()} className="text-secondary hover:text-primary underline underline-offset-8 decoration-white/10">Refresh</button>
            </div>
          </div>
        </div>

        <RequestReceiptHistory receipts={receipts} />
      </div>

      <AnimatePresence>
        {lastAction && (
          <motion.div
            key={lastAction.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex justify-center"
          >
            <div className="bg-accent/5 px-3 py-1.5 border border-accent/20 rounded-lg text-xs font-bold text-accent-light">
              <abbr title={lastAction.tooltip} className="no-underline cursor-help">
                {lastAction.label}
              </abbr>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isRaceOutcomeVisible && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 border border-success/30 bg-success/5 text-primary text-xs leading-relaxed shadow-xl"
          >
            ✓ User A succeeded; User B was blocked from overwriting changes and told to refresh. <strong>Without this pattern</strong>, User B's older data silently overwrites User A's newer data ("Last Write Wins"); your stock counts drift, your prices are wrong, and nobody knows why until a customer complains.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Visual Ladder + Clash */}
      <div className="relative h-24 flex justify-center">
         <div className="absolute inset-y-0 w-px bg-white/10 left-1/4 lg:left-1/3" />
         <div className="absolute inset-y-0 w-px bg-white/10 right-1/4 lg:right-1/3" />
         
         <AnimatePresence>
            {isRacing && (
               <motion.div 
                 initial={{ opacity: 0, scale: 0 }}
                 animate={{ opacity: 1, scale: [1, 1.5, 1], rotate: [0, 90, 180, 270, 360] }}
                 exit={{ opacity: 0, scale: 0 }}
                 className="absolute top-1/2 -translate-y-1/2 z-20"
               >
                  <div className="relative">
                     <Zap className="w-10 h-10 text-warning fill-warning" />
                     <motion.div 
                       animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }}
                       transition={{ repeat: Infinity, duration: 0.4 }}
                       className="absolute inset-0 bg-warning rounded-full blur-xl"
                     />
                  </div>
               </motion.div>
            )}
         </AnimatePresence>

         <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {renderUser(userA, 'A')}
        {renderUser(userB, 'B')}
      </div>

      <div className="pt-8 border-t border-white/5">
        <div className="font-mono text-[10px] text-muted/50 uppercase tracking-widest text-center">
          Pattern: optimistic concurrency via ETag/version columns. Code: <code>src/Catalog/Catalog.Infrastructure/Persistence/CatalogDbContext.cs</code> (search for <code>Version</code>).
          The hard part is the UI — you have to give the user a way to merge or discard their changes after a 409.
        </div>
      </div>
    </div>
  );
}
