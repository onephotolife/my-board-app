#!/usr/bin/env node

/**
 * 認証付きコメント機能テストスクリプト
 * 
 * 必須認証情報:
 * - Email: one.photolife+1@gmail.com
 * - Password: ?@thc123THC@?
 * 
 * テスト対象:
 * 1. 認証テスト（ログイン、セッショントークン取得）
 * 2. コメント機能テスト（CRUD操作）
 * 3. エラーケーステスト
 */

const https = require('https');

const BASE_URL = 'http://localhost:3000';

// 認証情報
const AUTH_CREDENTIALS = {
  email: 'one.photolife+1@gmail.com',
  password: '?@thc123THC@?'
};

class CommentAuthTester {
  constructor() {
    this.sessionCookie = null;
    this.csrfToken = null;
    this.csrfCookie = null;
    this.allCookies = [];
    this.testResults = [];
    this.testPostId = null;
    this.testCommentId = null;
  }

  // HTTPリクエストを送信するヘルパーメソッド
  async makeRequest(method, path, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(BASE_URL + path);
      const options = {
        hostname: url.hostname,
        port: url.port || 80,
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Comment-Auth-Test-Agent/1.0',
          ...headers
        }
      };

      // すべてのクッキーを追加
      if (this.allCookies.length > 0) {
        options.headers.Cookie = this.allCookies.join('; ');
      }

      // CSRFトークンがあれば追加
      if (this.csrfToken) {
        options.headers['x-csrf-token'] = this.csrfToken;
      }

      const req = (url.protocol === 'https:' ? https : require('http')).request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          // レスポンスからクッキーを抽出
          if (res.headers['set-cookie']) {
            const cookies = res.headers['set-cookie'];
            for (const cookie of cookies) {
              const cookieValue = cookie.split(';')[0];
              
              // セッションクッキー
              if (cookie.includes('next-auth.session-token') || cookie.includes('__Secure-next-auth.session-token')) {
                this.sessionCookie = cookieValue;
                this.allCookies.push(cookieValue);
                console.log('🍪 [DEBUG] Session cookie extracted:', cookieValue);
              }
              // CSRFクッキー
              else if (cookie.includes('app-csrf-token')) {
                this.csrfCookie = cookieValue;
                this.allCookies.push(cookieValue);
                console.log('🍪 [DEBUG] CSRF cookie extracted:', cookieValue);
              }
              // その他のクッキー（SessionToken等）
              else if (cookie.includes('app-csrf-session')) {
                this.allCookies.push(cookieValue);
                console.log('🍪 [DEBUG] CSRF session cookie extracted:', cookieValue);
              }
            }
            
            // 重複を除去
            this.allCookies = [...new Set(this.allCookies)];
          }

