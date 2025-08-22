import { test, expect } from '@playwright/test';

const PROD_URL = 'https://blankinai-board.vercel.app';
const PROD_EMAIL = 'one.photolife+2@gmail.com';
const PROD_PASSWORD = '?@thc123THC@?';

test.describe('本番環境 基本機能テスト', () => {
  test('本番環境にログインして投稿作成', async ({ page }) => {
    // タイムアウトを延長
    test.setTimeout(60000);
    
    // 1. サインインページへ
    await page.goto(`${PROD_URL}/auth/signin`);
    console.log('✅ サインインページにアクセス');
    
    // 2. ログイン
    await page.fill('input[type="email"]', PROD_EMAIL);
    await page.fill('input[type="password"]', PROD_PASSWORD);
    await page.click('button[type="submit"]:has-text("ログイン")');
    console.log('✅ ログイン情報を入力');
    
    // 3. ダッシュボードへの遷移を待つ
    await page.waitForTimeout(5000);
    const currentUrl = page.url();
    console.log(`現在のURL: ${currentUrl}`);
    
    // 4. 投稿フォームがあるか確認
    const textarea = page.locator('textarea').first();
    const hasTextarea = await textarea.isVisible({ timeout: 10000 }).catch(() => false);
    
    if (hasTextarea) {
      console.log('✅ 投稿フォームを発見');
      
      // 5. テスト投稿を作成
      const testMessage = `本番環境テスト - ${new Date().toISOString()}`;
      await textarea.fill(testMessage);
      console.log(`✅ メッセージ入力: ${testMessage}`);
      
      // 6. 投稿ボタンをクリック
      const postButton = page.locator('button:has-text("投稿")').first();
      await postButton.click();
      console.log('✅ 投稿ボタンをクリック');
      
      // 7. 投稿が表示されるのを待つ
      await page.waitForTimeout(3000);
      
      // 8. 投稿が表示されているか確認
      const postedMessage = page.locator(`text="${testMessage}"`);
      const isPosted = await postedMessage.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (isPosted) {
        console.log('✅ 投稿が正常に作成されました');
      } else {
        console.log('❌ 投稿が表示されません');
      }
      
      expect(isPosted).toBeTruthy();
    } else {
      console.log('❌ 投稿フォームが見つかりません');
      
      // ページの状態を確認
      const pageTitle = await page.title();
      const pageUrl = page.url();
      console.log(`ページタイトル: ${pageTitle}`);
      console.log(`ページURL: ${pageUrl}`);
      
      // スクリーンショットを保存
      await page.screenshot({ path: 'production-test-screenshot.png', fullPage: true });
      console.log('スクリーンショットを保存しました: production-test-screenshot.png');
    }
  });
});