import retry from 'async-retry';

describe('Retry Mechanism Tests', () => {
  it('一時的エラーの自動リトライ', async () => {
    let attempts = 0;
    
    const result = await retry(
      async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary error');
        }
        return 'success';
      },
      {
        retries: 5,
        minTimeout: 10,
        maxTimeout: 100
      }
    );

    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  it('指数バックオフの実装', async () => {
    const timestamps: number[] = [];
    
    await retry(
      async () => {
        timestamps.push(Date.now());
        if (timestamps.length < 4) {
          throw new Error('Retry needed');
        }
        return 'done';
      },
      {
        retries: 5,
        factor: 2,
        minTimeout: 100,
        maxTimeout: 1000
      }
    );

    // バックオフ間隔の検証
    for (let i = 1; i < timestamps.length; i++) {
      const interval = timestamps[i] - timestamps[i - 1];
      expect(interval).toBeGreaterThanOrEqual(100 * Math.pow(2, i - 1));
    }
  });

  it('最大リトライ回数の制御', async () => {
    let attempts = 0;
    
    await expect(
      retry(
        async () => {
          attempts++;
          throw new Error('Permanent error');
        },
        {
          retries: 3,
          minTimeout: 10
        }
      )
    ).rejects.toThrow(/Permanent error/);

    expect(attempts).toBe(4); // 初回 + 3リトライ
  });
});
