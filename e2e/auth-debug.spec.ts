import { test, expect } from '@playwright/test';

const baseURL = 'http://localhost:3000';

test('認証フロー詳細デバッグ', async ({ page }) => {
  // テスト用のユニークなユーザー情報を生成
  const timestamp = Date.now();
  const testUser = {
    name: `テストユーザー_${timestamp}`,
    email: `test_${timestamp}@example.com`,
    password: 'TestPassword123!',
  };

  console.log('🧪 テストユーザー:', testUser.email);

  // 1. サインアップページへアクセス
  console.log('\n📝 サインアップページへアクセス...');
  await page.goto(`${baseURL}/auth/signup`);
  await page.waitForLoadState('networkidle');
  
  // ページが正しく表示されているか確認
  await expect(page.locator('h1')).toContainText(/新規登録|Sign Up/i);
  console.log('✅ サインアップページが表示されました');

  // 2. フォームに入力
  console.log('\n📝 フォームに入力...');
  await page.fill('input[name="name"]', testUser.name);
  await page.fill('input[name="email"]', testUser.email);
  await page.fill('input[name="password"]', testUser.password);
  await page.fill('input[name="confirmPassword"]', testUser.password);
  console.log('✅ フォーム入力完了');

  // 3. 登録ボタンをクリック
  console.log('\n🚀 登録ボタンをクリック...');
  await page.click('button[type="submit"]');
  
  // 4. 登録後の遷移を待機（最大30秒）
  console.log('\n⏳ 登録処理の完了を待機中...');
  
  try {
    // ダッシュボードへの遷移、または成功メッセージを待つ
    await Promise.race([
      page.waitForURL('**/dashboard', { timeout: 30000 }),
      page.waitForSelector('text=/登録が完了しました/', { timeout: 30000 }),
      page.waitForURL('**/auth/signin', { timeout: 30000 })
    ]);
    
    const currentUrl = page.url();
    console.log(`📍 現在のURL: ${currentUrl}`);
    
    if (currentUrl.includes('/dashboard')) {
      console.log('✅ ダッシュボードへの自動ログイン成功！');
      
      // ダッシュボードのコンテンツを確認
      const hasTextarea = await page.locator('textarea').isVisible({ timeout: 5000 }).catch(() => false);
      if (hasTextarea) {
        console.log('✅ 投稿フォームが表示されています');
      }
    } else if (currentUrl.includes('/auth/signin')) {
      console.log('⚠️ サインインページへリダイレクトされました（自動ログイン失敗）');
      
      // サインインを試みる
      console.log('\n📝 手動でサインインを試みます...');
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');
      
      // ダッシュボードへの遷移を待つ
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      console.log('✅ 手動サインイン成功！');
    } else {
      console.log('❓ 予期しないページに遷移しました');
    }
    
  } catch (error) {
    console.error('❌ タイムアウト:', error.message);
    
    // エラー情報を収集
    const currentUrl = page.url();
    console.log(`📍 エラー時のURL: ${currentUrl}`);
    
    // エラーメッセージがあるか確認
    const errorText = await page.locator('.error, [role="alert"], .MuiAlert-root').textContent().catch(() => null);
    if (errorText) {
      console.log(`⚠️ エラーメッセージ: ${errorText}`);
    }
    
    // スクリーンショットを保存
    await page.screenshot({ path: 'auth-debug-error.png', fullPage: true });
    console.log('📸 スクリーンショット保存: auth-debug-error.png');
  }
  
  // 5. 最終状態の確認
  const finalUrl = page.url();
  console.log(`\n📊 最終状態:`);
  console.log(`  URL: ${finalUrl}`);
  console.log(`  ページタイトル: ${await page.title()}`);
  
  // クッキーの確認
  const cookies = await page.context().cookies();
  const authCookie = cookies.find(c => c.name.includes('next-auth'));
  console.log(`  認証クッキー: ${authCookie ? '存在' : '不在'}`);
});

test('既存ユーザーのサインイン', async ({ page }) => {
  // 既知のテストユーザー情報
  const existingUser = {
    email: 'test@example.com',  // 既存のユーザーがいる場合はそのメールアドレスに変更
    password: 'password123',     // 既存のパスワードに変更
  };

  console.log('\n🔐 既存ユーザーでサインインテスト');
  
  // サインインページへ
  await page.goto(`${baseURL}/auth/signin`);
  await page.waitForLoadState('networkidle');
  
  // フォームに入力
  await page.fill('input[name="email"]', existingUser.email);
  await page.fill('input[name="password"]', existingUser.password);
  
  // サインインボタンをクリック
  await page.click('button[type="submit"]');
  
  try {
    // ダッシュボードへの遷移を待つ
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('✅ サインイン成功！');
    
    const currentUrl = page.url();
    console.log(`📍 現在のURL: ${currentUrl}`);
    
  } catch (error) {
    console.error('❌ サインイン失敗:', error.message);
    
    // エラーメッセージを確認
    const errorText = await page.locator('[role="alert"], .error').textContent().catch(() => null);
    if (errorText) {
      console.log(`⚠️ エラーメッセージ: ${errorText}`);
    }
  }
});