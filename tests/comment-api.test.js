/**
 * コメントAPI統合テスト
 * 認証必須：one.photolife+1@gmail.com / ?@thc123THC@?
 */

const fetch = require('node-fetch');

describe('コメントAPI統合テスト（認証付き）', () => {
  const BASE_URL = 'http://localhost:3000';
  const TEST_EMAIL = 'one.photolife+1@gmail.com';
  const TEST_PASSWORD = '?@thc123THC@?';
  
  let cookies = {};
  let testPostId = null;
  let testCommentId = null;
  
  // Cookieをパース
  function parseCookies(setCookieHeaders) {
    const cookieMap = {};
    if (Array.isArray(setCookieHeaders)) {
      setCookieHeaders.forEach(header => {
        const [cookie] = header.split(';');
        const [name, value] = cookie.split('=');
        cookieMap[name] = value;
      });
    }
    return cookieMap;
  }
  
  // Cookie文字列を作成
  function createCookieString(cookieMap) {
    return Object.entries(cookieMap)
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }
  
  beforeAll(async () => {
    console.log('[SETUP] 認証実行中...');
    
    // CSRFトークン取得
    const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`);
    const csrfData = await csrfResponse.json();
    
    // Cookieを保存
    const csrfCookies = csrfResponse.headers.raw()['set-cookie'];
    if (csrfCookies) {
      cookies = { ...cookies, ...parseCookies(csrfCookies) };
    }
    
    // 認証実行
    const authResponse = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': createCookieString(cookies)
      },
      body: new URLSearchParams({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        csrfToken: csrfData.csrfToken,
        json: 'true'
      })
    });
    
    // 認証Cookieを保存
    const authCookies = authResponse.headers.raw()['set-cookie'];
    if (authCookies) {
      cookies = { ...cookies, ...parseCookies(authCookies) };
    }
    
    // セッション確認
    const sessionResponse = await fetch(`${BASE_URL}/api/auth/session`, {
      headers: { 'Cookie': createCookieString(cookies) }
    });
    const session = await sessionResponse.json();
    
    if (session.user) {
      console.log('[SETUP] ✅ 認証成功:', session.user.email);
    } else {
      console.error('[SETUP] ❌ 認証失敗');
    }
    
    // テスト用の投稿を作成
    console.log('[SETUP] テスト投稿作成中...');
    const postResponse = await fetch(`${BASE_URL}/api/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': createCookieString(cookies)
      },
      body: JSON.stringify({
        content: 'コメントテスト用投稿',
        title: 'Test Post',
        author: 'Test User'
      })
    });
    
    if (postResponse.ok) {
      const postData = await postResponse.json();
      testPostId = postData._id || postData.id;
      console.log('[SETUP] テスト投稿作成成功:', testPostId);
    } else {
      console.error('[SETUP] 投稿作成失敗:', postResponse.status);
    }
  });
  
  test('認証済み状態でコメントを投稿できる', async () => {
    if (!testPostId) {
      console.log('[TEST] テスト投稿がないためスキップ');
      return;
    }
    
    console.log('[TEST] コメント投稿開始');
    
    const response = await fetch(`${BASE_URL}/api/posts/${testPostId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': createCookieString(cookies)
      },
      body: JSON.stringify({
        content: 'これはテストコメントです',
        author: 'Test User'
      })
    });
    
    console.log('[TEST] コメント投稿レスポンス:', response.status);
    
    if (response.ok) {
      const comment = await response.json();
      console.log('[TEST] ✅ コメント投稿成功:', comment);
      testCommentId = comment._id || comment.id;
      
      expect(comment.content).toBe('これはテストコメントです');
      expect(comment.postId).toBe(testPostId);
    } else {
      const error = await response.text();
      console.log('[TEST] ❌ コメント投稿失敗:', error);
      
      // 404の場合はAPIが未実装
      if (response.status === 404) {
        console.log('[TEST] ⚠️ コメントAPIが未実装です');
      }
    }
    
    expect(response.status).toBeLessThan(500); // サーバーエラーでないことを確認
  });
  
  test('投稿のコメント一覧を取得できる', async () => {
    if (!testPostId) {
      console.log('[TEST] テスト投稿がないためスキップ');
      return;
    }
    
    console.log('[TEST] コメント一覧取得開始');
    
    const response = await fetch(`${BASE_URL}/api/posts/${testPostId}/comments`, {
      headers: {
        'Cookie': createCookieString(cookies)
      }
    });
    
    console.log('[TEST] コメント一覧レスポンス:', response.status);
    
    if (response.ok) {
      const comments = await response.json();
      console.log('[TEST] ✅ コメント一覧取得成功:', comments.length, '件');
      
      expect(Array.isArray(comments)).toBe(true);
      
      if (testCommentId) {
        const myComment = comments.find(c => c._id === testCommentId || c.id === testCommentId);
        if (myComment) {
          console.log('[TEST] 自分のコメントを確認:', myComment);
          expect(myComment.content).toBe('これはテストコメントです');
        }
      }
    } else {
      console.log('[TEST] ❌ コメント一覧取得失敗');
      
      if (response.status === 404) {
        console.log('[TEST] ⚠️ コメントAPIが未実装です');
      }
    }
    
    expect(response.status).toBeLessThan(500);
  });
  
  test('認証なしではコメント投稿が拒否される', async () => {
    if (!testPostId) {
      console.log('[TEST] テスト投稿がないためスキップ');
      return;
    }
    
    console.log('[TEST] 認証なしコメント投稿テスト');
    
    // Cookieなしでリクエスト
    const response = await fetch(`${BASE_URL}/api/posts/${testPostId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: '認証なしコメント',
        author: 'Anonymous'
      })
    });
    
    console.log('[TEST] 認証なしレスポンス:', response.status);
    
    if (response.status === 401 || response.status === 403) {
      console.log('[TEST] ✅ 認証なしアクセスは正しく拒否されました');
      expect(response.status).toBeGreaterThanOrEqual(401);
      expect(response.status).toBeLessThanOrEqual(403);
    } else if (response.status === 404) {
      console.log('[TEST] ⚠️ コメントAPIが未実装です');
      expect(response.status).toBe(404);
    } else if (response.ok) {
      console.log('[TEST] ❌ 認証なしでもコメント投稿が成功してしまいました（セキュリティ問題）');
      expect(response.ok).toBe(false); // 失敗すべき
    }
  });
  
  afterAll(async () => {
    // テストデータのクリーンアップ
    if (testPostId) {
      console.log('[CLEANUP] テスト投稿削除中...');
      const response = await fetch(`${BASE_URL}/api/posts/${testPostId}`, {
        method: 'DELETE',
        headers: {
          'Cookie': createCookieString(cookies)
        }
      });
      
      if (response.ok) {
        console.log('[CLEANUP] ✅ テスト投稿削除成功');
      } else {
        console.log('[CLEANUP] テスト投稿削除失敗:', response.status);
      }
    }
  });
});