import { NextResponse } from 'next/server';

/**
 * 軽量版ヘルスチェック（50ms以内の応答目標）
 * データベース接続なしでサーバー状態のみ確認
 */
export async function GET() {
  const startTime = Date.now();
  
  const checks = {
    server: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      limit: Math.round(process.memoryUsage().rss / 1024 / 1024)
    },
    environment: {
      node_version: process.version,
      platform: process.platform,
      arch: process.arch
    },
    response_time_ms: 0 // 後で計算
  };

  // レスポンス時間を計算
  checks.response_time_ms = Date.now() - startTime;

  return NextResponse.json(checks, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Health-Type': 'light',
      'X-Response-Time': `${checks.response_time_ms}ms`
    }
  });
}

/**
 * HEADリクエストでの軽量確認
 */
export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'X-Server-Status': 'healthy',
      'X-Health-Type': 'light',
      'Cache-Control': 'no-cache'
    }
  });
}