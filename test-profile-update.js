// プロフィール更新のデバッグテスト

async function testProfileUpdate() {
  console.log('🔍 プロフィール更新のAPIテスト開始...\n');
  
  const BASE_URL = 'http://localhost:3000';
  
  // テスト用のクッキーを取得（実際のセッションが必要）
  console.log('⚠️ このテストを実行する前に、ブラウザでログインしてください。');
  console.log('ログイン後、開発者ツールでCookieを確認し、next-auth.session-tokenをコピーしてください。\n');
  
  // テストデータ
  const testData = {
    name: 'テストユーザー',
    bio: 'これはテスト用の自己紹介文です。保存後に表示されるか確認します。'
  };
  
  console.log('📤 送信データ:', JSON.stringify(testData, null, 2));
  
  try {
    // 1. プロフィール更新API呼び出し
    console.log('\n1️⃣ PUT /api/profile を実行...');
    const response = await fetch(`${BASE_URL}/api/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        // 実際のテストでは、ここにセッションクッキーを設定する必要があります
        // 'Cookie': 'next-auth.session-token=YOUR_SESSION_TOKEN'
      },
      body: JSON.stringify(testData)
    });
    
    console.log(`レスポンスステータス: ${response.status}`);
    
    const result = await response.json();
    console.log('📥 レスポンス:', JSON.stringify(result, null, 2));
    
    if (response.ok && result.user) {
      console.log('\n✅ プロフィール更新成功！');
      console.log('返却されたユーザー情報:');
      console.log(`  - 名前: ${result.user.name}`);
      console.log(`  - 自己紹介: ${result.user.bio}`);
      
      if (result.user.bio === testData.bio) {
        console.log('✅ 自己紹介が正しく保存されています');
      } else {
        console.log('❌ 自己紹介の内容が一致しません');
      }
    } else {
      console.log('❌ プロフィール更新に失敗しました');
    }
    
    // 2. 保存後のデータ取得
    console.log('\n2️⃣ GET /api/profile で保存後のデータを確認...');
    const getResponse = await fetch(`${BASE_URL}/api/profile`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // 'Cookie': 'next-auth.session-token=YOUR_SESSION_TOKEN'
      }
    });
    
    if (getResponse.ok) {
      const getData = await getResponse.json();
      console.log('📥 取得したプロフィール:', JSON.stringify(getData, null, 2));
      
      if (getData.user && getData.user.bio) {
        console.log(`\n✅ 自己紹介が保存されています: "${getData.user.bio}"`);
      } else {
        console.log('\n❌ 自己紹介が取得できません');
      }
    }
    
  } catch (error) {
    console.error('❌ テスト中にエラー:', error);
  }
  
  console.log('\n========================================');
  console.log('デバッグポイント:');
  console.log('1. ブラウザの開発者ツールでネットワークタブを確認');
  console.log('2. PUT /api/profile のレスポンスを確認');
  console.log('3. レスポンスにuserオブジェクトとbioフィールドが含まれているか確認');
  console.log('4. その後のGET /api/profileでbioが返されているか確認');
  console.log('========================================\n');
}

// 実行
testProfileUpdate();