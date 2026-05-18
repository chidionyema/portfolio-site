#!/usr/bin/env node
/**
 * Rasterize OG images — generic + per-page variants.
 * Run as part of build via package.json scripts.
 */
import sharp from 'sharp';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const outDir = resolve(root, 'public');

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

function buildSvg(title, subtitle) {
  // Escape XML entities
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b0b0e"/>
      <stop offset="100%" stop-color="#13131a"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#7c5cff"/>
      <stop offset="100%" stop-color="#a78bfa"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.85" cy="0.15" r="0.6">
      <stop offset="0%" stop-color="#7c5cff" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#7c5cff" stop-opacity="0"/>
    </radialGradient>
    <pattern id="dots" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
      <circle cx="1" cy="1" r="1" fill="#ffffff" fill-opacity="0.025"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#dots)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <rect x="40" y="40" width="1120" height="550" fill="none" stroke="#ffffff" stroke-opacity="0.08" stroke-width="1"/>
  <g font-family="ui-monospace, 'JetBrains Mono', monospace" font-size="14" fill="#8a8a90" letter-spacing="3">
    <text x="80" y="100">CHIDI ONYEMA</text>
  </g>
  <text x="80" y="280" font-family="'Fraunces Variable', Georgia, serif" font-size="56" fill="url(#accent)" font-weight="900" letter-spacing="-1">
    ${esc(title)}
  </text>
  <text x="80" y="340" font-family="ui-monospace, 'JetBrains Mono', monospace" font-size="20" fill="#c0c0c8" letter-spacing="0.5">
    ${esc(subtitle)}
  </text>
  <g font-family="ui-monospace, 'JetBrains Mono', monospace" font-size="13" fill="#52525b" letter-spacing="2">
    <text x="80" y="550">16 MICROSERVICES</text>
    <text x="340" y="550">159 ARCHITECTURE GUARDS</text>
    <text x="660" y="550">LIVE DEMOS</text>
    <text x="880" y="550">.NET 9</text>
  </g>
</svg>`;
}

const pages = [
  { file: 'og.png', title: 'Senior .NET Engineer', subtitle: 'Distributed microservices in production. Live demos, real metrics.' },
  { file: 'og-demos.png', title: 'Live Infrastructure Demos', subtitle: '9 interactive demos hitting real .NET 9 microservices — not simulations.' },
  { file: 'og-architecture.png', title: 'Platform Architecture', subtitle: '50 Roslyn analyzers, 159 guards, double-entry ledger, GDPR saga, CDC pipeline.' },
];

for (const page of pages) {
  const svg = Buffer.from(buildSvg(page.title, page.subtitle));
  const png = await sharp(svg, { density: 144 })
    .resize(1200, 630, { fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toBuffer();
  const outPath = resolve(outDir, page.file);
  writeFileSync(outPath, png);
  console.log(`og: wrote ${outPath} (${(png.length / 1024).toFixed(1)} KB)`);
}
