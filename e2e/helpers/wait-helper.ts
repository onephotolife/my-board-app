/**
 * E2Eテスト用待機ヘルパー
 * 
 * Hydration修正後のwindow.__APP_READY__フラグを活用した
 * アプリケーション準備完了の待機処理を提供
 */

import { Page } from '@playwright/test';

/**
 * アプリケーションの準備完了を待つ
 * 
 * @param page Playwrightのページオブジェクト
 * @param options オプション設定
 * @returns Promise<void>
 */
export async function waitForAppReady(
  page: Page,
  options: {
    timeout?: number;
    checkInterval?: number;
  } = {}
): Promise<void> {
  const { timeout = 10000, checkInterval = 100 } = options;

  try {
    // window.__APP_READY__が存在し、trueになるまで待機
    await page.waitForFunction(
      () => {
        // TypeScriptの型エラーを回避
        const win = window as any;
        return win.__APP_READY__ === true;
      },
      { timeout }
    );
  } catch (error) {
    // フォールバック: 古い方法でも待機を試みる
    console.warn('window.__APP_READY__ not available, falling back to DOM ready state');
    await page.waitForLoadState('domcontentloaded');
  }
}

/**
 * パフォーマンスデータが利用可能になるまで待つ
 * 
 * @param page Playwrightのページオブジェクト
 * @param timeout タイムアウト時間（ミリ秒）
 * @returns Promise<any> パフォーマンスデータ
 */
export async function waitForPerformanceData(
  page: Page,
  timeout: number = 5000
): Promise<any> {
  try {
    const perfData = await page.evaluate(() => {
      return new Promise((resolve, reject) => {
        const checkData = () => {
          const win = window as any;
          if (win.__PERF_DATA__) {
            resolve(win.__PERF_DATA__);
          } else {
            setTimeout(checkData, 100);
          }
        };
        
        checkData();
        
        // タイムアウト処理
        setTimeout(() => {
          reject(new Error('Performance data not available'));
        }, 5000);
      });
    });
    
    return perfData;
  } catch (error) {
    console.warn('Performance data not available:', error);
    return null;
  }
}

/**
 * ページナビゲーションとアプリケーション準備完了を待つ
 * 
 * @param page Playwrightのページオブジェクト
 * @param url 遷移先URL
 * @param options オプション設定
 * @returns Promise<void>
 */
export async function navigateAndWaitForApp(
  page: Page,
  url: string,
  options: {
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
    timeout?: number;
  } = {}
): Promise<void> {
  const { waitUntil = 'domcontentloaded', timeout = 30000 } = options;

  // ページ遷移
  await page.goto(url, { waitUntil, timeout });
  
  // アプリケーション準備完了を待つ
  await waitForAppReady(page, { timeout });
}

/**
 * 要素が表示され、インタラクティブになるまで待つ
 * 
 * @param page Playwrightのページオブジェクト
 * @param selector CSSセレクタまたはdata-testid
 * @param options オプション設定
 * @returns Promise<void>
 */
export async function waitForElementReady(
  page: Page,
  selector: string,
  options: {
    timeout?: number;
    state?: 'visible' | 'hidden' | 'attached' | 'detached';
  } = {}
): Promise<void> {
  const { timeout = 10000, state = 'visible' } = options;
  
  // data-testidセレクタのサポート
  const finalSelector = selector.startsWith('testid=') 
    ? `[data-testid="${selector.replace('testid=', '')}"]`
    : selector;
  
  await page.waitForSelector(finalSelector, { timeout, state });
  
  // 要素がインタラクティブになるまで少し待つ
  await page.waitForTimeout(100);
}

/**
 * 複数の条件が満たされるまで待つ
 * 
 * @param page Playwrightのページオブジェクト
 * @param conditions 待機条件の配列
 * @param options オプション設定
 * @returns Promise<void>
 */
export async function waitForAllConditions(
  page: Page,
  conditions: Array<() => Promise<void>>,
  options: {
    timeout?: number;
    sequential?: boolean;
  } = {}
): Promise<void> {
  const { timeout = 30000, sequential = false } = options;
  
  if (sequential) {
    // 順次実行
    for (const condition of conditions) {
      await condition();
    }
  } else {
    // 並行実行
    await Promise.all(conditions);
  }
}

/**
 * デバッグ用: 現在の待機関連の状態を取得
 * 
 * @param page Playwrightのページオブジェクト
 * @returns Promise<object> 状態情報
 */
export async function getWaitStatus(page: Page): Promise<{
  appReady: boolean;
  hasPerfData: boolean;
  readyTime: number | null;
  documentState: string;
  url: string;
}> {
  return await page.evaluate(() => {
    const win = window as any;
    return {
      appReady: win.__APP_READY__ === true,
      hasPerfData: !!win.__PERF_DATA__,
      readyTime: win.__PERF_DATA__?.appReadyTime || null,
      documentState: document.readyState,
      url: window.location.href
    };
  });
}