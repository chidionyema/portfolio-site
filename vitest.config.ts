/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        // jsdom's default document URL is "about:blank"; SignalR's HttpConnection
        // resolves the hub path (`/hubs/console`, relative because PUBLIC_API_URL
        // is unset in tests) via `new URL(path, document.baseURI)`, which throws
        // "Invalid URL" against about:blank. Give it a real base URL to resolve
        // against instead of mocking @microsoft/signalr wholesale.
        url: 'http://localhost:3000',
      },
    },
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}', 'tests/component/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    // Each test file spins up its own jsdom environment; running all 11 files'
    // worth of environments fully in parallel on a constrained runner (local
    // machine under load, or a 2-4 core CI box) starves individual tests and
    // trips the default 5s per-test timeout intermittently (observed: this
    // suite flaked from 22/22 passing to 21/22 across back-to-back
    // `npx vitest run` invocations with no code change). Cap concurrency and
    // raise the timeout so the suite is deterministic rather than racy.
    testTimeout: 15000,
    poolOptions: {
      threads: {
        maxThreads: 4,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/setup.ts',
      ],
    },
  },
});
