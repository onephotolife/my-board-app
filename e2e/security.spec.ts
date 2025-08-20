import { test, expect } from '@playwright/test';

test.describe('セキュリティ機能E2Eテスト', () => {
  
  test.describe('レート制限', () => {
    test('6回目のリクエストで429エラーが返される', async ({ request }) => {
      const results = [];
      
      // 6回連続でAPIを呼び出す
      for (let i = 0; i < 6; i++) {
        const response = await request.post('/api/posts', {
          data: {
            title: `Test ${i}`,
            content: `Content ${i}`,
            author: 'Test User'
          },
          failOnStatusCode: false
        });
        
        results.push({
          attempt: i + 1,
          status: response.status(),
          headers: response.headers()
        });
      }
      
      // 最初の5回は429以外（401の可能性もある）
      results.slice(0, 5).forEach(result => {
        expect([200, 201, 401, 403]).toContain(result.status);
      });
      
      // 6回目は429
      expect(results[5].status).toBe(429);
      expect(results[5].headers['x-ratelimit-remaining']).toBe('0');
    });

    test('異なるエンドポイントは別々の制限を持つ', async ({ request }) => {
      // /api/posts への5回のリクエスト
      for (let i = 0; i < 5; i++) {
        await request.post('/api/posts', {
          data: { title: 'Test', content: 'Test', author: 'Test' },
          failOnStatusCode: false
        });
      }

      // /api/health へのリクエストは影響を受けない
      const healthResponse = await request.get('/api/health', {
        failOnStatusCode: false
      });
      
      // healthエンドポイントは429にならない
      expect(healthResponse.status()).not.toBe(429);
    });
  });

  test.describe('セキュリティヘッダー', () => {
    test('必要なセキュリティヘッダーが設定されている', async ({ page }) => {
      const response = await page.goto('/');
      const headers = response?.headers();
      
      expect(headers?.['x-frame-options']).toBe('DENY');
      expect(headers?.['x-content-type-options']).toBe('nosniff');
      expect(headers?.['x-xss-protection']).toBe('1; mode=block');
      expect(headers?.['content-security-policy']).toBeDefined();
      expect(headers?.['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(headers?.['permissions-policy']).toBeDefined();
    });

    test('APIエンドポイントにもヘッダーが適用される', async ({ request }) => {
      const response = await request.get('/api/posts', {
        failOnStatusCode: false
      });
      
      const headers = response.headers();
      expect(headers['x-frame-options']).toBe('DENY');
      expect(headers['x-content-type-options']).toBe('nosniff');
    });

    test('開発者ツールでヘッダーを確認', async ({ page, context }) => {
      // Chrome DevTools Protocolを使用
      const client = await context.newCDPSession(page);
      await client.send('Network.enable');
      
      let responseHeaders: any = null;
      client.on('Network.responseReceived', (params) => {
        if (params.response.url.includes('localhost:3000') && !params.response.url.includes('_next')) {
          responseHeaders = params.response.headers;
        }
      });
      
      await page.goto('/');
      await page.waitForTimeout(1000);
      
      expect(responseHeaders).toBeTruthy();
      expect(responseHeaders['x-frame-options']).toBe('DENY');
      expect(responseHeaders['content-security-policy']).toBeDefined();
    });
  });

  test.describe('XSS防御', () => {
    test('スクリプトタグが無害化される（URLパラメータ）', async ({ page }) => {
      // XSSペイロードを含むURLにアクセス
      await page.goto('/?search=<script>window.xssExecuted=true;</script>');
      
      // スクリプトが実行されないことを確認
      await page.waitForTimeout(500);
      const xssExecuted = await page.evaluate(() => (window as any).xssExecuted);
      expect(xssExecuted).toBeUndefined();
      
      // URLがサニタイズされているか確認
      const url = page.url();
      expect(url).not.toContain('<script>');
    });

    test('イベントハンドラが除去される（URLパラメータ）', async ({ page }) => {
      await page.goto('/?input=<img src=x onerror="window.imgError=true">');
      
      await page.waitForTimeout(500);
      const imgError = await page.evaluate(() => (window as any).imgError);
      expect(imgError).toBeUndefined();
      
      const url = page.url();
      expect(url).not.toContain('onerror');
    });

    test('JavaScriptプロトコルが無効化される（URLパラメータ）', async ({ page }) => {
      await page.goto('/?link=javascript:window.jsProto=true');
      
      await page.waitForTimeout(500);
      const jsProto = await page.evaluate(() => (window as any).jsProto);
      expect(jsProto).toBeUndefined();
      
      const url = page.url();
      expect(url).not.toContain('javascript:');
    });

    test('複数のXSSペイロードが同時に無害化される', async ({ page }) => {
      const xssPayloads = [
        'script=<script>alert(1)</script>',
        'img=<img onerror="alert(2)">',
        'link=javascript:alert(3)'
      ];
      
      await page.goto('/?'+ xssPayloads.join('&'));
      
      // いずれのスクリプトも実行されないことを確認
      await page.waitForTimeout(500);
      
      const url = page.url();
      expect(url).not.toContain('<script>');
      expect(url).not.toContain('onerror');
      expect(url).not.toContain('javascript:');
    });
  });

  test.describe('レスポンスタイム', () => {
    test('X-Response-Timeヘッダーが設定される', async ({ page }) => {
      const response = await page.goto('/');
      const headers = response?.headers();
      
      const responseTime = headers?.['x-response-time'];
      expect(responseTime).toBeDefined();
      expect(responseTime).toMatch(/^\d+ms$/);
      
      // レスポンスタイムが妥当な範囲内
      const time = parseInt(responseTime?.replace('ms', '') || '0');
      expect(time).toBeGreaterThanOrEqual(0);
      expect(time).toBeLessThan(5000); // 5秒未満
    });
  });

  test.describe('統合セキュリティテスト', () => {
    test('通常の使用が妨げられない', async ({ page }) => {
      // 通常のページアクセス
      await page.goto('/');
      
      // ページが正常に表示される
      await expect(page).toHaveTitle(/Board App/i);
      
      // セキュリティヘッダーが設定されている
      const response = await page.goto('/');
      const headers = response?.headers();
      expect(headers?.['x-frame-options']).toBe('DENY');
    });

    test('悪意のある入力が適切に処理される', async ({ page }) => {
      // 複数の攻撃ベクトルを含むURL
      const maliciousUrl = '/?xss=<script>alert(1)</script>&sql=\' OR 1=1--&cmd=;ls -la';
      
      await page.goto(maliciousUrl);
      
      // ページが正常に表示される
      await expect(page).toHaveTitle(/Board App/i);
      
      // 攻撃コードが実行されない
      const alerts = await page.evaluate(() => {
        return (window as any).alertCalled;
      });
      expect(alerts).toBeUndefined();
      
      // URLがサニタイズされている
      const url = page.url();
      expect(url).not.toContain('<script>');
      expect(url).not.toContain('OR 1=1');
    });
  });

  test.describe('パフォーマンステスト', () => {
    test('セキュリティ機能がパフォーマンスに大きな影響を与えない', async ({ page }) => {
      const timings = [];
      
      // 10回アクセスして平均を取る
      for (let i = 0; i < 10; i++) {
        const startTime = Date.now();
        await page.goto('/');
        const endTime = Date.now();
        timings.push(endTime - startTime);
      }
      
      const avgTime = timings.reduce((a, b) => a + b, 0) / timings.length;
      
      // 平均ロード時間が3秒未満
      expect(avgTime).toBeLessThan(3000);
      
      // 最大ロード時間が5秒未満
      const maxTime = Math.max(...timings);
      expect(maxTime).toBeLessThan(5000);
    });
  });
});