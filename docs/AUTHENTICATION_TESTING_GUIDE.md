# 🔐 認証機能テストガイド - ベストプラクティス & チェックポイント

## 📋 概要

このガイドでは、Next.js + NextAuth + MongoDBを使用した認証機能の包括的なテスト戦略について説明します。

---

## 🎯 テストピラミッド戦略

```
       /\     E2E Tests (少数・高価値)
      /  \    ├─ユーザーフロー
     /    \   ├─ブラウザ統合
    /______\  └─UI/UX確認
   
   Integration Tests (中規模・API統合)
   ├─API エンドポイント
   ├─データベース統合  
   └─認証フロー

Unit Tests (多数・高速・詳細)
├─個別関数
├─バリデーション
└─ビジネスロジック
```

---

## 🧪 テストレベル別実装ガイド

### 1. Unit Test（単体テスト）

#### ✅ **実装範囲**
- **ユーザーモデル**: バリデーション、パスワードハッシュ化
- **認証ロジック**: authorize関数、JWT処理
- **ヘルパー関数**: パスワード強度、入力サニタイズ
- **カスタムフック**: useAuth、useSession拡張

#### 🎯 **チェックポイント**

```typescript
// ✅ パスワードハッシュ化テスト
test('パスワードが自動的にbcryptでハッシュ化される', async () => {
  const user = new User({ email: 'test@example.com', password: 'plain' });
  await user.save();
  
  expect(user.password).not.toBe('plain');
  expect(user.password).toMatch(/^\$2[aby]\$\d+\$/);
  expect(user.password.length).toBeGreaterThan(50);
});

// ✅ 入力バリデーション徹底テスト
test('不正入力でバリデーションエラー', async () => {
  const testCases = [
    { email: '', expected: 'メールアドレス必須' },
    { email: 'invalid', expected: '無効なメール形式' },
    { password: '123', expected: 'パスワード強度不足' },
  ];
  
  for (const testCase of testCases) {
    const user = new User(testCase);
    await expect(user.validate()).rejects.toThrow(testCase.expected);
  }
});
```

#### 🔒 **セキュリティテスト必須項目**
- [ ] SQLインジェクション攻撃パターン
- [ ] XSS攻撃パターン
- [ ] 境界値テスト（長い入力）
- [ ] パスワード強度チェック
- [ ] 時間ベース攻撃耐性

---

### 2. Integration Test（統合テスト）

#### ✅ **実装範囲**
- **API エンドポイント**: 実際のHTTPリクエスト・レスポンス
- **データベース連携**: 実際のMongoose操作
- **NextAuth統合**: 認証フロー全体
- **メール送信**: Nodemailerとの統合

#### 🎯 **重要なチェックポイント**

```typescript
// ✅ 実際のAPIテスト
describe('/api/auth/register', () => {
  test('正常登録フロー', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send(validUserData);
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    
    // データベース確認
    const user = await User.findOne({ email: validUserData.email });
    expect(user.emailVerified).toBe(false);
    expect(user.emailVerificationToken).toBeDefined();
  });
});

// ✅ 認証フロー統合テスト
test('ログイン → トークン取得 → 認証チェック', async () => {
  const loginRes = await signIn('credentials', credentials);
  const token = extractTokenFromResponse(loginRes);
  const apiRes = await authenticatedRequest('/api/protected', token);
  
  expect(apiRes.status).toBe(200);
});
```

#### 🔍 **テスト必須項目**
- [ ] エラーハンドリング（DB接続失敗等）
- [ ] レート制限動作
- [ ] CSRF保護機能
- [ ] セッション永続性
- [ ] Cookie設定・削除

---

### 3. E2E Test（エンドツーエンドテスト）

#### ✅ **実装範囲**
- **ユーザーフロー**: 登録→確認→ログイン→ログアウト
- **ブラウザ互換性**: Chrome、Firefox、Safari
- **レスポンシブ**: モバイル・タブレット・デスクトップ
- **アクセシビリティ**: スクリーンリーダー対応

#### 🎯 **クリティカルパス**

```typescript
// ✅ 完全なユーザーフロー
test('新規ユーザー完全フロー', async ({ page }) => {
  // 1. 登録
  await page.goto('/auth/signup');
  await page.fill('input[name="email"]', testUser.email);
  await page.fill('input[name="password"]', testUser.password);
  await page.click('button[type="submit"]');
  await expect(page.locator('text=確認メールを送信')).toBeVisible();
  
  // 2. メール確認（テスト環境では直接確認状態に）
  await confirmEmailDirectly(testUser.email);
  
  // 3. ログイン
  await page.goto('/auth/signin');
  await loginFlow(page, testUser);
  await expect(page).toHaveURL('/dashboard');
  
  // 4. 認証状態確認
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  
  // 5. ログアウト
  await page.click('[data-testid="logout-button"]');
  await expect(page).toHaveURL('/');
});
```

#### 📱 **デバイス・ブラウザテスト**
- [ ] Chrome（最新・1つ前のバージョン）
- [ ] Firefox（最新）
- [ ] Safari（macOS/iOS）
- [ ] Edge（最新）
- [ ] モバイル（iOS Safari、Android Chrome）

