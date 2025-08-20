import os from 'os';
import { performance } from 'perf_hooks';

describe('CPU Usage Tests', () => {
  const getCPUUsage = () => {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });
    
    return 100 - ~~(100 * totalIdle / totalTick);
  };

  it('CPU使用率の測定', () => {
    const usage = getCPUUsage();
    expect(usage).toBeGreaterThanOrEqual(0);
    expect(usage).toBeLessThanOrEqual(100);
  });

  it('高負荷時の動作確認', async () => {
    const startUsage = getCPUUsage();
    
    // CPU集約的な処理
    const start = performance.now();
    let result = 0;
    for (let i = 0; i < 1000000; i++) {
      result += Math.sqrt(i);
    }
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(1000); // 1秒以内
    expect(result).toBeGreaterThan(0);
  });

  it('並行処理の最適化', async () => {
    const workers = os.cpus().length;
    const tasks = new Array(workers).fill(0).map((_, i) => {
      return new Promise(resolve => {
        setTimeout(() => {
          let sum = 0;
          for (let j = 0; j < 1000000; j++) {
            sum += j * i;
          }
          resolve(sum);
        }, 0);
      });
    });
    
    const start = performance.now();
    await Promise.all(tasks);
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(2000); // 2秒以内
  });
});
