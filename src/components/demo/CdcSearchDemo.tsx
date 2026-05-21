import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, Package, Zap, Database, ArrowRight } from 'lucide-react';
import { useDemoSession } from '../../hooks/useDemoSession';
import { DemoIntro } from './DemoIntro';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Heading } from '../ui/Heading';
import { Stack } from '../ui/Stack';
import { cn } from '../../lib/utils';

interface SearchResult {
  id: string;
  name: string;
  description: string;
  price: number;
  inStock: boolean;
}

interface PipelineNode {
  id: string;
  label: string;
  sublabel: string;
  active: boolean;
  done: boolean;
}

const PIPELINE: Array<{ id: string; label: string; sublabel: string }> = [
  { id: 'postgres',      label: 'PostgreSQL',    sublabel: 'WAL source' },
  { id: 'debezium',      label: 'Debezium',      sublabel: 'CDC connector' },
  { id: 'kafka',         label: 'Kafka',          sublabel: 'event stream' },
  { id: 'elasticsearch', label: 'Elasticsearch',  sublabel: 'search index' },
];

const MOCK_RESULTS: SearchResult[] = [
  { id: '1', name: 'Demo Widget Pro',    description: 'High-performance widget with 3-year warranty', price: 39.99, inStock: true },
  { id: '2', name: 'Widget Starter Kit', description: 'Everything you need to get started with widgets',  price: 19.99, inStock: true },
  { id: '3', name: 'Widget Accessories', description: 'Premium accessories for your widget setup',       price: 12.49, inStock: false },
];

