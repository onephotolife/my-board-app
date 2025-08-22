import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

/**
 * 投稿編集保護レイアウト
 * サーバーコンポーネント認証 - 25人天才エンジニア会議による実装
 * 
 * セキュリティ機能:
 * 1. サーバーサイド認証チェック（初期レンダリング時）
 * 2. メール確認状態の検証
 * 3. 未認証時の適切なリダイレクト処理
 * 4. callbackUrl機能による優れたUX
 * 5. 投稿編集権限の確認（コンポーネントレベルで実装済み）
 */
export default async function EditPostLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  console.log('🛡️ [Server] 投稿編集 サーバーサイド認証チェック開始:', params.id);
  
  try {
    // NextAuth v5 サーバーサイド認証チェック
    const session = await auth();
    
    console.log('🔍 [Server] セッション状態:', {
      hasSession: !!session,
      userId: session?.user?.id,
      email: session?.user?.email,
      emailVerified: session?.user?.emailVerified,
      postId: params.id,
      timestamp: new Date().toISOString()
    });
    
    // 未認証チェック
    if (!session || !session.user) {
      console.log('🚫 [Server] 未認証のためログインページへリダイレクト');
      const callbackUrl = encodeURIComponent(`/posts/${params.id}/edit`);
      redirect(`/auth/signin?callbackUrl=${callbackUrl}`);
    }
    
    // メール確認チェック（会員制掲示板として必須）
    if (!session.user.emailVerified) {
      console.log('📧 [Server] メール未確認のため確認ページへリダイレクト');
      redirect('/auth/email-not-verified');
    }
    
    console.log('✅ [Server] 投稿編集 サーバーサイド認証成功');
    
    // 認証済みの場合、子コンポーネントをレンダリング
    // 投稿所有権の確認は既存のクライアントコンポーネントで実装済み
    return (
      <>
        {children}
      </>
    );
    
  } catch (error) {
    console.error('💥 [Server] 投稿編集認証エラー:', error);
    
    // エラー時は安全側に倒してログインページへリダイレクト
    const callbackUrl = encodeURIComponent(`/posts/${params.id}/edit`);
    redirect(`/auth/signin?callbackUrl=${callbackUrl}`);
  }
}