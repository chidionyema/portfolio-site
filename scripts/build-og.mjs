#!/usr/bin/env node
/**
 * Rasterize scripts/og.svg → public/og.png at 1200×630.
 * Run as part of build via package.json scripts.
 */
import sharp from 'sharp';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const svgPath = resolve(root, 'scripts/og.svg');
const outPath = resolve(root, 'public/og.png');

if (!existsSync(dirname(outPath))) mkdirSync(dirname(outPath), { recursive: true });

const svg = readFileSync(svgPath);
const png = await sharp(svg, { density: 144 })
  .resize(1200, 630, { fit: 'cover' })
  .png({ compressionLevel: 9 })
  .toBuffer();

writeFileSync(outPath, png);
console.log(`og: wrote ${outPath} (${(png.length / 1024).toFixed(1)} KB)`);
