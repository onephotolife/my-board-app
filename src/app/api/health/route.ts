import { NextResponse } from 'next/server';
import { checkDBHealth } from '@/lib/db/mongodb-local';

// ヘルスチェックエンドポイントはレート制限を緩和済み
// rate-limiter.tsで 'GET:/api/health': { windowMs: 60000, maxRequests: 50 } に設定
export async function GET() {
  const checks = {
    server: true,
    database: false,
    timestamp: new Date().toISOString(),
  };

  try {
    checks.database = await checkDBHealth();
  } catch (error) {
    console.error('Health check error:', error);
  }

  const status = checks.server && checks.database ? 200 : 503;
  
  // キャッシュ制御ヘッダーを追加（並行リクエスト対策）
  const response = NextResponse.json(checks, { status });
  response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  return response;
}