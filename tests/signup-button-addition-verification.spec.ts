import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { width: 1920, height: 1080, name: 'Desktop Full HD' },
  { width: 1366, height: 768, name: 'Laptop' },
  { width: 768, height: 1024, name: 'Tablet' },
  { width: 375, height: 667, name: 'Mobile' }
];

test.describe('新規登録ボタン追加検証 - 100%完全テスト', () => {
  
  // 1. ボタンの存在確認
  test('1. 新規登録ボタンが存在する', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Wait for session loading to complete
    await page.waitForLoadState('networkidle');
    
    // Wait for either the loading spinner to disappear or auth buttons to appear
    await page.waitForFunction(() => {
      const spinner = document.querySelector('[role="progressbar"]');
      const authButtons = document.querySelector('a[href="/auth/signin"], a[href="/auth/signup"]');
      return !spinner || authButtons;
    }, { timeout: 30000 });
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'tests/screenshots/debug-after-load.png', fullPage: true });
    
    const signupButton = page.locator('a[href="/auth/signup"]').first();
    await expect(signupButton).toBeVisible({ timeout: 10000 });
    await expect(signupButton).toHaveText('新規登録');
  });

  // 2. ボタンの配置確認
  test('2. ログインボタンの横に配置されている', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    const loginButton = page.locator('a[href="/auth/signin"]').first();
    const signupButton = page.locator('a[href="/auth/signup"]').first();
    
    const loginBox = await loginButton.boundingBox();
    const signupBox = await signupButton.boundingBox();
    
    expect(loginBox).toBeTruthy();
    expect(signupBox).toBeTruthy();
    
    if (loginBox && signupBox) {
      // 横並びの確認（Y座標がほぼ同じ）
      expect(Math.abs(loginBox.y - signupBox.y)).toBeLessThan(5);
      
      // ログインボタンが左側にある
      expect(loginBox.x).toBeLessThan(signupBox.x);
    }
  });

  // 3. スタイル検証
  test('3. 適切なスタイルが適用されている', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    const signupButton = page.locator('a[href="/auth/signup"]').first();
    
    // スタイル属性の確認
    const styles = await signupButton.evaluate(el => {
      const computed = window.getComputedStyle(el);
      return {
        display: computed.display,
        padding: computed.padding,
        fontSize: computed.fontSize,
        fontWeight: computed.fontWeight,
        borderRadius: computed.borderRadius,
        cursor: computed.cursor,
        textDecoration: computed.textDecoration,
        backgroundColor: computed.backgroundColor,
        color: computed.color,
        border: computed.border
      };
    });
    
    expect(styles.display).not.toBe('none');
    expect(styles.cursor).toBe('pointer');
    expect(styles.textDecoration).toContain('none');
    expect(styles.backgroundColor).toBeTruthy();
    expect(styles.color).toBeTruthy();
  });

  // 4. クリック動作確認
  test('4. クリックで新規登録ページへ遷移する', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    const signupButton = page.locator('a[href="/auth/signup"]').first();
    await signupButton.click();
    
    await expect(page).toHaveURL(/.*\/auth\/signup/);
    await expect(page.locator('h1')).toContainText('新規登録');
  });

  // 5. レスポンシブ対応確認
  for (const viewport of VIEWPORTS) {
    test(`5. ${viewport.name} (${viewport.width}x${viewport.height}) で正しく表示される`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('http://localhost:3000');
      
      const signupButton = page.locator('a[href="/auth/signup"]').first();
      await expect(signupButton).toBeVisible();
      
      // ボタンの位置と可視性をチェック
      const boundingBox = await signupButton.boundingBox();
      expect(boundingBox).toBeTruthy();
      expect(boundingBox!.width).toBeGreaterThan(0);
      expect(boundingBox!.height).toBeGreaterThan(0);
      
      // スクリーンショット保存
      await page.screenshot({
        path: `tests/screenshots/signup-button-${viewport.width}x${viewport.height}.png`,
        fullPage: false
      });
    });
  }

  // 6. ホバー効果確認
  test('6. ホバー効果が動作する', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    const signupButton = page.locator('a[href="/auth/signup"]').first();
    
    // ホバー前のスタイル取得
    const beforeHover = await signupButton.evaluate(el => {
      const computed = window.getComputedStyle(el);
      return {
        backgroundColor: computed.backgroundColor,
        transform: computed.transform,
        boxShadow: computed.boxShadow,
        borderColor: computed.borderColor
      };
    });
    
    // ホバー
    await signupButton.hover();
    await page.waitForTimeout(300); // トランジション待機
    
    // ホバー後のスタイル取得
    const afterHover = await signupButton.evaluate(el => {
      const computed = window.getComputedStyle(el);
      return {
        backgroundColor: computed.backgroundColor,
        transform: computed.transform,
        boxShadow: computed.boxShadow,
        borderColor: computed.borderColor
      };
    });
    
    // スタイルが変化していることを確認（少なくとも一つは変わるはず）
    const hasChanged = 
      beforeHover.backgroundColor !== afterHover.backgroundColor ||
      beforeHover.transform !== afterHover.transform ||
      beforeHover.boxShadow !== afterHover.boxShadow ||
      beforeHover.borderColor !== afterHover.borderColor;
    
    expect(hasChanged).toBeTruthy();
  });

  // 7. アクセシビリティ確認
  test('7. アクセシビリティ要件を満たす', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    const signupButton = page.locator('a[href="/auth/signup"]').first();
    
    // タブキーでフォーカス可能か確認
    await page.keyboard.press('Tab');
    let focusedElement = await page.locator(':focus').textContent();
    
    // ログインボタンかもしれないので、さらにタブを押す
    if (focusedElement !== '新規登録') {
      await page.keyboard.press('Tab');
      focusedElement = await page.locator(':focus').textContent();
    }
    
    expect(['ログイン', '新規登録']).toContain(focusedElement);
    
    // Enterキーで実行できるか
    const loginButton = page.locator('a[href="/auth/signin"]').first();
    await loginButton.focus();
    await page.keyboard.press('Tab');
    
    // 新規登録ボタンにフォーカスが当たっているか確認
    const isFocused = await signupButton.evaluate(el => 
      document.activeElement === el
    );
    
    if (isFocused) {
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/.*\/auth\/signup/);
    }
    
    // aria属性やroleの確認
    const a11y = await signupButton.evaluate(el => ({
      role: el.getAttribute('role'),
      tabIndex: el.tabIndex,
      href: el.getAttribute('href'),
      ariaCurrent: el.getAttribute('aria-current'),
      ariaLabel: el.getAttribute('aria-label')
    }));
    
    expect(a11y.href).toBe('/auth/signup');
    expect(a11y.tabIndex).toBeGreaterThanOrEqual(0);
  });

  // 8. 両ボタンの整合性確認
  test('8. ログインボタンと新規登録ボタンの整合性', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    const loginButton = page.locator('a[href="/auth/signin"]').first();
    const signupButton = page.locator('a[href="/auth/signup"]').first();
    
    const loginBox = await loginButton.boundingBox();
    const signupBox = await signupButton.boundingBox();
    
    expect(loginBox).toBeTruthy();
    expect(signupBox).toBeTruthy();
    
    if (loginBox && signupBox) {
      // 高さがほぼ同じ
      expect(Math.abs(loginBox.height - signupBox.height)).toBeLessThan(5);
      
      // 適切な間隔（20px gap設定されている）
      const gap = signupBox.x - (loginBox.x + loginBox.width);
      expect(gap).toBeGreaterThan(15);
      expect(gap).toBeLessThan(30);
    }
    
    // 両方のボタンが同じコンテナに属している
    const loginContainer = await loginButton.evaluate(el => el.parentElement);
    const signupContainer = await signupButton.evaluate(el => el.parentElement);
    
    expect(loginContainer).toEqual(signupContainer);
  });

  // 9. パフォーマンステスト
  test('9. ページ読み込みパフォーマンス', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(5000); // 5秒以内
    
    // First Contentful Paint
    const fcp = await page.evaluate(() => {
      const entries = performance.getEntriesByType('paint') as PerformanceEntry[];
      const entry = entries.find(e => e.name === 'first-contentful-paint');
      return entry ? entry.startTime : null;
    });
    
    if (fcp !== null) {
      expect(fcp).toBeLessThan(2000); // 2秒以内
    }
  });

  // 10. 統合テスト
  test('10. 完全統合テスト - すべての要件確認', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    const results = {
      buttonExists: false,
      correctPosition: false,
      clickable: false,
      responsive: false,
      styled: false,
      accessible: false,
      performant: false
    };
    
    // ボタン存在確認
    const signupButton = page.locator('a[href="/auth/signup"]').first();
    results.buttonExists = await signupButton.isVisible();
    
    // 位置確認
    const loginButton = page.locator('a[href="/auth/signin"]').first();
    const loginBox = await loginButton.boundingBox();
    const signupBox = await signupButton.boundingBox();
    results.correctPosition = loginBox && signupBox && 
                             loginBox.x < signupBox.x &&
                             Math.abs(loginBox.y - signupBox.y) < 5;
    
    // クリック可能確認
    results.clickable = await signupButton.isEnabled();
    
    // レスポンシブ確認（モバイル）
    await page.setViewportSize({ width: 375, height: 667 });
    results.responsive = await signupButton.isVisible();
    await page.setViewportSize({ width: 1920, height: 1080 }); // 元に戻す
    
    // スタイル確認
    const styles = await signupButton.evaluate(el => {
      const computed = window.getComputedStyle(el);
      return {
        display: computed.display !== 'none',
        visibility: computed.visibility !== 'hidden',
        cursor: computed.cursor === 'pointer'
      };
    });
    results.styled = styles.display && styles.visibility && styles.cursor;
    
    // アクセシビリティ確認
    const href = await signupButton.getAttribute('href');
    const tabIndex = await signupButton.getAttribute('tabindex');
    results.accessible = href === '/auth/signup' && (tabIndex === null || parseInt(tabIndex) >= 0);
    
    // パフォーマンス確認（簡易）
    const startTime = Date.now();
    await page.reload({ waitUntil: 'networkidle' });
    const reloadTime = Date.now() - startTime;
    results.performant = reloadTime < 3000;
    
    // すべての項目が成功
    console.log('統合テスト結果:', results);
    
    Object.entries(results).forEach(([key, result]) => {
      expect(result).toBe(true);
    });
  });

  // 11. 視覚的回帰テスト
  test('11. 視覚的回帰テスト - ボタン表示の確認', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // AuthButtonsコンポーネント全体のスクリーンショット
    const authButtonsContainer = page.locator('div').filter({ has: page.locator('a[href="/auth/signin"]') });
    
    await expect(authButtonsContainer).toHaveScreenshot('auth-buttons-with-signup.png');
    
    // ホバー状態のスクリーンショット
    const signupButton = page.locator('a[href="/auth/signup"]').first();
    await signupButton.hover();
    await page.waitForTimeout(300);
    
    await expect(authButtonsContainer).toHaveScreenshot('auth-buttons-signup-hover.png');
  });

  // 12. クロスブラウザ互換性テスト（Chrome用）
  test('12. Chrome での動作確認', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    const signupButton = page.locator('a[href="/auth/signup"]').first();
    
    // Chrome特有のスタイル確認
    const chromeStyles = await signupButton.evaluate(el => {
      const computed = window.getComputedStyle(el);
      return {
        webkitAppearance: computed.webkitAppearance,
        webkitTransition: computed.webkitTransition,
        display: computed.display,
        position: computed.position
      };
    });
    
    expect(chromeStyles.display).toBe('inline-block');
    
    // Chrome でのクリック動作
    await signupButton.click();
    await expect(page).toHaveURL(/.*\/auth\/signup/);
    
    // ブラウザの戻るボタン動作
    await page.goBack();
    await expect(signupButton).toBeVisible();
  });
});

// テスト後のクリーンアップとレポート生成
test.afterAll(async () => {
  console.log('✅ 新規登録ボタン追加の100%検証テストが完了しました');
  console.log('📊 テスト結果はplaywright-reportフォルダに保存されます');
  console.log('📸 スクリーンショットはtests/screenshotsフォルダに保存されます');
});