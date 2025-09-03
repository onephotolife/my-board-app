/**
 * モバイル固有通知テスト
 * STRICT120準拠 - Mobile Web特化
 * 
 * 認証情報：
 * - Email: one.photolife+1@gmail.com
 * - Password: ?@thc123THC@?
 */

import { test, expect, devices } from '@playwright/test';

const VALID_CREDENTIALS = {
  email: 'one.photolife+1@gmail.com',
  password: '?@thc123THC@?'
};

// モバイルデバイス設定
const MOBILE_DEVICES = {
  'iPhone 13': devices['iPhone 13'],
  'iPhone SE': devices['iPhone SE'],
  'Pixel 5': devices['Pixel 5'],
  'Galaxy S21': devices['Galaxy S21']
};

// ネットワーク条件
const NETWORK_CONDITIONS = {
  '3G': {
    offline: false,
    downloadThroughput: 750 * 1024 / 8,
    uploadThroughput: 250 * 1024 / 8,
    latency: 100
  },
  'Slow 3G': {
    offline: false,
    downloadThroughput: 400 * 1024 / 8,
    uploadThroughput: 100 * 1024 / 8,
    latency: 200
  },
  'Offline': {
    offline: true,
    downloadThroughput: 0,
    uploadThroughput: 0,
    latency: 0
  }
};

