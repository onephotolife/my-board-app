# Playwright E2Eテスト実装プロンプト - メール再送信機能の完璧な検証

## 目的
メール再送信機能の包括的なE2Eテストを一度で正確かつ完璧に実装し、UIからAPIまでの全ての動作を検証する。

## 前提条件と環境設定

### 必要なパッケージ
```json
{
  "@playwright/test": "^1.40.0",
  "dotenv": "^16.0.0"
}
```

### 環境変数（.env.test）
```env
TEST_BASE_URL=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/board-app-test
TEST_USER_EMAIL_PREFIX=e2e_test_
TEST_TIMEOUT=30000
HEADLESS=true
```

## 実装要件

### 1. テストファイル構造
```
tests/
├── e2e/
│   ├── auth/
│   │   ├── email-resend.spec.ts      # メイン再送信テスト
│   │   ├── rate-limit.spec.ts        # レート制限テスト
│   │   └── security.spec.ts          # セキュリティテスト
│   ├── fixtures/
│   │   ├── auth.fixture.ts           # 認証関連のフィクスチャ
│   │   └── test-users.fixture.ts     # テストユーザー管理
│   ├── helpers/
│   │   ├── db-helper.ts              # データベース操作
│   │   ├── api-helper.ts             # API直接呼び出し
│   │   └── email-helper.ts           # メール検証ヘルパー
│   └── config/
│       └── playwright.config.ts      # Playwright設定
```

### 2. 実装すべきテストケース

#### A. UI統合テスト（tests/e2e/auth/email-resend.spec.ts）

```typescript
import { test, expect, Page } from '@playwright/test';
import { TestUserFixture } from '../fixtures/test-users.fixture';
import { DatabaseHelper } from '../helpers/db-helper';
import { EmailHelper } from '../helpers/email-helper';

// テストの前後処理
test.beforeAll(async () => {
  // 1. テストデータベースをクリーンアップ
  // 2. テストユーザーを作成（10件）
  // 3. メールサーバーモックを起動
});

test.afterAll(async () => {
  // 1. テストデータをクリーンアップ
  // 2. モックサーバーを停止
});

test.describe('メール再送信機能 - UI統合テスト', () => {
  
  test('再送信フォームの表示と基本操作', async ({ page }) => {
    // 1. 再送信ページにアクセス
    // 2. フォーム要素の存在確認
    // 3. 必須フィールドの検証
    // 4. エラーメッセージの表示確認
  });

  test('正常な再送信フロー', async ({ page }) => {
    // 1. 有効なメールアドレスを入力
    // 2. 再送信ボタンをクリック
    // 3. 成功メッセージの確認
    // 4. クールダウン時間の表示確認
    // 5. attemptNumberの表示確認
  });

  test('再送信回数制限の動作確認', async ({ page }) => {
    // 1. 同一メールで5回再送信を試行
    // 2. 各回でattemptNumberが増加することを確認
    // 3. 5回目で制限エラーが表示されることを確認
    // 4. サポート連絡先が表示されることを確認
  });

  test('クールダウン時間の動作確認', async ({ page }) => {
    // 1. 初回送信後のクールダウン表示確認（60秒）
    // 2. カウントダウンタイマーの動作確認
    // 3. クールダウン中はボタンが無効化されることを確認
    // 4. 指数バックオフの確認（60→120→240→480秒）
  });

  test('入力検証とエラーハンドリング', async ({ page }) => {
    // 各種無効な入力のテスト
    const invalidInputs = [
      { email: '', expectedError: 'メールアドレスを入力してください' },
      { email: 'invalid', expectedError: '有効なメールアドレスを入力してください' },
      { email: 'test@test@test.com', expectedError: '有効なメールアドレスを入力してください' },
      { email: 'a'.repeat(101) + '@test.com', expectedError: 'メールアドレスが長すぎます' },
      { email: 'test<script>@test.com', expectedError: '無効な文字が含まれています' }
    ];
    
    for (const { email, expectedError } of invalidInputs) {
      // 入力とエラー確認
    }
  });

  test('レスポンシブデザインの確認', async ({ page }) => {
    // 各デバイスサイズでの表示確認
    const viewports = [
      { width: 375, height: 667, name: 'iPhone SE' },
      { width: 768, height: 1024, name: 'iPad' },
      { width: 1920, height: 1080, name: 'Desktop' }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      // UIレイアウトの確認
    }
  });
});
```

#### B. API直接テスト（tests/e2e/auth/rate-limit.spec.ts）

