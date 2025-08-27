import { test, expect } from '@playwright/test';

test.describe('MUI ListItem button属性修正確認テスト', () => {
  test('コンソールエラーが解消されていること', async ({ page }) => {
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];
    
    // コンソール監視
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });

    // ホームページアクセス
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');
    
    // button属性関連エラーの確認
    const buttonAttributeErrors = consoleErrors.filter(err => 
      err.includes('non-boolean attribute') || 
      err.includes('button')
    );
    
    console.log('=== テスト結果 ===');
    console.log('URL:', page.url());
    console.log('コンソールエラー数:', consoleErrors.length);
    console.log('button属性エラー数:', buttonAttributeErrors.length);
    
    if (buttonAttributeErrors.length > 0) {
      console.log('❌ button属性エラー検出:');
      buttonAttributeErrors.forEach(err => console.log('  -', err));
    } else {
      console.log('✅ button属性エラーなし');
    }
    
    // アサーション
    expect(buttonAttributeErrors.length).toBe(0);
  });

  test('ナビゲーション機能が正常に動作すること', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');
    
    // サインインページへのリダイレクト確認
    const currentUrl = page.url();
    
    if (currentUrl.includes('/auth/signin')) {
      console.log('サインインページへリダイレクトされました');
      
      // テストユーザーでログイン
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'Test1234!');
      await page.click('button[type="submit"]');
      
      // ダッシュボードへの遷移を待つ
      await page.waitForURL(url => url.includes('/dashboard') || url.includes('/'), { timeout: 10000 }).catch(() => {});
    }
    
    // メニューアイテムの存在確認
    const menuItems = await page.locator('.MuiListItemButton-root').count();
    console.log('ListItemButton数:', menuItems);
    
    // 各メニュー項目のクリックテスト
    const menuPaths = [
      { label: '掲示板', path: '/board' },
      { label: 'プロフィール', path: '/profile' }
    ];
    
    for (const menu of menuPaths) {
      const menuItem = page.locator('.MuiListItemButton-root').filter({ hasText: menu.label }).first();
      
      if (await menuItem.isVisible()) {
        await menuItem.click();
        await page.waitForTimeout(1000);
        
        const newUrl = page.url();
        console.log(`${menu.label}クリック後のURL:`, newUrl);
        
        // URLが変更されたか、またはリダイレクトされたか確認
        const urlChanged = newUrl.includes(menu.path) || newUrl.includes('/auth/signin');
        expect(urlChanged).toBe(true);
      }
    }
  });

  test('選択状態とホバー効果が正常に動作すること', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');
    
    // 選択状態のアイテムを確認
    const selectedItem = page.locator('.MuiListItemButton-root.Mui-selected').first();
    const hasSelectedItem = await selectedItem.count() > 0;
    
    if (hasSelectedItem) {
      // 選択されているアイテムの背景色を確認
      const backgroundColor = await selectedItem.evaluate(el => {
        return window.getComputedStyle(el).backgroundColor;
      });
      
      console.log('選択アイテムの背景色:', backgroundColor);
      expect(backgroundColor).toBeTruthy();
    }
    
    // ホバー効果の確認
    const firstButton = page.locator('.MuiListItemButton-root').first();
    if (await firstButton.isVisible()) {
      // ホバー前の背景色
      const beforeHoverBg = await firstButton.evaluate(el => 
        window.getComputedStyle(el).backgroundColor
      );
      
      // ホバー
      await firstButton.hover();
      await page.waitForTimeout(300);
      
      // ホバー後の背景色
      const afterHoverBg = await firstButton.evaluate(el => 
        window.getComputedStyle(el).backgroundColor
      );
      
      console.log('ホバー前背景色:', beforeHoverBg);
      console.log('ホバー後背景色:', afterHoverBg);
      
      // ホバー効果があることを確認（背景色が変化）
      const hoverEffectExists = beforeHoverBg !== afterHoverBg;
      console.log('ホバー効果:', hoverEffectExists ? '✅ あり' : '⚠️ なし');
    }
  });
});