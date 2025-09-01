#!/usr/bin/env node

/**
 * 影響範囲包括テスト
 * /my-posts 修正が他機能に悪影響を与えていないか確認
 * 認証情報: one.photolife+1@gmail.com / ?@thc123THC@?
 */

const axios = require('axios');
const axiosCookieJarSupport = require('axios-cookiejar-support').wrapper;
const tough = require('tough-cookie');
const fs = require('fs');
const path = require('path');

// 設定
const BASE_URL = 'http://localhost:3000';
const AUTH_CREDENTIALS = {
  email: 'one.photolife+1@gmail.com',
  password: '?@thc123THC@?'
};

// Cookie Jarの設定
const cookieJar = new tough.CookieJar();
const client = axiosCookieJarSupport(axios.create({
  baseURL: BASE_URL,
  jar: cookieJar,
  withCredentials: true,
  timeout: 30000,
  validateStatus: (status) => true
}));

// テスト結果
const results = {
  timestamp: new Date().toISOString(),
  tests: [],
  summary: { total: 0, passed: 0, failed: 0 }
};

// テスト実行
async function runTest(name, testFn) {
  console.log(`📝 [INFO] テスト開始: ${name}`);
  const startTime = Date.now();
  
  try {
    const result = await testFn();
    const duration = Date.now() - startTime;
    
    results.tests.push({
      name,
      status: 'PASS',
      duration,
      result
    });
    results.summary.total++;
    results.summary.passed++;
    
    console.log(`✅ [SUCCESS] ${name}: PASS (${duration}ms)`);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    results.tests.push({
      name,
      status: 'FAIL',
      duration,
      error: error.message
    });
    results.summary.total++;
    results.summary.failed++;
    
    console.log(`❌ [ERROR] ${name}: FAIL (${duration}ms) - ${error.message}`);
    throw error;
  }
}

// 認証フロー
async function testAuthFlow() {
  const csrfRes = await client.get('/api/auth/csrf');
  if (csrfRes.status !== 200) throw new Error(`CSRF取得失敗: ${csrfRes.status}`);
  
  const formData = new URLSearchParams();
  formData.append('email', AUTH_CREDENTIALS.email);
  formData.append('password', AUTH_CREDENTIALS.password);
  formData.append('csrfToken', csrfRes.data.csrfToken);
  formData.append('json', 'true');
  
  const loginRes = await client.post('/api/auth/callback/credentials', formData.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  
  if (loginRes.status !== 200) throw new Error(`ログイン失敗: ${loginRes.status}`);
  
  const sessionRes = await client.get('/api/auth/session');
  if (!sessionRes.data.user) throw new Error('セッション未確立');
  
  return {
    userId: sessionRes.data.user.id,
    email: sessionRes.data.user.email
  };
}

// メイン
async function main() {
  console.log('========================================');
  console.log('  影響範囲包括テスト');
  console.log('========================================\n');
  
  try {
    // 認証
    await runTest('認証フロー', testAuthFlow);
    
    // my-posts テスト
    await runTest('/api/posts/my-posts', async () => {
      const res = await client.get('/api/posts/my-posts');
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      return { status: res.status, count: res.data.data?.length || 0 };
    });
    
    // 一般投稿取得
    await runTest('/api/posts', async () => {
      const res = await client.get('/api/posts');
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      return { status: res.status, count: res.data.posts?.length || 0 };
    });
    
    // 認証一貫性
    await runTest('認証一貫性', async () => {
      const results = [];
      for (let i = 0; i < 3; i++) {
        const res = await client.get('/api/auth/session');
        results.push(res.data.user?.id);
      }
      const allSame = results.every(id => id === results[0]);
      if (!allSame) throw new Error('セッション不一致');
      return { consistent: true, userId: results[0] };
    });
    
  } catch (error) {
    console.log(`\n致命的エラー: ${error.message}`);
  }
  
  // サマリー
  console.log('\n========================================');
  console.log(`総テスト数: ${results.summary.total}`);
  console.log(`✅ 成功: ${results.summary.passed}`);
  console.log(`❌ 失敗: ${results.summary.failed}`);
  console.log(`成功率: ${(results.summary.passed / results.summary.total * 100).toFixed(1)}%`);
  
  if (results.summary.failed === 0) {
    console.log('\n🎉 影響範囲テスト: 全て合格！');
  } else {
    console.log('\n⚠️ 影響範囲テスト: 一部失敗');
  }
  
  process.exit(results.summary.failed > 0 ? 1 : 0);
}

main();
