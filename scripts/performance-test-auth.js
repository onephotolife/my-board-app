#!/usr/bin/env node

const fetch = require('node-fetch');

async function testPerformance() {
  console.log('🚀 認証保護機能パフォーマンステスト開始');
  console.log('━'.repeat(50));
  
  const tests = [
    { name: 'Homepage', url: 'http://localhost:3000/' },
    { name: 'Dashboard (redirect)', url: 'http://localhost:3000/dashboard' },
    { name: 'Profile (redirect)', url: 'http://localhost:3000/profile' },
    { name: 'Posts/New (redirect)', url: 'http://localhost:3000/posts/new' },
    { name: 'API Session', url: 'http://localhost:3000/api/auth/session' },
    { name: 'API CSRF', url: 'http://localhost:3000/api/auth/csrf' },
    { name: 'API Posts (protected)', url: 'http://localhost:3000/api/posts' }
  ];
  
  const results = [];
  
  for (const test of tests) {
    const start = Date.now();
    try {
      const response = await fetch(test.url, { 
        redirect: 'manual',
        timeout: 5000 
      });
      const time = Date.now() - start;
      
      let status = 'SUCCESS';
      let details = '';
      
      if (test.name.includes('redirect')) {
        if (response.status === 307 || response.status === 302) {
          const location = response.headers.get('location');
          if (location && location.includes('/auth/signin?callbackUrl=')) {
            details = `✅ 正しいリダイレクト: ${location}`;
          } else {
            status = 'WARNING';
            details = `⚠️  不正なリダイレクト: ${location}`;
          }
        } else {
          status = 'FAILED';
          details = `❌ 期待外のステータス: ${response.status}`;
        }
      } else if (test.name.includes('API')) {
        if (response.status === 200) {
          details = `✅ API応答正常`;
        } else {
          status = 'WARNING';
          details = `⚠️  ステータス: ${response.status}`;
        }
      } else {
        if (response.status === 200) {
          details = `✅ ページ表示正常`;
        } else {
          status = 'WARNING';
          details = `⚠️  ステータス: ${response.status}`;
        }
      }
      
      results.push({
        name: test.name,
        time,
        status,
        details
      });
      
      console.log(`${status === 'SUCCESS' ? '✅' : status === 'WARNING' ? '⚠️' : '❌'} ${test.name}: ${time}ms`);
      console.log(`   ${details}`);
      
    } catch (error) {
      const time = Date.now() - start;
      results.push({
        name: test.name,
        time,
        status: 'FAILED',
        details: `❌ エラー: ${error.message}`
      });
      console.log(`❌ ${test.name}: ${time}ms - FAILED`);
      console.log(`   エラー: ${error.message}`);
    }
  }
  
  console.log('\n' + '━'.repeat(50));
  console.log('📊 テスト結果サマリー');
  console.log('━'.repeat(50));
  
  const successful = results.filter(r => r.status === 'SUCCESS').length;
  const warnings = results.filter(r => r.status === 'WARNING').length;
  const failed = results.filter(r => r.status === 'FAILED').length;
  
  console.log(`総テスト数: ${results.length}`);
  console.log(`成功: ${successful}`);
  console.log(`警告: ${warnings}`);
  console.log(`失敗: ${failed}`);
  
  const avgTime = results.reduce((sum, r) => sum + r.time, 0) / results.length;
  const maxTime = Math.max(...results.map(r => r.time));
  
  console.log(`平均レスポンス時間: ${avgTime.toFixed(0)}ms`);
  console.log(`最大レスポンス時間: ${maxTime}ms`);
  
  if (successful === results.length) {
    console.log('\n🎉 すべてのテストが成功しました！');
    return true;
  } else {
    console.log('\n⚠️  一部のテストで問題が発生しました。');
    return false;
  }
}

// Node.js環境でのfetch対応
if (typeof fetch === 'undefined') {
  const nodeFetch = require('node-fetch');
  global.fetch = nodeFetch;
}

if (require.main === module) {
  testPerformance()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('テスト実行エラー:', error);
      process.exit(1);
    });
}

module.exports = { testPerformance };