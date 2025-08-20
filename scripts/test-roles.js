/**
 * ロールベース権限テストスクリプト
 * 各ロールの権限を自動的にテスト
 */

const fetch = require('node-fetch');

// テストケース定義
const testCases = [
  {
    role: 'admin',
    user: {
      email: 'admin@test.local',
      password: 'admin123'
    },
    tests: [
      { action: 'read_posts', expected: true, method: 'GET', path: '/api/posts' },
      { action: 'create_post', expected: true, method: 'POST', path: '/api/posts' },
      { action: 'edit_own_post', expected: true, method: 'PUT', path: '/api/posts/{id}' },
      { action: 'delete_own_post', expected: true, method: 'DELETE', path: '/api/posts/{id}' },
      { action: 'edit_others_post', expected: true, method: 'PUT', path: '/api/posts/{otherId}' },
      { action: 'delete_others_post', expected: true, method: 'DELETE', path: '/api/posts/{otherId}' }
    ]
  },
  {
    role: 'moderator',
    user: {
      email: 'moderator@test.local',
      password: 'mod123'
    },
    tests: [
      { action: 'read_posts', expected: true, method: 'GET', path: '/api/posts' },
      { action: 'create_post', expected: true, method: 'POST', path: '/api/posts' },
      { action: 'edit_own_post', expected: true, method: 'PUT', path: '/api/posts/{id}' },
      { action: 'delete_own_post', expected: true, method: 'DELETE', path: '/api/posts/{id}' },
      { action: 'edit_others_post', expected: false, method: 'PUT', path: '/api/posts/{otherId}' },
      { action: 'delete_others_post', expected: true, method: 'DELETE', path: '/api/posts/{otherId}' }
    ]
  },
  {
    role: 'user',
    user: {
      email: 'user1@test.local',
      password: 'user123'
    },
    tests: [
      { action: 'read_posts', expected: true, method: 'GET', path: '/api/posts' },
      { action: 'create_post', expected: true, method: 'POST', path: '/api/posts' },
      { action: 'edit_own_post', expected: true, method: 'PUT', path: '/api/posts/{id}' },
      { action: 'delete_own_post', expected: true, method: 'DELETE', path: '/api/posts/{id}' },
      { action: 'edit_others_post', expected: false, method: 'PUT', path: '/api/posts/{otherId}' },
      { action: 'delete_others_post', expected: false, method: 'DELETE', path: '/api/posts/{otherId}' }
    ]
  },
  {
    role: 'guest',
    user: null,
    tests: [
      { action: 'read_posts', expected: true, method: 'GET', path: '/api/posts' },
      { action: 'create_post', expected: false, method: 'POST', path: '/api/posts' },
      { action: 'edit_any_post', expected: false, method: 'PUT', path: '/api/posts/{id}' },
      { action: 'delete_any_post', expected: false, method: 'DELETE', path: '/api/posts/{id}' }
    ]
  }
];

const BASE_URL = 'http://localhost:3000';
const testResults = [];

// ログイン関数（テスト用エンドポイント使用）
async function login(email, password) {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/test-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    if (response.ok) {
      const data = await response.json();
      // テスト用トークンをCookieヘッダー形式で返す
      return `test-auth-token=${data.token}`;
    }
    console.error('ログイン失敗:', response.status, await response.text());
    return null;
  } catch (error) {
    console.error('ログインエラー:', error);
    return null;
  }
}

