#!/usr/bin/env node
/**
 * Smoke + axe pass over the built site.
 * Boots `astro preview` on a free port, hits the key routes, runs axe-core,
 * fails the build on any violations or non-200 responses.
 */
import { spawn } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const PORT = 4327;
const BASE = `http://localhost:${PORT}`;
const ROUTES = [
  '/',
  '/deep-dives/transactional-outbox/',
  '/deep-dives/saga-vs-2pc/',
  '/404',
];

const preview = spawn('npx', ['astro', 'preview', '--port', String(PORT)], {
  stdio: ['ignore', 'inherit', 'inherit'],
});

let violations = 0;
let failures = 0;

try {
  // Wait for the preview server to come up.
  for (let i = 0; i < 30; i++) {
    try {
      const r = await fetch(BASE);
      if (r.ok || r.status === 404) break;
    } catch {}
    await wait(500);
  }

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  for (const route of ROUTES) {
    const res = await page.goto(BASE + route, { waitUntil: 'networkidle' });
    const status = res?.status() ?? 0;
    const expected = route === '/404' ? 404 : 200;
    if (status !== expected) {
      console.error(`✗ ${route} → ${status} (expected ${expected})`);
      failures++;
      continue;
    }
    console.log(`✓ ${route} → ${status}`);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    if (results.violations.length) {
      violations += results.violations.length;
      console.error(`  axe: ${results.violations.length} violation(s)`);
      for (const v of results.violations) {
        console.error(`    - [${v.impact}] ${v.id}: ${v.help}`);
      }
    } else {
      console.log(`  axe: clean`);
    }
  }

  await browser.close();
} finally {
  preview.kill();
}

if (failures || violations) {
  console.error(`\nFAIL — ${failures} status mismatch(es), ${violations} a11y violation(s)`);
  process.exit(1);
}
console.log('\nPASS');
