# 権限管理システム テストベストプラクティスガイド

## 1. 即時対応: UIテスト実行手順

### 1.1 ブラウザコンソールテストの実行

#### 準備手順
1. **開発サーバーの起動確認**
   ```bash
   npm run dev
   ```
   
2. **ブラウザでアプリケーションを開く**
   - URL: `http://localhost:3000/board`
   - Chrome/Firefox/Safariの開発者ツールを推奨

3. **ログイン状態の確認**
   - ログイン済み: 自分の投稿の編集・削除ボタンが表示される
   - 未ログイン: すべての編集・削除ボタンが無効または非表示

#### テスト実行手順
```javascript
// 1. 開発者ツールを開く (F12 or Cmd+Option+I)
// 2. Consoleタブを選択
// 3. browser-permission-test.jsの内容を貼り付けて実行
// 4. 結果を確認
```

#### チェックポイント
| 項目 | 期待される結果 | 確認方法 |
|------|--------------|----------|
| セッション状態 | ログイン時: Cookie存在 | `document.cookie`で確認 |
| 自分の投稿 | 編集・削除ボタン有効 | ボタンの`disabled`属性 |
| 他人の投稿 | 編集・削除ボタン無効 | Tooltipに「権限がありません」 |
| ゲストアクセス | すべてのボタン無効 | ログアウト後に確認 |

### 1.2 手動UIテストシナリオ

#### シナリオ1: 投稿所有者のテスト
```markdown
1. ログインする
2. 新規投稿を作成
3. 作成した投稿の編集ボタンをクリック
   ✅ 編集ダイアログが開く
4. 内容を変更して保存
   ✅ 投稿が更新される
5. 削除ボタンをクリック
   ✅ 確認ダイアログが表示
6. 削除を実行
   ✅ 投稿が削除される
```

#### シナリオ2: 非所有者のテスト
```markdown
1. 他のユーザーの投稿を表示
2. 編集ボタンにマウスオーバー
   ✅ 「編集権限がありません」のTooltip表示
3. 編集ボタンをクリック
   ✅ 何も起こらない（無効化されている）
4. 削除ボタンも同様に確認
   ✅ 「削除権限がありません」のTooltip表示
```

## 2. 中期的改善: 自動E2Eテスト実装

### 2.1 Playwright セットアップ

#### インストール手順
```bash
# Playwrightのインストール
npm install -D @playwright/test

# ブラウザのインストール
npx playwright install

# 設定ファイルの生成
npm init playwright@latest
```

#### 基本設定 (playwright.config.ts)
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
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
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### 2.2 E2Eテストケース例

