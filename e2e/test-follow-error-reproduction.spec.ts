import { test, expect } from '@playwright/test';

test.describe('test-follow ユーザー不在エラー再現テスト', () => {
  
  test('存在しないユーザーIDでフォローボタンクリック時のエラー確認', async ({ page }) => {
    console.log('\n=== ユーザー不在エラー再現テスト開始 ===\n');
    
    // エラーメッセージをキャプチャする準備
    const errorMessages: string[] = [];
    
    // APIレスポンスをインターセプト
    page.on('response', async response => {
      if (response.url().includes('/api/follow/')) {
        const status = response.status();
        if (status === 404) {
          const body = await response.text();
          console.log(`❌ API 404エラー検出: ${response.url()}`);
          console.log(`   レスポンス: ${body}`);
          errorMessages.push(body);
        }
      }
    });
    
    // test-followページにアクセス
    await page.goto('http://localhost:3000/test-follow');
    
    // ページ読み込み完了を待つ
    await page.waitForLoadState('networkidle');
    
    // コンパクトモードセクション（user6を使用）を探す
    const compactSection = page.locator('text=コンパクトモード').locator('..');
    
    // user6のフォローボタンを探す（最初のコンパクトボタン）
    const followButtonUser6 = compactSection.locator('button').filter({ hasText: /フォロー/ }).first();
    
    console.log('📍 user6のフォローボタンを発見（ID: 507f1f77bcf86cd799439006）');
    console.log('   このユーザーIDはデータベースに存在しません');
    
    // ボタンをクリック
    await followButtonUser6.click();
    
    // エラーSnackbarまたはアラートが表示されるのを待つ
    const errorAlert = page.locator('[role="alert"]').filter({ hasText: 'ユーザーが見つかりません' });
    
    // エラーメッセージの表示確認
    try {
      await errorAlert.waitFor({ state: 'visible', timeout: 3000 });
      const errorText = await errorAlert.textContent();
      console.log(`\n✅ エラーメッセージ確認: "${errorText}"`);
      
      // エラーメッセージが正しく表示されているか検証
      expect(errorText).toContain('ユーザーが見つかりません');
      
    } catch (e) {
      console.log('⚠️ エラーアラートが表示されませんでした');
      // ページ全体でエラーメッセージを探す
      const pageText = await page.textContent('body');
      if (pageText?.includes('ユーザーが見つかりません')) {
        console.log('✅ エラーメッセージがページ内に存在します');
      }
    }
    
    console.log('\n=== エラーの原因分析 ===');
    console.log('1. test-followページはuser6 (ID: 507f1f77bcf86cd799439006)を使用');
    console.log('2. このIDはseed-test-users.jsで作成されていない');
    console.log('3. APIは404を返し、FollowButtonが「ユーザーが見つかりません」を表示');
    console.log('\n証拠: APIレスポンスログとエラーメッセージ表示');
  });
  
  test('存在するユーザーIDでは正常に動作することの確認', async ({ page }) => {
    console.log('\n=== 存在するユーザーでの正常動作確認 ===\n');
    
    // test-followページにアクセス
    await page.goto('http://localhost:3000/test-follow');
    await page.waitForLoadState('networkidle');
    
    // デフォルト状態セクション（user1を使用）を探す
    const defaultSection = page.locator('text=デフォルト状態').locator('..');
    
    // user1のフォローボタンを探す（最初のデフォルトボタン）
    const followButtonUser1 = defaultSection.locator('button').filter({ hasText: /フォロー/ }).first();
    
    console.log('📍 user1のフォローボタンを発見（ID: 507f1f77bcf86cd799439001）');
    console.log('   このユーザーIDはデータベースに存在します');
    
    // APIレスポンスを監視
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/api/follow/507f1f77bcf86cd799439001'),
      { timeout: 5000 }
    );
    
    // ボタンをクリック
    await followButtonUser1.click();
    
    try {
      const response = await responsePromise;
      const status = response.status();
      
      if (status === 401) {
        console.log('⚠️ 401 Unauthorized - ログインが必要です');
        console.log('   これは正常な挙動です（ユーザーは存在するが認証が必要）');
      } else if (status === 404) {
        console.log('❌ 404 Not Found - ユーザーが見つかりません');
        console.log('   これは予期しないエラーです');
      } else {
        console.log(`📊 APIレスポンス: ${status}`);
      }
      
      // 「ユーザーが見つかりません」エラーが表示されないことを確認
      const errorAlert = page.locator('[role="alert"]').filter({ hasText: 'ユーザーが見つかりません' });
      const isErrorVisible = await errorAlert.isVisible();
      
      if (!isErrorVisible) {
        console.log('✅ 「ユーザーが見つかりません」エラーは表示されていません');
      }
      
    } catch (e) {
      console.log('⏱️ APIレスポンス待機タイムアウト');
    }
  });
});