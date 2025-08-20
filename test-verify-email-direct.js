// メール確認トークンの直接テストスクリプト
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3003';

async function testVerifyEmail(token) {
  console.log('🚀 メール確認トークンのテスト開始\n');
  console.log('=' .repeat(60));
  console.log('📝 テストデータ:');
  console.log(`  トークン: ${token}`);
  console.log(`  URL: ${BASE_URL}/api/auth/verify-email?token=${token}`);
  console.log('=' .repeat(60));

  try {
    console.log('\n📤 API呼び出し中...');
    
    const response = await fetch(`${BASE_URL}/api/auth/verify-email?token=${token}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      redirect: 'manual', // リダイレクトを手動で処理
    });

    console.log('\n📨 レスポンス:');
    console.log(`  ステータス: ${response.status}`);
    console.log(`  ステータステキスト: ${response.statusText}`);
    console.log(`  Content-Type: ${response.headers.get('content-type')}`);
    
    // リダイレクトの場合
    if (response.status === 307 || response.status === 308) {
      const location = response.headers.get('location');
      console.log(`  リダイレクト先: ${location}`);
    }
    
    // JSONレスポンスの場合
    if (response.headers.get('content-type')?.includes('application/json')) {
      const result = await response.json();
      console.log(`  結果:`, JSON.stringify(result, null, 2));
      
      if (response.ok) {
        console.log('\n✅ メール確認成功！');
        if (result.alreadyVerified) {
          console.log('   ⚠️ 既に確認済みのメールアドレスです');
        } else {
          console.log('   📧 メールアドレスが確認されました');
        }
      } else {
        console.log('\n❌ メール確認失敗:', result.error);
        if (result.error.includes('期限切れ')) {
          console.log('   💡 ヒント: 確認リンクの有効期限が切れています。新規登録をやり直してください。');
        } else if (result.error.includes('無効')) {
          console.log('   💡 ヒント: トークンが無効です。メール内のリンクを正しくコピーしてください。');
        }
      }
    }
    
    console.log('\n🔍 デバッグ情報:');
    console.log('  API エンドポイント:', `${BASE_URL}/api/auth/verify-email`);
    console.log('  メソッド: GET');
    console.log('  パラメータ: token=' + token);
    
  } catch (error) {
    console.error('\n❌ エラー発生:', error.message);
    console.error('詳細:', error);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 ヒント:');
      console.log('  1. Next.jsサーバーが起動していることを確認してください');
      console.log('     npm run dev');
      console.log('  2. ポート3003が正しいことを確認してください');
    }
  }

  console.log('\n' + '=' .repeat(60));
  console.log('テスト完了');
}

// コマンドライン引数からトークンを取得
const token = process.argv[2];

if (!token) {
  console.error('❌ エラー: トークンを指定してください');
  console.error('使用方法: node test-verify-email-direct.js <token>');
  console.error('例: node test-verify-email-direct.js afa8ce39-bcc8-486e-bda7-6ec7234d9d27');
  process.exit(1);
}

// テスト実行
testVerifyEmail(token).catch(console.error);