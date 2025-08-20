/**
 * プロフィール機能の手動検証スクリプト
 * 修正が正しく適用されているか最終確認
 */

const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3000';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function manualVerification() {
  console.log('🔍 プロフィール機能の最終動作確認\n');
  console.log('========================================');
  console.log('修正内容:');
  console.log('1. デバッグメッセージの削除');
  console.log('2. bioのundefined処理改善');
  console.log('3. APIレスポンス処理の修正');
  console.log('========================================\n');

  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 100,
    defaultViewport: { width: 1280, height: 800 },
    devtools: true
  });

  const page = await browser.newPage();

  // エラー監視
  let hasErrors = false;
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('❌ コンソールエラー検出:', msg.text());
      hasErrors = true;
    }
  });

  page.on('response', response => {
    if (response.url().includes('/api/profile') && response.status() >= 400) {
      console.log(`❌ APIエラー: ${response.status()} - ${response.url()}`);
      hasErrors = true;
    }
  });

  try {
    console.log('📌 ステップ 1: プロフィールページにアクセス');
    console.log('----------------------------------------');
    await page.goto(`${BASE_URL}/profile`, { waitUntil: 'networkidle0' });
    await sleep(2000);

    const currentUrl = page.url();
    
    if (currentUrl.includes('/auth/signin')) {
      console.log('⚠️ ログインが必要です');
      console.log('\n手動でログインしてください:');
      console.log('1. メールアドレスとパスワードを入力');
      console.log('2. サインインボタンをクリック');
      console.log('\n⏸️ 20秒待機します...');
      await sleep(20000);
      
      // プロフィールページに再度移動
      await page.goto(`${BASE_URL}/profile`, { waitUntil: 'networkidle0' });
      await sleep(2000);
    }

    // プロフィールページの確認
    const isProfilePage = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1 && h1.textContent === 'プロフィール';
    });

    if (isProfilePage) {
      console.log('✅ プロフィールページが表示されています');
    } else {
      console.log('❌ プロフィールページが正しく表示されていません');
      throw new Error('プロフィールページの表示に失敗');
    }

    console.log('\n📌 ステップ 2: 現在の自己紹介内容を確認');
    console.log('----------------------------------------');
    
    const currentBio = await page.evaluate(() => {
      const textarea = document.querySelector('textarea');
      return textarea ? textarea.value : null;
    });
    
    console.log(`現在の自己紹介: "${currentBio || '（空）'}"`);
    
    // デバッグメッセージが含まれていないか確認
    if (currentBio && currentBio.includes('Initializing form with user data')) {
      console.log('❌ デバッグメッセージがまだ含まれています！');
      console.log('   修正が適用されていない可能性があります。');
    } else {
      console.log('✅ デバッグメッセージは含まれていません');
    }

    console.log('\n📌 ステップ 3: 編集モードで自己紹介を更新');
    console.log('----------------------------------------');
    
    // 編集ボタンをクリック
    const editButton = await page.$('button');
    const editButtonText = await page.evaluate(el => el.textContent, editButton);
    
    if (editButtonText === '編集') {
      await editButton.click();
      console.log('✅ 編集モードに切り替えました');
      await sleep(1000);
    }

    // 自己紹介を更新
    const testBio = `修正確認テスト: ${new Date().toLocaleString('ja-JP')}`;
    const textarea = await page.$('textarea');
    
    if (textarea) {
      // 既存の内容をクリア
      await textarea.click({ clickCount: 3 });
      await page.keyboard.press('Backspace');
      
      // 新しい内容を入力
      await textarea.type(testBio);
      console.log(`✅ 新しい自己紹介を入力: "${testBio}"`);
      
      // 保存ボタンをクリック
      const saveButton = await page.$$eval('button', buttons => {
        const saveBtn = buttons.find(btn => btn.textContent === '保存');
        if (saveBtn) {
          saveBtn.click();
          return true;
        }
        return false;
      });
      
      if (saveButton) {
        console.log('✅ 保存ボタンをクリックしました');
        await sleep(3000);
      }
    }

    console.log('\n📌 ステップ 4: 保存結果の確認');
    console.log('----------------------------------------');
    
    // 成功メッセージの確認
    const hasSuccessMessage = await page.evaluate(() => {
      const alerts = Array.from(document.querySelectorAll('[class*="MuiAlert"]'));
      return alerts.some(alert => alert.textContent.includes('更新しました'));
    });
    
    if (hasSuccessMessage) {
      console.log('✅ 成功メッセージが表示されました');
    } else {
      console.log('⚠️ 成功メッセージが見つかりません');
    }
    
    // 保存後の自己紹介を確認
    await sleep(1000);
    const savedBio = await page.evaluate(() => {
      const textarea = document.querySelector('textarea');
      return textarea ? textarea.value : null;
    });
    
    if (savedBio === testBio) {
      console.log('✅ 自己紹介が正しく保存されました');
      console.log(`   保存された内容: "${savedBio}"`);
    } else {
      console.log('❌ 自己紹介の保存に問題があります');
      console.log(`   期待値: "${testBio}"`);
      console.log(`   実際値: "${savedBio}"`);
    }

    console.log('\n📌 ステップ 5: ページリロード後の永続性確認');
    console.log('----------------------------------------');
    
    await page.reload({ waitUntil: 'networkidle0' });
    await sleep(2000);
    
    const reloadedBio = await page.evaluate(() => {
      const textarea = document.querySelector('textarea');
      return textarea ? textarea.value : null;
    });
    
    if (reloadedBio === testBio) {
      console.log('✅ リロード後も自己紹介が保持されています');
    } else {
      console.log('❌ リロード後に自己紹介が失われました');
      console.log(`   期待値: "${testBio}"`);
      console.log(`   実際値: "${reloadedBio}"`);
    }

    // API直接確認
    console.log('\n📌 ステップ 6: APIレスポンスの確認');
    console.log('----------------------------------------');
    
    const apiResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/profile');
        if (response.ok) {
          const data = await response.json();
          return data.user;
        }
        return null;
      } catch (error) {
        return null;
      }
    });
    
    if (apiResponse) {
      console.log('✅ APIレスポンス取得成功');
      console.log(`   名前: ${apiResponse.name}`);
      console.log(`   自己紹介: ${apiResponse.bio || '（空）'}`);
      console.log(`   メール: ${apiResponse.email}`);
    } else {
      console.log('⚠️ APIレスポンスの取得に失敗');
    }

    // 最終結果
    console.log('\n========================================');
    console.log('📊 検証結果サマリー');
    console.log('========================================');
    
    if (!hasErrors && reloadedBio === testBio) {
      console.log('🎉 すべての検証項目をクリア！');
      console.log('✅ プロフィール機能は正常に動作しています');
      console.log('\n修正内容:');
      console.log('- デバッグメッセージの削除: 完了');
      console.log('- bioの適切な処理: 完了');
      console.log('- データの永続性: 確認済み');
    } else {
      console.log('⚠️ 一部の項目で問題が検出されました');
      console.log('再度修正内容を確認してください');
    }

    console.log('\n💡 確認ポイント:');
    console.log('1. コンソールにエラーが表示されていないか');
    console.log('2. 自己紹介欄にデバッグメッセージが含まれていないか');
    console.log('3. 保存後すぐに内容が反映されるか');
    console.log('4. ページリロード後も内容が保持されるか');

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message);
  } finally {
    console.log('\n📸 最終状態のスクリーンショットを保存...');
    await page.screenshot({ 
      path: 'profile-verification-final.png',
      fullPage: true 
    });
    console.log('保存先: profile-verification-final.png');
    
    console.log('\n⏸️ ブラウザを10秒間開いたままにします...');
    console.log('   手動で追加の確認を行ってください');
    await sleep(10000);
    
    await browser.close();
    console.log('\n🔒 検証完了');
  }
}

// 実行
console.log('🚀 プロフィール機能の最終動作確認を開始します\n');
manualVerification().catch(console.error);