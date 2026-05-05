import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Server, Database, Share2, Shield, Activity } from 'lucide-react';
import { signalRClient } from '../../lib/api/signalr';
import { CLUSTER_LABEL } from '../../lib/copy';

/**
 * TopologyMap
 * Static SVG representation of the distributed system.
 * Highlights service boundaries and data flow paths.
 * Pulses nodes in real-time based on SignalR activity.
 */
export const TopologyMap: React.FC = () => {
  const [pulsingNode, setPulsingNode] = useState<string | null>(null);

  useEffect(() => {
    const connection = signalRClient.getConnection();
    
    const pulse = (node: string) => {
      setPulsingNode(node);
      setTimeout(() => setPulsingNode(null), 800);
    };

    // Listen to various telemetry events to trigger node pulses
    connection.on('OnSagaStep', (e) => pulse(e.service.toLowerCase()));
    connection.on('OnEventFlow', (e) => pulse(e.source?.toLowerCase() || 'mq'));
    connection.on('OnCacheEvent', () => pulse('redis'));
    connection.on('OnVaultRotation', () => pulse('vault'));
    connection.on('OnCircuitBreakerState', (e) => pulse(e.service.toLowerCase()));

    return () => {
      connection.off('OnSagaStep');
      connection.off('OnEventFlow');
      connection.off('OnCacheEvent');
      connection.off('OnVaultRotation');
      connection.off('OnCircuitBreakerState');
    };
  }, []);

  return (
    <div className="relative w-full aspect-[16/9] glass p-8 overflow-hidden rounded-3xl border border-white/10 bg-black/40 shadow-2xl">
      <div className="absolute inset-0 hero-dot-grid opacity-10" />
      
      <svg viewBox="0 0 800 450" className="w-full h-full relative z-10">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(255,255,255,0.2)" />
          </marker>
        </defs>

        {/* Connections */}
        <g className="stroke-white/10 stroke-[1.5]" fill="none" markerEnd="url(#arrow)">
          <path d="M 400 100 L 400 200" /> {/* API -> MQ */}
          <path d="M 400 250 L 250 350" /> {/* MQ -> DB */}
          <path d="M 400 250 L 400 350" /> {/* MQ -> Redis */}
          <path d="M 400 250 L 550 350" /> {/* MQ -> Vault */}
        </g>

        {/* Nodes */}
        <g>
          {/* API Node */}
          <foreignObject x="350" y="50" width="100" height="100">
            <NodeUI 
              icon={<Server className="w-6 h-6" />} 
              label="Gateway" 
              color="accent" 
              isPulsing={pulsingNode === 'api' || pulsingNode === 'gateway'} 
            />
          </foreignObject>

          {/* MQ Node */}
          <foreignObject x="350" y="180" width="100" height="100">
            <NodeUI 
              icon={<Share2 className="w-6 h-6" />} 
              label="Message bus" 
              color="purple-400" 
              isPulsing={pulsingNode === 'mq' || pulsingNode === 'bus'} 
            />
          </foreignObject>

          {/* DB Node */}
          <foreignObject x="200" y="330" width="100" height="100">
            <NodeUI 
              icon={<Database className="w-6 h-6" />} 
              label="PostgreSQL" 
              color="success" 
              isPulsing={pulsingNode === 'db' || pulsingNode === 'postgres' || pulsingNode === 'catalog' || pulsingNode === 'orders'} 
            />
          </foreignObject>

          {/* Redis Node */}
          <foreignObject x="350" y="330" width="100" height="100">
            <NodeUI 
              icon={<Activity className="w-6 h-6" />} 
              label="Redis_L2" 
              color="error" 
              isPulsing={pulsingNode === 'redis'} 
            />
          </foreignObject>

          {/* Vault Node */}
          <foreignObject x="500" y="330" width="100" height="100">
            <NodeUI 
              icon={<Shield className="w-6 h-6" />} 
              label="HashiCorp_Vault" 
              color="warning" 
              isPulsing={pulsingNode === 'vault'} 
            />
          </foreignObject>
        </g>
      </svg>

      <div className="absolute bottom-8 right-8 flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-muted/60 font-mono">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
          <span>Telemetry active</span>
        </div>
        <span>// Region: {CLUSTER_LABEL}</span>
      </div>
    </div>
  );
};

const NodeUI: React.FC<{ icon: React.ReactNode, label: string, color: string, isPulsing: boolean }> = ({ icon, label, color, isPulsing }) => (
  <div className="flex flex-col items-center gap-2">
    <div className={`
      relative p-4 rounded-2xl transition-all duration-300
      ${isPulsing 
        ? `bg-${color}/30 border-${color}/60 scale-110 shadow-[0_0_20px_rgba(var(--color-accent),0.4)]` 
        : 'bg-white/5 border-white/10 opacity-70'
      } border
    `}>
      <div className={isPulsing ? `text-${color}` : 'text-muted'}>
        {icon}
      </div>
      <AnimatePresence>
        {isPulsing && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0.5 }}
            animate={{ scale: 2, opacity: 0 }}
            exit={{ opacity: 0 }}
            className={`absolute inset-0 rounded-2xl border-2 border-${color} pointer-events-none`}
          />
        )}
      </AnimatePresence>
    </div>
    <span className={`text-[9px] font-black uppercase tracking-widest ${isPulsing ? 'text-primary' : 'text-muted/60'}`}>
      {label}
    </span>
  </div>
);
