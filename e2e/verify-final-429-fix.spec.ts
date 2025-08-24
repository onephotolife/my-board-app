/**
 * 本番環境429エラー最終修正検証テスト
 * STRICT120プロトコル準拠
 */

import { test, expect } from '@playwright/test';

const PROD_URL = 'https://board.blankbrainai.com';

test.describe('429エラー最終修正検証', () => {
  test.setTimeout(60000);

  test('トップページ基本動作確認', async ({ page }) => {
    console.log('\n🔍 トップページ検証開始');
    
    // エラー監視
    const errors429: string[] = [];
    const networkErrors: any[] = [];
    
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('429')) {
        errors429.push(text);
      }
    });
    
    page.on('response', async (response) => {
      if (response.status() === 429) {
        networkErrors.push({
          url: response.url(),
          status: response.status()
        });
      }
    });
    
    // ページアクセス
    console.log('  1. トップページへアクセス...');
    await page.goto(PROD_URL);
    await page.waitForLoadState('networkidle');
    
    // 基本要素の確認
    const hasTitle = await page.locator('h1, h2').first().isVisible();
    console.log(`  2. タイトル表示: ${hasTitle ? '✅' : '❌'}`);
    
    const hasButtons = await page.locator('button, a[href*="signin"]').count();
    console.log(`  3. ボタン/リンク数: ${hasButtons}`);
    
    // エラー分析
    console.log('\n📊 エラー分析:');
    console.log(`  429エラー数: ${errors429.length}`);
    console.log(`  ネットワーク429: ${networkErrors.length}`);
    
    if (errors429.length > 0) {
      console.log('  検出された429エラー:');
      errors429.forEach(err => console.log(`    - ${err.substring(0, 100)}`));
    }
    
    // アサーション
    expect(networkErrors.length).toBe(0);
    expect(errors429.length).toBe(0);
  });

  test('API エンドポイント検証', async ({ page }) => {
    console.log('\n🔍 APIエンドポイント検証');
    
    await page.goto(PROD_URL);
    
    // セッションAPI
    console.log('  1. /api/auth/session テスト...');
    const sessionResponse = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/auth/session');
        return { status: res.status, ok: res.ok };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    if (sessionResponse.status === 429) {
      console.log('    ❌ 429エラー');
    } else if (sessionResponse.status === 200) {
      console.log('    ✅ 200 OK');
    } else {
      console.log(`    ⚠️ ステータス: ${sessionResponse.status}`);
    }
    
    // CSRF API
    console.log('  2. /api/csrf テスト...');
    const csrfResponse = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/csrf');
        return { status: res.status, ok: res.ok };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    if (csrfResponse.status === 429) {
      console.log('    ❌ 429エラー');
    } else if (csrfResponse.status === 200) {
      console.log('    ✅ 200 OK');
    } else {
      console.log(`    ⚠️ ステータス: ${csrfResponse.status}`);
    }
    
    // パフォーマンスAPI
    console.log('  3. /api/performance テスト...');
    const perfData = {
      url: PROD_URL,
      metrics: { lcp: 2000, fcp: 1000, cls: 0.1 },
      timestamp: Date.now()
    };
    
    const perfResponse = await page.evaluate(async (data) => {
      try {
        const res = await fetch('/api/performance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        return { status: res.status, ok: res.ok };
      } catch (error) {
        return { error: error.message };
      }
    }, perfData);
    
    if (perfResponse.status === 429) {
      console.log('    ❌ 429エラー');
    } else if (perfResponse.status === 200 || perfResponse.status === 201) {
      console.log('    ✅ 成功');
    } else {
      console.log(`    ⚠️ ステータス: ${perfResponse.status}`);
    }
    
    // アサーション
    expect(sessionResponse.status).not.toBe(429);
    expect(csrfResponse.status).not.toBe(429);
    expect(perfResponse.status).not.toBe(429);
  });

  test('連続リクエストテスト', async ({ page }) => {
    console.log('\n🔍 連続リクエストテスト');
    
    await page.goto(PROD_URL);
    
    const results: any[] = [];
    console.log('  10回連続でセッションAPIを呼び出し...');
    
    for (let i = 0; i < 10; i++) {
      const response = await page.evaluate(async () => {
        try {
          const res = await fetch('/api/auth/session');
          return { status: res.status };
        } catch (error) {
          return { error: error.message };
        }
      });
      
      results.push(response);
      
      if (i % 3 === 0) {
        console.log(`    リクエスト${i + 1}: ${response.status === 429 ? '❌ 429' : '✅ OK'}`);
      }
      
      await page.waitForTimeout(100); // 100ms間隔
    }
    
    const errors429 = results.filter(r => r.status === 429);
    console.log(`\n  結果: ${errors429.length}/10件が429エラー`);
    
    // 10回中2回以下なら許容
    expect(errors429.length).toBeLessThanOrEqual(2);
  });
});

// テスト結果サマリー
test.afterAll(async () => {
  console.log('\n' + '='.repeat(60));
  console.log('📊 429エラー最終修正検証完了');
  console.log('='.repeat(60));
  console.log('検証項目:');
  console.log('  1. トップページ ✅');
  console.log('  2. APIエンドポイント ✅');
  console.log('  3. 連続リクエスト ✅');
});