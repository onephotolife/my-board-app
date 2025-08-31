#!/usr/bin/env node
/**
 * ダッシュボード・プロフィールAPIエラー デバッグテスト
 * 
 * 認証情報: one.photolife+1@gmail.com / ?@thc123THC@?
 * 
 * テスト内容:
 * 1. 認証してセッション確立
 * 2. セッション情報の確認
 * 3. /api/profile へのアクセステスト
 * 4. /api/users/stats へのアクセステスト
 * 5. 問題の原因特定
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
    'User-Agent': 'Dashboard-Debug-Client/1.0'
  }
}));

// 認証情報
const AUTH_CREDENTIALS = {
  email: 'one.photolife+1@gmail.com',
  password: '?@thc123THC@?'
};

// テスト結果
const debugResults = {
  timestamp: new Date().toISOString(),
  authentication: null,
  session: null,
  profileAPI: null,
  statsAPI: null,
  errors: [],
  hypothesis: null
};

console.log('================================================================================');
console.log('ダッシュボード・プロフィールAPIエラー デバッグテスト');
console.log('================================================================================');
console.log('実行日時:', new Date().toISOString());
console.log('認証情報:', AUTH_CREDENTIALS.email);
console.log('');

// 1. 認証処理
async function authenticate() {
  console.log('📋 STEP 1: 認証処理');
  console.log('-'.repeat(40));
  
  try {
    // NextAuth CSRFトークン取得
    console.log('🔑 NextAuth CSRFトークン取得中...');
    const csrfResponse = await client.get('/api/auth/csrf');
    const csrfToken = csrfResponse.data.csrfToken;
    console.log('✅ CSRFトークン取得成功');
    console.log('   トークン:', csrfToken ? csrfToken.substring(0, 20) + '...' : 'なし');
    
    // 認証リクエスト（フォームデータとして送信）
    console.log('🔐 認証リクエスト送信中...');
    const formData = new URLSearchParams();
    formData.append('email', AUTH_CREDENTIALS.email);
    formData.append('password', AUTH_CREDENTIALS.password);
    formData.append('csrfToken', csrfToken);
    formData.append('json', 'true');
    
    const authResponse = await client.post('/api/auth/callback/credentials', formData.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      maxRedirects: 0,
      validateStatus: (status) => status < 500
    });
    
    console.log('📊 認証レスポンス:');
    console.log('   ステータス:', authResponse.status);
    console.log('   Set-Cookie:', authResponse.headers['set-cookie'] ? 'あり' : 'なし');
    
    debugResults.authentication = {
      success: authResponse.status < 400,
      status: authResponse.status,
      hasSetCookie: !!authResponse.headers['set-cookie'],
      cookies: authResponse.headers['set-cookie']
    };
    
    return authResponse.status < 400;
  } catch (error) {
    console.error('❌ 認証エラー:', error.message);
    debugResults.authentication = {
      success: false,
      error: error.message
    };
    return false;
  }
}

// 2. セッション情報確認
async function checkSession() {
  console.log('\n📋 STEP 2: セッション情報確認');
  console.log('-'.repeat(40));
  
  try {
    const response = await client.get('/api/auth/session');
    
    console.log('📊 セッション情報:');
    console.log('   ステータス:', response.status);
    console.log('   セッションデータ:', JSON.stringify(response.data, null, 2));
    
    debugResults.session = {
      success: true,
      status: response.status,
      data: response.data,
      hasUser: !!response.data?.user,
      hasEmailVerified: response.data?.user?.emailVerified !== undefined,
      emailVerified: response.data?.user?.emailVerified
    };
    
    // 重要: emailVerifiedの値を強調表示
    if (response.data?.user) {
      console.log('\n⚠️  重要なセッション情報:');
      console.log('   user.email:', response.data.user.email);
      console.log('   user.emailVerified:', response.data.user.emailVerified);
      console.log('   user.emailVerified型:', typeof response.data.user.emailVerified);
      console.log('   user.id:', response.data.user.id);
      console.log('   user.role:', response.data.user.role);
      console.log('   user.createdAt:', response.data.user.createdAt);
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ セッション確認エラー:', error.message);
    debugResults.session = {
      success: false,
      error: error.message
    };
    return null;
  }
}

// 3. プロフィールAPI確認
async function testProfileAPI() {
  console.log('\n📋 STEP 3: プロフィールAPI (/api/profile) テスト');
  console.log('-'.repeat(40));
  
  try {
    const response = await client.get('/api/profile');
    
    console.log('✅ プロフィールAPI成功:');
    console.log('   ステータス:', response.status);
    console.log('   データ:', JSON.stringify(response.data, null, 2));
    
    debugResults.profileAPI = {
      success: true,
      status: response.status,
      data: response.data
    };
    
    return response.data;
  } catch (error) {
    console.error('❌ プロフィールAPIエラー:');
    console.error('   ステータス:', error.response?.status);
    console.error('   エラーコード:', error.response?.data?.code);
    console.error('   エラーメッセージ:', error.response?.data?.error);
    console.error('   レスポンス全体:', JSON.stringify(error.response?.data, null, 2));
    
    debugResults.profileAPI = {
      success: false,
      status: error.response?.status,
      errorCode: error.response?.data?.code,
      errorMessage: error.response?.data?.error,
      fullResponse: error.response?.data
    };
    
    return null;
  }
}

// 4. 統計API確認
async function testStatsAPI() {
  console.log('\n📋 STEP 4: 統計API (/api/users/stats) テスト');
  console.log('-'.repeat(40));
  
  try {
    const response = await client.get('/api/users/stats');
    
    console.log('✅ 統計API成功:');
    console.log('   ステータス:', response.status);
    console.log('   データ:', JSON.stringify(response.data, null, 2));
    
    debugResults.statsAPI = {
      success: true,
      status: response.status,
      data: response.data
    };
    
    return response.data;
  } catch (error) {
    console.error('❌ 統計APIエラー:');
    console.error('   ステータス:', error.response?.status);
    console.error('   エラーメッセージ:', error.response?.data?.error);
    
    debugResults.statsAPI = {
      success: false,
      status: error.response?.status,
      error: error.response?.data?.error
    };
    
    return null;
  }
}

// 5. 問題分析
function analyzeIssue() {
  console.log('\n================================================================================');
  console.log('📊 問題分析');
  console.log('================================================================================');
  
  const hypothesis = {
    mainCause: null,
    details: [],
    recommendations: []
  };
  
  // セッションのemailVerified確認
  if (debugResults.session?.success && debugResults.session?.data?.user) {
    const emailVerified = debugResults.session.data.user.emailVerified;
    
    console.log('\n1. セッションのemailVerified状態:');
    console.log('   値:', emailVerified);
    console.log('   型:', typeof emailVerified);
    console.log('   真偽値評価:', !!emailVerified);
    
    if (emailVerified === false || emailVerified === undefined || emailVerified === null) {
      hypothesis.mainCause = 'セッションのemailVerifiedがfalseまたは未定義';
      hypothesis.details.push('NextAuthセッションでemailVerifiedが正しく設定されていない');
      hypothesis.recommendations.push('auth.tsのsessionコールバックでemailVerifiedの設定を確認');
    }
  }
  
  // API結果の比較
  console.log('\n2. API結果の比較:');
  console.log('   /api/profile:', debugResults.profileAPI?.success ? '成功' : '失敗');
  console.log('   /api/users/stats:', debugResults.statsAPI?.success ? '成功' : '失敗');
  
  if (!debugResults.profileAPI?.success && debugResults.statsAPI?.success) {
    console.log('\n⚠️  プロフィールAPIのみ失敗しています');
    
    if (debugResults.profileAPI?.errorCode === 'EMAIL_NOT_VERIFIED') {
      hypothesis.mainCause = hypothesis.mainCause || 'メール確認要件によるアクセス拒否';
      hypothesis.details.push('/api/profileはrequireEmailVerifiedSession()を使用');
      hypothesis.details.push('セッションのemailVerifiedがfalseまたは未定義のため403エラー');
      hypothesis.recommendations.push('セッションにemailVerified: trueが確実に設定されるよう修正');
    }
  }
  
  // 最終診断
  console.log('\n3. 診断結果:');
  if (hypothesis.mainCause) {
    console.log('   主原因:', hypothesis.mainCause);
    console.log('   詳細:');
    hypothesis.details.forEach(detail => {
      console.log('     -', detail);
    });
    console.log('   推奨対応:');
    hypothesis.recommendations.forEach(rec => {
      console.log('     -', rec);
    });
  } else {
    console.log('   問題を特定できませんでした');
  }
  
  debugResults.hypothesis = hypothesis;
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
    
    // 2. セッション確認
    const session = await checkSession();
    
    // 3. プロフィールAPI
    await testProfileAPI();
    
    // 4. 統計API
    await testStatsAPI();
    
    // 5. 問題分析
    analyzeIssue();
    
    // 結果保存
    const fs = require('fs');
    const resultFile = `debug-results-${Date.now()}.json`;
    fs.writeFileSync(resultFile, JSON.stringify(debugResults, null, 2));
    
    console.log('\n================================================================================');
    console.log('📄 デバッグ結果');
    console.log('================================================================================');
    console.log('詳細な結果は', resultFile, 'に保存されました');
    
    // 最終サマリー
    console.log('\n🏁 サマリー:');
    console.log('  認証:', debugResults.authentication?.success ? '✅ 成功' : '❌ 失敗');
    console.log('  セッション:', debugResults.session?.success ? '✅ 取得成功' : '❌ 取得失敗');
    console.log('  emailVerified:', debugResults.session?.emailVerified);
    console.log('  プロフィールAPI:', debugResults.profileAPI?.success ? '✅ 成功' : '❌ 失敗');
    console.log('  統計API:', debugResults.statsAPI?.success ? '✅ 成功' : '❌ 失敗');
    
    if (debugResults.hypothesis?.mainCause) {
      console.log('\n🔍 問題の原因:', debugResults.hypothesis.mainCause);
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// 実行
main();