// 新規登録メール送信テストスクリプト
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

// ランダムなメールアドレスを生成
function generateRandomEmail() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `test_${timestamp}_${random}@example.com`;
}

// ランダムな名前を生成
function generateRandomName() {
  const names = ['田中', '山田', '佐藤', '鈴木', '高橋'];
  const firstNames = ['太郎', '花子', '一郎', '美咲', '健太'];
  const lastName = names[Math.floor(Math.random() * names.length)];
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  return `${lastName} ${firstName}`;
}

async function testRegistration() {
  console.log('🚀 新規登録メールテスト開始\n');
  console.log('=' .repeat(60));

  const email = generateRandomEmail();
  const name = generateRandomName();
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

    if (response.ok) {
      console.log('\n✅ 登録成功！');
      console.log('📧 確認メールが送信されました。');
      console.log(`   宛先: ${email}`);
      
      // 環境変数を確認
      if (process.env.SEND_EMAILS === 'true') {
        console.log('\n💡 実際のメールが送信されています。');
        console.log('   Gmail（one.photolife@gmail.com）をチェックしてください。');
      } else {
        console.log('\n⚠️  開発モード: メール送信はシミュレートされています。');
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
  console.log('テスト完了');
}

// 環境変数の確認
console.log('🔧 環境設定:');
console.log('  NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('  SEND_EMAILS:', process.env.SEND_EMAILS || 'false');

// テスト実行
testRegistration().catch(console.error);