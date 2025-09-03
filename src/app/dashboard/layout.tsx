import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

import { authOptions } from '@/lib/auth';

/**
 * ダッシュボード保護レイアウト
 * サーバーコンポーネント認証 - 25人天才エンジニア会議による実装
 * 
 * セキュリティ機能:
 * 1. サーバーサイド認証チェック（初期レンダリング時）
 * 2. メール確認状態の検証
 * 3. 未認証時の適切なリダイレクト処理
 * 4. callbackUrl機能による優れたUX
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  console.warn('🛡️ [Server] ダッシュボード サーバーサイド認証チェック開始');
  
  try {
    // NextAuth v4 サーバーサイド認証チェック
    const session = await getServerSession(authOptions);
    
    console.warn('🔍 [Server] セッション状態:', {
      hasSession: !!session,
      userId: session?.user?.id,
      email: session?.user?.email,
      emailVerified: session?.user?.emailVerified,
      timestamp: new Date().toISOString()
    });
    
    // 未認証チェック
    if (!session || !session.user) {
      console.warn('🚫 [Server] 未認証のためログインページへリダイレクト');
      redirect('/auth/signin?callbackUrl=%2Fdashboard');
    }
    
    // メール確認チェック（会員制掲示板として必須）
    if (!session.user.emailVerified) {
      console.warn('📧 [Server] メール未確認のため確認ページへリダイレクト');
      redirect('/auth/email-not-verified');
    }
    
    console.warn('✅ [Server] ダッシュボード サーバーサイド認証成功');
    
    // 認証済みの場合、子コンポーネントをレンダリング
    return (
      <>
        {children}
      </>
    );
    
  } catch (error) {
    console.error('💥 [Server] ダッシュボード認証エラー:', error);
    
    // エラー時は安全側に倒してログインページへリダイレクト
    redirect('/auth/signin?callbackUrl=%2Fdashboard');
  }
}