```typescript
import { test, expect } from '@playwright/test';
import { APIHelper } from '../helpers/api-helper';

test.describe('レート制限とセキュリティ', () => {
  
  test('レート制限の正確な動作', async () => {
    // 1. 短時間での連続リクエスト
    // 2. 429ステータスの確認
    // 3. cooldownSecondsの確認
    // 4. nextRetryAtの検証
  });

  test('指数バックオフアルゴリズムの検証', async () => {
    // 1. 複数回のリクエストでクールダウン時間を記録
    // 2. 60→120→240→480→960秒の増加を確認
    // 3. 最大値（3600秒）を超えないことを確認
  });

  test('異なるIPアドレスからのリクエスト処理', async () => {
    // 1. X-Forwarded-Forヘッダーを使用
    // 2. IP別にレート制限が適用されることを確認
  });
});
```

#### C. セキュリティテスト（tests/e2e/auth/security.spec.ts）

```typescript
test.describe('セキュリティ検証', () => {
  
  test('タイミング攻撃対策の確認', async () => {
    // 1. 存在するユーザーへのリクエスト時間測定（10回）
    // 2. 存在しないユーザーへのリクエスト時間測定（10回）
    // 3. 応答時間の差が100ms以内であることを確認
    // 4. 標準偏差を計算して一貫性を確認
  });

  test('XSS攻撃の防御確認', async ({ page }) => {
    const xssPayloads = [
      '<script>alert(1)</script>',
      'javascript:alert(1)',
      '<img src=x onerror=alert(1)>',
      '<svg onload=alert(1)>'
    ];
    
    for (const payload of xssPayloads) {
      // 1. ペイロードを含むメールアドレスを送信
      // 2. 400エラーが返されることを確認
      // 3. ペイロードが実行されないことを確認
    }
  });

  test('SQLインジェクション対策の確認', async () => {
    const sqlPayloads = [
      "test'; DROP TABLE users; --",
      "test' OR '1'='1",
      "test'; SELECT * FROM users; --"
    ];
    
    for (const payload of sqlPayloads) {
      // 1. ペイロードを送信
      // 2. 適切にエスケープされることを確認
      // 3. データベースが影響を受けないことを確認
    }
  });

  test('CSRF対策の確認', async ({ page }) => {
    // 1. 異なるオリジンからのリクエストをシミュレート
    // 2. CORSポリシーによりブロックされることを確認
  });
});
```

### 3. ヘルパー実装

#### データベースヘルパー（tests/e2e/helpers/db-helper.ts）

```typescript
import { MongoClient } from 'mongodb';

export class DatabaseHelper {
  private client: MongoClient;
  
  async connect() {
    this.client = new MongoClient(process.env.MONGODB_URI!);
    await this.client.connect();
  }
  
  async createTestUsers(count: number = 10) {
    const db = this.client.db();
    const users = [];
    
    for (let i = 1; i <= count; i++) {
      users.push({
        email: `${process.env.TEST_USER_EMAIL_PREFIX}${i}@example.com`,
        password: await bcrypt.hash('Test1234!', 10),
        name: `E2E Test User ${i}`,
        emailVerified: false,
        createdAt: new Date()
      });
    }
    
    await db.collection('users').insertMany(users);
  }
  
  async cleanupTestData() {
    const db = this.client.db();
    
    // テストユーザーを削除
    await db.collection('users').deleteMany({
      email: new RegExp(`^${process.env.TEST_USER_EMAIL_PREFIX}`)
    });
    
    // ResendHistoryをクリア
    await db.collection('resendhistories').deleteMany({});
    
    // RateLimitをクリア
    await db.collection('ratelimits').deleteMany({});
  }
  
  async getResendHistory(email: string) {
    const db = this.client.db();
    const user = await db.collection('users').findOne({ email });
    if (!user) return null;
    
    return await db.collection('resendhistories').findOne({ 
      userId: user._id 
    });
  }
  
  async disconnect() {
    await this.client.close();
  }
}
```

#### APIヘルパー（tests/e2e/helpers/api-helper.ts）

