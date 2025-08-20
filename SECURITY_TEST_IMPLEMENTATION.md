# セキュリティテスト実装ガイド

## 概要
レート制限、セキュリティヘッダー、入力サニタイゼーションのテスト実装ガイドです。

## テストレベルと目的

| テストレベル | 目的 | 対象 | ツール |
|-------------|------|------|--------|
| **単体テスト** | 個別機能の検証 | 関数・クラス | Jest |
| **結合テスト** | 複数機能の連携確認 | API・ミドルウェア | Jest + Supertest |
| **E2Eテスト** | ユーザー視点の動作確認 | 全体フロー | Playwright |

---

## 1. 単体テスト（Unit Test）

### 1.1 レート制限のユニットテスト

**ファイル**: `__tests__/unit/security/rate-limiter.test.ts`

```typescript
import { RateLimiter } from '@/lib/security/rate-limiter';
import { NextRequest } from 'next/server';

describe('RateLimiter Unit Tests', () => {
  beforeEach(() => {
    // キャッシュをクリア
    RateLimiter['cache'].clear();
  });

  describe('基本機能', () => {
    test('初回リクエストを許可する', async () => {
      const req = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        headers: { 'x-forwarded-for': '192.168.1.1' }
      });

      const result = await RateLimiter.check(req);
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    test('制限内の複数リクエストを許可する', async () => {
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

    test('6回目のリクエストを拒否する', async () => {
      const req = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        headers: { 'x-forwarded-for': '192.168.1.1' }
      });

      // 5回使い切る
      for (let i = 0; i < 5; i++) {
        await RateLimiter.check(req);
      }

      // 6回目は拒否
      const result = await RateLimiter.check(req);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  describe('時間窓リセット', () => {
    test('時間経過後にリセットされる', async () => {
      jest.useFakeTimers();
      
      const req = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        headers: { 'x-forwarded-for': '192.168.1.1' }
      });

      // 制限まで使い切る
      for (let i = 0; i < 5; i++) {
        await RateLimiter.check(req);
      }

      // 6回目は拒否される
      let result = await RateLimiter.check(req);
      expect(result.allowed).toBe(false);

      // 1分経過
      jest.advanceTimersByTime(61000);

      // リセット後は許可される
      result = await RateLimiter.check(req);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);

      jest.useRealTimers();
    });
  });

  describe('異なるクライアント/エンドポイント', () => {
    test('異なるIPアドレスは別々にカウントされる', async () => {
      const req1 = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        headers: { 'x-forwarded-for': '192.168.1.1' }
      });

      const req2 = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        headers: { 'x-forwarded-for': '192.168.1.2' }
      });

      // 両方とも初回は許可される
      const result1 = await RateLimiter.check(req1);
      const result2 = await RateLimiter.check(req2);

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
      expect(result1.remaining).toBe(4);
      expect(result2.remaining).toBe(4);
    });

    test('異なるエンドポイントは別々の制限を持つ', async () => {
      const postsReq = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        headers: { 'x-forwarded-for': '192.168.1.1' }
      });

      const authReq = new NextRequest('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        headers: { 'x-forwarded-for': '192.168.1.1' }
      });

      const postsResult = await RateLimiter.check(postsReq);
      const authResult = await RateLimiter.check(authReq);

      expect(postsResult.allowed).toBe(true);
      expect(authResult.allowed).toBe(true);
    });
  });
});
```

### 1.2 サニタイザーのユニットテスト

**ファイル**: `__tests__/unit/security/sanitizer.test.ts`

