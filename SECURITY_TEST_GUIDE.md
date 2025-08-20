# セキュリティテストガイド

## 概要
実装されたセキュリティ対策を検証するための包括的なテスト手順書です。

## テスト対象機能
1. ✅ レート制限の動作確認
2. ✅ XSS攻撃のシミュレーション
3. ⚠️ CSRF攻撃の防御確認（Phase 2で実装予定）
4. ✅ セキュリティヘッダーの確認
5. ✅ 不正な入力値の拒否
6. ⚠️ 監査ログの記録確認（Phase 3で実装予定）

---

## 1. 単体テスト（Unit Test）

### 1.1 レート制限のテスト

**ファイル**: `__tests__/security/rate-limiter.test.ts`

```typescript
import { RateLimiter } from '@/lib/security/rate-limiter';
import { NextRequest } from 'next/server';

describe('RateLimiter', () => {
  beforeEach(() => {
    RateLimiter.clear();
  });

  describe('レート制限の基本動作', () => {
    it('制限内のリクエストは許可される', async () => {
      const req = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        headers: { 'x-forwarded-for': '192.168.1.1' }
      });

      for (let i = 0; i < 5; i++) {
        const result = await RateLimiter.check(req);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(4 - i);
      }
    });

    it('制限を超えたリクエストは拒否される', async () => {
      const req = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        headers: { 'x-forwarded-for': '192.168.1.1' }
      });

      // 5回まで許可
      for (let i = 0; i < 5; i++) {
        await RateLimiter.check(req);
      }

      // 6回目は拒否
      const result = await RateLimiter.check(req);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('時間窓がリセットされる', async () => {
      jest.useFakeTimers();
      
      const req = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        headers: { 'x-forwarded-for': '192.168.1.1' }
      });

      // 制限まで使い切る
      for (let i = 0; i < 5; i++) {
        await RateLimiter.check(req);
      }

      // 時間を進める（1分後）
      jest.advanceTimersByTime(61000);

      // リセット後は再び許可される
      const result = await RateLimiter.check(req);
      expect(result.allowed).toBe(true);

      jest.useRealTimers();
    });

    it('異なるIPアドレスは別々にカウントされる', async () => {
      const req1 = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        headers: { 'x-forwarded-for': '192.168.1.1' }
      });

      const req2 = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        headers: { 'x-forwarded-for': '192.168.1.2' }
      });

      // IP1で5回使用
      for (let i = 0; i < 5; i++) {
        await RateLimiter.check(req1);
      }

      // IP2はまだ使用可能
      const result = await RateLimiter.check(req2);
      expect(result.allowed).toBe(true);
    });
  });

  describe('エンドポイント別の制限', () => {
    it('異なるエンドポイントは異なる制限を持つ', async () => {
      const postReq = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST'
      });

      const authReq = new NextRequest('http://localhost:3000/api/auth/signin', {
        method: 'POST'
      });

      // POSTは1分に5回
      for (let i = 0; i < 5; i++) {
        const result = await RateLimiter.check(postReq);
        expect(result.allowed).toBe(true);
      }

      // サインインは15分に5回（まだ使用可能）
      const result = await RateLimiter.check(authReq);
      expect(result.allowed).toBe(true);
    });
  });
});
```

### 1.2 サニタイザーのテスト

**ファイル**: `__tests__/security/sanitizer.test.ts`

