import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { generateNonce, getCSPWithNonce, getReportToHeader } from "./lib/csp-nonce";

export default function middleware(req: NextRequest) {
  const response = NextResponse.next();
  
  // Nonce生成
  const nonce = generateNonce();
  
  // 開発環境判定
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // NonceベースのCSPヘッダー設定
  const cspHeader = getCSPWithNonce(nonce, isDevelopment);
  response.headers.set('Content-Security-Policy', cspHeader);
  
  // CSP違反レポート設定
  response.headers.set('Report-To', getReportToHeader());
  
  // Nonceをヘッダーに追加（サーバーコンポーネント用）
  response.headers.set('X-Nonce', nonce);
  
  // その他のセキュリティヘッダー
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  
  // HTTPS強制（本番環境）
  if (!isDevelopment && req.headers.get('x-forwarded-proto') !== 'https') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  // Feature Policy
  response.headers.set('Feature-Policy', "camera 'none'; microphone 'none'; geolocation 'none'");
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};