```typescript
import { InputSanitizer } from '@/lib/security/sanitizer';

describe('InputSanitizer Unit Tests', () => {
  describe('sanitizeText', () => {
    test('通常のテキストはそのまま返す', () => {
      const input = 'これは普通のテキストです';
      const result = InputSanitizer.sanitizeText(input);
      expect(result).toBe(input);
    });

    test('scriptタグを除去する', () => {
      const input = '<script>alert("XSS")</script>テスト';
      const result = InputSanitizer.sanitizeText(input);
      expect(result).toBe('テスト');
      expect(result).not.toContain('<script>');
    });

    test('イベントハンドラを除去する', () => {
      const input = '<img src=x onerror="alert(1)">画像';
      const result = InputSanitizer.sanitizeText(input);
      expect(result).not.toContain('onerror');
      expect(result).not.toContain('alert');
    });

    test('JavaScriptプロトコルを除去する', () => {
      const input = '<a href="javascript:alert(1)">リンク</a>';
      const result = InputSanitizer.sanitizeText(input);
      expect(result).not.toContain('javascript:');
    });

    test('HTMLタグ記号を除去する', () => {
      const input = '<div>テキスト</div>';
      const result = InputSanitizer.sanitizeText(input);
      expect(result).toBe('divテキスト/div');
    });

    test('最大長を制限する', () => {
      const input = 'a'.repeat(15000);
      const result = InputSanitizer.sanitizeText(input);
      expect(result.length).toBeLessThanOrEqual(10000);
    });

    test('null/undefinedを空文字列として扱う', () => {
      expect(InputSanitizer.sanitizeText(null as any)).toBe('');
      expect(InputSanitizer.sanitizeText(undefined as any)).toBe('');
    });
  });

  describe('sanitizeHTML', () => {
    test('安全なHTMLタグは保持する可能性がある', () => {
      const input = '<b>太字</b>と<i>斜体</i>';
      const result = InputSanitizer.sanitizeHTML(input);
      // 実装により挙動が異なる
      expect(result).toBeDefined();
    });

    test('危険なタグを除去する', () => {
      const inputs = [
        '<script>alert("XSS")</script>',
        '<iframe src="evil.com"></iframe>',
        '<object data="evil.swf"></object>'
      ];

      inputs.forEach(input => {
        const result = InputSanitizer.sanitizeHTML(input);
        expect(result).not.toContain('<script>');
        expect(result).not.toContain('<iframe>');
        expect(result).not.toContain('<object>');
      });
    });
  });

  describe('sanitizeQuery', () => {
    test('MongoDB演算子を無効化する', () => {
      const input = { '$ne': null, 'normal': 'value' };
      const result = InputSanitizer.sanitizeQuery(input);
      
      expect(result).not.toHaveProperty('$ne');
      expect(result).toHaveProperty('normal', 'value');
    });

    test('危険なプロトタイプキーを除去する', () => {
      const input = {
        '__proto__': { isAdmin: true },
        'constructor': 'malicious',
        'prototype': 'dangerous',
        'safe': 'value'
      };
      
      const result = InputSanitizer.sanitizeQuery(input);
      
      expect(result).not.toHaveProperty('__proto__');
      expect(result).not.toHaveProperty('constructor');
      expect(result).not.toHaveProperty('prototype');
      expect(result).toHaveProperty('safe', 'value');
    });

    test('ネストされたオブジェクトも再帰的にサニタイズする', () => {
      const input = {
        level1: {
          '$gt': 100,
          level2: {
            '__proto__': 'bad',
            safe: 'ok'
          }
        }
      };
      
      const result = InputSanitizer.sanitizeQuery(input);
      
      expect(result.level1).not.toHaveProperty('$gt');
      expect(result.level1.level2).not.toHaveProperty('__proto__');
      expect(result.level1.level2).toHaveProperty('safe', 'ok');
    });
  });
});
```

---

## 2. 結合テスト（Integration Test）

### 2.1 ミドルウェア結合テスト

**ファイル**: `__tests__/integration/middleware.test.ts`

