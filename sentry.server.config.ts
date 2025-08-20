/**
 * Sentry サーバーサイド設定
 * This file configures the initialization of Sentry on the server side.
 */

import * as Sentry from '@sentry/nextjs';
import { ProfilingIntegration } from '@sentry/profiling-node';

const SENTRY_DSN = process.env.SENTRY_DSN;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

Sentry.init({
  dsn: SENTRY_DSN,
  
  // 環境設定
  environment: process.env.NODE_ENV,
  enabled: IS_PRODUCTION && !!SENTRY_DSN,
  
  // パフォーマンスモニタリング
  tracesSampleRate: IS_PRODUCTION ? 0.1 : 1.0,
  profilesSampleRate: IS_PRODUCTION ? 0.1 : 1.0, // プロファイリング
  
  // デバッグ設定
  debug: IS_DEVELOPMENT,
  
  // 無視するエラー
  ignoreErrors: [
    // システムエラー
    'ECONNREFUSED',
    'ECONNRESET',
    'ETIMEDOUT',
    'EPIPE',
    'ENOTFOUND',
    
    // MongoDB関連
    'MongoNetworkError',
    'MongoServerError',
    
    // 認証関連
    'UnauthorizedError',
    'JsonWebTokenError',
    'TokenExpiredError',
  ],
  
  // 無視するトランザクション
  ignoreTransactions: [
    '/api/health',
    '/api/metrics',
    '/api/cron/*',
    '/_next/static/*',
    '/_next/image/*',
  ],
  
  // データスクラビング
  beforeSend(event, hint) {
    if (!IS_PRODUCTION) {
      return event;
    }
    
    // エラーの種類によるフィルタリング
    const error = hint.originalException;
    
    // 404エラーは送信しない
    if (error && 'statusCode' in error && error.statusCode === 404) {
      return null;
    }
    
    // レート制限エラーは送信しない
    if (error && 'statusCode' in error && error.statusCode === 429) {
      return null;
    }
    
    // 環境変数を除去
    if (event.extra) {
      Object.keys(event.extra).forEach(key => {
        if (key.toUpperCase().includes('SECRET') || 
            key.toUpperCase().includes('PASSWORD') ||
            key.toUpperCase().includes('KEY') ||
            key.toUpperCase().includes('TOKEN')) {
          delete event.extra![key];
        }
      });
    }
    
    // スタックトレースから機密情報を除去
    if (event.exception?.values) {
      event.exception.values.forEach(exception => {
        if (exception.stacktrace?.frames) {
          exception.stacktrace.frames.forEach(frame => {
            // ローカルパスを除去
            if (frame.filename) {
              frame.filename = frame.filename.replace(
                /\/Users\/[^/]+/g,
                '/[USER]'
              );
            }
          });
        }
      });
    }
    
    // データベース接続文字列を除去
    if (event.contexts?.database) {
      delete event.contexts.database;
    }
    
    return event;
  },
  
  // インテグレーション
  integrations: [
    // HTTPインテグレーション
    Sentry.httpIntegration({
      tracing: true,
      breadcrumbs: true,
    }),
    
    // Prisma/Mongooseインテグレーション
    Sentry.mongoIntegration(),
    
    // Node.jsインテグレーション
    Sentry.nodeContextIntegration(),
    
    // プロファイリング（本番環境のみ）
    ...(IS_PRODUCTION ? [new ProfilingIntegration()] : []),
    
    // リクエストデータ
    Sentry.requestDataIntegration({
      include: {
        cookies: false, // Cookieは含めない
        data: true, // ボディデータは含める（サニタイズ済み）
        headers: false, // ヘッダーは含めない
        query_string: true, // クエリ文字列は含める
        url: true, // URLは含める
        user: {
          id: true,
          username: true,
          email: false, // メールは含めない
        },
      },
    }),
  ],
  
  // トランスポート設定
  transportOptions: {
    maxQueueSize: 100,
    flushTimeout: 2000,
  },
  
  // リリース情報
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  
  // その他の設定
  serverName: process.env.VERCEL_URL || 'unknown',
  maxBreadcrumbs: 50,
  attachStacktrace: true,
  sampleRate: 1.0,
  
  // 環境コンテキスト
  initialScope: {
    tags: {
      'node.version': process.version,
      'runtime': 'node',
      'server': 'vercel',
      'region': process.env.VERCEL_REGION || 'unknown',
    },
    user: {
      segment: 'server',
    },
    contexts: {
      runtime: {
        name: 'node',
        version: process.version,
      },
      app: {
        app_start_time: new Date().toISOString(),
        app_memory: process.memoryUsage().heapTotal,
      },
    },
  },
});

// カスタムタグの設定
Sentry.setTag('server.region', process.env.VERCEL_REGION || 'unknown');
Sentry.setTag('server.environment', process.env.VERCEL_ENV || 'unknown');

// 開発環境でのデバッグ情報
if (IS_DEVELOPMENT) {
  console.log('🔍 Sentry Server initialized for development environment');
}