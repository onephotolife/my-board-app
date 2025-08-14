#!/usr/bin/env node

/**
 * 権限管理機能の簡易検証スクリプト
 * 実装された6つの機能を順番にテストします
 */

const BASE_URL = 'http://localhost:3000';
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// テスト用ユーザー（既存のテストユーザーを使用）
const users = {
  userA: { email: 'user1@test.local', password: 'user123' },
  userB: { email: 'user2@test.local', password: 'user123' }
};

let testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

// ヘルパー関数
async function login(email, password) {
  const response = await fetch(`${BASE_URL}/api/auth/test-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  if (response.ok) {
    const data = await response.json();
    return `test-auth-token=${data.token}`;
  }
  return null;
}

async function createPost(token, content) {
  const response = await fetch(`${BASE_URL}/api/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': token
    },
    body: JSON.stringify({
      title: 'Test Post',
      content: content,
      author: 'test'
    })
  });
  
  if (response.ok) {
    const data = await response.json();
    return data.post?._id;
  }
  return null;
}

async function getPosts(token = null) {
  const headers = token ? { 'Cookie': token } : {};
  const response = await fetch(`${BASE_URL}/api/posts`, { headers });
  
  if (response.ok) {
    const data = await response.json();
    return data.posts || [];
  }
  return [];
}