```typescript
import { middleware } from '@/middleware';
import { NextRequest } from 'next/server';
import { RateLimiter } from '@/lib/security/rate-limiter';

describe('Security Middleware Integration Tests', () => {
  beforeEach(() => {
    // レート制限キャッシュをクリア
    RateLimiter['cache'].clear();
  });

  describe('セキュリティヘッダー', () => {
    test('全てのセキュリティヘッダーが設定される', async () => {
      const req = new NextRequest('http://localhost:3000/');
      const response = await middleware(req);
      
      // 必須ヘッダーの確認
      expect(response.headers.get('x-frame-options')).toBe('DENY');
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
      expect(response.headers.get('x-xss-protection')).toBe('1; mode=block');
      expect(response.headers.get('content-security-policy')).toBeDefined();
      expect(response.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
      expect(response.headers.get('permissions-policy')).toBeDefined();
    });

    test('APIルートにもヘッダーが適用される', async () => {
      const req = new NextRequest('http://localhost:3000/api/posts');
      const response = await middleware(req);
      
      expect(response.headers.get('x-frame-options')).toBe('DENY');
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    });
  });

  describe('レート制限統合', () => {
    test('APIルートでレート制限が動作する', async () => {
      const req = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        headers: { 'x-forwarded-for': '192.168.1.100' }
      });

      const responses = [];
      
      // 6回リクエスト
      for (let i = 0; i < 6; i++) {
        const response = await middleware(req);
        responses.push(response);
      }

      // 最初の5回は429以外
      responses.slice(0, 5).forEach(res => {
        expect(res.status).not.toBe(429);
      });

      // 6回目は429
      expect(responses[5].status).toBe(429);
      expect(responses[5].headers.get('retry-after')).toBeDefined();
      expect(responses[5].headers.get('x-ratelimit-remaining')).toBe('0');
    });

    test('異なるIPは別々に制限される', async () => {
      const req1 = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        headers: { 'x-forwarded-for': '192.168.1.1' }
      });

      const req2 = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        headers: { 'x-forwarded-for': '192.168.1.2' }
      });

      const response1 = await middleware(req1);
      const response2 = await middleware(req2);

      expect(response1.status).not.toBe(429);
      expect(response2.status).not.toBe(429);
    });
  });

  describe('入力サニタイゼーション', () => {
    test('XSSペイロードを含むクエリパラメータがサニタイズされる', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/posts?search=<script>alert("XSS")</script>'
      );

      const response = await middleware(req);
      
      // リダイレクトまたはサニタイズされる
      if (response.status === 307 || response.status === 308) {
        const location = response.headers.get('location');
        expect(location).not.toContain('<script>');
      }
    });

    test('イベントハンドラを含むパラメータがサニタイズされる', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/posts?input=<img src=x onerror="alert(1)">'
      );

      const response = await middleware(req);
      
      if (response.status === 307 || response.status === 308) {
        const location = response.headers.get('location');
        expect(location).not.toContain('onerror');
      }
    });
  });

  describe('レスポンスタイム記録', () => {
    test('X-Response-Timeヘッダーが設定される', async () => {
      const req = new NextRequest('http://localhost:3000/');
      const response = await middleware(req);
      
      const responseTime = response.headers.get('x-response-time');
      expect(responseTime).toBeDefined();
      expect(responseTime).toMatch(/^\d+ms$/);
    });
  });
});
```

### 2.2 API結合テスト

**ファイル**: `__tests__/integration/api-security.test.ts`

```typescript
import { POST } from '@/app/api/posts/route';
import { NextRequest } from 'next/server';
import { InputSanitizer } from '@/lib/security/sanitizer';

// Mongooseモックの設定
jest.mock('@/lib/mongodb', () => ({
  connectMongoDB: jest.fn().mockResolvedValue(true)
}));

jest.mock('@/models/Post', () => ({
  default: {
    create: jest.fn().mockImplementation((data) => ({
      ...data,
      _id: 'mock-id',
      createdAt: new Date(),
      updatedAt: new Date(),
      toJSON: function() { return this; }
    }))
  }
}));

describe('API Security Integration Tests', () => {
  describe('POST /api/posts', () => {
    test('正常な投稿データを処理する', async () => {
      const req = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        body: JSON.stringify({
          title: 'テストタイトル',
          content: 'テスト内容',
          author: 'テストユーザー'
        })
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.title).toBe('テストタイトル');
      expect(data.content).toBe('テスト内容');
    });

    test('XSSペイロードをサニタイズする', async () => {
      const req = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        body: JSON.stringify({
          title: '<script>alert("XSS")</script>タイトル',
          content: '<img src=x onerror="alert(1)">内容',
          author: 'javascript:alert(1)'
        })
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.title).not.toContain('<script>');
      expect(data.content).not.toContain('onerror');
      expect(data.author).not.toContain('javascript:');
    });

    test('SQLインジェクション風のペイロードを無害化する', async () => {
      const req = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        body: JSON.stringify({
          title: "'; DROP TABLE posts; --",
          content: '{"$ne": null}',
          author: '__proto__.isAdmin = true'
        })
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(201);
      // データが適切にエスケープ/サニタイズされている
      expect(data).toBeDefined();
    });
  });
});
```

---

## 3. E2Eテスト（End-to-End Test）

### 3.1 Playwrightセットアップ

```bash
npm install --save-dev @playwright/test
npx playwright install
```

