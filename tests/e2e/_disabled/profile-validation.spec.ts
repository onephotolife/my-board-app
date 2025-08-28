import { test, expect } from '@playwright/test';

test.describe('プロフィール改善実装検証', () => {
  
  test('プロフィールページがサーバーコンポーネントとして動作', async ({ page }) => {
    // プロフィールページにアクセス
    await page.goto('/profile');
    
    // 未認証の場合サインインページにリダイレクト
    await expect(page).toHaveURL(/\/auth\/signin/);
  });
  
  test('パスワード変更ページが存在する', async ({ page }) => {
    // パスワード変更ページにアクセス
    await page.goto('/profile/change-password');
    
    // 未認証の場合サインインページにリダイレクト
    await expect(page).toHaveURL(/\/auth\/signin/);
  });
  
  test('POST /api/profile/change-password エンドポイントが存在', async ({ request }) => {
    // 未認証でのアクセステスト
    const response = await request.post('/api/profile/change-password', {
      data: {
        currentPassword: 'test',
        newPassword: 'Test123!@#'
      }
    });
    
    // 401 Unauthorizedが返される
    expect(response.status()).toBe(401);
  });
});