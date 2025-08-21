/**
 * ユーザージャーニーE2Eテスト
 * 新規ユーザーの登録から投稿までの一連の流れをテスト
 */

const { test, expect } = require('@playwright/test');

// テスト設定
test.use({
  baseURL: 'https://board.blankbrainai.com',
  viewport: { width: 1280, height: 720 },
  video: 'on-first-retry',
  screenshot: 'only-on-failure',
});

// テストデータ
const generateTestUser = () => ({
  email: `test_${Date.now()}@example.com`,
  password: 'Test1234!',
  name: `TestUser_${Date.now()}`,
});

test.describe('新規ユーザージャーニー', () => {
  let testUser;

  test.beforeEach(async () => {
    testUser = generateTestUser();
  });

  test('01: ランディングページの表示確認', async ({ page }) => {
    // ページアクセス
    await page.goto('/');
    
    // ページ読み込み時間測定
    const performanceTiming = await page.evaluate(() => {
      const timing = performance.timing;
      return {
        loadTime: timing.loadEventEnd - timing.navigationStart,
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        firstPaint: performance.getEntriesByType('paint')[0]?.startTime,
      };
    });
    
    console.log('Performance metrics:', performanceTiming);
    expect(performanceTiming.loadTime).toBeLessThan(3000); // 3秒以内
    
    // 主要要素の確認
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('nav')).toBeVisible();
    
    // CTAボタンの確認
    const signUpButton = page.locator('button:has-text("新規登録"), a:has-text("Sign Up")').first();
    await expect(signUpButton).toBeVisible();
    
    // スクリーンショット
    await page.screenshot({ path: 'test-results/landing-page.png', fullPage: true });
  });

  test('02: 新規ユーザー登録フロー', async ({ page }) => {
    await page.goto('/');
    
    // 登録ページへ
    await page.click('text=/新規登録|Sign Up/i');
    await page.waitForURL(/\/(register|signup)/);
    
    // フォーム入力
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"], input[name="password_confirmation"]', testUser.password);
    
    // 利用規約に同意
    const termsCheckbox = page.locator('input[type="checkbox"]').first();
    await termsCheckbox.check();
    
    // 登録ボタンクリック
    await page.click('button[type="submit"]:has-text("登録")');
    
    // 成功メッセージまたはメール確認画面を待つ
    await expect(page.locator('text=/確認|成功|メール/i')).toBeVisible({ timeout: 10000 });
    
    // メール認証のシミュレーション（実際のテストでは別途メール確認が必要）
    console.log('Registration submitted for:', testUser.email);
  });

  test('03: ログインと初回投稿', async ({ page }) => {
    // ログインページへ
    await page.goto('/login');
    
    // ログイン
    await page.fill('input[type="email"]', 'existing@example.com'); // 既存ユーザー
    await page.fill('input[type="password"]', 'Test1234!');
    await page.click('button[type="submit"]:has-text("ログイン")');
    
    // ダッシュボードへの遷移を待つ
    await page.waitForURL(/\/(dashboard|home|posts)/);
    
    // 新規投稿ボタンをクリック
    await page.click('button:has-text("新規投稿"), a:has-text("投稿作成")');
    
    // 投稿フォームに入力
    const postTitle = `テスト投稿 ${new Date().toISOString()}`;
    const postContent = 'これは自動テストによる投稿です。\\n改行テスト\\n絵文字テスト 😀';
    
    await page.fill('input[name="title"]', postTitle);
    await page.fill('textarea[name="content"]', postContent);
    
    // 文字数カウンターの確認
    const charCounter = page.locator('text=/\\d+\\/\\d+/');
    if (await charCounter.isVisible()) {
      const counterText = await charCounter.textContent();
      console.log('Character count:', counterText);
    }
    
    // 投稿ボタンクリック
    await page.click('button:has-text("投稿"), button:has-text("公開")');
    
    // 成功通知を待つ
    await expect(page.locator('text=/成功|完了|投稿しました/i')).toBeVisible();
    
    // 投稿が一覧に表示されることを確認
    await page.goto('/posts');
    await expect(page.locator(`text="${postTitle}"`)).toBeVisible();
  });

  test('04: 投稿の編集と削除', async ({ page }) => {
    // ログイン（省略）
    await page.goto('/login');
    await page.fill('input[type="email"]', 'existing@example.com');
    await page.fill('input[type="password"]', 'Test1234!');
    await page.click('button[type="submit"]');
    
    // 投稿一覧へ
    await page.goto('/posts');
    
    // 自分の投稿を見つける
    const myPost = page.locator('.post-item').filter({ hasText: 'テスト投稿' }).first();
    
    if (await myPost.isVisible()) {
      // 編集ボタンクリック
      await myPost.locator('button:has-text("編集")').click();
      
      // 内容を更新
      await page.fill('textarea[name="content"]', '更新されたコンテンツ');
      await page.click('button:has-text("更新")');
      
      // 成功通知
      await expect(page.locator('text=/更新|保存/i')).toBeVisible();
      
      // 削除
      await myPost.locator('button:has-text("削除")').click();
      
      // 確認ダイアログ
      await page.click('button:has-text("確認"), button:has-text("OK")');
      
      // 削除完了
      await expect(myPost).not.toBeVisible();
    }
  });
});

