#!/usr/bin/env node

/**
 * 影響範囲テスト（認証必須）
 * コメント機能実装が既存機能に影響していないか確認
 */

const axios = require('axios');
const axiosCookieJarSupport = require('axios-cookiejar-support').wrapper;
const tough = require('tough-cookie');

const BASE_URL = 'http://localhost:3000';
const AUTH_CREDENTIALS = {
  email: 'one.photolife+1@gmail.com',
  password: '?@thc123THC@?'
};

const cookieJar = new tough.CookieJar();
const client = axiosCookieJarSupport(axios.create({
  baseURL: BASE_URL,
  jar: cookieJar,
  withCredentials: true,
  timeout: 30000,
  validateStatus: (status) => true
}));

async function authenticate() {
  const csrfRes = await client.get('/api/auth/csrf');
  const csrfToken = csrfRes.data.csrfToken;
  
  const formData = new URLSearchParams();
  formData.append('email', AUTH_CREDENTIALS.email);
  formData.append('password', AUTH_CREDENTIALS.password);
  formData.append('csrfToken', csrfToken);
  formData.append('json', 'true');
  
  await client.post('/api/auth/callback/credentials', formData.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  
  const sessionRes = await client.get('/api/auth/session');
  if (!sessionRes.data.user) throw new Error('認証失敗');
  
  return { user: sessionRes.data.user, csrfToken };
}

async function testImpact(authData) {
  console.log('=== 影響範囲テスト ===\n');
  const results = [];
  
  // 1. 投稿作成機能
  console.log('[TEST 1] 投稿作成機能');
  const postRes = await client.post('/api/posts', {
    title: '影響範囲テスト投稿',
    content: '既存機能のテスト',
    author: 'Impact Test'
  });
  
  if (postRes.status === 201) {
    console.log('✅ PASS: 投稿作成は正常');
    results.push({ test: '投稿作成', status: 'PASS' });
  } else {
    console.log('❌ FAIL: 投稿作成に問題あり');
    results.push({ test: '投稿作成', status: 'FAIL', error: postRes.status });
  }
  
  const postId = postRes.data.data?._id;
  
  // 2. 投稿一覧取得
  console.log('\n[TEST 2] 投稿一覧取得');
  const listRes = await client.get('/api/posts');
  
  if (listRes.status === 200 && Array.isArray(listRes.data.data)) {
    console.log('✅ PASS: 投稿一覧取得は正常');
    console.log(`  - 投稿数: ${listRes.data.data.length}`);
    results.push({ test: '投稿一覧取得', status: 'PASS' });
  } else {
    console.log('❌ FAIL: 投稿一覧取得に問題あり');
    results.push({ test: '投稿一覧取得', status: 'FAIL' });
  }
  
  // 3. 投稿編集機能
  console.log('\n[TEST 3] 投稿編集機能');
  if (postId) {
    const editRes = await client.put(`/api/posts/${postId}`, {
      title: '編集後タイトル',
      content: '編集後コンテンツ',
      author: 'Impact Test'
    });
    
    if (editRes.status === 200) {
      console.log('✅ PASS: 投稿編集は正常');
      results.push({ test: '投稿編集', status: 'PASS' });
    } else {
      console.log('❌ FAIL: 投稿編集に問題あり');
      results.push({ test: '投稿編集', status: 'FAIL' });
    }
  }
  
  // 4. 個別投稿取得
  console.log('\n[TEST 4] 個別投稿取得');
  if (postId) {
    const getRes = await client.get(`/api/posts/${postId}`);
    
    if (getRes.status === 200) {
      console.log('✅ PASS: 個別投稿取得は正常');
      console.log(`  - タイトル: ${getRes.data.data?.title}`);
      results.push({ test: '個別投稿取得', status: 'PASS' });
    } else {
      console.log('❌ FAIL: 個別投稿取得に問題あり');
      results.push({ test: '個別投稿取得', status: 'FAIL' });
    }
  }
  
  // 5. コメント追加（新機能）
  console.log('\n[TEST 5] コメント機能（新機能）');
  if (postId) {
    const csrfRes = await client.get('/api/csrf');
    const csrfToken = csrfRes.data.token;
    
    const commentRes = await client.post(
      `/api/posts/${postId}/comments`,
      { content: 'テストコメント' },
      { headers: { 'x-csrf-token': csrfToken }}
    );
    
    if (commentRes.status === 201) {
      console.log('✅ PASS: コメント機能は正常');
      results.push({ test: 'コメント機能', status: 'PASS' });
    } else {
      console.log('❌ FAIL: コメント機能に問題あり');
      results.push({ test: 'コメント機能', status: 'FAIL' });
    }
  }
  
  // 6. 投稿削除機能
  console.log('\n[TEST 6] 投稿削除機能');
  if (postId) {
    const deleteRes = await client.delete(`/api/posts/${postId}`);
    
    if (deleteRes.status === 200) {
      console.log('✅ PASS: 投稿削除は正常');
      results.push({ test: '投稿削除', status: 'PASS' });
    } else {
      console.log('❌ FAIL: 投稿削除に問題あり');
      results.push({ test: '投稿削除', status: 'FAIL' });
    }
  }
  
  // 7. 認証状態確認
  console.log('\n[TEST 7] 認証状態');
  const sessionRes = await client.get('/api/auth/session');
  
  if (sessionRes.status === 200 && sessionRes.data.user) {
    console.log('✅ PASS: 認証状態は維持されている');
    console.log(`  - ユーザー: ${sessionRes.data.user.email}`);
    results.push({ test: '認証状態', status: 'PASS' });
  } else {
    console.log('❌ FAIL: 認証状態に問題あり');
    results.push({ test: '認証状態', status: 'FAIL' });
  }
  
  // 8. /boardページアクセス
  console.log('\n[TEST 8] /boardページアクセス');
  const boardRes = await client.get('/board');
  
  if (boardRes.status === 200) {
    console.log('✅ PASS: /boardページは正常にアクセス可能');
    results.push({ test: '/boardページ', status: 'PASS' });
  } else {
    console.log('❌ FAIL: /boardページへのアクセスに問題あり');
    results.push({ test: '/boardページ', status: 'FAIL' });
  }
  
  // 結果サマリー
  console.log('\n=== テスト結果サマリー ===');
  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  
  console.log(`合格: ${passCount}/${results.length}`);
  console.log(`失敗: ${failCount}/${results.length}`);
  
  if (failCount > 0) {
    console.log('\n失敗したテスト:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  - ${r.test}`);
    });
  }
  
  return failCount === 0;
}

async function main() {
  try {
    const authData = await authenticate();
    console.log('認証成功:', authData.user.email);
    console.log('---\n');
    
    const success = await testImpact(authData);
    
    console.log('\n---');
    console.log('結論: ' + (success ? '既存機能への影響なし' : '既存機能に影響あり'));
    
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('テスト失敗:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
