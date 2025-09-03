import { test, expect, devices } from '@playwright/test';

/**
 * レスポンシブデザインテスト
 * 各デバイスサイズでの表示・動作確認
 */

// テスト対象のビューポート設定
const viewports = [
  { name: 'iPhone SE', viewport: { width: 375, height: 667 }, isMobile: true },
  { name: 'iPhone 12', viewport: { width: 390, height: 844 }, isMobile: true },
  { name: 'iPad', viewport: { width: 768, height: 1024 }, isMobile: false },
  { name: 'iPad Pro', viewport: { width: 1024, height: 1366 }, isMobile: false },
  { name: 'Desktop HD', viewport: { width: 1920, height: 1080 }, isMobile: false },
  { name: 'Desktop 4K', viewport: { width: 2560, height: 1440 }, isMobile: false },
];

test.describe('レスポンシブデザイン', () => {
  // 各ビューポートでテストを実行
  for (const device of viewports) {
    test.describe(`${device.name} (${device.viewport.width}x${device.viewport.height})`, () => {
      test.use({
        viewport: device.viewport,
        isMobile: device.isMobile,
      });

      test.beforeEach(async ({ page }) => {
        await page.goto('/board');
      });

      test('ヘッダーの表示', async ({ page }) => {
        const header = page.locator('header');
        await expect(header).toBeVisible();

        if (device.viewport.width < 768) {
          // モバイル: ハンバーガーメニュー
          const hamburger = page.locator('[data-testid="mobile-menu-button"]');
          await expect(hamburger).toBeVisible();
          
          // デスクトップメニューは非表示
          const desktopNav = page.locator('[data-testid="desktop-nav"]');
          await expect(desktopNav).not.toBeVisible();
        } else {
          // デスクトップ: 通常のナビゲーション
          const desktopNav = page.locator('[data-testid="desktop-nav"]');
          await expect(desktopNav).toBeVisible();
          
          // ハンバーガーメニューは非表示
          const hamburger = page.locator('[data-testid="mobile-menu-button"]');
          await expect(hamburger).not.toBeVisible();
        }
      });

      test('投稿一覧のレイアウト', async ({ page }) => {
        const postList = page.locator('[data-testid="post-list"]');
        await expect(postList).toBeVisible();

        if (device.viewport.width < 640) {
          // スマートフォン: 1カラム
          const gridCols = await postList.evaluate(el => 
            window.getComputedStyle(el).gridTemplateColumns
          );
          expect(gridCols).toContain('1fr');
        } else if (device.viewport.width < 1024) {
          // タブレット: 2カラム
          const posts = postList.locator('[data-testid="post-item"]');
          const firstPost = posts.first();
          const secondPost = posts.nth(1);
          
          if (await secondPost.isVisible()) {
            const firstBox = await firstPost.boundingBox();
            const secondBox = await secondPost.boundingBox();
            
            if (firstBox && secondBox) {
              // 2つの投稿が横並び
              expect(secondBox.x).toBeGreaterThan(firstBox.x);
              expect(Math.abs(secondBox.y - firstBox.y)).toBeLessThan(10);
            }
          }
        } else {
          // デスクトップ: 3カラム以上
          const posts = postList.locator('[data-testid="post-item"]');
          const count = await posts.count();
          
          if (count >= 3) {
            const firstPost = posts.first();
            const thirdPost = posts.nth(2);
            const firstBox = await firstPost.boundingBox();
            const thirdBox = await thirdPost.boundingBox();
            
            if (firstBox && thirdBox) {
              // 3つの投稿が横並び
              expect(thirdBox.x).toBeGreaterThan(firstBox.x);
            }
          }
        }
      });

      test('フォームの表示', async ({ page }) => {
        // 新規投稿ボタンをクリック
        await page.click('[data-testid="new-post-button"]');
        
        const dialog = page.locator('[role="dialog"]');
        await expect(dialog).toBeVisible();

        const form = dialog.locator('form');
        const formBox = await form.boundingBox();
        
        if (formBox) {
          if (device.viewport.width < 640) {
            // モバイル: フルスクリーン幅
            expect(formBox.width).toBeGreaterThan(device.viewport.width * 0.9);
          } else {
            // タブレット・デスクトップ: 適切な幅
            expect(formBox.width).toBeLessThan(device.viewport.width * 0.8);
            expect(formBox.width).toBeGreaterThan(300);
          }
        }

        // フォーム要素の配置確認
        const titleInput = form.locator('input[name="title"]');
        const contentTextarea = form.locator('textarea[name="content"]');
        
        await expect(titleInput).toBeVisible();
        await expect(contentTextarea).toBeVisible();
        
        const titleBox = await titleInput.boundingBox();
        const contentBox = await contentTextarea.boundingBox();
        
        if (titleBox && contentBox) {
          // 縦並び
          expect(contentBox.y).toBeGreaterThan(titleBox.y);
        }
      });

      test('タッチ操作の確認（モバイルのみ）', async ({ page }) => {
        if (device.isMobile) {
          const postItem = page.locator('[data-testid="post-item"]').first();
          
          // スワイプ操作のシミュレーション
          const box = await postItem.boundingBox();
          if (box) {
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
            await page.mouse.down();
            await page.mouse.move(box.x + box.width / 2 - 100, box.y + box.height / 2);
            await page.mouse.up();
            
            // スワイプメニューが表示される場合の確認
            const swipeMenu = postItem.locator('[data-testid="swipe-menu"]');
            if (await swipeMenu.isVisible()) {
              await expect(swipeMenu).toBeVisible();
            }
          }
        }
      });

      test('フォントサイズの適切性', async ({ page }) => {
        const title = page.locator('h1').first();
        const bodyText = page.locator('p').first();
        
        const titleFontSize = await title.evaluate(el => 
          parseInt(window.getComputedStyle(el).fontSize)
        );
        const bodyFontSize = await bodyText.evaluate(el => 
          parseInt(window.getComputedStyle(el).fontSize)
        );

        if (device.viewport.width < 640) {
          // モバイル: 読みやすいサイズ
          expect(titleFontSize).toBeGreaterThanOrEqual(20);
          expect(bodyFontSize).toBeGreaterThanOrEqual(14);
        } else {
          // デスクトップ: 適切なサイズ
          expect(titleFontSize).toBeGreaterThanOrEqual(24);
          expect(bodyFontSize).toBeGreaterThanOrEqual(16);
        }
      });

      test('画像の適応', async ({ page }) => {
        const images = page.locator('img');
        const count = await images.count();
        
        for (let i = 0; i < count; i++) {
          const img = images.nth(i);
          const box = await img.boundingBox();
          
          if (box) {
            // 画像がビューポートを超えないこと
            expect(box.width).toBeLessThanOrEqual(device.viewport.width);
            
            // アスペクト比が維持されていること
            const naturalSize = await img.evaluate((el: HTMLImageElement) => ({
              width: el.naturalWidth,
              height: el.naturalHeight
            }));
            
            if (naturalSize.width && naturalSize.height) {
              const naturalRatio = naturalSize.width / naturalSize.height;
              const displayRatio = box.width / box.height;
              expect(Math.abs(naturalRatio - displayRatio)).toBeLessThan(0.1);
            }
          }
        }
      });

      test('スクロール動作', async ({ page }) => {
        // ページの高さを取得
        const pageHeight = await page.evaluate(() => document.body.scrollHeight);
        const viewportHeight = device.viewport.height;
        
        if (pageHeight > viewportHeight) {
          // スクロール可能な場合
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          
          // スクロール位置の確認
          const scrollY = await page.evaluate(() => window.scrollY);
          expect(scrollY).toBeGreaterThan(0);
          
          // スムーススクロールの確認
          await page.evaluate(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          });
          
          await page.waitForTimeout(1000);
          const finalScrollY = await page.evaluate(() => window.scrollY);
          expect(finalScrollY).toBeLessThan(100);
        }
      });

      test('モーダルの表示', async ({ page }) => {
        // 削除ボタンをクリック（確認ダイアログ表示）
        const deleteButton = page.locator('[data-testid="delete-button"]').first();
        if (await deleteButton.isVisible()) {
          await deleteButton.click();
          
          const modal = page.locator('[role="dialog"]');
          await expect(modal).toBeVisible();
          
          const modalBox = await modal.boundingBox();
          if (modalBox) {
            // モーダルが画面中央に表示
            const centerX = device.viewport.width / 2;
            const centerY = device.viewport.height / 2;
            const modalCenterX = modalBox.x + modalBox.width / 2;
            const modalCenterY = modalBox.y + modalBox.height / 2;
            
            expect(Math.abs(modalCenterX - centerX)).toBeLessThan(50);
            expect(Math.abs(modalCenterY - centerY)).toBeLessThan(100);
          }
        }
      });
    });
  }

  // 向き変更のテスト（モバイルデバイスのみ）
  test.describe('画面回転', () => {
    test('縦向きから横向きへの変更', async ({ browser }) => {
      // iPhone 12のコンテキストを作成
      const context = await browser.newContext(devices['iPhone 12']);
      const page = await context.newPage();
      await page.goto('/board');
      
      // 縦向きでの表示確認
      const portraitBox = await page.locator('body').boundingBox();
      expect(portraitBox?.width).toBeLessThan(portraitBox?.height || 0);
      
      // 横向きに変更
      await context.setViewportSize({ width: 844, height: 390 });
      
      // レイアウトが調整されることを確認
      const landscapeBox = await page.locator('body').boundingBox();
      expect(landscapeBox?.width).toBeGreaterThan(landscapeBox?.height || 0);
      
      // ナビゲーションが適切に表示
      const nav = page.locator('nav');
      await expect(nav).toBeVisible();
      
      await context.close();
    });
  });
});