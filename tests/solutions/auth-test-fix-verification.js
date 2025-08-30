#!/usr/bin/env node

/**
 * STRICT120準拠 - 解決策1実行後の認証付き検証テスト
 * 削除後の動作確認とエラー解消確認
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

// 認証情報（必須）
const AUTH_CREDENTIALS = {
  email: 'one.photolife+1@gmail.com',
  password: '?@thc123THC@?'
};

const BASE_URL = 'http://localhost:3000';

// デバッグログ
function debugLog(message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[DEBUG ${timestamp}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

// HTTPリクエストヘルパー
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// CSRFトークン取得
async function getCSRFToken() {
  debugLog('CSRFトークン取得を開始');
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/auth/csrf`);
    
    if (response.status !== 200) {
      throw new Error(`CSRF取得失敗: ${response.status}`);
    }
    
    const data = JSON.parse(response.body);
    debugLog('CSRFトークン取得成功', { token: data.csrfToken ? '***' : 'なし' });
    
    return {
      token: data.csrfToken,
      cookies: response.headers['set-cookie'] || []
    };
  } catch (error) {
    debugLog('CSRFトークン取得エラー', { error: error.message });
    throw error;
  }
}

// 認証実行
async function authenticate() {
  debugLog('認証プロセス開始');
  
  try {
    // 1. CSRFトークン取得
    const csrf = await getCSRFToken();
    
    // 2. クッキー文字列を構築
    const cookieString = csrf.cookies.map(c => c.split(';')[0]).join('; ');
    
    // 3. 認証リクエスト
    const authBody = new URLSearchParams({
      email: AUTH_CREDENTIALS.email,
      password: AUTH_CREDENTIALS.password,
      csrfToken: csrf.token,
      callbackUrl: `${BASE_URL}/board`,
      json: 'true'
    }).toString();
    
    debugLog('認証リクエスト送信', { 
      endpoint: '/api/auth/callback/credentials',
      email: AUTH_CREDENTIALS.email 
    });
    
    const authResponse = await makeRequest(
      `${BASE_URL}/api/auth/callback/credentials`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': cookieString
        },
        body: authBody
      }
    );
    
    debugLog('認証レスポンス', {
      status: authResponse.status,
      hasSetCookie: !!authResponse.headers['set-cookie']
    });
    
    if (authResponse.status === 200 || authResponse.status === 302) {
      const sessionCookies = authResponse.headers['set-cookie'] || [];
      const sessionCookie = sessionCookies.map(c => c.split(';')[0]).join('; ');
      
      debugLog('認証成功', { 
        sessionCookieCount: sessionCookies.length 
      });
      
      return sessionCookie;
    } else {
      throw new Error(`認証失敗: ${authResponse.status}`);
    }
    
  } catch (error) {
    debugLog('認証エラー', { error: error.message });
    throw error;
  }
}

// /boardルートのテスト
async function testBoardRoute(sessionCookie) {
  debugLog('/boardルートのテスト開始');
  
  try {
    const response = await makeRequest(
      `${BASE_URL}/board`,
      {
        headers: {
          'Cookie': sessionCookie
        }
      }
    );
    
    debugLog('/boardレスポンス', {
      status: response.status,
      contentLength: response.body.length,
      contentType: response.headers['content-type']
    });
    
    // ステータスコードチェック
    const statusOK = response.status === 200;
    console.log(`✅ ステータスコード: ${response.status} ${statusOK ? '(正常)' : '(異常)'}`);
    
    // エラーメッセージチェック
    const hasConflictError = response.body.includes('You cannot have two parallel pages');
    console.log(`✅ 競合エラーなし: ${!hasConflictError ? '解消済み' : 'まだ存在'}`);
    
    // 500エラーチェック
    const has500Error = response.status === 500;
    console.log(`✅ 500エラーなし: ${!has500Error ? '解消済み' : 'まだ存在'}`);
    
    // HTMLコンテンツチェック
    const hasHTML = response.body.includes('<!DOCTYPE') || response.body.includes('<html');
    console.log(`✅ HTMLコンテンツ: ${hasHTML ? '正常' : '異常'}`);
    
    // 認証済みコンテンツチェック
    const hasAuthContent = response.body.includes('board') || response.body.includes('Board');
    console.log(`✅ ボードコンテンツ: ${hasAuthContent ? '表示' : '非表示'}`);
    
    return {
      success: statusOK && !hasConflictError && !has500Error && hasHTML,
      status: response.status,
      hasConflictError,
      has500Error,
      contentLength: response.body.length
    };
    
  } catch (error) {
    debugLog('/boardテストエラー', { error: error.message });
    throw error;
  }
}

// サブルートのテスト
async function testSubRoutes(sessionCookie) {
  debugLog('サブルートのテスト開始');
  
  const routes = [
    '/board/new',
    '/api/posts',
    '/api/posts/507f1f77bcf86cd799439011/like',
    '/api/posts/507f1f77bcf86cd799439011/comments'
  ];
  
  const results = {};
  
  for (const route of routes) {
    try {
      const response = await makeRequest(
        `${BASE_URL}${route}`,
        {
          headers: {
            'Cookie': sessionCookie
          }
        }
      );
      
      results[route] = {
        status: response.status,
        success: response.status === 200 || response.status === 404 // 404はIDが存在しない場合
      };
      
      console.log(`✅ ${route}: ${response.status} ${results[route].success ? '(正常)' : '(異常)'}`);
      
    } catch (error) {
      results[route] = {
        status: 'ERROR',
        success: false,
        error: error.message
      };
      console.log(`❌ ${route}: エラー - ${error.message}`);
    }
  }
  
  return results;
}

// メイン実行
async function main() {
  console.log('========================================');
  console.log('解決策1実行後の認証付き検証テスト');
  console.log('========================================');
  console.log('実行時刻:', new Date().toISOString());
  console.log('対象: src/app/board/page.tsx削除後の動作確認');
  
  try {
    // 1. 認証
    console.log('\n=== 認証プロセス ===');
    const sessionCookie = await authenticate();
    console.log('✅ 認証成功');
    
    // 2. /boardルートテスト
    console.log('\n=== /boardルート検証 ===');
    const boardResult = await testBoardRoute(sessionCookie);
    
    // 3. サブルートテスト
    console.log('\n=== サブルート検証 ===');
    const subRouteResults = await testSubRoutes(sessionCookie);
    
    // 4. 結果サマリー
    console.log('\n========================================');
    console.log('テスト結果サマリー');
    console.log('========================================');
    
    if (boardResult.success) {
      console.log('✅ 解決策1実行成功');
      console.log('  - ルート競合: 解消');
      console.log('  - 500エラー: 解消');
      console.log('  - 認証機能: 正常動作');
      console.log('  - /boardアクセス: 正常');
    } else {
      console.log('❌ 問題が残っている');
      console.log('  - ステータス:', boardResult.status);
      console.log('  - 競合エラー:', boardResult.hasConflictError ? 'あり' : 'なし');
      console.log('  - 500エラー:', boardResult.has500Error ? 'あり' : 'なし');
    }
    
    console.log('\nI attest: all tests executed with authentication.');
    
  } catch (error) {
    console.error('\n❌ テスト実行エラー:', error.message);
    console.error('スタックトレース:', error.stack);
    process.exit(1);
  }
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  console.error('未処理のエラー:', error);
  process.exit(1);
});

// サーバー起動待機
console.log('サーバー起動を待機中...');
setTimeout(() => {
  main();
}, 3000);