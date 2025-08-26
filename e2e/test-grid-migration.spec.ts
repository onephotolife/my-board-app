import { test, expect } from '@playwright/test';

test.describe('MUI Grid v2 Migration Test', () => {
  test('test-follow page should load without Grid warnings', async ({ page }) => {
    const consoleMessages: string[] = [];
    
    // コンソールメッセージを監視
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Grid') || text.includes('deprecated') || text.includes('Warning')) {
        consoleMessages.push(text);
      }
    });
    
    // ページアクセス
    await page.goto('http://localhost:3000/test-follow');
    
    // ページコンテンツが読み込まれるまで待機
    await page.waitForSelector('text=フォローボタン テストページ', { timeout: 10000 });
    
    // ページタイトル確認
    await expect(page).toHaveTitle(/会員制掲示板/);
    
    // Grid要素の存在確認
    const gridContainers = await page.locator('[class*="MuiGrid-container"]').count();
    expect(gridContainers).toBeGreaterThan(0);
    
    // Grid警告がないことを確認
    const gridWarnings = consoleMessages.filter(msg => 
      msg.includes('Grid') && (msg.includes('deprecated') || msg.includes('Warning'))
    );
    expect(gridWarnings).toHaveLength(0);
    
    // ページのレイアウトが正しいことを確認（レスポンシブ）
    await page.setViewportSize({ width: 1200, height: 800 });
    const errorSection = await page.locator('text=エラー処理テスト').isVisible();
    const performanceSection = await page.locator('text=パフォーマンステスト').isVisible();
    
    expect(errorSection).toBeTruthy();
    expect(performanceSection).toBeTruthy();
    
    // モバイルビューでも確認
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('text=エラー処理テスト')).toBeVisible();
    await expect(page.locator('text=パフォーマンステスト')).toBeVisible();
  });
  
  test('Grid elements should use correct v2 properties', async ({ page }) => {
    await page.goto('http://localhost:3000/test-follow');
    
    // ページコンテンツが読み込まれるまで待機
    await page.waitForSelector('text=フォローボタン テストページ', { timeout: 10000 });
    
    // Grid要素のクラス名を確認
    const gridElements = await page.locator('[class*="MuiGrid"]').all();
    
    for (const element of gridElements) {
      const className = await element.getAttribute('class');
      // v1の'item'クラスが含まれていないことを確認
      expect(className).not.toContain('MuiGrid-item');
      // v2の'size'関連のクラスが適用されていることを確認
      if (className && className.includes('MuiGrid-grid')) {
        expect(className).toMatch(/MuiGrid-(size|grid)/);
      }
    }
  });
});