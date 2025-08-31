#!/usr/bin/env node
/**
 * ブラウザシミュレーションテスト
 * 実際のブラウザと同じようにダッシュボードページにアクセスして問題を再現
 * 
 * 認証情報: one.photolife+1@gmail.com / ?@thc123THC@?
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
    'Accept': 'text/html,application/json',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  }
}));

// 認証情報
const AUTH_CREDENTIALS = {
  email: 'one.photolife+1@gmail.com',
  password: '?@thc123THC@?'
};

console.log('================================================================================');
console.log('ブラウザシミュレーションテスト');
console.log('================================================================================');
console.log('');

// 1. サインインページでの認証
async function signInViaPage() {
  console.log('📋 STEP 1: サインインページ経由での認証');
  console.log('-'.repeat(40));
  
  try {
    // サインインページにアクセス
    console.log('🌐 サインインページにアクセス...');
    const signInPage = await client.get('/auth/signin');
    console.log('   ステータス:', signInPage.status);
    
    // CSRFトークン取得
    const csrfResponse = await client.get('/api/auth/csrf');
    const csrfToken = csrfResponse.data.csrfToken;
    console.log('✅ CSRFトークン取得:', csrfToken.substring(0, 20) + '...');
    
    // 認証（ブラウザと同じフォーム送信）
    const formData = new URLSearchParams();
    formData.append('email', AUTH_CREDENTIALS.email);
    formData.append('password', AUTH_CREDENTIALS.password);
    formData.append('csrfToken', csrfToken);
    formData.append('json', 'true');
    
    console.log('🔐 認証リクエスト送信...');
    const authResponse = await client.post('/api/auth/callback/credentials', formData.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'http://localhost:3000/auth/signin'
      }
    });
    
    console.log('   認証ステータス:', authResponse.status);
    console.log('   認証レスポンス:', JSON.stringify(authResponse.data));
    
    // セッション確認
    const sessionCheck = await client.get('/api/auth/session');
    console.log('   セッション確立:', sessionCheck.data?.user ? '✅' : '❌');
    if (sessionCheck.data?.user) {
      console.log('   ユーザー:', sessionCheck.data.user.email);
      console.log('   emailVerified:', sessionCheck.data.user.emailVerified);
    }
    
    // セッションが確立されていれば成功とする
    return !!sessionCheck.data?.user;
  } catch (error) {
    console.error('❌ 認証エラー:', error.message);
    return false;
  }
}

// 2. ダッシュボードページにアクセス
async function accessDashboard() {
  console.log('\n📋 STEP 2: ダッシュボードページにアクセス');
  console.log('-'.repeat(40));
  
  try {
    // ダッシュボードページをリクエスト（HTMLとして）
    console.log('🌐 /dashboard にアクセス...');
    const dashboardResponse = await client.get('/dashboard', {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    
    console.log('   ステータス:', dashboardResponse.status);
    console.log('   HTMLサイズ:', dashboardResponse.data.length, 'bytes');
    
    // HTMLからNext.jsのデータを抽出（簡易的）
    const hasError = dashboardResponse.data.includes('プロフィールの取得に失敗しました');
    const hasStatsError = dashboardResponse.data.includes('ユーザー統計取得失敗');
    
    console.log('   プロフィールエラー検出:', hasError ? '❌ あり' : '✅ なし');
    console.log('   統計エラー検出:', hasStatsError ? '❌ あり' : '✅ なし');
    
    return {
      success: dashboardResponse.status === 200,
      hasProfileError: hasError,
      hasStatsError: hasStatsError
    };
  } catch (error) {
    console.error('❌ ダッシュボードアクセスエラー:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// 3. クライアントサイドAPIコール（UserProviderのシミュレーション）
async function simulateClientAPICalls() {
  console.log('\n📋 STEP 3: クライアントサイドAPIコールのシミュレーション');
  console.log('-'.repeat(40));
  
  // UserProviderのfetchUserProfileを再現
  console.log('🔍 UserProvider fetchUserProfile シミュレーション...');
  try {
    const profileResponse = await client.get('/api/profile', {
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    
    console.log('✅ プロフィール取得成功:');
    console.log('   ユーザー:', profileResponse.data.user?.email);
    console.log('   emailVerified:', profileResponse.data.user?.emailVerified);
  } catch (error) {
    console.error('❌ プロフィール取得失敗:');
    console.error('   ステータス:', error.response?.status);
    console.error('   エラー:', error.response?.data?.error);
    console.error('   コード:', error.response?.data?.code);
  }
  
  // DashboardのfetchUserStatsを再現
  console.log('\n🔍 Dashboard fetchUserStats シミュレーション...');
  try {
    const statsResponse = await client.get('/api/users/stats', {
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    
    console.log('✅ 統計取得成功:');
    console.log('   総投稿数:', statsResponse.data.data?.totalPosts);
    console.log('   メンバー歴:', statsResponse.data.data?.memberSince);
  } catch (error) {
    console.error('❌ 統計取得失敗:');
    console.error('   ステータス:', error.response?.status);
    console.error('   エラー:', error.response?.data?.error);
  }
}

// 4. 診断
async function diagnose() {
  console.log('\n================================================================================');
  console.log('🔍 診断結果');
  console.log('================================================================================');
  
  // セッション再確認
  const finalSession = await client.get('/api/auth/session');
  
  console.log('\n最終セッション状態:');
  console.log('  認証済み:', finalSession.data?.user ? '✅' : '❌');
  if (finalSession.data?.user) {
    console.log('  emailVerified:', finalSession.data.user.emailVerified);
    console.log('  emailVerified型:', typeof finalSession.data.user.emailVerified);
  }
  
  // Cookieの確認
  console.log('\nCookie状態:');
  const cookies = await cookieJar.getCookies('http://localhost:3000');
  cookies.forEach(cookie => {
    if (cookie.key.includes('auth')) {
      console.log(`  ${cookie.key}: ${cookie.value ? '設定済み' : '未設定'}`);
    }
  });
  
  console.log('\n問題の原因:');
  console.log('  APIテストでは成功しているが、実際のブラウザアクセスでエラーが発生する場合、');
  console.log('  以下の可能性があります:');
  console.log('  1. クライアントサイドのセッション状態とサーバーサイドの不一致');
  console.log('  2. UserProviderの初期化タイミングの問題');
  console.log('  3. React.StrictModeによる二重実行の影響');
}

// メイン実行
async function main() {
  try {
    // 1. 認証
    const authSuccess = await signInViaPage();
    if (!authSuccess) {
      console.error('\n❌ 認証に失敗しました');
      process.exit(1);
    }
    
    // 2. ダッシュボードアクセス
    const dashboardResult = await accessDashboard();
    
    // 3. APIコールシミュレーション
    await simulateClientAPICalls();
    
    // 4. 診断
    await diagnose();
    
    // 結果サマリー
    console.log('\n================================================================================');
    console.log('📊 サマリー');
    console.log('================================================================================');
    console.log('認証: ✅ 成功');
    console.log('ダッシュボードアクセス:', dashboardResult.success ? '✅ 成功' : '❌ 失敗');
    console.log('プロフィールエラー:', dashboardResult.hasProfileError ? '❌ 検出' : '✅ なし');
    console.log('統計エラー:', dashboardResult.hasStatsError ? '❌ 検出' : '✅ なし');
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// 実行
main();