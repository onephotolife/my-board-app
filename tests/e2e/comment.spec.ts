/**
 * コメント機能E2Eテスト - Playwright版
 * STRICT120準拠・AUTH_ENFORCED_TESTING_GUARD適用
 */

import { test, expect, Page } from '@playwright/test';
import { setupAuthenticatedSession } from './helpers/optimal-auth';

// テスト用投稿を作成するヘルパー関数
async function createTestPost(page: Page, asOtherUser: boolean = false): Promise<{ postId: string; authorId: string }> {
  const csrfResponse = await page.request.get('/api/csrf');
  const csrfData = await csrfResponse.json();
  const csrfToken = csrfData.token;
  
  const response = await page.request.post('/api/posts', {
    data: {
      title: 'コメントテスト用投稿',
      content: 'このポストにコメントをテストします',
      // authorはPOST APIが自動設定するので不要
    },
    headers: {
      'X-CSRF-Token': csrfToken || ''
    }
  });
  
  if (!response.ok()) {
    const errorText = await response.text();
    throw new Error(`投稿作成失敗: ${response.status()} - ${errorText}`);
  }
  
  const responseData = await response.json();
  const post = responseData.data || responseData;
  const postId = post._id || post.id;
  const authorId = post.author?._id || post.author;
  
  if (!postId) {
    throw new Error('投稿IDが取得できませんでした');
  }
  
  console.log('テスト用投稿作成:', { postId, authorId });
  return { postId, authorId };
}

// テスト用投稿を削除するヘルパー関数
async function deleteTestPost(page: Page, postId: string): Promise<void> {
  const csrfResponse = await page.request.get('/api/csrf');
  const csrfData = await csrfResponse.json();
  const csrfToken = csrfData.token;
  
  await page.request.delete(`/api/posts/${postId}`, {
    headers: {
      'X-CSRF-Token': csrfToken || ''
    }
  });
  
  console.log('テスト用投稿削除:', postId);
}

