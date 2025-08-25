import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const LOGIN_EMAIL = 'test@example.com';
const LOGIN_PASSWORD = 'password123';

test.describe('400エラー修正確認テスト', () => {
  test('新規投稿が正常に作成できることを確認', async ({ page }) => {
    console.log('📊 400エラー修正確認テスト開始...\n');
    console.log('実行時刻:', new Date().toISOString());
    console.log('テスト環境: ローカル開発環境');
    console.log('================================\n');
    
    // 1. ログイン処理
    console.log('STEP 1: ログイン処理');
    await page.goto(`${BASE_URL}/auth/signin`);
    await page.fill('input[name="email"]', LOGIN_EMAIL);
    await page.fill('input[name="password"]', LOGIN_PASSWORD);
    
    await Promise.all([
      page.waitForNavigation({ url: '**/dashboard' }),
      page.click('button[type="submit"]')
    ]);
    console.log('✅ ログイン成功\n');
    
    // 2. 新規投稿ページへ移動
    console.log('STEP 2: 新規投稿ページへ移動');
    await page.goto(`${BASE_URL}/posts/new`);
    await page.waitForTimeout(2000); // CSRFトークン取得待ち
    console.log('✅ ページ読み込み完了\n');
    
    // 3. ネットワーク監視設定
    console.log('STEP 3: ネットワーク監視設定\n');
    let responseStatus: number | null = null;
    let responseBody: any = null;
    
    page.on('response', async res => {
      if (res.url().includes('/api/posts') && res.request().method() === 'POST') {
        responseStatus = res.status();
        try {
          responseBody = await res.json();
        } catch (e) {
          responseBody = await res.text();
        }
        console.log('📥 レスポンス受信: Status', responseStatus);
      }
    });
    
    // 4. フォーム入力
    console.log('STEP 4: フォーム入力');
    
    // タイトル入力
    await page.fill('input[placeholder*="タイトル"]', '修正確認テスト投稿');
    console.log('✅ タイトル入力完了');
    
    // 本文入力  
    await page.fill('textarea[placeholder*="内容"], textarea[placeholder*="本文"]', 'authorInfoフィールド追加修正の動作確認テストです。');
    console.log('✅ 本文入力完了\n');
    
    // 5. 送信
    console.log('STEP 5: フォーム送信');
    await page.click('button:has-text("投稿する")');
    await page.waitForTimeout(3000);
    
    // 6. 結果確認
    console.log('\n========== テスト結果 ==========\n');
    
    if (responseStatus === 201) {
      console.log('✅ 成功: 新規投稿が正常に作成されました');
      console.log('Status:', responseStatus);
      if (responseBody && responseBody.data) {
        console.log('投稿ID:', responseBody.data._id || responseBody.data.id);
        console.log('タイトル:', responseBody.data.title);
      }
    } else if (responseStatus === 400) {
      console.log('❌ 失敗: 400エラーが発生しました');
      console.log('Status:', responseStatus);
      if (responseBody && responseBody.error) {
        console.log('エラーメッセージ:', responseBody.error.message);
        if (responseBody.error.details) {
          console.log('詳細:', responseBody.error.details);
        }
      }
    } else if (responseStatus === 401) {
      console.log('❌ 失敗: 認証エラー');
      console.log('Status:', responseStatus);
    } else {
      console.log('⚠️ 予期しないステータス:', responseStatus);
    }
    
    // Assertionで検証
    expect(responseStatus).toBe(201);
    
    console.log('\n========== テスト完了 ==========');
  });
});