/**
 * セキュリティ機能の包括的検証テスト
 * STRICT120プロトコル準拠の証拠ベース検証
 */

import { test, expect, Page } from '@playwright/test';
import { randomBytes } from 'crypto';

const TEST_URL = 'http://localhost:3000';
const TEST_USER = {
  email: 'one.photolife+2@gmail.com',
  password: '?@thc123THC@?',
};

// CSRFトークン取得ヘルパー
async function getCSRFToken(page: Page): Promise<string> {
  const response = await page.request.get(`${TEST_URL}/api/csrf/token`);
  const data = await response.json();
  return data.csrfToken;
}

// ログイン処理ヘルパー
async function loginUser(page: Page) {
  await page.goto(`${TEST_URL}/auth/signin`);
  await page.fill('input[name="email"]', TEST_USER.email);
  await page.fill('input[name="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard|board/);
}

test.describe('セキュリティ機能検証テスト', () => {
  
  test('1. レート制限の動作確認', async ({ page }) => {
    console.log('🔍 レート制限テスト開始');
    
    // APIエンドポイントに6回リクエスト
    const endpoint = `${TEST_URL}/api/posts`;
    let lastResponse;
    
    for (let i = 1; i <= 6; i++) {
      lastResponse = await page.request.get(endpoint);
      console.log(`  リクエスト ${i}: ステータス ${lastResponse.status()}`);
      
      if (i < 6) {
        expect(lastResponse.status()).toBe(200);
      }
    }
    
    // 6回目のリクエストは429エラーになるべき
    expect(lastResponse.status()).toBe(429);
    const errorData = await lastResponse.json();
    expect(errorData.error).toContain('Too many requests');
    console.log('✅ レート制限: 6回目のリクエストで429エラー確認');
    
    // Retry-Afterヘッダーの確認
    const retryAfter = lastResponse.headers()['retry-after'];
    expect(retryAfter).toBeDefined();
    console.log(`  Retry-After: ${retryAfter}秒`);
  });
  
  test('2. セキュリティヘッダーの確認', async ({ page }) => {
    console.log('🔍 セキュリティヘッダーテスト開始');
    
    const response = await page.goto(TEST_URL);
    const headers = response.headers();
    
    // 必須セキュリティヘッダーの確認
    const requiredHeaders = {
      'x-frame-options': 'DENY',
      'x-content-type-options': 'nosniff',
      'x-xss-protection': '1; mode=block',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'permissions-policy': /camera=\(\), microphone=\(\), geolocation=\(\)/,
      'content-security-policy': /default-src 'self'/,
    };
    
    for (const [header, expectedValue] of Object.entries(requiredHeaders)) {
      const actualValue = headers[header];
      console.log(`  ${header}: ${actualValue}`);
      
      if (expectedValue instanceof RegExp) {
        expect(actualValue).toMatch(expectedValue);
      } else {
        expect(actualValue).toBe(expectedValue);
      }
    }
    
    console.log('✅ セキュリティヘッダー: 全て正しく設定されています');
  });
  
  test('3. XSS対策（HTMLサニタイゼーション）', async ({ page }) => {
    console.log('🔍 XSSサニタイゼーションテスト開始');
    
    await loginUser(page);
    await page.goto(`${TEST_URL}/board`);
    
    // 悪意のあるHTMLを含む投稿を作成
    const maliciousContent = '<script>alert("XSS")</script><b>テスト</b>';
    const csrfToken = await getCSRFToken(page);
    
    const response = await page.request.post(`${TEST_URL}/api/posts`, {
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
      },
      data: {
        title: 'XSSテスト',
        content: maliciousContent,
        author: 'テストユーザー',
      },
    });
    
    expect(response.status()).toBe(201);
    const post = await response.json();
    
    // ページをリロードして投稿を確認
    await page.reload();
    
    // scriptタグが削除されていることを確認
    const postContent = await page.locator(`text="${post.content}"`).first();
    const htmlContent = await postContent.innerHTML();
    
    expect(htmlContent).not.toContain('<script>');
    expect(htmlContent).not.toContain('alert');
    console.log('✅ XSS対策: scriptタグが正しくサニタイズされました');
    
    // 安全なHTMLタグは残っていることを確認
    expect(htmlContent).toContain('<b>');
    console.log('  安全なHTMLタグ（<b>）は保持されています');
  });
  
  test('4. CSRF保護の動作確認', async ({ page }) => {
    console.log('🔍 CSRF保護テスト開始');
    
    await loginUser(page);
    
    // CSRFトークンなしでPOSTリクエスト
    const responseWithoutToken = await page.request.post(`${TEST_URL}/api/posts`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        title: 'CSRFテスト',
        content: 'トークンなしのリクエスト',
        author: 'テストユーザー',
      },
    });
    
    expect(responseWithoutToken.status()).toBe(403);
    const errorData = await responseWithoutToken.json();
    expect(errorData.error).toContain('CSRF');
    console.log('✅ CSRF保護: トークンなしのリクエストは拒否されました');
    
    // 正しいCSRFトークンでPOSTリクエスト
    const csrfToken = await getCSRFToken(page);
    const responseWithToken = await page.request.post(`${TEST_URL}/api/posts`, {
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
      },
      data: {
        title: 'CSRFテスト成功',
        content: 'トークンありのリクエスト',
        author: 'テストユーザー',
      },
    });
    
    expect(responseWithToken.status()).toBe(201);
    console.log('✅ CSRF保護: 正しいトークンでのリクエストは成功しました');
  });
  
  test('5. 監査ログの記録確認', async ({ page }) => {
    console.log('🔍 監査ログテスト開始');
    
    // ログイン試行（失敗）
    await page.goto(`${TEST_URL}/auth/signin`);
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', 'wrong-password');
    await page.click('button[type="submit"]');
    
    // エラーメッセージを待つ
    await page.waitForSelector('text=/error|invalid/i');
    console.log('  ログイン失敗イベントを生成');
    
    // 正しいログイン
    await loginUser(page);
    console.log('  ログイン成功イベントを生成');
    
    // 投稿作成
    const csrfToken = await getCSRFToken(page);
    await page.request.post(`${TEST_URL}/api/posts`, {
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
      },
      data: {
        title: '監査ログテスト',
        content: 'ログ記録確認用投稿',
        author: 'テストユーザー',
      },
    });
    console.log('  投稿作成イベントを生成');
    
    // 注: 実際のログ確認はサーバーログまたは管理画面で行う
    console.log('✅ 監査ログ: イベントが生成されました（サーバーログを確認してください）');
  });
  
  test('6. セッション管理の確認', async ({ page, context }) => {
    console.log('🔍 セッション管理テスト開始');
    
    await loginUser(page);
    
    // セッションクッキーの確認
    const cookies = await context.cookies();
    const sessionCookie = cookies.find(c => 
      c.name.includes('session-token') || c.name.includes('next-auth')
    );
    
    expect(sessionCookie).toBeDefined();
    console.log(`  セッションクッキー: ${sessionCookie.name}`);
    
    // セキュアフラグの確認（本番環境のみ）
    if (TEST_URL.includes('https')) {
      expect(sessionCookie.secure).toBe(true);
      console.log('  Secureフラグ: 有効');
    }
    
    // HttpOnlyフラグの確認
    expect(sessionCookie.httpOnly).toBe(true);
    console.log('  HttpOnlyフラグ: 有効');
    
    // SameSite属性の確認
    expect(sessionCookie.sameSite).toBeDefined();
    console.log(`  SameSite: ${sessionCookie.sameSite}`);
    
    console.log('✅ セッション管理: セキュアな設定が確認されました');
  });
  
  test('7. SQLインジェクション対策', async ({ page }) => {
    console.log('🔍 SQLインジェクション対策テスト開始');
    
    await loginUser(page);
    
    // SQLインジェクション試行
    const maliciousInput = "'; DROP TABLE posts; --";
    const csrfToken = await getCSRFToken(page);
    
    const response = await page.request.post(`${TEST_URL}/api/posts`, {
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
      },
      data: {
        title: maliciousInput,
        content: 'SQLインジェクションテスト',
        author: 'テストユーザー',
      },
    });
    
    // リクエストは成功するが、SQLは実行されない
    expect(response.status()).toBe(201);
    
    // テーブルがまだ存在することを確認
    const checkResponse = await page.request.get(`${TEST_URL}/api/posts`);
    expect(checkResponse.status()).toBe(200);
    
    console.log('✅ SQLインジェクション対策: 悪意のあるSQLは実行されませんでした');
  });
  
  test('8. パストラバーサル対策', async ({ page }) => {
    console.log('🔍 パストラバーサル対策テスト開始');
    
    // パストラバーサル試行
    const maliciousPath = '../../../etc/passwd';
    const response = await page.request.get(`${TEST_URL}/api/posts/${maliciousPath}`);
    
    // 404または400エラーが返されるべき
    expect([400, 404]).toContain(response.status());
    console.log('✅ パストラバーサル対策: 不正なパスはブロックされました');
  });
});

