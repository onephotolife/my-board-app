import axios from 'axios';
import { setTimeout } from 'timers/promises';

describe('Timeout Handling Tests', () => {
  it('API呼び出しのタイムアウト', async () => {
    const client = axios.create({
      timeout: 1000 // 1秒
    });

    await expect(
      client.get('https://httpstat.us/200?sleep=2000')
    ).rejects.toThrow(/timeout/);
  });

  it('データベース接続のタイムアウト', async () => {
    const connectWithTimeout = async (url: string, timeout: number) => {
      const controller = new AbortController();
      const timer = setTimeout(timeout);
      
      try {
        const connection = await Promise.race([
          new Promise((resolve) => setTimeout(resolve, 2000, 'connected')),
          timer.then(() => {
            controller.abort();
            throw new Error('Connection timeout');
          })
        ]);
        return connection;
      } finally {
        controller.abort();
      }
    };

    await expect(
      connectWithTimeout('mongodb://slow-server', 1000)
    ).rejects.toThrow(/timeout/);
  });

  it('長時間実行処理の中断', async () => {
    const longRunningTask = async (signal: AbortSignal) => {
      for (let i = 0; i < 1000000; i++) {
        if (signal.aborted) {
          throw new Error('Task aborted');
        }
        // 処理
        if (i % 10000 === 0) {
          await new Promise(resolve => setImmediate(resolve));
        }
      }
    };

    const controller = new AbortController();
    setTimeout(() => controller.abort(), 100);

    await expect(
      longRunningTask(controller.signal)
    ).rejects.toThrow(/aborted/);
  });
});