test.describe('【MOBILE】モバイル固有通知テスト', () => {
  
  test('【TOUCH】スワイプで通知を既読にする', async ({ browser }) => {
    console.log('[TEST] スワイプジェスチャーテスト開始');
    
    const context = await browser.newContext({
      ...MOBILE_DEVICES['iPhone 13'],
      permissions: ['notifications']
    });
    
    const page = await context.newPage();
    
    // ログイン
    await page.goto('/login');
    await page.fill('input[name="email"]', VALID_CREDENTIALS.email);
    await page.fill('input[name="password"]', VALID_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    
    // 通知ページへ
    await page.goto('/notifications');
    await page.waitForSelector('[data-testid="notification-list"]');
    
    // スワイプジェスチャーのシミュレーション
    const notification = await page.locator('[data-testid="notification-item"]').first();
    const box = await notification.boundingBox();
    
    if (box) {
      // 右から左へスワイプ
      await page.mouse.move(box.x + box.width - 10, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + 10, box.y + box.height / 2, { steps: 10 });
      await page.mouse.up();
      
      // 既読マークを確認
      await expect(notification).toHaveAttribute('data-read', 'true');
      console.log('✅ スワイプで既読化成功');
    }
    
    await context.close();
  });

  test('【OFFLINE】オフライン→オンライン同期', async ({ browser }) => {
    console.log('[TEST] オフライン同期テスト開始');
    
    const context = await browser.newContext({
      ...MOBILE_DEVICES['Pixel 5'],
      permissions: ['notifications']
    });
    
    const page = await context.newPage();
    
    // ログイン
    await page.goto('/login');
    await page.fill('input[name="email"]', VALID_CREDENTIALS.email);
    await page.fill('input[name="password"]', VALID_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    
    // オフラインに切り替え
    await context.setOffline(true);
    console.log('[NETWORK] オフラインモード設定');
    
    // 通知ページアクセス（オフライン）
    await page.goto('/notifications', { waitUntil: 'domcontentloaded' });
    
    // キャッシュデータの確認
    const cachedNotifications = await page.locator('[data-testid="cached-notification"]').count();
    console.log(`[CACHE] キャッシュ済み通知: ${cachedNotifications}件`);
    
    // オンラインに復帰
    await context.setOffline(false);
    console.log('[NETWORK] オンラインモード復帰');
    
    // 同期待機
    await page.waitForSelector('[data-testid="sync-complete"]', { timeout: 10000 });
    
    // 新しい通知の確認
    const newNotifications = await page.locator('[data-testid="notification-item"]').count();
    expect(newNotifications).toBeGreaterThanOrEqual(cachedNotifications);
    
    console.log('✅ オフライン→オンライン同期成功');
    console.log(`   同期後の通知: ${newNotifications}件`);
    
    await context.close();
  });

  test('【3G】低速ネットワークでの動作', async ({ browser }) => {
    console.log('[TEST] 3Gネットワークテスト開始');
    
    const context = await browser.newContext({
      ...MOBILE_DEVICES['Galaxy S21']
    });
    
    const page = await context.newPage();
    
    // 3Gネットワーク条件を適用
    const client = await context.newCDPSession(page);
    await client.send('Network.emulateNetworkConditions', NETWORK_CONDITIONS['3G']);
    console.log('[NETWORK] 3G条件適用');
    
    // パフォーマンス計測開始
    const startTime = Date.now();
    
    // ログイン
    await page.goto('/login');
    await page.fill('input[name="email"]', VALID_CREDENTIALS.email);
    await page.fill('input[name="password"]', VALID_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    
    // 通知ページロード時間測定
    await page.goto('/notifications');
    await page.waitForSelector('[data-testid="notification-list"]');
    
    const loadTime = Date.now() - startTime;
    console.log(`[PERF] 3Gでのロード時間: ${loadTime}ms`);
    
    // 3G環境でも10秒以内にロード完了
    expect(loadTime).toBeLessThan(10000);
    
    // プログレッシブローディングの確認
    const skeleton = await page.locator('[data-testid="skeleton-loader"]').isVisible();
    expect(skeleton).toBeTruthy();
    console.log('✅ スケルトンローダー表示確認');
    
    // 最小限のコンテンツが表示されているか
    const minimalContent = await page.locator('[data-testid="notification-item"]').first();
    await expect(minimalContent).toBeVisible({ timeout: 5000 });
    
    console.log('✅ 3G環境での動作確認完了');
    
    await context.close();
  });

  test('【PUSH】プッシュ通知許可フロー', async ({ browser }) => {
    console.log('[TEST] プッシュ通知許可フローテスト');
    
    const context = await browser.newContext({
      ...MOBILE_DEVICES['iPhone 13'],
      permissions: []  // 初期状態では権限なし
    });
    
    const page = await context.newPage();
    
    // 権限リクエストのインターセプト
    page.on('dialog', async dialog => {
      console.log(`[DIALOG] ${dialog.type()}: ${dialog.message()}`);
      if (dialog.message().includes('通知')) {
        await dialog.accept();
        console.log('[PERMISSION] 通知許可を承認');
      }
    });
    
    // ログイン
    await page.goto('/login');
    await page.fill('input[name="email"]', VALID_CREDENTIALS.email);
    await page.fill('input[name="password"]', VALID_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    
    // 通知設定ページ
    await page.goto('/settings/notifications');
    
    // プッシュ通知有効化ボタン
    const enableButton = page.locator('[data-testid="enable-push-notifications"]');
    await enableButton.click();
    
    // 権限ステータスの確認
    const permissionStatus = await page.evaluate(async () => {
      if ('Notification' in window) {
        return Notification.permission;
      }
      return 'unsupported';
    });
    
    console.log(`[PERMISSION] 通知権限ステータス: ${permissionStatus}`);
    
    // サービスワーカーの登録確認
    const swRegistered = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        return registrations.length > 0;
      }
      return false;
    });
    
    expect(swRegistered).toBeTruthy();
    console.log('✅ サービスワーカー登録確認');
    
    await context.close();
  });

  test('【VIEWPORT】レスポンシブ通知UI', async ({ browser }) => {
    console.log('[TEST] レスポンシブUIテスト');
    
    const viewports = [
      { width: 320, height: 568, name: 'iPhone SE' },
      { width: 390, height: 844, name: 'iPhone 13' },
      { width: 768, height: 1024, name: 'iPad Mini' },
      { width: 1024, height: 1366, name: 'iPad Pro' }
    ];
    
    for (const viewport of viewports) {
      console.log(`[VIEWPORT] ${viewport.name} (${viewport.width}x${viewport.height})`);
      
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
      });
      
      const page = await context.newPage();
      
      // ログイン
      await page.goto('/login');
      await page.fill('input[name="email"]', VALID_CREDENTIALS.email);
      await page.fill('input[name="password"]', VALID_CREDENTIALS.password);
      await page.click('button[type="submit"]');
      
      // 通知ページ
      await page.goto('/notifications');
      
      // レイアウト確認
      if (viewport.width < 768) {
        // モバイルレイアウト
        const mobileMenu = await page.locator('[data-testid="mobile-menu"]').isVisible();
        expect(mobileMenu).toBeTruthy();
        console.log('  ✅ モバイルメニュー表示');
        
        // 通知アイテムが縦並び
        const notificationStack = await page.locator('[data-testid="notification-stack"]');
        const stackDirection = await notificationStack.evaluate(el => 
          window.getComputedStyle(el).flexDirection
        );
        expect(stackDirection).toBe('column');
        console.log('  ✅ 通知が縦並び表示');
      } else {
        // タブレット/デスクトップレイアウト
        const sidebar = await page.locator('[data-testid="sidebar"]').isVisible();
        expect(sidebar).toBeTruthy();
        console.log('  ✅ サイドバー表示');
        
        // 通知アイテムがグリッド表示
        const notificationGrid = await page.locator('[data-testid="notification-grid"]');
        const gridDisplay = await notificationGrid.evaluate(el => 
          window.getComputedStyle(el).display
        );
        expect(gridDisplay).toBe('grid');
        console.log('  ✅ 通知がグリッド表示');
      }
      
      await context.close();
    }
    
    console.log('✅ 全ビューポートでレスポンシブUI確認完了');
  });

  test('【GESTURE】長押しで通知アクション', async ({ browser }) => {
    console.log('[TEST] 長押しジェスチャーテスト');
    
    const context = await browser.newContext({
      ...MOBILE_DEVICES['iPhone 13'],
      hasTouch: true
    });
    
    const page = await context.newPage();
    
    // ログイン
    await page.goto('/login');
    await page.fill('input[name="email"]', VALID_CREDENTIALS.email);
    await page.fill('input[name="password"]', VALID_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    
    // 通知ページ
    await page.goto('/notifications');
    await page.waitForSelector('[data-testid="notification-item"]');
    
    // 長押しシミュレーション
    const notification = page.locator('[data-testid="notification-item"]').first();
    const box = await notification.boundingBox();
    
    if (box) {
      // タッチ開始
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      
      // 1秒間押し続ける
      await page.waitForTimeout(1000);
      
      await page.mouse.up();
      
      // コンテキストメニューの表示確認
      const contextMenu = page.locator('[data-testid="notification-context-menu"]');
      await expect(contextMenu).toBeVisible();
      
      // アクション項目の確認
      const actions = ['既読にする', '削除', 'ミュート'];
      for (const action of actions) {
        const actionItem = contextMenu.locator(`text="${action}"`);
        await expect(actionItem).toBeVisible();
        console.log(`  ✅ アクション「${action}」表示確認`);
      }
    }
    
    console.log('✅ 長押しジェスチャーでアクションメニュー表示');
    
    await context.close();
  });
});

export {};