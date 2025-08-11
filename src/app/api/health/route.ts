import { NextResponse } from 'next/server';
import { checkDBHealth } from '@/lib/db/mongodb-local';

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

  return NextResponse.json(checks, { status });
}