import * as path from 'path';

import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2Eテスト設定
 * StorageState認証対応版
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,
  reporter: [
    ['line'],
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 30 * 1000,
  },
  timeout: 60 * 1000,
  expect: {
    timeout: 15 * 1000,
  },

  projects: [
    // Setup project - runs first to authenticate
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    // Main test projects - use saved auth state
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(__dirname, 'tests/e2e/storageState.json'),
      },
      // dependencies: ['setup'], // Temporarily disabled for mock storageState testing
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: path.join(__dirname, 'tests/e2e/storageState.json'),
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: path.join(__dirname, 'tests/e2e/storageState.json'),
      },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