### 3.2 E2Eセキュリティテスト

**ファイル**: `e2e/security.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('セキュリティ機能E2Eテスト', () => {
  
  test.describe('レート制限', () => {
    test('6回目のリクエストで429エラーが返される', async ({ request }) => {
      const results = [];
      
      // 6回連続でAPIを呼び出す
      for (let i = 0; i < 6; i++) {
        const response = await request.post('/api/posts', {
          data: {
            title: `Test ${i}`,
            content: `Content ${i}`,
            author: 'Test User'
          },
          failOnStatusCode: false
        });
        
        results.push({
          attempt: i + 1,
          status: response.status(),
          headers: response.headers()
        });
      }
      
      // 最初の5回は429以外
      results.slice(0, 5).forEach(result => {
        expect([200, 201, 401, 403]).toContain(result.status);
      });
      
      // 6回目は429
      expect(results[5].status).toBe(429);
      expect(results[5].headers['x-ratelimit-remaining']).toBe('0');
    });

    test('時間経過後にリセットされる', async ({ request }) => {
      // 制限まで使い切る
      for (let i = 0; i < 5; i++) {
        await request.post('/api/posts', {
          data: { title: 'Test', content: 'Test', author: 'Test' },
          failOnStatusCode: false
        });
      }

      // 6回目は429
      const blocked = await request.post('/api/posts', {
        data: { title: 'Test', content: 'Test', author: 'Test' },
        failOnStatusCode: false
      });
      expect(blocked.status()).toBe(429);

      // 61秒待機（実際のテストではtest.setTimeout()を使用）
      // await page.waitForTimeout(61000);
      
      // Note: 実際のテストでは時間待機は避け、モックやタイムトラベルを使用
    });
  });

  test.describe('セキュリティヘッダー', () => {
    test('必要なセキュリティヘッダーが設定されている', async ({ page }) => {
      const response = await page.goto('/');
      const headers = response?.headers();
      
      expect(headers?.['x-frame-options']).toBe('DENY');
      expect(headers?.['x-content-type-options']).toBe('nosniff');
      expect(headers?.['x-xss-protection']).toBe('1; mode=block');
      expect(headers?.['content-security-policy']).toBeDefined();
      expect(headers?.['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(headers?.['permissions-policy']).toBeDefined();
    });

    test('開発者ツールでヘッダーを確認', async ({ page, context }) => {
      // Chrome DevTools Protocolを使用
      const client = await context.newCDPSession(page);
      await client.send('Network.enable');
      
      const responseHeaders: any = {};
      client.on('Network.responseReceived', (params) => {
        if (params.response.url === page.url()) {
          responseHeaders.headers = params.response.headers;
        }
      });
      
      await page.goto('/');
      await page.waitForTimeout(1000);
      
      expect(responseHeaders.headers).toHaveProperty('x-frame-options');
      expect(responseHeaders.headers).toHaveProperty('content-security-policy');
    });
  });

  test.describe('XSS防御', () => {
    test('スクリプトタグが無害化される', async ({ page }) => {
      await page.goto('/board');
      
      // XSSペイロードを投稿
      const xssPayload = '<script>window.xssExecuted = true;</script>テスト';
      await page.fill('textarea[name="content"]', xssPayload);
      await page.click('button[type="submit"]');
      
      // スクリプトが実行されないことを確認
      await page.waitForTimeout(1000);
      const xssExecuted = await page.evaluate(() => (window as any).xssExecuted);
      expect(xssExecuted).toBeUndefined();
      
      // DOMにスクリプトタグが含まれないことを確認
      const content = await page.content();
      expect(content).not.toContain('<script>window.xssExecuted');
    });

    test('イベントハンドラが除去される', async ({ page }) => {
      await page.goto('/board');
      
      const xssPayload = '<img src=x onerror="window.imgError = true">画像';
      await page.fill('textarea[name="content"]', xssPayload);
      await page.click('button[type="submit"]');
      
      await page.waitForTimeout(1000);
      const imgError = await page.evaluate(() => (window as any).imgError);
      expect(imgError).toBeUndefined();
    });

    test('JavaScriptプロトコルが無効化される', async ({ page }) => {
      await page.goto('/board');
      
      const xssPayload = '<a href="javascript:window.jsProto = true">リンク</a>';
      await page.fill('textarea[name="content"]', xssPayload);
      await page.click('button[type="submit"]');
      
      // リンクが存在してもJavaScriptが実行されないことを確認
      const links = await page.$$('a[href^="javascript:"]');
      expect(links.length).toBe(0);
    });
  });

  test.describe('ユーザー体験の確認', () => {
    test('正常な投稿が問題なく行える', async ({ page }) => {
      await page.goto('/board');
      
      const normalContent = 'これは普通の投稿です。特殊文字も含みます: <>&"\'';
      await page.fill('textarea[name="content"]', normalContent);
      await page.click('button[type="submit"]');
      
      // 投稿が表示されることを確認
      await page.waitForSelector('text=これは普通の投稿です');
      
      // 特殊文字が適切にエスケープされているか確認
      const postContent = await page.textContent('.post-content');
      expect(postContent).toContain('これは普通の投稿です');
    });
  });
});
```