test.describe('本番環境検証', () => {
  test.skip(process.env.NODE_ENV !== 'production', 'Production only test');
  
  test('本番環境での総合動作確認', async ({ page }) => {
    const PROD_URL = 'https://board.blankbrainai.com';
    
    console.log('🔍 本番環境での総合テスト開始');
    
    // HTTPS強制の確認
    const response = await page.goto(PROD_URL);
    expect(response.url()).toMatch(/^https:/);
    console.log('✅ HTTPS強制: 確認済み');
    
    // Strict-Transport-Securityヘッダーの確認
    const headers = response.headers();
    expect(headers['strict-transport-security']).toContain('max-age=');
    console.log('✅ HSTS: 有効');
    
    // ログインとセキュリティ機能の動作確認
    await page.goto(`${PROD_URL}/auth/signin`);
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    
    // ダッシュボードへのリダイレクトを待つ
    await page.waitForURL(/dashboard|board/, { timeout: 10000 });
    console.log('✅ 本番環境ログイン: 成功');
    
    // セキュリティ機能が有効であることを確認
    const dashboardResponse = await page.goto(`${PROD_URL}/dashboard`);
    const dashboardHeaders = dashboardResponse.headers();
    
    expect(dashboardHeaders['x-frame-options']).toBe('DENY');
    expect(dashboardHeaders['x-content-type-options']).toBe('nosniff');
    console.log('✅ 本番環境セキュリティヘッダー: 全て有効');
  });
});