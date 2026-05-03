import { motion } from 'framer-motion';
import { Database, Zap, Shield, Monitor, Share2, Key } from 'lucide-react';
import { DotNetIcon, PostgresIcon, RedisIcon, RabbitMQIcon } from '../system/StackLogos';

interface NodeProps {
  id: string;
  label: string;
  provider: string;
  icon: any;
  color: string;
  x: number;
  y: number;
}

const NODES: NodeProps[] = [
  { id: 'client', label: 'BROWSER', provider: 'CLIENT', icon: Monitor, color: 'text-primary', x: 0, y: 50 },
  { id: 'gateway', label: 'API GATEWAY', provider: 'REVERSE_PROXY', icon: Share2, color: 'text-accent-light', x: 22, y: 50 },
  { id: 'cluster', label: '.NET 9 CLUSTER', provider: 'FLY.IO', icon: DotNetIcon, color: 'text-[#512bd4]', x: 48, y: 50 },
  { id: 'vault', label: 'VAULT', provider: 'SECRETS', icon: Key, color: 'text-warning', x: 82, y: 15 },
  { id: 'db', label: 'POSTGRESQL', provider: 'NEON', icon: PostgresIcon, color: 'text-[#336791]', x: 82, y: 38 },
  { id: 'redis', label: 'REDIS_L2', provider: 'UPSTASH', icon: RedisIcon, color: 'text-[#d82c20]', x: 82, y: 62 },
  { id: 'mq', label: 'RABBITMQ', provider: 'CLOUDAMQP', icon: RabbitMQIcon, color: 'text-[#ff6600]', x: 82, y: 84 },
];

const CONNECTIONS = [
  { from: 'client', to: 'gateway' },
  { from: 'gateway', to: 'cluster' },
  { from: 'cluster', to: 'vault' },
  { from: 'cluster', to: 'db' },
  { from: 'cluster', to: 'redis' },
  { from: 'cluster', to: 'mq' },
];

export function SystemTopology() {
  return (
    <div className="relative w-full max-w-5xl mx-auto h-[460px] bg-black/40 border border-white/5 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_50%,rgba(124,92,255,0.2),transparent_70%)]" />
      
      {/* Legend / Status */}
      <div className="absolute top-4 left-6 flex items-center gap-4 font-mono text-[9px] font-black uppercase tracking-[0.2em] text-muted">
         <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse shadow-[0_0_5px_rgba(34,197,94,1)]" />
            <span className="text-primary">CLUSTER_LHR_01: ACTIVE</span>
         </div>
         <span className="opacity-30">|</span>
         <div className="flex items-center gap-2">
            <span className="text-success">99.998% UPTIME</span>
         </div>
         <span className="opacity-30">|</span>
         <div className="flex items-center gap-2 text-accent-light">
            <Zap className="w-2.5 h-2.5" />
            <span className="tracking-normal">REAL-TIME_WSS</span>
         </div>
      </div>

      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <linearGradient id="line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(124, 92, 255, 0)" />
            <stop offset="50%" stopColor="rgba(124, 92, 255, 0.3)" />
            <stop offset="100%" stopColor="rgba(124, 92, 255, 0)" />
          </linearGradient>
        </defs>
        
        {CONNECTIONS.map((conn, i) => {
          const from = NODES.find(n => n.id === conn.from)!;
          const to = NODES.find(n => n.id === conn.to)!;
          return (
            <g key={i}>
              <line 
                x1={`${from.x}%`} y1={`${from.y}%`} 
                x2={`${to.x}%`} y2={`${to.y}%`} 
                stroke="rgba(255,255,255,0.06)" 
                strokeWidth="1.5"
              />
              <motion.circle
                r="2"
                fill="#7c5cff"
                initial={{ cx: `${from.x}%`, cy: `${from.y}%`, opacity: 0 }}
                animate={{ 
                  cx: [`${from.x}%`, `${to.x}%`],
                  cy: [`${from.y}%`, `${to.y}%`],
                  opacity: [0, 1, 0]
                }}
                transition={{ 
                  duration: 2.5, 
                  repeat: Infinity, 
                  delay: i * 0.3,
                  ease: "easeInOut"
                }}
              />
            </g>
          );
        })}
      </svg>

      <div className="absolute inset-0 flex items-center justify-between px-10">
        {NODES.map((node) => (
          <motion.div
            key={node.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: node.x / 100 }}
          >
            <div className="flex flex-col items-center gap-3">
              <div className={`p-3 bg-[#0a0a0f]/80 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl transition-all hover:border-accent hover:scale-110 group`}>
                <node.icon className={`w-6 h-6 ${node.color} opacity-90 group-hover:opacity-100 transition-opacity`} />
              </div>
              <div className="flex flex-col items-center text-center">
                 <span className="text-[10px] font-mono font-black text-primary tracking-tighter uppercase leading-none mb-1 whitespace-nowrap">{node.label}</span>
                 <span className="text-[8px] font-mono text-muted uppercase tracking-widest leading-none whitespace-nowrap">{node.provider}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
