# デプロイ前セキュリティチェックリスト

## 概要
会員制掲示板アプリケーションのデプロイ前に実施すべき包括的なセキュリティチェックリストです。

---

## 1. 認証・認可システム

### 1.1 認証機能のチェック

#### 単体テスト（Unit Test）
```typescript
// __tests__/unit/auth/authentication.test.ts
describe('認証システム', () => {
  test('パスワードハッシュ化の確認', () => {
    // bcryptでハッシュ化されているか
    // ソルトラウンド10以上か
  });
  
  test('JWTトークンの検証', () => {
    // 有効期限の設定
    // 署名の検証
    // ペイロードの暗号化
  });
  
  test('セッション管理', () => {
    // セッションタイムアウト（30分）
    // セッションローテーション
    // 同時ログイン制限
  });
});
```

#### 結合テスト（Integration Test）
```typescript
// __tests__/integration/auth/login-flow.test.ts
describe('ログインフロー', () => {
  test('正常なログイン', async () => {
    // メール認証済みユーザー
    // 2FA有効時の処理
    // リダイレクト処理
  });
  
  test('ブルートフォース対策', async () => {
    // 5回失敗でアカウントロック
    // IPベースの制限
    // キャプチャ表示
  });
  
  test('パスワードリセット', async () => {
    // トークンの有効期限（1時間）
    // 一度のみ使用可能
    // 通知メール送信
  });
});
```

#### E2Eテスト（End-to-End Test）
```typescript
// e2e/auth/complete-auth-flow.spec.ts
test.describe('完全な認証フロー', () => {
  test('新規登録から投稿まで', async ({ page }) => {
    // 1. 新規登録
    // 2. メール確認
    // 3. ログイン
    // 4. 投稿作成
    // 5. ログアウト
  });
  
  test('セッション維持', async ({ page }) => {
    // ページリロード後もログイン維持
    // タブ間でのセッション共有
    // 非アクティブタイムアウト
  });
});
```

### 1.2 認可機能のチェック

| チェック項目 | 単体 | 結合 | E2E |
|-------------|------|------|-----|
| ロールベースアクセス制御 | ✓ | ✓ | ✓ |
| リソースレベル認可 | ✓ | ✓ | - |
| APIエンドポイント保護 | - | ✓ | ✓ |
| 管理者権限の分離 | ✓ | ✓ | ✓ |

---

## 2. データ保護とプライバシー

### 2.1 データ暗号化

#### チェックリスト
- [ ] **保存時の暗号化**
  - [ ] パスワード: bcrypt (ラウンド12以上)
  - [ ] 個人情報: AES-256暗号化
  - [ ] データベース接続: TLS 1.3

- [ ] **転送時の暗号化**
  - [ ] HTTPS強制 (HSTS設定)
  - [ ] Secure Cookieフラグ
  - [ ] WSS (WebSocket Secure)

- [ ] **キー管理**
  - [ ] 環境変数での管理
  - [ ] キーローテーション計画
  - [ ] HSM/KMS使用検討

### 2.2 個人情報保護

```javascript
// データマスキングテスト
test('個人情報のマスキング', () => {
  const email = 'user@example.com';
  const masked = maskEmail(email);
  expect(masked).toBe('u***@example.com');
});

// ログからの除外テスト
test('センシティブデータのログ除外', () => {
  const logData = sanitizeLog({
    email: 'user@example.com',
    password: 'secret123',
    name: 'John Doe'
  });
  expect(logData.password).toBeUndefined();
  expect(logData.email).toBe('[REDACTED]');
});
```

---

## 3. 入力検証とサニタイゼーション

### 3.1 XSS対策

