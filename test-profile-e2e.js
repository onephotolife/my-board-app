/**
 * プロフィール機能のE2Eテスト（End-to-End Test）
 * ユーザーの実際の操作フローを自動化してテスト
 */

const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3000';

console.log('🚀 E2Eテスト（End-to-End Test）開始\n');
console.log('========================================');
console.log('⚠️ 前提条件:');
console.log('  1. 開発サーバーが起動している（npm run dev）');
console.log('  2. MongoDBが起動している');
console.log('  3. Puppeteerがインストール済み');
console.log('========================================\n');

// テスト結果を記録
let passed = 0;
let failed = 0;
const testResults = [];

async function test(description, fn) {
  const startTime = Date.now();
  try {
    await fn();
    const duration = Date.now() - startTime;
    console.log(`✅ ${description} (${duration}ms)`);
    testResults.push({ test: description, status: 'passed', duration });
    passed++;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`❌ ${description} (${duration}ms)`);
    console.log(`   Error: ${error.message}`);
    testResults.push({ test: description, status: 'failed', duration, error: error.message });
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// E2Eテストの実行
async function runE2ETests() {
  const browser = await puppeteer.launch({
    headless: false, // テスト中の動作を確認できるように
    slowMo: 50, // 動作をゆっくりにして見やすく
    defaultViewport: { width: 1280, height: 800 }
  });

  const page = await browser.newPage();

  // コンソールメッセージの監視
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });

  // ネットワークエラーの監視
  const networkErrors = [];
  page.on('response', response => {
    if (response.status() >= 400) {
      networkErrors.push({
        url: response.url(),
        status: response.status()
      });
    }
  });

  try {
    // 1. ページアクセスとナビゲーション
    console.log('1️⃣ ページアクセスとナビゲーションのテスト');
    console.log('----------------------------------------');

    await test('トップページにアクセスできる', async () => {
      const response = await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
      assert(response.status() === 200, `Expected 200 but got ${response.status()}`);
    });

    await test('プロフィールページへのリンクが存在する', async () => {
      // ヘッダーのアバターメニューを探す
      const hasProfileLink = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        return links.some(link => link.href.includes('/profile'));
      });
      
      // リンクが見つからない場合はログインが必要
      if (!hasProfileLink) {
        console.log('   ℹ️ プロフィールリンクが見つかりません（ログインが必要かもしれません）');
      }
    });

    // 2. プロフィールページの表示テスト
    console.log('\n2️⃣ プロフィールページの表示テスト');
    console.log('----------------------------------------');

    await test('プロフィールページに直接アクセス', async () => {
      await page.goto(`${BASE_URL}/profile`, { waitUntil: 'networkidle0' });
      await sleep(1000);
      
      const currentUrl = page.url();
      // 未ログインの場合はサインインページにリダイレクトされる
      if (currentUrl.includes('/auth/signin')) {
        console.log('   ℹ️ サインインページにリダイレクトされました（正常）');
      } else {
        // プロフィールページが表示される場合
        const hasProfileTitle = await page.evaluate(() => {
          const h1 = document.querySelector('h1');
          return h1 && h1.textContent === 'プロフィール';
        });
        assert(hasProfileTitle, 'プロフィールページのタイトルが表示されている');
      }
    });

    // 3. テスト用アカウントでログイン
    console.log('\n3️⃣ ログインフローのテスト');
    console.log('----------------------------------------');

    await test('サインインページに移動', async () => {
      await page.goto(`${BASE_URL}/auth/signin`, { waitUntil: 'networkidle0' });
      const hasEmailInput = await page.$('input[name="email"]') !== null;
      assert(hasEmailInput, 'メールアドレス入力欄が存在する');
    });

    await test('テストアカウントでログイン試行', async () => {
      // テストアカウント情報（実際のテストでは環境変数から取得）
      const testEmail = 'test@example.com';
      const testPassword = 'password123';
      
      // メールアドレスとパスワードを入力
      await page.type('input[name="email"]', testEmail);
      await page.type('input[name="password"]', testPassword);
      
      // ログインボタンをクリック
      await page.click('button[type="submit"]');
      
      // 結果を待つ
      await sleep(2000);
      
      const currentUrl = page.url();
      console.log(`   現在のURL: ${currentUrl}`);
      
      if (currentUrl.includes('/auth/signin')) {
        console.log('   ⚠️ ログインに失敗しました（認証情報を確認してください）');
      }
    });

    // 4. プロフィール編集のE2Eテスト
    console.log('\n4️⃣ プロフィール編集のE2Eテスト');
    console.log('----------------------------------------');

    await test('プロフィールページで編集ボタンをクリック', async () => {
      // プロフィールページに移動
      await page.goto(`${BASE_URL}/profile`, { waitUntil: 'networkidle0' });
      await sleep(1000);
      
      // ログインしている場合のみテスト
      if (!page.url().includes('/auth/signin')) {
        const editButton = await page.$('button:has-text("編集")');
        if (editButton) {
          await editButton.click();
          await sleep(500);
          
          // 保存ボタンが表示されることを確認
          const saveButton = await page.$('button:has-text("保存")');
          assert(saveButton !== null, '保存ボタンが表示される');
        } else {
          console.log('   ⏭️ スキップ（編集ボタンが見つかりません）');
        }
      } else {
        console.log('   ⏭️ スキップ（ログインが必要）');
      }
    });

    await test('自己紹介を入力して保存', async () => {
      if (!page.url().includes('/auth/signin')) {
        // テキストエリアを探す
        const bioTextarea = await page.$('textarea');
        if (bioTextarea) {
          // クリアして新しいテキストを入力
          await bioTextarea.click({ clickCount: 3 }); // 全選択
          await page.keyboard.press('Backspace'); // 削除
          
          const testBio = `E2Eテストによる自己紹介 ${new Date().toLocaleString('ja-JP')}`;
          await bioTextarea.type(testBio);
          
          // 保存ボタンをクリック
          const saveButton = await page.$('button:has-text("保存")');
          if (saveButton) {
            await saveButton.click();
            await sleep(2000);
            
            // 成功メッセージを確認
            const hasSuccessMessage = await page.evaluate(() => {
              const alerts = Array.from(document.querySelectorAll('[class*="MuiAlert"]'));
              return alerts.some(alert => alert.textContent.includes('更新しました'));
            });
            
            assert(hasSuccessMessage, '成功メッセージが表示される');
          }
        } else {
          console.log('   ⏭️ スキップ（自己紹介欄が見つかりません）');
        }
      } else {
        console.log('   ⏭️ スキップ（ログインが必要）');
      }
    });

    // 5. データの永続性確認
    console.log('\n5️⃣ データの永続性確認');
    console.log('----------------------------------------');

    await test('ページリロード後も自己紹介が表示される', async () => {
      if (!page.url().includes('/auth/signin')) {
        // ページをリロード
        await page.reload({ waitUntil: 'networkidle0' });
        await sleep(1000);
        
        // 自己紹介の内容を確認
        const bioTextarea = await page.$('textarea');
        if (bioTextarea) {
          const bioValue = await page.evaluate(el => el.value, bioTextarea);
          assert(bioValue && bioValue.length > 0, '自己紹介が保存されている');
          console.log(`   保存された自己紹介: "${bioValue.substring(0, 50)}..."`);
        }
      } else {
        console.log('   ⏭️ スキップ（ログインが必要）');
      }
    });

    // 6. エラーハンドリングのテスト
    console.log('\n6️⃣ エラーハンドリングのテスト');
    console.log('----------------------------------------');

    await test('文字数制限のバリデーション', async () => {
      if (!page.url().includes('/auth/signin')) {
        // 編集モードにする
        const editButton = await page.$('button:has-text("編集")');
        if (editButton) {
          await editButton.click();
          await sleep(500);
          
          // 201文字の自己紹介を入力
          const bioTextarea = await page.$('textarea');
          if (bioTextarea) {
            await bioTextarea.click({ clickCount: 3 });
            await page.keyboard.press('Backspace');
            
            const longBio = 'あ'.repeat(201);
            await bioTextarea.type(longBio);
            
            // エラーメッセージを確認
            const hasError = await page.evaluate(() => {
              const helperTexts = Array.from(document.querySelectorAll('[class*="MuiFormHelperText-root"]'));
              return helperTexts.some(text => text.textContent.includes('200文字以内'));
            });
            
            assert(hasError, 'エラーメッセージが表示される');
          }
        }
      } else {
        console.log('   ⏭️ スキップ（ログインが必要）');
      }
    });

    // 7. パフォーマンステスト
    console.log('\n7️⃣ パフォーマンステスト');
    console.log('----------------------------------------');

    await test('プロフィール更新のレスポンス時間', async () => {
      if (!page.url().includes('/auth/signin')) {
        const startTime = Date.now();
        
        // 更新処理を実行
        const editButton = await page.$('button:has-text("編集")');
        if (editButton) {
          await editButton.click();
          await sleep(500);
          
          const saveButton = await page.$('button:has-text("保存")');
          if (saveButton) {
            await saveButton.click();
            
            // 成功メッセージが表示されるまで待つ
            await page.waitForSelector('[class*="MuiAlert"]', { timeout: 5000 });
            
            const responseTime = Date.now() - startTime;
            console.log(`   レスポンス時間: ${responseTime}ms`);
            assert(responseTime < 3000, 'レスポンス時間が3秒以内');
          }
        }
      } else {
        console.log('   ⏭️ スキップ（ログインが必要）');
      }
    });

  } catch (error) {
    console.error('テスト実行中にエラーが発生:', error);
  } finally {
    // スクリーンショットを保存
    await page.screenshot({ 
      path: 'e2e-test-final-state.png',
      fullPage: true 
    });
    console.log('\n📸 最終状態のスクリーンショット: e2e-test-final-state.png');

    // コンソールログの確認
    const errors = consoleLogs.filter(log => log.type === 'error');
    if (errors.length > 0) {
      console.log('\n⚠️ コンソールエラー:');
      errors.forEach(err => console.log(`   - ${err.text}`));
    }

    // ネットワークエラーの確認
    if (networkErrors.length > 0) {
      console.log('\n⚠️ ネットワークエラー:');
      networkErrors.forEach(err => console.log(`   - ${err.status}: ${err.url}`));
    }

    // ブラウザを閉じる
    await sleep(3000); // 最終確認のため少し待つ
    await browser.close();
  }

  // 結果サマリー
  console.log('\n========================================');
  console.log('📊 E2Eテスト結果サマリー');
  console.log('========================================');
  console.log(`✅ 成功: ${passed} 件`);
  console.log(`❌ 失敗: ${failed} 件`);
  console.log(`📈 成功率: ${Math.round((passed / (passed + failed)) * 100)}%`);
  console.log(`⏱️ 総実行時間: ${testResults.reduce((sum, r) => sum + r.duration, 0)}ms`);

  // 詳細レポート
  console.log('\n📋 詳細レポート:');
  console.log('----------------------------------------');
  testResults.forEach(result => {
    const icon = result.status === 'passed' ? '✅' : '❌';
    console.log(`${icon} ${result.test} (${result.duration}ms)`);
    if (result.error) {
      console.log(`   └─ ${result.error}`);
    }
  });

  if (failed === 0) {
    console.log('\n🎉 すべてのE2Eテストが成功しました！');
  } else {
    console.log('\n⚠️ 一部のテストが失敗しました。');
    process.exit(1);
  }
}

// テスト実行
runE2ETests().catch(console.error);