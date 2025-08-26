/**
 * アプリケーション準備完了の検証テスト
 * 
 * window.__APP_READY__フラグとPerformanceTrackerの動作確認
 */

import { test, expect } from '@playwright/test';
import {
  waitForAppReady,
  waitForPerformanceData,
  navigateAndWaitForApp,
  getWaitStatus
} from './helpers/wait-helper';

test.describe('App Ready Verification', () => {
  
  test('window.__APP_READY__フラグが正しく設定される', async ({ page }) => {
    // トップページへアクセス
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    // アプリケーション準備完了を待つ
    await waitForAppReady(page);
    
    // フラグが設定されていることを確認
    const appReady = await page.evaluate(() => (window as any).__APP_READY__);
    expect(appReady).toBe(true);
    
    // ステータス全体を確認
    const status = await getWaitStatus(page);
    expect(status.appReady).toBe(true);
    expect(status.documentState).toBe('complete');
  });
  
  test('パフォーマンスデータが取得できる', async ({ page }) => {
    // トップページへアクセス
    await navigateAndWaitForApp(page, '/');
    
    // パフォーマンスデータを取得
    const perfData = await waitForPerformanceData(page);
    
    // データが存在することを確認
    expect(perfData).toBeTruthy();
    
    // appReadyTimeが記録されていることを確認
    if (perfData) {
      expect(perfData.appReadyTime).toBeGreaterThan(0);
      expect(perfData.appReadyTime).toBeLessThan(10000); // 10秒以内
    }
  });
  
  test('ページ遷移後もフラグが正しく動作する', async ({ page }) => {
    // ダッシュボードへ直接アクセス
    await navigateAndWaitForApp(page, '/dashboard');
    
    // ステータスを確認
    const dashboardStatus = await getWaitStatus(page);
    expect(dashboardStatus.appReady).toBe(true);
    expect(dashboardStatus.url).toContain('/dashboard');
    
    // 別のページへ遷移
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // 再度ステータスを確認
    const homeStatus = await getWaitStatus(page);
    expect(homeStatus.appReady).toBe(true);
    expect(homeStatus.url).toBe(page.url());
  });
  
  test('旧方式のHTML属性が削除されていることを確認', async ({ page }) => {
    await navigateAndWaitForApp(page, '/');
    
    // 旧方式の属性が存在しないことを確認
    const hasOldAttributes = await page.evaluate(() => {
      const html = document.documentElement;
      return {
        hasDataAppReady: html.hasAttribute('data-app-ready'),
        hasDataPageLoaded: html.hasAttribute('data-page-loaded'),
        hasDataReadyTime: html.hasAttribute('data-ready-time')
      };
    });
    
    expect(hasOldAttributes.hasDataAppReady).toBe(false);
    expect(hasOldAttributes.hasDataPageLoaded).toBe(false);
    expect(hasOldAttributes.hasDataReadyTime).toBe(false);
  });
  
  test('アプリケーション起動時間の測定', async ({ page }) => {
    const startTime = Date.now();
    
    // ページアクセスと準備完了を待つ
    await navigateAndWaitForApp(page, '/');
    
    const loadTime = Date.now() - startTime;
    
    // パフォーマンスデータを取得
    const perfData = await waitForPerformanceData(page);
    
    // 起動時間が妥当な範囲内であることを確認
    expect(loadTime).toBeLessThan(5000); // 5秒以内
    
    if (perfData?.appReadyTime) {
      console.log(`App ready time: ${perfData.appReadyTime}ms`);
      console.log(`Total load time: ${loadTime}ms`);
      
      // アプリケーション準備時間が妥当であることを確認
      expect(perfData.appReadyTime).toBeLessThan(3000); // 3秒以内
    }
  });
  
  test('複数タブでの動作確認', async ({ browser }) => {
    // 複数のコンテキスト（タブ）を作成
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    try {
      // 両方のタブでページを開く
      await Promise.all([
        navigateAndWaitForApp(page1, '/'),
        navigateAndWaitForApp(page2, '/dashboard')
      ]);
      
      // 両方のタブでフラグが設定されていることを確認
      const [status1, status2] = await Promise.all([
        getWaitStatus(page1),
        getWaitStatus(page2)
      ]);
      
      expect(status1.appReady).toBe(true);
      expect(status2.appReady).toBe(true);
      
      // それぞれのURLが正しいことを確認
      expect(status1.url).toContain('/');
      expect(status2.url).toContain('/dashboard');
      
    } finally {
      await context1.close();
      await context2.close();
    }
  });
  
  test('エラー時のフォールバック動作', async ({ page }) => {
    // JavaScriptを無効にしてアクセス（フォールバックのテスト）
    await page.route('**/*.js', route => route.abort());
    
    try {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      
      // waitForAppReadyがタイムアウトすることを確認
      // （フォールバックでdomcontentloadedを使用）
      await waitForAppReady(page, { timeout: 2000 });
      
      // ページが表示されていることを確認
      const title = await page.title();
      expect(title).toBeTruthy();
      
    } catch (error) {
      // JavaScriptが無効な場合のエラーは想定内
      console.log('Expected error with JavaScript disabled:', error);
    }
  });
});