#### テストペイロード
```javascript
const xssPayloads = [
  '<script>alert("XSS")</script>',
  '<img src=x onerror="alert(1)">',
  '<svg onload="alert(1)">',
  'javascript:alert(1)',
  '<iframe src="javascript:alert(1)">',
  '<body onload="alert(1)">',
  '"><script>alert(1)</script>',
  '<script>document.cookie</script>',
  '<meta http-equiv="refresh" content="0;url=evil.com">',
  '<base href="http://evil.com/">'
];
```

### 3.2 SQLインジェクション対策

#### MongoDBインジェクションテスト
```javascript
const injectionPayloads = [
  { '$ne': null },
  { '$gt': '' },
  { '$regex': '.*' },
  { '__proto__': { isAdmin: true } },
  { 'constructor': { prototype: { isAdmin: true } } }
];

test('NoSQLインジェクション防御', async () => {
  for (const payload of injectionPayloads) {
    const result = await api.post('/api/posts', {
      title: payload,
      content: 'test'
    });
    expect(result.status).not.toBe(200);
  }
});
```

### 3.3 パストラバーサル対策

```javascript
const pathPayloads = [
  '../../../etc/passwd',
  '..\\..\\..\\windows\\system32\\config\\sam',
  '%2e%2e%2f%2e%2e%2f',
  '....//....//....//etc/passwd'
];
```

---

## 4. セキュリティヘッダーと設定

### 4.1 必須セキュリティヘッダー

```javascript
const requiredHeaders = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '0', // 最新推奨は0
  'Content-Security-Policy': `
    default-src 'self';
    script-src 'self' 'unsafe-inline' https://trusted-cdn.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' data: https:;
    connect-src 'self' https://api.example.com;
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
    upgrade-insecure-requests;
  `,
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()'
};
```

### 4.2 Cookie設定

```javascript
const cookieConfig = {
  httpOnly: true,
  secure: true, // HTTPS環境
  sameSite: 'strict',
  maxAge: 1800000, // 30分
  path: '/',
  domain: '.example.com'
};
```

---

## 5. レート制限とDDoS対策

### 5.1 エンドポイント別制限

| エンドポイント | 制限 | 時間窓 | アクション |
|---------------|------|--------|-----------|
| /api/auth/signin | 5回 | 15分 | アカウントロック |
| /api/auth/register | 3回 | 1時間 | IP一時ブロック |
| /api/posts | 10回 | 1分 | 429エラー |
| /api/upload | 5回 | 10分 | 429エラー |
| /api/password-reset | 3回 | 1時間 | メール通知 |

### 5.2 DDoS対策テスト

```javascript
// 負荷テストスクリプト
const loadTest = async () => {
  const promises = [];
  for (let i = 0; i < 100; i++) {
    promises.push(fetch('/api/posts'));
  }
  
  const results = await Promise.all(promises);
  const rateLimited = results.filter(r => r.status === 429);
  
  expect(rateLimited.length).toBeGreaterThan(90);
};
```

---

## 6. 依存関係とサプライチェーン

### 6.1 依存関係の脆弱性スキャン

```bash
# npm audit
npm audit --production

# Snyk
npx snyk test

# OWASP Dependency Check
dependency-check --project "Board App" --scan ./

# License Check
npx license-checker --production --summary
```

### 6.2 既知の脆弱性チェック

```javascript
const vulnerabilityCheck = {
  critical: 0,  // 許容数
  high: 0,      // 許容数
  medium: 5,    // 許容数
  low: 10       // 許容数
};
```

---

## 7. エラーハンドリングとログ

### 7.1 エラーメッセージの検証

```javascript
test('エラー情報の露出防止', async () => {
  const response = await api.get('/api/internal-error');
  
  // スタックトレースが含まれない
  expect(response.data).not.toContain('at Function');
  expect(response.data).not.toContain('node_modules');
  
  // データベース情報が含まれない
  expect(response.data).not.toContain('mongodb://');
  expect(response.data).not.toContain('password');
});
```

### 7.2 監査ログの確認

