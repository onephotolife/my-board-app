import { test, expect, type Page } from '@playwright/test';

test.describe('Health Check API Tests', () => {
  test.setTimeout(30000); // 30秒のタイムアウト

  test('should return health check status without errors', async ({ request }) => {
    // ヘルスチェックAPIを呼び出し
    const response = await request.get('/api/health');
    
    // ステータスコードは200または503（DB未接続時）
    expect([200, 503]).toContain(response.status());
    
    // JSONレスポンスを取得
    const data = await response.json();
    
    // 必須フィールドの存在確認
    expect(data).toHaveProperty('server');
    expect(data).toHaveProperty('database');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('performance');
    expect(data).toHaveProperty('details');
    
    // serverは常にtrueであるべき
    expect(data.server).toBe(true);
    
    // databaseはboolean値であるべき（エラーではない）
    expect(typeof data.database).toBe('boolean');
    
    // パフォーマンス情報の検証
    expect(data.performance).toHaveProperty('response_time_ms');
    expect(data.performance.response_time_ms).toBeGreaterThanOrEqual(0);
    
    // 詳細情報の検証
    expect(data.details).toHaveProperty('connection_state');
    expect(['connected', 'disconnected']).toContain(data.details.connection_state);
    
    console.log('Health Check Response:', {
      status: response.status(),
      database: data.database,
      connection_state: data.details.connection_state,
      response_time: data.performance.response_time_ms
    });
  });

  test('should handle multiple rapid health checks', async ({ request }) => {
    const results = [];
    
    // 5回連続でヘルスチェック
    for (let i = 0; i < 5; i++) {
      const response = await request.get('/api/health');
      const data = await response.json();
      
      results.push({
        status: response.status(),
        database: data.database,
        response_time: data.performance.response_time_ms
      });
      
      // エラーレスポンスでないことを確認
      expect(data).toHaveProperty('server');
      expect(data.server).toBe(true);
    }
    
    // すべてのリクエストが成功したことを確認
    expect(results.length).toBe(5);
    
    // レスポンスタイムが妥当な範囲内であることを確認
    const avgResponseTime = results.reduce((sum, r) => sum + r.response_time, 0) / results.length;
    expect(avgResponseTime).toBeLessThan(100); // 平均100ms未満
    
    console.log('Rapid Health Check Results:', {
      total: results.length,
      avg_response_time: avgResponseTime,
      statuses: results.map(r => r.status)
    });
  });

  test('should return appropriate headers', async ({ request }) => {
    const response = await request.get('/api/health');
    
    // ヘルスチェック用のカスタムヘッダーを確認
    expect(response.headers()).toHaveProperty('x-health-status');
    expect(response.headers()).toHaveProperty('x-response-time');
    
    const healthStatus = response.headers()['x-health-status'];
    expect(['healthy', 'unhealthy']).toContain(healthStatus);
    
    console.log('Health Check Headers:', {
      'x-health-status': healthStatus,
      'x-response-time': response.headers()['x-response-time'],
      'x-warmup-status': response.headers()['x-warmup-status']
    });
  });

  test('should not crash when database is unavailable', async ({ request }) => {
    // このテストは、DBが利用不可能な場合でもAPIがクラッシュしないことを確認
    // 実際のテストでは、DB接続をモックまたは無効化する必要がある
    
    const response = await request.get('/api/health');
    
    // ステータスコードが返されることを確認（クラッシュしていない）
    expect(response.status()).toBeDefined();
    
    const data = await response.json();
    
    // エラーメッセージではなく、構造化されたレスポンスであることを確認
    expect(data).toHaveProperty('server');
    expect(data).toHaveProperty('database');
    
    // database がfalseの場合でも、他のフィールドが正常であることを確認
    if (data.database === false) {
      expect(data.server).toBe(true);
      expect(data.details.connection_state).toBe('disconnected');
      console.log('✓ Database unavailable handled gracefully');
    } else {
      console.log('✓ Database is connected');
    }
  });
});