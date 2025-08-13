/**
 * APIを直接テストして問題を特定
 */

async function testAPI() {
  console.log('🔍 API直接テスト\n');
  
  // テストデータ
  const testData = {
    name: 'テストユーザー',
    bio: 'これはAPIテストの自己紹介です'
  };
  
  console.log('送信データ:', JSON.stringify(testData, null, 2));
  
  try {
    // 1. まずGETでセッションを確認
    console.log('\n1. GET /api/profile (認証確認)');
    const getRes = await fetch('http://localhost:3000/api/profile');
    console.log('   Status:', getRes.status);
    
    if (getRes.status === 401) {
      console.log('   ❌ 認証されていません');
      console.log('\n⚠️ ブラウザでログインしてから、Cookieを取得してください:');
      console.log('   1. ブラウザでログイン');
      console.log('   2. DevToolsでApplication > Cookies');
      console.log('   3. next-auth.session-tokenの値をコピー');
      console.log('\n   その後、以下のコマンドを実行:');
      console.log('   curl -X PUT http://localhost:3000/api/profile \\');
      console.log('     -H "Content-Type: application/json" \\');
      console.log('     -H "Cookie: next-auth.session-token=YOUR_TOKEN" \\');
      console.log(`     -d '${JSON.stringify(testData)}'`);
      return;
    }
    
    const userData = await getRes.json();
    console.log('   現在のユーザー:', userData.user?.name);
    console.log('   現在の自己紹介:', userData.user?.bio || '（空）');
    
    // 2. PUTで更新
    console.log('\n2. PUT /api/profile (更新)');
    const putRes = await fetch('http://localhost:3000/api/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    console.log('   Status:', putRes.status);
    const result = await putRes.json();
    console.log('   レスポンス:', JSON.stringify(result, null, 2));
    
    if (result.user) {
      console.log('\n3. 結果確認');
      console.log('   更新後の名前:', result.user.name);
      console.log('   更新後の自己紹介:', result.user.bio || '（空）');
      
      if (result.user.bio === testData.bio) {
        console.log('\n✅ 自己紹介が正しく更新されました！');
      } else {
        console.log('\n❌ 自己紹介の更新に失敗しました');
        console.log('   期待値:', testData.bio);
        console.log('   実際値:', result.user.bio);
      }
    }
    
  } catch (error) {
    console.error('エラー:', error.message);
  }
  
  // サーバーログの確認方法
  console.log('\n📝 サーバーログを確認:');
  console.log('   tail -f dev.log | grep -E "(Received profile|Updated user bio)"');
}

testAPI();