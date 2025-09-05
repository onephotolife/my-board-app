import NextAuth from "next-auth";
import { NextRequest, NextResponse } from 'next/server';

import { authOptions } from "@/lib/auth";

// デバッグログ追加 - ROOT CAUSE ANALYSIS
console.warn('🔍 [ROOT CAUSE] NextAuth route handler loaded at:', new Date().toISOString());
console.warn('🔍 [ROOT CAUSE] authOptions providers count:', authOptions.providers?.length);
console.warn('🔍 [ROOT CAUSE] Provider details:', authOptions.providers?.map(p => ({
  id: (p as any).id,
  name: (p as any).name,
  type: (p as any).type
})));

// Next.js 15 App Router用のnamed export
const handler = NextAuth(authOptions);

// ハンドラーの存在確認
console.warn('🔍 [ROOT CAUSE] Handler created:', typeof handler);
console.warn('🔍 [ROOT CAUSE] Handler methods:', Object.keys(handler || {}));

// E2Eテスト用のモックセッション処理
async function handleMockSession(request: NextRequest) {
  const mockSession = {
    user: {
      id: 'mock-user-id',
      email: 'one.photolife+1@gmail.com',
      name: 'E2E Test User',
      emailVerified: true,
      role: 'user'
    },
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
  };
  
  console.warn('🧪 [E2E-SESSION] Returning mock session for testing');
  return NextResponse.json(mockSession);
}

// GET handler with E2E mock support
export async function GET(request: NextRequest) {
  // E2Eテスト用のモック認証チェック
  if (process.env.NODE_ENV === 'development') {
    const cookieHeader = request.headers.get('cookie');
    const isMockAuth = cookieHeader?.includes('mock-session-token-for-e2e-testing') || 
                      cookieHeader?.includes('e2e-mock-auth=mock-session-token-for-e2e-testing');
    const isSessionRequest = request.nextUrl.pathname.includes('/api/auth/session');
    
    if (isMockAuth && isSessionRequest) {
      return handleMockSession(request);
    }
  }
  
  // 通常のNextAuth処理
  return handler(request);
}

// POST handler (通常通り)
export async function POST(request: NextRequest) {
  return handler(request);
}