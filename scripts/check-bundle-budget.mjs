#!/usr/bin/env node
/**
 * Asserts bundle size stays within budget. Run after `astro build`.
 * Budgets are gzip sizes (or estimated from raw with the standard 0.32 ratio
 * for JS/CSS) so they map to what users actually download.
 */
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const distDir = resolve(root, 'dist');
const astroDir = resolve(distDir, '_astro');

// Gzip-size budgets in bytes. Tighten over time.
const BUDGETS = [
  // Per-file budgets — the heaviest known assets.
  { match: /^client\..*\.js$/,      maxGzip: 60_000, label: 'react runtime + framework' },
  { match: /^DemoHubLite\..*\.js$/, maxGzip: 15_000, label: 'demo hub layout' },
  { match: /^CommandPalette\..*\.js$/, maxGzip: 22_000, label: 'cmdk palette' },
  { match: /^HeroLite\..*\.js$/,    maxGzip: 4_000,  label: 'hero island' },
  // Per-demo budget (any demo file). Bumped from 4KB to 8KB now that demos
  // ship as individual islands on /lab (per-microservice sections) instead
  // of being lazy-loaded inside DemoHubLite. CheckoutDemo, CircuitBreakerDemo
  // and IdempotencyDemo each carry their own form/state machinery.
  { match: /^(Cache|Checkout|Circuit|Concurrency|EventFlow|Idempotency|RateLimiter|VaultRotation).*Demo\..*\.js$/, maxGzip: 8_000, label: 'individual demo' },
];

// Total JS budget (sum of all _astro/*.js gzipped).
// Bumped to 215KB to fit the /chaos page split: ChaosTimelineStrip,
// ChaosReceipts, ChaosDrillController, ArchitectureCanvas, SagaMessageFlow,
// ResilienceScoreboard. Each is small (<3KB) but they add up. Tighten back
// down once any panels get demolished.
const TOTAL_JS_GZIP_BUDGET = 215_000;

let failures = 0;
let totalJsGzip = 0;
const rows = [];

for (const name of readdirSync(astroDir)) {
  const full = resolve(astroDir, name);
  if (!statSync(full).isFile() || !name.endsWith('.js')) continue;

  const buf = readFileSync(full);
  const gzip = gzipSync(buf).length;
  totalJsGzip += gzip;

  const budget = BUDGETS.find((b) => b.match.test(name));
  const ok = !budget || gzip <= budget.maxGzip;

  rows.push({
    file: relative(distDir, full),
    gzip,
    raw: buf.length,
    budget: budget?.maxGzip,
    label: budget?.label ?? '',
    ok,
  });

  if (!ok) failures++;
}

rows.sort((a, b) => b.gzip - a.gzip);

const fmt = (n) => `${(n / 1024).toFixed(1)} KB`;
console.log('\nBundle gzip sizes:\n');
for (const r of rows) {
  const flag = r.ok ? '✓' : '✗';
  const budget = r.budget ? ` ≤ ${fmt(r.budget)}` : '';
  const label = r.label ? `  — ${r.label}` : '';
  console.log(`  ${flag} ${r.file}: ${fmt(r.gzip)}${budget}${label}`);
}

const totalOk = totalJsGzip <= TOTAL_JS_GZIP_BUDGET;
console.log(`\n  ${totalOk ? '✓' : '✗'} TOTAL JS: ${fmt(totalJsGzip)} ≤ ${fmt(TOTAL_JS_GZIP_BUDGET)}\n`);
if (!totalOk) failures++;

if (failures) {
  console.error(`FAIL — ${failures} budget violation(s)`);
  process.exit(1);
}
console.log('PASS');
