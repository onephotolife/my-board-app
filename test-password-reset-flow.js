// パスワードリセットフローの完全テストスクリプト
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3003';

async function testPasswordResetToken(token) {
  console.log('🚀 パスワードリセットトークンのテスト開始\n');
  console.log('=' .repeat(60));
  console.log('📝 テストデータ:');
  console.log(`  トークン: ${token}`);
  console.log(`  長さ: ${token.length}文字`);
  console.log(`  API URL: ${BASE_URL}/api/auth/reset-password?token=${token}`);
  console.log('=' .repeat(60));

  try {
    // ステップ1: トークンの検証（GET）
    console.log('\n📤 トークン検証API呼び出し中...');
    
    const validateResponse = await fetch(`${BASE_URL}/api/auth/reset-password?token=${token}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    const validateResult = await validateResponse.json();
    
    console.log('\n📨 検証レスポンス:');
    console.log(`  ステータス: ${validateResponse.status}`);
    console.log(`  結果:`, JSON.stringify(validateResult, null, 2));
    
    if (!validateResponse.ok || !validateResult.valid) {
      console.log('\n❌ トークン検証失敗:', validateResult.error);
      if (validateResult.error?.includes('期限切れ')) {
        console.log('   💡 ヒント: リセットリンクの有効期限が切れています。新しいリセットリンクを要求してください。');
      } else if (validateResult.error?.includes('使用済み')) {
        console.log('   💡 ヒント: このリセットリンクは既に使用されています。');
      } else if (validateResult.error?.includes('無効')) {
        console.log('   💡 ヒント: トークンが無効です。メール内のリンクを正しくコピーしてください。');
      }
      return;
    }
    
    console.log('\n✅ トークン検証成功！');
    console.log(`   メールアドレス: ${validateResult.email}`);
    
    // ステップ2: 新しいパスワードの設定（POST）
    const newPassword = 'NewPassword123!';
    console.log('\n📝 ステップ2: パスワードリセット');
    console.log(`   新しいパスワード: ${newPassword}`);
    console.log('=' .repeat(60));
    
    console.log('\n📤 パスワードリセットAPI呼び出し中...');
    
    const resetResponse = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        password: newPassword,
        confirmPassword: newPassword,
      }),
    });

    const resetResult = await resetResponse.json();
    
    console.log('\n📨 リセットレスポンス:');
    console.log(`  ステータス: ${resetResponse.status}`);
    console.log(`  結果:`, JSON.stringify(resetResult, null, 2));
    
    if (resetResponse.ok) {
      console.log('\n🎉 パスワードリセット成功！');
      console.log('   新しいパスワードでログインできます');
      console.log(`   ログインページ: ${BASE_URL}/auth/signin`);
    } else {
      console.log('\n❌ パスワードリセット失敗:', resetResult.error);
      if (resetResult.type) {
        console.log(`   エラータイプ: ${resetResult.type}`);
      }
    }
    
    console.log('\n🔍 デバッグ情報:');
    console.log('  API エンドポイント:', `${BASE_URL}/api/auth/reset-password`);
    console.log('  GET: トークン検証');
    console.log('  POST: パスワード更新');
    
  } catch (error) {
    console.error('\n❌ エラー発生:', error.message);
    console.error('詳細:', error);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 ヒント:');
      console.log('  1. Next.jsサーバーが起動していることを確認してください');
      console.log('     npm run dev');
      console.log('  2. ポート3003が正しいことを確認してください');
      console.log('  3. MongoDBが起動していることを確認してください');
      console.log('     brew services start mongodb-community');
    }
  }

  console.log('\n' + '=' .repeat(60));
  console.log('テスト完了');
}

// 新しいパスワードリセットトークンを生成してテスト
async function createAndTestPasswordReset() {
  console.log('🚀 完全なパスワードリセットフローテスト開始\n');
  console.log('=' .repeat(60));

  const email = 'one.photolife@gmail.com';
  
  try {
    // ステップ1: パスワードリセットをリクエスト
    console.log('📝 ステップ1: パスワードリセットリクエスト');
    console.log(`  メール: ${email}`);
    console.log('=' .repeat(60));
    
    console.log('\n📤 リセットリクエスト送信中...');
    
    const requestResponse = await fetch(`${BASE_URL}/api/auth/request-reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const requestResult = await requestResponse.json();
    
    console.log('\n📨 リクエストレスポンス:');
    console.log(`  ステータス: ${requestResponse.status}`);
    console.log(`  結果:`, JSON.stringify(requestResult, null, 2));
    
    if (!requestResponse.ok) {
      console.log('\n❌ リセットリクエスト失敗:', requestResult.error);
      return;
    }
    
    console.log('\n✅ パスワードリセットメール送信成功！');
    console.log('   📧 one.photolife@gmail.com のGmailを確認してください');
    console.log('   件名: 「Board App - パスワードリセットのご案内」');
    
    // データベースから直接トークンを取得（デバッグ用）
    console.log('\n📝 ステップ2: トークンの取得（デバッグ用）');
    console.log('   注意: 実際のシナリオではメールからトークンを取得します');
    
    const { MongoClient } = require('mongodb');
    const client = new MongoClient('mongodb://localhost:27017');
    
    try {
      await client.connect();
      const db = client.db('boardDB');
      const passwordResets = db.collection('passwordresets');
      
      const resetDoc = await passwordResets.findOne(
        { email: email.toLowerCase() },
        { sort: { createdAt: -1 } }
      );
      
      if (!resetDoc || !resetDoc.token) {
        console.log('❌ リセットトークンが見つかりません');
        return;
      }
      
      const token = resetDoc.token;
      console.log(`   トークン取得成功: ${token}`);
      console.log(`   有効期限: ${resetDoc.expiresAt}`);
      
      // ステップ3: トークンをテスト
      console.log('\n' + '=' .repeat(60));
      await testPasswordResetToken(token);
      
    } finally {
      await client.close();
    }
    
  } catch (error) {
    console.error('\n❌ エラー発生:', error.message);
    console.error('詳細:', error);
  }
}

// コマンドライン引数を確認
const token = process.argv[2];

if (token) {
  // 特定のトークンをテスト
  testPasswordResetToken(token).catch(console.error);
} else {
  // 新しいリセットリクエストを作成してテスト
  console.log('💡 トークンが指定されていないため、新しいリセットリクエストを作成します\n');
  createAndTestPasswordReset().catch(console.error);
}