---

## 🛡️ セキュリティテスト特別項目

### 🔴 **Critical Security Tests**

```typescript
// ✅ レート制限テスト
test('ブルートフォース攻撃防御', async () => {
  const promises = Array(10).fill().map(() => 
    attemptLogin('victim@example.com', 'wrong-password')
  );
  
  const results = await Promise.all(promises);
  const rateLimitedRequests = results.filter(r => r.status === 429);
  
  expect(rateLimitedRequests.length).toBeGreaterThan(0);
});

// ✅ セッションハイジャック防止
test('セッショントークン改ざん検知', async () => {
  const validToken = await getValidToken();
  const tamperedToken = validToken.slice(0, -5) + 'XXXXX';
  
  const response = await makeAuthenticatedRequest(tamperedToken);
  expect(response.status).toBe(401);
});

// ✅ CSRF攻撃防止
test('CSRF トークン検証', async () => {
  const response = await request('/api/auth/register')
    .send(userData)
    .set('Origin', 'https://malicious-site.com');
  
  expect(response.status).toBe(403);
});
```

### 🔒 **データ保護テスト**
- [ ] パスワード平文保存防止
- [ ] 機密情報ログ出力防止
- [ ] SQL/NoSQLインジェクション防止
- [ ] XSS攻撃防止
- [ ] セッション固定攻撃防止

---

## 📊 テストカバレッジ目標

### 🎯 **カバレッジ指標**
- **コードカバレッジ**: 90%以上
- **分岐カバレッジ**: 85%以上
- **関数カバレッジ**: 95%以上

### 📈 **測定コマンド**
```bash
# 単体テスト カバレッジ
npm run test:coverage

# E2Eテスト カバレッジ
npm run test:e2e -- --coverage

# 統合カバレッジレポート
npm run test:all-coverage
```

---

## 🚀 テスト実行戦略

### 🔄 **CI/CD パイプライン**

```yaml
# GitHub Actions例
name: Authentication Tests
on: [push, pull_request]
jobs:
  unit-tests:
    - name: Unit Tests
      run: npm run test:unit
  
  integration-tests:
    - name: Integration Tests  
      run: npm run test:integration
      
  e2e-tests:
    - name: E2E Tests
      run: npm run test:e2e
```

### ⚡ **高速化戦略**
- **並列実行**: Jest workers、Playwright parallel
- **テストDB**: MongoDB Memory Server
- **モック活用**: 外部サービス（メール送信等）
- **キャッシュ**: 依存関係、ビルド成果物

---

## 🔧 デバッグ・トラブルシューティング

### 🐛 **よくある問題**

```typescript
// ❌ 非同期処理の待機不足
test('ダメな例', () => {
  saveUser(userData); // await なし
  expect(User.findOne(query)).toBeTruthy(); // 未完了の可能性
});

// ✅ 正しい非同期処理
test('良い例', async () => {
  await saveUser(userData);
  const user = await User.findOne(query);
  expect(user).toBeTruthy();
});
```

### 🔍 **デバッグコマンド**
```bash
# 詳細ログ付きテスト実行
DEBUG=* npm run test:integration

# 特定テストのみ実行
npm run test -- --testNamePattern="ログイン"

# Playwright デバッグモード
npm run test:e2e:debug
```

---

## ✅ **テスト実行前チェックリスト**

### 🏁 **事前準備**
- [ ] テストDB（MongoDB Memory Server）起動確認
- [ ] 環境変数設定（.env.test）
- [ ] モックサービス初期化
- [ ] テストデータクリーンアップ

### 🧪 **実行フロー**
```bash
# 1. 依存関係インストール
npm install

# 2. 単体テスト実行
npm run test:unit

# 3. 統合テスト実行  
npm run test:integration

# 4. E2Eテスト実行
npm run test:e2e

# 5. カバレッジレポート確認
npm run test:coverage
```

### 📋 **品質チェック項目**
- [ ] すべてのテストがパス（100%）
- [ ] カバレッジ目標達成（90%+）
- [ ] パフォーマンス要件充足（応答時間3秒以下）
- [ ] セキュリティテスト全項目パス
- [ ] アクセシビリティチェック完了
- [ ] モバイルレスポンシブ確認

---

## 📚 **参考資料・ツール**

### 🛠️ **推奨ツール**
- **Unit Test**: Jest + Testing Library
- **Integration**: Supertest + MSW
- **E2E**: Playwright + Lighthouse
- **Coverage**: Istanbul + Codecov
- **Security**: npm audit + Snyk

### 📖 **学習リソース**
- [NextAuth Testing Documentation](https://next-auth.js.org/getting-started/testing)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)

---

## 🎉 **成功指標**

### ✅ **達成目標**
- ✅ 全テストレベル実装完了
- ✅ セキュリティテスト100%パス
- ✅ CI/CDパイプライン統合
- ✅ チーム全体でのテスト文化定着

**認証機能の品質保証により、ユーザーの信頼性とセキュリティを確保します！** 🔐✨