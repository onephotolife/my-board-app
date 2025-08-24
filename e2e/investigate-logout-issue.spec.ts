import { test, expect } from '@playwright/test';

const TEST_URL = 'https://board.blankbrainai.com';
const TEST_EMAIL = 'one.photolife+2@gmail.com';
const TEST_PASSWORD = 'testtest';

test.describe('ログアウト機能の詳細調査', () => {
  test('ログアウトのリダイレクト挙動を検証', async ({ page }) => {
    console.log('🔍 ログアウト問題の調査開始');
    
    // Step 1: ログイン処理
    console.log('Step 1: ログイン処理');
    await page.goto(`${TEST_URL}/auth/signin`);
    await page.waitForLoadState('networkidle');
    
    // ログインフォーム入力
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    
    // ダッシュボードへの遷移を待つ
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('✅ ログイン成功、現在のURL:', page.url());
    
    // Step 2: セッション状態の確認
    console.log('Step 2: セッション状態の確認');
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => 
      c.name.includes('session-token') || c.name.includes('authjs')
    );
    console.log('セッションクッキー:', sessionCookie ? {
      name: sessionCookie.name,
      domain: sessionCookie.domain,
      secure: sessionCookie.secure,
      sameSite: sessionCookie.sameSite,
      httpOnly: sessionCookie.httpOnly
    } : 'なし');
    
    // Step 3: ログアウトボタンの場所を確認
    console.log('Step 3: ログアウトボタンの検索');
    
    // サイドバーのログアウトボタンを探す
    const sidebarLogoutButton = await page.locator('button:has-text("ログアウト")').first();
    const sidebarButtonVisible = await sidebarLogoutButton.isVisible();
    console.log('サイドバーのログアウトボタン:', sidebarButtonVisible ? '表示' : '非表示');
    
    if (sidebarButtonVisible) {
      // Step 4: ログアウトボタンのHTML属性を取得
      console.log('Step 4: ログアウトボタンの詳細情報');
      const buttonHtml = await sidebarLogoutButton.evaluate(el => el.outerHTML);
      console.log('ボタンHTML:', buttonHtml);
      
      // onClick属性があるか確認
      const hasOnClick = await sidebarLogoutButton.evaluate(el => !!el.onclick);
      console.log('onClick属性:', hasOnClick ? 'あり' : 'なし');
      
      // Step 5: ネットワーク監視を開始
      console.log('Step 5: ネットワーク監視開始');
      const networkLogs: any[] = [];
      
      page.on('request', request => {
        if (request.url().includes('auth') || request.url().includes('signout')) {
          networkLogs.push({
            type: 'request',
            url: request.url(),
            method: request.method(),
            headers: request.headers()
          });
          console.log(`📤 リクエスト: ${request.method()} ${request.url()}`);
        }
      });
      
      page.on('response', response => {
        if (response.url().includes('auth') || response.url().includes('signout')) {
          networkLogs.push({
            type: 'response',
            url: response.url(),
            status: response.status(),
            headers: response.headers()
          });
          console.log(`📥 レスポンス: ${response.status()} ${response.url()}`);
        }
      });
      
      // Step 6: コンソールログを監視
      console.log('Step 6: コンソールログ監視');
      page.on('console', msg => {
        if (msg.text().includes('signOut') || msg.text().includes('ログアウト')) {
          console.log(`🖥️ ブラウザコンソール: ${msg.text()}`);
        }
      });
      
      // Step 7: ページのナビゲーションを監視
      console.log('Step 7: ナビゲーション監視');
      const navigationPromise = page.waitForNavigation({ 
        waitUntil: 'networkidle',
        timeout: 10000 
      }).catch(err => {
        console.log('ナビゲーションタイムアウト:', err.message);
        return null;
      });
      
      // Step 8: ログアウトボタンをクリック
      console.log('Step 8: ログアウトボタンクリック');
      await sidebarLogoutButton.click();
      console.log('✅ ログアウトボタンをクリックしました');
      
      // ナビゲーションの完了を待つ
      const navResult = await navigationPromise;
      
      // Step 9: クリック後の状態を確認
      console.log('Step 9: クリック後の状態確認');
      await page.waitForTimeout(3000); // 3秒待機
      
      const currentUrl = page.url();
      console.log('現在のURL:', currentUrl);
      
      // URLの解析
      const url = new URL(currentUrl);
      console.log('URLパース結果:', {
        hostname: url.hostname,
        pathname: url.pathname,
        search: url.search,
        searchParams: Array.from(url.searchParams.entries())
      });
      
      // リダイレクト回数の確認
      console.log('ネットワークログ数:', networkLogs.length);
      networkLogs.forEach((log, index) => {
        console.log(`ログ[${index}]:`, log);
      });
      
      // Step 10: 最終的なセッション状態
      console.log('Step 10: 最終セッション状態');
      const finalCookies = await page.context().cookies();
      const finalSessionCookie = finalCookies.find(c => 
        c.name.includes('session-token') || c.name.includes('authjs')
      );
      console.log('最終セッションクッキー:', finalSessionCookie ? '存在' : '削除済み');
      
      // アサーション
      // URLがサインインページに遷移していることを確認
      expect(currentUrl).toContain('/auth/signin');
      
      // セッションクッキーが削除されていることを確認
      expect(finalSessionCookie).toBeUndefined();
      
    } else {
      console.log('❌ ログアウトボタンが見つかりません');
      throw new Error('ログアウトボタンが見つかりません');
    }
  });
  
  test('URLエンコーディング問題の再現テスト', async ({ page }) => {
    console.log('🔍 URLエンコーディング問題の調査');
    
    // ログイン
    await page.goto(`${TEST_URL}/auth/signin`);
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // 直接signOut APIを呼び出してみる
    console.log('直接signOut APIを呼び出し');
    const signOutResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/auth/signout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        });
        return {
          status: response.status,
          url: response.url,
          redirected: response.redirected,
          headers: Object.fromEntries(response.headers.entries())
        };
      } catch (err: any) {
        return { error: err.message };
      }
    });
    
    console.log('signOut API レスポンス:', signOutResponse);
    
    // ページをリロードして確認
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    const afterReloadUrl = page.url();
    console.log('リロード後のURL:', afterReloadUrl);
    
    // セッション確認
    const sessionCheck = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/auth/session');
        const data = await response.json();
        return data;
      } catch (err: any) {
        return { error: err.message };
      }
    });
    
    console.log('セッション状態:', sessionCheck);
  });
});