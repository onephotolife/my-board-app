import v8 from 'v8';
import os from 'os';
import { performance } from 'perf_hooks';

/**
 * パフォーマンス監視システム
 * メモリ使用量、CPU使用率、その他のメトリクスを追跡
 */

interface MemoryMetrics {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  arrayBuffers: number;
  heapUsedPercent: number;
}

interface CPUMetrics {
  usage: number;
  loadAverage: number[];
  cores: number;
}

interface PerformanceMetrics {
  memory: MemoryMetrics;
  cpu: CPUMetrics;
  uptime: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private maxMetricsHistory = 100;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private alertThresholds = {
    memoryPercent: 80,
    cpuPercent: 70,
    responseTime: 1000, // ms
  };

  /**
   * 現在のメモリ使用状況を取得
   */
  getMemoryMetrics(): MemoryMetrics {
    const memUsage = process.memoryUsage();
    const heapStats = v8.getHeapStatistics();
    
    return {
      heapUsed: memUsage.heapUsed / 1024 / 1024, // MB
      heapTotal: memUsage.heapTotal / 1024 / 1024,
      external: memUsage.external / 1024 / 1024,
      rss: memUsage.rss / 1024 / 1024,
      arrayBuffers: memUsage.arrayBuffers / 1024 / 1024,
      heapUsedPercent: (memUsage.heapUsed / heapStats.heap_size_limit) * 100,
    };
  }

  /**
   * 現在のCPU使用状況を取得
   */
  getCPUMetrics(): CPUMetrics {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });

    const usage = 100 - ~~(100 * totalIdle / totalTick);
    
    return {
      usage,
      loadAverage: os.loadavg(),
      cores: cpus.length,
    };
  }

  /**
   * 現在のパフォーマンスメトリクスを取得
   */
  getCurrentMetrics(): PerformanceMetrics {
    return {
      memory: this.getMemoryMetrics(),
      cpu: this.getCPUMetrics(),
      uptime: process.uptime(),
      timestamp: Date.now(),
    };
  }

  /**
   * 監視を開始
   */
  startMonitoring(intervalMs: number = 10000): void {
    if (this.monitoringInterval) {
      this.stopMonitoring();
    }

    this.monitoringInterval = setInterval(() => {
      const metrics = this.getCurrentMetrics();
      this.metrics.push(metrics);

      // 履歴の制限
      if (this.metrics.length > this.maxMetricsHistory) {
        this.metrics.shift();
      }

      // アラートチェック
      this.checkAlerts(metrics);
    }, intervalMs);
  }

  /**
   * 監視を停止
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * アラートをチェック
   */
  private checkAlerts(metrics: PerformanceMetrics): void {
    // メモリアラート
    if (metrics.memory.heapUsedPercent > this.alertThresholds.memoryPercent) {
      console.warn(`⚠️ High memory usage: ${metrics.memory.heapUsedPercent.toFixed(2)}%`);
      this.triggerGarbageCollection();
    }

    // CPUアラート
    if (metrics.cpu.usage > this.alertThresholds.cpuPercent) {
      console.warn(`⚠️ High CPU usage: ${metrics.cpu.usage}%`);
    }
  }

  /**
   * ガベージコレクションをトリガー
   */
  private triggerGarbageCollection(): void {
    if (global.gc) {
      console.log('Triggering garbage collection...');
      global.gc();
    }
  }

  /**
   * メトリクスの統計を取得
   */
  getStats(): {
    average: Partial<PerformanceMetrics>;
    peak: Partial<PerformanceMetrics>;
    current: PerformanceMetrics;
  } {
    const current = this.getCurrentMetrics();
    
    if (this.metrics.length === 0) {
      return { average: {}, peak: {}, current };
    }

    // 平均値計算
    const avgMemory = this.metrics.reduce((acc, m) => acc + m.memory.heapUsed, 0) / this.metrics.length;
    const avgCPU = this.metrics.reduce((acc, m) => acc + m.cpu.usage, 0) / this.metrics.length;

    // ピーク値
    const peakMemory = Math.max(...this.metrics.map(m => m.memory.heapUsed));
    const peakCPU = Math.max(...this.metrics.map(m => m.cpu.usage));

    return {
      average: {
        memory: { heapUsed: avgMemory } as MemoryMetrics,
        cpu: { usage: avgCPU } as CPUMetrics,
      },
      peak: {
        memory: { heapUsed: peakMemory } as MemoryMetrics,
        cpu: { usage: peakCPU } as CPUMetrics,
      },
      current,
    };
  }

  /**
   * メモリリークの検出
   */
  detectMemoryLeak(threshold: number = 10): boolean {
    if (this.metrics.length < 10) {
      return false;
    }

    // 最近10個のメトリクスを取得
    const recentMetrics = this.metrics.slice(-10);
    const memoryValues = recentMetrics.map(m => m.memory.heapUsed);
    
    // 線形回帰で傾きを計算
    const n = memoryValues.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = memoryValues.reduce((a, b) => a + b, 0);
    const sumXY = memoryValues.reduce((acc, val, i) => acc + i * val, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    // 傾きが閾値を超えたらリークの可能性
    return slope > threshold;
  }
}

