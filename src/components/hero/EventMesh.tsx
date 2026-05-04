import React, { useEffect, useRef, useMemo } from 'react';
import { useEventStream } from '../../hooks/useEventStream';

interface Node {
  id: string;
  x: number;
  y: number;
  label: string;
}

interface Edge {
  from: string;
  to: string;
}

interface Particle {
  edge: Edge;
  progress: number; // 0 to 1
  speed: number;
  isPing?: boolean;
}

interface EventMeshProps {
  pingTrigger?: number;
}

/**
 * EventMesh Canvas
 * Visualizes real-time message flow between system nodes.
 * Fed by the /topology/stream SSE.
 */
export const EventMesh: React.FC<EventMeshProps> = ({ pingTrigger }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  
  // Define static nodes for the topology
  const nodes: Node[] = useMemo(() => [
    { id: 'api', x: 0.5, y: 0.2, label: 'API' },
    { id: 'mq', x: 0.5, y: 0.5, label: 'RabbitMQ' },
    { id: 'db', x: 0.2, y: 0.8, label: 'Postgres' },
    { id: 'redis', x: 0.5, y: 0.8, label: 'Redis' },
    { id: 'vault', x: 0.8, y: 0.8, label: 'Vault' },
  ], []);

  const edges: Edge[] = useMemo(() => [
    { from: 'api', to: 'mq' },
    { from: 'mq', to: 'api' },
    { from: 'api', to: 'db' },
    { from: 'api', to: 'redis' },
    { from: 'api', to: 'vault' },
  ], []);

  // Listen to the ping trigger from the parent
  useEffect(() => {
    if (pingTrigger && pingTrigger > 0) {
      // Inject a high-speed "Ping" sequence
      const sequence = [
        { from: 'api', to: 'mq' },
        { from: 'mq', to: 'db' },
        { from: 'db', to: 'api' }
      ];
      
      sequence.forEach((s, i) => {
        setTimeout(() => {
          const edge = { from: s.from, to: s.to };
          particlesRef.current.push({
            edge,
            progress: 0,
            speed: 0.04, // 4x faster than normal traffic
            isPing: true
          });
        }, i * 150);
      });
    }
  }, [pingTrigger]);

  // Listen to edge-flow events from the topology stream. useEventStream returns
  // an `events` array (newest first); we take [0] as the latest tick.
  const { events } = useEventStream({ url: '/api/topology/stream' });
  const lastEvent = events[0] as { edge?: string } | undefined;

  useEffect(() => {
    if (lastEvent?.edge) {
      const [from, to] = lastEvent.edge.split('->');
      const edge = edges.find(e => e.from === from && e.to === to);
      if (edge) {
        particlesRef.current.push({
          edge,
          progress: 0,
          speed: 0.01 + Math.random() * 0.01
        });
      }
    }
  }, [lastEvent, edges]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      // Draw Edges (Subtle)
      ctx.strokeStyle = 'rgba(var(--color-muted), 0.1)';
      ctx.lineWidth = 1;
      edges.forEach(edge => {
        const from = nodes.find(n => n.id === edge.from)!;
        const to = nodes.find(n => n.id === edge.to)!;
        ctx.beginPath();
        ctx.moveTo(from.x * width, from.y * height);
        ctx.lineTo(to.x * width, to.y * height);
        ctx.stroke();
      });

      // Draw Particles
      particlesRef.current = particlesRef.current.filter(p => p.progress < 1);
      particlesRef.current.forEach(p => {
        const from = nodes.find(n => n.id === p.edge.from)!;
        const to = nodes.find(n => n.id === p.edge.to)!;
        
        const x = from.x * width + (to.x * width - from.x * width) * p.progress;
        const y = from.y * height + (to.y * height - from.y * height) * p.progress;
        
        ctx.fillStyle = p.isPing ? '#7c5cff' : 'rgba(var(--color-accent), 0.6)';
        ctx.beginPath();
        ctx.arc(x, y, p.isPing ? 4 : 2, 0, Math.PI * 2);
        ctx.fill();

        if (p.isPing) {
          ctx.strokeStyle = 'rgba(124, 92, 255, 0.4)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        
        p.progress += p.speed;
      });

      // Draw Nodes
      nodes.forEach(node => {
        ctx.fillStyle = 'rgb(var(--color-background))';
        ctx.strokeStyle = 'rgba(var(--color-muted), 0.3)';
        ctx.beginPath();
        ctx.arc(node.x * width, node.y * height, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [nodes, edges]);

  return (
    <canvas 
      ref={canvasRef}
      className="w-full h-full opacity-50 pointer-events-none"
      aria-hidden="true"
    />
  );
};
