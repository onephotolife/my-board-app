/**
 * Sentry Edge Runtime設定
 * This file configures the initialization of Sentry for the Edge Runtime.
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

Sentry.init({
  dsn: SENTRY_DSN,
  
  // 環境設定
  environment: process.env.NODE_ENV,
  enabled: IS_PRODUCTION && !!SENTRY_DSN,
  
  // パフォーマンスモニタリング（Edge Runtimeでは控えめに）
  tracesSampleRate: IS_PRODUCTION ? 0.05 : 0.5, // 本番5%、開発50%
  
  // Edge Runtimeでは一部機能が制限される
  autoSessionTracking: false,
  
  // 無視するエラー
  ignoreErrors: [
    'EdgeRuntimeError',
    'FetchError',
    'AbortError',
  ],
  
  // 無視するトランザクション
  ignoreTransactions: [
    '/api/health',
    '/api/metrics',
  ],
  
  // データスクラビング
  beforeSend(event, hint) {
    if (!IS_PRODUCTION) {
      return event;
    }
    
    // ミドルウェアのエラーをフィルタリング
    const error = hint.originalException;
    if (error && typeof error === 'object' && 'message' in error) {
      const message = error.message as string;
      
      // レート制限は送信しない
      if (message.includes('Rate limit') || message.includes('Too many requests')) {
        return null;
      }
      
      // CSRF検証エラーは送信しない
      if (message.includes('CSRF') || message.includes('Invalid token')) {
        return null;
      }
    }
    
    // ヘッダー情報を除去
    if (event.request?.headers) {
      delete event.request.headers['cookie'];
      delete event.request.headers['authorization'];
    }
    
    return event;
  },
  
  // リリース情報
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  
  // Edge Runtime固有の設定
  transportOptions: {
    // Edge Runtimeではfetchを使用
    fetchOptions: {
      keepalive: false, // Edge Runtimeではサポートされない
    },
  },
  
  // タグ設定
  initialScope: {
    tags: {
      runtime: 'edge',
      environment: process.env.NODE_ENV,
    },
  },
});

// Edge Runtime向けカスタムタグ
Sentry.setTag('runtime.type', 'edge');
Sentry.setTag('edge.region', process.env.VERCEL_REGION || 'unknown');