```javascript
const auditEvents = [
  'user.login',
  'user.logout',
  'user.register',
  'password.reset',
  'post.create',
  'post.delete',
  'admin.action',
  'security.violation'
];

test('監査ログの記録', async () => {
  for (const event of auditEvents) {
    const logged = await checkAuditLog(event);
    expect(logged).toBe(true);
  }
});
```

---

## 8. 本番環境設定チェック

### 8.1 環境変数

```bash
# 必須環境変数
NODE_ENV=production
NEXTAUTH_URL=https://example.com
NEXTAUTH_SECRET=[32文字以上のランダム文字列]
MONGODB_URI=mongodb+srv://...
JWT_SECRET=[強力なシークレット]
ENCRYPTION_KEY=[32バイトのキー]

# メール設定
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=[メールユーザー]
SMTP_PASS=[メールパスワード]

# セキュリティ設定
RATE_LIMIT_ENABLED=true
CSRF_PROTECTION=true
AUDIT_LOG_ENABLED=true
```

### 8.2 ビルド最適化

```javascript
// next.config.js
module.exports = {
  poweredByHeader: false, // X-Powered-Byヘッダーを無効化
  compress: true,         // gzip圧縮有効化
  
  // セキュリティヘッダー
  async headers() {
    return [{
      source: '/:path*',
      headers: securityHeaders
    }];
  },
  
  // コンテンツセキュリティポリシー
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/api/:path*',
          destination: '/api/:path*',
        }
      ]
    };
  }
};
```

---

## 9. 自動セキュリティテストスクリプト

### 9.1 統合テストスクリプト

```javascript
// scripts/security-audit.js
const runSecurityAudit = async () => {
  const tests = [
    { name: 'Authentication', fn: testAuthentication },
    { name: 'Authorization', fn: testAuthorization },
    { name: 'Input Validation', fn: testInputValidation },
    { name: 'XSS Prevention', fn: testXSSPrevention },
    { name: 'CSRF Protection', fn: testCSRFProtection },
    { name: 'Rate Limiting', fn: testRateLimiting },
    { name: 'Security Headers', fn: testSecurityHeaders },
    { name: 'Error Handling', fn: testErrorHandling },
    { name: 'Data Encryption', fn: testDataEncryption },
    { name: 'Session Management', fn: testSessionManagement }
  ];
  
  const results = [];
  
  for (const test of tests) {
    console.log(`Running ${test.name}...`);
    try {
      const result = await test.fn();
      results.push({ 
        name: test.name, 
        status: 'PASSED',
        details: result 
      });
    } catch (error) {
      results.push({ 
        name: test.name, 
        status: 'FAILED',
        error: error.message 
      });
    }
  }
  
  return results;
};
```

### 9.2 脆弱性スキャナー

```javascript
// scripts/vulnerability-scanner.js
const scanVulnerabilities = async () => {
  const scanners = [
    { name: 'OWASP ZAP', command: 'zap-cli quick-scan --self-contained http://localhost:3000' },
    { name: 'Nikto', command: 'nikto -h http://localhost:3000' },
    { name: 'SQLMap', command: 'sqlmap -u "http://localhost:3000/api/posts?id=1" --batch' },
    { name: 'XSSer', command: 'xsser -u "http://localhost:3000/search?q=test"' }
  ];
  
  const results = [];
  
  for (const scanner of scanners) {
    console.log(`Running ${scanner.name}...`);
    const result = await exec(scanner.command);
    results.push({ 
      scanner: scanner.name, 
      result 
    });
  }
  
  return results;
};
```

---

## 10. デプロイ前チェックリスト

### 必須項目（MUST）

- [ ] **認証・認可**
  - [ ] パスワードポリシー（8文字以上、複雑性要件）
  - [ ] アカウントロック機能
  - [ ] セッションタイムアウト
  - [ ] 多要素認証（オプション）

