import { NextResponse } from 'next/server';

import { signIn } from '@/lib/auth';
import { auth } from '@/lib/auth';

export async function POST(request: Request) {
  console.warn('🧪 テストログイン開始');
  
  try {
    const body = await request.json();
    const { email, password } = body;
    
    if (!email || !password) {
      return NextResponse.json({
        error: 'メールアドレスとパスワードが必要です',
      }, { status: 400 });
    }
    
    console.warn('📧 ログイン試行:', email);
    
    // signIn関数を直接呼び出してテスト
    // ※ このアプローチは通常推奨されませんが、デバッグ目的で使用
    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);
    
    // セッション確認（ログイン前）
    const sessionBefore = await auth();
    console.warn('📊 ログイン前のセッション:', sessionBefore);
    
    // ログイン試行の結果を返す
    const result = {
      timestamp: new Date().toISOString(),
      email: email,
      sessionBefore: {
        exists: !!sessionBefore,
        user: sessionBefore?.user || null,
      },
      message: 'ログインテストを実行しました。/api/debug/sessionでセッション状態を確認してください。',
      nextSteps: [
        '1. ブラウザで /api/debug/session にアクセス',
        '2. セッションが作成されているか確認',
        '3. /dashboard に手動でアクセスしてみる',
      ],
    };
    
    console.warn('🎯 テストログイン結果:', result);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ テストログインエラー:', error);
    return NextResponse.json({
      error: 'テストログイン中にエラーが発生しました',
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}