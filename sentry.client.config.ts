/**
 * Sentry クライアントサイド設定
 * This file configures the initialization of Sentry on the client side.
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

// Sentryの初期化
Sentry.init({
  dsn: SENTRY_DSN,
  
  // 環境設定
  environment: process.env.NODE_ENV,
  enabled: IS_PRODUCTION && !!SENTRY_DSN,
  
  // パフォーマンスモニタリング
  tracesSampleRate: IS_PRODUCTION ? 0.1 : 1.0, // 本番環境では10%、開発環境では100%
  
  // セッションリプレイ
  replaysSessionSampleRate: IS_PRODUCTION ? 0.1 : 0, // 本番環境では10%のセッション
  replaysOnErrorSampleRate: 1.0, // エラー時は100%記録
  
  // デバッグ設定
  debug: IS_DEVELOPMENT,
  
  // 無視するエラー
  ignoreErrors: [
    // ブラウザ拡張機能関連
    'top.GLOBALS',
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    
    // ネットワークエラー
    'NetworkError',
    'Network request failed',
    'Failed to fetch',
    
    // キャンセルされた操作
    'AbortError',
    'The operation was aborted',
    
    // 古いブラウザのエラー
    'Object.prototype.hasOwnProperty.call',
    'Cannot read property',
    'Cannot read properties of undefined',
    
    // サードパーティスクリプト
    /^chrome-extension:\/\//,
    /^moz-extension:\/\//,
  ],
  
  // 無視するトランザクション
  ignoreTransactions: [
    // ヘルスチェック
    '/api/health',
    '/api/metrics',
    
    // 静的ファイル
    '/_next/static',
    '/_next/image',
    '/favicon.ico',
  ],
  
  // データスクラビング（機密情報の除去）
  beforeSend(event, hint) {
    // 本番環境でのみ適用
    if (!IS_PRODUCTION) {
      return event;
    }
    
    // パスワードフィールドを除去
    if (event.request?.data) {
      const data = event.request.data;
      if (typeof data === 'object') {
        delete data.password;
        delete data.confirmPassword;
        delete data.currentPassword;
        delete data.newPassword;
      }
    }
    
    // Cookieを除去
    if (event.request?.cookies) {
      delete event.request.cookies;
    }
    
    // Authorizationヘッダーを除去
    if (event.request?.headers) {
      delete event.request.headers['Authorization'];
      delete event.request.headers['authorization'];
      delete event.request.headers['Cookie'];
      delete event.request.headers['cookie'];
    }
    
    // ユーザーのメールアドレスをハッシュ化
    if (event.user?.email) {
      event.user.email = '[REDACTED]';
    }
    
    // IPアドレスを部分的に隠す
    if (event.user?.ip_address) {
      const ip = event.user.ip_address;
      const parts = ip.split('.');
      if (parts.length === 4) {
        event.user.ip_address = `${parts[0]}.${parts[1]}.xxx.xxx`;
      }
    }
    
    // 特定のエラーメッセージをフィルタリング
    const error = hint.originalException;
    if (error && typeof error === 'object' && 'message' in error) {
      const message = error.message as string;
      
      // 404エラーは送信しない
      if (message.includes('404') || message.includes('Not found')) {
        return null;
      }
      
      // レート制限エラーは送信しない
      if (message.includes('429') || message.includes('Too many requests')) {
        return null;
      }
    }
    
    return event;
  },
  
  // ブレッドクラムのカスタマイズ
  beforeBreadcrumb(breadcrumb, hint) {
    // コンソールログは開発環境のみ
    if (breadcrumb.category === 'console' && IS_PRODUCTION) {
      return null;
    }
    
    // XHRリクエストのURLをサニタイズ
    if (breadcrumb.category === 'xhr' || breadcrumb.category === 'fetch') {
      if (breadcrumb.data?.url) {
        // APIキーを含むURLを隠す
        breadcrumb.data.url = breadcrumb.data.url.replace(
          /api_key=[^&]*/g,
          'api_key=[REDACTED]'
        );
      }
    }
    
    return breadcrumb;
  },
  
  // インテグレーション設定
  integrations: [
    // セッションリプレイ
    Sentry.replayIntegration({
      maskAllText: true, // すべてのテキストをマスク
      maskAllInputs: true, // すべての入力をマスク
      blockAllMedia: true, // メディアをブロック
      
      // プライバシー設定
      privacy: {
        maskTextContent: true,
        maskAllInputs: true,
        maskTextSelector: '.sensitive, [data-sensitive]',
      },
      
      // ネットワーク記録設定
      networkDetailAllowUrls: [
        window.location.origin,
      ],
      networkCaptureBodies: false, // リクエストボディは記録しない
      networkRequestHeaders: false, // リクエストヘッダーは記録しない
      networkResponseHeaders: false, // レスポンスヘッダーは記録しない
    }),
    
    // ブラウザトレーシング
    Sentry.browserTracingIntegration(),
    
    // HTTPコンテキスト
    Sentry.httpContextIntegration(),
  ],
  
  // トランスポート設定
  transportOptions: {
    // リトライ設定
    fetchOptions: {
      keepalive: true,
    },
  },
  
  // リリース情報
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
  
  // その他の設定
  autoSessionTracking: true, // セッション自動追跡
  normalizeDepth: 10, // オブジェクトの正規化深度
  maxBreadcrumbs: 50, // 最大ブレッドクラム数
  attachStacktrace: true, // スタックトレースを常に添付
  sampleRate: 1.0, // エラーイベントのサンプルレート
});

// カスタムタグの設定
Sentry.setTag('app.version', process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0');
Sentry.setTag('app.environment', process.env.NODE_ENV);

// 開発環境でのデバッグ情報
if (IS_DEVELOPMENT) {
  console.log('🔍 Sentry initialized for development environment');
}