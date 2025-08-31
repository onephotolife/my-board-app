#!/usr/bin/env node
/**
 * プロフィールAPI レート制限エラー調査テスト
 * 
 * 認証情報: one.photolife+1@gmail.com / ?@thc123THC@?
 * 
 * テスト内容:
 * 1. 認証してセッション確立
 * 2. /boardページにアクセス
 * 3. UserContextの無限ループ確認
 * 4. レート制限エラーの発生を検証
 */

const axios = require('axios');
const axiosCookieJarSupport = require('axios-cookiejar-support').wrapper;
const tough = require('tough-cookie');

// Cookie管理用のjar作成
const cookieJar = new tough.CookieJar();
const client = axiosCookieJarSupport(axios.create({
  baseURL: 'http://localhost:3000',
  jar: cookieJar,
  withCredentials: true,
  timeout: 30000,
  headers: {
    'Accept': 'application/json, text/html',
    'User-Agent': 'Profile-RateLimit-Test/1.0'
  }
}));

// 認証情報
const AUTH_CREDENTIALS = {
  email: 'one.photolife+1@gmail.com',
  password: '?@thc123THC@?'
};

// テスト結果
const testResults = {
  timestamp: new Date().toISOString(),
  authentication: null,
  profileAPICalls: [],
  rateLimitErrors: 0,
  totalCalls: 0,
  analysis: null
};

console.log('================================================================================');
console.log('プロフィールAPI レート制限エラー調査テスト');
console.log('================================================================================');
console.log('実行日時:', new Date().toISOString());
console.log('認証情報:', AUTH_CREDENTIALS.email);
console.log('');