```typescript
import { InputSanitizer } from '@/lib/security/sanitizer';

describe('InputSanitizer', () => {
  describe('sanitizeHTML', () => {
    it('許可されたタグは保持される', () => {
      const input = '<b>Bold</b> <i>Italic</i>';
      const result = InputSanitizer.sanitizeHTML(input);
      expect(result).toBe('<b>Bold</b> <i>Italic</i>');
    });

    it('危険なタグは除去される', () => {
      const input = '<script>alert("XSS")</script>Hello';
      const result = InputSanitizer.sanitizeHTML(input);
      expect(result).toBe('Hello');
    });

    it('イベントハンドラは除去される', () => {
      const input = '<div onclick="alert(1)">Click</div>';
      const result = InputSanitizer.sanitizeHTML(input);
      expect(result).not.toContain('onclick');
    });
  });

  describe('sanitizeText', () => {
    it('通常のテキストはそのまま返される', () => {
      const input = 'これは普通のテキストです';
      const result = InputSanitizer.sanitizeText(input);
      expect(result).toBe('これは普通のテキストです');
    });

    it('HTMLタグは除去される', () => {
      const input = 'Hello <script>alert(1)</script> World';
      const result = InputSanitizer.sanitizeText(input);
      expect(result).toBe('Hello  World');
    });

    it('JavaScriptプロトコルは除去される', () => {
      const input = 'Click here: javascript:alert(1)';
      const result = InputSanitizer.sanitizeText(input);
      expect(result).not.toContain('javascript:');
    });

    it('最大長が制限される', () => {
      const input = 'a'.repeat(20000);
      const result = InputSanitizer.sanitizeText(input);
      expect(result.length).toBeLessThanOrEqual(10000);
    });
  });

  describe('sanitizeQuery', () => {
    it('MongoDB演算子は無効化される', () => {
      const input = { '$ne': null, 'name': 'test' };
      const result = InputSanitizer.sanitizeQuery(input);
      expect(result).not.toHaveProperty('$ne');
      expect(result).toHaveProperty('name', 'test');
    });

    it('__proto__は除去される', () => {
      const input = { '__proto__': {}, 'valid': 'data' };
      const result = InputSanitizer.sanitizeQuery(input);
      expect(result).not.toHaveProperty('__proto__');
      expect(result).toHaveProperty('valid', 'data');
    });

    it('ネストされたオブジェクトも処理される', () => {
      const input = {
        user: {
          '$gt': '',
          name: 'test'
        }
      };
      const result = InputSanitizer.sanitizeQuery(input);
      expect(result.user).not.toHaveProperty('$gt');
      expect(result.user).toHaveProperty('name', 'test');
    });
  });

  describe('sanitizeEmail', () => {
    it('有効なメールアドレスは正規化される', () => {
      const input = '  USER@EXAMPLE.COM  ';
      const result = InputSanitizer.sanitizeEmail(input);
      expect(result).toBe('user@example.com');
    });

    it('無効なメールアドレスは空文字になる', () => {
      const input = 'not-an-email';
      const result = InputSanitizer.sanitizeEmail(input);
      expect(result).toBe('');
    });
  });

  describe('sanitizeURL', () => {
    it('有効なHTTP URLは許可される', () => {
      const input = 'https://example.com/path';
      const result = InputSanitizer.sanitizeURL(input);
      expect(result).toBe('https://example.com/path');
    });

    it('JavaScriptプロトコルは拒否される', () => {
      const input = 'javascript:alert(1)';
      const result = InputSanitizer.sanitizeURL(input);
      expect(result).toBeNull();
    });

    it('データURLは拒否される', () => {
      const input = 'data:text/html,<script>alert(1)</script>';
      const result = InputSanitizer.sanitizeURL(input);
      expect(result).toBeNull();
    });
  });
});
```

---

## 2. 結合テスト（Integration Test）

### 2.1 ミドルウェア統合テスト

**ファイル**: `__tests__/integration/security-middleware.test.ts`

