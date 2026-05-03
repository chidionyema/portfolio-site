import React from 'react';
import { motion } from 'framer-motion';
import { Server, Database, Share2, Shield, Activity } from 'lucide-react';

/**
 * TopologyMap
 * Static SVG representation of the distributed system.
 * Highlights service boundaries and data flow paths.
 */
export const TopologyMap: React.FC = () => {
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
            <div className="flex flex-col items-center gap-2">
              <div className="p-4 bg-accent/20 border border-accent/40 rounded-2xl text-accent">
                <Server className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">Gateway</span>
            </div>
          </foreignObject>

          {/* MQ Node */}
          <foreignObject x="350" y="180" width="100" height="100">
            <div className="flex flex-col items-center gap-2">
              <div className="p-4 bg-purple-500/20 border border-purple-500/40 rounded-2xl text-purple-400">
                <Share2 className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">Message_Bus</span>
            </div>
          </foreignObject>

          {/* DB Node */}
          <foreignObject x="200" y="330" width="100" height="100">
            <div className="flex flex-col items-center gap-2">
              <div className="p-4 bg-success/20 border border-success/40 rounded-2xl text-success">
                <Database className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">PostgreSQL</span>
            </div>
          </foreignObject>

          {/* Redis Node */}
          <foreignObject x="350" y="330" width="100" height="100">
            <div className="flex flex-col items-center gap-2">
              <div className="p-4 bg-error/20 border border-error/40 rounded-2xl text-error">
                <Activity className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">Redis_L2</span>
            </div>
          </foreignObject>

          {/* Vault Node */}
          <foreignObject x="500" y="330" width="100" height="100">
            <div className="flex flex-col items-center gap-2">
              <div className="p-4 bg-warning/20 border border-warning/40 rounded-2xl text-warning">
                <Shield className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">HashiCorp_Vault</span>
            </div>
          </foreignObject>
        </g>
      </svg>

      <div className="absolute bottom-8 right-8 flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-muted/40 font-mono">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
          <span>Telemetric_Overlay_Active</span>
        </div>
        <span>// Region: LHR_01</span>
      </div>
    </div>
  );
};