test.describe('既存ユーザーフロー', () => {
  test('ログイン維持の確認', async ({ page, context }) => {
    // ログイン
    await page.goto('/login');
    await page.fill('input[type="email"]', 'existing@example.com');
    await page.fill('input[type="password"]', 'Test1234!');
    await page.check('input[name="remember"]');
    await page.click('button[type="submit"]');
    
    // クッキーを保存
    const cookies = await context.cookies();
    console.log('Cookies saved:', cookies.length);
    
    // 新しいページでセッション維持を確認
    const newPage = await context.newPage();
    await newPage.goto('/dashboard');
    
    // ログイン状態が維持されていることを確認
    await expect(newPage.locator('text=/ログアウト|Logout/i')).toBeVisible();
  });

  test('検索機能のテスト', async ({ page }) => {
    await page.goto('/posts');
    
    // 検索ボックスに入力
    await page.fill('input[type="search"]', 'テスト');
    await page.press('input[type="search"]', 'Enter');
    
    // 検索結果の確認
    await page.waitForLoadState('networkidle');
    
    const results = page.locator('.post-item');
    const count = await results.count();
    console.log(`Search results: ${count} posts found`);
    
    // 各結果に検索キーワードが含まれることを確認
    if (count > 0) {
      const firstResult = results.first();
      const text = await firstResult.textContent();
      expect(text.toLowerCase()).toContain('テスト');
    }
  });
});

test.describe('エラーハンドリング', () => {
  test('無効な認証情報でのログイン', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'WrongPassword');
    await page.click('button[type="submit"]');
    
    // エラーメッセージの確認
    await expect(page.locator('text=/エラー|失敗|無効|incorrect/i')).toBeVisible();
  });

  test('ネットワークエラーの処理', async ({ page }) => {
    // オフラインモードをシミュレート
    await page.route('**/api/**', route => route.abort());
    
    await page.goto('/posts');
    
    // エラーメッセージまたは再試行ボタンの確認
    await expect(page.locator('text=/エラー|再試行|接続/i')).toBeVisible({ timeout: 10000 });
  });

  test('404ページの確認', async ({ page }) => {
    await page.goto('/non-existent-page');
    
    // 404メッセージの確認
    await expect(page.locator('text=/404|見つかりません|Not Found/i')).toBeVisible();
    
    // ホームへのリンクがあることを確認
    await expect(page.locator('a[href="/"]')).toBeVisible();
  });
});

test.describe('パフォーマンス測定', () => {
  test('Core Web Vitals測定', async ({ page }) => {
    await page.goto('/');
    
    // Web Vitalsの測定
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        let lcp, fid, cls;
        
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.name === 'largest-contentful-paint') {
              lcp = entry.startTime;
            }
          });
        }).observe({ entryTypes: ['largest-contentful-paint'] });
        
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (!fid) {
              fid = entry.processingStart - entry.startTime;
            }
          });
        }).observe({ entryTypes: ['first-input'] });
        
        let clsValue = 0;
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          cls = clsValue;
        }).observe({ entryTypes: ['layout-shift'] });
        
        setTimeout(() => {
          resolve({ lcp, fid, cls });
        }, 5000);
      });
    });
    
    console.log('Core Web Vitals:', metrics);
    
    // 基準値との比較
    expect(metrics.lcp).toBeLessThan(2500); // Good LCP
    if (metrics.fid) expect(metrics.fid).toBeLessThan(100); // Good FID
    if (metrics.cls) expect(metrics.cls).toBeLessThan(0.1); // Good CLS
  });
});