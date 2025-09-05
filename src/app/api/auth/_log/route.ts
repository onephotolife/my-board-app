import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// NextAuth クライアントのログ送信エンドポイント互換
// 受信内容は保存せず、常に成功として応答（開発用途）
export async function POST(request: NextRequest) {
  try {
    // ベストエフォートで読み捨て（本文が空でもOK）
    try {
      await request.text();
    } catch {
      // ignore
    }
    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
