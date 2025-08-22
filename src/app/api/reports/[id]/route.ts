import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getToken } from 'next-auth/jwt';
import { connectDB } from '@/lib/db/mongodb-local';
import Report from '@/lib/models/Report';
import Post from '@/lib/models/Post';
import User from '@/lib/models/User';
import { createErrorResponse, AuthUser } from '@/lib/middleware/auth';
import { broadcastEvent } from '@/lib/socket/socket-manager';

// 解決アクションのバリデーション
const resolveReportSchema = z.object({
  status: z.enum(['resolved', 'dismissed']),
  action: z.enum(['none', 'warning', 'delete', 'ban']).optional(),
  moderatorNotes: z.string().max(1000).optional(),
});

// モデレーター権限チェック
async function checkModeratorPermission(user: AuthUser): Promise<boolean> {
  const moderatorEmails = process.env.MODERATOR_EMAILS?.split(',') || [];
  return moderatorEmails.includes(user.email);
}

// GET: 個別通報詳細取得
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getToken({
      req,
      secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'blankinai-member-board-secret-key-2024-production',
    });

    if (!token || !token.emailVerified) {
      return createErrorResponse('認証が必要です', 401, 'UNAUTHORIZED');
    }

    const user: AuthUser = {
      id: token.id as string || token.sub as string,
      email: token.email as string,
      name: token.name as string,
      emailVerified: true,
    };

    const { id } = await params;
    
    await connectDB();
    
    const report = await Report.findById(id)
      .populate('postId', 'title content author status createdAt');
    
    if (!report) {
      return createErrorResponse('通報が見つかりません', 404, 'NOT_FOUND');
    }
    
    // 権限チェック: モデレーターまたは通報者本人
    const isModerator = await checkModeratorPermission(user);
    if (!isModerator && report.reportedBy._id !== user.id) {
      return createErrorResponse('この通報を閲覧する権限がありません', 403, 'FORBIDDEN');
    }
    
    return NextResponse.json({
      success: true,
      data: report,
      isModerator,
    });
  } catch (error) {
    console.error('通報詳細取得エラー:', error);
    return createErrorResponse('通報の取得に失敗しました', 500, 'FETCH_ERROR');
  }
}

// PATCH: 通報の解決（モデレーター用）
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getToken({
      req,
      secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'blankinai-member-board-secret-key-2024-production',
    });

    if (!token || !token.emailVerified) {
      return createErrorResponse('認証が必要です', 401, 'UNAUTHORIZED');
    }

    const user: AuthUser = {
      id: token.id as string || token.sub as string,
      email: token.email as string,
      name: token.name as string,
      emailVerified: true,
    };

    // モデレーター権限チェック
    const isModerator = await checkModeratorPermission(user);
    if (!isModerator) {
      return createErrorResponse('モデレーター権限が必要です', 403, 'FORBIDDEN');
    }

    const { id } = await params;
    const body = await req.json();
    const validatedData = resolveReportSchema.parse(body);

    await connectDB();

    const report = await Report.findById(id).populate('postId');
    if (!report) {
      return createErrorResponse('通報が見つかりません', 404, 'NOT_FOUND');
    }

    if (report.status !== 'pending' && report.status !== 'reviewing') {
      return createErrorResponse('この通報は既に処理済みです', 400, 'ALREADY_RESOLVED');
    }

    // 通報を更新
    report.status = validatedData.status;
    report.action = validatedData.action || 'none';
    report.moderatorNotes = validatedData.moderatorNotes;
    report.resolvedBy = {
      _id: user.id,
      name: user.name,
      email: user.email,
    };
    report.resolvedAt = new Date();

    await report.save();

    // アクションに応じた処理
    if (validatedData.action && validatedData.status === 'resolved') {
      const post = await Post.findById(report.postId);
      
      switch (validatedData.action) {
        case 'delete':
          if (post) {
            post.status = 'deleted';
            await post.save();
            
            broadcastEvent('post:deleted', {
              postId: post._id,
              reason: 'moderation',
            });
          }
          break;
          
        case 'ban':
          if (post) {
            // ユーザーをBANする
            const authorUser = await User.findById(post.author._id);
            if (authorUser) {
              authorUser.status = 'banned';
              authorUser.bannedAt = new Date();
              authorUser.bannedReason = `通報により: ${report.reason}`;
              await authorUser.save();
              
              broadcastEvent('user:banned', {
                userId: authorUser._id,
                reason: report.reason,
              });
            }
          }
          break;
          
        case 'warning':
          // 警告通知を送信
          if (post) {
            broadcastEvent('user:warning', {
              userId: post.author._id,
              postId: post._id,
              reason: report.reason,
            });
          }
          break;
      }
    }

    // モデレーション完了を通知
    broadcastEvent('report:resolved', {
      reportId: report._id,
      action: validatedData.action,
      status: validatedData.status,
    });

    return NextResponse.json({
      success: true,
      data: report,
      message: '通報が処理されました',
    });
  } catch (error) {
    console.error('通報解決エラー:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'バリデーションエラー',
            details: error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }
    
    return createErrorResponse('通報の処理に失敗しました', 500, 'UPDATE_ERROR');
  }
}

// DELETE: 通報の取り下げ（通報者本人のみ）
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getToken({
      req,
      secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'blankinai-member-board-secret-key-2024-production',
    });

    if (!token || !token.emailVerified) {
      return createErrorResponse('認証が必要です', 401, 'UNAUTHORIZED');
    }

    const user: AuthUser = {
      id: token.id as string || token.sub as string,
      email: token.email as string,
      name: token.name as string,
      emailVerified: true,
    };

    const { id } = await params;
    
    await connectDB();
    
    const report = await Report.findById(id);
    
    if (!report) {
      return createErrorResponse('通報が見つかりません', 404, 'NOT_FOUND');
    }
    
    // 通報者本人のみ取り下げ可能
    if (report.reportedBy._id !== user.id) {
      return createErrorResponse('この通報を取り下げる権限がありません', 403, 'FORBIDDEN');
    }
    
    // ペンディング状態のみ取り下げ可能
    if (report.status !== 'pending') {
      return createErrorResponse('処理中または処理済みの通報は取り下げできません', 400, 'CANNOT_WITHDRAW');
    }
    
    await report.deleteOne();
    
    return NextResponse.json({
      success: true,
      message: '通報が取り下げられました',
    });
  } catch (error) {
    console.error('通報取り下げエラー:', error);
    return createErrorResponse('通報の取り下げに失敗しました', 500, 'DELETE_ERROR');
  }
}