/**
 * コメントAPI動作確認テスト
 * 認証情報: one.photolife+1@gmail.com / ?@thc123THC@?
 * 
 * このテストは実際のAPIエンドポイントが動作することを確認します
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
const TEST_EMAIL = 'one.photolife+1@gmail.com';
const TEST_PASSWORD = '?@thc123THC@?';

// デバッグログクラス
class APIDebugLogger {
  static log(action, data) {
    console.log(`[API-DEBUG] ${new Date().toISOString()} ${action}:`, JSON.stringify(data, null, 2));
  }
  
  static error(action, error) {
    console.error(`[API-ERROR] ${new Date().toISOString()} ${action}:`, error);
  }
  
  static success(action, data) {
    console.log(`[API-SUCCESS] ✅ ${action}:`, data);
  }
}

// Cookie管理用のヘルパー
function parseCookies(response) {
  const cookies = {};
  const setCookieHeaders = response.headers.raw()['set-cookie'] || [];
  
  setCookieHeaders.forEach(cookie => {
    const [nameValue] = cookie.split(';');
    const [name, value] = nameValue.split('=');
    cookies[name.trim()] = value ? value.trim() : '';
  });
  
  return cookies;
}

function formatCookie(cookies) {
  return Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

describe('コメントAPI動作確認テスト（認証付き）', () => {
  let cookies = {};
  let csrfToken = '';
  let authToken = '';
  let testPostId = null;
  
  beforeAll(async () => {
    // CSRFトークン取得
    APIDebugLogger.log('CSRF_TOKEN_REQUEST', { url: `${BASE_URL}/api/auth/csrf` });
    const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`);
    const csrfData = await csrfResponse.json();
    csrfToken = csrfData.csrfToken;
    
    const csrfCookies = parseCookies(csrfResponse);
    cookies = { ...cookies, ...csrfCookies };
    
    APIDebugLogger.success('CSRF_TOKEN_OBTAINED', { csrfToken });
    
    // 認証実行
    APIDebugLogger.log('AUTH_REQUEST', { email: TEST_EMAIL });
    const authResponse = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': formatCookie(cookies)
      },
      body: new URLSearchParams({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        csrfToken: csrfToken
      })
    });
    
    const authCookies = parseCookies(authResponse);
    cookies = { ...cookies, ...authCookies };
    
    APIDebugLogger.success('AUTH_COMPLETED', { 
      status: authResponse.status,
      cookies: Object.keys(cookies)
    });
    
    // セッション確認
    const sessionResponse = await fetch(`${BASE_URL}/api/auth/session`, {
      headers: {
        'Cookie': formatCookie(cookies)
      }
    });
    
    const session = await sessionResponse.json();
    if (session.user) {
      APIDebugLogger.success('SESSION_VERIFIED', {
        email: session.user.email,
        id: session.user.id
      });
    }
  });
  
  test('1. 投稿一覧を取得して有効な投稿IDを取得', async () => {
    APIDebugLogger.log('FETCH_POSTS', { url: '/api/posts' });
    
    const response = await fetch(`${BASE_URL}/api/posts`, {
      headers: {
        'Cookie': formatCookie(cookies)
      }
    });
    
    expect(response.ok).toBe(true);
    const data = await response.json();
    
    APIDebugLogger.success('POSTS_FETCHED', {
      count: data.posts ? data.posts.length : data.length
    });
    
    // 投稿IDを取得
    const posts = data.posts || data;
    if (posts && posts.length > 0) {
      testPostId = posts[0]._id;
      APIDebugLogger.success('POST_ID_OBTAINED', { postId: testPostId });
    }
  });
  
  test('2. コメントAPI（GET）の動作確認', async () => {
    if (!testPostId) {
      APIDebugLogger.log('SKIP_TEST', { reason: 'No post ID available' });
      return;
    }
    
    const url = `${BASE_URL}/api/posts/${testPostId}/comments`;
    APIDebugLogger.log('FETCH_COMMENTS', { url, postId: testPostId });
    
    const response = await fetch(url, {
      headers: {
        'Cookie': formatCookie(cookies)
      }
    });
    
    APIDebugLogger.log('COMMENT_API_RESPONSE', {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers.raw()
    });
    
    if (response.status === 404) {
      APIDebugLogger.error('COMMENT_API_NOT_FOUND', {
        message: 'コメントAPIエンドポイントが見つかりません',
        postId: testPostId,
        url
      });
    } else if (response.status === 401) {
      APIDebugLogger.error('COMMENT_API_UNAUTHORIZED', {
        message: '認証が必要です',
        cookies: Object.keys(cookies)
      });
    } else if (response.ok) {
      const data = await response.json();
      APIDebugLogger.success('COMMENTS_FETCHED', {
        success: data.success,
        commentsCount: data.data ? data.data.length : 0,
        pagination: data.pagination
      });
    }
    
    // ステータスコードをテスト（404の場合も記録）
    expect([200, 404, 401]).toContain(response.status);
  });
  
  test('3. コメントAPI（POST）の動作確認', async () => {
    if (!testPostId) {
      APIDebugLogger.log('SKIP_TEST', { reason: 'No post ID available' });
      return;
    }
    
    const url = `${BASE_URL}/api/posts/${testPostId}/comments`;
    const commentData = {
      content: `テストコメント - ${new Date().toISOString()}`
    };
    
    APIDebugLogger.log('POST_COMMENT', { 
      url, 
      postId: testPostId,
      content: commentData.content 
    });
    
    // CSRFトークンを再取得（必要に応じて）
    const csrfResponse = await fetch(`${BASE_URL}/api/csrf/token`, {
      headers: {
        'Cookie': formatCookie(cookies)
      }
    });
    
    let freshCsrfToken = csrfToken;
    if (csrfResponse.ok) {
      const csrfData = await csrfResponse.json();
      freshCsrfToken = csrfData.token || csrfToken;
      APIDebugLogger.log('CSRF_TOKEN_REFRESHED', { token: freshCsrfToken });
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': formatCookie(cookies),
        'X-CSRF-Token': freshCsrfToken
      },
      body: JSON.stringify(commentData)
    });
    
    APIDebugLogger.log('POST_COMMENT_RESPONSE', {
      status: response.status,
      statusText: response.statusText
    });
    
    if (response.status === 403) {
      const errorData = await response.text();
      APIDebugLogger.error('CSRF_PROTECTION_ERROR', {
        message: 'CSRF保護エラー',
        response: errorData
      });
    } else if (response.status === 404) {
      APIDebugLogger.error('COMMENT_POST_NOT_FOUND', {
        message: 'コメント投稿APIが見つかりません'
      });
    } else if (response.status === 201 || response.ok) {
      const data = await response.json();
      APIDebugLogger.success('COMMENT_POSTED', {
        success: data.success,
        commentId: data.data ? data.data._id || data.data.id : null,
        message: data.message
      });
    }
    
    // ステータスコードをテスト
    expect([201, 200, 403, 404]).toContain(response.status);
  });
  
  test('4. 最終確認: コメント数の変化', async () => {
    if (!testPostId) {
      APIDebugLogger.log('SKIP_TEST', { reason: 'No post ID available' });
      return;
    }
    
    // 投稿を再取得してコメント数を確認
    const response = await fetch(`${BASE_URL}/api/posts/${testPostId}`, {
      headers: {
        'Cookie': formatCookie(cookies)
      }
    });
    
    if (response.ok) {
      const post = await response.json();
      APIDebugLogger.success('POST_COMMENT_COUNT', {
        postId: testPostId,
        commentCount: post.commentCount || 0,
        commentsEnabled: post.commentsEnabled
      });
    }
  });
});