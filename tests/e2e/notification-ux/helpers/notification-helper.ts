/**
 * 通知テスト用ヘルパークラス
 * STRICT120準拠 - 共通処理の集約
 */

import { Page, expect } from '@playwright/test';

/**
 * 認証状態を確実に確認
 * @param page Playwrightページオブジェクト
 * @returns 認証状態
 */
export async function ensureAuthenticated(page: Page): Promise<boolean> {
  const maxChecks = 3;
  
  for (let i = 0; i < maxChecks; i++) {
    try {
      const response = await page.request.get('/api/auth/session');
      const session = await response.json();
      
      if (session.user?.id && session.user?.emailVerified !== false) {
        console.log('[AUTH_CHECK] ✅ 認証確認OK:', session.user.email);
        return true;
      }
      
      console.log(`[AUTH_CHECK] 認証未確立 (${i + 1}/${maxChecks})`);
      
      // セッション再同期を試行
      await page.goto('/api/auth/session', { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      
    } catch (error) {
      console.error('[AUTH_CHECK] エラー:', error);
    }
  }
  
  return false;
}

/**
 * テスト前の認証状態確認ヘルパー
 */
export async function requireAuth(page: Page): Promise<void> {
  const isAuthenticated = await ensureAuthenticated(page);
  
  if (!isAuthenticated) {
    throw new Error('認証が必要です。auth.setup.tsを先に実行してください。');
  }
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface NotificationData {
  id: string;
  type: 'comment' | 'like' | 'follow' | 'system';
  message: string;
  read: boolean;
  createdAt: Date;
}

export class NotificationTestHelper {
  constructor(private page: Page) {}

  /**
   * ログイン処理
   */
  async login(page: Page, credentials: AuthCredentials): Promise<void> {
    console.log('[HELPER] ログイン処理開始');
    
    await page.goto('/auth/signin');
    await page.fill('input[name="email"]', credentials.email);
    await page.fill('input[name="password"]', credentials.password);
    
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      page.click('button[type="submit"]')
    ]);
    
    // セッション確認
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => 
      c.name.includes('session') || c.name.includes('token')
    );
    
    if (!sessionCookie) {
      throw new Error('認証失敗: セッショントークンが見つかりません');
    }
    
    console.log('[HELPER] ログイン成功');
  }

  /**
   * テスト用通知データの準備
   */
  async setupTestNotifications(count: number): Promise<void> {
    console.log(`[HELPER] ${count}件のテスト通知を準備`);
    
    // APIモック設定
    await this.page.route('/api/notifications', async (route) => {
      const notifications: NotificationData[] = [];
      
      for (let i = 0; i < count; i++) {
        notifications.push({
          id: `test-notif-${i}`,
          type: ['comment', 'like', 'follow'][i % 3] as any,
          message: `テスト通知 ${i + 1}`,
          read: false,
          createdAt: new Date(Date.now() - i * 60000)
        });
      }
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          notifications,
          unreadCount: count
        })
      });
    });
    
    console.log('[HELPER] 通知データ準備完了');
  }

  /**
   * 通知リストを開く
   */
  async openNotificationList(): Promise<void> {
    console.log('[HELPER] 通知リストを開く');
    
    const bellIcon = this.page.locator('[data-testid="notification-bell"]');
    await expect(bellIcon).toBeVisible();
    await bellIcon.click();
    
    const dropdown = this.page.locator('[data-testid="notification-dropdown"]');
    await expect(dropdown).toBeVisible();
    
    console.log('[HELPER] 通知リスト表示');
  }

  /**
   * 通知を既読にする
   */
  async markAsRead(notificationId: string): Promise<void> {
    console.log(`[HELPER] 通知を既読化: ${notificationId}`);
    
    const notification = this.page.locator(
      `[data-testid="notification-item-${notificationId}"]`
    );
    await notification.click();
    
    // 既読状態の確認
    await expect(notification).toHaveAttribute('data-read', 'true');
    
    console.log('[HELPER] 既読化完了');
  }

  /**
   * 全通知を既読にする
   */
  async markAllAsRead(): Promise<void> {
    console.log('[HELPER] 全通知を既読化');
    
    const markAllButton = this.page.locator(
      '[data-testid="mark-all-read-button"]'
    );
    await markAllButton.click();
    
    // 確認ダイアログ
    const confirmButton = this.page.locator(
      '[data-testid="confirm-mark-all-read"]'
    );
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }
    
    // バッジが消えることを確認
    const badge = this.page.locator('[data-testid="notification-badge"]');
    await expect(badge).not.toBeVisible();
    
    console.log('[HELPER] 全既読化完了');
  }

  /**
   * パフォーマンス計測
   */
  async measurePerformance(action: () => Promise<void>): Promise<number> {
    const startTime = Date.now();
    await action();
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`[PERF] 実行時間: ${duration}ms`);
    return duration;
  }

  /**
   * ネットワーク条件のシミュレーション
   */
  async simulateNetwork(condition: '3G' | '4G' | 'offline'): Promise<void> {
    console.log(`[HELPER] ネットワーク条件: ${condition}`);
    
    const context = this.page.context();
    
    switch (condition) {
      case '3G':
        await context.route('**/*', async (route) => {
          await new Promise(resolve => setTimeout(resolve, 100)); // 遅延
          await route.continue();
        });
        break;
        
      case 'offline':
        await context.setOffline(true);
        break;
        
      default:
        // 通常速度
        break;
    }
  }

  /**
   * スクリーンショット取得（証拠用）
   */
  async captureEvidence(testName: string, step: string): Promise<void> {
    const timestamp = Date.now();
    const filename = `test-results/evidence/${testName}-${step}-${timestamp}.png`;
    
    await this.page.screenshot({
      path: filename,
      fullPage: true
    });
    
    console.log(`[EVIDENCE] スクリーンショット保存: ${filename}`);
  }

  /**
   * IPoV (Independent Proof of Visual) 生成
   */
  async generateIPoV(selector: string): Promise<object> {
    const element = this.page.locator(selector);
    
    const ipov = {
      timestamp: new Date().toISOString(),
      selector,
      visible: await element.isVisible(),
      enabled: await element.isEnabled(),
      text: await element.textContent(),
      boundingBox: await element.boundingBox(),
      styles: await element.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          color: styles.color,
          backgroundColor: styles.backgroundColor,
          fontSize: styles.fontSize,
          fontWeight: styles.fontWeight,
          display: styles.display,
          position: styles.position
        };
      }),
      attributes: await element.evaluate((el) => {
        const attrs: Record<string, string> = {};
        for (const attr of el.attributes) {
          attrs[attr.name] = attr.value;
        }
        return attrs;
      })
    };
    
    console.log('[IPoV] 視覚的証拠生成:', JSON.stringify(ipov, null, 2));
    return ipov;
  }

  /**
   * アクセシビリティチェック
   */
  async checkAccessibility(selector?: string): Promise<void> {
    // axe-playwright integration
    const violations = await this.page.evaluate(async (sel) => {
      // @ts-ignore
      if (typeof window.axe === 'undefined') {
        console.warn('[A11Y] axe-core not loaded');
        return [];
      }
      
      // @ts-ignore
      const results = await window.axe.run(sel || document);
      return results.violations;
    }, selector);
    
    if (violations.length > 0) {
      console.error('[A11Y] アクセシビリティ違反:', violations);
      throw new Error(`アクセシビリティ違反が${violations.length}件見つかりました`);
    }
    
    console.log('[A11Y] ✅ アクセシビリティチェック合格');
  }
}

// テストデータファクトリー
export class TestDataFactory {
  static createNotification(
    override?: Partial<NotificationData>
  ): NotificationData {
    return {
      id: `notif-${Date.now()}`,
      type: 'comment',
      message: 'テスト通知',
      read: false,
      createdAt: new Date(),
      ...override
    };
  }
  
  static createMultipleNotifications(
    count: number,
    type?: 'comment' | 'like' | 'follow' | 'system'
  ): NotificationData[] {
    const notifications: NotificationData[] = [];
    
    for (let i = 0; i < count; i++) {
      notifications.push(
        this.createNotification({
          id: `notif-${i}`,
          type: type || (['comment', 'like', 'follow'][i % 3] as any),
          message: `通知 ${i + 1}`,
          read: i % 3 === 0, // 3件に1件は既読
          createdAt: new Date(Date.now() - i * 3600000)
        })
      );
    }
    
    return notifications;
  }
}