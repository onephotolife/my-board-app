import { test, expect } from '@playwright/test';

test.describe('ダッシュボードMUIエラー修正検証 - シンプル版', () => {
  
  test('1. MUIエラー修正後のダッシュボードが正しく表示される', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    // コンソールエラーを監視
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        consoleErrors.push(msg.text());
      }
    });

    // ログイン
    await page.goto('http://localhost:3000/auth/signin');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    
    // ダッシュボードに移動するまで待機
    await page.waitForURL('**/dashboard', { timeout: 60000 });
    await page.waitForTimeout(3000); // レンダリング完了を待つ
    
    // MUI Grid関連のエラーがない
    const muiGridErrors = consoleErrors.filter(err => 
      err.includes('MUI Grid') || 
      err.includes('item prop') || 
      err.includes('xs prop') || 
      err.includes('md prop')
    );
    expect(muiGridErrors).toHaveLength(0);
    
    // HTML構造エラーがない
    const htmlErrors = consoleErrors.filter(err => 
      err.includes('cannot be a descendant') ||
      err.includes('hydration error')
    );
    expect(htmlErrors).toHaveLength(0);
    
    // グリッドコンテナの確認
    const gridContainer = page.locator('.MuiGrid2-container').first();
    await expect(gridContainer).toBeVisible();
    
    // カードが3つ表示されることを確認
    const cards = page.locator('.MuiCard-root');
    await expect(cards).toHaveCount(3);
    
    // Chipコンポーネントが表示される
    const chip = page.locator('.MuiChip-root').filter({ hasText: 'メール確認済み' });
    await expect(chip).toBeVisible();
    
    // Chipの親要素がpタグでないことを確認
    const chipParent = await chip.evaluate(el => {
      const parent = el.parentElement;
      return parent?.tagName.toLowerCase();
    });
    expect(chipParent).not.toBe('p');
    
    // プロフィールカードが表示される
    const profileCard = page.locator('.MuiCard-root').filter({ hasText: 'プロフィール' });
    await expect(profileCard).toBeVisible();
    
    // 投稿統計カードが表示される
    const statsCard = page.locator('.MuiCard-root').filter({ hasText: '投稿統計' });
    await expect(statsCard).toBeVisible();
    
    // アクティビティカードが表示される
    const activityCard = page.locator('.MuiCard-root').filter({ hasText: 'アクティビティ' });
    await expect(activityCard).toBeVisible();
    
    // クイックアクションが表示される
    const quickActions = page.locator('.MuiPaper-root').filter({ hasText: 'クイックアクション' });
    await expect(quickActions).toBeVisible();
    
    // アクションチップが3つある
    const actionChips = quickActions.locator('.MuiChip-root');
    await expect(actionChips).toHaveCount(3);
    
    console.log('✅ すべてのMUI修正が正常に適用されています');
    console.log('コンソールエラー数:', consoleErrors.length);
  });

  test('2. レスポンシブレイアウトが正しく動作する', async ({ page }) => {
    // ログイン
    await page.goto('http://localhost:3000/auth/signin');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 60000 });
    
    // デスクトップ表示
    await page.setViewportSize({ width: 1920, height: 1080 });
    const cards = page.locator('.MuiCard-root');
    await expect(cards.first()).toBeVisible();
    
    // モバイル表示
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(cards.first()).toBeVisible();
    
    // タブレット表示
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(cards.first()).toBeVisible();
    
    console.log('✅ レスポンシブレイアウトが正常に動作しています');
  });

  test('3. HTML構造が正しく修正されている', async ({ page }) => {
    // ログイン
    await page.goto('http://localhost:3000/auth/signin');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 60000 });
    
    // DOM構造の検証
    const domStructure = await page.evaluate(() => {
      // pタグ内にdivがないことを確認
      const pTags = document.querySelectorAll('p');
      let hasInvalidNesting = false;
      
      pTags.forEach(p => {
        const divChildren = p.querySelectorAll('div');
        if (divChildren.length > 0) {
          hasInvalidNesting = true;
        }
      });
      
      return {
        hasInvalidNesting,
        pTagCount: pTags.length,
        hasGrid2Container: document.querySelectorAll('.MuiGrid2-container').length > 0
      };
    });
    
    expect(domStructure.hasInvalidNesting).toBe(false);
    expect(domStructure.hasGrid2Container).toBe(true);
    
    console.log('✅ HTML構造が正しく修正されています');
  });
});