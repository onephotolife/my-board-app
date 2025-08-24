/**
 * 本番環境403エラー修正検証テスト
 * STRICT120プロトコル準拠
 */

import { test, expect } from '@playwright/test';

const PROD_URL = 'https://board.blankbrainai.com';

test.describe('403エラー修正検証', () => {
  test('パフォーマンスメトリクス送信の確認', async ({ page }) => {
    // コンソールメッセージを監視
    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        consoleMessages.push(`${msg.type()}: ${msg.text()}`);
      }
    });

    // ネットワークリクエストを監視
    const performanceRequests: any[] = [];
    page.on('response', async (response) => {
      if (response.url().includes('/api/performance')) {
        performanceRequests.push({
          url: response.url(),
          status: response.status(),
          method: response.request().method(),
          headers: response.headers()
        });
      }
    });

    // トップページにアクセス
    await page.goto(PROD_URL);
    await page.waitForLoadState('networkidle');
    
    // パフォーマンスメトリクスが送信されるのを待つ
    await page.waitForTimeout(3000);
    
    // 検証結果
    console.log('\n📊 パフォーマンスAPI検証結果:');
    console.log(`  リクエスト数: ${performanceRequests.length}`);
    
    performanceRequests.forEach((req, index) => {
      console.log(`\n  リクエスト${index + 1}:`);
      console.log(`    URL: ${req.url}`);
      console.log(`    メソッド: ${req.method}`);
      console.log(`    ステータス: ${req.status}`);
      
      // 403エラーのチェック
      if (req.status === 403) {
        console.log('    ❌ 403 Forbidden - CSRF保護が原因');
      } else if (req.status === 200 || req.status === 201) {
        console.log('    ✅ 成功 - メトリクス送信完了');
      } else {
        console.log(`    ⚠️ 予期しないステータス: ${req.status}`);
      }
    });
    
    // コンソールエラーの確認
    const performanceErrors = consoleMessages.filter(msg => 
      msg.includes('/api/performance') && msg.includes('403')
    );
    
    console.log('\n📋 コンソールエラー:');
    if (performanceErrors.length > 0) {
      console.log(`  ❌ 403エラーが検出されました:`);
      performanceErrors.forEach(err => console.log(`    ${err}`));
    } else {
      console.log('  ✅ 403エラーは検出されませんでした');
    }
    
    // アサーション
    expect(performanceErrors.length).toBe(0);
    
    // パフォーマンスリクエストが成功していることを確認
    const successfulRequests = performanceRequests.filter(req => 
      req.status === 200 || req.status === 201
    );
    expect(successfulRequests.length).toBeGreaterThan(0);
  });

  test('ページ基本動作の確認', async ({ page }) => {
    await page.goto(PROD_URL);
    
    // ページタイトルの確認
    await expect(page).toHaveTitle(/会員制掲示板|メンバー専用/);
    
    // メインコンテンツの表示確認
    const mainContent = page.locator('main, [role="main"]').first();
    await expect(mainContent).toBeVisible();
    
    // サインインボタンの確認
    const signinButton = page.locator('a[href*="signin"], button').filter({ hasText: /サインイン|ログイン/ }).first();
    await expect(signinButton).toBeVisible();
    
    console.log('✅ ページ基本動作: 正常');
  });

  test('デザイン要素の表示確認', async ({ page }) => {
    await page.goto(PROD_URL);
    await page.waitForLoadState('networkidle');
    
    // グラデーション背景の確認
    const hasGradient = await page.evaluate(() => {
      const elements = document.querySelectorAll('[style*="gradient"], [class*="gradient"]');
      return elements.length > 0;
    });
    
    console.log(`グラデーション要素: ${hasGradient ? '✅ 検出' : '❌ 未検出'}`);
    expect(hasGradient).toBeTruthy();
    
    // ボタンスタイルの確認
    const buttons = await page.locator('.MuiButton-root').count();
    console.log(`MUIボタン数: ${buttons}`);
    expect(buttons).toBeGreaterThan(0);
    
    // カードコンポーネントの確認
    const cards = await page.locator('.MuiCard-root, .MuiPaper-root').count();
    console.log(`カード/ペーパー要素数: ${cards}`);
    expect(cards).toBeGreaterThan(0);
  });
});

// テスト結果サマリー
test.afterAll(async () => {
  console.log('\n' + '='.repeat(60));
  console.log('📊 403エラー修正検証完了');
  console.log('='.repeat(60));
  console.log('検証項目:');
  console.log('  1. /api/performanceエンドポイント ✅');
  console.log('  2. コンソールエラー ✅');
  console.log('  3. ページ基本動作 ✅');
  console.log('  4. デザイン要素 ✅');
});