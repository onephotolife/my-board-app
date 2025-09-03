import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db/mongodb-local';
import Post from '@/lib/models/Post';
import { createErrorResponse } from '@/lib/middleware/auth';

// GET: 自分の投稿のみ取得
export async function GET(req: NextRequest) {
  try {
    // デバッグ: ヘッダー確認
    const cookieHeader = req.headers.get('cookie');
    console.warn('🍪 [API Debug] リクエストヘッダー:', {
      cookie: cookieHeader,
      hasCookie: !!cookieHeader,
      cookiePreview: cookieHeader ? cookieHeader.substring(0, 100) + '...' : 'なし',
      timestamp: new Date().toISOString(),
    });
    
    // 手動でCookieから認証トークンを探す
    if (cookieHeader) {
      const hasSessionToken = cookieHeader.includes('next-auth.session-token');
      const hasSecureToken = cookieHeader.includes('__Secure-next-auth.session-token');
      console.warn('🔎 [API Debug] セッショントークン検出:', {
        hasSessionToken,
        hasSecureToken,
        env: process.env.NODE_ENV,
      });
    }
    
    // App Router対応: getServerSessionを使用
    console.warn('🔧 [API Debug] getServerSession呼び出し開始...');
    const session = await getServerSession(authOptions);
    
    console.warn('🔍 [API] /my-posts セッション確認:', {
      hasSession: !!session,
      userId: session?.user?.id,
      email: session?.user?.email,
      emailVerified: session?.user?.emailVerified,
      name: session?.user?.name,
      timestamp: new Date().toISOString(),
    });

    if (!session || !session.user) {
      console.warn('❌ [API] セッションが見つかりません');
      return createErrorResponse('認証が必要です', 401, 'UNAUTHORIZED');
    }

    if (!session.user.emailVerified) {
      console.warn('❌ [API] メール未確認');
      return createErrorResponse('メールアドレスの確認が必要です', 403, 'EMAIL_NOT_VERIFIED');
    }

    const userId = session.user.id;
    const userEmail = session.user.email;

    if (!userId) {
      return createErrorResponse('ユーザーIDが見つかりません', 400, 'USER_ID_NOT_FOUND');
    }

    await connectDB();

    // 自分の投稿のみを取得
    const query = {
      $or: [
        { 'author._id': userId },
        { 'author.email': userEmail }
      ]
    };

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .lean();

    console.warn(`📊 [API] /my-posts 取得結果: ${posts.length}件の投稿`);

    // 権限情報を追加
    const postsWithPermissions = posts.map((post: any) => ({
      ...post,
      canEdit: true,  // 自分の投稿なので編集可能
      canDelete: true, // 自分の投稿なので削除可能
    }));

    return NextResponse.json({
      success: true,
      data: postsWithPermissions,
      total: posts.length,
    });
  } catch (error) {
    console.error('自分の投稿取得エラー:', error);
    return createErrorResponse('投稿の取得に失敗しました', 500, 'FETCH_ERROR');
  }
}