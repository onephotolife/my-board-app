import { test, expect } from '@playwright/test';

test.describe('Debug Production Content Display', () => {
  test.beforeEach(async ({ page }) => {
    // 本番環境のサインインページにアクセス
    await page.goto('https://board.blankbrainai.com/auth/signin');
    
    // ログイン
    await page.fill('input[type="email"]', 'one.photolife+2@gmail.com');
    await page.fill('input[type="password"]', '?@thc123THC@?');
    await page.click('button:has-text("ログイン")');
    
    // ダッシュボードへのリダイレクトを待つ
    await page.waitForURL('**/dashboard', { timeout: 30000 });
  });

  test('Check console errors and Box component rendering', async ({ page }) => {
    // コンソールエラーを記録
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // ダッシュボードページをチェック
    await page.goto('https://board.blankbrainai.com/dashboard');
    await page.waitForTimeout(3000);

    // セッション状態をチェック
    const sessionState = await page.evaluate(() => {
      return {
        hasNextAuth: typeof (window as any).next !== 'undefined',
        pathname: window.location.pathname,
        localStorage: Object.keys(localStorage),
        sessionStorage: Object.keys(sessionStorage)
      };
    });
    console.log('Session state:', sessionState);

    // メインコンテンツBoxの存在と状態をチェック
    const mainBoxInfo = await page.evaluate(() => {
      const boxes = document.querySelectorAll('.MuiBox-root');
      const mainBox = Array.from(boxes).find(box => {
        const styles = window.getComputedStyle(box as HTMLElement);
        return styles.marginLeft === '280px' || styles.marginLeft.includes('280');
      }) as HTMLElement;

      if (!mainBox) {
        return { found: false };
      }

      const computed = window.getComputedStyle(mainBox);
      const rect = mainBox.getBoundingClientRect();
      
      return {
        found: true,
        display: computed.display,
        visibility: computed.visibility,
        opacity: computed.opacity,
        overflow: computed.overflow,
        position: computed.position,
        zIndex: computed.zIndex,
        width: rect.width,
        height: rect.height,
        marginLeft: computed.marginLeft,
        innerHTML: mainBox.innerHTML.substring(0, 200),
        childrenCount: mainBox.children.length,
        textContent: mainBox.textContent?.substring(0, 100)
      };
    });
    console.log('Main Box info:', mainBoxInfo);

    // サイドバーの情報も取得
    const sidebarInfo = await page.evaluate(() => {
      const sidebar = document.querySelector('[data-testid="sidebar"]') || 
                      Array.from(document.querySelectorAll('.MuiBox-root')).find(box => {
                        const styles = window.getComputedStyle(box as HTMLElement);
                        return styles.position === 'fixed' && styles.width === '280px';
                      });
      
      if (!sidebar) return { found: false };
      
      const computed = window.getComputedStyle(sidebar as HTMLElement);
      return {
        found: true,
        display: computed.display,
        visibility: computed.visibility,
        position: computed.position,
        width: computed.width
      };
    });
    console.log('Sidebar info:', sidebarInfo);

    // React DevToolsから情報を取得（可能な場合）
    const reactInfo = await page.evaluate(() => {
      try {
        const reactRoot = document.getElementById('__next');
        if (!reactRoot) return { hasNext: false };
        
        // React Fiber情報を取得
        const keys = Object.keys(reactRoot);
        const fiberKey = keys.find(key => key.startsWith('__react'));
        
        return {
          hasNext: true,
          hasFiber: !!fiberKey,
          bodyChildren: document.body.children.length,
          nextChildren: reactRoot?.children.length
        };
      } catch (e) {
        return { error: e.toString() };
      }
    });
    console.log('React info:', reactInfo);

    // ページ全体のHTMLの一部を取得
    const pageStructure = await page.evaluate(() => {
      const body = document.body;
      const structure = {
        bodyClasses: body.className,
        mainElements: Array.from(body.querySelectorAll('main, [role="main"], .MuiContainer-root')).map(el => ({
          tag: el.tagName,
          className: el.className,
          hasContent: el.textContent?.trim().length > 0
        }))
      };
      return structure;
    });
    console.log('Page structure:', pageStructure);

    // スクリーンショットを保存
    await page.screenshot({ 
      path: 'test-results/debug-dashboard-content.png',
      fullPage: true 
    });

    // コンソールエラーを出力
    if (consoleErrors.length > 0) {
      console.log('Console errors found:', consoleErrors);
    }

    // 他のページもチェック
    for (const path of ['/profile', '/my-posts', '/posts/new']) {
      await page.goto(`https://board.blankbrainai.com${path}`);
      await page.waitForTimeout(2000);
      
      const pageInfo = await page.evaluate((p) => {
        const mainBox = Array.from(document.querySelectorAll('.MuiBox-root')).find(box => {
          const styles = window.getComputedStyle(box as HTMLElement);
          return styles.marginLeft === '280px' || styles.marginLeft.includes('280');
        }) as HTMLElement;
        
        return {
          path: p,
          hasMainBox: !!mainBox,
          mainBoxContent: mainBox?.textContent?.substring(0, 50),
          bodyText: document.body.textContent?.substring(0, 100)
        };
      }, path);
      
      console.log(`Page ${path} info:`, pageInfo);
      await page.screenshot({ 
        path: `test-results/debug${path.replace(/\//g, '-')}-content.png`,
        fullPage: true 
      });
    }
  });
});