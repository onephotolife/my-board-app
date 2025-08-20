/**
 * タイムアウト処理ユーティリティ
 */

interface TimeoutOptions {
  timeout: number; // ミリ秒
  errorMessage?: string;
}

/**
 * Promise にタイムアウトを設定
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  options: TimeoutOptions
): Promise<T> {
  const { timeout, errorMessage = `Operation timed out after ${timeout}ms` } = options;

  const timeoutPromise = new Promise<never>((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      reject(new TimeoutError(errorMessage, timeout));
    }, timeout);
  });

  return Promise.race([promise, timeoutPromise]);
}

/**
 * タイムアウトエラークラス
 */
export class TimeoutError extends Error {
  public readonly timeout: number;

  constructor(message: string, timeout: number) {
    super(message);
    this.name = 'TimeoutError';
    this.timeout = timeout;
  }
}

/**
 * Abort Controller を使用したタイムアウト
 */
export function createTimeoutController(timeout: number): AbortController {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // クリーンアップ関数を追加
  const originalAbort = controller.abort.bind(controller);
  controller.abort = () => {
    clearTimeout(timeoutId);
    originalAbort();
  };

  return controller;
}

/**
 * データベース接続のタイムアウト
 */
export async function connectWithTimeout(
  connectFn: () => Promise<any>,
  timeout: number = 5000
): Promise<any> {
  return withTimeout(connectFn(), {
    timeout,
    errorMessage: `Database connection timeout after ${timeout}ms`
  });
}

/**
 * API呼び出しのタイムアウト
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = 10000, ...fetchOptions } = options;
  const controller = createTimeoutController(timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new TimeoutError(`Request to ${url} timed out after ${timeout}ms`, timeout);
    }
    throw error;
  }
}

/**
 * 長時間実行タスクのタイムアウト管理
 */
export class TimeoutManager {
  private timeouts: Map<string, NodeJS.Timeout> = new Map();

  /**
   * タイムアウトを設定
   */
  set(key: string, callback: () => void, timeout: number): void {
    this.clear(key);
    const id = setTimeout(() => {
      callback();
      this.timeouts.delete(key);
    }, timeout);
    this.timeouts.set(key, id);
  }

  /**
   * タイムアウトをクリア
   */
  clear(key: string): void {
    const id = this.timeouts.get(key);
    if (id) {
      clearTimeout(id);
      this.timeouts.delete(key);
    }
  }

  /**
   * すべてのタイムアウトをクリア
   */
  clearAll(): void {
    for (const id of this.timeouts.values()) {
      clearTimeout(id);
    }
    this.timeouts.clear();
  }

  /**
   * タイムアウトが設定されているか確認
   */
  has(key: string): boolean {
    return this.timeouts.has(key);
  }
}

/**
 * デコレーター: メソッドにタイムアウトを設定
 */
export function timeout(ms: number) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return withTimeout(originalMethod.apply(this, args), {
        timeout: ms,
        errorMessage: `Method ${propertyKey} timed out after ${ms}ms`
      });
    };

    return descriptor;
  };
}

/**
 * チャンク処理のタイムアウト管理
 */
export async function processWithTimeout<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  options: {
    timeout: number;
    chunkSize?: number;
    onTimeout?: (item: T, error: TimeoutError) => void;
  }
): Promise<{ results: R[]; failures: Array<{ item: T; error: Error }> }> {
  const { timeout, chunkSize = 10, onTimeout } = options;
  const results: R[] = [];
  const failures: Array<{ item: T; error: Error }> = [];

  // チャンクに分割
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    
    const chunkPromises = chunk.map(async (item) => {
      try {
        const result = await withTimeout(processor(item), { timeout });
        return { success: true, result, item };
      } catch (error: any) {
        if (error instanceof TimeoutError && onTimeout) {
          onTimeout(item, error);
        }
        return { success: false, error, item };
      }
    });

    const chunkResults = await Promise.all(chunkPromises);
    
    for (const result of chunkResults) {
      if (result.success) {
        results.push(result.result);
      } else {
        failures.push({ item: result.item, error: result.error });
      }
    }
  }

  return { results, failures };
}