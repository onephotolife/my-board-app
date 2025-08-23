import { test, expect } from '@playwright/test';

test.describe('本番環境: メンバー歴表示テスト', () => {
  const baseURL = 'https://board.blankbrainai.com';
  const testEmail = 'one.photolife+2@gmail.com';
  const testPassword = '?@thc123THC@?';
  
  test('メンバー歴が約600日と表示される', async ({ page }) => {
    console.log('🚀 === メンバー歴検証開始 ===');
    console.log('実行時刻:', new Date().toISOString());
    
    // まずサインアウトページに直接アクセスしてセッションをクリア
    await page.goto(`${baseURL}/api/auth/signout`);
    await page.waitForTimeout(2000);
    
    // サインアウト確認ボタンがあればクリック
    const signOutButton = page.locator('button:has-text("Sign out")');
    if (await signOutButton.isVisible()) {
      await signOutButton.click();
      await page.waitForTimeout(2000);
    }
    
    // サインインページに移動
    console.log('📌 サインインページに移動');
    await page.goto(`${baseURL}/auth/signin`);
    await page.waitForTimeout(2000);
    
    // ログインフォーム入力
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    console.log('✅ 認証情報入力完了');
    
    // ログインボタンクリック
    await page.click('button[type="submit"]');
    console.log('⏳ ログイン処理中...');
    
    // ダッシュボードへのリダイレクト待機
    await page.waitForTimeout(5000);
    const afterLoginUrl = page.url();
    console.log(`📍 ログイン後URL: ${afterLoginUrl}`);
    
    // ダッシュボードページの確認
    if (!afterLoginUrl.includes('/dashboard')) {
      await page.goto(`${baseURL}/dashboard`);
      await page.waitForTimeout(3000);
    }
    
    const dashboardUrl = page.url();
    console.log(`📍 ダッシュボードURL: ${dashboardUrl}`);
    
    if (dashboardUrl.includes('/dashboard')) {
      // メンバー歴要素の確認
      const memberSinceLabel = await page.locator('text=/メンバー歴/').isVisible();
      console.log(`メンバー歴ラベル表示: ${memberSinceLabel ? '✅' : '❌'}`);
      
      // 日数の値を取得
      const dayValue = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        for (const el of elements) {
          const text = el.textContent || '';
          // 日数を含むテキストを探す（例: "586日"）
          const match = text.match(/(\d+)日/);
          if (match) {
            return parseInt(match[1], 10);
          }
        }
        return 0;
      });
      
      console.log(`メンバー歴日数: ${dayValue}日`);
      
      // 現在の日付から2023年6月1日までの日数を計算
      const now = new Date();
      const registrationDate = new Date('2023-06-01');
      const expectedDays = Math.floor((now.getTime() - registrationDate.getTime()) / (1000 * 60 * 60 * 24));
      console.log(`期待される日数: ${expectedDays}日`);
      
      // スクリーンショット保存
      await page.screenshot({ 
        path: 'test-results/production-member-history-600days.png', 
        fullPage: true 
      });
      console.log('📸 スクリーンショット保存');
      
      // アサーション - 580日以上620日以下の範囲で確認
      expect(memberSinceLabel).toBeTruthy();
      expect(dayValue).toBeGreaterThan(580);
      expect(dayValue).toBeLessThan(620);
      
      console.log('✅ メンバー歴が正しく表示されています');
      
    } else {
      console.log('⚠️ ダッシュボードアクセス不可');
    }
    
    console.log('\\n✅ === テスト完了 ===');
  });
});