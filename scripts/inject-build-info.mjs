#!/usr/bin/env node
/**
 * Emits the current git SHA and build timestamp into PUBLIC_* env vars
 * that Astro picks up at build time. Run before `astro build`.
 *
 * On CI, GIT_SHA is provided by the runner; locally we fall back to git.
 */
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const envPath = resolve(root, '.env.production');

function gitSha() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'dev';
  }
}

const sha = process.env.GIT_SHA ?? process.env.GITHUB_SHA ?? gitSha();
const builtAt = new Date().toISOString();

const contents =
  `PUBLIC_GIT_SHA=${sha}\n` +
  `PUBLIC_BUILT_AT=${builtAt}\n`;

writeFileSync(envPath, contents);
console.log(`build-info: SHA ${sha.slice(0, 7)}, built ${builtAt}`);
