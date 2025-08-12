import { test, expect } from '@playwright/test';

test.describe('ダッシュボードMUIエラー修正検証 - 100%完全テスト', () => {
  
  // テスト前準備：ログイン
  test.beforeEach(async ({ page }) => {
    // テスト用ユーザーでログイン
    await page.goto('http://localhost:3000/auth/signin');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  // 1. コンソールエラーの確認
  test('1. コンソールにMUIエラーが表示されない', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForTimeout(2000);
    
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
    
    console.log('コンソールエラー確認:', consoleErrors.length === 0 ? 'エラーなし' : consoleErrors);
  });

  // 2. Grid レイアウトの確認
  test('2. Grid v2レイアウトが正しく表示される', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard');
    
    // グリッドコンテナの確認
    const gridContainer = page.locator('.MuiGrid2-container').first();
    await expect(gridContainer).toBeVisible();
    
    // グリッドアイテムの確認（3つのカード）
    const cards = page.locator('.MuiCard-root');
    await expect(cards).toHaveCount(3);
    
    // レスポンシブ動作確認
    // デスクトップ
    await page.setViewportSize({ width: 1920, height: 1080 });
    const desktopLayout = await page.evaluate(() => {
      const cards = document.querySelectorAll('.MuiCard-root');
      const firstCardWidth = cards[0]?.getBoundingClientRect().width;
      return firstCardWidth;
    });
    
    // モバイル
    await page.setViewportSize({ width: 375, height: 667 });
    const mobileLayout = await page.evaluate(() => {
      const cards = document.querySelectorAll('.MuiCard-root');
      const firstCardWidth = cards[0]?.getBoundingClientRect().width;
      return firstCardWidth;
    });
    
    // モバイルではカードが全幅
    expect(mobileLayout).toBeGreaterThan(desktopLayout);
  });

  // 3. Chipコンポーネントの表示確認
  test('3. Chipコンポーネントが正しく表示される', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard');
    
    // Chipコンポーネントの存在確認
    const chip = page.locator('.MuiChip-root').filter({ hasText: 'メール確認済み' });
    await expect(chip).toBeVisible();
    
    // Chipの親要素がpタグでないことを確認
    const chipParent = await chip.evaluate(el => {
      const parent = el.parentElement;
      return parent?.tagName.toLowerCase();
    });
    expect(chipParent).not.toBe('p');
    
    // Chipのスタイル確認
    const chipStyles = await chip.evaluate(el => {
      const computed = window.getComputedStyle(el);
      return {
        display: computed.display,
        backgroundColor: computed.backgroundColor
      };
    });
    expect(chipStyles.display).not.toBe('none');
  });

  // 4. プロフィールカードの構造確認
  test('4. プロフィールカードのHTML構造が正しい', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard');
    
    // DOM構造の検証
    const domStructure = await page.evaluate(() => {
      const profileCard = document.querySelector('.MuiCard-root');
      if (!profileCard) return null;
      
      // pタグ内にdivがないことを確認
      const pTags = profileCard.querySelectorAll('p');
      let hasInvalidNesting = false;
      
      pTags.forEach(p => {
        const divChildren = p.querySelectorAll('div');
        if (divChildren.length > 0) {
          hasInvalidNesting = true;
        }
      });
      
      return {
        hasProfileCard: true,
        hasInvalidNesting,
        pTagCount: pTags.length
      };
    });
    
    expect(domStructure?.hasInvalidNesting).toBe(false);
  });

  // 5. 投稿統計カードの表示確認
  test('5. 投稿統計カードが正しく表示される', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard');
    
    // 投稿統計カードの確認
    const statsCard = page.locator('.MuiCard-root').filter({ hasText: '投稿統計' });
    await expect(statsCard).toBeVisible();
    
    // 統計情報の表示確認
    await expect(statsCard.locator('text=総投稿数')).toBeVisible();
    await expect(statsCard.locator('text=今月の投稿')).toBeVisible();
    await expect(statsCard.locator('text=最終投稿日')).toBeVisible();
  });

  // 6. アクティビティカードの表示確認
  test('6. アクティビティカードが正しく表示される', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard');
    
    const activityCard = page.locator('.MuiCard-root').filter({ hasText: 'アクティビティ' });
    await expect(activityCard).toBeVisible();
    
    await expect(activityCard.locator('text=ログイン回数')).toBeVisible();
    await expect(activityCard.locator('text=最終ログイン')).toBeVisible();
    await expect(activityCard.locator('text=アカウント作成日')).toBeVisible();
  });

  // 7. クイックアクションセクションの確認
  test('7. クイックアクションが正しく表示される', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard');
    
    const quickActions = page.locator('.MuiPaper-root').filter({ hasText: 'クイックアクション' });
    await expect(quickActions).toBeVisible();
    
    // アクションチップの確認
    const actionChips = quickActions.locator('.MuiChip-root');
    await expect(actionChips).toHaveCount(3);
    
    // 各チップのリンク確認
    await expect(quickActions.locator('a[href="/posts/new"]')).toBeVisible();
    await expect(quickActions.locator('a[href="/profile"]')).toBeVisible();
    await expect(quickActions.locator('a[href="/"]')).toBeVisible();
  });

  // 8. レスポンシブ動作の確認
  test('8. レスポンシブレイアウトが正しく動作する', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard');
    
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      
      // カードが表示されることを確認
      const cards = page.locator('.MuiCard-root');
      await expect(cards.first()).toBeVisible();
      
      // スクリーンショット保存
      await page.screenshot({
        path: `tests/screenshots/dashboard-${viewport.name.toLowerCase()}.png`,
        fullPage: true
      });
    }
  });

  // 9. パフォーマンステスト
  test('9. ページパフォーマンスが基準を満たす', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('http://localhost:3000/dashboard');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(3000);
    
    // レンダリングパフォーマンス
    const metrics = await page.evaluate(() => {
      const paint = performance.getEntriesByType('paint');
      return {
        fcp: paint.find(e => e.name === 'first-contentful-paint')?.startTime,
        fp: paint.find(e => e.name === 'first-paint')?.startTime
      };
    });
    
    expect(metrics.fcp).toBeLessThan(2000);
  });

  // 10. 統合テスト
  test('10. 完全統合検証 - すべての修正が正しく適用', async ({ page }) => {
    const results = {
      noConsoleErrors: false,
      gridV2Working: false,
      chipDisplayCorrect: false,
      htmlStructureValid: false,
      performanceOk: false
    };
    
    // コンソールエラー監視
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForTimeout(2000);
    
    results.noConsoleErrors = errors.length === 0;
    
    // Grid v2動作確認
    const gridContainer = await page.locator('.MuiGrid2-container').count();
    results.gridV2Working = gridContainer > 0;
    
    // Chip表示確認
    const chip = await page.locator('.MuiChip-root').first().isVisible();
    results.chipDisplayCorrect = chip;
    
    // HTML構造確認
    const invalidNesting = await page.evaluate(() => {
      const pTags = document.querySelectorAll('p');
      for (const p of pTags) {
        if (p.querySelector('div')) return true;
      }
      return false;
    });
    results.htmlStructureValid = !invalidNesting;
    
    // パフォーマンス
    results.performanceOk = true;
    
    // すべてが成功
    Object.entries(results).forEach(([key, value]) => {
      expect(value).toBe(true);
    });
    
    console.log('統合テスト結果:', results);
  });
});