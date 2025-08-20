/**
 * CSP Nonce生成とヘッダー管理
 * Edge Runtime対応版
 */

// Edge Runtime対応のNonce生成
export function generateNonce(): string {
  // Edge RuntimeではWeb Crypto APIを使用
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
  
  // フォールバック（開発環境用）
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

// CSPヘッダー生成（Nonce対応）
export function getCSPWithNonce(nonce: string, isDev: boolean): string {
  const scriptSrc = isDev
    ? `'self' 'nonce-${nonce}' 'unsafe-inline' 'unsafe-eval'`
    : `'self' 'nonce-${nonce}' 'strict-dynamic'`;
  
  const styleSrc = `'self' 'nonce-${nonce}' 'unsafe-inline' https://fonts.googleapis.com`;
  
  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://api.github.com ws: wss:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
    "block-all-mixed-content",
    "report-uri /api/csp-report",
    "report-to csp-endpoint",
    "require-trusted-types-for 'script'",
    "trusted-types default"
  ];
  
  return directives.join('; ');
}

// Report-Toヘッダー生成
export function getReportToHeader(): string {
  return JSON.stringify({
    group: 'csp-endpoint',
    max_age: 86400,
    endpoints: [
      {
        url: '/api/csp-report'
      }
    ],
    include_subdomains: true
  });
}

// Nonceをheadersに追加するヘルパー
export function addNonceToHeaders(headers: Headers, nonce: string): void {
  headers.set('X-Nonce', nonce);
}

// スクリプトタグにNonce属性を追加
export function addNonceToScript(scriptContent: string, nonce: string): string {
  return scriptContent.replace(
    /<script/g,
    `<script nonce="${nonce}"`
  );
}

// スタイルタグにNonce属性を追加
export function addNonceToStyle(styleContent: string, nonce: string): string {
  return styleContent.replace(
    /<style/g,
    `<style nonce="${nonce}"`
  );
}