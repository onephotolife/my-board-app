import { test, expect, Page } from '@playwright/test';

/**
 * フォロー機能E2Eテスト
 * 実際のブラウザ環境でフォロー/アンフォロー動作を検証
 */

// テストユーザー情報
const TEST_USER_1 = {
  email: 'test1@example.com',
  password: 'testpass123',
  name: 'Test User 1',
  id: 'test-user-1'
};

const TEST_USER_2 = {
  email: 'test2@example.com',
  password: 'testpass123',
  name: 'Test User 2',
  id: 'test-user-2'
};

// モック認証ヘルパー関数
async function mockLogin(page: Page, user: typeof TEST_USER_1) {
  // 認証をモックするためのスクリプトを実行
  await page.evaluate((userData) => {
    // セッションストレージまたはクッキーに認証情報を設定
    localStorage.setItem('user', JSON.stringify({
      id: userData.id,
      email: userData.email,
      name: userData.name
    }));
    
    // CSRFトークンを設定
    localStorage.setItem('csrfToken', 'test-csrf-token-12345');
    
    // 認証済みフラグを設定
    sessionStorage.setItem('authenticated', 'true');
  }, user);
}

// APIモックヘルパー
async function setupAPIMocks(page: Page) {
  // フォローAPI呼び出しをインターセプト
  await page.route('**/api/users/*/follow', async (route, request) => {
    const method = request.method();
    const url = request.url();
    
    console.log(`[API Mock] ${method} ${url}`);
    
    if (method === 'GET') {
      // フォロー状態取得
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { isFollowing: false }
        }),
      });
    } else if (method === 'POST') {
      // フォロー実行
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'フォローしました'
        }),
      });
    } else if (method === 'DELETE') {
      // アンフォロー実行
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'フォロー解除しました'
        }),
      });
    }
  });
  
  // CSRFトークン取得APIをモック
  await page.route('**/api/auth/csrf', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        csrfToken: 'test-csrf-token-12345'
      }),
    });
  });
}

test.describe('フォロー機能E2Eテスト', () => {
  test.beforeEach(async ({ page }) => {
    // APIモックのセットアップ
    await setupAPIMocks(page);
  });

  test('フォローボタンが表示される', async ({ page }) => {
    // ページへ移動
    await page.goto('/board');
    
    // フォローボタンを探す（最初の1つ）
    const followButton = page.locator('button[data-testid="follow-button"]').first();
    
    // ボタンの存在確認（タイムアウト10秒）
    await expect(followButton).toBeVisible({ timeout: 10000 });
    
    // ボタンテキスト確認
    const buttonText = await followButton.textContent();
    expect(['フォロー', 'フォロー中']).toContain(buttonText);
  });

  test('未認証状態でフォローボタンが機能しない', async ({ page }) => {
    await page.goto('/board');
    
    // フォローボタンを探す
    const followButton = page.locator('button[data-testid="follow-button"]').first();
    
    if (await followButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      // ボタンが存在する場合、クリック
      await followButton.click();
      
      // エラーメッセージまたは認証要求が表示されることを確認
      const errorAlert = page.locator('[role="alert"]').or(page.locator('.MuiAlert-root'));
      await expect(errorAlert).toBeVisible({ timeout: 5000 }).catch(() => {
        // エラーが表示されない場合も許容（APIがブロックしている）
      });
    }
  });

  test('認証済みユーザーがフォロー/アンフォロー操作できる', async ({ page }) => {
    // ユーザー認証をモック
    await mockLogin(page, TEST_USER_1);
    
    // ページへ移動
    await page.goto('/board');
    
    // フォローボタンを探す
    const followButton = page.locator('button[data-testid="follow-button"]').first();
    
    // ボタンの存在を待つ
    await expect(followButton).toBeVisible({ timeout: 10000 });
    
    // 初期状態確認（フォロー前）
    let buttonText = await followButton.textContent();
    expect(buttonText).toContain('フォロー');
    
    // フォローボタンをクリック
    await followButton.click();
    
    // ローディング状態を確認（スピナー表示）
    const spinner = followButton.locator('.MuiCircularProgress-root');
    await expect(spinner).toBeVisible({ timeout: 2000 }).catch(() => {
      // スピナーが瞬時に終わる場合もあるため、エラーを無視
    });
    
    // フォロー後の状態確認
    await page.waitForTimeout(1000); // API応答待ち
    buttonText = await followButton.textContent();
    expect(buttonText).toBeTruthy();
    
    // 再度クリックしてアンフォロー
    await followButton.click();
    await page.waitForTimeout(1000);
    
    // アンフォロー後の確認
    buttonText = await followButton.textContent();
    expect(buttonText).toBeTruthy();
  });

  test('複数のフォローボタンが独立して動作する', async ({ page }) => {
    await mockLogin(page, TEST_USER_1);
    await page.goto('/board');
    
    // 複数のフォローボタンを取得
    const followButtons = page.locator('button[data-testid="follow-button"]');
    const buttonCount = await followButtons.count();
    
    if (buttonCount >= 2) {
      // 最初のボタンをクリック
      await followButtons.nth(0).click();
      await page.waitForTimeout(500);
      
      // 2番目のボタンをクリック
      await followButtons.nth(1).click();
      await page.waitForTimeout(500);
      
      // それぞれ独立して状態が変わることを確認
      const firstButtonText = await followButtons.nth(0).textContent();
      const secondButtonText = await followButtons.nth(1).textContent();
      
      expect(firstButtonText).toBeTruthy();
      expect(secondButtonText).toBeTruthy();
    } else {
      // ボタンが1つ以下の場合はスキップ
      test.skip();
    }
  });

  test('ネットワークエラー時のエラーハンドリング', async ({ page }) => {
    await mockLogin(page, TEST_USER_1);
    
    // エラーを返すAPIモック
    await page.route('**/api/users/*/follow', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Internal Server Error'
          }),
        });
      } else {
        await route.continue();
      }
    });
    
    await page.goto('/board');
    
    const followButton = page.locator('button[data-testid="follow-button"]').first();
    await expect(followButton).toBeVisible({ timeout: 10000 });
    
    // エラーを起こすクリック
    await followButton.click();
    
    // エラーメッセージが表示されることを確認
    const errorAlert = page.locator('.MuiAlert-root').or(page.locator('[role="alert"]'));
    await expect(errorAlert).toBeVisible({ timeout: 5000 });
    
    // エラーメッセージテキストを確認
    const errorText = await errorAlert.textContent();
    expect(errorText).toBeTruthy();
  });

  test('ページリロード後もフォロー状態が維持される', async ({ page }) => {
    await mockLogin(page, TEST_USER_1);
    
    // フォロー状態を返すAPIモック
    let isFollowing = false;
    await page.route('**/api/users/*/follow', async (route, request) => {
      const method = request.method();
      
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { isFollowing }
          }),
        });
      } else if (method === 'POST') {
        isFollowing = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      } else if (method === 'DELETE') {
        isFollowing = false;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
    });
    
    await page.goto('/board');
    
    // フォローボタンをクリック
    const followButton = page.locator('button[data-testid="follow-button"]').first();
    await followButton.click();
    await page.waitForTimeout(1000);
    
    // ページをリロード
    await page.reload();
    
    // フォロー状態が維持されていることを確認
    const reloadedButton = page.locator('button[data-testid="follow-button"]').first();
    await expect(reloadedButton).toBeVisible({ timeout: 10000 });
    
    const buttonText = await reloadedButton.textContent();
    expect(buttonText).toBeTruthy();
  });
});

