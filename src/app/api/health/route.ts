import { NextResponse } from 'next/server';

import { dbConnectionManager } from '@/lib/db/connection-manager';

/**
 * 完全版ヘルスチェック（データベース接続含む）
 * 高速化：Warm-up + キャッシュ戦略で初回遅延を最小化
 */
export async function GET() {
  const startTime = Date.now();
  
  const checks = {
    server: true,
    database: false,
    timestamp: new Date().toISOString(),
    performance: {
      response_time_ms: 0,
      warmup_completed: false,
      last_db_check: 0,
      cache_used: false,
      db_response_time_ms: 0
    },
    details: {
      uptime: Math.round(process.uptime()),
      memory_usage_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      connection_state: 'unknown'
    }
  };

  try {
    // 高速ヘルスチェック（キャッシュ活用）
    const dbHealth = await dbConnectionManager.quickHealthCheck();
    
    checks.database = dbHealth.isHealthy;
    checks.performance.warmup_completed = dbHealth.warmupCompleted;
    checks.performance.last_db_check = dbHealth.lastCheck;
    checks.performance.cache_used = dbHealth.responseTime === 0;
    checks.details.connection_state = dbHealth.isHealthy ? 'connected' : 'disconnected';
    
    // DB応答時間をパフォーマンス情報に追加
    if (dbHealth.responseTime > 0) {
      checks.performance.db_response_time_ms = dbHealth.responseTime;
    }
    
  } catch (error) {
    console.error('Health check error:', error);
    checks.database = false;
    checks.details.connection_state = 'error';
  }

  // 総応答時間を計算
  checks.performance.response_time_ms = Date.now() - startTime;

  const status = checks.server && checks.database ? 200 : 503;
  const statusText = status === 200 ? 'healthy' : 'unhealthy';
  
  const response = NextResponse.json(checks, { status });
  
  // 最適化されたキャッシュヘッダー
  if (checks.performance.cache_used) {
    // キャッシュからの場合は短時間キャッシュ許可
    response.headers.set('Cache-Control', 'private, max-age=5, stale-while-revalidate=10');
  } else {
    // 実際のDB確認の場合はキャッシュなし
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
  
  response.headers.set('X-Health-Status', statusText);
  response.headers.set('X-Response-Time', `${checks.performance.response_time_ms}ms`);
  response.headers.set('X-Warmup-Status', checks.performance.warmup_completed ? 'completed' : 'pending');
  response.headers.set('X-Health-Type', 'full');

  return response;
}