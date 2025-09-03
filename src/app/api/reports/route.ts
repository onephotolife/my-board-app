import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getToken } from 'next-auth/jwt';

import { connectDB } from '@/lib/db/mongodb-local';
import Report from '@/lib/models/Report';
import Post from '@/lib/models/Post';
import type { AuthUser } from '@/lib/middleware/auth';
import { createErrorResponse } from '@/lib/middleware/auth';
import { broadcastEvent } from '@/lib/socket/socket-manager';

// バリデーションスキーマ
const createReportSchema = z.object({
  postId: z.string().min(1, '投稿IDが必要です'),
  reason: z.enum(['spam', 'inappropriate', 'harassment', 'misinformation', 'other']),
  description: z.string()
    .min(10, '詳細な説明を入力してください（10文字以上）')
    .max(500, '説明は500文字以内にしてください'),
});

// GET: 通報一覧取得（モデレーター用）
export async function GET(req: NextRequest) {
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

    // TODO: モデレーター権限チェック
    // 現在は仮実装として、特定のメールアドレスをモデレーターとする
    const moderatorEmails = process.env.MODERATOR_EMAILS?.split(',') || [];
    const isModerator = moderatorEmails.includes(user.email);

    if (!isModerator) {
      // 一般ユーザーは自分の通報のみ取得可能
      await connectDB();
      const reports = await Report.find({ 'reportedBy._id': user.id })
        .populate('postId', 'title content author')
        .sort({ createdAt: -1 })
        .limit(10);

      return NextResponse.json({
        success: true,
        data: reports,
        isModerator: false,
      });
    }

    // モデレーターは全通報を取得可能
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status') || 'pending';
    const reason = searchParams.get('reason');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    await connectDB();

    const query: any = {};
    if (status !== 'all') {
      query.status = status;
    }
    if (reason) {
      query.reason = reason;
    }

    const skip = (page - 1) * limit;

    const [reports, total, stats] = await Promise.all([
      Report.find(query)
        .populate('postId', 'title content author status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Report.countDocuments(query),
      Report.getStatsByReason(),
    ]);

    return NextResponse.json({
      success: true,
      data: reports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats,
      isModerator: true,
    });
  } catch (error) {
    console.error('通報一覧取得エラー:', error);
    return createErrorResponse('通報の取得に失敗しました', 500, 'FETCH_ERROR');
  }
}

// POST: 新規通報作成
export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const validatedData = createReportSchema.parse(body);

    await connectDB();

    // 投稿の存在確認
    const post = await Post.findById(validatedData.postId);
    if (!post) {
      return createErrorResponse('投稿が見つかりません', 404, 'POST_NOT_FOUND');
    }

    // 自分の投稿は通報できない
    if (post.author._id === user.id) {
      return createErrorResponse('自分の投稿は通報できません', 400, 'CANNOT_REPORT_OWN_POST');
    }

    // 既存の通報チェック
    const existingReport = await Report.findOne({
      postId: validatedData.postId,
      'reportedBy._id': user.id,
    });

    if (existingReport) {
      return createErrorResponse('この投稿は既に通報済みです', 400, 'ALREADY_REPORTED');
    }

    // 通報作成
    const report = await Report.create({
      ...validatedData,
      reportedBy: {
        _id: user.id,
        name: user.name,
        email: user.email,
      },
    });

    // 自動フラグ処理
    const reportCount = await Report.countDocuments({ postId: validatedData.postId });
    
    // 3件以上の通報で自動フラグ
    if (reportCount >= 3) {
      post.status = 'flagged';
      await post.save();
      
      // Socket.ioで通知
      broadcastEvent('post:flagged', {
        postId: post._id,
        reportCount,
      });
    }

    // モデレーターに通知
    broadcastEvent('report:new', {
      report: report.toJSON(),
      post: {
        _id: post._id,
        title: post.title,
        author: post.author,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: report,
        message: '通報が送信されました',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('通報作成エラー:', error);
    
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
    
    return createErrorResponse('通報の作成に失敗しました', 500, 'CREATE_ERROR');
  }
}