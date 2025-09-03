/**
 * Playwright設定ファイル - 通知UXテスト専用
 * STRICT120準拠
 */

import { defineConfig, devices } from '@playwright/test';
import path from 'path';

// 環境変数
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const CI = process.env.CI === 'true';

export default defineConfig({
  // テストディレクトリ
  testDir: './tests/e2e/notification-ux',
  
  // タイムアウト設定
  timeout: 30 * 1000, // 各テスト30秒
  expect: {
    timeout: 5000 // expect assertions 5秒
  },
  
  // 並列実行設定
  fullyParallel: !CI, // CIでは順次実行
  workers: CI ? 1 : 4, // CI環境では1ワーカー
  
  // リトライ設定
  retries: CI ? 2 : 1, // CI環境では2回リトライ
  
  // レポーター設定
  reporter: [
    ['line'], // コンソール出力
    ['html', { 
      open: 'never',
      outputFolder: 'test-results/html-report'
    }],
    ['json', { 
      outputFile: 'test-results/results.json' 
    }],
    ['junit', { 
      outputFile: 'test-results/junit.xml' 
    }]
  ],
  
  // 出力ディレクトリ
  outputDir: 'test-results/traces',
  
  // グローバル設定
  use: {
    // ベースURL
    baseURL: BASE_URL,
    
    // トレース設定（失敗時のみ）
    trace: 'retain-on-failure',
    
    // スクリーンショット（失敗時）
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true
    },
    
    // ビデオ録画（失敗時のみ）
    video: {
      mode: 'retain-on-failure',
      size: { width: 1280, height: 720 }
    },
    
    // ビューポート
    viewport: { width: 1280, height: 720 },
    
    // アクションタイムアウト
    actionTimeout: 10000,
    
    // ナビゲーションタイムアウト
    navigationTimeout: 10000,
    
    // 認証状態の保存
    storageState: 'tests/e2e/notification-ux/.auth/user.json',
    
    // ロケール
    locale: 'ja-JP',
    
    // タイムゾーン
    timezoneId: 'Asia/Tokyo',
    
    // カラースキーム
    colorScheme: 'light',
    
    // ユーザーエージェント（オプション）
    userAgent: 'Playwright/NotificationTest'
  },

  // プロジェクト設定（ブラウザ別）
  projects: [
    // セットアップ（認証）
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      use: {
        storageState: undefined // 認証前なので空
      }
    },
    
    // Desktop Chrome
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: 'tests/e2e/notification-ux/.auth/user.json'
      },
      dependencies: ['setup']
    },

    // Desktop Firefox
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        storageState: 'tests/e2e/notification-ux/.auth/user.json'
      },
      dependencies: ['setup']
    },

    // Desktop Safari
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        storageState: 'tests/e2e/notification-ux/.auth/user.json'
      },
      dependencies: ['setup']
    },

    // Mobile Chrome (Android)
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
        storageState: 'tests/e2e/notification-ux/.auth/user.json'
      },
      dependencies: ['setup']
    },

    // Mobile Safari (iOS)
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 13'],
        storageState: 'tests/e2e/notification-ux/.auth/user.json'
      },
      dependencies: ['setup']
    },

    // Tablet
    {
      name: 'iPad',
      use: { 
        ...devices['iPad Pro'],
        storageState: 'tests/e2e/notification-ux/.auth/user.json'
      },
      dependencies: ['setup']
    },

    // アクセシビリティテスト専用
    {
      name: 'accessibility',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/e2e/notification-ux/.auth/user.json',
        // スクリーンリーダーシミュレーション
        bypassCSP: true, // axe-coreインジェクション用
      },
      dependencies: ['setup'],
      testMatch: /test-00[78].*\.spec\.ts/ // TEST_007-008のみ
    },

    // パフォーマンステスト専用
    {
      name: 'performance',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/e2e/notification-ux/.auth/user.json',
        // Lighthouse設定
        launchOptions: {
          args: [
            '--enable-features=NetworkService',
            '--disable-dev-shm-usage'
          ]
        }
      },
      dependencies: ['setup'],
      testMatch: /test-009|test-010.*\.spec\.ts/ // TEST_009-010のみ
    }
  ],

  // Webサーバー設定（開発サーバー自動起動）
  webServer: CI ? undefined : {
    command: 'npm run dev',
    port: 3000,
    timeout: 120 * 1000,
    reuseExistingServer: !CI,
    env: {
      NODE_ENV: 'test',
      AUTH_EMAIL: 'one.photolife+1@gmail.com',
      AUTH_PASSWORD: '?@thc123THC@?',
      MONGODB_URI: 'mongodb://localhost:27017/board-app-test',
      NEXTAUTH_SECRET: 'test-secret-strict120',
      NEXTAUTH_URL: BASE_URL
    }
  },

  // グローバルセットアップ
  globalSetup: path.join(__dirname, 'tests/e2e/notification-ux/global-setup.ts'),
  
  // グローバルティアダウン
  globalTeardown: path.join(__dirname, 'tests/e2e/notification-ux/global-teardown.ts'),
  
  // その他の設定
  preserveOutput: 'always', // 出力を常に保持
  updateSnapshots: 'none', // スナップショット更新なし
  
  // メタデータ
  metadata: {
    protocol: 'STRICT120',
    testSuite: 'Notification UX Tests',
    version: '1.0.0',
    author: 'QA Automation Team',
    credentials: {
      email: 'one.photolife+1@gmail.com',
      note: 'Password stored in environment variable'
    }
  }
});