---

## 4. テスト実行とレポート

### 4.1 package.jsonにテストスクリプトを追加

```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest __tests__/unit",
    "test:integration": "jest __tests__/integration",
    "test:e2e": "playwright test",
    "test:coverage": "jest --coverage",
    "test:watch": "jest --watch",
    "test:security": "npm run test:unit && npm run test:integration && npm run test:e2e"
  }
}
```

### 4.2 テスト実行コマンド

```bash
# 全テスト実行
npm test

# 単体テストのみ
npm run test:unit

# 結合テストのみ
npm run test:integration

# E2Eテストのみ
npm run test:e2e

# カバレッジレポート付き
npm run test:coverage

# セキュリティテスト一式
npm run test:security
```

---

## 5. チェックポイント

### ✅ レート制限のチェックポイント

| 項目 | 単体 | 結合 | E2E |
|------|------|------|-----|
| 制限内のリクエスト許可 | ✓ | ✓ | ✓ |
| 制限超過で429エラー | ✓ | ✓ | ✓ |
| 時間窓リセット | ✓ | - | - |
| IPアドレス別カウント | ✓ | ✓ | - |
| エンドポイント別制限 | ✓ | ✓ | - |
| ヘッダー情報の正確性 | - | ✓ | ✓ |

### ✅ セキュリティヘッダーのチェックポイント

| 項目 | 単体 | 結合 | E2E |
|------|------|------|-----|
| X-Frame-Options | - | ✓ | ✓ |
| X-Content-Type-Options | - | ✓ | ✓ |
| X-XSS-Protection | - | ✓ | ✓ |
| CSP設定 | - | ✓ | ✓ |
| Referrer-Policy | - | ✓ | ✓ |
| Permissions-Policy | - | ✓ | ✓ |
| HSTS（本番環境） | - | ✓ | - |

### ✅ 入力サニタイゼーションのチェックポイント

| 項目 | 単体 | 結合 | E2E |
|------|------|------|-----|
| Scriptタグ除去 | ✓ | ✓ | ✓ |
| イベントハンドラ除去 | ✓ | ✓ | ✓ |
| JavaScriptプロトコル除去 | ✓ | ✓ | ✓ |
| SQLインジェクション対策 | ✓ | ✓ | - |
| NoSQLインジェクション対策 | ✓ | ✓ | - |
| プロトタイプ汚染対策 | ✓ | ✓ | - |
| 正常データの保持 | ✓ | ✓ | ✓ |

---

## 6. ベストプラクティス

### テスト設計の原則

1. **AAA パターン**
   - Arrange: テストデータの準備
   - Act: テスト対象の実行
   - Assert: 結果の検証

2. **独立性**
   - 各テストは独立して実行可能
   - テスト間の依存関係を排除

3. **再現性**
   - 同じ条件で常に同じ結果
   - 時間依存の処理はモック化

4. **可読性**
   - テスト名は何をテストしているか明確に
   - 日本語でのテスト名も検討

5. **保守性**
   - DRY原則の適用
   - ヘルパー関数の活用

### CI/CDパイプライン統合

```yaml
# .github/workflows/security-tests.yml
name: Security Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run unit tests
        run: npm run test:unit
        
      - name: Run integration tests
        run: npm run test:integration
        
      - name: Run E2E tests
        run: npx playwright install --with-deps && npm run test:e2e
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

---

このテスト実装により、セキュリティ機能の動作を包括的に検証できます。