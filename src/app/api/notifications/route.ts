import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

import { connectDB } from '@/lib/db/mongodb-local';
import Notification from '@/lib/models/Notification';
import type { AuthUser } from '@/lib/middleware/auth';
import { createErrorResponse } from '@/lib/middleware/auth';
import { verifyCSRFToken } from '@/lib/security/csrf';

// 認証チェックヘルパー
async function getAuthenticatedUser(req: NextRequest): Promise<AuthUser | null> {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || 'blankinai-member-board-secret-key-2024-production',
      secureCookie: process.env.NODE_ENV === 'production',
      cookieName: process.env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.session-token' 
        : 'next-auth.session-token'
    });

    console.log('[NOTIFICATION-AUTH-DEBUG] Token validation:', {
      hasToken: !!token,
      environment: process.env.NODE_ENV,
      secureCookie: process.env.NODE_ENV === 'production',
      timestamp: new Date().toISOString()
    });

    if (!token) {
      console.log('[NOTIFICATION-AUTH-DEBUG] No token found');
      return null;
    }

    // メール確認チェック
    if (!token.emailVerified) {
      console.log('[NOTIFICATION-AUTH-DEBUG] Email not verified');
      return null;
    }

    return {
      id: token.id as string || token.sub as string,
      email: token.email as string,
      name: token.name as string,
      emailVerified: true,
    };
  } catch (error) {
    console.error('[NOTIFICATION-AUTH-ERROR] Authentication check failed:', error);
    return null;
  }
}

// GET: 通知一覧取得（認証必須）
export async function GET(req: NextRequest) {
  try {
    // 認証チェック
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return createErrorResponse('認証が必要です', 401, 'UNAUTHORIZED');
    }

    console.log('[NOTIFICATION-API-DEBUG] Fetching notifications for user:', {
      userId: user.id,
      userEmail: user.email,
      timestamp: new Date().toISOString()
    });

    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const isRead = searchParams.get('isRead') === 'true' ? true : 
                   searchParams.get('isRead') === 'false' ? false : undefined;

    // バリデーション
    if (page < 1) {
      return createErrorResponse('無効なページ番号です', 400, 'INVALID_PAGE');
    }

    // キャッシュヘッダー設定
    const headers = new Headers();
    headers.set('Cache-Control', 'private, max-age=0, must-revalidate');
    headers.set('X-Content-Type-Options', 'nosniff');

    await connectDB();

    // 並列実行で高速化
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.findByRecipient(user.id, page, limit, isRead),
      Notification.countDocuments({ 
        recipient: user.id,
        ...(isRead !== undefined ? { isRead } : {})
      }),
      Notification.countUnread(user.id)
    ]);

    console.log('[NOTIFICATION-SUCCESS] Notifications fetched:', {
      userId: user.id,
      count: notifications.length,
      total,
      unreadCount,
      page,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      data: {
        notifications: notifications.map(n => n.toJSON()),
        unreadCount,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasMore: page * limit < total
        }
      }
    }, { headers });

  } catch (error) {
    console.error('[NOTIFICATION-ERROR] Failed to fetch notifications:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    return createErrorResponse('通知の取得に失敗しました', 500, 'FETCH_ERROR');
  }
}

// POST: 通知の既読マーク（認証必須・CSRF必須）
export async function POST(req: NextRequest) {
  try {
    // 認証チェック
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return createErrorResponse('認証が必要です', 401, 'UNAUTHORIZED');
    }

    // CSRFトークン検証
    const isValidCSRF = await verifyCSRFToken(req);
    if (!isValidCSRF) {
      console.error('[CSRF-ERROR] CSRF token validation failed', {
        userId: user.id,
        userEmail: user.email,
        timestamp: new Date().toISOString()
      });
      return createErrorResponse('CSRFトークンが無効です', 403, 'CSRF_VALIDATION_FAILED');
    }

    // リクエストボディの取得
    let body;
    try {
      body = await req.json();
    } catch (jsonError) {
      return createErrorResponse('無効なJSONリクエスト', 400, 'INVALID_JSON');
    }

    await connectDB();

    let result;
    
    if (body.notificationIds && Array.isArray(body.notificationIds)) {
      // 特定の通知を既読にする
      const validIds = body.notificationIds.filter((id: string) => 
        /^[0-9a-fA-F]{24}$/.test(id)
      );
      
      if (validIds.length === 0) {
        return createErrorResponse('有効な通知IDが指定されていません', 400, 'INVALID_IDS');
      }
      
      result = await Notification.markAsRead(validIds, user.id);
      
      console.log('[NOTIFICATION-SUCCESS] Marked as read:', {
        userId: user.id,
        notificationIds: validIds,
        updatedCount: result.modifiedCount,
        timestamp: new Date().toISOString()
      });
      
    } else {
      // 全て既読にする
      result = await Notification.markAllAsRead(user.id);
      
      console.log('[NOTIFICATION-SUCCESS] Marked all as read:', {
        userId: user.id,
        updatedCount: result.modifiedCount,
        timestamp: new Date().toISOString()
      });
    }

    // 最新の未読数を取得
    const unreadCount = await Notification.countUnread(user.id);

    return NextResponse.json({
      success: true,
      data: {
        updatedCount: result.modifiedCount,
        unreadCount
      },
      message: '通知を既読にしました'
    });

  } catch (error) {
    console.error('[NOTIFICATION-ERROR] Failed to mark as read:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    return createErrorResponse('既読処理に失敗しました', 500, 'UPDATE_ERROR');
  }
}