import { RateLimiter } from '@/lib/security/rate-limiter';

// NextRequestのモック
class MockNextRequest {
  url: string;
  method: string;
  headers: Map<string, string>;
  cookies: Map<string, { value: string }>;
  nextUrl: { pathname: string };

  constructor(url: string, init: any = {}) {
    this.url = url;
    this.method = init.method || 'GET';
    this.headers = new Map();
    this.cookies = new Map();
    this.nextUrl = { pathname: new URL(url).pathname };
    
    if (init.headers) {
      Object.entries(init.headers).forEach(([key, value]) => {
        this.headers.set(key.toLowerCase(), value as string);
      }) as any;
    }
  }
  
  get(name: string) {
    return this.cookies.get(name);
  }
}

describe('RateLimiter Unit Tests', () => {
  // 開発環境では制限が20倍になるため、テスト環境での実際の制限値を使用
  const POST_LIMIT = 30; // 本番は5だが、開発/テスト環境では30
  
  beforeEach(() => {
    // キャッシュをクリア
    RateLimiter['cache'].clear();
  });

  describe('基本機能', () => {
    test('初回リクエストを許可する', async () => {
      const req = new MockNextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        headers: { 'x-forwarded-for': '192.168.1.1' }
      }) as any;

      const result = await RateLimiter.check(req);
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(POST_LIMIT - 1);
    });

    test('制限内の複数リクエストを許可する', async () => {
      const req = new MockNextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        headers: { 'x-forwarded-for': '192.168.1.1' }
      }) as any;

      // 制限値まで使い切る前の5回をテスト
      for (let i = 0; i < 5; i++) {
        const result = await RateLimiter.check(req);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(POST_LIMIT - 1 - i);
      }
    });

    test('制限を超えたリクエストを拒否する', async () => {
      const req = new MockNextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        headers: { 'x-forwarded-for': '192.168.1.1' }
      }) as any;

      // 制限まで使い切る
      for (let i = 0; i < POST_LIMIT; i++) {
        await RateLimiter.check(req);
      }

      // 制限を超えたリクエストは拒否
      const result = await RateLimiter.check(req);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  describe('時間窓リセット', () => {
    test('時間経過後にリセットされる', async () => {
      jest.useFakeTimers();
      
      const req = new MockNextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        headers: { 'x-forwarded-for': '192.168.1.1' }
      }) as any;

      // 制限まで使い切る
      for (let i = 0; i < POST_LIMIT; i++) {
        await RateLimiter.check(req);
      }

      // 制限を超えたリクエストは拒否される
      let result = await RateLimiter.check(req);
      expect(result.allowed).toBe(false);

      // 1分経過
      jest.advanceTimersByTime(61000);

      // リセット後は許可される
      result = await RateLimiter.check(req);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(POST_LIMIT - 1);

      jest.useRealTimers();
    });
  });

  describe('異なるクライアント/エンドポイント', () => {
    test('異なるIPアドレスは別々にカウントされる', async () => {
      const req1 = new MockNextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        headers: { 'x-forwarded-for': '192.168.1.1' }
      }) as any;

      const req2 = new MockNextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        headers: { 'x-forwarded-for': '192.168.1.2' }
      }) as any;

      // 両方とも初回は許可される
      const result1 = await RateLimiter.check(req1);
      const result2 = await RateLimiter.check(req2);

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
      expect(result1.remaining).toBe(POST_LIMIT - 1);
      expect(result2.remaining).toBe(POST_LIMIT - 1);
    });

    test('異なるエンドポイントは別々の制限を持つ', async () => {
      const postsReq = new MockNextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        headers: { 'x-forwarded-for': '192.168.1.1' }
      }) as any;

      const authReq = new MockNextRequest('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        headers: { 'x-forwarded-for': '192.168.1.1' }
      }) as any;

      const postsResult = await RateLimiter.check(postsReq);
      const authResult = await RateLimiter.check(authReq);

      expect(postsResult.allowed).toBe(true);
      expect(authResult.allowed).toBe(true);
    });
  });
});