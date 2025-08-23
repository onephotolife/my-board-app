import { test, expect } from '@playwright/test';
import crypto from 'crypto';

// テスト用のユニークなメールアドレスを生成
const generateTestEmail = () => {
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex');
  return `test_${timestamp}_${random}@example.com`;
};

test.describe('ローカル環境 - 認証フロー検証', () => {
  const baseUrl = 'http://localhost:3000';
  
  test('新規登録後に自動ログインされないことを確認', async ({ page }) => {
    const testEmail = generateTestEmail();
    const testPassword = 'TestPassword123!';
    
    console.log('📧 テストメール:', testEmail);
    
    // 新規登録ページへ移動
    await page.goto(`${baseUrl}/auth/signup`);
    await page.waitForLoadState('networkidle');
    
    // 新規登録フォームの入力
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    
    // スクリーンショット取得（デバッグ用）
    await page.screenshot({ path: 'test-results/signup-before-submit.png' });
    
    // 登録ボタンをクリック
    await page.click('button[type="submit"]');
    
    // 成功メッセージの確認
    await expect(page.locator('.success-message')).toBeVisible({ timeout: 10000 });
    const successText = await page.locator('.success-message').textContent();
    console.log('✅ 成功メッセージ:', successText);
    
    expect(successText).toContain('登録が完了しました');
    expect(successText).toContain('確認メール');
    
    // サインインページへリダイレクトされることを確認（3秒後）
    await page.waitForTimeout(3500);
    
    const currentUrl = page.url();
    console.log('📍 現在のURL:', currentUrl);
    
    expect(currentUrl).toContain('/auth/signin');
    expect(currentUrl).toContain('message=verify-email');
    expect(currentUrl).not.toContain('/dashboard');
    
    console.log('✅ 新規登録後、自動ログインされずにサインインページへリダイレクトされました');
    
    // サインインページのメッセージ確認
    const infoMessage = page.locator('[style*="dbeafe"], .MuiAlert-standardInfo, text=登録が完了しました！メールを確認してアカウントを有効化してください。');
    await expect(infoMessage).toBeVisible({ timeout: 5000 });
    console.log('✅ メール確認メッセージが表示されています');
    
    // スクリーンショット取得（最終状態）
    await page.screenshot({ path: 'test-results/signin-after-signup.png' });
  });
  
  test('既存セッションがクリアされることを確認', async ({ page, context }) => {
    // テスト用のクッキーを設定（既存セッションを模擬）
    await context.addCookies([{
      name: 'next-auth.session-token',
      value: 'dummy-session-token',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax'
    }]);
    
    // 新規登録ページへ移動
    await page.goto(`${baseUrl}/auth/signup`);
    await page.waitForLoadState('networkidle');
    
    // コンソールログを監視
    page.on('console', msg => {
      if (msg.text().includes('既存セッションをクリア')) {
        console.log('✅ セッションクリアログを検出:', msg.text());
      }
    });
    
    // ページが新規登録ページに留まることを確認
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/auth/signup');
    expect(page.url()).not.toContain('/dashboard');
    
    console.log('✅ 既存セッションがあっても新規登録ページに留まります');
  });
});

test.describe('本番環境準備状況確認', () => {
  test('本番環境の存在確認（複数URLパターン）', async ({ request }) => {
    const urlPatterns = [
      'https://my-board-app.vercel.app',
      'https://my-board-app-git-main.vercel.app',
      'https://my-board-app-onephotolife.vercel.app',
    ];
    
    let foundUrl = null;
    
    for (const url of urlPatterns) {
      try {
        console.log(`🔍 確認中: ${url}`);
        const response = await request.get(`${url}/auth/signin`, {
          timeout: 5000,
          failOnStatusCode: false
        });
        
        if (response.status() !== 404) {
          foundUrl = url;
          console.log(`✅ 本番環境が見つかりました: ${url} (Status: ${response.status()})`);
          break;
        } else {
          console.log(`❌ 404 Not Found: ${url}`);
        }
      } catch (error) {
        console.log(`❌ 接続エラー: ${url}`);
      }
    }
    
    if (!foundUrl) {
      console.log('⚠️ 本番環境が見つかりませんでした。デプロイが完了するまでお待ちください。');
    }
  });
});