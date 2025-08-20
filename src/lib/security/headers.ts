/**
 * セキュリティヘッダー設定
 */

export interface SecurityHeaders {
  [key: string]: string;
}

/**
 * 本番環境用セキュリティヘッダー
 */
export const productionHeaders: SecurityHeaders = {
  // Content Security Policy - 厳格な設定
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://*.sentry.io https://vercel.live",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://www.google-analytics.com https://*.sentry.io https://vitals.vercel-insights.com wss://ws.vercel.live",
    "media-src 'self'",
    "object-src 'none'",
    "child-src 'self'",
    "frame-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "manifest-src 'self'",
    "upgrade-insecure-requests",
    "block-all-mixed-content"
  ].join('; '),
  
  // Strict Transport Security - HTTPS強制
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  
  // XSS保護
  'X-XSS-Protection': '1; mode=block',
  
  // コンテンツタイプのスニッフィング防止
  'X-Content-Type-Options': 'nosniff',
  
  // クリックジャッキング防止
  'X-Frame-Options': 'DENY',
  
  // リファラーポリシー
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // 権限ポリシー
  'Permissions-Policy': [
    'accelerometer=()',
    'camera=()',
    'geolocation=()',
    'gyroscope=()',
    'magnetometer=()',
    'microphone=()',
    'payment=()',
    'usb=()',
    'interest-cohort=()',
    'battery=()',
    'ambient-light-sensor=()',
    'autoplay=()',
    'display-capture=()',
    'document-domain=()',
    'encrypted-media=()',
    'execution-while-not-rendered=()',
    'execution-while-out-of-viewport=()',
    'fullscreen=(self)',
    'gamepad=()',
    'hid=()',
    'idle-detection=()',
    'local-fonts=()',
    'midi=()',
    'picture-in-picture=()',
    'publickey-credentials-get=()',
    'screen-wake-lock=()',
    'serial=()',
    'speaker-selection=()',
    'sync-xhr=()',
    'web-share=()',
    'xr-spatial-tracking=()'
  ].join(', '),
  
  // DNS プリフェッチ制御
  'X-DNS-Prefetch-Control': 'on',
  
  // ダウンロード時のファイル実行防止
  'X-Download-Options': 'noopen',
  
  // クロスドメインポリシー
  'X-Permitted-Cross-Domain-Policies': 'none',
  
  // Expect-CT（証明書の透明性）
  'Expect-CT': 'max-age=86400, enforce',
  
  // Cross-Origin関連
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

/**
 * 開発環境用セキュリティヘッダー（緩和版）
 */
export const developmentHeaders: SecurityHeaders = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' ws: wss: http: https:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '),
  
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

/**
 * API専用セキュリティヘッダー
 */
export const apiHeaders: SecurityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'no-referrer',
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  'Pragma': 'no-cache',
  'Expires': '0',
};

/**
 * 静的アセット用ヘッダー
 */
export const staticHeaders: SecurityHeaders = {
  'Cache-Control': 'public, max-age=31536000, immutable',
  'X-Content-Type-Options': 'nosniff',
};

/**
 * 環境に応じたヘッダーを取得
 */
export function getSecurityHeaders(isDevelopment = false): SecurityHeaders {
  return isDevelopment ? developmentHeaders : productionHeaders;
}

/**
 * NextResponseにセキュリティヘッダーを適用
 */
export function applySecurityHeaders(
  response: Response,
  headers: SecurityHeaders
): void {
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
}

/**
 * CSPレポート用のディレクティブを追加
 */
export function addCSPReportUri(csp: string, reportUri: string): string {
  return `${csp}; report-uri ${reportUri}; report-to csp-endpoint`;
}

/**
 * Nonceベースの動的CSP生成
 */
export function generateCSPWithNonce(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://www.googletagmanager.com https://*.sentry.io`,
    `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://www.google-analytics.com https://*.sentry.io",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests"
  ].join('; ');
}