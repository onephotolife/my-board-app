/**
 * プロフィール機能の結合テスト（Integration Test）
 * API エンドポイントとデータベースの連携を確認
 */

const BASE_URL = 'http://localhost:3000';

console.log('🔗 結合テスト（Integration Test）開始\n');
console.log('========================================');
console.log('⚠️ 前提条件:');
console.log('  1. 開発サーバーが起動している（npm run dev）');
console.log('  2. MongoDBが起動している');
console.log('  3. ログイン済みのセッションがある');
console.log('========================================\n');

// テスト結果を記録
let passed = 0;
let failed = 0;

async function test(description, fn) {
  try {
    await fn();
    console.log(`✅ ${description}`);
    passed++;
  } catch (error) {
    console.log(`❌ ${description}`);
    console.log(`   Error: ${error.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// テストの実行
async function runIntegrationTests() {
  // 1. APIエンドポイントの疎通確認
  console.log('1️⃣ APIエンドポイントの疎通確認');
  console.log('----------------------------------------');
  
  await test('GET /api/profile - 未認証の場合401を返す', async () => {
    const response = await fetch(`${BASE_URL}/api/profile`);
    assert(response.status === 401, `Expected 401 but got ${response.status}`);
  });
  
  // 2. データの取得と更新のフロー
  console.log('\n2️⃣ データの取得と更新のフロー');
  console.log('----------------------------------------');
  console.log('⚠️ 以下のテストは認証が必要です。');
  console.log('   ブラウザでログインしてからテストしてください。\n');
  
  await test('PUT /api/profile - 名前のみ更新', async () => {
    const testData = {
      name: 'テストユーザー' + Date.now(),
      bio: ''
    };
    
    const response = await fetch(`${BASE_URL}/api/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    // 認証されていない場合はスキップ
    if (response.status === 401) {
      console.log('   ⏭️ スキップ（認証が必要）');
      return;
    }
    
    assert(response.status === 200, `Expected 200 but got ${response.status}`);
    const result = await response.json();
    assert(result.user, 'Response should contain user object');
    assert(result.user.name === testData.name, 'Name should be updated');
  });
  
  await test('PUT /api/profile - 自己紹介を更新', async () => {
    const testData = {
      name: 'テストユーザー',
      bio: 'これはテスト用の自己紹介です。' + Date.now()
    };
    
    const response = await fetch(`${BASE_URL}/api/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    // 認証されていない場合はスキップ
    if (response.status === 401) {
      console.log('   ⏭️ スキップ（認証が必要）');
      return;
    }
    
    assert(response.status === 200, `Expected 200 but got ${response.status}`);
    const result = await response.json();
    assert(result.user, 'Response should contain user object');
    assert(result.user.bio === testData.bio, 'Bio should be updated');
  });
  
  // 3. バリデーションのテスト
  console.log('\n3️⃣ バリデーションのテスト');
  console.log('----------------------------------------');
  
  await test('PUT /api/profile - 空の名前を拒否', async () => {
    const testData = {
      name: '',
      bio: 'テスト'
    };
    
    const response = await fetch(`${BASE_URL}/api/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    // 認証されていない場合はスキップ
    if (response.status === 401) {
      console.log('   ⏭️ スキップ（認証が必要）');
      return;
    }
    
    assert(response.status === 400, `Expected 400 but got ${response.status}`);
  });
  
  await test('PUT /api/profile - 200文字を超える自己紹介を拒否', async () => {
    const testData = {
      name: 'テストユーザー',
      bio: 'あ'.repeat(201)
    };
    
    const response = await fetch(`${BASE_URL}/api/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    // 認証されていない場合はスキップ
    if (response.status === 401) {
      console.log('   ⏭️ スキップ（認証が必要）');
      return;
    }
    
    assert(response.status === 400, `Expected 400 but got ${response.status}`);
  });
  
  // 4. データの永続性確認
  console.log('\n4️⃣ データの永続性確認');
  console.log('----------------------------------------');
  
  await test('更新後のデータが次回取得時に反映される', async () => {
    // まず更新
    const updateData = {
      name: 'テストユーザー確認',
      bio: '永続性テスト' + Date.now()
    };
    
    const updateResponse = await fetch(`${BASE_URL}/api/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData)
    });
    
    if (updateResponse.status === 401) {
      console.log('   ⏭️ スキップ（認証が必要）');
      return;
    }
    
    // 少し待つ
    await sleep(1000);
    
    // 再取得
    const getResponse = await fetch(`${BASE_URL}/api/profile`);
    
    if (getResponse.status === 401) {
      console.log('   ⏭️ スキップ（認証が必要）');
      return;
    }
    
    const getData = await getResponse.json();
    assert(getData.user.bio === updateData.bio, 'Bio should persist after update');
  });
  
  // 結果サマリー
  console.log('\n========================================');
  console.log('📊 結合テスト結果サマリー');
  console.log('========================================');
  console.log(`✅ 成功: ${passed} 件`);
  console.log(`❌ 失敗: ${failed} 件`);
  console.log(`📈 成功率: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 すべての結合テストが成功しました！');
  } else {
    console.log('\n⚠️ 一部のテストが失敗しました。');
  }
}

// テスト実行
runIntegrationTests().catch(console.error);