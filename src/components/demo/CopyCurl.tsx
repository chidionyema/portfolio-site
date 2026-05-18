import { useState } from 'react';
import { Terminal, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

interface CopyCurlProps {
  method: string;
  path: string;
  headers?: Record<string, string>;
  body?: unknown;
}

export function CopyCurl({ method, path, headers, body }: CopyCurlProps) {
  const [copied, setCopied] = useState(false);
  const API_URL = import.meta.env.PUBLIC_API_URL ?? '';

  const buildCurl = () => {
    const parts = [`curl -X ${method} '${API_URL}${path}'`];
    if (headers) {
      Object.entries(headers).forEach(([k, v]) => parts.push(`  -H '${k}: ${v}'`));
    }
    if (body && method !== 'GET') {
      parts.push(`  -d '${JSON.stringify(body)}'`);
    }
    return parts.join(' \\\n');
  };

  const copy = async () => {
    await navigator.clipboard.writeText(buildCurl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={copy}
      title="Copy as cURL"
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded border text-[9px] font-black uppercase tracking-widest transition-all",
        copied
          ? "bg-success/10 border-success/20 text-success"
          : "bg-white/5 border-white/10 text-muted hover:text-secondary hover:bg-white/10"
      )}
    >
      {copied ? <Check className="w-3 h-3" /> : <Terminal className="w-3 h-3" />}
      {copied ? 'Copied' : 'cURL'}
    </button>
  );
}
