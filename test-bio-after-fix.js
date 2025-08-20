const puppeteer = require('puppeteer');

async function testBioAfterFix() {
  console.log('🔍 修正後の自己紹介機能テスト\n');
  console.log('========================================');
  console.log('修正内容:');
  console.log('✅ 既存ユーザーにbioフィールドを追加');
  console.log('✅ APIの更新処理を改善');
  console.log('========================================\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 200,
    defaultViewport: { width: 1280, height: 800 }
  });

  const page = await browser.newPage();

  try {
    console.log('1. プロフィールページにアクセス');
    await page.goto('http://localhost:3000/profile', { waitUntil: 'networkidle0' });
    
    console.log('\n⏰ 30秒待機します。この間に:');
    console.log('  1. ログインしてください（必要な場合）');
    console.log('  2. 編集ボタンをクリック');
    console.log('  3. 自己紹介欄に「修正後のテスト」と入力');
    console.log('  4. 保存ボタンをクリック\n');
    
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // 自己紹介の内容を確認
    const bio = await page.evaluate(() => {
      const textarea = document.querySelector('textarea');
      return textarea ? textarea.value : null;
    });
    
    console.log('\n📝 結果:');
    console.log(`自己紹介: "${bio || '空'}"`);
    
    if (bio && bio.length > 0 && bio !== '') {
      console.log('\n✅ 自己紹介が正しく保存されました！');
      
      // ページリロードして永続性を確認
      console.log('\n2. ページリロードして永続性を確認');
      await page.reload({ waitUntil: 'networkidle0' });
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const bioAfterReload = await page.evaluate(() => {
        const textarea = document.querySelector('textarea');
        return textarea ? textarea.value : null;
      });
      
      if (bioAfterReload === bio) {
        console.log('✅ リロード後も自己紹介が保持されています');
      } else {
        console.log('❌ リロード後に自己紹介が失われました');
      }
    } else {
      console.log('\n❌ 自己紹介が保存されていません');
      console.log('サーバーログを確認してください:');
      console.log('tail -f dev.log | grep -E "(Updating with|Verification|Response bio)"');
    }
    
    // MongoDBのデータを直接確認
    console.log('\n3. MongoDBの確認コマンド:');
    console.log('mongosh boardDB --quiet --eval \'db.users.findOne({email:"one.photolife+1@gmail.com"},{bio:1,name:1})\'');
    
  } catch (error) {
    console.error('エラー:', error.message);
  } finally {
    console.log('\n📸 スクリーンショットを保存');
    await page.screenshot({ path: 'bio-test-result.png', fullPage: true });
    
    await browser.close();
    console.log('テスト完了');
  }
}

testBioAfterFix();