// 1. 認証処理
async function authenticate() {
  console.log('📋 STEP 1: 認証処理');
  console.log('-'.repeat(40));
  
  try {
    // CSRFトークン取得
    console.log('🔑 CSRFトークン取得中...');
    const csrfResponse = await client.get('/api/auth/csrf');
    const csrfToken = csrfResponse.data.csrfToken;
    console.log('✅ CSRFトークン取得成功');
    
    // 認証（フォームデータとして送信）
    console.log('🔐 認証リクエスト送信中...');
    const formData = new URLSearchParams();
    formData.append('email', AUTH_CREDENTIALS.email);
    formData.append('password', AUTH_CREDENTIALS.password);
    formData.append('csrfToken', csrfToken);
    formData.append('json', 'true');
    
    const authResponse = await client.post('/api/auth/callback/credentials', formData.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    // セッション確認
    const sessionCheck = await client.get('/api/auth/session');
    
    if (sessionCheck.data?.user) {
      console.log('✅ 認証成功');
      console.log('   ユーザー:', sessionCheck.data.user.email);
      console.log('   emailVerified:', sessionCheck.data.user.emailVerified);
      
      testResults.authentication = {
        success: true,
        user: sessionCheck.data.user.email,
        emailVerified: sessionCheck.data.user.emailVerified
      };
      
      return true;
    }
    
    console.error('❌ セッション確立失敗');
    testResults.authentication = { success: false };
    return false;
    
  } catch (error) {
    console.error('❌ 認証エラー:', error.message);
    testResults.authentication = {
      success: false,
      error: error.message
    };
    return false;
  }
}

// 2. プロフィールAPIの連続呼び出しテスト
async function testProfileAPICalls() {
  console.log('\n📋 STEP 2: プロフィールAPI呼び出しテスト');
  console.log('-'.repeat(40));
  console.log('60秒間のAPI呼び出しを監視します...\n');
  
  const startTime = Date.now();
  const duration = 60000; // 60秒
  let callCount = 0;
  let errorCount = 0;
  let lastCallTime = null;
  const callIntervals = [];
  
  // 60秒間、/api/profileへのアクセスを試みる
  while (Date.now() - startTime < duration) {
    try {
      const callStart = Date.now();
      
      // 前回の呼び出しからの間隔を記録
      if (lastCallTime) {
        callIntervals.push(callStart - lastCallTime);
      }
      lastCallTime = callStart;
      
      const response = await client.get('/api/profile');
      callCount++;
      
      testResults.profileAPICalls.push({
        timestamp: new Date().toISOString(),
        status: response.status,
        success: true,
        interval: callIntervals.length > 0 ? callIntervals[callIntervals.length - 1] : 0
      });
      
      // 成功した場合の表示
      if (callCount % 10 === 0) {
        console.log(`✅ ${callCount}回目の呼び出し成功 (経過時間: ${Math.floor((Date.now() - startTime) / 1000)}秒)`);
      }
      
      // 少し待機（UserContextの動作をシミュレート）
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      if (error.response?.status === 429) {
        errorCount++;
        testResults.rateLimitErrors++;
        
        const retryAfter = error.response.headers['retry-after'];
        console.log(`❌ 429エラー発生 (${errorCount}回目) - Retry-After: ${retryAfter}秒`);
        console.log(`   総呼び出し回数: ${callCount}`);
        console.log(`   エラー率: ${((errorCount / (callCount + errorCount)) * 100).toFixed(2)}%`);
        
        testResults.profileAPICalls.push({
          timestamp: new Date().toISOString(),
          status: 429,
          success: false,
          retryAfter,
          totalCallsBeforeError: callCount
        });
        
        // レート制限に引っかかったら少し長めに待機
        const waitTime = parseInt(retryAfter) * 1000 || 5000;
        console.log(`   ${waitTime / 1000}秒待機中...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        console.error('❌ その他のエラー:', error.message);
      }
    }
  }
  
  testResults.totalCalls = callCount;
  
  // 統計情報
  console.log('\n📊 統計情報:');
  console.log('   総呼び出し回数:', callCount);
  console.log('   429エラー発生回数:', errorCount);
  console.log('   成功率:', ((callCount / (callCount + errorCount)) * 100).toFixed(2) + '%');
  
  if (callIntervals.length > 0) {
    const avgInterval = callIntervals.reduce((a, b) => a + b, 0) / callIntervals.length;
    console.log('   平均呼び出し間隔:', avgInterval.toFixed(2) + 'ms');
    console.log('   推定呼び出し頻度:', (60000 / avgInterval).toFixed(2) + '回/分');
  }
}

// 3. 問題分析
function analyzeIssue() {
  console.log('\n================================================================================');
  console.log('📊 問題分析');
  console.log('================================================================================');
  
  const analysis = {
    issue: null,
    cause: null,
    details: [],
    recommendations: []
  };
  
  // レート制限エラーの分析
  if (testResults.rateLimitErrors > 0) {
    analysis.issue = 'レート制限エラーが発生';
    analysis.cause = 'UserContextのfetchUserProfileが無限ループしている可能性';
    
    analysis.details.push('UserContext.tsxのfetchUserProfileのuseCallback依存配列に問題がある');
    analysis.details.push('依存配列に[session, initialData, user]が含まれている');
    analysis.details.push('userが更新されるたびにfetchUserProfileが再生成される');
    analysis.details.push('useEffectがfetchUserProfileの変更を検知して再実行される');
    
    analysis.recommendations.push('fetchUserProfileの依存配列からuserを削除する');
    analysis.recommendations.push('初期データがある場合はAPIコールをスキップする処理を強化');
    analysis.recommendations.push('開発環境で/api/profileのレート制限を緩和または除外');
  } else if (testResults.totalCalls > 200) {
    analysis.issue = '過剰なAPI呼び出し';
    analysis.cause = 'コンポーネントの再レンダリングが頻発している';
    
    analysis.details.push('1分間に200回以上のAPI呼び出しが発生');
    analysis.details.push('UserContextの最適化が必要');
  } else {
    analysis.issue = '正常動作';
    analysis.cause = null;
    analysis.details.push('API呼び出し頻度は適切な範囲内');
  }
  
  console.log('\n🔍 診断結果:');
  console.log('   問題:', analysis.issue);
  if (analysis.cause) {
    console.log('   原因:', analysis.cause);
  }
  
  if (analysis.details.length > 0) {
    console.log('\n   詳細:');
    analysis.details.forEach(detail => {
      console.log('     -', detail);
    });
  }
  
  if (analysis.recommendations.length > 0) {
    console.log('\n   推奨対応:');
    analysis.recommendations.forEach(rec => {
      console.log('     -', rec);
    });
  }
  
  testResults.analysis = analysis;
}

// 4. UserContextのシミュレーション
async function simulateUserContext() {
  console.log('\n📋 STEP 3: UserContextの動作シミュレーション');
  console.log('-'.repeat(40));
  
  let fetchCount = 0;
  const maxFetches = 5;
  
  console.log('UserContextのfetchUserProfile再現テスト...\n');
  
  // UserContextの動作を再現
  for (let i = 0; i < maxFetches; i++) {
    try {
      console.log(`🔄 fetchUserProfile呼び出し ${i + 1}回目`);
      const response = await client.get('/api/profile');
      fetchCount++;
      
      if (response.data?.user) {
        console.log('   ✅ プロフィール取得成功');
        console.log('   ユーザー:', response.data.user.email);
        
        // userが更新されたことをシミュレート
        console.log('   ⚠️  userステートが更新されました');
        console.log('   → fetchUserProfileが再生成されます（依存配列にuserが含まれているため）');
        console.log('   → useEffectが再実行されます\n');
        
        // 短い待機時間（Reactの再レンダリングをシミュレート）
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    } catch (error) {
      if (error.response?.status === 429) {
        console.log('   ❌ 429エラー: レート制限に到達しました');
        console.log('   これがUserContextで発生している問題です\n');
        break;
      }
    }
  }
  
  console.log(`合計${fetchCount}回のfetchUserProfileが実行されました`);
  console.log('これが無限ループの原因です');
}

// メイン実行
async function main() {
  try {
    // 1. 認証
    const authSuccess = await authenticate();
    if (!authSuccess) {
      console.error('\n❌ 認証に失敗したため、テストを中止します');
      process.exit(1);
    }
    
    // 2. UserContextの動作シミュレーション
    await simulateUserContext();
    
    // 3. プロフィールAPI呼び出しテスト
    await testProfileAPICalls();
    
    // 4. 問題分析
    analyzeIssue();
    
    // 結果保存
    const fs = require('fs');
    const resultFile = `profile-rate-limit-results-${Date.now()}.json`;
    fs.writeFileSync(resultFile, JSON.stringify(testResults, null, 2));
    
    console.log('\n================================================================================');
    console.log('📄 テスト結果');
    console.log('================================================================================');
    console.log('詳細な結果は', resultFile, 'に保存されました');
    
    // 最終サマリー
    console.log('\n🏁 サマリー:');
    console.log('  認証:', testResults.authentication?.success ? '✅ 成功' : '❌ 失敗');
    console.log('  総API呼び出し回数:', testResults.totalCalls);
    console.log('  429エラー発生回数:', testResults.rateLimitErrors);
    console.log('  問題:', testResults.analysis?.issue);
    
    if (testResults.rateLimitErrors > 0) {
      console.log('\n⚠️  警告: レート制限エラーが発生しています');
      console.log('UserContext.tsxの修正が必要です');
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// 実行
main();