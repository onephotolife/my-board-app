import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/lib/auth';

/**
 * API認証エラーレスポンス
 * 25人天才エンジニア会議による標準化されたエラーハンドリング
 */
export class ApiAuthError extends Error {
  constructor(
    public code: 'UNAUTHORIZED' | 'EMAIL_NOT_VERIFIED' | 'FORBIDDEN',
    public status: number,
    public message: string
  ) {
    super(message);
    this.name = 'ApiAuthError';
  }
}

/**
 * 会員制掲示板用 - メール確認済みセッション必須チェック
 * 25人天才エンジニア会議による包括的セキュリティ実装
 * 
 * @returns Promise<Session> - 検証済みセッション
 * @throws ApiAuthError - 認証失敗時
 */
export async function requireEmailVerifiedSession() {
  console.warn('🔐 [API Security] メール確認済みセッションチェック開始');
  
  try {
    // NextAuth v4 セッション取得
    const session = await getServerSession(authOptions);
    
    console.warn('🔍 [API Security] セッション状態:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      email: session?.user?.email,
      emailVerified: session?.user?.emailVerified,
      timestamp: new Date().toISOString()
    });
    
    // 未認証チェック
    if (!session?.user?.email) {
      console.warn('❌ [API Security] 未認証のためアクセス拒否');
      throw new ApiAuthError(
        'UNAUTHORIZED',
        401,
        '認証が必要です'
      );
    }
    
    // メール確認チェック（会員制掲示板として必須）
    if (!session.user.emailVerified) {
      console.warn('📧 [API Security] メール未確認のためアクセス拒否');
      throw new ApiAuthError(
        'EMAIL_NOT_VERIFIED',
        403,
        'メール確認が必要です'
      );
    }
    
    console.warn('✅ [API Security] 認証成功:', session.user.email);
    return session;
    
  } catch (error) {
    if (error instanceof ApiAuthError) {
      throw error;
    }
    
    console.error('💥 [API Security] 認証エラー:', error);
    throw new ApiAuthError(
      'UNAUTHORIZED',
      500,
      '認証処理でエラーが発生しました'
    );
  }
}

/**
 * 基本認証チェック（メール確認不要）
 * ゲストモード許可のAPIエンドポイント用
 * 
 * @returns Promise<Session | null> - セッション（null許可）
 */
export async function getOptionalSession() {
  console.warn('🔓 [API Security] オプショナル認証チェック開始');
  
  try {
    const session = await getServerSession(authOptions);
    
    console.warn('🔍 [API Security] オプショナルセッション状態:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      email: session?.user?.email || null,
      emailVerified: session?.user?.emailVerified || null
    });
    
    return session;
    
  } catch (error) {
    console.error('💥 [API Security] オプショナル認証エラー:', error);
    return null;
  }
}

/**
 * APIエラーレスポンス作成ヘルパー
 * 
 * @param error - ApiAuthError
 * @returns NextResponse - 標準化されたエラーレスポンス
 */
export function createApiErrorResponse(error: ApiAuthError): NextResponse {
  console.warn(`🚫 [API Security] エラーレスポンス作成: ${error.code} - ${error.message}`);
  
  const response = {
    error: error.message,
    code: error.code,
    timestamp: new Date().toISOString()
  };
  
  // 本番環境では詳細なエラー情報を隠す
  if (process.env.NODE_ENV === 'production' && error.status === 500) {
    response.error = 'サーバーエラーが発生しました';
  }
  
  return NextResponse.json(response, { status: error.status });
}

/**
 * API認証ミドルウェア
 * HOF (Higher-Order Function) パターンでAPIハンドラーをラップ
 * 
 * @param handler - APIハンドラー関数
 * @param requireEmailVerified - メール確認必須フラグ（デフォルト: true）
 * @returns Promise<NextResponse> - 認証済みAPIレスポンス
 */
export function withApiAuth(
  handler: (req: NextRequest, session: any) => Promise<NextResponse>,
  requireEmailVerified = true
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      let session;
      
      if (requireEmailVerified) {
        session = await requireEmailVerifiedSession();
      } else {
        session = await getOptionalSession();
      }
      
      // 認証成功後、元のハンドラーを実行
      return await handler(req, session);
      
    } catch (error) {
      if (error instanceof ApiAuthError) {
        return createApiErrorResponse(error);
      }
      
      console.error('💥 [API Security] 予期しないエラー:', error);
      return createApiErrorResponse(new ApiAuthError(
        'UNAUTHORIZED',
        500,
        '予期しないエラーが発生しました'
      ));
    }
  };
}

/**
 * 管理者権限チェック
 * 
 * @param session - 認証済みセッション
 * @returns boolean - 管理者権限の有無
 */
export function hasAdminPermission(session: any): boolean {
  const isAdmin = session?.user?.role === 'admin';
  console.warn(`🔑 [API Security] 管理者権限チェック: ${isAdmin ? '✅' : '❌'}`);
  return isAdmin;
}

/**
 * モデレーター権限チェック
 * 
 * @param session - 認証済みセッション  
 * @returns boolean - モデレーター権限の有無
 */
export function hasModeratorPermission(session: any): boolean {
  const isModerator = session?.user?.role === 'moderator' || hasAdminPermission(session);
  console.warn(`🔑 [API Security] モデレーター権限チェック: ${isModerator ? '✅' : '❌'}`);
  return isModerator;
}