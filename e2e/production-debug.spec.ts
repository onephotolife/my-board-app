import { test, expect } from '@playwright/test';

const PROD_URL = 'https://blankinai-board.vercel.app';
const PROD_EMAIL = 'one.photolife+2@gmail.com';
const PROD_PASSWORD = '?@thc123THC@?';

test('本番環境デバッグ - セレクタ確認', async ({ page }) => {
  test.setTimeout(60000);
  
  // サインインページへ
  await page.goto(`${PROD_URL}/auth/signin`);
  await page.waitForLoadState('networkidle');
  
  // ページタイトルとURLを確認
  const title = await page.title();
  const url = page.url();
  console.log(`📍 ページタイトル: ${title}`);
  console.log(`📍 現在のURL: ${url}`);
  
  // すべてのinput要素を確認
  const inputs = await page.$$eval('input', elements => 
    elements.map(el => ({
      name: el.name,
      id: el.id,
      type: el.type,
      placeholder: el.placeholder,
      className: el.className,
      ariaLabel: el.getAttribute('aria-label')
    }))
  );
  
  console.log('📝 Input要素:');
  inputs.forEach((input, index) => {
    console.log(`  ${index + 1}. name="${input.name}" id="${input.id}" type="${input.type}" placeholder="${input.placeholder}"`);
  });
  
  // すべてのbutton要素を確認
  const buttons = await page.$$eval('button', elements =>
    elements.map(el => ({
      text: el.textContent?.trim(),
      type: el.type,
      className: el.className,
      ariaLabel: el.getAttribute('aria-label')
    }))
  );
  
  console.log('🔘 Button要素:');
  buttons.forEach((button, index) => {
    console.log(`  ${index + 1}. text="${button.text}" type="${button.type}"`);
  });
  
  // より柔軟なセレクタでログインを試みる
  try {
    // email入力欄を探す（複数の方法）
    const emailSelectors = [
      'input[name="email"]',
      'input[id="email"]',
      'input[type="email"]',
      'input[placeholder*="email" i]',
      'input[placeholder*="メール" i]'
    ];
    
    let emailInput = null;
    for (const selector of emailSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
        emailInput = element;
        console.log(`✅ Email入力欄を発見: ${selector}`);
        break;
      }
    }
    
    if (emailInput) {
      await emailInput.fill(PROD_EMAIL);
      console.log('✅ Emailを入力');
    } else {
      console.log('❌ Email入力欄が見つかりません');
    }
    
    // password入力欄を探す
    const passwordSelectors = [
      'input[name="password"]',
      'input[id="password"]',
      'input[type="password"]',
      'input[placeholder*="password" i]',
      'input[placeholder*="パスワード" i]'
    ];
    
    let passwordInput = null;
    for (const selector of passwordSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
        passwordInput = element;
        console.log(`✅ Password入力欄を発見: ${selector}`);
        break;
      }
    }
    
    if (passwordInput) {
      await passwordInput.fill(PROD_PASSWORD);
      console.log('✅ Passwordを入力');
    } else {
      console.log('❌ Password入力欄が見つかりません');
    }
    
    // ログインボタンを探す
    const submitSelectors = [
      'button[type="submit"]',
      'button:has-text("ログイン")',
      'button:has-text("Sign in")',
      'button:has-text("サインイン")',
      'button:has-text("Login")'
    ];
    
    let submitButton = null;
    for (const selector of submitSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
        submitButton = element;
        console.log(`✅ ログインボタンを発見: ${selector}`);
        break;
      }
    }
    
    if (submitButton) {
      await submitButton.click();
      console.log('✅ ログインボタンをクリック');
      
      // ログイン後の遷移を待つ
      await page.waitForTimeout(5000);
      
      const newUrl = page.url();
      console.log(`📍 ログイン後のURL: ${newUrl}`);
      
      // ダッシュボードに遷移したか確認
      if (newUrl.includes('dashboard') || newUrl.includes('board')) {
        console.log('✅ ダッシュボードへの遷移成功');
        
        // 投稿フォームを探す
        const textarea = page.locator('textarea').first();
        if (await textarea.isVisible({ timeout: 3000 }).catch(() => false)) {
          console.log('✅ 投稿フォームを発見');
          
          // テスト投稿
          const testMessage = `デバッグテスト - ${new Date().toISOString()}`;
          await textarea.fill(testMessage);
          
          const postButton = page.locator('button:has-text("投稿"), button:has-text("Post"), button[type="submit"]').first();
          await postButton.click();
          
          await page.waitForTimeout(3000);
          console.log('✅ テスト投稿を作成');
          
          // 投稿が表示されているか確認
          const posted = await page.locator(`text="${testMessage}"`).isVisible({ timeout: 5000 }).catch(() => false);
          if (posted) {
            console.log('✅ 投稿が正常に表示されています');
          } else {
            console.log('❌ 投稿が表示されません');
          }
        } else {
          console.log('❌ 投稿フォームが見つかりません');
        }
      } else {
        console.log('⚠️ ダッシュボードへの遷移が確認できません');
      }
    } else {
      console.log('❌ ログインボタンが見つかりません');
    }
    
  } catch (error) {
    console.error('エラー:', error);
  }
  
  // スクリーンショットを保存
  await page.screenshot({ path: 'production-debug-final.png', fullPage: true });
  console.log('📸 スクリーンショット保存: production-debug-final.png');
});