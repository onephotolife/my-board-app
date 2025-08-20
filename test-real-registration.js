// 実際のメールアドレスへの新規登録テストスクリプト
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testRealRegistration() {
  console.log('🚀 実メールアドレスへの新規登録テスト開始\n');
  console.log('=' .repeat(60));

  // 実際のGmailアドレスに送信（タイムスタンプ付きでユニークにする）
  const timestamp = Date.now();
  const email = 'one.photolife@gmail.com';
  const name = `テストユーザー${timestamp}`;
  const password = 'Test1234!';

  console.log('📝 テストデータ:');
  console.log(`  メール: ${email}`);
  console.log(`  名前: ${name}`);
  console.log(`  パスワード: ${password}`);
  console.log('=' .repeat(60));

  try {
    console.log('\n📤 新規登録リクエスト送信中...');
    
    const response = await fetch(`${BASE_URL}/api/auth/register`, {
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

    const result = await response.json();
    
    console.log('\n📨 レスポンス:');
    console.log(`  ステータス: ${response.status}`);
    console.log(`  結果:`, JSON.stringify(result, null, 2));

    if (response.ok || response.status === 201) {
      console.log('\n✅ 登録成功！');
      console.log('📧 確認メールが送信されました。');
      console.log(`   宛先: ${email}`);
      console.log('\n⚠️  重要: one.photolife@gmail.com のGmailを確認してください！');
      console.log('   件名: 「Board App - メールアドレスを確認してください」');
    } else if (response.status === 400 && result.error && result.error.includes('既に')) {
      console.log('\n⚠️  このメールアドレスは既に登録されています。');
      console.log('   別のテストを実行するか、データベースをクリアしてください。');
      
      // パスワードリセットをテスト
      console.log('\n📤 代わりにパスワードリセットをテストします...');
      
      const resetResponse = await fetch(`${BASE_URL}/api/auth/request-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      const resetResult = await resetResponse.json();
      console.log('\n📨 パスワードリセットレスポンス:');
      console.log(`  ステータス: ${resetResponse.status}`);
      console.log(`  結果:`, JSON.stringify(resetResult, null, 2));
      
      if (resetResponse.ok) {
        console.log('\n✅ パスワードリセットメール送信成功！');
        console.log('   one.photolife@gmail.com のGmailを確認してください！');
        console.log('   件名: 「Board App - パスワードリセットのご案内」');
      }
    } else {
      console.log('\n❌ 登録失敗:', result.error);
      if (result.suggestion) {
        console.log('💡 提案:', result.suggestion);
      }
    }

    // デバッグ情報
    console.log('\n🔍 デバッグ情報:');
    console.log('  API エンドポイント:', `${BASE_URL}/api/auth/register`);
    console.log('  メソッド: POST');
    console.log('  コンテンツタイプ: application/json');
    console.log('  送信先Gmail: one.photolife@gmail.com');
    
  } catch (error) {
    console.error('\n❌ エラー発生:', error.message);
    console.error('詳細:', error);
    
    // 接続エラーの場合のヒント
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 ヒント:');
      console.log('  1. Next.jsサーバーが起動していることを確認してください');
      console.log('     npm run dev');
      console.log('  2. ポート3000が使用可能であることを確認してください');
    }
  }

  console.log('\n' + '=' .repeat(60));
  console.log('🎯 テスト完了');
  console.log('\n📬 次のステップ:');
  console.log('  1. one.photolife@gmail.com のGmailを開く');
  console.log('  2. 受信トレイまたはプロモーションタブを確認');
  console.log('  3. 「Board App」からのメールを探す');
  console.log('  4. メール内のリンクをクリックして確認');
}

// 環境変数の確認
console.log('🔧 環境設定:');
console.log('  NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('  SEND_EMAILS:', process.env.SEND_EMAILS || 'false');
console.log('  GMAIL設定: one.photolife@gmail.com');

// テスト実行
testRealRegistration().catch(console.error);