          let parsedBody;
          try {
            parsedBody = JSON.parse(body);
          } catch {
            parsedBody = body;
          }

          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsedBody
          });
        });
      });

      req.on('error', reject);

      if (data) {
        req.write(JSON.stringify(data));
      }
      req.end();
    });
  }

  // テスト結果を記録するヘルパーメソッド
  logTestResult(testName, success, details) {
    const timestamp = new Date().toISOString();
    const result = {
      timestamp,
      testName,
      success,
      details
    };
    
    this.testResults.push(result);
    
    const status = success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} [${timestamp}] ${testName}`);
    console.log(`Details:`, JSON.stringify(details, null, 2));
    console.log('---');
  }

  // 1. CSRFトークンを取得
  async getCsrfToken() {
    console.log('\n🔐 === CSRF Token Acquisition Test ===');
    
    try {
      const response = await this.makeRequest('GET', '/api/csrf/token');
      
      if (response.statusCode === 200 && response.body.success) {
        this.csrfToken = response.body.csrfToken;
        this.logTestResult('CSRF Token Acquisition', true, {
          token: this.csrfToken ? `${this.csrfToken.substring(0, 20)}...` : null,
          responseStatus: response.statusCode
        });
        return true;
      } else {
        this.logTestResult('CSRF Token Acquisition', false, {
          responseStatus: response.statusCode,
          responseBody: response.body
        });
        return false;
      }
    } catch (error) {
      this.logTestResult('CSRF Token Acquisition', false, {
        error: error.message
      });
      return false;
    }
  }

  // 2. 認証テスト（ログイン）
  async testAuthentication() {
    console.log('\n🔑 === Authentication Test ===');
    
    try {
      // Step 1: まずNextAuthサインインページからCSRFトークンを取得
      console.log('🔄 Step 1: Getting NextAuth signin page for CSRF token...');
      const signinPageResponse = await this.makeRequest('GET', '/api/auth/signin');
      console.log('🔍 [DEBUG] Signin page response:', {
        statusCode: signinPageResponse.statusCode,
        allCookies: this.allCookies.length
      });

      // Step 2: 直接認証を実行（NextAuth内部API使用）
      console.log('🔄 Step 2: Attempting direct authentication...');
      
      const loginData = {
        email: AUTH_CREDENTIALS.email,
        password: AUTH_CREDENTIALS.password,
        csrfToken: this.csrfToken,
        redirect: false
      };

      const authResponse = await this.makeRequest('POST', '/api/auth/callback/credentials', JSON.stringify(loginData), {
        'Content-Type': 'application/json',
      });

      console.log('🔍 [DEBUG] Auth response:', {
        statusCode: authResponse.statusCode,
        headers: Object.keys(authResponse.headers),
        sessionCookiePresent: !!this.sessionCookie,
        csrfCookiePresent: !!this.csrfCookie,
        totalCookies: this.allCookies.length,
        location: authResponse.headers.location,
        body: typeof authResponse.body === 'object' ? JSON.stringify(authResponse.body) : authResponse.body.substring(0, 200)
      });

      // Step 3: form-data形式でも試行（NextAuthのデフォルト）
      if (authResponse.statusCode !== 200 && authResponse.statusCode !== 302) {
        console.log('🔄 Step 3: Trying form-data authentication...');
        
        const formData = new URLSearchParams();
        formData.append('email', AUTH_CREDENTIALS.email);
        formData.append('password', AUTH_CREDENTIALS.password);
        formData.append('csrfToken', this.csrfToken);
        formData.append('callbackUrl', '/dashboard');

        const formAuthResponse = await this.makeRequest('POST', '/api/auth/callback/credentials', formData.toString(), {
          'Content-Type': 'application/x-www-form-urlencoded',
        });

        console.log('🔍 [DEBUG] Form auth response:', {
          statusCode: formAuthResponse.statusCode,
          sessionCookiePresent: !!this.sessionCookie,
          totalCookies: this.allCookies.length
        });
      }

      // Step 4: セッション確認 (複数回試行)
      let sessionValid = false;
      let sessionUser = null;
      
      for (let attempt = 1; attempt <= 5; attempt++) {
        console.log(`🔍 [DEBUG] Session check attempt ${attempt}/5...`);
        await new Promise(resolve => setTimeout(resolve, 500)); // 0.5秒待機
        
        const sessionResponse = await this.makeRequest('GET', '/api/auth/session');
        console.log('🔍 [DEBUG] Session response:', {
          statusCode: sessionResponse.statusCode,
          hasUser: !!(sessionResponse.body && sessionResponse.body.user),
          userEmail: sessionResponse.body && sessionResponse.body.user ? sessionResponse.body.user.email : null,
          cookiesSent: this.allCookies.length
        });

        if (sessionResponse.body && sessionResponse.body.user) {
          sessionValid = true;
          sessionUser = sessionResponse.body.user;
          console.log('✅ Session validation successful!');
          break;
        }
      }

      // Step 5: 認証成功の判定
      const authSuccess = !!(sessionValid || (this.sessionCookie && this.sessionCookie.length > 0));
      
      this.logTestResult('User Authentication', authSuccess, {
        email: AUTH_CREDENTIALS.email,
        sessionCookiePresent: !!this.sessionCookie,
        sessionValid: sessionValid,
        userEmail: sessionUser ? sessionUser.email : null,
        authResponseStatus: authResponse.statusCode,
        totalCookies: this.allCookies.length,
        csrfTokenPresent: !!this.csrfToken,
        csrfCookiePresent: !!this.csrfCookie
      });

      return authSuccess;
    } catch (error) {
      this.logTestResult('User Authentication', false, {
        error: error.message,
        stack: error.stack
      });
      return false;
    }
  }

  // 3. テスト用投稿を作成
  async createTestPost() {
    console.log('\n📝 === Test Post Creation ===');
    
    try {
      const postData = {
        content: `テスト投稿 - コメント機能テスト用 ${new Date().toISOString()}`
      };

      const response = await this.makeRequest('POST', '/api/posts', postData);
      
      if (response.statusCode === 201 && response.body.success) {
        this.testPostId = response.body.data._id || response.body.data.id;
        this.logTestResult('Test Post Creation', true, {
          postId: this.testPostId,
          content: postData.content
        });
        return true;
      } else {
        this.logTestResult('Test Post Creation', false, {
          responseStatus: response.statusCode,
          responseBody: response.body
        });
        return false;
      }
    } catch (error) {
      this.logTestResult('Test Post Creation', false, {
        error: error.message
      });
      return false;
    }
  }

  // 4. コメント一覧取得テスト（認証必須）
  async testGetComments() {
    console.log('\n📄 === Get Comments Test ===');
    
    if (!this.testPostId) {
      this.logTestResult('Get Comments', false, { error: 'No test post ID available' });
      return false;
    }

    try {
      const response = await this.makeRequest('GET', `/api/posts/${this.testPostId}/comments`);
      
      const success = response.statusCode === 200 && response.body.success !== false;
      
      this.logTestResult('Get Comments (Authenticated)', success, {
        postId: this.testPostId,
        responseStatus: response.statusCode,
        commentsCount: response.body.data ? response.body.data.length : 0,
        pagination: response.body.pagination || null
      });

      return success;
    } catch (error) {
      this.logTestResult('Get Comments (Authenticated)', false, {
        error: error.message
      });
      return false;
    }
  }

  // 5. コメント投稿テスト（認証必須・CSRF必須）
  async testPostComment() {
    console.log('\n💬 === Post Comment Test ===');
    
    if (!this.testPostId) {
      this.logTestResult('Post Comment', false, { error: 'No test post ID available' });
      return false;
    }

    try {
      const commentData = {
        content: `テストコメント - ${new Date().toISOString()}`
      };

      const response = await this.makeRequest('POST', `/api/posts/${this.testPostId}/comments`, commentData);
      
      const success = response.statusCode === 201 && response.body.success;
      
      if (success && response.body.data) {
        this.testCommentId = response.body.data._id || response.body.data.id;
      }

      this.logTestResult('Post Comment (Authenticated + CSRF)', success, {
        postId: this.testPostId,
        commentId: this.testCommentId,
        responseStatus: response.statusCode,
        content: commentData.content,
        csrfTokenUsed: !!this.csrfToken
      });

      return success;
    } catch (error) {
      this.logTestResult('Post Comment (Authenticated + CSRF)', false, {
        error: error.message
      });
      return false;
    }
  }

  // 6. コメント編集テスト
  async testEditComment() {
    console.log('\n✏️ === Edit Comment Test ===');
    
    if (!this.testPostId || !this.testCommentId) {
      this.logTestResult('Edit Comment', false, { error: 'No test comment ID available' });
      return false;
    }

    try {
      const updatedData = {
        content: `更新されたテストコメント - ${new Date().toISOString()}`
      };

      const response = await this.makeRequest('PUT', `/api/posts/${this.testPostId}/comments/${this.testCommentId}`, updatedData);
      
      const success = response.statusCode === 200 && response.body.success;
      
      this.logTestResult('Edit Comment (Authenticated + CSRF)', success, {
        postId: this.testPostId,
        commentId: this.testCommentId,
        responseStatus: response.statusCode,
        newContent: updatedData.content
      });

      return success;
    } catch (error) {
      this.logTestResult('Edit Comment (Authenticated + CSRF)', false, {
        error: error.message
      });
      return false;
    }
  }

  // 7. コメント削除テスト
  async testDeleteComment() {
    console.log('\n🗑️ === Delete Comment Test ===');
    
    if (!this.testPostId || !this.testCommentId) {
      this.logTestResult('Delete Comment', false, { error: 'No test comment ID available' });
      return false;
    }

    try {
      const response = await this.makeRequest('DELETE', `/api/posts/${this.testPostId}/comments/${this.testCommentId}`);
      
      const success = response.statusCode === 200 && response.body.success;
      
      this.logTestResult('Delete Comment (Authenticated + CSRF)', success, {
        postId: this.testPostId,
        commentId: this.testCommentId,
        responseStatus: response.statusCode
      });

      return success;
    } catch (error) {
      this.logTestResult('Delete Comment (Authenticated + CSRF)', false, {
        error: error.message
      });
      return false;
    }
  }

  // 8. エラーケーステスト
  async testErrorCases() {
    console.log('\n🚫 === Error Cases Test ===');
    
    // 8a. 認証なしでのアクセス
    const originalSessionCookie = this.sessionCookie;
    this.sessionCookie = null;
    
    try {
      const response = await this.makeRequest('GET', `/api/posts/${this.testPostId}/comments`);
      const unauthorizedCorrect = response.statusCode === 401;
      
      this.logTestResult('Unauthorized Access (No Auth)', unauthorizedCorrect, {
        expectedStatus: 401,
        actualStatus: response.statusCode,
        errorMessage: response.body.error || response.body.message
      });
    } catch (error) {
      this.logTestResult('Unauthorized Access (No Auth)', false, {
        error: error.message
      });
    }
    
    // セッションクッキーを復元
    this.sessionCookie = originalSessionCookie;
    
    // 8b. CSRFトークンなしでのPOST
    const originalCsrfToken = this.csrfToken;
    this.csrfToken = null;
    
    try {
      const response = await this.makeRequest('POST', `/api/posts/${this.testPostId}/comments`, {
        content: 'CSRFトークンなしのテスト'
      });
      const csrfErrorCorrect = response.statusCode === 403;
      
      this.logTestResult('CSRF Token Missing Error', csrfErrorCorrect, {
        expectedStatus: 403,
        actualStatus: response.statusCode,
        errorMessage: response.body.error || response.body.message
      });
    } catch (error) {
      this.logTestResult('CSRF Token Missing Error', false, {
        error: error.message
      });
    }
    
    // CSRFトークンを復元
    this.csrfToken = originalCsrfToken;
    
    // 8c. 無効な投稿IDでのアクセス
    try {
      const invalidId = '507f1f77bcf86cd799439011'; // 有効なObjectIdフォーマットだが存在しない
      const response = await this.makeRequest('GET', `/api/posts/${invalidId}/comments`);
      const notFoundCorrect = response.statusCode === 404;
      
      this.logTestResult('Invalid Post ID (404 Error)', notFoundCorrect, {
        expectedStatus: 404,
        actualStatus: response.statusCode,
        invalidId: invalidId,
        errorMessage: response.body.error || response.body.message
      });
    } catch (error) {
      this.logTestResult('Invalid Post ID (404 Error)', false, {
        error: error.message
      });
    }
  }

  // 9. テスト後のクリーンアップ
  async cleanup() {
    console.log('\n🧹 === Cleanup ===');
    
    // テスト投稿を削除
    if (this.testPostId) {
      try {
        const response = await this.makeRequest('DELETE', `/api/posts/${this.testPostId}`);
        this.logTestResult('Test Post Cleanup', response.statusCode === 200, {
          postId: this.testPostId,
          responseStatus: response.statusCode
        });
      } catch (error) {
        this.logTestResult('Test Post Cleanup', false, {
          error: error.message
        });
      }
    }
  }

  // メインテスト実行
  async runAllTests() {
    console.log('🚀 === 認証付きコメント機能テスト開始 ===');
    console.log(`テスト開始時刻: ${new Date().toISOString()}`);
    console.log(`認証情報: ${AUTH_CREDENTIALS.email}`);
    console.log(`ベースURL: ${BASE_URL}`);
    console.log('');

    const tests = [
      () => this.getCsrfToken(),
      () => this.testAuthentication(),
      () => this.createTestPost(),
      () => this.testGetComments(),
      () => this.testPostComment(),
      () => this.testEditComment(),
      () => this.testDeleteComment(),
      () => this.testErrorCases(),
      () => this.cleanup()
    ];

    for (const test of tests) {
      try {
        await test();
        // 各テスト間に少し待機
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error('❌ Test execution error:', error);
      }
    }

    this.generateFinalReport();
  }

  // 最終レポート生成
  generateFinalReport() {
    console.log('\n📊 === 最終テスト結果レポート ===');
    
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    const successRate = Math.round((passedTests / totalTests) * 100);

    console.log(`総テスト数: ${totalTests}`);
    console.log(`成功: ${passedTests}`);
    console.log(`失敗: ${failedTests}`);
    console.log(`成功率: ${successRate}%`);
    console.log('');

    console.log('📋 詳細結果:');
    this.testResults.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${result.testName}`);
    });

    console.log('\n🔍 認証状態の確認:');
    console.log(`セッションクッキー: ${this.sessionCookie ? '✅ 取得済み' : '❌ 未取得'}`);
    console.log(`CSRFトークン: ${this.csrfToken ? '✅ 取得済み' : '❌ 未取得'}`);

    if (failedTests > 0) {
      console.log('\n❌ 失敗したテスト:');
      this.testResults
        .filter(r => !r.success)
        .forEach(result => {
          console.log(`- ${result.testName}: ${JSON.stringify(result.details)}`);
        });
    }

    console.log(`\n📁 テスト完了時刻: ${new Date().toISOString()}`);
    
    // 認証状態の最終確認
    const authenticationSuccess = this.testResults.some(r => 
      r.testName === 'User Authentication' && r.success
    );
    
    if (!authenticationSuccess) {
      console.log('\n⚠️ 重要: 認証が失敗しました。指定された認証情報を確認してください。');
      console.log(`Email: ${AUTH_CREDENTIALS.email}`);
      console.log('Password: [REDACTED]');
    }

    return {
      totalTests,
      passedTests,
      failedTests,
      successRate,
      authenticationSuccess,
      testResults: this.testResults
    };
  }
}

// スクリプト実行
async function main() {
  const tester = new CommentAuthTester();
  
  try {
    await tester.runAllTests();
  } catch (error) {
    console.error('💥 Fatal error during testing:', error);
    process.exit(1);
  }
}

// スクリプトが直接実行された場合のみmain()を実行
if (require.main === module) {
  main();
}

module.exports = CommentAuthTester;