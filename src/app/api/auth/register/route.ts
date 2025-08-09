import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb-local';
import User from '@/lib/models/User';
import { getEmailService } from '@/lib/email/mailer-fixed';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

// 入力検証スキーマ
const registerSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string()
    .min(8, 'パスワードは8文字以上である必要があります')
    .regex(/[A-Z]/, 'パスワードには大文字を含める必要があります')
    .regex(/[a-z]/, 'パスワードには小文字を含める必要があります')
    .regex(/[0-9]/, 'パスワードには数字を含める必要があります'),
  name: z.string()
    .min(2, '名前は2文字以上である必要があります')
    .max(50, '名前は50文字以内である必要があります'),
});

export async function POST(request: NextRequest) {
  try {
    // リクエストボディの取得
    const body = await request.json().catch(() => null);
    
    if (!body) {
      return NextResponse.json(
        { error: '無効なリクエストです' },
        { status: 400 }
      );
    }

    // 入力検証
    const validationResult = registerSchema.safeParse(body);
    
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map(issue => issue.message);
      return NextResponse.json(
        { error: errors.join(', ') },
        { status: 400 }
      );
    }

    const { email, password, name } = validationResult.data;

    // データベース接続
    try {
      await connectDB();
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return NextResponse.json(
        { error: 'データベース接続エラーが発生しました' },
        { status: 500 }
      );
    }

    // 既存ユーザーのチェック
    try {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      
      if (existingUser) {
        // より親切なエラーメッセージ
        return NextResponse.json(
          { 
            error: 'このメールアドレスは既に登録されています',
            suggestion: '別のメールアドレスを使用するか、ログインページからログインしてください',
            actionLink: '/auth/signin'
          },
          { status: 400 }
        );
      }
    } catch (dbError) {
      console.error('User lookup error:', dbError);
      return NextResponse.json(
        { 
          error: 'データベース接続エラーが発生しました',
          suggestion: 'しばらく時間をおいてから再度お試しください。問題が続く場合はサポートまでお問い合わせください'
        },
        { status: 500 }
      );
    }

    // メール確認トークンの生成
    const emailVerificationToken = uuidv4();
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 24); // 24時間有効
    
    console.log('📝 トークン生成:', {
      token: emailVerificationToken,
      expiry: tokenExpiry.toISOString(),
      now: new Date().toISOString()
    });

    // 新規ユーザーの作成
    let user;
    try {
      user = new User({
        email: email.toLowerCase(),
        password,
        name: name.trim(),
        emailVerificationToken,
        emailVerificationTokenExpiry: tokenExpiry,
      });

      await user.save();
    } catch (saveError) {
      console.error('User save error:', saveError);
      
      // MongoDBのエラーハンドリング
      if ((saveError as { code?: number }).code === 11000) {
        return NextResponse.json(
          { 
            error: 'このメールアドレスは既に使用されています',
            suggestion: 'パスワードをお忘れの場合は、パスワードリセット機能をご利用ください',
            actionLink: '/auth/signin'
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'ユーザー登録中にエラーが発生しました',
          suggestion: '入力内容を確認して再度お試しください'
        },
        { status: 500 }
      );
    }

    // 確認メールの送信
    try {
      // 実際のリクエストヘッダーからホスト情報を取得
      const host = request.headers.get('host');
      const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
      const baseUrl = host ? `${protocol}://${host}` : (process.env.NEXTAUTH_URL || 'http://localhost:3000');
      const verificationUrl = `${baseUrl}/auth/verify-email?token=${emailVerificationToken}`;
      
      // 新しいメールサービスを使用
      const emailService = getEmailService();
      const emailResult = await emailService.sendVerificationEmail(email, {
        userName: name,
        verificationUrl: verificationUrl,
      });

      if (!emailResult.success) {
        // メール送信失敗時、ユーザーは作成されているが通知
        console.error('Email send failed:', emailResult);
        
        // ユーザーを削除するか、フラグを立てる
        await User.findByIdAndUpdate(user._id, {
          emailSendFailed: true
        });
        
        return NextResponse.json(
          { 
            warning: '登録は完了しましたが、確認メールの送信に失敗しました。サポートにお問い合わせください。',
            userId: user._id.toString()
          },
          { status: 201 }
        );
      }

      console.log('✅ 確認メール送信成功:', emailResult.messageId);
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      
      // メール送信エラーでもユーザーは作成されている
      return NextResponse.json(
        { 
          warning: '登録は完了しましたが、確認メールの送信に問題が発生しました。',
          userId: user._id.toString()
        },
        { status: 201 }
      );
    }

    // 成功レスポンス
    return NextResponse.json(
      { 
        message: '登録が完了しました。メールを確認してアカウントを有効化してください。',
        success: true
      },
      { status: 201 }
    );

  } catch (error) {
    // 予期しないエラーのキャッチ
    console.error('Unexpected registration error:', error);
    
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました。時間をおいて再度お試しください。' },
      { status: 500 }
    );
  }
}

// レート制限のためのオプション（実装は別途必要）
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';