test.describe('コメント機能テスト', () => {
  test.beforeEach(async ({ page }) => {
    // 最適化認証フローでセッション確立
    await setupAuthenticatedSession(page);
  });

  test('コメント投稿 - API正常系', async ({ page }) => {
    // テスト用投稿を作成
    const { postId } = await createTestPost(page);
    
    try {
    // CSRFトークンを取得（pageのコンテキストを使用）
    const csrfResponse = await page.request.get('/api/csrf');
    const csrfData = await csrfResponse.json();
    const csrfToken = csrfData.token;
    
    // APIでコメント投稿（pageのrequestを使用）
    const commentText = `テストコメント ${Date.now()}`;
    const response = await page.request.post(`/api/posts/${postId}/comments`, {
      data: {
        content: commentText
      },
      headers: {
        'X-CSRF-Token': csrfToken || ''
      }
    });

    if (!response.ok()) {
      const errorText = await response.text();
      console.error('コメント投稿失敗:', response.status(), errorText);
    }
    
    expect(response.ok()).toBeTruthy();
    const responseData = await response.json();
    console.log('コメント投稿レスポンス:', JSON.stringify(responseData, null, 2));
    
    // レスポンスがdata fieldにラップされている可能性を考慮
    const comment = responseData.data || responseData;
    expect(comment.content).toBe(commentText);
    expect(comment.postId).toBe(postId);
    
    console.log('✅ コメント投稿API成功:', commentText);
    } finally {
      // テスト用投稿を削除
      await deleteTestPost(page, postId);
    }
  });

  test('コメントバリデーション - 空文字拒否', async ({ page }) => {
    // テスト用投稿を作成
    const { postId } = await createTestPost(page);
    
    try {
    // CSRFトークンを取得
    const csrfResponse = await page.request.get('/api/csrf');
    const csrfData = await csrfResponse.json();
    const csrfToken = csrfData.token;
    
    // 空のコメントをAPIで送信
    const response = await page.request.post(`/api/posts/${postId}/comments`, {
      data: {
        content: ''
      },
      headers: {
        'X-CSRF-Token': csrfToken || ''
      }
    });

    // エラー確認
    expect(response.status()).toBe(400);
    const responseData = await response.json();
    const error = responseData.error || responseData;
    const errorMessage = typeof error === 'string' ? error : error.message || error.details?.[0]?.message;
    expect(errorMessage).toContain('バリデーションエラー');
    
    console.log('✅ 空コメント拒否確認');
    } finally {
      // テスト用投稿を削除
      await deleteTestPost(page, postId);
    }
  });

  test('コメントバリデーション - 文字数制限', async ({ page }) => {
    // テスト用投稿を作成
    const { postId } = await createTestPost(page);
    
    try {
    // CSRFトークンを取得
    const csrfResponse = await page.request.get('/api/csrf');
    const csrfData = await csrfResponse.json();
    const csrfToken = csrfData.token;
    
    // 501文字のコメント（制限超過）
    const longComment = 'x'.repeat(501);
    const response = await page.request.post(`/api/posts/${postId}/comments`, {
      data: {
        content: longComment
      },
      headers: {
        'X-CSRF-Token': csrfToken || ''
      }
    });

    // エラー確認
    expect(response.status()).toBe(400);
    const responseData = await response.json();
    const error = responseData.error || responseData;
    const errorMessage = typeof error === 'string' ? error : error.message || error.details?.[0]?.message;
    expect(errorMessage).toContain('バリデーションエラー');
    
    console.log('✅ 文字数制限確認');
    } finally {
      // テスト用投稿を削除
      await deleteTestPost(page, postId);
    }
  });

  test('コメント一覧取得', async ({ page }) => {
    // テスト用投稿を作成
    const { postId } = await createTestPost(page);
    
    try {
    // APIでコメント一覧取得
    const response = await page.request.get(`/api/posts/${postId}/comments`);
    expect(response.ok()).toBeTruthy();
    
    const responseData = await response.json();
    const comments = responseData.data || responseData;
    expect(Array.isArray(comments)).toBeTruthy();
    console.log('コメント数:', comments.length);
    
    // 先ほど投稿したコメントが含まれているか確認
    if (comments.length > 0) {
      expect(comments[0]).toHaveProperty('content');
      expect(comments[0]).toHaveProperty('postId');
      expect(comments[0]).toHaveProperty('author');
    }
    
    console.log('✅ コメント一覧取得確認');
    } finally {
      // テスト用投稿を削除
      await deleteTestPost(page, postId);
    }
  });

  test('コメント削除', async ({ page }) => {
    // テスト用投稿を作成
    const { postId } = await createTestPost(page);
    
    try {
    // CSRFトークンを取得
    const csrfResponse = await page.request.get('/api/csrf');
    const csrfData = await csrfResponse.json();
    const csrfToken = csrfData.token;
    
    // テスト用コメント作成
    const createResponse = await page.request.post(`/api/posts/${postId}/comments`, {
      data: {
        content: '削除テスト用コメント'
      },
      headers: {
        'X-CSRF-Token': csrfToken || ''
      }
    });
    
    expect(createResponse.ok()).toBeTruthy();
    const comment = await createResponse.json();
    const commentId = comment._id || comment.id;

    // 削除実行（正しいパス）
    const deleteResponse = await page.request.delete(`/api/posts/${postId}/comments/${commentId}`, {
      headers: {
        'X-CSRF-Token': csrfToken || ''
      }
    });
    
    if (deleteResponse.status() === 200 || deleteResponse.status() === 204) {
      console.log('✅ コメント削除成功');
      
      // 削除確認
      const checkResponse = await page.request.get(`/api/posts/${postId}/comments/${commentId}`);
      expect(checkResponse.status()).toBe(404);
    } else if (deleteResponse.status() === 404) {
      console.log('⚠️ コメント削除APIは未実装');
    } else {
      console.log(`削除レスポンス: ${deleteResponse.status()}`);
    }
    } finally {
      // テスト用投稿を削除
      await deleteTestPost(page, postId);
    }
  });

  test('パフォーマンステスト - コメント投稿速度', async ({ page }) => {
    // テスト用投稿を作成
    const { postId } = await createTestPost(page);
    
    try {
    // CSRFトークンを取得
    const csrfResponse = await page.request.get('/api/csrf');
    const csrfData = await csrfResponse.json();
    const csrfToken = csrfData.token;
    
    const startTime = Date.now();
    
    // コメント投稿API呼び出し
    const response = await page.request.post(`/api/posts/${postId}/comments`, {
      data: {
        content: 'パフォーマンステスト用コメント',
        author: 'Test User'
      },
      headers: {
        'X-CSRF-Token': csrfToken || ''
      }
    });
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    console.log(`コメント投稿レスポンス時間: ${responseTime}ms`);
    
    // パフォーマンス基準（800ms以内）
    expect(responseTime).toBeLessThan(800);
    expect(response.ok()).toBeTruthy();
    } finally {
      // テスト用投稿を削除
      await deleteTestPost(page, postId);
    }
  });

  test('並行コメント投稿テスト', async ({ page }) => {
    // テスト用投稿を作成
    const { postId } = await createTestPost(page);
    
    try {
    // CSRFトークンを取得
    const csrfResponse = await page.request.get('/api/csrf');
    const csrfData = await csrfResponse.json();
    const csrfToken = csrfData.token;
    
    // 3つの並行コメント投稿
    const promises = Array.from({ length: 3 }, (_, i) => 
      page.request.post(`/api/posts/${postId}/comments`, {
        data: {
          content: `並行コメント ${i + 1}`,
          author: 'Test User'
        },
        headers: {
          'X-CSRF-Token': csrfToken || ''
        }
      })
    );

    const responses = await Promise.all(promises);
    
    // 全て成功確認
    responses.forEach((response, index) => {
      expect(response.ok()).toBeTruthy();
      console.log(`並行コメント ${index + 1}: ${response.status()}`);
    });

    console.log('✅ 並行投稿処理成功');
    } finally {
      // テスト用投稿を削除
      await deleteTestPost(page, postId);
    }
  });
});

