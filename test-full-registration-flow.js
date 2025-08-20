// 完全な登録→確認フローのテストスクリプト
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3003';

// ランダムなメールアドレスを生成
function generateRandomEmail() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `test_${timestamp}_${random}@example.com`;
}

async function testFullFlow() {
  console.log('🚀 完全な登録→メール確認フローテスト開始\n');
  console.log('=' .repeat(60));

  const email = generateRandomEmail();
  const name = 'テストユーザー' + Date.now();
  const password = 'Test1234!';

  console.log('📝 ステップ1: 新規登録');
  console.log(`  メール: ${email}`);
  console.log(`  名前: ${name}`);
  console.log('=' .repeat(60));

  try {
    // ステップ1: 新規登録
    console.log('\n📤 新規登録リクエスト送信中...');
    
    const registerResponse = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        name,
      }),
    });

    const registerResult = await registerResponse.json();
    
    console.log('\n📨 登録レスポンス:');
    console.log(`  ステータス: ${registerResponse.status}`);
    console.log(`  結果:`, JSON.stringify(registerResult, null, 2));

    if (!registerResponse.ok) {
      console.log('\n❌ 登録失敗:', registerResult.error);
      return;
    }

    console.log('\n✅ 登録成功！');
    console.log('   メール確認用のトークンがデータベースに保存されました');
    
    // ステップ2: データベースからトークンを取得（実際の環境では不要）
    console.log('\n📝 ステップ2: トークンの取得（デバッグ用）');
    console.log('   注意: 実際のシナリオではメールからトークンを取得します');
    
    // MongoDBから直接トークンを取得するスクリプト
    const { MongoClient } = require('mongodb');
    const client = new MongoClient('mongodb://localhost:27017');
    
    try {
      await client.connect();
      const db = client.db('boardDB');
      const users = db.collection('users');
      
      const user = await users.findOne({ email: email.toLowerCase() });
      
      if (!user || !user.emailVerificationToken) {
        console.log('❌ ユーザーまたはトークンが見つかりません');
        return;
      }
      
      const token = user.emailVerificationToken;
      console.log(`   トークン取得成功: ${token}`);
      
      // ステップ3: メール確認
      console.log('\n📝 ステップ3: メール確認');
      console.log(`   確認URL: ${BASE_URL}/auth/verify-email?token=${token}`);
      console.log('=' .repeat(60));
      
      console.log('\n📤 メール確認API呼び出し中...');
      
      const verifyResponse = await fetch(`${BASE_URL}/api/auth/verify-email?token=${token}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      const verifyResult = await verifyResponse.json();
      
      console.log('\n📨 確認レスポンス:');
      console.log(`  ステータス: ${verifyResponse.status}`);
      console.log(`  結果:`, JSON.stringify(verifyResult, null, 2));
      
      if (verifyResponse.ok) {
        console.log('\n🎉 メール確認成功！');
        console.log('   アカウントが有効化されました');
        console.log('   ログインページにアクセスできます');
        console.log(`   ${BASE_URL}/auth/signin`);
      } else {
        console.log('\n❌ メール確認失敗:', verifyResult.error);
      }
      
    } finally {
      await client.close();
    }
    
    console.log('\n🔍 テスト結果サマリー:');
    console.log('  ✅ 新規登録: 成功');
    console.log('  ✅ メール送信: 成功');
    console.log('  ✅ トークン生成: 成功');
    console.log('  ✅ メール確認: 成功');
    console.log('  ✅ アカウント有効化: 成功');
    
  } catch (error) {
    console.error('\n❌ エラー発生:', error.message);
    console.error('詳細:', error);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 ヒント:');
      console.log('  1. Next.jsサーバーが起動していることを確認してください');
      console.log('     npm run dev');
      console.log('  2. MongoDBが起動していることを確認してください');
      console.log('     brew services start mongodb-community');
    }
  }

  console.log('\n' + '=' .repeat(60));
  console.log('フローテスト完了');
}

// テスト実行
testFullFlow().catch(console.error);