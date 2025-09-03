/**
 * NextAuth.js v4 セッション同期待機メカニズム
 * JWT/Session非同期問題を解決
 */

import { Page } from '@playwright/test';

export interface SessionWaitOptions {
  maxAttempts?: number;
  intervalMs?: number;
  exponentialBackoff?: boolean;
  validateSession?: (session: any) => boolean;
}

/**
 * セッション確立を待機する改善版
 */
export async function waitForSession(
  page: Page,
  options: SessionWaitOptions = {}
): Promise<any> {
  const {
    maxAttempts = 30,
    intervalMs = 1000,
    exponentialBackoff = true,
    validateSession = (s) => !!(s?.user?.id)
  } = options;
  
  console.log('⏳ Waiting for session establishment...');
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // 待機時間の計算（指数バックオフ対応）
    const waitTime = exponentialBackoff 
      ? Math.min(intervalMs * Math.pow(1.5, attempt), 10000)
      : intervalMs;
    
    if (attempt > 0) {
      await page.waitForTimeout(waitTime);
    }
    
    try {
      // 複数の方法でセッション取得を試みる
      
      // Method 1: fetch API
      const sessionViaFetch = await page.evaluate(async () => {
        const res = await fetch('/api/auth/session', {
          credentials: 'include',
          cache: 'no-cache'
        });
        return res.json();
      });
      
      if (validateSession(sessionViaFetch)) {
        console.log(`✅ Session established via fetch (attempt ${attempt + 1})`);
        return sessionViaFetch;
      }
      
      // Method 2: getSession (NextAuth client)
      const sessionViaClient = await page.evaluate(async () => {
        // @ts-ignore
        if (typeof window !== 'undefined' && window.next?.auth?.getSession) {
          // @ts-ignore
          return await window.next.auth.getSession();
        }
        return null;
      });
      
      if (validateSession(sessionViaClient)) {
        console.log(`✅ Session established via client (attempt ${attempt + 1})`);
        return sessionViaClient;
      }
      
      // Method 3: Cookie検査
      const cookies = await page.context().cookies();
      const sessionCookie = cookies.find(c => 
        c.name.includes('session-token')
      );
      
      if (sessionCookie) {
        // Cookieが存在する場合、強制的にページをリロード
        if (attempt === Math.floor(maxAttempts / 2)) {
          console.log('🔄 Reloading page to refresh session...');
          await page.reload({ waitUntil: 'networkidle' });
        }
      }
      
      console.log(`⏳ Attempt ${attempt + 1}/${maxAttempts}: Session not ready`);
      
    } catch (error) {
      console.error(`❌ Attempt ${attempt + 1} error:`, error);
    }
  }
  
  throw new Error(`Session establishment timeout after ${maxAttempts} attempts`);
}

/**
 * 認証後のセッション同期を強制
 */
export async function forceSessionSync(page: Page): Promise<void> {
  console.log('🔄 Forcing session synchronization...');
  
  // 1. 明示的なセッション更新をトリガー
  await page.evaluate(() => {
    // NextAuth.jsのセッション更新をトリガー
    const event = new Event('visibilitychange');
    document.dispatchEvent(event);
  });
  
  // 2. Storage Eventをトリガー
  await page.evaluate(() => {
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'nextauth.message',
      newValue: JSON.stringify({
        event: 'session',
        data: { trigger: 'manual' }
      })
    }));
  });
  
  // 3. 短い待機
  await page.waitForTimeout(500);
  
  // 4. セッションエンドポイントを明示的に呼び出し
  await page.evaluate(async () => {
    await fetch('/api/auth/session', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
  });
  
  console.log('✅ Session sync triggered');
}

/**
 * ポーリングによるセッション監視
 */
export async function pollSession(
  page: Page,
  callback: (session: any) => void,
  intervalMs: number = 1000
): Promise<() => void> {
  let polling = true;
  
  const poll = async () => {
    while (polling) {
      try {
        const session = await page.evaluate(async () => {
          const res = await fetch('/api/auth/session');
          return res.json();
        });
        
        callback(session);
      } catch (error) {
        console.error('Polling error:', error);
      }
      
      await page.waitForTimeout(intervalMs);
    }
  };
  
  // バックグラウンドでポーリング開始
  poll();
  
  // 停止関数を返す
  return () => {
    polling = false;
  };
}

/**
 * セッション確立のヘルスチェック
 */
export async function verifySessionHealth(page: Page): Promise<{
  isHealthy: boolean;
  details: any;
}> {
  const checks = {
    hasSessionCookie: false,
    hasValidSession: false,
    hasUserId: false,
    isEmailVerified: false,
    apiAccessible: false
  };
  
  // Cookie確認
  const cookies = await page.context().cookies();
  checks.hasSessionCookie = cookies.some(c => 
    c.name.includes('session-token')
  );
  
  // セッション確認
  try {
    const session = await page.evaluate(async () => {
      const res = await fetch('/api/auth/session');
      return res.json();
    });
    
    checks.hasValidSession = !!session;
    checks.hasUserId = !!session?.user?.id;
    checks.isEmailVerified = session?.user?.emailVerified === true;
  } catch (error) {
    console.error('Session check error:', error);
  }
  
  // API アクセス確認
  try {
    const response = await page.request.get('/api/notifications');
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