// シングルトンインスタンス
const monitor = new PerformanceMonitor();

/**
 * パフォーマンス測定デコレーター
 */
export function measurePerformance() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const start = performance.now();
      const startMemory = process.memoryUsage().heapUsed;
      
      try {
        const result = await originalMethod.apply(this, args);
        
        const duration = performance.now() - start;
        const memoryDelta = process.memoryUsage().heapUsed - startMemory;
        
        console.log(`📊 ${propertyKey} completed:`, {
          duration: `${duration.toFixed(2)}ms`,
          memoryDelta: `${(memoryDelta / 1024 / 1024).toFixed(2)}MB`,
        });
        
        return result;
      } catch (error) {
        const duration = performance.now() - start;
        console.error(`❌ ${propertyKey} failed after ${duration.toFixed(2)}ms`);
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * リソース使用量トラッカー
 */
export class ResourceTracker {
  private startTime: number;
  private startMemory: NodeJS.MemoryUsage;
  private startCpuUsage: NodeJS.CpuUsage;

  constructor() {
    this.startTime = performance.now();
    this.startMemory = process.memoryUsage();
    this.startCpuUsage = process.cpuUsage();
  }

  /**
   * 現在のリソース使用量を取得
   */
  getUsage(): {
    duration: number;
    memory: {
      heapUsed: number;
      heapTotal: number;
      delta: number;
    };
    cpu: {
      user: number;
      system: number;
    };
  } {
    const duration = performance.now() - this.startTime;
    const currentMemory = process.memoryUsage();
    const currentCpuUsage = process.cpuUsage(this.startCpuUsage);

    return {
      duration,
      memory: {
        heapUsed: currentMemory.heapUsed / 1024 / 1024,
        heapTotal: currentMemory.heapTotal / 1024 / 1024,
        delta: (currentMemory.heapUsed - this.startMemory.heapUsed) / 1024 / 1024,
      },
      cpu: {
        user: currentCpuUsage.user / 1000, // マイクロ秒からミリ秒へ
        system: currentCpuUsage.system / 1000,
      },
    };
  }

  /**
   * リセット
   */
  reset(): void {
    this.startTime = performance.now();
    this.startMemory = process.memoryUsage();
    this.startCpuUsage = process.cpuUsage();
  }
}

/**
 * APIエンドポイント用のメトリクス収集
 */
export async function collectAPIMetrics(
  endpoint: string,
  method: string,
  handler: () => Promise<any>
): Promise<{
  result: any;
  metrics: {
    endpoint: string;
    method: string;
    duration: number;
    memory: number;
    status: 'success' | 'error';
    timestamp: number;
  };
}> {
  const tracker = new ResourceTracker();
  let status: 'success' | 'error' = 'success';
  let result: any;

  try {
    result = await handler();
  } catch (error) {
    status = 'error';
    throw error;
  } finally {
    const usage = tracker.getUsage();
    
    const metrics = {
      endpoint,
      method,
      duration: usage.duration,
      memory: usage.memory.delta,
      status,
      timestamp: Date.now(),
    };

    // メトリクスをログに記録
    if (process.env.NODE_ENV === 'development') {
      console.log('API Metrics:', metrics);
    }

    return { result, metrics };
  }
}

export default monitor;