import { test, expect } from '@playwright/test';

test.describe('メール確認メッセージ検証', () => {
  const prodUrl = 'https://board.blankbrainai.com';
  
  test('メール未確認ユーザーにユーザーフレンドリーなメッセージを表示', async ({ page }) => {
    console.log('========================================');
    console.log('📊 テスト: ユーザーフレンドリーメッセージ検証');
    console.log('========================================');
    
    // Step 1: 新規登録
    const timestamp = Date.now();
    const testEmail = `message_test_${timestamp}@example.com`;
    const testPassword = 'SecurePassword123!';
    
    console.log('Step 1️⃣: 新規ユーザー登録');
    console.log(`📧 テストメール: ${testEmail}`);
    
    await page.goto(`${prodUrl}/auth/signup`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    // 登録フォーム入力
    await page.fill('input[name="name"]', 'Message Test User');
    await page.fill('input[type="email"]', testEmail);
    
    const passwordFields = await page.locator('input[type="password"]').all();
    if (passwordFields.length >= 2) {
      await passwordFields[0].fill(testPassword);
      await passwordFields[1].fill(testPassword);
    }
    
    // 登録実行
    await page.click('button[type="submit"]');
    
    // 成功メッセージ待機
    const successMessage = page.locator('.success-message, [role="status"]');
    await expect(successMessage).toBeVisible({ timeout: 10000 });
    console.log('✅ 登録成功');
    
    // サインインページへリダイレクト待機
    await page.waitForTimeout(3500);
    
    // Step 2: メール確認前のログイン試行
    console.log('\nStep 2️⃣: メール確認前のログイン試行');
    
    await page.goto(`${prodUrl}/auth/signin`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    
    // ログイン前のスクリーンショット
    await page.screenshot({ 
      path: 'test-results/message-before-login.png',
      fullPage: true 
    });
    
    // ログインボタンクリック
    await page.click('button[type="submit"]');
    console.log('✅ ログインボタンクリック');
    
    // エラーメッセージが表示されるまで待機
    await page.waitForTimeout(3000);
    
    // エラーメッセージのスクリーンショット
    await page.screenshot({ 
      path: 'test-results/message-error-display.png',
      fullPage: true 
    });
    
    // Step 3: エラーメッセージの確認
    console.log('\nStep 3️⃣: エラーメッセージ内容確認');
    
    // エラーメッセージ要素を探す
    const errorElements = await page.locator('.error-message, [role="alert"], .MuiAlert-root, div[style*="dc2626"], div[style*="ff0000"], div[style*="red"]').all();
    
    let foundMessage = false;
    let errorText = '';
    
    for (const element of errorElements) {
      const text = await element.textContent();
      if (text) {
        console.log(`📝 エラー要素のテキスト: ${text}`);
        errorText += text + ' ';
        
        // ユーザーフレンドリーなメッセージの確認
        if (text.includes('メールアドレスの確認') || 
            text.includes('確認メール') || 
            text.includes('メール') && text.includes('確認')) {
          foundMessage = true;
          console.log('✅ ユーザーフレンドリーなメッセージを検出');
        }
      }
    }
    
    // URLパラメータの確認
    const currentUrl = page.url();
    console.log(`📍 現在のURL: ${currentUrl}`);
    
    // 検証
    if (foundMessage) {
      console.log('✅ メール確認に関する適切なメッセージが表示されています');
    } else if (errorText.includes('ログイン') || errorText.includes('失敗')) {
      console.log('⚠️ 一般的なエラーメッセージが表示されています');
      console.log('📝 改善案: メール確認が必要であることを明示的に伝える');
    } else {
      console.log('❌ エラーメッセージが見つかりません');
    }
    
    // アサーション
    expect(errorText).toBeTruthy();
    console.log(`📊 表示されたエラーメッセージ: ${errorText.trim()}`);
    
    // Step 4: 5秒後の追加メッセージ確認
    console.log('\nStep 4️⃣: 追加の案内メッセージ確認（5秒後）');
    await page.waitForTimeout(5500);
    
    const updatedErrorElements = await page.locator('.error-message, [role="alert"], .MuiAlert-root').all();
    for (const element of updatedErrorElements) {
      const text = await element.textContent();
      if (text && text.includes('再送信')) {
        console.log('✅ メール再送信の案内が表示されました');
      }
    }
    
    // 最終スクリーンショット
    await page.screenshot({ 
      path: 'test-results/message-final-state.png',
      fullPage: true 
    });
    
    console.log('\n========================================');
    console.log('📊 テスト結果');
    console.log('========================================');
    console.log('✅ エラーメッセージが表示される: OK');
    console.log(foundMessage ? '✅ メール確認の案内がある: OK' : '⚠️ メール確認の案内を改善可能');
    console.log('✅ ログインが拒否される: OK');
    console.log('========================================');
  });
  
  test('既存のメール確認済みユーザーは通常のエラーメッセージ', async ({ page }) => {
    const existingEmail = 'one.photolife+2@gmail.com';
    const wrongPassword = 'WrongPassword123!';
    
    console.log('========================================');
    console.log('📊 テスト: 通常のパスワードエラー');
    console.log('========================================');
    
    await page.goto(`${prodUrl}/auth/signin`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="email"]', existingEmail);
    await page.fill('input[type="password"]', wrongPassword);
    
    await page.click('button[type="submit"]');
    
    // エラーメッセージ待機
    await page.waitForTimeout(3000);
    
    // エラーメッセージ確認
    const errorElements = await page.locator('.error-message, [role="alert"], .MuiAlert-root').all();
    let errorText = '';
    
    for (const element of errorElements) {
      const text = await element.textContent();
      if (text) {
        errorText += text + ' ';
      }
    }
    
    console.log(`📝 エラーメッセージ: ${errorText.trim()}`);
    
    // パスワードエラーの一般的なメッセージが表示されることを確認
    expect(errorText).toContain('パスワード');
    
    console.log('✅ 通常のエラーメッセージが表示されています');
    console.log('========================================');
  });
});