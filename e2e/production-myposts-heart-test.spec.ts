import { test, expect } from '@playwright/test';

const PROD_URL = 'https://board.blankbrainai.com';
const TEST_USER = {
  email: 'one.photolife+2@gmail.com',
  password: '?@thc123THC@?'
};

test.describe('Production MyPosts Heart Icon Test', () => {
  test('My Postsページでハートアイコンの色を確認', async ({ page }) => {
    console.log('📝 My Postsページ ハートアイコン色確認テスト開始');
    
    // ログイン処理
    await page.goto(`${PROD_URL}/auth/signin`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // ログインフォームに入力
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    
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
    
    // My Postsページへ移動
    await page.goto(`${PROD_URL}/my-posts`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    
    // スクリーンショット: My Postsページ
    await page.screenshot({ path: 'test-results/myposts-heart-01.png', fullPage: true });
    
    // 投稿カードを探す
    const postCards = await page.$$('.MuiCard-root');
    console.log(`  投稿カード数: ${postCards.length}`);
    
    // ハートアイコンを探す
    const heartIcons = await page.$$('svg[data-testid="FavoriteIcon"], svg[data-testid="FavoriteBorderIcon"]');
    console.log(`  見つかったハートアイコン数: ${heartIcons.length}`);
    
    if (heartIcons.length > 0) {
      // 最初のハートアイコンの色を確認
      const firstIcon = heartIcons[0];
      const color = await firstIcon.evaluate(el => {
        const computedStyle = window.getComputedStyle(el);
        return {
          fill: computedStyle.fill,
          color: computedStyle.color,
          stroke: computedStyle.stroke
        };
      });
      
      console.log('  ハートアイコンの色情報:');
      console.log(`    fill: ${color.fill}`);
      console.log(`    color: ${color.color}`);
      console.log(`    stroke: ${color.stroke}`);
      
      // 色が灰色（#6b7280）であることを確認
      const isGray = color.fill?.includes('107, 114, 128') || 
                     color.fill?.includes('#6b7280') ||
                     color.color?.includes('107, 114, 128') || 
                     color.color?.includes('#6b7280');
      
      const isRed = color.fill?.includes('244, 67, 54') || 
                    color.fill?.includes('#f44336') ||
                    color.fill?.includes('239, 83, 80') ||
                    color.fill?.includes('#ef5350') ||
                    color.fill?.includes('red') ||
                    color.color?.includes('244, 67, 54') || 
                    color.color?.includes('#f44336') ||
                    color.color?.includes('239, 83, 80') ||
                    color.color?.includes('#ef5350') ||
                    color.color?.includes('red');
      
      console.log(`  灰色判定: ${isGray ? '✅' : '❌'}`);
      console.log(`  赤色判定: ${isRed ? '❌ まだ赤色です' : '✅ 赤色ではありません'}`);
      
      // 検証結果
      if (isGray && !isRed) {
        console.log('\\n✅ SUCCESS: ハートアイコンは灰色で表示されています');
      } else if (isRed) {
        console.log('\\n❌ FAILED: ハートアイコンはまだ赤色で表示されています');
      } else {
        console.log(`\\n⚠️ UNKNOWN: ハートアイコンの色が判定できません: ${color.fill || color.color}`);
      }
    } else {
      console.log('  ⚠️ ハートアイコンが見つかりませんでした');
      
      // ボードページに移動して確認
      console.log('\\nボードページに移動して確認...');
      await page.goto(`${PROD_URL}/board`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(5000);
      
      await page.screenshot({ path: 'test-results/myposts-heart-02-board.png', fullPage: true });
      
      const boardHeartIcons = await page.$$('svg[data-testid="FavoriteIcon"], svg[data-testid="FavoriteBorderIcon"]');
      console.log(`  ボードページのハートアイコン数: ${boardHeartIcons.length}`);
      
      if (boardHeartIcons.length > 0) {
        const firstBoardIcon = boardHeartIcons[0];
        const boardColor = await firstBoardIcon.evaluate(el => {
          const computedStyle = window.getComputedStyle(el);
          return {
            fill: computedStyle.fill,
            color: computedStyle.color
          };
        });
        
        console.log('  ボードページのハートアイコンの色:');
        console.log(`    fill: ${boardColor.fill}`);
        console.log(`    color: ${boardColor.color}`);
        
        const isBoardGray = boardColor.fill?.includes('107, 114, 128') || 
                           boardColor.fill?.includes('#6b7280') ||
                           boardColor.color?.includes('107, 114, 128') || 
                           boardColor.color?.includes('#6b7280');
        
        const isBoardRed = boardColor.fill?.includes('244, 67, 54') || 
                          boardColor.fill?.includes('#f44336') ||
                          boardColor.fill?.includes('red') ||
                          boardColor.color?.includes('244, 67, 54') || 
                          boardColor.color?.includes('#f44336') ||
                          boardColor.color?.includes('red');
        
        console.log(`  ボードページ灰色判定: ${isBoardGray ? '✅' : '❌'}`);
        console.log(`  ボードページ赤色判定: ${isBoardRed ? '❌ まだ赤色です' : '✅ 赤色ではありません'}`);
      }
    }
  });
});