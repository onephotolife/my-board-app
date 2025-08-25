import { test, expect } from '@playwright/test';

const PRODUCTION_URL = 'https://board.blankbrainai.com';
const LOGIN_EMAIL = 'one.photolife+2@gmail.com';
const LOGIN_PASSWORD = '?@thc123THC@?';

test.describe('400 Bad Request エラー詳細調査', () => {
  test('400エラーの詳細な再現と分析', async ({ page, context }) => {
    console.log('📊 400 Bad Request エラー詳細調査開始...\n');
    console.log('実行時刻:', new Date().toISOString());
    console.log('調査URL:', PRODUCTION_URL);
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
    
    // 3. フォーム要素の確認
    console.log('STEP 3: フォーム要素の状態確認');
    const formElements = await page.evaluate(() => {
      const titleInput = document.querySelector('input[placeholder*="タイトル"]') as HTMLInputElement;
      const contentTextarea = document.querySelector('textarea[placeholder*="内容"], textarea[placeholder*="本文"]') as HTMLTextAreaElement;
      const categorySelect = document.querySelector('select, [role="combobox"]') as HTMLSelectElement;
      const submitButton = document.querySelector('button:has-text("投稿する")') as HTMLButtonElement;
      
      return {
        hasTitleInput: !!titleInput,
        hasContentTextarea: !!contentTextarea,
        hasCategorySelect: !!categorySelect,
        hasSubmitButton: !!submitButton,
        titlePlaceholder: titleInput?.placeholder || null,
        contentPlaceholder: contentTextarea?.placeholder || null,
        submitButtonText: submitButton?.textContent || null
      };
    });
    console.log('フォーム要素:', JSON.stringify(formElements, null, 2));
    console.log('');
    
    // 4. CSRFトークンの状態確認
    console.log('STEP 4: CSRFトークン状態確認');
    const tokenState = await page.evaluate(() => {
      const metaTag = document.querySelector('meta[name="app-csrf-token"]');
      const metaToken = metaTag?.getAttribute('content');
      
      return {
        hasMetaTag: !!metaTag,
        hasToken: !!metaToken,
        tokenLength: metaToken?.length || 0,
        tokenPreview: metaToken ? metaToken.substring(0, 20) + '...' : null
      };
    });
    console.log('CSRFトークン:', JSON.stringify(tokenState, null, 2));
    console.log('');
    
    // 5. ネットワークインターセプト設定
    console.log('STEP 5: ネットワーク監視設定\n');
    
    let requestData: any = null;
    let responseData: any = null;
    let responseBody: any = null;
    
    page.on('request', req => {
      if (req.url().includes('/api/posts') && req.method() === 'POST') {
        requestData = {
          url: req.url(),
          method: req.method(),
          headers: req.headers(),
          postData: req.postData()
        };
        console.log('📤 POSTリクエスト検出');
      }
    });
    
    page.on('response', async res => {
      if (res.url().includes('/api/posts') && res.request().method() === 'POST') {
        responseData = {
          url: res.url(),
          status: res.status(),
          statusText: res.statusText(),
          headers: res.headers()
        };
        
        try {
          responseBody = await res.json();
        } catch (e) {
          responseBody = await res.text();
        }
        
        console.log('📥 レスポンス受信: Status', res.status());
      }
    });
    
    // 6. フォーム入力（異なるパターンで試行）
    console.log('STEP 6: フォーム入力と送信');
    
    // パターン1: 正常なデータで試行
    console.log('パターン1: 正常なデータで送信試行');
    
    // タイトル入力
    const titleInputs = await page.$$('input[placeholder*="タイトル"]');
    if (titleInputs.length === 0) {
      console.log('⚠️ タイトル入力フィールドが見つかりません');
      // labelで探す
      await page.fill('input[label*="タイトル"]', '400エラー調査テスト').catch(() => {
        console.log('⚠️ label属性でも見つかりません');
      });
    } else {
      await titleInputs[0].fill('400エラー調査テスト');
      console.log('✅ タイトル入力完了');
    }
    
    // 本文入力
    const contentTextareas = await page.$$('textarea[placeholder*="内容"], textarea[placeholder*="本文"]');
    if (contentTextareas.length === 0) {
      console.log('⚠️ 本文入力フィールドが見つかりません');
      // labelで探す
      await page.fill('textarea[label*="本文"]', 'これは400エラー調査のためのテスト投稿です。').catch(() => {
        console.log('⚠️ label属性でも見つかりません');
      });
    } else {
      await contentTextareas[0].fill('これは400エラー調査のためのテスト投稿です。');
      console.log('✅ 本文入力完了');
    }
    
    // カテゴリー選択（デフォルトのままにする）
    console.log('✅ カテゴリー: デフォルト（general）');
    
    // 7. 送信前の最終確認
    console.log('\nSTEP 7: 送信前の最終確認');
    const formData = await page.evaluate(() => {
      const title = (document.querySelector('input[placeholder*="タイトル"]') as HTMLInputElement)?.value;
      const content = (document.querySelector('textarea[placeholder*="内容"], textarea[placeholder*="本文"]') as HTMLTextAreaElement)?.value;
      
      return {
        title: title || null,
        content: content || null,
        titleLength: title?.length || 0,
        contentLength: content?.length || 0
      };
    });
    console.log('フォームデータ:', JSON.stringify(formData, null, 2));
    console.log('');
    
    // 8. 送信
    console.log('STEP 8: フォーム送信');
    await page.click('button:has-text("投稿する")');
    await page.waitForTimeout(3000);
    
    // 9. 結果分析
    console.log('\n========== 分析結果 ==========\n');
    
    if (requestData) {
      console.log('📤 リクエスト詳細:');
      console.log('URL:', requestData.url);
      console.log('Method:', requestData.method);
      console.log('Headers:');
      Object.entries(requestData.headers).forEach(([key, value]) => {
        if (key.toLowerCase().includes('csrf') || 
            key.toLowerCase().includes('content-type') ||
            key === 'x-csrf-token') {
          console.log(`  ${key}: ${value}`);
        }
      });
      
      if (requestData.postData) {
        console.log('\nRequest Body:');
        try {
          const body = JSON.parse(requestData.postData);
          console.log(JSON.stringify(body, null, 2));
        } catch (e) {
          console.log(requestData.postData);
        }
      }
    }
    
    console.log('\n📥 レスポンス詳細:');
    if (responseData) {
      console.log('Status:', responseData.status, responseData.statusText);
      
      if (responseBody) {
        console.log('\nResponse Body:');
        console.log(JSON.stringify(responseBody, null, 2));
        
        // エラーメッセージの詳細分析
        if (responseData.status === 400 && responseBody.error) {
          console.log('\n🔴 エラー分析:');
          console.log('メッセージ:', responseBody.error.message || responseBody.error);
          
          if (responseBody.error.details) {
            console.log('詳細:');
            if (typeof responseBody.error.details === 'object') {
              Object.entries(responseBody.error.details).forEach(([field, message]) => {
                console.log(`  ${field}: ${message}`);
              });
            } else {
              console.log('  ', responseBody.error.details);
            }
          }
        }
      }
    }
    
    // 10. UIエラーメッセージの確認
    console.log('\n📋 UI上のエラーメッセージ:');
    const errorMessages = await page.$$eval('.MuiAlert-message', elements => 
      elements.map(el => el.textContent)
    );
    
    if (errorMessages.length > 0) {
      errorMessages.forEach(msg => console.log('  -', msg));
    } else {
      console.log('  エラーメッセージなし');
    }
    
    // 11. コンソールエラーの確認
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(1000);
    
    if (consoleErrors.length > 0) {
      console.log('\n🔴 コンソールエラー:');
      consoleErrors.forEach(error => console.log('  -', error));
    }
    
    // 12. スクリーンショット取得
    await page.screenshot({ path: 'test-results/400-error-state.png', fullPage: true });
    console.log('\n📸 スクリーンショット保存: test-results/400-error-state.png');
    
    console.log('\n========== 調査完了 ==========');
  });

  test('様々なパターンでの400エラー調査', async ({ page }) => {
    console.log('📊 パターン別400エラー調査...\n');
    
    // ログイン
    await page.goto(`${PRODUCTION_URL}/auth/signin`);
    await page.fill('input[name="email"]', LOGIN_EMAIL);
    await page.fill('input[name="password"]', LOGIN_PASSWORD);
    await Promise.all([
      page.waitForNavigation({ url: '**/dashboard' }),
      page.click('button[type="submit"]')
    ]);
    
    // テストパターン定義
    const testPatterns = [
      {
        name: 'タイトルなし',
        title: '',
        content: 'テスト本文',
        expectedError: 'title'
      },
      {
        name: '本文なし',
        title: 'テストタイトル',
        content: '',
        expectedError: 'content'
      },
      {
        name: '長すぎるタイトル',
        title: 'あ'.repeat(101),
        content: 'テスト本文',
        expectedError: 'title'
      },
      {
        name: '長すぎる本文',
        title: 'テストタイトル',
        content: 'あ'.repeat(1001),
        expectedError: 'content'
      },
      {
        name: '正常なデータ',
        title: '正常なタイトル',
        content: '正常な本文です。',
        expectedError: null
      }
    ];
    
    for (const pattern of testPatterns) {
      console.log(`\nテスト: ${pattern.name}`);
      console.log('================================');
      
      await page.goto(`${PRODUCTION_URL}/posts/new`);
      await page.waitForTimeout(2000);
      
      // フォーム入力
      if (pattern.title) {
        await page.fill('input[placeholder*="タイトル"]', pattern.title);
      }
      if (pattern.content) {
        await page.fill('textarea[placeholder*="内容"], textarea[placeholder*="本文"]', pattern.content);
      }
      
      // レスポンス監視
      const responsePromise = page.waitForResponse(
        res => res.url().includes('/api/posts') && res.request().method() === 'POST',
        { timeout: 5000 }
      ).catch(() => null);
      
      // 送信
      await page.click('button:has-text("投稿する")');
      
      const response = await responsePromise;
      
      if (response) {
        const status = response.status();
        console.log('Status:', status);
        
        if (status === 400) {
          const body = await response.json();
          console.log('エラー:', body.error?.message || 'Unknown error');
          if (body.error?.details) {
            console.log('詳細:', body.error.details);
          }
        } else if (status === 201) {
          console.log('✅ 投稿成功');
        }
      } else {
        console.log('⚠️ レスポンスなし（タイムアウト）');
      }
    }
    
    console.log('\n========== パターン調査完了 ==========');
  });
});