```typescript
export class APIHelper {
  private baseUrl: string;
  
  constructor() {
    this.baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
  }
  
  async sendResendRequest(email: string, options: any = {}) {
    const response = await fetch(`${this.baseUrl}/api/auth/resend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Playwright E2E Test',
        ...options.headers
      },
      body: JSON.stringify({
        email,
        reason: options.reason || 'not_received',
        ...options.body
      })
    });
    
    const data = await response.json();
    
    return {
      status: response.status,
      data,
      headers: Object.fromEntries(response.headers.entries())
    };
  }
  
  async measureResponseTime(email: string, iterations: number = 10) {
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await this.sendResendRequest(email);
      const end = performance.now();
      times.push(end - start);
      
      // レート制限を避けるため待機
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return {
      average: times.reduce((a, b) => a + b, 0) / times.length,
      min: Math.min(...times),
      max: Math.max(...times),
      stdDev: this.calculateStdDev(times)
    };
  }
  
  private calculateStdDev(values: number[]) {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map(value => Math.pow(value - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(avgSquareDiff);
  }
}
```

### 4. Playwright設定（playwright.config.ts）

```typescript
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// テスト環境変数を読み込み
dotenv.config({ path: '.env.test' });

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // レート制限テストのため順次実行
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // レート制限テストのため単一ワーカー
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results.json' }],
    ['junit', { outputFile: 'junit.xml' }]
  ],
  
  use: {
    baseURL: process.env.TEST_BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // デフォルトのタイムアウト
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
  
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
    },
  ],
  
  // テストサーバーの自動起動
  webServer: {
    command: 'npm run dev',
    url: process.env.TEST_BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

### 5. 実行スクリプト（package.json）

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:report": "playwright show-report",
    "test:e2e:codegen": "playwright codegen",
    "test:e2e:security": "playwright test tests/e2e/auth/security.spec.ts",
    "test:e2e:rate-limit": "playwright test tests/e2e/auth/rate-limit.spec.ts",
    "test:e2e:ci": "npm run build && playwright test"
  }
}
```

### 6. CI/CD統合（.github/workflows/e2e-tests.yml）

```yaml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:6
        ports:
          - 27017:27017
        options: >-
          --health-cmd "mongosh --eval 'db.adminCommand(\"ping\")'"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright Browsers
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        env:
          MONGODB_URI: mongodb://localhost:27017/board-app-test
          TEST_BASE_URL: http://localhost:3000
        run: npm run test:e2e:ci
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

## 成功基準

### 必須要件
1. **カバレッジ**: 全ての重要な機能パスをカバー（90%以上）
2. **信頼性**: フレーキーテストがゼロ
3. **パフォーマンス**: 各テストが30秒以内に完了
4. **再現性**: CI環境とローカル環境で同じ結果

### 検証項目チェックリスト
- [ ] 基本的な再送信フローが動作する
- [ ] 5回の制限が正しく適用される
- [ ] attemptNumberが正確にカウントアップする
- [ ] クールダウン時間が指数的に増加する
- [ ] 入力検証が全ての攻撃ベクトルをブロックする
- [ ] タイミング攻撃対策が有効である
- [ ] レスポンシブデザインが全デバイスで機能する
- [ ] エラーメッセージが適切に表示される
- [ ] データベースの整合性が保たれる
- [ ] メモリリークがない

## 実装手順

1. **環境準備**
   ```bash
   npm install --save-dev @playwright/test dotenv
   npx playwright install
   ```

2. **テストデータベース作成**
   ```bash
   # MongoDB接続確認
   mongosh mongodb://localhost:27017/board-app-test --eval "db.adminCommand('ping')"
   ```

3. **テスト実行**
   ```bash
   # 全テスト実行
   npm run test:e2e
   
   # UIモードで実行（デバッグ用）
   npm run test:e2e:ui
   
   # 特定のテストのみ実行
   npm run test:e2e:security
   ```

4. **レポート確認**
   ```bash
   npm run test:e2e:report
   ```

## トラブルシューティング

### よくある問題と解決策

1. **タイムアウトエラー**
   - `navigationTimeout`を増やす
   - `waitForSelector`に明示的なタイムアウトを設定
   - ネットワーク条件を確認

2. **レート制限によるテスト失敗**
   - テスト間に適切な待機時間を設定
   - テストデータベースを分離
   - 並列実行を無効化

3. **フレーキーテスト**
   - `waitForLoadState('networkidle')`を使用
   - 明示的な待機条件を追加
   - `test.slow()`でタイムアウトを延長

4. **CI環境での失敗**
   - ヘッドレスモードでの動作確認
   - 環境変数の設定確認
   - Dockerコンテナのヘルスチェック

## 期待される成果

このプロンプトに従って実装することで：

1. **完全な自動化**: 手動テストの90%以上を自動化
2. **早期バグ発見**: デプロイ前に問題を検出
3. **回帰テスト**: 変更による影響を即座に検出
4. **ドキュメント化**: テストコード自体が仕様書として機能
5. **信頼性向上**: 本番環境での問題を大幅に削減

## メンテナンス指針

1. **定期的な更新**
   - Playwrightのバージョンアップデート（月1回）
   - テストデータの更新（四半期ごと）
   - セキュリティペイロードの更新（随時）

2. **パフォーマンス監視**
   - テスト実行時間の記録
   - 遅いテストの最適化
   - 並列化の検討

3. **カバレッジ拡大**
   - 新機能追加時のテスト追加
   - エッジケースの継続的な追加
   - ユーザーフィードバックに基づくシナリオ追加