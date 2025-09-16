import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e/strict120',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  retries: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: 'npm run build:next && npm run start:next',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      NODE_ENV: 'production',
      AUTH_BYPASS_FOR_TESTS: '1',
      MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/boardDB',
      NEXTAUTH_SECRET: 'test-secret',
      AUTH_SECRET: 'test-secret',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
