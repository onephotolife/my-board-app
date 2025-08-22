import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // 順次実行で安定性向上
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1, // 単一ワーカーで実行
  timeout: 60 * 1000, // グローバルタイムアウト60秒に拡大
  reporter: [
    ['list'],
    ['html'],
    ['json', { outputFile: 'test-results.json' }]
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off', // ビデオ記録を無効化してパフォーマンス向上
    actionTimeout: 15 * 1000, // アクション毎のタイムアウト15秒に拡大
    navigationTimeout: 30 * 1000, // ナビゲーションタイムアウト30秒に拡大
  },

  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true,
      },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 60 * 1000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