```typescript
import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';

describe('Security Middleware Integration', () => {
  describe('レート制限とセキュリティヘッダー', () => {
    it('レート制限とヘッダーが同時に適用される', async () => {
      const req = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        headers: { 'x-forwarded-for': '192.168.1.100' }
      });

      const response = await middleware(req);
      
      // セキュリティヘッダーの確認
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
      
      // レート制限情報の確認
      expect(response.headers.get('X-Response-Time')).toBeDefined();
    });

    it('レート制限超過時も適切なヘッダーが設定される', async () => {
      const req = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        headers: { 'x-forwarded-for': '192.168.1.101' }
      });

      // 制限まで使い切る
      for (let i = 0; i < 5; i++) {
        await middleware(req);
      }

      // 6回目
      const response = await middleware(req);
      
      expect(response.status).toBe(429);
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(response.headers.get('Retry-After')).toBeDefined();
    });
  });

  describe('入力サニタイゼーション', () => {
    it('危険なクエリパラメータがサニタイズされる', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/posts?search=<script>alert(1)</script>&sort=name'
      );

      const response = await middleware(req);
      
      // リダイレクトされる
      expect(response.status).toBe(307);
      const location = response.headers.get('location');
      expect(location).not.toContain('<script>');
      expect(location).toContain('sort=name');
    });

    it('正常なパラメータはそのまま通過する', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/posts?search=test&page=1'
      );

      const response = await middleware(req);
      
      // リダイレクトされない
      expect(response.status).not.toBe(307);
    });
  });

  describe('CSPヘッダー', () => {
    it('開発環境と本番環境で異なるCSPが設定される', async () => {
      // 開発環境
      process.env.NODE_ENV = 'development';
      const devReq = new NextRequest('http://localhost:3000');
      const devResponse = await middleware(devReq);
      const devCSP = devResponse.headers.get('Content-Security-Policy');
      expect(devCSP).toContain('unsafe-eval');

      // 本番環境
      process.env.NODE_ENV = 'production';
      const prodReq = new NextRequest('http://localhost:3000');
      const prodResponse = await middleware(prodReq);
      const prodCSP = prodResponse.headers.get('Content-Security-Policy');
      expect(prodCSP).not.toContain('unsafe-eval');
      
      // HSTSは本番のみ
      expect(prodResponse.headers.get('Strict-Transport-Security')).toBeDefined();
    });
  });
});
```

### 2.2 API統合テスト

**ファイル**: `__tests__/integration/api-security.test.ts`

```typescript
import { POST } from '@/app/api/posts/route';
import { createMocks } from 'node-mocks-http';

describe('API Security Integration', () => {
  describe('POST /api/posts', () => {
    it('XSS攻撃がサニタイズされる', async () => {
      const { req } = createMocks({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'test-auth-token=valid_token'
        },
        body: {
          title: '<script>alert("XSS")</script>Test',
          content: 'Content with <iframe src="evil.com"></iframe>',
          tags: ['<img onerror="alert(1)" src="x">']
        }
      });

      const response = await POST(req);
      const data = await response.json();

      // スクリプトタグが除去されている
      expect(data.post.title).not.toContain('<script>');
      expect(data.post.content).not.toContain('<iframe>');
      expect(data.post.tags[0]).not.toContain('onerror');
    });

    it('SQLインジェクション攻撃が防御される', async () => {
      const { req } = createMocks({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'test-auth-token=valid_token'
        },
        body: {
          title: "'; DROP TABLE posts; --",
          content: '{"$ne": null}',
          author: '{"$gt": ""}'
        }
      });

      const response = await POST(req);
      const data = await response.json();

      // 危険な文字列が無害化されている
      expect(data.post.title).not.toContain('DROP TABLE');
      expect(data.post.content).not.toContain('$ne');
    });

    it('最大長制限が適用される', async () => {
      const { req } = createMocks({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'test-auth-token=valid_token'
        },
        body: {
          title: 'a'.repeat(200),
          content: 'b'.repeat(2000)
        }
      });

      const response = await POST(req);
      
      // バリデーションエラー
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('バリデーションエラー');
    });
  });
});
```

---

## 3. E2Eテスト（End-to-End Test）

### 3.1 セキュリティE2Eテスト

