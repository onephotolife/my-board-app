import retry from 'async-retry';

/**
 * リトライ機構の実装
 */

export interface RetryOptions {
  retries?: number; // 最大リトライ回数
  factor?: number; // 指数バックオフの係数
  minTimeout?: number; // 最小待機時間（ミリ秒）
  maxTimeout?: number; // 最大待機時間（ミリ秒）
  randomize?: boolean; // ジッター追加
  onRetry?: (error: Error, attempt: number) => void; // リトライ時のコールバック
}

/**
 * デフォルトのリトライ設定
 */
const defaultOptions: RetryOptions = {
  retries: 3,
  factor: 2,
  minTimeout: 1000,
  maxTimeout: 30000,
  randomize: true,
};

/**
 * リトライ可能なエラーかチェック
 */
function isRetriableError(error: any): boolean {
  // ネットワークエラー
  if (error.code === 'ECONNREFUSED' || 
      error.code === 'ETIMEDOUT' || 
      error.code === 'ECONNRESET') {
    return true;
  }

  // HTTPステータスコード
  if (error.statusCode) {
    // 5xx エラーと429（Too Many Requests）はリトライ
    return error.statusCode >= 500 || error.statusCode === 429;
  }

  // MongoDBエラー
  if (error.name === 'MongoNetworkError' || 
      error.code === 11600 || // Interrupted
      error.code === 11601) { // Interrupted due to repl state change
    return true;
  }

  return false;
}

/**
 * 基本的なリトライ関数
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const mergedOptions = { ...defaultOptions, ...options };

  return retry(
    async (bail, attempt) => {
      try {
        return await fn();
      } catch (error: any) {
        // リトライ不可能なエラーの場合は即座に失敗
        if (!isRetriableError(error)) {
          bail(error);
          return;
        }

        // コールバック実行
        if (mergedOptions.onRetry) {
          mergedOptions.onRetry(error, attempt);
        }

        throw error;
      }
    },
    {
      retries: mergedOptions.retries!,
      factor: mergedOptions.factor!,
      minTimeout: mergedOptions.minTimeout!,
      maxTimeout: mergedOptions.maxTimeout!,
      randomize: mergedOptions.randomize!,
    }
  );
}

/**
 * API呼び出し用のリトライラッパー
 */
export async function retryableF

<T>(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<T> {
  return withRetry(async () => {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const error: any = new Error(`HTTP ${response.status}: ${response.statusText}`);
      error.statusCode = response.status;
      throw error;
    }
    
    return response.json();
  }, retryOptions);
}

/**
 * データベース操作用のリトライラッパー
 */
export async function retryableDbOperation<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const dbRetryOptions: RetryOptions = {
    retries: 5,
    minTimeout: 100,
    maxTimeout: 5000,
    ...options,
    onRetry: (error, attempt) => {
      console.warn(`Database operation retry attempt ${attempt}:`, error.message);
      options.onRetry?.(error, attempt);
    },
  };

  return withRetry(operation, dbRetryOptions);
}

/**
 * サーキットブレーカーパターンの実装
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailTime?: number;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private readonly threshold: number = 5,
    private readonly timeout: number = 60000, // 1分
    private readonly resetTimeout: number = 30000 // 30秒
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // サーキットが開いている場合
    if (this.state === 'OPEN') {
      const now = Date.now();
      if (this.lastFailTime && now - this.lastFailTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      
      // 成功時の処理
      if (this.state === 'HALF_OPEN') {
        this.reset();
      }
      
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordFailure(): void {
    this.failures++;
    this.lastFailTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      console.error(`Circuit breaker opened after ${this.failures} failures`);
    }
  }

  private reset(): void {
    this.failures = 0;
    this.lastFailTime = undefined;
    this.state = 'CLOSED';
  }

  getState(): string {
    return this.state;
  }

  getFailures(): number {
    return this.failures;
  }
}

/**
 * デコレーター: メソッドにリトライ機能を追加
 */
export function retryable(options: RetryOptions = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return withRetry(
        () => originalMethod.apply(this, args),
        {
          ...options,
          onRetry: (error, attempt) => {
            console.warn(`Retrying ${propertyKey} (attempt ${attempt}):`, error.message);
            options.onRetry?.(error, attempt);
          },
        }
      );
    };

    return descriptor;
  };
}

/**
 * バッチ処理のリトライ
 */
export async function retryBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  options: {
    batchSize?: number;
    retryOptions?: RetryOptions;
    onItemError?: (item: T, error: Error) => void;
  } = {}
): Promise<{ successes: R[]; failures: Array<{ item: T; error: Error }> }> {
  const { batchSize = 10, retryOptions = {}, onItemError } = options;
  const successes: R[] = [];
  const failures: Array<{ item: T; error: Error }> = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    const results = await Promise.allSettled(
      batch.map(item => 
        withRetry(() => processor(item), retryOptions)
          .catch(error => {
            onItemError?.(item, error);
            return { error, item };
          })
      )
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        if ('error' in result.value) {
          failures.push({ 
            item: batch[index], 
            error: result.value.error 
          });
        } else {
          successes.push(result.value as R);
        }
      }
    });
  }

  return { successes, failures };
}

/**
 * 指数バックオフの計算
 */
export function calculateBackoff(
  attempt: number,
  options: {
    base?: number;
    factor?: number;
    max?: number;
    jitter?: boolean;
  } = {}
): number {
  const { base = 1000, factor = 2, max = 30000, jitter = true } = options;
  
  let delay = Math.min(base * Math.pow(factor, attempt - 1), max);
  
  if (jitter) {
    // ランダムなジッターを追加（±25%）
    const jitterAmount = delay * 0.25;
    delay += (Math.random() - 0.5) * 2 * jitterAmount;
  }
  
  return Math.round(delay);
}