import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// サーバ起動確認用の超軽量エンドポイント（DBを見にいかない）
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: 'ready', time: new Date().toISOString() });
}