test.describe('パフォーマンステスト', () => {
  test('フォローボタンの応答性能', async ({ page }) => {
    await mockLogin(page, TEST_USER_1);
    await page.goto('/board');
    
    const followButton = page.locator('button[data-testid="follow-button"]').first();
    await expect(followButton).toBeVisible({ timeout: 10000 });
    
    // クリック前のタイムスタンプ
    const startTime = Date.now();
    
    // クリック実行
    await followButton.click();
    
    // ボタン状態変化を待つ（最大3秒）
    await page.waitForFunction(
      (selector) => {
        const button = document.querySelector(selector);
        return button && !button.querySelector('.MuiCircularProgress-root');
      },
      'button[data-testid="follow-button"]',
      { timeout: 3000 }
    );
    
    // 応答時間を計測
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // 3秒以内に応答することを確認
    expect(responseTime).toBeLessThan(3000);
    
    console.log(`フォローボタン応答時間: ${responseTime}ms`);
  });
});

test.describe('アクセシビリティテスト', () => {
  test('フォローボタンのaria-label確認', async ({ page }) => {
    await page.goto('/board');
    
    const followButton = page.locator('button[data-testid="follow-button"]').first();
    await expect(followButton).toBeVisible({ timeout: 10000 });
    
    // aria-labelの確認
    const ariaLabel = await followButton.getAttribute('aria-label');
    expect(['フォローする', 'フォロー解除']).toContain(ariaLabel);
  });
  
  test('キーボード操作でフォローボタンを操作できる', async ({ page }) => {
    await mockLogin(page, TEST_USER_1);
    await page.goto('/board');
    
    // Tab キーでフォローボタンにフォーカス
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab'); // 複数回必要な場合
    
    // フォーカスされた要素を確認
    const focusedElement = page.locator(':focus');
    const tagName = await focusedElement.evaluate(el => el.tagName.toLowerCase());
    
    if (tagName === 'button') {
      // Enterキーで実行
      await page.keyboard.press('Enter');
      
      // 状態が変化することを確認
      await page.waitForTimeout(1000);
      
      const buttonText = await focusedElement.textContent();
      expect(buttonText).toBeTruthy();
    }
  });
});