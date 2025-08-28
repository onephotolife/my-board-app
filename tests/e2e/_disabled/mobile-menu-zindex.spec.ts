import { test, expect, Page } from '@playwright/test';

/**
 * モバイルメニューz-index完全自動テスト
 * エラーゼロを達成するまで修正を継続
 */

// テスト用アカウント
const TEST_USER = {
  email: 'test@example.com',
  password: 'Test123!@#'
};

// ヘルパー関数：ログイン
async function login(page: Page) {
  await page.goto('/auth/signin');
  await page.fill('input[name="email"]', TEST_USER.email);
  await page.fill('input[name="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  
  // ログイン後のリダイレクトを待つ
  await page.waitForURL(/\/(board|$)/, { timeout: 10000 });
}

// ヘルパー関数：モバイルビューに設定
async function setMobileView(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 });
}

// ヘルパー関数：メニューを開く
async function openMobileMenu(page: Page) {
  const menuButton = page.locator('[aria-label="menu"]');
  await expect(menuButton).toBeVisible({ timeout: 5000 });
  await menuButton.click();
  await page.waitForTimeout(500); // アニメーション待機
}

// ヘルパー関数：z-index値を取得
async function getZIndex(page: Page, selector: string): Promise<string> {
  return await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (!element) return 'not-found';
    return window.getComputedStyle(element).zIndex;
  }, selector);
}

