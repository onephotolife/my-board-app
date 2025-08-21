/**
 * アクセシビリティテスト（WCAG 2.1 AA準拠）
 * axe-coreを使用した自動チェック
 */

const { test, expect } = require('@playwright/test');
const { injectAxe, checkA11y, getViolations } = require('axe-playwright');

// テスト設定
test.use({
  baseURL: 'https://board.blankbrainai.com',
  viewport: { width: 1280, height: 720 },
});

// テスト対象ページ
const PAGES_TO_TEST = [
  { name: 'トップページ', path: '/' },
  { name: 'ログインページ', path: '/login' },
  { name: '登録ページ', path: '/register' },
  { name: '投稿一覧', path: '/posts' },
  { name: 'プロフィール', path: '/profile' },
];

// WCAG 2.1 AA基準
const AXE_OPTIONS = {
  runOnly: {
    type: 'tag',
    values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
  },
  rules: {
    // 必要に応じて特定のルールを無効化
    'color-contrast': { enabled: true },
    'valid-lang': { enabled: true },
    'duplicate-id': { enabled: true },
  },
};

test.describe('WCAG 2.1 AA準拠テスト', () => {
  // 各ページのアクセシビリティテスト
  for (const page of PAGES_TO_TEST) {
    test(`${page.name}のアクセシビリティ`, async ({ page: browserPage }) => {
      // ページにアクセス
      await browserPage.goto(page.path);
      await browserPage.waitForLoadState('networkidle');
      
      // axe-coreを注入
      await injectAxe(browserPage);
      
      // アクセシビリティチェック実行
      const violations = await getViolations(browserPage, null, AXE_OPTIONS);
      
      // 違反の詳細を記録
      if (violations.length > 0) {
        console.log(`\n=== ${page.name}の違反項目 ===`);
        violations.forEach((violation, index) => {
          console.log(`\n違反 ${index + 1}: ${violation.id}`);
          console.log(`説明: ${violation.description}`);
          console.log(`影響度: ${violation.impact}`);
          console.log(`要素数: ${violation.nodes.length}`);
          
          violation.nodes.forEach((node, nodeIndex) => {
            console.log(`  要素 ${nodeIndex + 1}: ${node.target}`);
            console.log(`  問題: ${node.failureSummary}`);
          });
        });
      }
      
      // スクリーンショット保存
      await browserPage.screenshot({ 
        path: `test-results/a11y-${page.name.replace(/[^a-zA-Z0-9]/g, '-')}.png`,
        fullPage: true 
      });
      
      // 違反がないことを確認
      expect(violations.length, `${page.name}に${violations.length}件のアクセシビリティ違反`).toBe(0);
    });
  }
});

test.describe('キーボードナビゲーション', () => {
  test('Tabキーでのフォーカス移動', async ({ page }) => {
    await page.goto('/');
    
    // フォーカス可能な要素を取得
    const focusableElements = await page.$$eval(
      'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
      elements => elements.map(el => ({
        tag: el.tagName,
        text: el.textContent?.trim().substring(0, 50),
        tabIndex: el.tabIndex,
      }))
    );
    
    console.log(`フォーカス可能な要素数: ${focusableElements.length}`);
    
    // Tabキーでの移動をシミュレート
    for (let i = 0; i < Math.min(focusableElements.length, 10); i++) {
      await page.keyboard.press('Tab');
      
      // 現在のフォーカス要素を取得
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          tag: el?.tagName,
          id: el?.id,
          class: el?.className,
          text: el?.textContent?.trim().substring(0, 50),
        };
      });
      
      console.log(`フォーカス ${i + 1}:`, focusedElement);
      
      // フォーカスが visible であることを確認
      const isVisible = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      
      expect(isVisible).toBeTruthy();
    }
  });
  
  test('Escキーでモーダルを閉じる', async ({ page }) => {
    await page.goto('/');
    
    // モーダルを開くボタンを探す（例: ログインボタン）
    const modalTrigger = page.locator('button:has-text("ログイン")').first();
    
    if (await modalTrigger.isVisible()) {
      await modalTrigger.click();
      
      // モーダルが開いたことを確認
      await page.waitForSelector('.modal, [role="dialog"]', { timeout: 5000 });
      
      // Escキーを押す
      await page.keyboard.press('Escape');
      
      // モーダルが閉じたことを確認
      await expect(page.locator('.modal, [role="dialog"]')).not.toBeVisible();
    }
  });
});

