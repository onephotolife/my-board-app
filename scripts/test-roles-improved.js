#!/usr/bin/env node

/**
 * 改善版ロールベーステストスクリプト
 * 実際の投稿作成とIDを使用
 */

const testCases = [
  {
    role: 'admin',
    user: { email: 'admin@test.local', password: 'admin123' },
    tests: [
      { action: 'read_posts', expected: true, method: 'GET', path: '/api/posts' },
      { action: 'create_post', expected: true, method: 'POST', path: '/api/posts' },
      { action: 'edit_own_post', expected: true, method: 'PUT', path: '/api/posts/{ownId}' },
      { action: 'delete_own_post', expected: true, method: 'DELETE', path: '/api/posts/{ownId}' },
      { action: 'edit_others_post', expected: true, method: 'PUT', path: '/api/posts/{otherId}' },
      { action: 'delete_others_post', expected: true, method: 'DELETE', path: '/api/posts/{otherId}' }
    ]
  },
  {
    role: 'moderator',
    user: { email: 'moderator@test.local', password: 'mod123' },
    tests: [
      { action: 'read_posts', expected: true, method: 'GET', path: '/api/posts' },
      { action: 'create_post', expected: true, method: 'POST', path: '/api/posts' },
      { action: 'edit_own_post', expected: true, method: 'PUT', path: '/api/posts/{ownId}' },
      { action: 'delete_own_post', expected: true, method: 'DELETE', path: '/api/posts/{ownId}' },
      { action: 'edit_others_post', expected: false, method: 'PUT', path: '/api/posts/{otherId}' },
      { action: 'delete_others_post', expected: true, method: 'DELETE', path: '/api/posts/{otherId}' }
    ]
  },
  {
    role: 'user',
    user: { email: 'user1@test.local', password: 'user123' },
    tests: [
      { action: 'read_posts', expected: true, method: 'GET', path: '/api/posts' },
      { action: 'create_post', expected: true, method: 'POST', path: '/api/posts' },
      { action: 'edit_own_post', expected: true, method: 'PUT', path: '/api/posts/{ownId}' },
      { action: 'delete_own_post', expected: true, method: 'DELETE', path: '/api/posts/{ownId}' },
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
      { action: 'edit_any_post', expected: false, method: 'PUT', path: '/api/posts/{anyId}' },
      { action: 'delete_any_post', expected: false, method: 'DELETE', path: '/api/posts/{anyId}' }
    ]
  }
];

