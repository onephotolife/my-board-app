import { test, expect } from '@playwright/test';

const PRODUCTION_URL = 'https://board.blankbrainai.com';
const LOGIN_EMAIL = 'one.photolife+2@gmail.com';
const LOGIN_PASSWORD = '?@thc123THC@?';

test.describe('本番環境400エラー修正確認', () => {
  test('本番環境で新規投稿が正常に作成できることを確認', async ({ page }) => {
    console.log('📊 本番環境400エラー修正確認テスト\n');
    console.log('実行時刻:', new Date().toISOString());
    console.log('テスト環境: 本番環境');
    console.log('URL:', PRODUCTION_URL);
    console.log('================================\n');
    
    // 1. ログイン処理
    console.log('STEP 1: ログイン処理');
    await page.goto(`${PRODUCTION_URL}/auth/signin`);
    await page.fill('input[name="email"]', LOGIN_EMAIL);
    await page.fill('input[name="password"]', LOGIN_PASSWORD);
    
    await Promise.all([
      page.waitForNavigation({ url: '**/dashboard' }),
      page.click('button[type="submit"]')
    ]);
    console.log('✅ ログイン成功\n');
    
    // 2. 新規投稿ページへ移動
    console.log('STEP 2: 新規投稿ページへ移動');
    await page.goto(`${PRODUCTION_URL}/posts/new`);
    await page.waitForTimeout(3000); // CSRFトークン取得待ち
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
        console.log('📥 APIレスポンス受信: Status', responseStatus);
        if (responseStatus !== 201 && responseBody) {
          console.log('レスポンス内容:', JSON.stringify(responseBody, null, 2));
        }
      }
    });
    
    // 4. フォーム入力
    console.log('STEP 4: フォーム入力');
    const timestamp = new Date().toISOString();
    const title = `修正確認テスト - ${timestamp}`;
    const content = '400エラー修正が本番環境で正常に動作することを確認するテスト投稿です。';
    
    // タイトル入力（複数のセレクタを試す）
    const titleSelectors = [
      'input[placeholder*="タイトル"]',
      'input[name="title"]',
      'input#title'
    ];
    
    let titleInputted = false;
    for (const selector of titleSelectors) {
      try {
        await page.fill(selector, title, { timeout: 5000 });
        titleInputted = true;
        console.log(`✅ タイトル入力完了 (${selector})`);
        break;
      } catch (e) {
        continue;
      }
    }
    
    if (!titleInputted) {
      console.log('⚠️ タイトル入力フィールドが見つかりません');
    }
    
    // 本文入力（複数のセレクタを試す）
    const contentSelectors = [
      'textarea[placeholder*="内容"]',
      'textarea[placeholder*="本文"]',
      'textarea[name="content"]',
      'textarea#content'
    ];
    
    let contentInputted = false;
    for (const selector of contentSelectors) {
      try {
        await page.fill(selector, content, { timeout: 5000 });
        contentInputted = true;
        console.log(`✅ 本文入力完了 (${selector})`);
        break;
      } catch (e) {
        continue;
      }
    }
    
    if (!contentInputted) {
      console.log('⚠️ 本文入力フィールドが見つかりません');
    }
    
    console.log('');
    
    // 5. 送信
    console.log('STEP 5: フォーム送信');
    await page.click('button:has-text("投稿する")');
    await page.waitForTimeout(5000); // レスポンス待ち
    
    // 6. 結果確認
    console.log('\n========== テスト結果 ==========\n');
    
    if (responseStatus === 201) {
      console.log('✅ 成功: 新規投稿が正常に作成されました');
      console.log('Status:', responseStatus);
      if (responseBody && responseBody.data) {
        console.log('投稿ID:', responseBody.data._id || responseBody.data.id);
        console.log('タイトル:', responseBody.data.title);
      }
      console.log('\n🎉 400エラーが修正されました！');
    } else if (responseStatus === 400) {
      console.log('❌ 失敗: 400エラーが発生しました');
      console.log('Status:', responseStatus);
      if (responseBody && responseBody.error) {
        console.log('エラーメッセージ:', responseBody.error.message);
        if (responseBody.error.details) {
          console.log('詳細:', responseBody.error.details);
        }
      }
      console.log('\n⚠️ 修正が反映されていません');
    } else if (responseStatus === 401) {
      console.log('❌ 失敗: 認証エラー');
      console.log('Status:', responseStatus);
    } else if (responseStatus === 403) {
      console.log('❌ 失敗: 権限エラー');
      console.log('Status:', responseStatus);
    } else {
      console.log('⚠️ 予期しないステータス:', responseStatus);
    }
    
    // UIエラーメッセージの確認
    const errorAlerts = await page.$$eval('.MuiAlert-message', elements => 
      elements.map(el => el.textContent)
    );
    
    if (errorAlerts.length > 0) {
      console.log('\nUI上のエラーメッセージ:');
      errorAlerts.forEach(msg => console.log('  -', msg));
    }
    
    // スクリーンショット取得
    const screenshotPath = `test-results/production-400-fix-${responseStatus || 'unknown'}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`\n📸 スクリーンショット保存: ${screenshotPath}`);
    
    // Assertionで検証
    expect(responseStatus).toBe(201);
    
    console.log('\n========== テスト完了 ==========');
  });
});