import { defineConfig } from '@playwright/test';

const baseURL = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3000';

export default defineConfig({
  testDir: './tests',
  timeout: 45_000,
  workers: 2,
  use: {
    baseURL,
    channel: process.env.PLAYWRIGHT_CHANNEL,
    trace: 'retain-on-failure',
  },
  webServer: process.env.TEST_BASE_URL ? undefined : {
    command: 'npm run dev -- --hostname 127.0.0.1 --port 3000',
    url: baseURL,
    env: { CONTENT_SOURCE: 'local' },
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
