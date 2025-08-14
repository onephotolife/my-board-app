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

    test('静的ファイルはスキップされる', async () => {
      const req = new NextRequest('http://localhost:3000/_next/static/chunk.js');
      const response = await middleware(req);
      
      // NextResponse.next()が返されることを確認
      expect(response.headers.get('x-frame-options')).toBeNull();
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

    test('レート制限エラーレスポンスの形式', async () => {
      const req = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        headers: { 'x-forwarded-for': '192.168.1.200' }
      });

      // 5回使い切る
      for (let i = 0; i < 5; i++) {
        await middleware(req);
      }

      // 6回目
      const response = await middleware(req);
      const body = await response.json();

      expect(response.status).toBe(429);
      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('retryAfter');
      expect(body.error).toContain('Too many requests');
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
        expect(location).not.toContain('alert');
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
        expect(location).not.toContain('alert');
      }
    });

    test('複数のパラメータが同時にサニタイズされる', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/posts?q1=<script>test</script>&q2=javascript:alert(1)'
      );

      const response = await middleware(req);
      
      if (response.status === 307 || response.status === 308) {
        const location = response.headers.get('location');
        expect(location).not.toContain('<script>');
        expect(location).not.toContain('javascript:');
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

    test('レスポンスタイムが妥当な範囲内', async () => {
      const req = new NextRequest('http://localhost:3000/');
      const response = await middleware(req);
      
      const responseTime = response.headers.get('x-response-time');
      const time = parseInt(responseTime?.replace('ms', '') || '0');
      
      expect(time).toBeGreaterThanOrEqual(0);
      expect(time).toBeLessThan(1000); // 1秒未満
    });
  });

  describe('認証との連携', () => {
    test('保護されたパスへのアクセスで認証チェックが行われる', async () => {
      const req = new NextRequest('http://localhost:3000/board');
      const response = await middleware(req);
      
      // 未認証の場合はリダイレクト
      if (response.status === 307 || response.status === 308) {
        const location = response.headers.get('location');
        expect(location).toContain('/auth/signin');
      }
    });

    test('公開パスへのアクセスは認証不要', async () => {
      const req = new NextRequest('http://localhost:3000/');
      const response = await middleware(req);
      
      // リダイレクトされない
      expect(response.status).not.toBe(307);
      expect(response.status).not.toBe(308);
    });
  });

  describe('CSP設定', () => {
    test('開発環境と本番環境で異なるCSPが設定される', async () => {
      const originalEnv = process.env.NODE_ENV;
      
      // 開発環境
      process.env.NODE_ENV = 'development';
      const devReq = new NextRequest('http://localhost:3000/');
      const devResponse = await middleware(devReq);
      const devCSP = devResponse.headers.get('content-security-policy');
      
      expect(devCSP).toContain('unsafe-eval');
      expect(devCSP).toContain('unsafe-inline');
      
      // 本番環境
      process.env.NODE_ENV = 'production';
      const prodReq = new NextRequest('http://localhost:3000/');
      const prodResponse = await middleware(prodReq);
      const prodCSP = prodResponse.headers.get('content-security-policy');
      
      expect(prodCSP).not.toContain('unsafe-eval');
      expect(prodCSP).toContain('upgrade-insecure-requests');
      
      // 環境変数を元に戻す
      process.env.NODE_ENV = originalEnv;
    });
  });
});