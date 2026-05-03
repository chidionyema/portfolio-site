import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Code2, Copy, Check, ExternalLink } from 'lucide-react';
import { GithubIcon } from '../../lib/brand-icons';
import { CODE_SNIPPETS } from '../../lib/api/code-snippets';

interface CodeDrawerProps {
  demoId: string;
}

export function CodeDrawer({ demoId }: CodeDrawerProps) {
  const [copied, setCopied] = useState(false);
  const code = CODE_SNIPPETS[demoId] || '// Source code not found.';

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
            <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-none mb-1">
              Production_Source_Code
            </span>
            <span className="text-[8px] text-muted uppercase tracking-[0.2em] leading-none">
              {demoId}.cs // .NET 9.0 Cluster
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyToClipboard}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors group relative"
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
            className="p-2 hover:bg-white/5 rounded-lg transition-colors group"
            title="View on GitHub"
          >
            <GithubIcon className="w-4 h-4 text-muted group-hover:text-primary" />
          </a>
        </div>
      </div>

      {/* Code Area */}
      <div className="flex-1 overflow-auto p-8 relative group custom-scrollbar">
        <div className="absolute top-4 right-6 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
           <span className="text-[8px] bg-white/5 border border-white/10 px-2 py-1 rounded font-black text-muted uppercase tracking-widest">
              Read_Only
           </span>
        </div>
        
        <pre className="text-[13px] leading-relaxed text-secondary/90 whitespace-pre selection:bg-accent/30 selection:text-white">
          <code className="language-csharp">
            {code}
          </code>
        </pre>
      </div>

      {/* Footer Info */}
      <div className="px-6 py-4 bg-accent/5 border-t border-white/5">
        <p className="text-[10px] text-secondary/60 font-medium leading-relaxed italic flex items-center gap-2">
          <span className="w-1 h-1 bg-accent-light rounded-full" />
          "This snippet represents the actual implementation running in the Fly.io cluster. Patterns: DDD, Clean Architecture, MassTransit."
        </p>
      </div>
    </div>
  );
}
