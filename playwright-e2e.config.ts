import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';

/**
 * Playwright E2E専用設定
 * Jest環境と完全分離
 */
export default defineConfig({
  testDir: './tests/e2e',
  testIgnore: ['**/*.setup.ts', '**/fixtures/**', '**/helpers/**'],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // 直列実行で競合回避
  
  reporter: [
    ['line'],
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
    ['junit', { outputFile: 'test-results/e2e-junit.xml' }]
  ],
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15000,
    // アニメーション無効化
    launchOptions: {
      args: ['--force-prefers-reduced-motion'],
    },
  },
  
  timeout: 30000,
  expect: {
    timeout: 5000,
  },

  projects: [
    // 認証セットアップ
    {
      name: 'auth-setup',
      testMatch: /global-setup\.ts/,
      use: {
        // セットアップ用の設定
        actionTimeout: 30000,
      },
    },
    // 認証済みテスト
    {
      name: 'authenticated',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: path.join(__dirname, 'tests/e2e/.auth/user.json'),
        // ビューポート固定
        viewport: { width: 1280, height: 720 },
      },
      dependencies: ['auth-setup'],
      testMatch: /.*\.spec\.ts/,
    },
    // 未認証テスト
    {
      name: 'unauthenticated',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
      testMatch: /.*\.unauth\.spec\.ts/,
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});