import rateLimit from 'express-rate-limit';
import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

/**
 * レート制限設定
 * DDoS攻撃やブルートフォース攻撃から保護
 */

// 一般的なAPI用のレート制限
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100, // 最大100リクエスト
  message: 'リクエスト数が多すぎます。しばらく待ってから再試行してください。',
  standardHeaders: true, // `RateLimit-*` ヘッダーを含める
  legacyHeaders: false, // `X-RateLimit-*` ヘッダーを無効化
  handler: (req, res) => {
    res.status(429).json({
      error: 'リクエスト数が多すぎます',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
});

// 認証エンドポイント用の厳しいレート制限
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 5, // 最大5リクエスト
  message: '認証試行回数が多すぎます。',
  skipSuccessfulRequests: true, // 成功したリクエストはカウントしない
});

// 投稿作成用のレート制限
export const createPostLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1時間
  max: 30, // 最大30投稿
  message: '投稿数が制限を超えました。1時間後に再試行してください。',
  keyGenerator: (req) => {
    // ユーザーIDベースでレート制限
    return req.headers.get('x-user-id') || req.ip || 'anonymous';
  },
});

// Next.js App Router用のレート制限ミドルウェア
export async function withRateLimit(
  request: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>,
  limiterConfig?: {
    windowMs?: number;
    max?: number;
    message?: string;
  }
): Promise<NextResponse> {
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  // シンプルなメモリベースのレート制限実装
  const key = `${ip}:${request.nextUrl.pathname}`;
  const now = Date.now();
  const windowMs = limiterConfig?.windowMs || 15 * 60 * 1000;
  const max = limiterConfig?.max || 100;
  
  // TODO: 本番環境ではRedisを使用
  const requests = global.rateLimitStore?.get(key) || [];
  const recentRequests = requests.filter((time: number) => now - time < windowMs);
  
  if (recentRequests.length >= max) {
    return NextResponse.json(
      { 
        error: limiterConfig?.message || 'リクエスト数が多すぎます',
        retryAfter: Math.ceil(windowMs / 1000)
      },
      { 
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(windowMs / 1000)),
          'X-RateLimit-Limit': String(max),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(now + windowMs).toISOString()
        }
      }
    );
  }
  
  // リクエストを記録
  recentRequests.push(now);
  if (!global.rateLimitStore) {
    global.rateLimitStore = new Map();
  }
  global.rateLimitStore.set(key, recentRequests);
  
  // ハンドラーを実行
  const response = await handler(request);
  
  // レート制限ヘッダーを追加
  response.headers.set('X-RateLimit-Limit', String(max));
  response.headers.set('X-RateLimit-Remaining', String(max - recentRequests.length));
  response.headers.set('X-RateLimit-Reset', new Date(now + windowMs).toISOString());
  
  return response;
}

// グローバル型定義
declare global {
  var rateLimitStore: Map<string, number[]> | undefined;
}