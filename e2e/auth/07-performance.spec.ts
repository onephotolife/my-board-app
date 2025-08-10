/**
 * パフォーマンステストのE2Eテスト
 */

import { test, expect } from '../fixtures/auth.fixture';
import { PERFORMANCE_THRESHOLDS } from '../helpers/test-data';
import { 
  createTestUser, 
  deleteTestUser,
  cleanupTestUsers 
} from '../helpers/db-helper';
import { generateTestEmail } from '../helpers/email-helper';

test.describe('パフォーマンステスト', () => {
  test.afterAll(async () => {
    // すべてのテストユーザーをクリーンアップ
    await cleanupTestUsers();
  });
  
  test('ページ読み込み時間が基準値以内', async ({ page }) => {
    const pages = [
      '/auth/signup',
      '/auth/signin',
      '/auth/verify-email',
    ];
    
    for (const path of pages) {
      const startTime = Date.now();
      await page.goto(path, { waitUntil: 'networkidle' });
      const loadTime = Date.now() - startTime;
      
      console.log(`Page ${path}: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoad);
    }
  });
  
  test('API応答時間が基準値以内', async ({ page }) => {
    const testEmail = generateTestEmail();
    
    // APIリクエストの応答時間を測定
    const responseTime = await page.evaluate(async (email) => {
      const startTime = performance.now();
      
      const response = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      await response.json();
      return performance.now() - startTime;
    }, testEmail);
    
    console.log(`API check-email: ${responseTime}ms`);
    expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.apiResponse);
  });
  
  test('フォーム送信時間が基準値以内', async ({ page }) => {
    const testEmail = generateTestEmail();
    
    await page.goto('/auth/signup');
    
    // フォーム入力
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'Test123!@#');
    await page.fill('input[name="confirmPassword"]', 'Test123!@#');
    await page.fill('input[name="name"]', 'Test User');
    
    // 送信時間を測定
    const startTime = Date.now();
    await page.click('button[type="submit"]');
    
    // レスポンスを待つ
    await page.waitForSelector('.success-message, .error-message', {
      timeout: PERFORMANCE_THRESHOLDS.formSubmit
    });
    
    const submitTime = Date.now() - startTime;
    
    console.log(`Form submit: ${submitTime}ms`);
    expect(submitTime).toBeLessThan(PERFORMANCE_THRESHOLDS.formSubmit);
    
    // クリーンアップ
    await deleteTestUser(testEmail);
  });
  
  test('同時複数ユーザー登録の処理', async ({ page, context }) => {
    const userCount = 10;
    const emails: string[] = [];
    const pages = [];
    
    // 複数のページを開く
    for (let i = 0; i < userCount; i++) {
      const newPage = await context.newPage();
      pages.push(newPage);
      emails.push(generateTestEmail());
    }
    
    const startTime = Date.now();
    
    // 同時に登録を実行
    const registrations = pages.map(async (p, index) => {
      await p.goto('/auth/signup');
      await p.fill('input[name="email"]', emails[index]);
      await p.fill('input[name="password"]', 'Test123!@#');
      await p.fill('input[name="confirmPassword"]', 'Test123!@#');
      await p.fill('input[name="name"]', `User ${index}`);
      await p.click('button[type="submit"]');
      
      return p.waitForSelector('.success-message, .error-message', {
        timeout: 10000
      });
    });
    
    // すべての登録が完了するまで待つ
    await Promise.all(registrations);
    
    const totalTime = Date.now() - startTime;
    const averageTime = totalTime / userCount;
    
    console.log(`Concurrent registrations: ${userCount} users in ${totalTime}ms (avg: ${averageTime}ms)`);
    
    // 平均時間が基準値の2倍以内であることを確認
    expect(averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.formSubmit * 2);
    
    // クリーンアップ
    for (const p of pages) {
      await p.close();
    }
    for (const email of emails) {
      await deleteTestUser(email);
    }
  });
  
  test('メモリリークのチェック', async ({ page }) => {
    // 初期メモリ使用量を取得
    const initialMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });
    
    // 繰り返し操作を実行
    for (let i = 0; i < 10; i++) {
      await page.goto('/auth/signup');
      await page.fill('input[name="email"]', `test${i}@example.com`);
      await page.fill('input[name="password"]', 'Test123!@#');
      
      // パスワード強度チェックをトリガー
      await page.press('input[name="password"]', 'Tab');
      await page.waitForTimeout(100);
    }
    
    // ガベージコレクションを強制実行（可能な場合）
    await page.evaluate(() => {
      if (global.gc) {
        global.gc();
      }
    });
    
    // 最終メモリ使用量を取得
    const finalMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });
    
    // メモリ増加量を確認
    const memoryIncrease = finalMemory - initialMemory;
    const increasePercentage = (memoryIncrease / initialMemory) * 100;
    
    console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB (${increasePercentage.toFixed(2)}%)`);
    
    // メモリ増加が50%以内であることを確認
    if (initialMemory > 0) {
      expect(increasePercentage).toBeLessThan(50);
    }
  });
  
  test('レート制限のパフォーマンス影響', async ({ page }) => {
    const testEmail = generateTestEmail();
    const responseTimes: number[] = [];
    
    // レート制限に達するまでリクエストを送信
    for (let i = 0; i < 5; i++) {
      const startTime = Date.now();
      
      const response = await page.evaluate(async (email) => {
        const res = await fetch('/api/auth/resend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        return res.status;
      }, testEmail);
      
      const responseTime = Date.now() - startTime;
      responseTimes.push(responseTime);
      
      console.log(`Request ${i + 1}: ${responseTime}ms (status: ${response})`);
      
      // レート制限に達した場合でも応答時間が適切
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.apiResponse * 2);
      
      await page.waitForTimeout(1000); // 1秒待機
    }
    
    // 応答時間の一貫性を確認
    const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxDeviation = Math.max(...responseTimes.map(t => Math.abs(t - avgTime)));
    
    console.log(`Average response time: ${avgTime}ms, Max deviation: ${maxDeviation}ms`);
    
    // 最大偏差が平均の100%以内
    expect(maxDeviation).toBeLessThan(avgTime);
  });
  
  test('大量データでのパフォーマンス', async ({ page }) => {
    // 長い名前とメールアドレスでテスト
    const longEmail = 'very.long.email.address.for.testing.performance@extremely-long-domain-name-for-testing.example.com';
    const longName = 'A'.repeat(50); // 最大長の名前
    
    await page.goto('/auth/signup');
    
    const startTime = Date.now();
    
    await page.fill('input[name="email"]', longEmail);
    await page.fill('input[name="password"]', 'Test123!@#');
    await page.fill('input[name="confirmPassword"]', 'Test123!@#');
    await page.fill('input[name="name"]', longName);
    
    // パスワード強度チェック
    await page.press('input[name="password"]', 'Tab');
    await page.waitForTimeout(500);
    
    const inputTime = Date.now() - startTime;
    
    console.log(`Large data input: ${inputTime}ms`);
    expect(inputTime).toBeLessThan(2000);
  });
});