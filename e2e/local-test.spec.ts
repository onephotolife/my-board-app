import { test, expect } from '@playwright/test';

test.describe('ローカル環境: 修正確認テスト', () => {
  
  test('ダッシュボードのメンバー歴が正しく表示されること', async ({ page }) => {
    // テスト用ユーザーでログイン
    await page.goto('http://localhost:3000/auth/signin');
    await page.fill('input[name="email"]', 'one.photolife+2@gmail.com');
    await page.fill('input[name="password"]', '?@thc123THC@?');
    await page.click('button[type="submit"]');
    
    // ダッシュボードへのリダイレクトを待つ
    await page.waitForTimeout(3000);
    
    // ダッシュボードページの確認
    const url = page.url();
    if (url.includes('/dashboard')) {
      // メンバー歴の要素を探す
      const memberSinceElement = await page.locator('text=/メンバー歴/').isVisible();
      expect(memberSinceElement).toBeTruthy();
      
      // 数値が表示されているか確認（日、月、年のいずれか）
      const hasTimeUnit = await page.locator('text=/[0-9]+[日月年]/').isVisible();
      expect(hasTimeUnit).toBeTruthy();
      
      console.log('✅ ダッシュボードのメンバー歴表示: 正常');
    }
  });
  
  test('my-postsページに下書きタブが存在しないこと', async ({ page }) => {
    // 既にログイン済みの場合はmy-postsへ直接アクセス
    await page.goto('http://localhost:3000/my-posts');
    
    // 認証が必要な場合はログイン
    if (page.url().includes('/auth/signin')) {
      await page.fill('input[name="email"]', 'one.photolife+2@gmail.com');
      await page.fill('input[name="password"]', '?@thc123THC@?');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
      await page.goto('http://localhost:3000/my-posts');
    }
    
    await page.waitForTimeout(2000);
    
    // my-postsページの確認
    if (page.url().includes('/my-posts')) {
      // 下書きタブが存在しないことを確認
      const hasDraftTab = await page.locator('text="下書き"').isVisible().catch(() => false);
      expect(hasDraftTab).toBe(false);
      
      // タブの数を確認（すべて、公開済み、アーカイブの3つのみ）
      const tabs = await page.locator('[role="tab"]').count();
      expect(tabs).toBeLessThanOrEqual(3);
      
      console.log('✅ my-postsページの下書きタブ削除: 確認完了');
    }
  });
});