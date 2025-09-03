/**
 * Playwright用最適化認証ヘルパー
 * NextAuth.js v4対応 - STRICT120準拠
 */

import { Page, BrowserContext } from '@playwright/test';

/**
 * Cookie パーサー
 */
function parseCookies(cookieHeaders: string | string[]): any[] {
  const cookies = [];
  const cookieStrings = Array.isArray(cookieHeaders) ? cookieHeaders : [cookieHeaders];
  
  cookieStrings.forEach(cookieString => {
    if (!cookieString) return;
    
    const parts = cookieString.split(';').map(p => p.trim());
    const [nameValue, ...attributes] = parts;
    
    if (!nameValue || !nameValue.includes('=')) return;
    
    const [name, value] = nameValue.split('=');
    const cookie: any = {
      name: name.trim(),
      value: value.trim(),
      domain: 'localhost',
      path: '/'
    };
    
    attributes.forEach(attr => {
      const [key, val] = attr.split('=');
      const attrKey = key.toLowerCase();
      
      if (attrKey === 'httponly') cookie.httpOnly = true;
      if (attrKey === 'secure') cookie.secure = true;
      if (attrKey === 'samesite') cookie.sameSite = val || 'Lax';
      if (attrKey === 'path') cookie.path = val;
      if (attrKey === 'domain') cookie.domain = val;
    });
    
    cookies.push(cookie);
  });
  
  return cookies;
}

/**
 * セッション待機オプション
 */
export interface SessionWaitOptions {
  maxAttempts?: number;
  intervalMs?: number;
  exponentialBackoff?: boolean;
  validateSession?: (session: any) => boolean;
}

/**
 * 最適化されたセッション待機メカニズム
 */
export async function waitForSessionOptimized(
  page: Page,
  options: SessionWaitOptions = {}
): Promise<any> {
  const {
    maxAttempts = 15,
    intervalMs = 500,
    exponentialBackoff = false,
    validateSession = (s) => !!(s?.user?.id)
  } = options;
  
  console.log('⏳ [OPTIMIZED] セッション確立を待機中...');
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const waitTime = exponentialBackoff 
      ? Math.min(intervalMs * Math.pow(1.2, attempt), 3000)
      : intervalMs;
    
    if (attempt > 0) {
      await page.waitForTimeout(waitTime);
    }
    
    try {
      // Method 1: Direct API call
      const sessionResponse = await page.request.get('http://localhost:3000/api/auth/session');
      const sessionData = await sessionResponse.json();
      
      if (validateSession(sessionData)) {
        console.log(`✅ [OPTIMIZED] セッション確立成功 (attempt ${attempt + 1})`);
        return sessionData;
      }
      
      // Method 2: Page context evaluation
      const sessionViaPage = await page.evaluate(async () => {
        const res = await fetch('/api/auth/session', {
          credentials: 'include',
          cache: 'no-cache',
          headers: {
            'Accept': 'application/json'
          }
        });
        return res.json();
      });
      
      if (validateSession(sessionViaPage)) {
        console.log(`✅ [OPTIMIZED] セッション確立成功 via page (attempt ${attempt + 1})`);
        return sessionViaPage;
      }
      
      console.log(`⏳ [OPTIMIZED] Attempt ${attempt + 1}/${maxAttempts}: Session not ready`);
      
    } catch (error: any) {
      console.error(`⚠️ [OPTIMIZED] Attempt ${attempt + 1} error:`, error.message);
    }
  }
  
  throw new Error(`セッション確立タイムアウト (${maxAttempts}回試行)`);
}

/**
 * 最適化された認証フローエミュレーション
 */
