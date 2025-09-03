import { Page } from '@playwright/test';

export async function setupAuth(page: Page) {
  // 環境変数から認証情報を取得
  const email = process.env.AUTH_EMAIL || 'test@example.com';
  const password = process.env.AUTH_PASSWORD || 'password123';
  const baseUrl = process.env.AUTH_BASE_URL || 'http://localhost:3000';

  // サインインページへ移動
  await page.goto(`${baseUrl}/auth/signin`);
  
  // メールアドレス入力
  await page.fill('input[name="email"]', email);
  
  // パスワード入力
  await page.fill('input[name="password"]', password);
  
  // サインインボタンクリック
  await page.click('button[type="submit"]');
  
  // ダッシュボードへのリダイレクトを待つ
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  
  // セッションの確立を確認
  await page.waitForLoadState('networkidle');
  
  // セッショントークンの存在確認
  const cookies = await page.context().cookies();
  const sessionToken = cookies.find(c => 
    c.name === 'next-auth.session-token' || 
    c.name === '__Secure-next-auth.session-token'
  );
  
  if (!sessionToken) {
    throw new Error('Authentication failed: Session token not found');
  }
  
  return sessionToken;
}

export async function getAuthHeaders(page: Page) {
  const cookies = await page.context().cookies();
  const sessionToken = cookies.find(c => 
    c.name === 'next-auth.session-token' || 
    c.name === '__Secure-next-auth.session-token'
  );
  
  if (!sessionToken) {
    throw new Error('No session token found');
  }
  
  // CSRFトークン取得
  const csrfToken = await page.evaluate(() => {
    const meta = document.querySelector('meta[name="app-csrf-token"]');
    return meta?.getAttribute('content');
  });
  
  return {
    'Cookie': `next-auth.session-token=${sessionToken.value}`,
    'x-csrf-token': csrfToken || '',
    'Content-Type': 'application/json',
  };
}