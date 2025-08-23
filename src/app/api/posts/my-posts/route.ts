import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { connectDB } from '@/lib/db/mongodb-local';
import Post from '@/lib/models/Post';
import { createErrorResponse } from '@/lib/middleware/auth';

// GET: 自分の投稿のみ取得
export async function GET(req: NextRequest) {
  try {
    // 認証チェック
    const token = await getToken({
      req,
      secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'blankinai-member-board-secret-key-2024-production',
    });

    console.log('🔍 [API] /my-posts 認証トークン確認:', {
      hasToken: !!token,
      userId: token?.id || token?.sub,
      email: token?.email,
      emailVerified: token?.emailVerified,
    });

    if (!token) {
      return createErrorResponse('認証が必要です', 401, 'UNAUTHORIZED');
    }

    if (!token.emailVerified) {
      return createErrorResponse('メールアドレスの確認が必要です', 403, 'EMAIL_NOT_VERIFIED');
    }

    const userId = token.id || token.sub;
    const userEmail = token.email;

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

    console.log(`📊 [API] /my-posts 取得結果: ${posts.length}件の投稿`);

    // 権限情報といいね数を追加
    const postsWithPermissions = posts.map((post: any) => ({
      ...post,
      canEdit: true,  // 自分の投稿なので編集可能
      canDelete: true, // 自分の投稿なので削除可能
      likeCount: post.likes?.length || 0, // いいね数を計算
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