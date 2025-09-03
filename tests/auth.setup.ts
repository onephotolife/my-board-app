import { test as setup, expect } from '@playwright/test';
import * as path from 'path';
import { emulateAuthFlowOptimized, verifySessionHealthOptimized } from './e2e/helpers/optimal-auth';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

/**
 * 認証セットアップ - 最適化版
 * NextAuth.js v4対応
 */
setup('authenticate', async ({ page }) => {
  console.log('[AUTH-SETUP] 認証セットアップ開始');
  console.log('[AUTH-SETUP] Auth file path:', authFile);
  
  try {
    // Step 1: 最適化認証フローを実行
    console.log('[AUTH-SETUP] 最適化認証フロー実行中...');
    const session = await emulateAuthFlowOptimized(
      page,
      'one.photolife+1@gmail.com',
      '?@thc123THC@?'
    );
    
    // Step 2: セッション確立の確認
    if (!session?.user?.id) {
      throw new Error('セッション確立失敗: ユーザーIDが存在しません');
    }
    
    console.log('[AUTH-SETUP] ✅ セッション確立成功:', {
      userId: session.user.id,
      email: session.user.email,
      expires: session.expires
    });
    
    // Step 3: セッションヘルスチェック
    console.log('[AUTH-SETUP] セッションヘルスチェック実行中...');
    const health = await verifySessionHealthOptimized(page);
    
    if (!health.isHealthy) {
      console.warn('[AUTH-SETUP] ⚠️ ヘルスチェック警告:', health.details);
      
      // 必須チェック項目の確認
      if (!health.details.hasSessionCookie || !health.details.hasValidSession) {
        throw new Error('セッションヘルスチェック失敗: 必須項目が不足');
      }
    } else {
      console.log('[AUTH-SETUP] ✅ セッションヘルスチェック成功');
    }
    
    // Step 4: Storage Stateの保存
    console.log('[AUTH-SETUP] Storage State保存中...');
    await page.context().storageState({ path: authFile });
    
    // Step 5: 最終確認 - ダッシュボードアクセス
    console.log('[AUTH-SETUP] ダッシュボードアクセス確認中...');
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    
    const currentUrl = page.url();
    if (!currentUrl.includes('/dashboard')) {
      throw new Error(`ダッシュボードアクセス失敗: ${currentUrl}`);
    }
    
    console.log('[AUTH-SETUP] ✅ ダッシュボードアクセス成功');
    
    // Step 6: APIアクセス確認
    const apiResponse = await page.request.get('/api/posts');
    expect(apiResponse.ok()).toBeTruthy();
    console.log('[AUTH-SETUP] ✅ APIアクセス確認成功');
    
    console.log('[AUTH-SETUP] ✅ 認証セットアップ完了');
    
  } catch (error) {
    console.error('[AUTH-SETUP] ❌ 認証セットアップ失敗:', error);
    
    // デバッグ情報の出力
    const cookies = await page.context().cookies();
    console.log('[AUTH-SETUP-DEBUG] Cookies:', cookies.map(c => ({
      name: c.name,
      domain: c.domain,
      httpOnly: c.httpOnly
    })));
    
    // スクリーンショット保存
    await page.screenshot({ 
      path: `test-results/auth-setup-error-${Date.now()}.png` 
    });
    
    throw error;
  }
});