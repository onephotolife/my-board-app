import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

import { connectDB } from '@/lib/db/mongodb-local';
import Notification from '@/lib/models/Notification';
import notificationService from '@/lib/services/notificationService';
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

    console.log('[NOTIFICATION-DELETE-AUTH-DEBUG] Token validation:', {
      hasToken: !!token,
      environment: process.env.NODE_ENV,
      secureCookie: process.env.NODE_ENV === 'production',
      timestamp: new Date().toISOString()
    });

    if (!token) {
      console.log('[NOTIFICATION-DELETE-AUTH-DEBUG] No token found');
      return null;
    }

    // メール確認チェック
    if (!token.emailVerified) {
      console.log('[NOTIFICATION-DELETE-AUTH-DEBUG] Email not verified');
      return null;
    }

    return {
      id: token.id as string || token.sub as string,
      email: token.email as string,
      name: token.name as string,
      emailVerified: true,
    };
  } catch (error) {
    console.error('[NOTIFICATION-DELETE-AUTH-ERROR] Authentication check failed:', error);
    return null;
  }
}

// DELETE: 通知削除（認証必須・CSRF必須）
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
        notificationId: await params.then(p => p.id),
        timestamp: new Date().toISOString()
      });
      return createErrorResponse('CSRFトークンが無効です', 403, 'CSRF_VALIDATION_FAILED');
    }

    const { id } = await params;

    // パラメータバリデーション
    if (!id) {
      return createErrorResponse('通知IDが必要です', 400, 'MISSING_NOTIFICATION_ID');
    }

    // ObjectId形式チェック
    const objectIdPattern = /^[0-9a-fA-F]{24}$/;
    if (!objectIdPattern.test(id)) {
      return createErrorResponse('無効な通知IDフォーマットです', 400, 'INVALID_NOTIFICATION_ID_FORMAT');
    }

    await connectDB();

    // 通知削除（ソフトデリート）
    const deleted = await notificationService.deleteNotification(id, user.id);

    if (!deleted) {
      return createErrorResponse('通知が見つかりません', 404, 'NOT_FOUND');
    }

    // 最新の未読数を取得
    const unreadCount = await Notification.countUnread(user.id);

    console.log('[NOTIFICATION-DELETE-SUCCESS] Notification deleted:', {
      notificationId: id,
      userId: user.id,
      unreadCount,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      data: {
        deleted: true,
        unreadCount
      },
      message: '通知を削除しました'
    });

  } catch (error) {
    console.error('[NOTIFICATION-DELETE-ERROR] Failed to delete notification:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    return createErrorResponse('通知の削除に失敗しました', 500, 'DELETE_ERROR');
  }
}