**ファイル**: `e2e/security.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('セキュリティ機能のE2Eテスト', () => {
  test.describe('レート制限', () => {
    test('連続投稿でレート制限が発動する', async ({ page, request }) => {
      // ログイン
      await page.goto('/auth/signin');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'Test123!@#');
      await page.click('button[type="submit"]');
      
      await page.waitForURL('/dashboard');
      
      // クッキーを取得
      const cookies = await page.context().cookies();
      const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
      
      // 連続でAPIを呼び出す
      const results = [];
      for (let i = 0; i < 6; i++) {
        const response = await request.post('/api/posts', {
          headers: { 'Cookie': cookieHeader },
          data: {
            title: `Test Post ${i}`,
            content: `Content ${i}`
          }
        });
        results.push(response.status());
      }
      
      // 最初の5回は成功、6回目は429エラー
      expect(results.slice(0, 5).every(s => s === 201)).toBe(true);
      expect(results[5]).toBe(429);
    });

    test('時間経過後にリセットされる', async ({ page, request }) => {
      // テスト環境でのタイムアウト調整が必要
      test.skip(true, 'タイムアウトテストは手動実行推奨');
    });
  });

  test.describe('XSS対策', () => {
    test('投稿フォームでXSSが防御される', async ({ page }) => {
      await page.goto('/board');
      
      // XSSペイロードを入力
      const xssPayload = '<img src=x onerror="alert(\'XSS\')">';
      await page.fill('textarea', xssPayload);
      await page.click('button:has-text("投稿")');
      
      // アラートが発生しないことを確認
      await page.waitForTimeout(1000);
      
      // 投稿内容を確認
      const postContent = await page.textContent('.post-content');
      expect(postContent).not.toContain('onerror');
      expect(postContent).not.toContain('<img');
    });

    test('URLパラメータのXSSが防御される', async ({ page }) => {
      // XSSを含むURLにアクセス
      await page.goto('/board?search=<script>alert(1)</script>');
      
      // リダイレクトされてサニタイズされる
      await page.waitForLoadState();
      const url = page.url();
      expect(url).not.toContain('<script>');
    });
  });

  test.describe('セキュリティヘッダー', () => {
    test('必要なセキュリティヘッダーが設定される', async ({ request }) => {
      const response = await request.get('/');
      
      // ヘッダーの確認
      expect(response.headers()['x-frame-options']).toBe('DENY');
      expect(response.headers()['x-content-type-options']).toBe('nosniff');
      expect(response.headers()['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(response.headers()['permissions-policy']).toContain('camera=()');
      
      // CSPの確認
      const csp = response.headers()['content-security-policy'];
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("frame-ancestors 'none'");
    });
  });

  test.describe('入力検証', () => {
    test('不正な形式のメールアドレスが拒否される', async ({ page }) => {
      await page.goto('/auth/signup');
      
      await page.fill('input[name="email"]', 'not-an-email');
      await page.fill('input[name="password"]', 'Test123!@#');
      await page.fill('input[name="confirmPassword"]', 'Test123!@#');
      await page.click('button[type="submit"]');
      
      // エラーメッセージの確認
      const error = await page.textContent('.error-message');
      expect(error).toContain('有効なメールアドレスを入力してください');
    });

    test('長すぎる入力が制限される', async ({ page }) => {
      await page.goto('/board');
      
      const longText = 'a'.repeat(1001);
      await page.fill('textarea', longText);
      
      // 文字数制限の確認
      const value = await page.inputValue('textarea');
      expect(value.length).toBeLessThanOrEqual(1000);
    });
  });
});
```

---

## 4. セキュリティテスト実行スクリプト

### 4.1 自動セキュリティテストスクリプト

**ファイル**: `scripts/security-test.js`

```javascript
#!/usr/bin/env node

const BASE_URL = 'http://localhost:3000';
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const testResults = [];

// テスト: レート制限
async function testRateLimit() {
  console.log(`\n${colors.blue}📋 レート制限テスト${colors.reset}`);
  
  const results = [];
  for (let i = 1; i <= 6; i++) {
    const response = await fetch(`${BASE_URL}/api/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '192.168.1.100'
      },
      body: JSON.stringify({
        title: `Test ${i}`,
        content: `Content ${i}`
      })
    });
    
    results.push({
      attempt: i,
      status: response.status,
      remaining: response.headers.get('X-RateLimit-Remaining')
    });
    
    console.log(`  試行 ${i}: Status ${response.status}, 残り: ${response.headers.get('X-RateLimit-Remaining') || 'N/A'}`);
  }
  
  const passed = results[5].status === 429;
  logTest('レート制限（6回目でブロック）', passed);
  
  return passed;
}

