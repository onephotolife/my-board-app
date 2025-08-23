import { test, expect } from '@playwright/test';

const PROD_URL = 'https://board.blankbrainai.com';

test('Check login URL structure', async ({ page }) => {
  // ルートページにアクセス
  await page.goto(PROD_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  
  // スクリーンショット: ルートページ
  await page.screenshot({ path: 'test-results/check-root-page.png', fullPage: true });
  
  // ログインリンクを探す
  const loginLink = await page.$('a:has-text("ログイン"), a:has-text("Login"), a:has-text("Sign in"), a[href*="login"], a[href*="signin"]');
  
  if (loginLink) {
    const href = await loginLink.getAttribute('href');
    console.log('ログインリンク発見:', href);
    
    await loginLink.click();
    await page.waitForTimeout(3000);
    
    console.log('現在のURL:', page.url());
    
    // スクリーンショット: ログインページ
    await page.screenshot({ path: 'test-results/check-login-page.png', fullPage: true });
  } else {
    console.log('ログインリンクが見つかりません');
    
    // 直接既知のURLパターンを試す
    const possiblePaths = ['/signin', '/auth/signin', '/auth', '/login'];
    
    for (const path of possiblePaths) {
      console.log(`試行中: ${PROD_URL}${path}`);
      const response = await page.goto(`${PROD_URL}${path}`, { 
        waitUntil: 'domcontentloaded',
        timeout: 10000 
      }).catch(e => null);
      
      if (response && response.status() !== 404) {
        console.log(`✅ ログインページ発見: ${path}`);
        await page.screenshot({ path: `test-results/login-found-${path.replace(/\//g, '-')}.png`, fullPage: true });
        
        // フォーム要素を探す
        const emailInput = await page.$('input[name="email"], input[type="email"], input[id="email"]');
        const passwordInput = await page.$('input[name="password"], input[type="password"], input[id="password"]');
        
        console.log('メール入力フィールド:', !!emailInput);
        console.log('パスワード入力フィールド:', !!passwordInput);
        
        if (emailInput) {
          const nameAttr = await emailInput.getAttribute('name');
          const idAttr = await emailInput.getAttribute('id');
          const typeAttr = await emailInput.getAttribute('type');
          console.log(`  Email Input: name="${nameAttr}", id="${idAttr}", type="${typeAttr}"`);
        }
        
        if (passwordInput) {
          const nameAttr = await passwordInput.getAttribute('name');
          const idAttr = await passwordInput.getAttribute('id');
          const typeAttr = await passwordInput.getAttribute('type');
          console.log(`  Password Input: name="${nameAttr}", id="${idAttr}", type="${typeAttr}"`);
        }
        
        break;
      }
    }
  }
});