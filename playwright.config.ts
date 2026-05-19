import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;
const deployedUrl = process.env.PLAYWRIGHT_BASE_URL; // e.g. https://haworks-platform.pages.dev

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? 'github' : 'html',
  timeout: 60_000, // 60s per test — client:only islands need time
  use: {
    baseURL: deployedUrl || 'http://localhost:4321',
    trace: 'on-first-retry',
    actionTimeout: 15_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        // Mobile emulation is slower for JS-heavy pages
        actionTimeout: 30_000,
      },
    },
  ],
  // Only start local server when not testing against deployed URL
  ...(deployedUrl ? {} : {
    webServer: {
      command: 'npm run build && npm run preview',
      url: 'http://localhost:4321',
      reuseExistingServer: !isCI,
      timeout: 120_000,
    },
  }),
});
