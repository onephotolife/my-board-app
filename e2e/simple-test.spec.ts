import { test, expect } from '@playwright/test';

test('基本的な権限チェック', async ({ page }) => {
  // ボードページへアクセス
  await page.goto('http://localhost:3000/board');
  
  // ページが読み込まれることを確認
  await expect(page).toHaveTitle(/掲示板/);
  
  console.log('✅ ページアクセス成功');
});

test('API権限チェック', async ({ page }) => {
  // 権限APIへアクセス
  const response = await page.request.get('http://localhost:3000/api/user/permissions');
  
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  
  expect(data.role).toBeDefined();
  console.log('✅ 権限API応答:', data.role);
});
