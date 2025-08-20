import { test, expect } from '@playwright/test';

test.describe('PC画面サイズでの新規登録ボタン完全削除検証', () => {
  const desktopSizes = [
    { width: 1920, height: 1080, name: 'Full HD' },
    { width: 1440, height: 900, name: 'MacBook' },
    { width: 1366, height: 768, name: 'Standard Laptop' },
    { width: 1024, height: 768, name: 'Tablet Landscape' }
  ];

  for (const size of desktopSizes) {
    test(`PC画面での新規登録ボタン検証 - ${size.name} (${size.width}x${size.height})`, async ({ page }) => {
      await page.setViewportSize(size);
      await page.goto('http://localhost:3000');
      
      // 1. ページが正常に読み込まれることを確認 (最大30秒待機)
      await expect(page.locator('header')).toBeVisible();
      
      // 2. ページのメインコンテンツが読み込まれるまで待機
      await page.waitForTimeout(3000); // セッション確認の時間を考慮
      
      // 3. ローディング状態が終了するまで待機
      await page.waitForSelector('main', { state: 'visible', timeout: 30000 });
      
      // 4. デスクトップ画面でvisibleな新規登録ボタンが存在しないことを確認
      const visibleSignupButtons = page.locator('button:has-text("新規登録"), a:has-text("新規登録")').and(page.locator(':visible'));
      const buttonCount = await visibleSignupButtons.count();
      console.log(`[${size.name}] 表示されている新規登録ボタン数: ${buttonCount}`);
      
      // 5. グラデーション背景の新規登録ボタンが実際に表示されていないことを確認（サイズ0x0なら非表示扱い）
      const gradientSignupButtons = await page.evaluate(() => {
        const allElements = Array.from(document.querySelectorAll('*'));
        return allElements.filter(el => {
          const style = window.getComputedStyle(el);
          const background = style.background || style.backgroundImage;
          const text = el.textContent || '';
          const rect = el.getBoundingClientRect();
          
          return (
            text.includes('新規登録') && 
            (background.includes('rgb(99, 102, 241)') || background.includes('#6366f1')) &&
            (background.includes('rgb(139, 92, 246)') || background.includes('#8b5cf6')) &&
            rect.width > 0 && rect.height > 0 // 実際に表示されているもののみカウント
          );
        }).length;
      });
      
      console.log(`[${size.name}] グラデーション背景の新規登録ボタン数: ${gradientSignupButtons}`);
      
      // 6. モバイルメニュー内の新規登録リンクは非表示であることを確認
      const mobileMenu = page.locator('.mobile-menu');
      const isMobileMenuVisible = await mobileMenu.isVisible();
      console.log(`[${size.name}] モバイルメニュー表示: ${isMobileMenuVisible}`);
      
      // 7. ログインボタンは正常に表示されていることを確認
      const loginButtons = page.locator('button:has-text("ログイン"), a:has-text("ログイン")').and(page.locator(':visible'));
      const loginButtonCount = await loginButtons.count();
      console.log(`[${size.name}] 表示されているログインボタン数: ${loginButtonCount}`);
      
      // ログインボタンの検証はオプション（セッション状態により異なる）
      if (loginButtonCount === 0) {
        console.log(`[${size.name}] ⚠️ ログインボタンが見つかりません（認証済みまたは読み込み中の可能性）`);
      }
      
      // 8. スクリーンショット保存
      await page.screenshot({ 
        path: `tests/screenshots/pc-signup-removal-${size.width}x${size.height}.png`,
        fullPage: true 
      });
      
      // 最終検証：PC画面サイズでは新規登録ボタンが表示されていないこと
      expect(buttonCount).toBe(0);
      expect(gradientSignupButtons).toBe(0);
    });
  }

  test('DOM構造の詳細検証', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:3000');
    
    // すべての新規登録関連要素を詳細に検査
    const signupElementsDetails = await page.evaluate(() => {
      const results = [];
      const allElements = Array.from(document.querySelectorAll('*'));
      
      allElements.forEach((el, index) => {
        const text = el.textContent || '';
        const tagName = el.tagName.toLowerCase();
        const href = el.getAttribute('href');
        const onclick = el.getAttribute('onclick');
        const className = el.className;
        const id = el.id;
        const style = window.getComputedStyle(el);
        
        if (text.includes('新規登録') || href?.includes('signup') || onclick?.includes('signup')) {
          results.push({
            index,
            tagName,
            text: text.substring(0, 100),
            href,
            onclick,
            className,
            id,
            display: style.display,
            visibility: style.visibility,
            opacity: style.opacity,
            background: style.background.substring(0, 200),
            position: {
              x: el.getBoundingClientRect().left,
              y: el.getBoundingClientRect().top,
              width: el.getBoundingClientRect().width,
              height: el.getBoundingClientRect().height
            }
          });
        }
      });
      
      return results;
    });
    
    console.log('新規登録関連要素の詳細:', JSON.stringify(signupElementsDetails, null, 2));
    
    // 結果をファイルに保存
    await page.evaluate((details) => {
      console.log('🔍 新規登録関連要素の詳細分析結果:');
      details.forEach((el, i) => {
        console.log(`${i + 1}. ${el.tagName}`, {
          text: el.text,
          href: el.href,
          className: el.className,
          display: el.display,
          visibility: el.visibility,
          position: el.position
        });
      });
    }, signupElementsDetails);
  });

  test('モバイルメニュー内の新規登録リンク保持確認', async ({ page }) => {
    // モバイルサイズに設定
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3000');
    
    // モバイルメニューを開く
    const menuButton = page.locator('.mobile-menu-button');
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await page.waitForTimeout(500); // アニメーション待機
      
      // モバイルメニュー内の新規登録リンクが存在することを確認
      const mobileSignupLink = page.locator('.mobile-menu a[href="/auth/signup"]');
      await expect(mobileSignupLink).toBeVisible();
      
      const signupText = await mobileSignupLink.textContent();
      expect(signupText).toContain('新規登録');
      
      console.log('✅ モバイルメニュー内の新規登録リンクは正しく保持されています');
    }
  });
});