#### e2e/permissions.spec.ts
```typescript
import { test, expect } from '@playwright/test';

test.describe('Permission Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/board');
  });

  test('未認証ユーザーは投稿の編集・削除ができない', async ({ page }) => {
    // 投稿一覧を待つ
    await page.waitForSelector('[data-testid="post-item"]');
    
    // 編集ボタンが無効化されていることを確認
    const editButton = page.locator('[aria-label="edit"]').first();
    await expect(editButton).toBeDisabled();
    
    // 削除ボタンが無効化されていることを確認
    const deleteButton = page.locator('[aria-label="delete"]').first();
    await expect(deleteButton).toBeDisabled();
  });

  test('認証済みユーザーは自分の投稿を編集できる', async ({ page }) => {
    // ログイン処理
    await loginUser(page, 'test@example.com', 'password');
    
    // 新規投稿作成
    await page.fill('[data-testid="post-input"]', 'テスト投稿');
    await page.click('[data-testid="post-submit"]');
    
    // 投稿が作成されるまで待つ
    await page.waitForSelector('text=テスト投稿');
    
    // 編集ボタンをクリック
    await page.click('[aria-label="edit"]');
    
    // 編集ダイアログが開くことを確認
    await expect(page.locator('[data-testid="edit-dialog"]')).toBeVisible();
    
    // 内容を更新
    await page.fill('[data-testid="edit-input"]', '更新された投稿');
    await page.click('[data-testid="save-button"]');
    
    // 更新が反映されることを確認
    await expect(page.locator('text=更新された投稿')).toBeVisible();
  });

  test('認証済みユーザーは他人の投稿を編集できない', async ({ page }) => {
    // ユーザー1でログイン
    await loginUser(page, 'user1@example.com', 'password');
    await createPost(page, 'ユーザー1の投稿');
    await logout(page);
    
    // ユーザー2でログイン
    await loginUser(page, 'user2@example.com', 'password');
    
    // ユーザー1の投稿の編集ボタンが無効化されていることを確認
    const otherUserPost = page.locator('text=ユーザー1の投稿').locator('..');
    const editButton = otherUserPost.locator('[aria-label="edit"]');
    await expect(editButton).toBeDisabled();
  });
});

// ヘルパー関数
async function loginUser(page, email, password) {
  await page.goto('/auth/signin');
  await page.fill('[name="email"]', email);
  await page.fill('[name="password"]', password);
  await page.click('[type="submit"]');
  await page.waitForURL('/board');
}

async function createPost(page, content) {
  await page.fill('[data-testid="post-input"]', content);
  await page.click('[data-testid="post-submit"]');
  await page.waitForSelector(`text=${content}`);
}

async function logout(page) {
  await page.click('[data-testid="user-menu"]');
  await page.click('text=ログアウト');
  await page.waitForURL('/');
}
```

### 2.3 テスト実行とレポート

#### 実行コマンド
```bash
# すべてのテストを実行
npx playwright test

# 特定のテストファイルを実行
npx playwright test e2e/permissions.spec.ts

# UIモードで実行（デバッグ用）
npx playwright test --ui

# レポートを表示
npx playwright show-report
```

## 3. ロールベーステスト実装

### 3.1 テストユーザーの準備

#### seeds/test-users.js
```javascript
const bcrypt = require('bcryptjs');
const User = require('../src/lib/models/User');

const testUsers = [
  {
    email: 'admin@test.com',
    password: await bcrypt.hash('admin123', 10),
    name: 'Test Admin',
    role: 'admin'
  },
  {
    email: 'moderator@test.com',
    password: await bcrypt.hash('mod123', 10),
    name: 'Test Moderator',
    role: 'moderator'
  },
  {
    email: 'user@test.com',
    password: await bcrypt.hash('user123', 10),
    name: 'Test User',
    role: 'user'
  }
];

// データベースにシードデータを挿入
async function seedTestUsers() {
  for (const user of testUsers) {
    await User.findOneAndUpdate(
      { email: user.email },
      user,
      { upsert: true }
    );
  }
}
```

### 3.2 ロール別テストケース

#### チェックリスト
| ロール | 自分の投稿 | 他人の投稿 | 全投稿 | ユーザー管理 |
|--------|-----------|-----------|--------|-------------|
| Admin | ✅ 編集・削除 | ✅ 編集・削除 | ✅ 一括管理 | ✅ フルアクセス |
| Moderator | ✅ 編集・削除 | ⚠️ 削除のみ | ❌ | ❌ |
| User | ✅ 編集・削除 | ❌ | ❌ | ❌ |
| Guest | ❌ | ❌ | ❌ | ❌ |

### 3.3 ロールテストスクリプト

#### test-roles.js
```javascript
const testCases = [
  {
    role: 'admin',
    tests: [
      { action: 'edit_own', expected: true },
      { action: 'delete_own', expected: true },
      { action: 'edit_others', expected: true },
      { action: 'delete_others', expected: true },
      { action: 'manage_users', expected: true }
    ]
  },
  {
    role: 'moderator',
    tests: [
      { action: 'edit_own', expected: true },
      { action: 'delete_own', expected: true },
      { action: 'edit_others', expected: false },
      { action: 'delete_others', expected: true },
      { action: 'manage_users', expected: false }
    ]
  },
  {
    role: 'user',
    tests: [
      { action: 'edit_own', expected: true },
      { action: 'delete_own', expected: true },
      { action: 'edit_others', expected: false },
      { action: 'delete_others', expected: false },
      { action: 'manage_users', expected: false }
    ]
  }
];

async function runRoleTests() {
  for (const testCase of testCases) {
    console.log(`Testing ${testCase.role} role...`);
    for (const test of testCase.tests) {
      const result = await testPermission(testCase.role, test.action);
      const status = result === test.expected ? '✅' : '❌';
      console.log(`  ${test.action}: ${status}`);
    }
  }
}
```