// テスト投稿作成
async function createTestPost(cookies) {
  try {
    const response = await fetch(`${BASE_URL}/api/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies || ''
      },
      body: JSON.stringify({
        title: 'Test Post',
        content: 'Test content for role testing',
        author: 'test'
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.post?._id;
    }
    return null;
  } catch (error) {
    console.error('投稿作成エラー:', error);
    return null;
  }
}

// 権限テスト実行
async function testPermission(role, action, method, path, cookies) {
  try {
    // テスト用のパスを構築
    let testPath = path;
    if (path.includes('{id}')) {
      testPath = path.replace('{id}', '689d231c71658c3212b2f6c2'); // 既存の投稿ID
    }
    if (path.includes('{otherId}')) {
      testPath = path.replace('{otherId}', '689c4990d311f35b3f5f4bca'); // 他人の投稿ID
    }
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies || ''
      }
    };
    
    if (method === 'POST' || method === 'PUT') {
      options.body = JSON.stringify({
        title: 'Test',
        content: 'Test content',
        author: 'test'
      });
    }
    
    const response = await fetch(`${BASE_URL}${testPath}`, options);
    
    // 成功判定
    // 認証済み: 200/201/204が成功
    // 未認証: GETは200が成功、その他は401が成功（正しく拒否）
    let isSuccess;
    if (cookies) {
      // 認証済みの場合
      isSuccess = response.ok; // 200-299のステータスコード
    } else {
      // 未認証の場合
      if (method === 'GET') {
        isSuccess = response.ok; // GETは200が成功
      } else {
        isSuccess = response.status === 401; // その他は401が期待値
      }
    }
    
    return {
      action,
      status: response.status,
      success: isSuccess
    };
  } catch (error) {
    return {
      action,
      status: 'error',
      success: false,
      error: error.message
    };
  }
}

// メインテスト実行
async function runRoleTests() {
  console.log('🧪 ロールベース権限テスト開始\n');
  console.log('=' .repeat(50));
  
  for (const testCase of testCases) {
    console.log(`\n📋 ${testCase.role.toUpperCase()} ロールのテスト`);
    console.log('-'.repeat(40));
    
    let cookies = null;
    
    // ゲスト以外はログイン
    if (testCase.user) {
      console.log(`ログイン中: ${testCase.user.email}`);
      cookies = await login(testCase.user.email, testCase.user.password);
      
      if (!cookies) {
        console.log('❌ ログイン失敗');
        continue;
      }
      console.log('✅ ログイン成功\n');
    } else {
      console.log('ゲストモード（未認証）\n');
    }
    
    // 各テストを実行
    const roleResults = {
      role: testCase.role,
      passed: 0,
      failed: 0,
      tests: []
    };
    
    for (const test of testCase.tests) {
      const result = await testPermission(
        testCase.role,
        test.action,
        test.method,
        test.path,
        cookies
      );
      
      const passed = (result.success === test.expected);
      const icon = passed ? '✅' : '❌';
      
      console.log(`${icon} ${test.action}:`);
      console.log(`   期待値: ${test.expected ? '許可' : '拒否'}`);
      console.log(`   結果: ${result.success ? '許可' : '拒否'} (${result.status})`);
      
      if (passed) {
        roleResults.passed++;
      } else {
        roleResults.failed++;
      }
      
      roleResults.tests.push({
        action: test.action,
        expected: test.expected,
        actual: result.success,
        passed,
        status: result.status
      });
    }
    
    console.log(`\n結果: ${roleResults.passed}/${testCase.tests.length} テスト合格`);
    testResults.push(roleResults);
  }
  
  // 総合サマリー
  console.log('\n' + '='.repeat(50));
  console.log('📊 総合テスト結果サマリー\n');
  
  let totalPassed = 0;
  let totalTests = 0;
  
  testResults.forEach(result => {
    totalPassed += result.passed;
    totalTests += result.tests.length;
    
    const percentage = ((result.passed / result.tests.length) * 100).toFixed(1);
    const status = result.failed === 0 ? '✅' : '⚠️';
    
    console.log(`${status} ${result.role.toUpperCase()}:`);
    console.log(`   合格: ${result.passed}/${result.tests.length} (${percentage}%)`);
  });
  
  const overallPercentage = ((totalPassed / totalTests) * 100).toFixed(1);
  console.log(`\n総合スコア: ${totalPassed}/${totalTests} (${overallPercentage}%)`);
  
  if (overallPercentage >= 90) {
    console.log('🎉 優秀: すべての主要テストに合格');
  } else if (overallPercentage >= 70) {
    console.log('⚠️ 良好: 一部改善が必要');
  } else {
    console.log('❌ 要改善: 権限システムに問題あり');
  }
  
  // 結果をファイルに保存
  const fs = require('fs');
  const reportPath = 'role-test-results.json';
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  console.log(`\n📁 詳細結果を ${reportPath} に保存しました`);
}

// テスト実行
runRoleTests().catch(console.error);