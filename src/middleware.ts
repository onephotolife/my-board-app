import { NextResponse } from "next/server";

export default function middleware() {
  // セッションの確認はサーバーコンポーネント側で行う
  // middlewareはルーティングのみ管理
  
  return NextResponse.next();
}

export const config = {
  matcher: ["/board/:path*"],
};