import { test, expect } from '@playwright/test';

const PRODUCTION_URL = 'https://board.blankbrainai.com';

test.describe('LCP問題の検証', () => {
  test('JavaScriptなしでのレンダリング確認', async ({ page, browser }) => {
    // JavaScriptを無効化
    const context = await browser.newContext({
      javaScriptEnabled: false
    });
    const noJsPage = await context.newPage();
    
    console.log('📊 JavaScript無効状態でのアクセス...');
    await noJsPage.goto(PRODUCTION_URL);
    await noJsPage.waitForTimeout(3000);
    
    // コンテンツの存在確認
    const bodyContent = await noJsPage.textContent('body');
    console.log('📝 JavaScript無効時のコンテンツ長:', bodyContent?.length || 0);
    
    // スクリーンショット撮影
    await noJsPage.screenshot({ 
      path: 'production-no-js.png',
      fullPage: true
    });
    
    await context.close();
  });

  test('JavaScriptありでのレンダリング確認', async ({ page }) => {
    console.log('📊 JavaScript有効状態でのアクセス...');
    
    // パフォーマンスメトリクスの取得
    await page.goto(PRODUCTION_URL);
    
    // LCPの測定
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        // PerformanceObserverでLCPを観測
        let lcpValue = 0;
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          lcpValue = lastEntry.startTime;
        });
        
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
        
        // 5秒後に測定終了
        setTimeout(() => {
          observer.disconnect();
          
          // Navigation Timingも取得
          const navTiming = performance.getEntriesByType('navigation')[0] as any;
          
          resolve({
            lcp: lcpValue,
            fcp: navTiming?.responseStart || 0,
            domContentLoaded: navTiming?.domContentLoadedEventEnd || 0,
            loadComplete: navTiming?.loadEventEnd || 0,
            hasLCP: lcpValue > 0
          });
        }, 5000);
      });
    });
    
    console.log('📊 パフォーマンスメトリクス:', metrics);
    
    // スクリーンショット撮影
    await page.screenshot({ 
      path: 'production-with-js.png',
      fullPage: true
    });
  });

  test('初回レンダリングの内容確認', async ({ page }) => {
    console.log('📊 初回HTML内容の確認...');
    
    // responseを取得
    const response = await page.goto(PRODUCTION_URL);
    const html = await response?.text();
    
    // HTML内のコンテンツ分析
    const hasMainContent = html?.includes('main') || false;
    const hasVisibleText = html?.includes('会員制掲示板') || false;
    const hasNoScript = html?.includes('<noscript>') || false;
    const isCSR = html?.includes('use client') || html?.includes('__next') || false;
    
    console.log('📝 HTML分析結果:');
    console.log('  - メインコンテンツ:', hasMainContent ? '✅' : '❌');
    console.log('  - 可視テキスト:', hasVisibleText ? '✅' : '❌');
    console.log('  - NoScriptタグ:', hasNoScript ? '✅' : '❌');
    console.log('  - CSRの兆候:', isCSR ? '⚠️ あり' : '✅ なし');
    
    // HTMLサイズ
    console.log('  - HTMLサイズ:', html?.length || 0, 'bytes');
  });
});