/**
 * メトリクス収集サービス
 * 将来的にPrometheus、DataDog、CloudWatchなどと統合可能
 */

interface MetricData {
  [key: string]: any;
}

interface Metric {
  name: string;
  value: number;
  timestamp: Date;
  tags?: MetricData;
}

export class MetricsService {
  private metrics: Metric[] = [];
  private enabled: boolean;

  constructor() {
    this.enabled = process.env.ENABLE_METRICS === 'true';
  }

  /**
   * メトリクスを記録
   */
  record(name: string, data?: MetricData): void {
    if (!this.enabled) return;

    const metric: Metric = {
      name,
      value: 1,
      timestamp: new Date(),
      tags: data,
    };

    this.metrics.push(metric);

    // コンソールログ（開発環境）
    if (process.env.NODE_ENV === 'development') {
      console.warn(`📊 Metric: ${name}`, data || '');
    }

    // バッチ送信のためのバッファリング
    if (this.metrics.length >= 100) {
      this.flush();
    }
  }

  /**
   * カウンターを増やす
   */
  increment(name: string, value: number = 1, tags?: MetricData): void {
    if (!this.enabled) return;

    const metric: Metric = {
      name,
      value,
      timestamp: new Date(),
      tags,
    };

    this.metrics.push(metric);
  }

  /**
   * ゲージ値を設定
   */
  gauge(name: string, value: number, tags?: MetricData): void {
    if (!this.enabled) return;

    const metric: Metric = {
      name: `gauge.${name}`,
      value,
      timestamp: new Date(),
      tags,
    };

    this.metrics.push(metric);
  }

  /**
   * タイミングを記録
   */
  timing(name: string, duration: number, tags?: MetricData): void {
    if (!this.enabled) return;

    const metric: Metric = {
      name: `timing.${name}`,
      value: duration,
      timestamp: new Date(),
      tags,
    };

    this.metrics.push(metric);
  }

  /**
   * メトリクスを送信
   */
  async flush(): Promise<void> {
    if (!this.enabled || this.metrics.length === 0) return;

    const metricsToSend = [...this.metrics];
    this.metrics = [];

    try {
      // 実際の実装では、ここで外部サービスに送信
      // await this.sendToMetricsService(metricsToSend);

      // 現在はログ出力のみ
      if (process.env.NODE_ENV === 'development') {
        console.warn(`📊 Flushing ${metricsToSend.length} metrics`);
      }

      // ローカルストレージに保存（分析用）
      this.saveToLocalStorage(metricsToSend);

    } catch (error) {
      console.error('メトリクス送信エラー:', error);
      // エラーが発生してもアプリケーションの動作には影響させない
    }
  }

  /**
   * ローカルストレージに保存（開発/デバッグ用）
   */
  private saveToLocalStorage(metrics: Metric[]): void {
    if (typeof window === 'undefined') return;

    try {
      const key = `metrics_${new Date().toISOString().split('T')[0]}`;
      const existing = localStorage.getItem(key);
      const data = existing ? JSON.parse(existing) : [];
      data.push(...metrics);

      // 最大1000件まで保存
      if (data.length > 1000) {
        data.splice(0, data.length - 1000);
      }

      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      // ストレージエラーは無視
    }
  }

  /**
   * メトリクスの集計
   */
  getAggregatedMetrics(): Record<string, any> {
    const aggregated: Record<string, any> = {};

    this.metrics.forEach(metric => {
      if (!aggregated[metric.name]) {
        aggregated[metric.name] = {
          count: 0,
          sum: 0,
          min: Infinity,
          max: -Infinity,
          avg: 0,
        };
      }

      const agg = aggregated[metric.name];
      agg.count++;
      agg.sum += metric.value;
      agg.min = Math.min(agg.min, metric.value);
      agg.max = Math.max(agg.max, metric.value);
      agg.avg = agg.sum / agg.count;
    });

    return aggregated;
  }

  /**
   * メトリクスをリセット
   */
  reset(): void {
    this.metrics = [];
  }
}

// シングルトンインスタンス
let metricsInstance: MetricsService | null = null;

export function getMetrics(): MetricsService {
  if (!metricsInstance) {
    metricsInstance = new MetricsService();
  }
  return metricsInstance;
}