- [ ] **データ保護**
  - [ ] HTTPS強制
  - [ ] データベース暗号化
  - [ ] バックアップ暗号化
  - [ ] ログのサニタイゼーション

- [ ] **入力検証**
  - [ ] XSS対策
  - [ ] SQLインジェクション対策
  - [ ] CSRF対策
  - [ ] ファイルアップロード検証

- [ ] **セキュリティ設定**
  - [ ] セキュリティヘッダー設定
  - [ ] Cookie設定（Secure, HttpOnly, SameSite）
  - [ ] CORS設定
  - [ ] CSP設定

- [ ] **レート制限**
  - [ ] API レート制限
  - [ ] ログイン試行制限
  - [ ] DDoS対策

### 推奨項目（SHOULD）

- [ ] **監視・ログ**
  - [ ] 監査ログ
  - [ ] エラー監視
  - [ ] パフォーマンス監視
  - [ ] セキュリティイベント通知

- [ ] **バックアップ・復旧**
  - [ ] 定期バックアップ
  - [ ] 復旧手順書
  - [ ] 災害復旧計画

- [ ] **コンプライアンス**
  - [ ] GDPR準拠
  - [ ] 個人情報保護法準拠
  - [ ] 利用規約・プライバシーポリシー

---

## 11. テスト実行コマンド

```bash
# 1. 依存関係の脆弱性チェック
npm audit
npm audit fix

# 2. セキュリティヘッダーチェック
curl -I https://your-domain.com | grep -E "X-Frame-Options|X-Content-Type-Options|Strict-Transport-Security"

# 3. SSL/TLS設定チェック
nmap --script ssl-enum-ciphers -p 443 your-domain.com

# 4. セキュリティテスト実行
npm run test:security

# 5. 負荷テスト
artillery quick -d 60 -r 10 https://your-domain.com

# 6. 脆弱性スキャン
docker run -t owasp/zap2docker-stable zap-baseline.py -t https://your-domain.com

# 7. 全体的なセキュリティ監査
node scripts/security-audit.js
```

---

## 12. リスク評価マトリクス

| リスク | 可能性 | 影響度 | 優先度 | 対策状況 |
|--------|--------|--------|--------|----------|
| SQLインジェクション | 低 | 高 | 高 | ✅ 対策済み |
| XSS攻撃 | 中 | 中 | 高 | ✅ 対策済み |
| CSRF攻撃 | 低 | 中 | 中 | ⚠️ Phase 2 |
| セッションハイジャック | 低 | 高 | 高 | ✅ 対策済み |
| DDoS攻撃 | 中 | 高 | 高 | ✅ 対策済み |
| データ漏洩 | 低 | 極高 | 極高 | ✅ 対策済み |
| 権限昇格 | 低 | 高 | 高 | ✅ 対策済み |
| ブルートフォース | 中 | 中 | 中 | ✅ 対策済み |

---

## 13. セキュリティ連絡先

```yaml
security_team:
  email: security@example.com
  phone: +81-XX-XXXX-XXXX
  
incident_response:
  primary: incident@example.com
  secondary: backup@example.com
  
vulnerability_disclosure:
  email: vulnerability@example.com
  pgp_key: https://example.com/pgp-key.asc
```

---

## 最終確認

デプロイ前に以下の質問に全て「はい」と答えられることを確認してください：

1. [ ] 全ての必須セキュリティ機能が実装されていますか？
2. [ ] 本番環境の設定は適切ですか？
3. [ ] バックアップとリカバリ計画はありますか？
4. [ ] インシデント対応計画はありますか？
5. [ ] セキュリティテストは全て合格していますか？
6. [ ] 脆弱性スキャンで重大な問題は見つかりませんでしたか？
7. [ ] ログと監視は適切に設定されていますか？
8. [ ] チーム全員がセキュリティ手順を理解していますか？

---

**作成日**: 2025年8月14日
**バージョン**: 1.0
**次回レビュー**: デプロイ後1週間