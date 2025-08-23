import { test, expect } from '@playwright/test';

test.describe('本番環境デバッグテスト', () => {
  const prodUrl = 'https://board.blankbrainai.com';
  const prodEmail = 'one.photolife+2@gmail.com';
  const prodPassword = '?@thc123THC@?';

  test('フォーム要素の探索と特定', async ({ page }) => {
    console.log('🔍 デバッグモード開始');
    
    // ページアクセス
    await page.goto(`${prodUrl}/auth/signin`, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    // ページタイトル取得
    const title = await page.title();
    console.log(`📄 ページタイトル: ${title}`);
    
    // URLチェック
    console.log(`📍 現在のURL: ${page.url()}`);
    
    // 複数のセレクタパターンを試行
    const selectorPatterns = [
      // 標準的なname属性
      { selector: 'input[name="email"]', type: 'name=email' },
      { selector: 'input[name="password"]', type: 'name=password' },
      // type属性
      { selector: 'input[type="email"]', type: 'type=email' },
      { selector: 'input[type="password"]', type: 'type=password' },
      // id属性
      { selector: 'input#email', type: 'id=email' },
      { selector: 'input#password', type: 'id=password' },
      // data-testid属性
      { selector: 'input[data-testid="email-input"]', type: 'data-testid=email' },
      { selector: 'input[data-testid="password-input"]', type: 'data-testid=password' },
      // placeholder属性
      { selector: 'input[placeholder*="email" i]', type: 'placeholder email' },
      { selector: 'input[placeholder*="password" i]', type: 'placeholder password' },
      { selector: 'input[placeholder*="メール" i]', type: 'placeholder メール' },
      { selector: 'input[placeholder*="パスワード" i]', type: 'placeholder パスワード' },
      // aria-label
      { selector: 'input[aria-label*="email" i]', type: 'aria-label email' },
      { selector: 'input[aria-label*="password" i]', type: 'aria-label password' },
      // 一般的なinput要素
      { selector: 'input', type: 'all inputs' }
    ];
    
    console.log('📝 セレクタ探索開始...');
    let emailSelector = null;
    let passwordSelector = null;
    
    for (const pattern of selectorPatterns) {
      try {
        const elements = await page.locator(pattern.selector).count();
        if (elements > 0) {
          console.log(`✅ 発見: ${pattern.type} - ${elements}個の要素`);
          
          // 最初に見つかったinput要素の詳細を取得
          if (pattern.selector === 'input') {
            const allInputs = await page.locator('input').all();
            for (let i = 0; i < Math.min(allInputs.length, 5); i++) {
              const input = allInputs[i];
              const type = await input.getAttribute('type');
              const name = await input.getAttribute('name');
              const id = await input.getAttribute('id');
              const placeholder = await input.getAttribute('placeholder');
              console.log(`  Input[${i}]: type="${type}", name="${name}", id="${id}", placeholder="${placeholder}"`);
              
              // メール用フィールドの判定
              if (!emailSelector && (
                type === 'email' || 
                name === 'email' || 
                id === 'email' ||
                (placeholder && placeholder.toLowerCase().includes('email'))
              )) {
                emailSelector = `input:nth-of-type(${i + 1})`;
                console.log(`  → メールフィールドとして特定: ${emailSelector}`);
              }
              
              // パスワード用フィールドの判定
              if (!passwordSelector && (
                type === 'password' || 
                name === 'password' || 
                id === 'password' ||
                (placeholder && placeholder.toLowerCase().includes('password'))
              )) {
                passwordSelector = `input[type="password"]`;
                console.log(`  → パスワードフィールドとして特定: ${passwordSelector}`);
              }
            }
          }
        }
      } catch (error) {
        // セレクタが見つからない場合は無視
      }
    }
    
    // ボタン要素の探索
    console.log('\n📝 ボタン要素探索...');
    const buttonSelectors = [
      'button[type="submit"]',
      'button:has-text("ログイン")',
      'button:has-text("Sign in")',
      'button:has-text("Login")',
      'input[type="submit"]',
      'button'
    ];
    
    for (const selector of buttonSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`✅ ボタン発見: ${selector} - ${count}個`);
      }
    }
    
    // スクリーンショット保存
    await page.screenshot({ 
      path: 'test-results/debug-page-structure.png',
      fullPage: true 
    });
    
    // 実際のログイン試行
    if (emailSelector || passwordSelector) {
      console.log('\n🔐 ログイン試行開始...');
      
      // より汎用的なセレクタを使用
      const finalEmailSelector = emailSelector || 'input[type="email"]' || 'input:first-of-type';
      const finalPasswordSelector = passwordSelector || 'input[type="password"]' || 'input:nth-of-type(2)';
      
      try {
        await page.locator(finalEmailSelector).fill(prodEmail);
        console.log(`✅ メール入力成功: ${finalEmailSelector}`);
      } catch (error) {
        console.log(`❌ メール入力失敗: ${error}`);
      }
      
      try {
        await page.locator(finalPasswordSelector).fill(prodPassword);
        console.log(`✅ パスワード入力成功: ${finalPasswordSelector}`);
      } catch (error) {
        console.log(`❌ パスワード入力失敗: ${error}`);
      }
      
      // ログインボタンクリック
      const submitButton = page.locator('button[type="submit"]').or(page.locator('button').first());
      await submitButton.click();
      console.log('✅ ログインボタンクリック');
      
      // 結果待機
      await page.waitForTimeout(5000);
      const currentUrl = page.url();
      console.log(`\n📍 ログイン後のURL: ${currentUrl}`);
      
      if (currentUrl.includes('/dashboard')) {
        console.log('🎉 ログイン成功！');
        await page.screenshot({ path: 'test-results/login-success.png' });
      } else {
        console.log('⚠️ ログイン失敗またはリダイレクトなし');
        await page.screenshot({ path: 'test-results/login-failed.png' });
      }
    } else {
      console.log('❌ フォーム要素を特定できませんでした');
    }
  });
});