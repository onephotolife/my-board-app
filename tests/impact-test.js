#!/usr/bin/env node

/**
 * 影響範囲テスト
 * getServerSession実装による他機能への影響確認
 */

const axios = require('axios');
const axiosCookieJarSupport = require('axios-cookiejar-support').wrapper;
const tough = require('tough-cookie');

// 認証情報
const AUTH = {
  email: 'one.photolife+1@gmail.com',
  password: '?@thc123THC@?'
};

const BASE_URL = 'http://localhost:3000';

// Cookie管理
const cookieJar = new tough.CookieJar();
const client = axiosCookieJarSupport(axios.create({
  baseURL: BASE_URL,
  jar: cookieJar,
  withCredentials: true,
  timeout: 30000
}));

/**
 * 認証
 */
async function authenticate() {
  try {
    // CSRFトークン取得
    const csrfRes = await client.get('/api/auth/csrf');
    const csrfToken = csrfRes.data.csrfToken;
    
    // ログイン
    const formData = new URLSearchParams();
    formData.append('email', AUTH.email);
    formData.append('password', AUTH.password);
    formData.append('csrfToken', csrfToken);
    formData.append('json', 'true');
    
    await client.post('/api/auth/callback/credentials', formData.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    
    // セッション確認
    const sessionRes = await client.get('/api/auth/session');
    return sessionRes.data;
  } catch (error) {
    console.error('認証エラー:', error.message);
    return null;
  }
}

/**
 * APIテスト
 */
async function testAPI(method, path, data = null) {
  try {
    const config = {};
    let response;
    
    if (method === 'GET') {
      response = await client.get(path, config);
    } else if (method === 'POST') {
      response = await client.post(path, data, config);
    } else if (method === 'PUT') {
      response = await client.put(path, data, config);
    } else if (method === 'DELETE') {
      response = await client.delete(path, config);
    }
    
    return {
      success: true,
      status: response.status,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 0,
      error: error.response?.data || error.message
    };
  }
}

/**
 * 影響範囲テスト実行
 */
async function runImpactTests() {
  console.log('='.repeat(60));
  console.log('🔍 影響範囲テスト');
  console.log('='.repeat(60));
  console.log('実行時刻:', new Date().toISOString());
  console.log('='.repeat(60));
  
  // 認証
  console.log('\n【認証】');
  const session = await authenticate();
  if (!session) {
    console.error('❌ 認証失敗');
    process.exit(1);
  }
  console.log('✅ 認証成功:', session.user.email);
  
  const results = [];
  
  // 1. 全投稿取得（公開）
  console.log('\n【1. 全投稿取得 /api/posts】');
  const allPosts = await testAPI('GET', '/api/posts');
  console.log('Status:', allPosts.status);
  console.log('Success:', allPosts.success);
  if (allPosts.success) {
    console.log('投稿数:', allPosts.data.data?.length || 0);
  }
  results.push({ name: '全投稿取得', ...allPosts });
  
  // 2. 自分の投稿（修正対象）
  console.log('\n【2. 自分の投稿 /api/posts/my-posts】⭐ 修正対象');
  const myPosts = await testAPI('GET', '/api/posts/my-posts');
  console.log('Status:', myPosts.status);
  console.log('Success:', myPosts.success);
  if (myPosts.success) {
    console.log('投稿数:', myPosts.data.data?.length || 0);
  }
  results.push({ name: '自分の投稿', ...myPosts });
  
  // 3. プロフィール取得
  console.log('\n【3. プロフィール /api/users/profile】');
  const profile = await testAPI('GET', '/api/users/profile');
  console.log('Status:', profile.status);
  console.log('Success:', profile.success);
  if (profile.success) {
    console.log('ユーザー名:', profile.data.data?.name);
  }
  results.push({ name: 'プロフィール', ...profile });
  
  // 4. いいね済み投稿
  console.log('\n【4. いいね済み投稿 /api/posts/liked】');
  const likedPosts = await testAPI('GET', '/api/posts/liked');
  console.log('Status:', likedPosts.status);
  console.log('Success:', likedPosts.success);
  if (likedPosts.success) {
    console.log('いいね数:', likedPosts.data.data?.length || 0);
  }
  results.push({ name: 'いいね済み投稿', ...likedPosts });
  
  // 5. 通知取得
  console.log('\n【5. 通知 /api/notifications】');
  const notifications = await testAPI('GET', '/api/notifications');
  console.log('Status:', notifications.status);
  console.log('Success:', notifications.success);
  if (notifications.success) {
    console.log('通知数:', notifications.data.data?.length || 0);
  }
  results.push({ name: '通知', ...notifications });
  
  // 6. タグ一覧
  console.log('\n【6. タグ一覧 /api/tags】');
  const tags = await testAPI('GET', '/api/tags');
  console.log('Status:', tags.status);
  console.log('Success:', tags.success);
  if (tags.success) {
    console.log('タグ数:', tags.data.data?.length || 0);
  }
  results.push({ name: 'タグ一覧', ...tags });
  
  // 7. ダッシュボード統計
  console.log('\n【7. ダッシュボード統計 /api/dashboard/stats】');
  const stats = await testAPI('GET', '/api/dashboard/stats');
  console.log('Status:', stats.status);
  console.log('Success:', stats.success);
  results.push({ name: 'ダッシュボード統計', ...stats });
  
  // 8. セッション（認証状態）
  console.log('\n【8. セッション /api/auth/session】');
  const sessionCheck = await testAPI('GET', '/api/auth/session');
  console.log('Status:', sessionCheck.status);
  console.log('Success:', sessionCheck.success);
  if (sessionCheck.success && sessionCheck.data.user) {
    console.log('認証済み:', sessionCheck.data.user.email);
  }
  results.push({ name: 'セッション', ...sessionCheck });
  
  // 結果サマリー
  console.log('\n' + '='.repeat(60));
  console.log('📊 影響範囲テスト結果サマリー');
  console.log('='.repeat(60));
  
  let passCount = 0;
  let failCount = 0;
  
  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${result.name}: ${status} (${result.status})`);
    if (result.success) passCount++;
    else failCount++;
  });
  
  console.log('\n統計:');
  console.log(`  成功: ${passCount}/${results.length}`);
  console.log(`  失敗: ${failCount}/${results.length}`);
  
  // 特に重要な結果
  const myPostsResult = results.find(r => r.name === '自分の投稿');
  console.log('\n⭐ 修正対象（/api/posts/my-posts）:',
    myPostsResult.success ? '✅ 正常動作' : '❌ エラー');
  
  const allPassed = failCount === 0;
  console.log('\n総合判定:', allPassed ? '✅ 全API正常' : `⚠️ ${failCount}個のAPIでエラー`);
  
  console.log('='.repeat(60));
  console.log('テスト完了時刻:', new Date().toISOString());
  
  return {
    passed: passCount,
    failed: failCount,
    total: results.length,
    details: results
  };
}

// 実行
if (require.main === module) {
  runImpactTests()
    .then(result => {
      process.exit(result.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('実行エラー:', error);
      process.exit(1);
    });
}
