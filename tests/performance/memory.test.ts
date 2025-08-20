import v8 from 'v8';
import { performance } from 'perf_hooks';

describe('Memory Usage Tests', () => {
  const getMemoryUsage = () => {
    const heapStats = v8.getHeapStatistics();
    return {
      used: heapStats.used_heap_size / 1024 / 1024, // MB
      total: heapStats.total_heap_size / 1024 / 1024,
      limit: heapStats.heap_size_limit / 1024 / 1024
    };
  };

  it('ヒープサイズの監視', () => {
    const memory = getMemoryUsage();
    
    expect(memory.used).toBeLessThan(512); // 512MB未満
    expect(memory.total).toBeLessThan(1024); // 1GB未満
  });

  it('メモリリークの検出', async () => {
    const initialMemory = getMemoryUsage();
    
    // 大量のオブジェクト作成
    const objects = [];
    for (let i = 0; i < 10000; i++) {
      objects.push({
        id: i,
        data: new Array(100).fill('test')
      });
    }
    
    const afterCreation = getMemoryUsage();
    expect(afterCreation.used).toBeGreaterThan(initialMemory.used);
    
    // クリーンアップ
    objects.length = 0;
    global.gc && global.gc(); // 強制GC（--expose-gcフラグが必要）
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const afterCleanup = getMemoryUsage();
    const leakThreshold = initialMemory.used * 1.1; // 10%の余裕
    expect(afterCleanup.used).toBeLessThan(leakThreshold);
  });

  it('ガベージコレクションの影響', async () => {
    const measurements = [];
    
    for (let i = 0; i < 5; i++) {
      const memory = getMemoryUsage();
      measurements.push(memory.used);
      
      // 一時的なオブジェクト作成
      const temp = new Array(1000000).fill('x');
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // メモリ使用量が安定していることを確認
    const avgMemory = measurements.reduce((a, b) => a + b) / measurements.length;
    const variance = measurements.reduce((sum, val) => sum + Math.pow(val - avgMemory, 2), 0) / measurements.length;
    const stdDev = Math.sqrt(variance);
    
    expect(stdDev).toBeLessThan(50); // 標準偏差が50MB未満
  });
});