export async function emulateAuthFlowOptimized(
  page: Page,
  email: string = 'one.photolife+1@gmail.com',
  password: string = '?@thc123THC@?'
): Promise<any> {
  console.log('🔐 [OPTIMIZED] 認証フロー開始');
  
  try {
    // Step 1: CSRFトークン取得
    console.log('  1️⃣ CSRFトークンを取得中...');
    const csrfResponse = await page.request.get('http://localhost:3000/api/auth/csrf');
    const csrfData = await csrfResponse.json();
    const csrfToken = csrfData.csrfToken;
    
    if (!csrfToken) {
      throw new Error('CSRFトークンの取得に失敗');
    }
    console.log('  ✅ CSRFトークン取得成功');
    
    // Step 2: 認証エンドポイントへPOST
    console.log('  2️⃣ 認証リクエストを送信中...');
    
    // フォームデータの構築
    const formData = new URLSearchParams({
      email,
      password,
      csrfToken,
      json: 'true'
    });
    
    const authResponse = await page.request.post('http://localhost:3000/api/auth/callback/credentials', {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      data: formData.toString()
    });
    
    const authStatus = authResponse.status();
    console.log(`  📊 認証レスポンス: ${authStatus}`);
    
    // Step 3: Cookieの処理
    const setCookieHeaders = authResponse.headers()['set-cookie'];
    if (setCookieHeaders) {
      console.log('  3️⃣ セッションCookieを設定中...');
      const cookies = parseCookies(setCookieHeaders);
      
      if (cookies.length > 0) {
        await page.context().addCookies(cookies);
        console.log(`  ✅ ${cookies.length}個のCookieを設定`);
      }
    }
    
    // Step 4: セッション確立を待つ
    if (authStatus === 302 || authStatus === 200) {
      console.log('  4️⃣ 認証成功、セッション確立を待機中...');
      
      const session = await waitForSessionOptimized(page, {
        maxAttempts: 10,
        intervalMs: 500,
        exponentialBackoff: false
      });
      
      return session;
    } else {
      const responseText = await authResponse.text();
      console.error('  ❌ 認証失敗:', responseText);
      throw new Error(`認証失敗: ${authStatus}`);
    }
    
  } catch (error: any) {
    console.error('❌ [OPTIMIZED] 認証フローエラー:', error.message);
    throw error;
  }
}

/**
 * セッションヘルスチェック
 */
export async function verifySessionHealthOptimized(page: Page): Promise<{
  isHealthy: boolean;
  details: any;
}> {
  const checks = {
    hasSessionCookie: false,
    hasValidSession: false,
    hasUserId: false,
    apiAccessible: false
  };
  
  // Cookie確認
  const cookies = await page.context().cookies();
  checks.hasSessionCookie = cookies.some(c => 
    c.name.includes('session-token')
  );
  
  // セッション確認
  try {
    const sessionResponse = await page.request.get('http://localhost:3000/api/auth/session');
    const session = await sessionResponse.json();
    
    checks.hasValidSession = !!session;
    checks.hasUserId = !!session?.user?.id;
  } catch (error) {
    console.error('Session check error:', error);
  }
  
  // API アクセス確認
  try {
    const response = await page.request.get('http://localhost:3000/api/posts');
    checks.apiAccessible = response.status() !== 401;
  } catch (error) {
    console.error('API check error:', error);
  }
  
  const isHealthy = Object.values(checks).every(v => v === true);
  
  return {
    isHealthy,
    details: checks
  };
}

/**
 * 統合ヘルパー: Playwrightテスト用
 */
export async function setupAuthenticatedSession(
  page: Page,
  options: {
    email?: string;
    password?: string;
    healthCheck?: boolean;
  } = {}
): Promise<any> {
  const {
    email = 'one.photolife+1@gmail.com',
    password = '?@thc123THC@?',
    healthCheck = true
  } = options;
  
  try {
    // 認証フロー実行
    const session = await emulateAuthFlowOptimized(page, email, password);
    
    if (!session?.user?.id) {
      throw new Error('セッション確立失敗: ユーザーIDが存在しません');
    }
    
    // ヘルスチェック（オプション）
    if (healthCheck) {
      const health = await verifySessionHealthOptimized(page);
      if (!health.isHealthy) {
        console.warn('⚠️ セッションヘルスチェック警告:', health.details);
      }
    }
    
    console.log('✅ 認証セッション確立完了:', session.user.email);
    return session;
    
  } catch (error: any) {
    console.error('❌ 認証セットアップ失敗:', error.message);
    
    // デバッグ用スクリーンショット
    await page.screenshot({ 
      path: `test-results/auth-error-${Date.now()}.png` 
    });
    
    throw error;
  }
}

// デフォルトエクスポート
export default {
  setupAuthenticatedSession,
  emulateAuthFlowOptimized,
  waitForSessionOptimized,
  verifySessionHealthOptimized
};