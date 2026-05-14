import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Code2, Copy, Check, Zap } from 'lucide-react';
import { GithubIcon } from '../../lib/brand-icons';
import { CODE_SNIPPETS } from '../../lib/api/code-snippets';

interface CodeDrawerProps {
  demoId: string;
}

export function CodeDrawer({ demoId }: CodeDrawerProps) {
  const [copied, setCopied] = useState(false);
  const snippet = CODE_SNIPPETS[demoId];
  const code = snippet?.code || '// Source code not found.';
  const lines = code.split('\n');

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] border border-white/10 shadow-2xl overflow-hidden font-mono">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5 bg-black/40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent/10 rounded-lg">
            <Code2 className="w-4 h-4 text-accent-light" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
               <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">
                 Source code
               </span>
               {snippet?.impact && (
                 <div className="flex items-center gap-1 px-1.5 py-0.5 bg-accent/20 rounded text-[7px] font-black text-accent-light uppercase animate-pulse">
                    <Zap className="w-2 h-2 fill-current" />
                    Key pattern
                 </div>
               )}
            </div>
            <span className="text-[8px] text-muted uppercase tracking-[0.2em] leading-none">
              {demoId}.cs // .NET 9.0 Cluster
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyToClipboard}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors group relative"
            title="Copy to clipboard"
          >
            {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4 text-muted group-hover:text-primary" />}
            <AnimatePresence>
              {copied && (
                <motion.span
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute -top-8 left-1/2 -translate-x-1/2 text-[8px] bg-success text-white px-2 py-1 rounded font-black uppercase"
                >
                  Copied
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          <a
            href={`https://github.com/chidionyema/ritualworks/blob/main/src/${demoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 hover:bg-white/10 rounded-lg transition-colors group"
            title="View on GitHub"
          >
            <GithubIcon className="w-4 h-4 text-muted group-hover:text-primary" />
          </a>
        </div>
      </div>

      {/* Code Area */}
      <div className="flex-1 overflow-auto relative group custom-scrollbar bg-[#08080a]">
        <div className="absolute top-4 right-6 z-20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
           <span className="text-[8px] bg-white/10 border border-white/10 px-2 py-1 rounded font-black text-muted uppercase tracking-widest backdrop-blur-md">
              Read_Only
           </span>
        </div>
        
        <div className="py-8 min-w-full inline-block">
          {lines.map((line, i) => {
            const isHighlighted = snippet?.highlights.includes(i + 1);
            return (
              <div 
                key={i} 
                className={`
                  flex items-start px-8 group/line relative
                  ${isHighlighted ? 'bg-accent/10 border-l-2 border-accent' : 'border-l-2 border-transparent'}
                `}
              >
                <span className="w-12 shrink-0 text-[10px] text-muted/90 select-none pt-1">{(i + 1).toString().padStart(2, '0')}</span>
                <pre className={`
                  text-[13px] leading-relaxed whitespace-pre selection:bg-accent/30 selection:text-white
                  ${isHighlighted ? 'text-primary font-bold' : 'text-secondary/70'}
                `}>
                  {line || ' '}
                </pre>
                {isHighlighted && (
                  <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover/line:opacity-100 transition-opacity">
                    <span className="text-[7px] font-black uppercase text-accent-light tracking-tighter bg-accent/10 px-1 rounded">Critical</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-6 py-4 bg-accent/5 border-t border-white/5">
        <p className="text-[10px] text-secondary/60 font-medium leading-relaxed italic flex items-center gap-2">
          <span className="w-1 h-1 bg-accent-light rounded-full" />
          {snippet?.impact ? `"${snippet.impact}"` : `"This snippet represents the actual implementation running in the Fly.io cluster."`}
        </p>
      </div>
    </div>
  );
}
