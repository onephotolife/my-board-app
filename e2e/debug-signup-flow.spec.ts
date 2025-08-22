import { test, expect } from '@playwright/test';

test('デバッグ: サインアップフロー詳細', async ({ page }) => {
  const timestamp = Date.now();
  const testUser = {
    name: `Test User ${timestamp}`,
    email: `test${timestamp}@example.com`,
    password: 'TestPass123!'
  };

  console.log('🧪 テストユーザー:', testUser.email);

  // ネットワークログを有効化
  page.on('response', response => {
    if (response.url().includes('/api/')) {
      console.log(`📡 API Response: ${response.url()} - ${response.status()}`);
    }
  });

  // コンソールログを取得
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('❌ Console Error:', msg.text());
    }
  });

  // 1. サインアップページへ
  await page.goto('http://localhost:3000/auth/signup');
  await page.waitForLoadState('networkidle');
  console.log('✅ サインアップページ読み込み完了');

  // 2. フォーム入力
  await page.fill('input[name="name"]', testUser.name);
  await page.fill('input[name="email"]', testUser.email);
  await page.fill('input[name="password"]', testUser.password);
  await page.fill('input[name="confirmPassword"]', testUser.password);
  console.log('✅ フォーム入力完了');

  // 3. 登録ボタンクリック前の準備
  const navigationPromise = page.waitForNavigation({ 
    waitUntil: 'networkidle',
    timeout: 30000 
  }).catch(() => null);

  // APIレスポンスを待つ
  const registerResponsePromise = page.waitForResponse(
    response => response.url().includes('/api/auth/register'),
    { timeout: 30000 }
  );

  // 4. 登録ボタンをクリック
  await page.click('button[type="submit"]');
  console.log('✅ 登録ボタンクリック');

  // 5. 登録APIのレスポンスを確認
  const registerResponse = await registerResponsePromise;
  const registerData = await registerResponse.json();
  console.log('📦 Register API Response:', {
    status: registerResponse.status(),
    data: registerData
  });

  // 6. 少し待機して状態を確認
  await page.waitForTimeout(3000);

  // 7. 現在の状態を確認
  const currentUrl = page.url();
  console.log('📍 現在のURL:', currentUrl);

  // ページ上のメッセージを確認
  const successMessage = await page.locator('text=/登録が完了/').isVisible().catch(() => false);
  const errorMessage = await page.locator('[role="alert"]').isVisible().catch(() => false);
  
  if (successMessage) {
    const msgText = await page.locator('text=/登録が完了/').textContent();
    console.log('✅ 成功メッセージ:', msgText);
  }
  
  if (errorMessage) {
    const errText = await page.locator('[role="alert"]').textContent();
    console.log('❌ エラーメッセージ:', errText);
  }

  // 8. NextAuth signInの呼び出しを確認
  const signInResponsePromise = page.waitForResponse(
    response => response.url().includes('/api/auth/callback/credentials'),
    { timeout: 5000 }
  ).catch(() => null);

  const signInResponse = await signInResponsePromise;
  if (signInResponse) {
    console.log('🔐 NextAuth SignIn Response:', {
      status: signInResponse.status(),
      url: signInResponse.url()
    });
    
    const signInData = await signInResponse.json().catch(() => null);
    if (signInData) {
      console.log('SignIn Data:', signInData);
    }
  } else {
    console.log('⚠️ NextAuth signInが呼び出されていません');
  }

  // 9. ナビゲーションを待つ
  await navigationPromise;
  
  const finalUrl = page.url();
  console.log('📍 最終URL:', finalUrl);

  // 10. ダッシュボードに到達したか確認
  if (finalUrl.includes('/dashboard')) {
    console.log('✅ ダッシュボードへの自動ログイン成功！');
    
    // ダッシュボードのコンテンツを確認
    const hasTextarea = await page.locator('textarea').isVisible({ timeout: 5000 }).catch(() => false);
    if (hasTextarea) {
      console.log('✅ 投稿フォーム表示確認');
    }
  } else if (finalUrl.includes('/auth/signin')) {
    console.log('⚠️ サインインページへリダイレクト（自動ログイン失敗）');
  } else {
    console.log('❓ 予期しないページ:', finalUrl);
    
    // スクリーンショットを保存
    await page.screenshot({ path: 'debug-signup-unexpected.png', fullPage: true });
    console.log('📸 スクリーンショット保存: debug-signup-unexpected.png');
  }

  // 11. Cookieを確認
  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find(c => c.name.includes('next-auth.session-token') || c.name.includes('__Secure-next-auth.session-token'));
  console.log('🍪 セッションCookie:', sessionCookie ? '存在' : '不在');
});