import { test } from '@playwright/test';

const BASE_URL = 'https://blankinai-board.vercel.app';

test('本番環境URLパス確認', async ({ page }) => {
  test.setTimeout(30000);
  
  // 試すべきURLパスのリスト
  const paths = [
    '/',
    '/signin',
    '/login',
    '/auth/signin',
    '/auth/login',
    '/api/auth/signin',
    '/dashboard',
    '/board'
  ];
  
  console.log('🔍 本番環境のURLパスを確認中...\n');
  
  for (const path of paths) {
    const url = `${BASE_URL}${path}`;
    
    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
      const status = response?.status() || 'unknown';
      const title = await page.title();
      const finalUrl = page.url();
      
      console.log(`📍 ${path}`);
      console.log(`   Status: ${status}`);
      console.log(`   Title: ${title}`);
      console.log(`   Final URL: ${finalUrl}`);
      
      // ログインフォームがあるか確認
      const hasEmailInput = await page.locator('input[type="email"], input[name="email"], input[id="email"]').first().isVisible({ timeout: 1000 }).catch(() => false);
      const hasPasswordInput = await page.locator('input[type="password"], input[name="password"], input[id="password"]').first().isVisible({ timeout: 1000 }).catch(() => false);
      
      if (hasEmailInput && hasPasswordInput) {
        console.log(`   ✅ ログインフォームを発見！`);
        
        // スクリーンショットを保存
        await page.screenshot({ path: `production-login-page.png` });
        console.log(`   📸 スクリーンショット保存: production-login-page.png`);
      }
      
      console.log('');
      
    } catch (error) {
      console.log(`❌ ${path} - エラー: ${error.message}\n`);
    }
  }
  
  console.log('✅ URL確認完了');
});