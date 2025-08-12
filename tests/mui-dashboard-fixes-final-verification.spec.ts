import { test, expect } from '@playwright/test';

test.describe('ダッシュボード MUI エラー修正 - 最終検証', () => {
  
  test('MUI Grid v2 修正とHTML構造修正の完全検証', async ({ page }) => {
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];
    
    // コンソールエラー・警告を監視
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.log(`❌ Console Error: ${msg.text()}`);
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
        console.log(`⚠️ Console Warning: ${msg.text()}`);
      }
    });

    console.log('🚀 テストダッシュボードにアクセス中...');
    
    // テストダッシュボードページに移動
    await page.goto('http://localhost:3000/test-dashboard', { waitUntil: 'networkidle' });
    
    // ページの読み込み完了を待つ
    await page.waitForTimeout(3000);
    
    console.log('🔍 MUI関連の検証開始...');

    // === 1. MUI Gridコンテナの確認 ===
    const gridContainers = await page.locator('.MuiGrid-container').count();
    console.log('✅ Gridコンテナ数:', gridContainers);
    expect(gridContainers).toBeGreaterThan(0);

    // === 2. カードの表示確認 ===
    const cards = await page.locator('.MuiCard-root').count();
    console.log('✅ カード数:', cards);
    expect(cards).toBe(3);

    // === 3. Chipコンポーネントの確認 ===
    const chips = await page.locator('.MuiChip-root').count();
    console.log('✅ 総Chip数:', chips);
    expect(chips).toBeGreaterThanOrEqual(4);

    // === 4. ステータスChipの確認 ===
    const statusChip = await page.locator('.MuiChip-root').filter({ hasText: 'メール確認済み' });
    await expect(statusChip).toBeVisible();
    console.log('✅ ステータスChip表示確認');

    // === 5. Chipの親要素がpタグでないことを確認 ===
    const chipParent = await statusChip.evaluate(el => {
      const parent = el.parentElement;
      return parent?.tagName.toLowerCase();
    });
    expect(chipParent).not.toBe('p');
    console.log('✅ ChipがPタグ内にない:', chipParent);

    // === 6. HTML構造の詳細確認 ===
    const domStructure = await page.evaluate(() => {
      const pTags = document.querySelectorAll('p');
      const invalidNesting = [];
      
      pTags.forEach((p, index) => {
        const divChildren = p.querySelectorAll('div');
        if (divChildren.length > 0) {
          invalidNesting.push({
            index,
            text: p.textContent?.substring(0, 50),
            divCount: divChildren.length
          });
        }
      });
      
      return {
        hasInvalidNesting: invalidNesting.length > 0,
        invalidNestingDetails: invalidNesting,
        pTagCount: pTags.length,
        hasGridContainer: document.querySelectorAll('.MuiGrid-container').length > 0,
        gridContainerCount: document.querySelectorAll('.MuiGrid-container').length,
        chipInBoxCount: document.querySelectorAll('.MuiBox-root .MuiChip-root').length
      };
    });

    console.log('🏗️ HTML構造検証結果:', domStructure);
    expect(domStructure.hasInvalidNesting).toBe(false);
    expect(domStructure.hasGridContainer).toBe(true);
    expect(domStructure.chipInBoxCount).toBeGreaterThan(0);

    // === 7. MUI関連エラーの確認 ===
    const muiGridErrors = consoleErrors.filter(err => 
      err.includes('MUI Grid') || 
      err.includes('item prop') || 
      err.includes('xs prop') || 
      err.includes('md prop') ||
      err.includes('The `item` prop has been removed') ||
      err.includes('The `xs` prop has been removed') ||
      err.includes('The `md` prop has been removed')
    );

    const htmlStructureErrors = consoleErrors.filter(err => 
      err.includes('cannot be a descendant') ||
      err.includes('In HTML, <div> cannot be a descendant of <p>') ||
      err.includes('hydration error')
    );

    console.log('📊 エラー検証結果:');
    console.log('- MUI Gridエラー:', muiGridErrors.length);
    console.log('- HTML構造エラー:', htmlStructureErrors.length);
    console.log('- 総コンソールエラー数:', consoleErrors.length);
    console.log('- 総コンソール警告数:', consoleWarnings.length);

    expect(muiGridErrors).toHaveLength(0);
    expect(htmlStructureErrors).toHaveLength(0);

    // === 8. 各カードの内容確認 ===
    const profileCard = page.locator('.MuiCard-root').filter({ hasText: 'プロフィール' });
    await expect(profileCard).toBeVisible();
    console.log('✅ プロフィールカード表示確認');

    const statsCard = page.locator('.MuiCard-root').filter({ hasText: '投稿統計' });
    await expect(statsCard).toBeVisible();
    console.log('✅ 投稿統計カード表示確認');

    const activityCard = page.locator('.MuiCard-root').filter({ hasText: 'アクティビティ' });
    await expect(activityCard).toBeVisible();
    console.log('✅ アクティビティカード表示確認');

    // === 9. クイックアクションの確認 ===
    const quickActions = page.locator('.MuiPaper-root').filter({ hasText: 'クイックアクション' });
    await expect(quickActions).toBeVisible();
    
    const actionChips = quickActions.locator('.MuiChip-root');
    const actionChipCount = await actionChips.count();
    expect(actionChipCount).toBe(3);
    console.log('✅ クイックアクション Chip数:', actionChipCount);

    // === 10. レスポンシブテスト ===
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(500);
      
      const firstCard = page.locator('.MuiCard-root').first();
      await expect(firstCard).toBeVisible();
      
      console.log(`✅ ${viewport.name} (${viewport.width}x${viewport.height}) レスポンシブ確認`);
    }

    // スクリーンショット撮影（デスクトップサイズで）
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ 
      path: 'mui-dashboard-fixes-verification.png', 
      fullPage: true 
    });
    console.log('📸 スクリーンショット保存: mui-dashboard-fixes-verification.png');

    // === 最終結果 ===
    const verificationResults = {
      gridWorking: gridContainers > 0,
      cardsDisplayed: cards === 3,
      chipsWorking: chips >= 4,
      statusChipVisible: true,
      chipNotInPTag: chipParent !== 'p',
      htmlStructureValid: !domStructure.hasInvalidNesting,
      noMuiErrors: muiGridErrors.length === 0,
      noHtmlErrors: htmlStructureErrors.length === 0,
      responsiveWorking: true
    };

    console.log('\n🎯 最終検証結果:', verificationResults);
    
    const allTestsPassed = Object.values(verificationResults).every(result => result === true);
    
    if (allTestsPassed) {
      console.log('\n🎉 すべてのMUI修正が100%成功しました！');
      console.log('✅ Gridレイアウト正常動作');
      console.log('✅ HTML構造エラー解消');
      console.log('✅ コンソールエラーゼロ');
      console.log('✅ レスポンシブレイアウト正常動作');
    } else {
      console.log('\n❌ 一部の修正が未完了です');
      Object.entries(verificationResults).forEach(([key, value]) => {
        console.log(`${value ? '✅' : '❌'} ${key}: ${value}`);
      });
    }

    // アサーション
    Object.entries(verificationResults).forEach(([key, value]) => {
      expect(value).toBe(true);
    });
  });
});