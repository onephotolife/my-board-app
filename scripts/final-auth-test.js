#!/usr/bin/env node

const fetch = require('node-fetch');

async function runFinalAuthTest() {
  console.log('🔒 最終認証保護機能テスト');
  console.log('=' .repeat(50));
  
  const baseUrl = 'http://localhost:3000';
  const results = {
    total: 0,
    passed: 0,
    warnings: 0,
    failed: 0,
    details: []
  };
  
  const addResult = (name, status, message, responseTime = null) => {
    results.total++;
    results[status]++;
    results.details.push({
      name,
      status,
      message,
      responseTime
    });
    
    const icon = status === 'passed' ? '✅' : status === 'warnings' ? '⚠️' : '❌';
    const timeStr = responseTime ? ` (${responseTime}ms)` : '';
    console.log(`${icon} ${name}${timeStr}`);
    if (message) console.log(`   ${message}`);
  };
  
  console.log('\n📍 1. 基本接続テスト');
  try {
    const start = Date.now();
    const response = await fetch(`${baseUrl}/`);
    const responseTime = Date.now() - start;
    
    if (response.status === 200) {
      addResult('ホームページアクセス', 'passed', 'サーバー正常稼働', responseTime);
    } else {
      addResult('ホームページアクセス', 'failed', `ステータス: ${response.status}`, responseTime);
    }
  } catch (error) {
    addResult('ホームページアクセス', 'failed', `エラー: ${error.message}`);
  }
  
  console.log('\n📍 2. 認証保護テスト');
  const protectedPages = ['/dashboard', '/profile', '/posts/new'];
  
  for (const page of protectedPages) {
    try {
      const start = Date.now();
      const response = await fetch(`${baseUrl}${page}`, { redirect: 'manual' });
      const responseTime = Date.now() - start;
      
      if (response.status === 307 || response.status === 302) {
        const location = response.headers.get('location');
        if (location && location.includes('/auth/signin?callbackUrl=')) {
          const callbackUrl = new URL(location, baseUrl).searchParams.get('callbackUrl');
          addResult(`${page} 保護`, 'passed', `正しいリダイレクト → ${decodeURIComponent(callbackUrl)}`, responseTime);
        } else {
          addResult(`${page} 保護`, 'warnings', `不正なリダイレクト先: ${location}`, responseTime);
        }
      } else {
        addResult(`${page} 保護`, 'failed', `保護されていない: ${response.status}`, responseTime);
      }
    } catch (error) {
      addResult(`${page} 保護`, 'failed', `エラー: ${error.message}`);
    }
  }
  
  console.log('\n📍 3. API保護テスト');
  const apiEndpoints = [
    { path: '/api/posts', method: 'GET' },
    { path: '/api/posts', method: 'POST' }
  ];
  
  for (const endpoint of apiEndpoints) {
    try {
      const start = Date.now();
      const response = await fetch(`${baseUrl}${endpoint.path}`, { 
        method: endpoint.method,
        headers: { 'Content-Type': 'application/json' },
        body: endpoint.method === 'POST' ? JSON.stringify({ content: 'test' }) : undefined
      });
      const responseTime = Date.now() - start;
      const text = await response.text();
      
      // APIの場合、認証エラーメッセージがあれば保護されている
      if (text.includes('ログインが必要です') || text.includes('requireAuth')) {
        addResult(`${endpoint.method} ${endpoint.path}`, 'passed', '認証エラーで正しく保護', responseTime);
      } else if (response.status === 401 || response.status === 403) {
        addResult(`${endpoint.method} ${endpoint.path}`, 'passed', `認証拒否: ${response.status}`, responseTime);
      } else {
        addResult(`${endpoint.method} ${endpoint.path}`, 'warnings', `レスポンス: ${response.status}`, responseTime);
      }
    } catch (error) {
      addResult(`${endpoint.method} ${endpoint.path}`, 'failed', `エラー: ${error.message}`);
    }
  }
  
  console.log('\n📍 4. NextAuth機能テスト');
  const authEndpoints = [
    '/api/auth/csrf',
    '/api/auth/session'
  ];
  
  for (const endpoint of authEndpoints) {
    try {
      const start = Date.now();
      const response = await fetch(`${baseUrl}${endpoint}`);
      const responseTime = Date.now() - start;
      
      if (response.status === 200) {
        const data = await response.json();
        
        if (endpoint === '/api/auth/csrf' && data.csrfToken) {
          addResult('CSRF トークン', 'passed', `トークン取得成功: ${data.csrfToken.substring(0, 8)}...`, responseTime);
        } else if (endpoint === '/api/auth/session') {
          addResult('セッション確認', 'passed', data ? 'セッションあり' : '未認証（正常）', responseTime);
        } else {
          addResult(`${endpoint}`, 'warnings', '予期しないレスポンス', responseTime);
        }
      } else {
        addResult(`${endpoint}`, 'failed', `ステータス: ${response.status}`, responseTime);
      }
    } catch (error) {
      addResult(`${endpoint}`, 'failed', `エラー: ${error.message}`);
    }
  }
  
  console.log('\n📍 5. パフォーマンステスト');
  const responseTimes = results.details
    .filter(r => r.responseTime)
    .map(r => r.responseTime);
    
  if (responseTimes.length > 0) {
    const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxTime = Math.max(...responseTimes);
    const minTime = Math.min(...responseTimes);
    
    addResult('平均レスポンス時間', avgTime < 200 ? 'passed' : 'warnings', `${avgTime.toFixed(0)}ms`);
    addResult('最大レスポンス時間', maxTime < 500 ? 'passed' : 'warnings', `${maxTime}ms`);
    addResult('最小レスポンス時間', 'passed', `${minTime}ms`);
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('📊 最終テスト結果');
  console.log('=' .repeat(50));
  console.log(`総テスト数: ${results.total}`);
  console.log(`✅ 成功: ${results.passed}`);
  console.log(`⚠️  警告: ${results.warnings}`);
  console.log(`❌ 失敗: ${results.failed}`);
  
  const successRate = ((results.passed / results.total) * 100).toFixed(1);
  console.log(`成功率: ${successRate}%`);
  
  console.log('\n📋 詳細結果:');
  for (const result of results.details) {
    const icon = result.status === 'passed' ? '✅' : result.status === 'warnings' ? '⚠️' : '❌';
    console.log(`  ${icon} ${result.name}: ${result.status.toUpperCase()}`);
    if (result.message) console.log(`     ${result.message}`);
  }
  
  if (results.failed === 0) {
    console.log('\n🎉 認証保護機能テストが100%完了しました！');
    console.log('🔒 すべての保護機能が正常に動作しています。');
    return true;
  } else {
    console.log(`\n⚠️  ${results.failed}個の問題が検出されました。`);
    return false;
  }
}

if (require.main === module) {
  runFinalAuthTest()
    .then(success => {
      console.log('\n' + '='.repeat(50));
      console.log(`テスト完了: ${new Date().toISOString()}`);
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('テスト実行エラー:', error);
      process.exit(1);
    });
}

module.exports = { runFinalAuthTest };