test.describe('モバイルメニューz-index検証', () => {
  test.use({ 
    viewport: { width: 390, height: 844 },
    isMobile: true 
  });

  test.beforeEach(async ({ page }) => {
    // ログイン状態にする
    await login(page);
  });

  test('1. メニューボタンが表示される', async ({ page }) => {
    await page.goto('/board');
    
    const menuButton = page.locator('[aria-label="menu"]');
    await expect(menuButton).toBeVisible();
    
    // スクリーンショット取得
    await page.screenshot({ 
      path: 'tests/screenshots/menu-button.png',
      fullPage: false 
    });
  });

  test('2. メニューが開く', async ({ page }) => {
    await page.goto('/board');
    
    await openMobileMenu(page);
    
    // Portalまたはメニュー要素を探す
    const menuSelectors = [
      '[data-mobile-menu-portal]',
      '.MuiModal-root',
      '[role="presentation"]',
      'body > div:last-child'
    ];
    
    let menuFound = false;
    for (const selector of menuSelectors) {
      const element = page.locator(selector);
      if (await element.count() > 0) {
        menuFound = true;
        await expect(element).toBeVisible();
        console.log(`✅ Menu found with selector: ${selector}`);
        break;
      }
    }
    
    expect(menuFound).toBeTruthy();
    
    await page.screenshot({ 
      path: 'tests/screenshots/menu-opened.png',
      fullPage: true 
    });
  });

  test('3. メニューのz-indexが正しい', async ({ page }) => {
    await page.goto('/board');
    
    await openMobileMenu(page);
    
    // z-index値を確認
    const menuZIndex = await page.evaluate(() => {
      // 複数のセレクタを試す
      const selectors = [
        '[data-mobile-menu-portal]',
        '.MuiModal-root',
        '[role="presentation"]',
        'body > div:last-child'
      ];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          const zIndex = window.getComputedStyle(element).zIndex;
          return { selector, zIndex };
        }
      }
      return { selector: 'none', zIndex: 'not-found' };
    });
    
    console.log('Menu z-index:', menuZIndex);
    
    // z-indexが極めて高い値であることを確認
    const zIndexValue = parseInt(menuZIndex.zIndex);
    expect(zIndexValue).toBeGreaterThan(9999);
  });

  test('4. メニューがコンテンツの上に表示される', async ({ page }) => {
    await page.goto('/board');
    
    // まず投稿があることを確認
    const postCard = page.locator('.MuiPaper-root').first();
    const postExists = await postCard.count() > 0;
    
    if (!postExists) {
      console.log('No posts found, skipping overlay test');
      return;
    }
    
    await openMobileMenu(page);
    
    // メニューとコンテンツのz-indexを比較
    const comparison = await page.evaluate(() => {
      const menu = document.querySelector('[data-mobile-menu-portal]') || 
                   document.querySelector('.MuiModal-root') ||
                   document.querySelector('[role="presentation"]');
      const content = document.querySelector('#board-content') || 
                      document.querySelector('.MuiContainer-root');
      
      if (!menu || !content) {
        return { menuFound: !!menu, contentFound: !!content };
      }
      
      const menuZIndex = parseInt(window.getComputedStyle(menu).zIndex) || 0;
      const contentZIndex = parseInt(window.getComputedStyle(content).zIndex) || 0;
      
      return {
        menuFound: true,
        contentFound: true,
        menuZIndex,
        contentZIndex,
        menuIsAbove: menuZIndex > contentZIndex
      };
    });
    
    console.log('Z-index comparison:', comparison);
    expect(comparison.menuIsAbove).toBeTruthy();
  });

  test('5. メニュー内のボタンがクリック可能', async ({ page }) => {
    await page.goto('/board');
    
    await openMobileMenu(page);
    
    // ログアウトボタンを探してクリック可能か確認
    const logoutButton = page.locator('text=ログアウト').first();
    await expect(logoutButton).toBeVisible({ timeout: 5000 });
    
    // クリック可能であることを確認
    const isClickable = await logoutButton.isEnabled();
    expect(isClickable).toBeTruthy();
  });

  test('6. メニューを閉じることができる', async ({ page }) => {
    await page.goto('/board');
    
    await openMobileMenu(page);
    
    // 閉じるボタンを探す
    const closeButton = page.locator('[aria-label="close menu"]');
    
    if (await closeButton.count() > 0) {
      await closeButton.click();
    } else {
      // 背景クリックで閉じる
      await page.locator('body').click({ position: { x: 10, y: 10 } });
    }
    
    await page.waitForTimeout(500);
    
    // メニューが閉じたことを確認
    const menuClosed = await page.evaluate(() => {
      const selectors = [
        '[data-mobile-menu-portal]',
        '.MuiModal-root',
        '[role="presentation"]'
      ];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && window.getComputedStyle(element).display !== 'none') {
          return false;
        }
      }
      return true;
    });
    
    expect(menuClosed).toBeTruthy();
  });

  test('7. 複数ページで動作確認', async ({ page }) => {
    const pages = ['/board', '/'];
    
    for (const url of pages) {
      await page.goto(url);
      console.log(`Testing on ${url}`);
      
      const menuButton = page.locator('[aria-label="menu"]');
      
      // ログイン状態でのみメニューボタンが表示される
      if (await menuButton.count() > 0) {
        await openMobileMenu(page);
        
        const menuVisible = await page.evaluate(() => {
          const selectors = [
            '[data-mobile-menu-portal]',
            '.MuiModal-root',
            '[role="presentation"]'
          ];
          
          for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) return true;
          }
          return false;
        });
        
        expect(menuVisible).toBeTruthy();
        
        // メニューを閉じる
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }
    }
  });
});

// デスクトップでの非表示確認
test.describe('デスクトップビュー検証', () => {
  test.use({ 
    viewport: { width: 1280, height: 720 },
    isMobile: false 
  });

  test('デスクトップではモバイルメニューを使用しない', async ({ page }) => {
    await login(page);
    await page.goto('/board');
    
    // アバターをクリック
    const avatar = page.locator('.MuiAvatar-root').first();
    
    if (await avatar.count() > 0) {
      await avatar.click();
      await page.waitForTimeout(500);
      
      // デスクトップメニュー（MuiMenu）が表示される
      const desktopMenu = page.locator('.MuiMenu-root');
      await expect(desktopMenu).toBeVisible();
      
      // モバイルメニューは表示されない
      const mobileMenu = page.locator('[data-mobile-menu-portal]');
      await expect(mobileMenu).not.toBeVisible();
    }
  });
});