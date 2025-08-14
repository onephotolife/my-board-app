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