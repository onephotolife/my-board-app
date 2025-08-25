import { test, expect } from '@playwright/test';

test.describe('ダッシュボード文字列変更の検証', () => {
  test('メインカラムとメニューの文字列が正しく変更されているか', async ({ page }) => {
    // ダッシュボードページへ直接アクセス（認証なし環境を想定）
    await page.goto('/dashboard');
    
    // ページの読み込みを待つ
    await page.waitForLoadState('networkidle');
    
    // メインカラムのタイトルを確認
    const mainTitle = page.locator('h4').filter({ hasText: 'ダッシュボード' });
    await expect(mainTitle).toBeVisible();
    
    // 「会員制掲示板」という文字が表示されていないことを確認
    const oldTitle = page.locator('h4').filter({ hasText: '会員制掲示板' });
    await expect(oldTitle).not.toBeVisible();
    
    // サイドバーメニューの確認
    const menuItem = page.locator('span').filter({ hasText: 'ダッシュボード' }).first();
    await expect(menuItem).toBeVisible();
    
    // 他のページでAppLayoutが正しく動作していることを確認
    await page.goto('/board');
    await page.waitForLoadState('networkidle');
    
    // 掲示板ページでもメニューアイテムが「ダッシュボード」になっているか確認
    const boardPageMenuItem = page.locator('span').filter({ hasText: 'ダッシュボード' }).first();
    await expect(boardPageMenuItem).toBeVisible();
  });

  test('変更が他のコンポーネントに影響していないか', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // トップページのタイトルは変更されていないことを確認
    const homeTitle = page.locator('h1').filter({ hasText: '会員制掲示板へようこそ' });
    await expect(homeTitle).toBeVisible();
    
    // プライバシーポリシーページ
    await page.goto('/privacy');
    await page.waitForLoadState('networkidle');
    
    // プライバシーポリシー内の「会員制掲示板」は維持されているか
    const privacyContent = await page.textContent('body');
    expect(privacyContent).toContain('会員制掲示板');
  });
});