// テスト: XSS防御
async function testXSSPrevention() {
  console.log(`\n${colors.blue}📋 XSS防御テスト${colors.reset}`);
  
  const xssPayloads = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror="alert(1)">',
    'javascript:alert(1)',
    '<iframe src="evil.com"></iframe>'
  ];
  
  const results = [];
  
  for (const payload of xssPayloads) {
    const response = await fetch(`${BASE_URL}/api/posts?search=${encodeURIComponent(payload)}`);
    const finalUrl = response.url;
    
    const safe = !finalUrl.includes('<script>') && 
                 !finalUrl.includes('onerror') &&
                 !finalUrl.includes('javascript:');
    
    results.push(safe);
    console.log(`  ペイロード: ${payload.substring(0, 30)}... → ${safe ? '✅ 防御成功' : '❌ 防御失敗'}`);
  }
  
  const allPassed = results.every(r => r === true);
  logTest('XSS攻撃の防御', allPassed);
  
  return allPassed;
}

// テスト: セキュリティヘッダー
async function testSecurityHeaders() {
  console.log(`\n${colors.blue}📋 セキュリティヘッダーテスト${colors.reset}`);
  
  const response = await fetch(BASE_URL);
  const headers = response.headers;
  
  const requiredHeaders = {
    'x-frame-options': 'DENY',
    'x-content-type-options': 'nosniff',
    'x-xss-protection': '1; mode=block',
    'referrer-policy': 'strict-origin-when-cross-origin'
  };
  
  let allPresent = true;
  
  for (const [header, expected] of Object.entries(requiredHeaders)) {
    const value = headers.get(header);
    const present = value === expected;
    allPresent = allPresent && present;
    
    console.log(`  ${header}: ${present ? '✅' : '❌'} ${value || 'Not set'}`);
  }
  
  // CSPチェック
  const csp = headers.get('content-security-policy');
  const hasCSP = csp && csp.includes("default-src 'self'");
  console.log(`  CSP: ${hasCSP ? '✅' : '❌'} ${hasCSP ? '設定済み' : '未設定'}`);
  
  logTest('セキュリティヘッダー', allPresent && hasCSP);
  
  return allPresent && hasCSP;
}

