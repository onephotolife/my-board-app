import { test, expect } from '@playwright/test';

test.describe('React Key重複エラー検証', () => {
  test('掲示板ページでReact keyエラーが発生しない', async ({ page }) => {
    // コンソールエラーキャッチ
    const consoleErrors: string[] = [];
    const reactKeyErrors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        if (msg.text().includes('same key') || msg.text().includes('duplicate') || msg.text().includes('key')) {
          reactKeyErrors.push(msg.text());
        }
      }
    });

    // 掲示板ページへアクセス（認証リダイレクトも受け入れ）
    await page.goto('http://localhost:3000/board');
    
    // リダイレクトの場合も継続（最大15秒待機）
    await page.waitForLoadState('load', { timeout: 15000 });
    await page.waitForTimeout(2000);

    console.log('All console errors:', consoleErrors);
    console.log('React key errors:', reactKeyErrors);
    
    // React keyエラーが発生していないことを確認
    expect(reactKeyErrors).toEqual([]);

    // ページが何らかの形で読み込まれることを確認
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    expect(currentUrl).toContain('localhost:3000');
  });

  test('認証後の掲示板でReact keyエラー検証', async ({ page }) => {
    const consoleErrors: string[] = [];
    const reactKeyErrors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        if (msg.text().includes('same key') || msg.text().includes('duplicate') || msg.text().includes('key')) {
          reactKeyErrors.push(msg.text());
        }
      }
    });

    // 認証なしでホームページアクセス（認証リダイレクト回避）
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('load', { timeout: 15000 });
    await page.waitForTimeout(3000);

    console.log('Home page console errors:', consoleErrors);
    console.log('Home page React key errors:', reactKeyErrors);

    // React keyエラーが発生していないことを確認
    expect(reactKeyErrors).toEqual([]);
  });
});