const BASE_URL = 'http://localhost:3000';
const testResults = [];
let createdPosts = {}; // ユーザーごとの投稿を保存

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
async function createTestPost(cookies, userEmail) {
  try {
    const response = await fetch(`${BASE_URL}/api/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies || ''
      },
      body: JSON.stringify({
        title: `Test Post by ${userEmail}`,
        content: `This is a test post created by ${userEmail} at ${new Date().toISOString()}`,
        author: userEmail
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.post?._id;
    }
    console.error('投稿作成失敗:', response.status, await response.text());
    return null;
  } catch (error) {
    console.error('投稿作成エラー:', error);
    return null;
  }
}

// 事前準備：各ユーザーで投稿を作成
async function setupTestData() {
  console.log('📝 テストデータ準備中...\n');
  
  // 各ユーザーでログインして投稿を作成
  for (const testCase of testCases) {
    if (testCase.user) {
      const cookies = await login(testCase.user.email, testCase.user.password);
      if (cookies) {
        const postId = await createTestPost(cookies, testCase.user.email);
        if (postId) {
          createdPosts[testCase.user.email] = postId;
          console.log(`✅ ${testCase.role}の投稿作成: ${postId}`);
        } else {
          console.log(`❌ ${testCase.role}の投稿作成失敗`);
        }
      }
    }
  }
  
  console.log('\n' + '-'.repeat(50));
}

// 権限テスト実行
async function testPermission(role, action, method, path, cookies, userEmail) {
  try {
    // テスト用のパスを構築
    let testPath = path;
    
    // 自分の投稿ID
    if (path.includes('{ownId}')) {
      const ownId = createdPosts[userEmail];
      if (!ownId) {
        return { action, status: 'skip', success: false, error: '自分の投稿がありません' };
      }
      testPath = path.replace('{ownId}', ownId);
    }
    
    // 他人の投稿ID（別のユーザーの投稿を使用）
    if (path.includes('{otherId}')) {
      const otherIds = Object.entries(createdPosts)
        .filter(([email]) => email !== userEmail)
        .map(([, id]) => id);
      
      if (otherIds.length === 0) {
        return { action, status: 'skip', success: false, error: '他人の投稿がありません' };
      }
      testPath = path.replace('{otherId}', otherIds[0]);
    }
    
    // 任意の投稿ID（ゲスト用）
    if (path.includes('{anyId}')) {
      const anyId = Object.values(createdPosts)[0];
      if (!anyId) {
        return { action, status: 'skip', success: false, error: '投稿がありません' };
      }
      testPath = path.replace('{anyId}', anyId);
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
        title: 'Updated Test',
        content: 'Updated test content',
        author: userEmail || 'guest'
      });
    }
    
    const response = await fetch(`${BASE_URL}${testPath}`, options);
    
    // 成功判定ロジック
    let isSuccess;
    if (cookies) {
      // 認証済みの場合: 200-299が成功
      isSuccess = response.ok;
    } else {
      // 未認証の場合
      if (method === 'GET') {
        isSuccess = response.ok; // GETは200が成功
      } else {
        isSuccess = response.status === 401; // その他は401が期待値（正しく拒否）
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
  console.log('🧪 改善版ロールベース権限テスト開始\n');
  console.log('=' .repeat(50));
  
  // テストデータの準備
  await setupTestData();
  
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
      skipped: 0,
      tests: []
    };
    
    for (const test of testCase.tests) {
      const result = await testPermission(
        testCase.role,
        test.action,
        test.method,
        test.path,
        cookies,
        testCase.user?.email
      );
      
      if (result.status === 'skip') {
        console.log(`⏭️ ${test.action}: スキップ (${result.error})`);
        roleResults.skipped++;
        continue;
      }
      
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
    
    const totalTests = roleResults.passed + roleResults.failed;
    console.log(`\n結果: ${roleResults.passed}/${totalTests} テスト合格`);
    if (roleResults.skipped > 0) {
      console.log(`（${roleResults.skipped}件スキップ）`);
    }
    testResults.push(roleResults);
  }
  
  // 総合サマリー
  console.log('\n' + '='.repeat(50));
  console.log('📊 総合テスト結果サマリー\n');
  
  let totalPassed = 0;
  let totalTests = 0;
  let totalSkipped = 0;
  
  testResults.forEach(result => {
    totalPassed += result.passed;
    totalTests += result.passed + result.failed;
    totalSkipped += result.skipped;
    
    const percentage = totalTests > 0 ? ((result.passed / (result.passed + result.failed)) * 100).toFixed(1) : 0;
    const status = result.failed === 0 ? '✅' : '⚠️';
    
    console.log(`${status} ${result.role.toUpperCase()}:`);
    console.log(`   合格: ${result.passed}/${result.passed + result.failed} (${percentage}%)`);
    if (result.skipped > 0) {
      console.log(`   スキップ: ${result.skipped}件`);
    }
  });
  
  const overallPercentage = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0;
  console.log(`\n総合スコア: ${totalPassed}/${totalTests} (${overallPercentage}%)`);
  if (totalSkipped > 0) {
    console.log(`スキップ: ${totalSkipped}件`);
  }
  
  if (overallPercentage >= 90) {
    console.log('🎉 優秀: すべての主要テストに合格');
  } else if (overallPercentage >= 70) {
    console.log('⚠️ 良好: 一部改善が必要');
  } else {
    console.log('❌ 要改善: 権限システムに問題あり');
  }
  
  // 結果をファイルに保存
  const fs = require('fs');
  const reportPath = 'role-test-results-improved.json';
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  console.log(`\n📁 詳細結果を ${reportPath} に保存しました`);
}

// テスト実行
runRoleTests().catch(console.error);