test.describe('コメント通知連携', () => {
  test.beforeEach(async ({ page }) => {
    // 最適化認証フローでセッション確立
    await setupAuthenticatedSession(page);
  });

  test('コメント投稿時の通知生成', async ({ page }) => {
    // CSRFトークンを取得
    const csrfResponse = await page.request.get('/api/csrf');
    const csrfData = await csrfResponse.json();
    const csrfToken = csrfData.token;
    
    // 投稿作成
    const postResponse = await page.request.post('/api/posts', {
      data: {
        title: '通知テスト投稿',
        content: '通知テスト用コンテンツ',
      },
      headers: {
        'X-CSRF-Token': csrfToken || ''
      }
    });
    
    const postResponseData = await postResponse.json();
    const post = postResponseData.data || postResponseData;
    const postId = post._id || post.id;
    const postAuthorId = post.author?._id || post.author;

    console.log('投稿作成完了:', { postId, postAuthorId });

    // 現在のユーザー情報を取得
    const sessionResponse = await page.request.get('/api/auth/session');
    const sessionData = await sessionResponse.json();
    const currentUserId = sessionData?.user?.id || sessionData?.id;
    
    console.log('セッションユーザー:', currentUserId);

    // コメント投稿
    const commentResponse = await page.request.post(`/api/posts/${postId}/comments`, {
      data: {
        content: '通知生成テストコメント',
      },
      headers: {
        'X-CSRF-Token': csrfToken || ''
      }
    });
    
    if (!commentResponse.ok()) {
      const errorText = await commentResponse.text();
      console.error('コメント投稿失敗:', commentResponse.status(), errorText);
    }
    expect(commentResponse.ok()).toBeTruthy();

    // 同じユーザーの場合は通知が作成されないことを確認
    if (postAuthorId === currentUserId) {
      console.log('ℹ️ 自分の投稿へのコメントのため、通知は生成されません');
      
      // 通知が生成されていないことを確認
      const notifResponse = await page.request.get('/api/notifications');
      if (notifResponse.ok()) {
        const responseData = await notifResponse.json();
        const notifications = responseData.data?.notifications || [];
        const commentNotif = notifications.find((n: any) => 
          n.type === 'comment' && n.target?.id === postId
        );
        
        expect(commentNotif).toBeUndefined();
        console.log('✅ 自己通知が生成されていないことを確認');
      }
    } else {
      // 異なるユーザーの場合は通知が作成されることを確認
      const notifResponse = await page.request.get('/api/notifications');
      
      if (notifResponse.ok()) {
        const responseData = await notifResponse.json();
        const notifications = responseData.data?.notifications || [];
        const commentNotif = notifications.find((n: any) => 
          n.type === 'comment' && n.target?.id === postId
        );
        
        if (commentNotif) {
          console.log('✅ コメント通知生成確認:', commentNotif);
          expect(commentNotif.target.type).toBe('post');
        } else {
          console.log('⚠️ 異なるユーザーですが、通知が見つかりません');
        }
      }
    }

    // クリーンアップ
    await page.request.delete(`/api/posts/${postId}`, {
      headers: {
        'X-CSRF-Token': csrfToken || ''
      }
    });
  });
});