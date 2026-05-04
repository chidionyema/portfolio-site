import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, X, Zap } from 'lucide-react';

/**
 * LiveEnvironmentToast
 * A high-visibility, dismissible notification that appears on landing
 * to explicitly state that the environment is live and interactive.
 */
export const LiveEnvironmentToast: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Appear after a short delay for maximum impact
    const timer = setTimeout(() => {
      const dismissed = localStorage.getItem('hide_live_toast');
      if (!dismissed) setIsVisible(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setIsVisible(false);
    localStorage.setItem('hide_live_toast', 'true');
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed bottom-6 right-6 z-[100] max-w-xs w-full"
        >
          <div className="glass p-5 border-l-4 border-l-success shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
            {/* Pulsing glow background */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-success/10 blur-3xl animate-pulse" />
            
            <div className="flex items-start gap-4 relative z-10">
              <div className="mt-1 p-2 bg-success/20 rounded-lg text-success">
                <ShieldCheck className="w-5 h-5" />
              </div>
              
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">System_Online</h4>
                  <button onClick={dismiss} className="text-muted hover:text-primary transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </div>
                
                <p className="text-[11px] font-mono leading-relaxed text-secondary/80">
                  <span className="text-success font-bold">Production Node LHR_01 Linked.</span><br />
                  Every component is interactive. Every button triggers a real .NET 9 command.
                </p>

                <div className="pt-2 flex items-center gap-2">
                   <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
                   <span className="text-[9px] font-black uppercase tracking-widest text-muted">Ready_For_Interaction</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
