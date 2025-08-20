import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUnifiedSession, getUserFromSession } from '@/lib/auth/session-helper';
import { UserRole, Permission } from './types';
import { canPerformAction, hasPermission } from './utils';
import User from '@/lib/models/User';
import Post from '@/lib/models/Post';
import connectDB from '@/lib/mongodb';
import { checkPermissionWithCache } from '@/lib/cache/permission-cache';

/**
 * 認証チェック（統合セッションヘルパー使用）
 */
export async function requireAuth(req: NextRequest) {
  const session = await getUnifiedSession(req);
  
  if (!session?.user) {
    return NextResponse.json(
      { error: '認証が必要です' },
      { status: 401 }
    );
  }
  
  return session;
}

/**
 * ユーザーロール取得
 */
export async function getUserRole(userId: string): Promise<UserRole> {
  try {
    await connectDB();
    const user = await User.findById(userId).select('role');
    return user?.role || UserRole.USER;
  } catch (error) {
    console.error('Error fetching user role:', error);
    return UserRole.USER;
  }
}

/**
 * 権限チェックミドルウェア（キャッシュ付き）
 */
export async function checkPermission(
  userId: string,
  permission: Permission,
  resourceOwnerId?: string
): Promise<boolean> {
  return checkPermissionWithCache(
    userId,
    permission,
    async () => {
      const role = await getUserRole(userId);
      
      return canPerformAction({
        userId,
        role,
        resourceOwnerId,
        permission
      });
    },
    resourceOwnerId
  );
}

/**
 * 投稿の所有者チェック
 */
export async function checkPostOwnership(
  postId: string,
  userId: string
): Promise<{ isOwner: boolean; post: any }> {
  try {
    await connectDB();
    const post = await Post.findById(postId);
    
    if (!post) {
      return { isOwner: false, post: null };
    }
    
    const isOwner = post.author.toString() === userId;
    return { isOwner, post };
  } catch (error) {
    console.error('Error checking post ownership:', error);
    return { isOwner: false, post: null };
  }
}

/**
 * APIルート用権限チェックヘルパー
 */
export async function withPermission(
  req: NextRequest,
  permission: Permission,
  handler: (session: any, role: UserRole) => Promise<NextResponse>
): Promise<NextResponse> {
  // 認証チェック
  const session = await requireAuth(req);
  if (session instanceof NextResponse) {
    return session;
  }
  
  // ユーザー情報取得
  await connectDB();
  
  // テストトークンの場合はIDから検索
  let user;
  if (session.user.id && !session.user.email) {
    user = await User.findById(session.user.id);
  } else {
    user = await User.findOne({ email: session.user.email });
  }
  
  if (!user) {
    return NextResponse.json(
      { error: 'ユーザーが見つかりません' },
      { status: 404 }
    );
  }
  
  const role = user.role || UserRole.USER;
  
  // 権限チェック
  if (!hasPermission(role, permission)) {
    return NextResponse.json(
      { error: 'この操作を実行する権限がありません' },
      { status: 403 }
    );
  }
  
  // ハンドラー実行
  return handler(session, role);
}

/**
 * リソース所有者用権限チェックヘルパー
 */
export async function withResourcePermission(
  req: NextRequest,
  permission: Permission,
  getResourceOwnerId: (req: NextRequest) => Promise<string | null>,
  handler: (session: any, role: UserRole, isOwner: boolean) => Promise<NextResponse>
): Promise<NextResponse> {
  // 認証チェック
  const session = await requireAuth(req);
  if (session instanceof NextResponse) {
    return session;
  }
  
  // ユーザー情報取得
  await connectDB();
  
  // テストトークンの場合はIDから検索
  let user;
  if (session.user.id && !session.user.email) {
    user = await User.findById(session.user.id);
  } else {
    user = await User.findOne({ email: session.user.email });
  }
  
  if (!user) {
    return NextResponse.json(
      { error: 'ユーザーが見つかりません' },
      { status: 404 }
    );
  }
  
  const role = user.role || UserRole.USER;
  const userId = user._id.toString();
  
  // リソース所有者ID取得
  const resourceOwnerId = await getResourceOwnerId(req);
  
  if (!resourceOwnerId) {
    return NextResponse.json(
      { error: 'リソースが見つかりません' },
      { status: 404 }
    );
  }
  
  // 権限チェック
  const hasAccess = canPerformAction({
    userId,
    role,
    resourceOwnerId,
    permission
  });
  
  if (!hasAccess) {
    return NextResponse.json(
      { error: 'この操作を実行する権限がありません' },
      { status: 403 }
    );
  }
  
  const isOwner = userId === resourceOwnerId;
  
  // ハンドラー実行
  return handler(session, role, isOwner);
}