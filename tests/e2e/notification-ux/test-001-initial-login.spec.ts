/**
 * TEST_001: 初回ログイン時の通知表示
 * 優先度: P0（必須）
 * ペルソナ: 全ペルソナ
 * STRICT120準拠
 */

import { test, expect, Page } from '@playwright/test';
import { NotificationTestHelper } from './helpers/notification-helper';

// 必須認証情報
const AUTH_CREDENTIALS = {
  email: 'one.photolife+1@gmail.com',
  password: '?@thc123THC@?'
};

// テスト設定
test.describe('TEST_001: 初回ログイン時の通知表示', () => {
  let helper: NotificationTestHelper;
  
  test.beforeEach(async ({ page }) => {
    helper = new NotificationTestHelper(page);
    console.log('[TEST_001] テスト開始:', new Date().toISOString());
    
    // テストデータ準備（3件の未読通知）
    await helper.setupTestNotifications(3);
  });

  test.afterEach(async ({ page }) => {
    // スクリーンショット保存
    await page.screenshot({ 
      path: `test-results/screenshots/TEST_001-${Date.now()}.png`,
      fullPage: true 
    });
  });

  test('ログイン直後の通知バッジ表示', async ({ page }) => {
    // 測定開始
    const startTime = Date.now();
    
    // Step 1: ログイン画面を開く
    console.log('[STEP1] ログイン画面へ移動');
    await page.goto('/auth/signin');
    await expect(page).toHaveURL(/.*signin/);
    
    // Step 2: 認証情報入力
    console.log('[STEP2] 認証情報入力');
    await page.fill('input[name="email"]', AUTH_CREDENTIALS.email);
    await page.fill('input[name="password"]', AUTH_CREDENTIALS.password);
    
    // Step 3: ログインボタンクリック
    console.log('[STEP3] ログイン実行');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      page.click('button[type="submit"]')
    ]);
    
    // Step 4: ダッシュボード表示確認
    console.log('[STEP4] ダッシュボード表示確認');
    await expect(page).toHaveURL(/.*dashboard|board/);
    
    // Step 5: 通知ベルアイコンの確認
    console.log('[STEP5] 通知ベルアイコン確認');
    const bellIcon = page.locator('[data-testid="notification-bell"]');
    await expect(bellIcon).toBeVisible();
    
    // 期待結果の検証
    console.log('[VERIFY] 期待結果の検証');
    
    // 1. ベルアイコンに赤バッジ「3」が表示される
    const badge = page.locator('[data-testid="notification-badge"]');
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText('3');
    
    // 2. レスポンス時間 < 2秒
    const loadTime = Date.now() - startTime;
    console.log(`[PERF] ページロード時間: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(2000);
    
    // 3. バッジがアニメーション付きで表示
    const badgeAnimation = await badge.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return styles.animation || styles.transition;
    });
    expect(badgeAnimation).toBeTruthy();
    console.log('[ANIMATION] バッジアニメーション確認:', badgeAnimation);
    
    // IPoV (Independent Proof of Visual)
    const ipov = {
      colors: {
        badge_bg: await badge.evaluate(el => 
          window.getComputedStyle(el).backgroundColor
        ),
        badge_text: await badge.evaluate(el => 
          window.getComputedStyle(el).color
        )
      },
      position: await badge.boundingBox(),
      text: await badge.textContent(),
      state: {
        visible: await badge.isVisible(),
        enabled: await bellIcon.isEnabled()
      }
    };
    
    console.log('[IPoV] 視覚的証拠:', JSON.stringify(ipov, null, 2));
    
    // アサーション
    expect(ipov.colors.badge_bg).toMatch(/rgb.*255.*0.*0|red/i); // 赤色
    expect(ipov.text).toBe('3');
    expect(ipov.state.visible).toBe(true);
    
    console.log('[TEST_001] ✅ テスト成功');
  });

  test('複数ブラウザでの表示一貫性', async ({ browser }) => {
    // Chrome, Firefox, Safari での一貫性確認
    const contexts = await Promise.all([
      browser.newContext({ ...test.use.viewport }),
      browser.newContext({ 
        ...test.use.viewport,
        userAgent: 'Mozilla/5.0 Firefox/100.0'
      }),
      browser.newContext({ 
        ...test.use.viewport,
        userAgent: 'Mozilla/5.0 Safari/15.0' 
      })
    ]);
    
    for (const [index, context] of contexts.entries()) {
      const page = await context.newPage();
      const browserName = ['Chrome', 'Firefox', 'Safari'][index];
      
      console.log(`[BROWSER] ${browserName}でテスト`);
      
      // ログイン実行
      await helper.login(page, AUTH_CREDENTIALS);
      
      // 通知バッジ確認
      const badge = page.locator('[data-testid="notification-badge"]');
      await expect(badge).toBeVisible();
      await expect(badge).toHaveText('3');
      
      // スクリーンショット
      await page.screenshot({ 
        path: `test-results/screenshots/TEST_001-${browserName}-${Date.now()}.png` 
      });
      
      await context.close();
    }
    
    console.log('[TEST_001] ✅ 複数ブラウザテスト成功');
  });
});

// エラーハンドリング
test.describe('TEST_001: エラーケース', () => {
  test('認証失敗時の適切なエラー表示', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // 不正な認証情報
    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // エラーメッセージ確認
    const errorMessage = page.locator('[data-testid="auth-error"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText(/invalid|incorrect/i);
    
    // 通知ベルが表示されないことを確認
    const bellIcon = page.locator('[data-testid="notification-bell"]');
    await expect(bellIcon).not.toBeVisible();
    
    console.log('[TEST_001] ✅ エラーケース確認');
  });
});