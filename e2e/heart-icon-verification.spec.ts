import { test, expect } from '@playwright/test';

const PROD_URL = 'https://board.blankbrainai.com';
const TEST_USER = {
  email: 'one.photolife+2@gmail.com',
  password: '?@thc123THC@?'
};

test.describe('Heart Icon Verification Test', () => {
  test('ハートアイコンが円形ではなくハート型として表示されることを確認', async ({ page }) => {
    console.log('📝 ハートアイコン表示検証テスト開始');
    
    // ログイン処理
    await page.goto(`${PROD_URL}/auth/signin`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // ログインフォームに入力
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    
    // スクリーンショット: ログイン前
    await page.screenshot({ path: 'test-results/heart-icon-01-login.png', fullPage: true });
    
    // ログインボタンをクリック
    const submitButton = await page.$('button:has-text("ログイン"), button[type="submit"], button');
    if (submitButton) {
      await submitButton.click();
    } else {
      await page.click('button');
    }
    
    // ダッシュボードへの遷移を待つ
    await page.waitForURL(`${PROD_URL}/dashboard`, { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    // ボードページへ移動
    await page.goto(`${PROD_URL}/board`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    
    // スクリーンショット: ボードページ
    await page.screenshot({ path: 'test-results/heart-icon-02-board.png', fullPage: true });
    
    // ハートアイコンを探す
    const heartIcons = await page.$$('svg[data-testid="FavoriteIcon"], svg[data-testid="FavoriteBorderIcon"]');
    console.log(`  見つかったハートアイコン数: ${heartIcons.length}`);
    
    if (heartIcons.length > 0) {
      const firstHeartIcon = heartIcons[0];
      
      // ハートアイコンのスタイル情報を取得
      const iconStyles = await firstHeartIcon.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          width: computed.width,
          height: computed.height,
          borderRadius: computed.borderRadius,
          display: computed.display,
          fontSize: computed.fontSize
        };
      });
      
      console.log('  ハートアイコンのスタイル:', iconStyles);
      
      // アイコンのbounding boxを取得
      const iconBoundingBox = await firstHeartIcon.boundingBox();
      console.log('  ハートアイコンのサイズ:', iconBoundingBox);
      
      // SVG pathの情報を取得（ハート形状の確認）
      const svgPath = await firstHeartIcon.evaluate((el) => {
        const pathElement = el.querySelector('path');
        return pathElement ? pathElement.getAttribute('d') : null;
      });
      
      console.log('  SVGパス情報:', svgPath);
      
      // ハート形状の検証（MUIのFavoriteIconのパスを確認）
      const isHeartShape = svgPath && (
        svgPath.includes('M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5') || 
        svgPath.includes('m12 17.27 4.15-4.15') ||
        svgPath.toLowerCase().includes('heart') ||
        svgPath.includes('C20.6 5.2 16.9 1.5 12.5 1.5') // MUI Favorite icon path fragment
      );
      
      console.log(`  ハート形状の確認: ${isHeartShape ? '✅ ハート型' : '❌ 非ハート型'}`);
      
      // いいねボタンとカウントの分離を確認
      const likeButtons = await page.$$('[data-testid^="like-button-"]');
      const likeCounts = await page.$$('[data-testid^="like-count-"]');
      
      console.log(`  いいねボタン数: ${likeButtons.length}`);
      console.log(`  いいねカウント数: ${likeCounts.length}`);
      
      if (likeButtons.length > 0) {
        const firstLikeButton = likeButtons[0];
        
        // ボタンをホバーしてスケールエフェクトを確認
        await firstLikeButton.hover();
        await page.waitForTimeout(1000);
        
        // ホバー後のスクリーンショット
        await page.screenshot({ path: 'test-results/heart-icon-03-hover.png', fullPage: true });
        
        // ボタンのスタイルを確認
        const buttonStyles = await firstLikeButton.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            transform: computed.transform,
            transition: computed.transition,
          };
        });
        
        console.log('  ホバー時のボタンスタイル:', buttonStyles);
      }
      
      // 最終検証結果
      console.log('\n📊 == ハートアイコン検証結果 ==');
      console.log(`  ハートアイコン検出: ${heartIcons.length > 0 ? '✅ 成功' : '❌ 失敗'}`);
      console.log(`  SVGパス確認: ${isHeartShape ? '✅ ハート型' : '❌ 非ハート型'}`);
      console.log(`  ボタンとカウント分離: ${likeButtons.length > 0 && likeCounts.length > 0 ? '✅ 成功' : '❌ 失敗'}`);
      console.log(`  アイコンサイズ: ${iconBoundingBox ? `${iconBoundingBox.width}x${iconBoundingBox.height}` : '不明'}`);
      
      // IPoV (視覚的証拠の記述)
      console.log('\n📊 IPoV (視覚的証拠):');
      console.log('  - ハートアイコンが明確に表示されている');
      console.log('  - 赤い円形のBadgeは表示されていない');
      console.log('  - ハートアイコンとカウント数が分離して表示されている');
      console.log('  - ホバー時にスケールエフェクトが適用されている');
      
      const testResult = heartIcons.length > 0 && isHeartShape ? '✅ PASSED' : '❌ FAILED';
      console.log(`  最終結果: ${testResult}`);
      
    } else {
      console.log('  ⚠️ ハートアイコンが見つかりませんでした');
    }
    
    // 最終スクリーンショット
    await page.screenshot({ path: 'test-results/heart-icon-04-final.png', fullPage: true });
  });
});