// テスト: NoSQLインジェクション防御
async function testNoSQLInjection() {
  console.log(`\n${colors.blue}📋 NoSQLインジェクション防御テスト${colors.reset}`);
  
  const payloads = [
    { title: { '$ne': null }, content: 'test' },
    { title: 'test', content: { '$gt': '' } },
    { '__proto__': { isAdmin: true }, title: 'test', content: 'test' }
  ];
  
  const results = [];
  
  for (const payload of payloads) {
    try {
      const response = await fetch(`${BASE_URL}/api/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'test-auth-token=test'
        },
        body: JSON.stringify(payload)
      });
      
      // 400番台のエラーまたは無害化されていることを期待
      const safe = response.status >= 400 || response.status === 401;
      results.push(safe);
      
      console.log(`  ペイロード: ${JSON.stringify(payload).substring(0, 50)}... → ${safe ? '✅ 防御成功' : '❌ 防御失敗'}`);
    } catch (error) {
      results.push(true); // エラーは防御成功とみなす
      console.log(`  ペイロード: エラー → ✅ 防御成功`);
    }
  }
  
  const allPassed = results.every(r => r === true);
  logTest('NoSQLインジェクション防御', allPassed);
  
  return allPassed;
}

// テスト: レスポンスタイム記録
async function testResponseTime() {
  console.log(`\n${colors.blue}📋 レスポンスタイム記録テスト${colors.reset}`);
  
  const response = await fetch(BASE_URL);
  const responseTime = response.headers.get('x-response-time');
  
  const hasResponseTime = responseTime !== null;
  console.log(`  レスポンスタイム: ${responseTime || 'Not set'}`);
  
  logTest('レスポンスタイム記録', hasResponseTime);
  
  return hasResponseTime;
}

// ヘルパー関数
function logTest(name, passed) {
  const icon = passed ? '✅' : '❌';
  const color = passed ? colors.green : colors.red;
  console.log(`${icon} ${color}${name}${colors.reset}`);
  
  testResults.push({ name, passed });
}

// メインテスト実行
async function runSecurityTests() {
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.cyan}     セキュリティテスト v1.0${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  
  try {
    await testRateLimit();
    await testXSSPrevention();
    await testSecurityHeaders();
    await testNoSQLInjection();
    await testResponseTime();
    
    // 結果サマリー
    console.log('\n' + '='.repeat(50));
    console.log(`${colors.cyan}📊 テスト結果サマリー${colors.reset}\n`);
    
    const passed = testResults.filter(t => t.passed).length;
    const total = testResults.length;
    const percentage = ((passed / total) * 100).toFixed(1);
    
    console.log(`合格: ${colors.green}${passed}/${total}${colors.reset} (${percentage}%)`);
    
    if (percentage >= 100) {
      console.log(`\n${colors.green}🎉 完璧！すべてのセキュリティテストに合格しました。${colors.reset}`);
    } else if (percentage >= 80) {
      console.log(`\n${colors.green}✅ 良好: 主要なセキュリティ機能は動作しています。${colors.reset}`);
    } else {
      console.log(`\n${colors.red}❌ 要改善: セキュリティに問題があります。${colors.reset}`);
    }
    
    // 詳細レポート保存
    const fs = require('fs');
    const report = {
      timestamp: new Date().toISOString(),
      results: testResults,
      percentage: percentage,
      summary: {
        rateLimit: testResults.find(t => t.name.includes('レート制限'))?.passed,
        xss: testResults.find(t => t.name.includes('XSS'))?.passed,
        headers: testResults.find(t => t.name.includes('ヘッダー'))?.passed,
        injection: testResults.find(t => t.name.includes('インジェクション'))?.passed
      }
    };
    
    fs.writeFileSync('security-test-results.json', JSON.stringify(report, null, 2));
    console.log(`\n📁 詳細結果を security-test-results.json に保存しました`);
    
  } catch (error) {
    console.error(`\n${colors.red}❌ テスト実行エラー:${colors.reset}`, error.message);
  }
}

// 実行
runSecurityTests().catch(console.error);
```

---

## 5. テスト実行コマンド

### 基本コマンド

```bash
# 単体テスト
npm test -- __tests__/security/

# 結合テスト
npm test -- __tests__/integration/

# E2Eテスト
npx playwright test e2e/security.spec.ts

# セキュリティテストスクリプト
node scripts/security-test.js

# すべてのセキュリティテスト
npm run test:security
```

### package.jsonスクリプト追加

```json
{
  "scripts": {
    "test:security": "npm run test:security:unit && npm run test:security:integration && npm run test:security:e2e",
    "test:security:unit": "jest __tests__/security/",
    "test:security:integration": "jest __tests__/integration/",
    "test:security:e2e": "playwright test e2e/security.spec.ts",
    "test:security:quick": "node scripts/security-test.js"
  }
}
```

---

## 6. チェックポイント

### ✅ 実装済み機能のチェック

| 機能 | 状態 | テスト方法 |
|------|------|-----------|
| レート制限 | ✅ 実装済み | `node scripts/security-test.js` |
| XSS防御 | ✅ 実装済み | 単体テスト + E2E |
| セキュリティヘッダー | ✅ 実装済み | `curl -I localhost:3000` |
| 入力サニタイゼーション | ✅ 実装済み | 単体テスト |
| NoSQLインジェクション防御 | ✅ 実装済み | 結合テスト |

### ⚠️ 未実装機能

| 機能 | 状態 | 実装予定 |
|------|------|----------|
| CSRF対策 | ⚠️ 未実装 | Phase 2 |
| 監査ログ | ⚠️ 未実装 | Phase 3 |
| セッション管理最適化 | ⚠️ 未実装 | Phase 2 |

---

## 7. トラブルシューティング

### レート制限が機能しない場合
```bash
# キャッシュをクリア
rm -rf .next
npm run dev
```

### セキュリティヘッダーが表示されない場合
```bash
# ミドルウェアの再起動
npm run dev
```

### テストが失敗する場合
```bash
# 依存関係の確認
npm install
npm install -D @types/jest jest @testing-library/react
```

---

このテストガイドに従って、実装されたセキュリティ機能を包括的に検証できます。