async function editPost(token, postId, newContent) {
  const response = await fetch(`${BASE_URL}/api/posts/${postId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': token
    },
    body: JSON.stringify({
      title: 'Updated',
      content: newContent,
      author: 'test'
    })
  });
  
  return {
    status: response.status,
    ok: response.ok
  };
}

async function deletePost(token, postId) {
  const response = await fetch(`${BASE_URL}/api/posts/${postId}`, {
    method: 'DELETE',
    headers: {
      'Cookie': token
    }
  });
  
  return {
    status: response.status,
    ok: response.ok
  };
}

// テスト関数
function logTest(name, passed, details = '') {
  const icon = passed ? '✅' : '❌';
  const color = passed ? colors.green : colors.red;
  console.log(`${icon} ${color}${name}${colors.reset} ${details}`);
  
  testResults.tests.push({ name, passed, details });
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
}

// メインテスト実行
async function runTests() {
  console.log(`${colors.cyan}🧪 権限管理機能検証開始${colors.reset}\n`);
  console.log('=' .repeat(50));
  
  try {
    // 準備: ユーザーAとBでログインして投稿作成
    console.log(`\n${colors.blue}📝 準備: テストデータ作成${colors.reset}`);
    
    const tokenA = await login(users.userA.email, users.userA.password);
    const tokenB = await login(users.userB.email, users.userB.password);
    
    if (!tokenA || !tokenB) {
      console.error('❌ ログイン失敗。テストを中止します。');
      return;
    }
    
    const postIdA = await createPost(tokenA, 'ユーザーAの投稿');
    const postIdB = await createPost(tokenB, 'ユーザーBの投稿');
    
    if (!postIdA || !postIdB) {
      console.error('❌ 投稿作成失敗。テストを中止します。');
      return;
    }
    
    console.log(`✅ ユーザーA投稿ID: ${postIdA}`);
    console.log(`✅ ユーザーB投稿ID: ${postIdB}`);
    
    // テスト1: 自分の投稿に編集・削除ボタンが表示される
    console.log(`\n${colors.blue}📋 テスト1: ボタン表示権限${colors.reset}`);
    
    const postsForA = await getPosts(tokenA);
    const ownPostA = postsForA.find(p => p._id === postIdA);
    const othersPostB = postsForA.find(p => p._id === postIdB);
    
    logTest(
      '自分の投稿に編集・削除ボタンが表示される',
      ownPostA?.canEdit === true && ownPostA?.canDelete === true,
      `canEdit=${ownPostA?.canEdit}, canDelete=${ownPostA?.canDelete}`
    );
    
    // テスト2: 他人の投稿にはボタンが表示されない
    logTest(
      '他人の投稿にはボタンが表示されない',
      othersPostB?.canEdit === false && othersPostB?.canDelete === false,
      `canEdit=${othersPostB?.canEdit}, canDelete=${othersPostB?.canDelete}`
    );
    
    // テスト3: 編集ページで自分の投稿を編集できる
    console.log(`\n${colors.blue}📋 テスト3: 編集権限${colors.reset}`);
    
    const editOwnResult = await editPost(tokenA, postIdA, '編集された内容');
    logTest(
      '自分の投稿を編集できる',
      editOwnResult.ok && editOwnResult.status === 200,
      `Status: ${editOwnResult.status}`
    );
    
    // テスト4: 他人の投稿の編集URLにアクセスするとエラーが表示される
    const editOthersResult = await editPost(tokenA, postIdB, '不正な編集');
    logTest(
      '他人の投稿を編集しようとすると拒否される',
      !editOthersResult.ok && editOthersResult.status === 403,
      `Status: ${editOthersResult.status}`
    );
    
    // テスト5: APIに不正なリクエストを送ると403エラーが返る
    console.log(`\n${colors.blue}📋 テスト5: API保護${colors.reset}`);
    
    // 削除を試みる
    const deleteOthersResult = await deletePost(tokenA, postIdB);
    logTest(
      'APIに不正な削除リクエストを送ると403エラー',
      !deleteOthersResult.ok && deleteOthersResult.status === 403,
      `Status: ${deleteOthersResult.status}`
    );
    
    // 未認証でPOSTを試みる
    const unauthorizedResult = await editPost(null, postIdA, '未認証編集');
    logTest(
      '未認証リクエストは401エラー',
      unauthorizedResult.status === 401,
      `Status: ${unauthorizedResult.status}`
    );
    
    // テスト6: 削除機能の確認（UIテストのため、APIレベルで確認）
    console.log(`\n${colors.blue}📋 テスト6: 削除権限${colors.reset}`);
    
    const deleteOwnResult = await deletePost(tokenA, postIdA);
    logTest(
      '自分の投稿を削除できる',
      deleteOwnResult.ok && deleteOwnResult.status === 200,
      `Status: ${deleteOwnResult.status}`
    );
    
    // 削除後の確認
    const postsAfterDelete = await getPosts(tokenA);
    const deletedPost = postsAfterDelete.find(p => p._id === postIdA);
    logTest(
      '削除した投稿が表示されない',
      deletedPost === undefined || deletedPost.status === 'deleted',
      deletedPost ? 'ソフトデリート確認' : '投稿が見つからない'
    );
    
  } catch (error) {
    console.error(`\n${colors.red}❌ エラーが発生しました:${colors.reset}`, error.message);
  }
  
  // 結果サマリー
  console.log('\n' + '=' .repeat(50));
  console.log(`${colors.cyan}📊 テスト結果サマリー${colors.reset}\n`);
  
  const total = testResults.passed + testResults.failed;
  const percentage = total > 0 ? ((testResults.passed / total) * 100).toFixed(1) : 0;
  
  console.log(`合格: ${colors.green}${testResults.passed}/${total}${colors.reset} (${percentage}%)`);
  
  if (testResults.failed > 0) {
    console.log(`\n${colors.yellow}⚠️ 失敗したテスト:${colors.reset}`);
    testResults.tests
      .filter(t => !t.passed)
      .forEach(t => {
        console.log(`  - ${t.name}`);
        if (t.details) console.log(`    詳細: ${t.details}`);
      });
  }
  
  // 総合評価
  console.log(`\n${colors.cyan}📋 総合評価:${colors.reset}`);
  if (percentage >= 100) {
    console.log(`${colors.green}🎉 完璧！すべての権限管理機能が正常に動作しています。${colors.reset}`);
  } else if (percentage >= 80) {
    console.log(`${colors.green}✅ 良好: 主要な権限管理機能は動作しています。${colors.reset}`);
  } else if (percentage >= 60) {
    console.log(`${colors.yellow}⚠️ 要改善: 一部の権限管理機能に問題があります。${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ 要修正: 権限管理機能に重大な問題があります。${colors.reset}`);
  }
  
  // 詳細レポート保存
  const fs = require('fs');
  const report = {
    timestamp: new Date().toISOString(),
    results: testResults,
    percentage: percentage
  };
  
  fs.writeFileSync('permission-test-results.json', JSON.stringify(report, null, 2));
  console.log(`\n📁 詳細結果を permission-test-results.json に保存しました`);
}

// 実行
console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
console.log(`${colors.cyan}     権限管理機能 簡易検証スクリプト v1.0${colors.reset}`);
console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);

runTests().catch(console.error);