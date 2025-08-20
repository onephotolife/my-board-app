// 強力なパスワードでのリセットテスト
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3003';

async function testPasswordReset(token) {
  console.log('🚀 パスワードリセットテスト（強力なパスワード版）\n');
  console.log('=' .repeat(60));
  
  // より強力なパスワード（大文字、小文字、数字、特殊文字を含み、パターンなし）
  const strongPassword = 'Xk9$mP2#nL7@qR4!';
  
  console.log('📝 テストデータ:');
  console.log(`  トークン: ${token.substring(0, 20)}...`);
  console.log(`  新パスワード: ${strongPassword}`);
  console.log('  パスワード要件:');
  console.log('    ✓ 8文字以上');
  console.log('    ✓ 大文字を含む');
  console.log('    ✓ 小文字を含む');
  console.log('    ✓ 数字を含む');
  console.log('    ✓ 特殊文字(@$!%*?&)を含む');
  console.log('    ✓ 単純なパターンなし');
  console.log('=' .repeat(60));

  try {
    console.log('\n📤 パスワードリセットAPI呼び出し中...');
    
    const response = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        password: strongPassword,
        confirmPassword: strongPassword,
      }),
    });

    const result = await response.json();
    
    console.log('\n📨 レスポンス:');
    console.log(`  ステータス: ${response.status}`);
    console.log(`  結果:`, JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('\n🎉 パスワードリセット成功！');
      console.log('   ✅ 新しいパスワードが設定されました');
      console.log('   📍 ログインページ: http://localhost:3003/auth/signin');
      console.log('\n   次のステップ:');
      console.log('   1. ログインページにアクセス');
      console.log('   2. メールアドレスと新しいパスワードでログイン');
    } else {
      console.log('\n❌ パスワードリセット失敗');
      if (result.type === 'WEAK_PASSWORD') {
        console.log('   パスワードがまだ弱いです。さらに複雑なパスワードを試してください。');
      }
    }
    
  } catch (error) {
    console.error('\n❌ エラー発生:', error.message);
  }

  console.log('\n' + '=' .repeat(60));
  console.log('テスト完了');
}

// トークンを引数から取得
const token = process.argv[2] || '466fc62d2d85b3ce8b8a561c2bb5abedcbc1ef42f60156d16be9ab54783520cb';

testPasswordReset(token).catch(console.error);