## 4. 負荷テスト実装

### 4.1 Artillery セットアップ

#### インストール
```bash
npm install -D artillery
```

#### 設定ファイル (artillery.yml)
```yaml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Ramp up"
    - duration: 60
      arrivalRate: 100
      name: "Sustained load"
  processor: "./processor.js"

scenarios:
  - name: "Permission Check Performance"
    flow:
      - post:
          url: "/api/auth/signin"
          json:
            email: "{{ $randomString() }}@test.com"
            password: "password123"
          capture:
            - json: "$.token"
              as: "authToken"
      
      - get:
          url: "/api/posts"
          headers:
            Authorization: "Bearer {{ authToken }}"
      
      - loop:
        - get:
            url: "/api/posts/{{ $randomString() }}"
            headers:
              Authorization: "Bearer {{ authToken }}"
        count: 10
```

### 4.2 パフォーマンス指標

#### 監視すべきメトリクス
| メトリクス | 目標値 | アラート閾値 |
|-----------|-------|------------|
| 権限チェック時間 | < 10ms | > 50ms |
| API応答時間 (p95) | < 200ms | > 500ms |
| API応答時間 (p99) | < 500ms | > 1000ms |
| エラー率 | < 0.1% | > 1% |
| スループット | > 100 req/s | < 50 req/s |

### 4.3 負荷テスト実行

```bash
# 基本的な負荷テスト
artillery run artillery.yml

# レポート生成付き
artillery run --output report.json artillery.yml
artillery report report.json

# 特定シナリオのみ実行
artillery run -t http://localhost:3000 scenarios/permission-load.yml
```

## 5. 継続的テスト戦略

### 5.1 CI/CDパイプライン統合

#### GitHub Actions設定例
```yaml
name: Permission Tests

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
        image: mongo:5
        ports:
          - 27017:27017
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm test
      
      - name: Run E2E tests
        run: npx playwright test
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: |
            test-results/
            playwright-report/
```

### 5.2 定期的なセキュリティ監査

#### 月次チェックリスト
- [ ] 権限エスカレーションテスト
- [ ] セッション固定攻撃テスト
- [ ] CSRF対策の確認
- [ ] 権限バイパステスト
- [ ] ロール変更の監査ログ確認

### 5.3 テスト結果ダッシュボード

#### 推奨ツール
1. **Grafana**: リアルタイムメトリクス表示
2. **Allure**: テスト結果の可視化
3. **ReportPortal**: テスト実行履歴管理

## 6. トラブルシューティング

### よくある問題と解決方法

| 問題 | 原因 | 解決方法 |
|------|------|----------|
| テストが不安定 | タイミング問題 | 適切なwait/retryを追加 |
| 権限が正しく反映されない | キャッシュ | キャッシュをクリア |
| E2Eテストが遅い | 並列実行なし | workers数を増やす |
| 負荷テストでエラー | DB接続プール不足 | プールサイズを調整 |

## 7. ベストプラクティスまとめ

### DO ✅
- テストデータは毎回クリーンな状態から開始
- 各テストは独立して実行可能に
- 失敗時は詳細なエラーメッセージを出力
- テスト結果は必ず保存・記録
- 定期的にテストコードもレビュー

### DON'T ❌
- 本番データでテストを実行
- テスト間で状態を共有
- ハードコードされた待機時間
- エラーを無視して続行
- テストのメンテナンスを怠る

---
*このガイドは継続的に更新されます。最終更新: 2025年8月14日*