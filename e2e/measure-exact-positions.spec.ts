import { test, expect } from '@playwright/test';

test.describe('Exact Position Measurement', () => {
  test('measure sidebar and content positions', async ({ page }) => {
    // デスクトップサイズに設定
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // ログイン
    await page.goto('https://board.blankbrainai.com/auth/signin');
    await page.fill('input[name="email"]', 'one.photolife+2@gmail.com');
    await page.fill('input[name="password"]', '?@thc123THC@?');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    // サイドバーの最初のメニューアイテム（ダッシュボード）の位置を測定
    const dashboardMenuItem = await page.locator('li:has-text("ダッシュボード")').first();
    const menuBounds = await dashboardMenuItem.boundingBox();
    
    // メインコンテンツのヘッダータイトルの位置を測定
    const mainTitle = await page.locator('h4:has-text("ダッシュボード")').last();
    const titleBounds = await mainTitle.boundingBox();
    
    console.log('=== Position Measurements ===');
    console.log('Menu Item (Dashboard):');
    console.log(`  Top: ${menuBounds?.y}px`);
    console.log(`  Height: ${menuBounds?.height}px`);
    console.log(`  Center Y: ${menuBounds ? menuBounds.y + menuBounds.height/2 : 0}px`);
    
    console.log('Main Content Title:');
    console.log(`  Top: ${titleBounds?.y}px`);
    console.log(`  Height: ${titleBounds?.height}px`);
    console.log(`  Center Y: ${titleBounds ? titleBounds.y + titleBounds.height/2 : 0}px`);
    
    console.log('Vertical Difference:');
    console.log(`  Top difference: ${Math.abs((menuBounds?.y || 0) - (titleBounds?.y || 0))}px`);
    console.log(`  Center difference: ${Math.abs(
      ((menuBounds?.y || 0) + (menuBounds?.height || 0)/2) - 
      ((titleBounds?.y || 0) + (titleBounds?.height || 0)/2)
    )}px`);
    
    // 注釈付きスクリーンショット用のマーカーを追加
    await page.evaluate((menuY, titleY) => {
      // 赤い線でメニューアイテムの位置を示す
      const menuLine = document.createElement('div');
      menuLine.style.position = 'fixed';
      menuLine.style.top = `${menuY}px`;
      menuLine.style.left = '0';
      menuLine.style.width = '100%';
      menuLine.style.height = '2px';
      menuLine.style.backgroundColor = 'red';
      menuLine.style.zIndex = '10000';
      document.body.appendChild(menuLine);
      
      // 青い線でタイトルの位置を示す
      const titleLine = document.createElement('div');
      titleLine.style.position = 'fixed';
      titleLine.style.top = `${titleY}px`;
      titleLine.style.left = '0';
      titleLine.style.width = '100%';
      titleLine.style.height = '2px';
      titleLine.style.backgroundColor = 'blue';
      titleLine.style.zIndex = '10000';
      document.body.appendChild(titleLine);
    }, menuBounds?.y || 0, titleBounds?.y || 0);
    
    await page.screenshot({ 
      path: 'screenshots/position-measurement.png',
      fullPage: false
    });
  });
});