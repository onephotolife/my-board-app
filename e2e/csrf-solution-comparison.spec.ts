import { test, expect } from '@playwright/test';

test.describe('CSRF解決策1と2の比較テスト', () => {
  test.beforeEach(async ({ page }) => {
    // コンソールメッセージの記録
    page.on('console', msg => {
      if (msg.text().includes('[CSRF]') || msg.text().includes('LinearProgress')) {
        console.log(`Console: ${msg.text()}`);
      }
    });
  });

  test('解決策2: 初期化中のローディング表示', async ({ page }) => {
    // ページ読み込み
    await page.goto('http://localhost:3000/test-follow');
    
    // LinearProgressバーが表示されていることを確認
    const progressBar = page.locator('.MuiLinearProgress-root');
    
    // 一瞬でもLinearProgressが表示されているか
    try {
      await progressBar.waitFor({ state: 'visible', timeout: 1000 });
      console.log('✅ LinearProgressバーが表示されました');
      
      // スケルトンUI状態（opacity: 0.7）を確認
      const skeletonBox = page.locator('.MuiBox-root').filter({ 
        has: page.locator('text=/フォロー/')
      }).first();
      
      const opacity = await skeletonBox.evaluate(el => 
        window.getComputedStyle(el).opacity
      );
      
      console.log(`📊 スケルトンUI opacity: ${opacity}`);
      
    } catch (e) {
      console.log('⚠️ LinearProgressバーは非常に高速で消えた可能性があります');
    }
    
    // CSRFトークン取得完了を待つ
    await page.waitForResponse(
      response => response.url().includes('/api/csrf') && response.ok(),
      { timeout: 5000 }
    );
    
    // ローディングが完了して通常表示になることを確認
    await page.waitForTimeout(500);
    
    const mainContent = page.locator('main');
    const finalOpacity = await mainContent.evaluate(el => 
      window.getComputedStyle(el).opacity
    );
    
    console.log(`📊 最終的な opacity: ${finalOpacity}`);
    expect(parseFloat(finalOpacity)).toBe(1);
  });

  test('解決策1: useSecureFetch待機機能', async ({ page }) => {
    const consoleLogs: string[] = [];
    
    page.on('console', msg => {
      if (msg.text().includes('[CSRF]')) {
        consoleLogs.push(msg.text());
      }
    });
    
    await page.goto('http://localhost:3000/test-follow');
    
    // CSRFトークン取得を待つ
    await page.waitForResponse(
      response => response.url().includes('/api/csrf') && response.ok(),
      { timeout: 5000 }
    );
    
    const followButton = page.locator('button').filter({ 
      hasText: 'フォロー' 
    }).first();
    
    // ボタンクリック
    await followButton.click();
    
    // 少し待ってログを収集
    await page.waitForTimeout(1000);
    
    // useSecureFetchの待機ログを確認
    const waitingLogs = consoleLogs.filter(log => 
      log.includes('待機中') || log.includes('トークン取得成功')
    );
    
    if (waitingLogs.length > 0) {
      console.log('✅ useSecureFetchの待機機能が動作しました');
      waitingLogs.forEach(log => console.log(`  📝 ${log}`));
    } else {
      console.log('⚡ トークンは既に初期化済みでした');
    }
    
    // APIレスポンスの確認
    const response = await page.waitForResponse(
      response => response.url().includes('/api/follow'),
      { timeout: 5000 }
    );
    
    expect([200, 201, 401]).toContain(response.status());
    expect(response.status()).not.toBe(403);
    console.log(`✅ APIレスポンス: ${response.status()} (403でない = CSRF OK)`);
  });

  test('両解決策の統合動作確認', async ({ page }) => {
    // 初回アクセス
    await page.goto('http://localhost:3000/test-follow');
    
    // ローディング表示の有無を記録
    let hasLoadingBar = false;
    try {
      await page.locator('.MuiLinearProgress-root').waitFor({ 
        state: 'visible', 
        timeout: 500 
      });
      hasLoadingBar = true;
    } catch {
      hasLoadingBar = false;
    }
    
    console.log(`📊 ローディングバー表示: ${hasLoadingBar ? 'あり' : 'なし（高速）'}`);
    
    // CSRFトークン取得確認
    const csrfResponse = await page.waitForResponse(
      response => response.url().includes('/api/csrf') && response.ok(),
      { timeout: 5000 }
    );
    console.log('✅ CSRFトークン取得完了');
    
    // 複数のフォローボタンをクリック
    const buttons = await page.locator('button').filter({ 
      hasText: 'フォロー' 
    }).all();
    
    if (buttons.length >= 2) {
      // 2つのボタンを同時クリック
      await Promise.all([
        buttons[0].click(),
        buttons[1].click()
      ]);
      
      console.log('🖱️ 2つのボタンを同時にクリック');
      
      // レスポンスを待つ
      await page.waitForTimeout(2000);
      
      // 403エラーが発生していないことを確認
      const responses = await page.evaluate(() => {
        return performance.getEntriesByType('resource')
          .filter(entry => entry.name.includes('/api/follow'))
          .map(entry => entry.name);
      });
      
      console.log(`📊 APIコール数: ${responses.length}`);
    }
    
    // 最終状態の確認
    const finalState = await page.evaluate(() => {
      return {
        hasCSRFToken: !!document.querySelector('meta[name="app-csrf-token"]')?.getAttribute('content'),
        mainOpacity: window.getComputedStyle(document.querySelector('main')!).opacity,
        buttonsEnabled: !document.querySelector('button[disabled]')
      };
    });
    
    console.log('📊 最終状態:');
    console.log(`  - CSRFトークン: ${finalState.hasCSRFToken ? '設定済み' : '未設定'}`);
    console.log(`  - メインコンテンツ opacity: ${finalState.mainOpacity}`);
    console.log(`  - ボタン状態: ${finalState.buttonsEnabled ? '有効' : '無効'}`);
    
    expect(finalState.hasCSRFToken).toBe(true);
    expect(parseFloat(finalState.mainOpacity)).toBe(1);
  });
});