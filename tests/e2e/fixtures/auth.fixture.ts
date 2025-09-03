import { test as base, expect, BrowserContext, Page } from '@playwright/test';
import * as path from 'path';

/**
 * 認証済みテスト用フィクスチャ
 * NextAuthセッションを自動的に注入
 */
type AuthFixtures = {
  authenticatedContext: BrowserContext;
  authenticatedPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedContext: async ({ browser }, use) => {
    // 保存済み認証状態を読み込み
    const authFile = path.join(__dirname, '../../../playwright/.auth/user.json');
    const context = await browser.newContext({
      storageState: authFile,
    });
    
    // NextAuthセッションCookieの追加確認
    const cookies = await context.cookies();
    const hasSession = cookies.some(c => 
      c.name === 'next-auth.session-token' || 
      c.name === '__Secure-next-auth.session-token'
    );
    
    if (!hasSession) {
      // セッションCookieが無い場合は手動で追加
      await context.addCookies([
        {
          name: 'next-auth.session-token',
          value: process.env.TEST_SESSION_TOKEN || 'test-session-token',
          domain: 'localhost',
          path: '/',
          httpOnly: true,
          sameSite: 'Lax',
        }
      ]);
    }
    
    await use(context);
    await context.close();
  },
  
  authenticatedPage: async ({ authenticatedContext }, use) => {
    const page = await authenticatedContext.newPage();
    
    // セッションストレージも同期
    await page.addInitScript(() => {
      // NextAuthクライアントセッション
      window.sessionStorage.setItem(
        'next-auth.session',
        JSON.stringify({
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            name: 'Test User'
          },
          expires: new Date(Date.now() + 86400000).toISOString()
        })
      );
    });
    
    // ページ遷移してセッション確認
    await page.goto('/');
    
    // 認証状態の検証（ユーザーメニューが表示されるか）
    try {
      await page.waitForSelector('[data-testid="user-menu"]', { 
        timeout: 5000,
        state: 'visible' 
      });
    } catch (error) {
      console.warn('User menu not found, session might not be properly set');
    }
    
    await use(page);
    await page.close();
  },
});

export { expect } from '@playwright/test';