test.describe('スクリーンリーダー対応', () => {
  test('ARIA属性の確認', async ({ page }) => {
    await page.goto('/');
    
    // ARIA landmark roles の確認
    const landmarks = await page.$$eval('[role]', elements => 
      elements.map(el => ({
        role: el.getAttribute('role'),
        label: el.getAttribute('aria-label') || el.getAttribute('aria-labelledby'),
      }))
    );
    
    console.log('ARIAランドマーク:', landmarks);
    
    // 必須のランドマークが存在することを確認
    const roles = landmarks.map(l => l.role);
    expect(roles).toContain('navigation');
    expect(roles).toContain('main');
  });
  
  test('画像の代替テキスト', async ({ page }) => {
    await page.goto('/');
    
    // すべての画像を取得
    const images = await page.$$eval('img', imgs => 
      imgs.map(img => ({
        src: img.src,
        alt: img.alt,
        decorative: img.getAttribute('role') === 'presentation',
      }))
    );
    
    console.log(`画像数: ${images.length}`);
    
    // 装飾的でない画像にはaltテキストが必要
    images.forEach(img => {
      if (!img.decorative) {
        expect(img.alt, `画像 ${img.src} にaltテキストが必要`).toBeTruthy();
      }
    });
  });
  
  test('フォームラベルの関連付け', async ({ page }) => {
    await page.goto('/login');
    
    // フォーム要素を取得
    const formElements = await page.$$eval('input, select, textarea', elements =>
      elements.map(el => ({
        type: el.type,
        id: el.id,
        name: el.name,
        hasLabel: !!el.labels?.length || !!el.getAttribute('aria-label'),
        required: el.required,
      }))
    );
    
    console.log('フォーム要素:', formElements);
    
    // すべてのフォーム要素にラベルがあることを確認
    formElements.forEach(element => {
      if (element.type !== 'hidden' && element.type !== 'submit') {
        expect(element.hasLabel, `フォーム要素 ${element.name || element.id} にラベルが必要`).toBeTruthy();
      }
    });
  });
});

test.describe('カラーコントラスト', () => {
  test('テキストのコントラスト比', async ({ page }) => {
    await page.goto('/');
    
    // axe-coreでカラーコントラストをチェック
    await injectAxe(page);
    
    const colorContrastViolations = await getViolations(page, null, {
      runOnly: {
        type: 'rule',
        values: ['color-contrast'],
      },
    });
    
    if (colorContrastViolations.length > 0) {
      console.log('\n=== カラーコントラスト違反 ===');
      colorContrastViolations[0].nodes.forEach(node => {
        console.log(`要素: ${node.target}`);
        console.log(`前景色: ${node.any[0]?.data?.fgColor}`);
        console.log(`背景色: ${node.any[0]?.data?.bgColor}`);
        console.log(`コントラスト比: ${node.any[0]?.data?.contrastRatio}`);
        console.log(`必要な比率: ${node.any[0]?.data?.expectedContrastRatio}`);
      });
    }
    
    expect(colorContrastViolations.length).toBe(0);
  });
});

test.describe('レスポンシブデザインとズーム', () => {
  const viewports = [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1920, height: 1080 },
  ];
  
  viewports.forEach(viewport => {
    test(`${viewport.name}でのレイアウト`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/');
      
      // 水平スクロールが発生していないことを確認
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      
      expect(hasHorizontalScroll, `${viewport.name}で水平スクロールが発生`).toBeFalsy();
      
      // タッチターゲットのサイズ確認（モバイルのみ）
      if (viewport.name === 'Mobile') {
        const touchTargets = await page.$$eval('a, button', elements =>
          elements.map(el => {
            const rect = el.getBoundingClientRect();
            return {
              text: el.textContent?.trim().substring(0, 30),
              width: rect.width,
              height: rect.height,
            };
          })
        );
        
        touchTargets.forEach(target => {
          // WCAG 2.1の最小サイズ要件: 44x44px
          expect(target.width >= 44 || target.height >= 44, 
            `タッチターゲット"${target.text}"が小さすぎる (${target.width}x${target.height}px)`
          ).toBeTruthy();
        });
      }
    });
  });
  
  test('200%ズームでの表示', async ({ page }) => {
    await page.goto('/');
    
    // CSSでズームをシミュレート
    await page.evaluate(() => {
      document.documentElement.style.zoom = '2';
    });
    
    // テキストが切れていないことを確認
    const overflowElements = await page.$$eval('*', elements =>
      elements.filter(el => {
        const styles = window.getComputedStyle(el);
        return styles.overflow === 'hidden' && el.scrollWidth > el.clientWidth;
      }).map(el => ({
        tag: el.tagName,
        class: el.className,
        text: el.textContent?.substring(0, 50),
      }))
    );
    
    console.log('オーバーフロー要素:', overflowElements);
    
    expect(overflowElements.length, 'ズーム時にテキストが切れる要素がある').toBe(0);
  });
});

test.describe('エラーメッセージとフィードバック', () => {
  test('フォームバリデーションメッセージ', async ({ page }) => {
    await page.goto('/login');
    
    // 空のフォームを送信
    await page.click('button[type="submit"]');
    
    // エラーメッセージを待つ
    await page.waitForSelector('.error, [role="alert"]', { timeout: 5000 });
    
    // エラーメッセージのアクセシビリティ確認
    const errorMessages = await page.$$eval('.error, [role="alert"]', elements =>
      elements.map(el => ({
        text: el.textContent,
        role: el.getAttribute('role'),
        ariaLive: el.getAttribute('aria-live'),
      }))
    );
    
    console.log('エラーメッセージ:', errorMessages);
    
    errorMessages.forEach(msg => {
      // エラーメッセージにはrole="alert"またはaria-live属性が必要
      expect(msg.role === 'alert' || msg.ariaLive, 
        'エラーメッセージにスクリーンリーダー対応が必要'
      ).toBeTruthy();
    });
  });
});

// テスト結果のサマリー生成
test.afterAll(async () => {
  console.log('\n=== アクセシビリティテスト完了 ===');
  console.log('WCAG 2.1 AA準拠チェックが完了しました。');
  console.log('詳細な結果はtest-resultsディレクトリを確認してください。');
});