export function CdcSearchDemo() {
  const [query, setQuery] = useState('widget');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [pipeline, setPipeline] = useState<PipelineNode[]>(
    PIPELINE.map(p => ({ ...p, active: false, done: false }))
  );
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const stepTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const { executeCommand } = useDemoSession('cdcsearch');

  const resetPipeline = useCallback(() => {
    setPipeline(PIPELINE.map(p => ({ ...p, active: false, done: false })));
  }, []);

  const animatePipeline = useCallback((onDone: () => void) => {
    stepTimers.current.forEach(clearTimeout);
    stepTimers.current = [];
    resetPipeline();

    PIPELINE.forEach((node, idx) => {
      const activateAt = idx * 300;
      const completeAt = activateAt + 250;

      stepTimers.current.push(setTimeout(() => {
        setPipeline(prev => prev.map((n, i) => i === idx ? { ...n, active: true } : n));
      }, activateAt));

      stepTimers.current.push(setTimeout(() => {
        setPipeline(prev => prev.map((n, i) => i === idx ? { ...n, active: false, done: true } : n));
        if (idx === PIPELINE.length - 1) onDone();
      }, completeAt));
    });
  }, [resetPipeline]);

  const doSearch = useCallback(async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setResults([]);
    setHasSearched(false);

    const t0 = performance.now();

    animatePipeline(() => {
      // pipeline animation finished
    });

    try {
      const res = await executeCommand(`/search?q=${encodeURIComponent(query)}`, {}, { method: 'GET' }) as {
        results?: SearchResult[];
        latencyMs?: number;
      } | null;

      const elapsed = Math.round(performance.now() - t0);
      setLatencyMs(res?.latencyMs ?? elapsed);

      if (res?.results?.length) {
        setResults(res.results);
      } else {
        setResults(MOCK_RESULTS.filter(r =>
          r.name.toLowerCase().includes(query.toLowerCase()) ||
          r.description.toLowerCase().includes(query.toLowerCase())
        ));
      }
    } catch {
      const elapsed = Math.round(performance.now() - t0);
      setLatencyMs(elapsed);
      setResults(MOCK_RESULTS.filter(r =>
        r.name.toLowerCase().includes(query.toLowerCase()) ||
        r.description.toLowerCase().includes(query.toLowerCase())
      ));
    } finally {
      setIsSearching(false);
      setHasSearched(true);
    }
  }, [query, executeCommand, animatePipeline]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') doSearch();
  }, [doSearch]);

  return (
    <div className="space-y-8">
      <DemoIntro demoId="cdcsearch" />
      {/* CDC Pipeline diagram */}
      <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5">
        <div className="text-[9px] font-black uppercase tracking-widest text-muted/50 mb-4">CDC pipeline</div>
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {pipeline.map((node, idx) => (
            <div key={node.id} className="flex items-center gap-1 shrink-0">
              <motion.div
                animate={node.active ? { scale: [1, 1.08, 1] } : node.done ? { scale: 1 } : {}}
                transition={{ duration: 0.25 }}
                className={cn(
                  "flex flex-col items-center px-3 py-2 rounded-lg border transition-all duration-300 min-w-[90px]",
                  node.active ? 'bg-accent/20 border-accent/60 text-accent shadow-[0_0_12px_rgba(99,102,241,0.3)]' :
                  node.done ? 'bg-success/10 border-success/40 text-success' :
                  'bg-white/[0.02] border-white/5 text-muted/30'
                )}
              >
                {node.id === 'postgres'
                  ? <Database className="w-4 h-4 mb-1" />
                  : node.id === 'kafka'
                    ? <Zap className="w-4 h-4 mb-1" />
                    : node.id === 'elasticsearch'
                      ? <Search className="w-4 h-4 mb-1" />
                      : <ArrowRight className="w-4 h-4 mb-1" />
                }
                <span className="text-[8px] font-black uppercase tracking-wider">{node.label}</span>
                <span className="text-[7px] text-current/60 mt-0.5">{node.sublabel}</span>
              </motion.div>
              {idx < pipeline.length - 1 && (
                <motion.div
                  animate={node.done ? { opacity: 1 } : { opacity: 0.2 }}
                  className={cn(
                    "w-5 h-0.5 transition-colors duration-300",
                    node.done ? 'bg-success/40' : 'bg-white/10'
                  )}
                />
              )}
            </div>
          ))}
        </div>
        <div className="mt-3 text-[9px] text-muted/40 font-mono">
          Product writes in Postgres emit WAL events → Debezium captures changes → Kafka streams to consumers → Elasticsearch index updated within seconds
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left: Search controls */}
        <Stack gap={6}>
          <Heading variant="caption" className="flex items-center gap-2.5">
            <Search className="w-4 h-4 text-accent" />
            Search
          </Heading>

          <Card variant="panel-dark" padding="lg">
            <Stack gap={6} className="font-mono">
              {/* Search input */}
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/60" />
                  <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search products…"
                    className="w-full pl-10 pr-4 py-3 bg-white/[0.04] border border-white/10 rounded-xl text-primary font-mono text-[12px] placeholder:text-muted/40 focus:outline-none focus:border-accent/40 focus:bg-white/[0.06] transition-all"
                  />
                </div>
                <Button
                  variant="primary"
                  onClick={doSearch}
                  disabled={isSearching || !query.trim()}
                  className="h-auto px-5 rounded-xl font-black text-[11px] uppercase tracking-widest"
                >
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                </Button>
              </div>

              {latencyMs !== null && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-[10px] text-muted font-mono"
                >
                  <Zap className="w-3 h-3 text-accent" />
                  <span>Elasticsearch responded in <span className="text-accent font-black">{latencyMs}ms</span></span>
                </motion.div>
              )}

              <div className="p-4 rounded-xl bg-accent/5 border border-accent/10">
                <div className="text-[9px] font-black uppercase tracking-widest text-accent/60 mb-2">What happens</div>
                <ol className="text-[10px] text-secondary/70 leading-relaxed space-y-1 list-decimal list-inside">
                  <li>Product updated in Postgres (any write)</li>
                  <li>Debezium reads the WAL change event</li>
                  <li>Event published to Kafka topic</li>
                  <li>Consumer syncs Elasticsearch index</li>
                  <li>Search reflects change within seconds</li>
                </ol>
              </div>
            </Stack>
          </Card>
        </Stack>

        {/* Right: Results */}
        <Stack gap={6}>
          <Heading variant="caption" className="flex items-center gap-2.5">
            <Package className="w-4 h-4 text-muted" />
            Results {hasSearched && <span className="text-muted/60">({results.length})</span>}
          </Heading>

          <Card variant="panel-dark" padding="none" className="min-h-[320px] flex flex-col overflow-hidden">
            <div className="flex-1 font-mono text-[11px]">
              <AnimatePresence mode="wait">
                {isSearching ? (
                  <motion.div
                    key="searching"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="py-20 text-center text-muted/80 flex flex-col items-center gap-3"
                  >
                    <Loader2 className="w-6 h-6 animate-spin text-accent" />
                    <span className="text-[10px] uppercase tracking-[0.3em] font-black">Querying Elasticsearch…</span>
                  </motion.div>
                ) : !hasSearched ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-20 text-center text-muted/80 italic uppercase tracking-[0.3em] font-black text-[10px]"
                  >
                    Enter a query and press Search
                  </motion.div>
                ) : results.length === 0 ? (
                  <motion.div
                    key="no-results"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-20 text-center text-muted/80 italic uppercase tracking-[0.3em] font-black text-[10px]"
                  >
                    No results for "{query}"
                  </motion.div>
                ) : (
                  <motion.div
                    key="results"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="divide-y divide-white/[0.02]"
                  >
                    {results.map((result, idx) => (
                      <motion.div
                        key={result.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.07 }}
                        className="flex items-start gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                          <Package className="w-4 h-4 text-accent" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-black text-primary truncate">{result.name}</div>
                          <div className="text-[9px] text-muted/70 mt-0.5 truncate">{result.description}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-black text-accent tabular-nums">${result.price.toFixed(2)}</span>
                            <span className={cn(
                              "text-[8px] font-black uppercase px-1.5 py-0.5 rounded",
                              result.inStock ? 'bg-success/10 text-success' : 'bg-muted/10 text-muted/60'
                            )}>
                              {result.inStock ? 'In stock' : 'Out of stock'}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="p-4 bg-white/[0.02] border-t border-white/5 font-mono text-[9px] text-muted/60 uppercase tracking-widest text-center">
              Debezium → Kafka → Elasticsearch · sub-second propagation · zero polling
            </div>
          </Card>
        </Stack>
      </div>
    </div>
  );
}
