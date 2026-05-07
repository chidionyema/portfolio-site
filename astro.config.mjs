import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import { execSync } from 'node:child_process';

// Build identity — exposed to client code via Vite `define`. Lets the dock
// stamp the SHA + start time of the JS bundle that's actually loaded, so
// "stale frontend" (a long-running dev server, a forgotten build) can be
// caught by glancing at the corner of the screen instead of 20 minutes of
// "is my hard-refresh working?" diagnosis.
const buildSha = (() => {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'unknown';
  }
})();
const buildStartedAt = new Date().toISOString();

export default defineConfig({
  integrations: [
    react(),
    tailwind(),
    mdx(),
  ],
  output: 'static',
  vite: {
    define: {
      __BUILD_SHA__: JSON.stringify(buildSha),
      __BUILD_STARTED_AT__: JSON.stringify(buildStartedAt),
    },
  },
  // TODO: confirm production domain. Used for canonical, OG, sitemap.
  site: 'https://chidionyema.dev',
  markdown: {
    shikiConfig: {
      // Dual-theme. CSS picks one via the data-theme attribute on <html>.
      themes: {
        light: 'github-light',
        dark: 'github-dark-dimmed',
      },
      wrap: true,
    },
  },
});
