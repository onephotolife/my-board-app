import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { generateEmailVerificationToken, generateTokenExpiry } from '@/lib/utils/token-generator';
import { connectDB } from '@/lib/db/mongodb-local';
import User from '@/lib/models/User';
import { getEmailService } from '@/lib/email/mailer-fixed';
import { passwordSchema, checkPasswordStrengthSync, PasswordStrength } from '@/lib/utils/password-validation';

// 入力検証スキーマ
const registerSchema = z.object({
  email: z.string()
    .email('有効なメールアドレスを入力してください')
    .max(255, 'メールアドレスが長すぎます')
    .transform(email => email.toLowerCase().trim()),
  password: passwordSchema,
  name: z.string()
    .min(2, '名前は2文字以上である必要があります')
    .max(50, '名前は50文字以内である必要があります')
    .transform(name => name.trim()),
});

// レート制限設定
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15分
const RATE_LIMIT_MAX_ATTEMPTS = 5; // 最大5回

function checkRateLimit(clientIp: string): { allowed: boolean; resetTime?: number } {
  const now = Date.now();
  const clientData = rateLimitMap.get(clientIp);

  if (!clientData) {
    rateLimitMap.set(clientIp, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }

  if (now > clientData.resetTime) {
    rateLimitMap.set(clientIp, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }

  if (clientData.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    return { allowed: false, resetTime: clientData.resetTime };
  }

  clientData.count += 1;
  return { allowed: true };
}

// 古いエントリをクリーンアップ
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of rateLimitMap.entries()) {
    if (now > data.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000); // 5分ごとにクリーンアップ

export async function POST(request: NextRequest) {
  let user: any = null;
  
  try {
    // IPアドレス取得（レート制限用）
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                    request.headers.get('x-real-ip') || 
                    'unknown';

    // テストモードチェック（開発環境のみ）
    const isTestMode = process.env.NODE_ENV === 'development' && 
                      request.headers.get('x-test-mode') === 'true';

    // レート制限チェック（テストモードの場合はスキップ）
    if (!isTestMode) {
      const rateLimitCheck = checkRateLimit(clientIp);
      if (!rateLimitCheck.allowed) {
        const remainingTime = Math.ceil((rateLimitCheck.resetTime! - Date.now()) / 60000);
        return NextResponse.json(
          { 
            error: `登録の試行回数が多すぎます。${remainingTime}分後に再試行してください。`,
            type: 'RATE_LIMIT',
          },
          { status: 429 }
        );
      }
    }

    // リクエストボディの取得
    let body;
    try {
      body = await request.json();
    } catch (error) {
      console.error('JSON parse error:', error);
      return NextResponse.json(
        { 
          error: '無効なリクエストです',
          type: 'INVALID_REQUEST',
          details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
        },
        { status: 400 }
      );
    }
    
    if (!body) {
      return NextResponse.json(
        { 
          error: '空のリクエストです',
          type: 'EMPTY_REQUEST',
        },
        { status: 400 }
      );
    }

    // 入力検証
    const validationResult = registerSchema.safeParse(body);
    
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map(issue => issue.message);
      return NextResponse.json(
        { 
          error: errors[0], // 最初のエラーのみ表示
          errors: errors, // 全エラーのリスト
          type: 'VALIDATION',
        },
        { status: 400 }
      );
    }

    const { email, password, name } = validationResult.data;

    // パスワード強度チェック
    const passwordStrength = checkPasswordStrengthSync(password, [name, email]);
    if (passwordStrength.score < PasswordStrength.FAIR) {
      return NextResponse.json(
        { 
          error: 'パスワードが弱すぎます',
          suggestion: 'より強力なパスワードを設定してください。大文字、小文字、数字、特殊文字を組み合わせ、8文字以上にしてください。',
          passwordFeedback: passwordStrength.feedback,
          type: 'WEAK_PASSWORD',
        },
        { status: 400 }
      );
    }

    // データベース接続
    try {
      await connectDB();
      console.log('✅ 登録API: MongoDB接続成功');
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return NextResponse.json(
        { 
          error: 'データベース接続エラーが発生しました',
          suggestion: 'しばらく時間をおいてから再度お試しください',
          type: 'DATABASE_ERROR',
        },
        { status: 500 }
      );
    }

    // 既存ユーザーのチェック（大文字小文字を区別しない）
    try {
      const existingUser = await User.findOne({ 
        email: { $regex: new RegExp(`^${email}$`, 'i') }
      });
      
      if (existingUser) {
        // セキュリティのため、詳細な情報は提供しない
        return NextResponse.json(
          { 
            error: 'このメールアドレスは既に登録されています',
            suggestion: '別のメールアドレスを使用するか、パスワードをお忘れの場合はパスワードリセット機能をご利用ください',
            actionLink: '/auth/signin',
            type: 'EMAIL_EXISTS',
          },
          { status: 400 }
        );
      }
    } catch (dbError) {
      console.error('User lookup error:', dbError);
      return NextResponse.json(
        { 
          error: 'データベースエラーが発生しました',
          suggestion: 'しばらく時間をおいてから再度お試しください',
          type: 'DATABASE_ERROR',
        },
        { status: 500 }
      );
    }

    // メール確認トークンの生成（改善版：256ビットのエントロピー）
    const emailVerificationToken = generateEmailVerificationToken();
    const tokenExpiry = generateTokenExpiry(24); // 24時間有効
    
    console.log('📝 トークン生成:', {
      token: emailVerificationToken,
      expiry: tokenExpiry.toISOString(),
      email: email,
    });

    // 新規ユーザーの作成
    try {
      user = new User({
        email: email,
        password: password, // bcryptによるハッシュ化はモデルで自動実行
        name: name,
        emailVerificationToken,
        emailVerificationTokenExpiry: tokenExpiry,
        emailVerified: false,
      });

      await user.save();
      console.log('✅ ユーザー作成成功:', email);
    } catch (saveError: any) {
      console.error('User save error:', saveError);
      
      // MongoDBの重複キーエラー
      if (saveError.code === 11000) {
        return NextResponse.json(
          { 
            error: 'このメールアドレスは既に使用されています',
            suggestion: 'パスワードをお忘れの場合は、パスワードリセット機能をご利用ください',
            actionLink: '/auth/signin',
            type: 'EMAIL_EXISTS',
          },
          { status: 400 }
        );
      }
      
      // バリデーションエラー
      if (saveError.name === 'ValidationError') {
        const messages = Object.values(saveError.errors).map((err: any) => err.message);
        return NextResponse.json(
          { 
            error: messages[0] || '入力内容にエラーがあります',
            errors: messages,
            type: 'VALIDATION',
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'ユーザー登録中にエラーが発生しました',
          suggestion: '入力内容を確認して再度お試しください',
          type: 'SAVE_ERROR',
        },
        { status: 500 }
      );
    }

    // 確認メールの送信
    try {
      // リクエストヘッダーからホスト情報を取得
      const host = request.headers.get('host');
      const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
      const baseUrl = host ? `${protocol}://${host}` : (process.env.NEXTAUTH_URL || 'http://localhost:3000');
      const verificationUrl = `${baseUrl}/auth/verify-email?token=${emailVerificationToken}`;
      
      // メール送信（正しい引数の順序で）
      const emailService = getEmailService();
      const emailResult = await emailService.sendVerificationEmail(
        email,  // 第1引数: 宛先メールアドレス
        {
          userName: name,
          verificationUrl: verificationUrl,
        }
      );

      if (!emailResult.success) {
        console.error('Email send failed:', emailResult);
        
        // メール送信失敗時、ユーザーにフラグを立てる
        await User.findByIdAndUpdate(user._id, {
          emailSendFailed: true,
        });
        
        return NextResponse.json(
          { 
            message: '登録は完了しましたが、確認メールの送信に失敗しました',
            warning: 'サポートにお問い合わせいただくか、後ほど再送信してください',
            userId: user._id,
            type: 'EMAIL_SEND_FAILED',
          },
          { status: 201 }
        );
      }

      console.log('✅ 確認メール送信成功:', email);

      // 成功レスポンス
      return NextResponse.json(
        { 
          message: '登録が完了しました！確認メールをご確認ください。',
          success: true,
          email: email,
          nextStep: 'メールボックスを確認し、確認リンクをクリックしてアカウントを有効化してください。',
        },
        { status: 201 }
      );

    } catch (emailError) {
      console.error('❌ メール送信エラー詳細:', {
        error: emailError instanceof Error ? emailError.message : emailError,
        stack: emailError instanceof Error ? emailError.stack : undefined,
        code: (emailError as any)?.code,
        type: (emailError as any)?.type,
        cause: (emailError as any)?.cause,
      });
      
      // メール送信エラーでもユーザー登録は成功しているので、適切に処理
      await User.findByIdAndUpdate(user._id, {
        emailSendFailed: true,
      });
      
      // エラーの種類に応じたメッセージ
      let errorDetail = '確認メールの送信に問題が発生しました';
      if (emailError instanceof Error) {
        if (emailError.message.includes('AUTH') || emailError.message.includes('authentication')) {
          errorDetail = 'メールサーバーの認証エラーが発生しました';
        } else if (emailError.message.includes('ECONNREFUSED') || emailError.message.includes('ETIMEDOUT')) {
          errorDetail = 'メールサーバーに接続できませんでした';
        }
      }
      
      return NextResponse.json(
        { 
          message: '登録は完了しましたが、' + errorDetail,
          warning: 'サポートにお問い合わせいただくか、後ほど確認メールを再送信してください',
          userId: user._id,
          type: 'EMAIL_ERROR',
          debugInfo: process.env.NODE_ENV === 'development' ? {
            errorMessage: emailError instanceof Error ? emailError.message : String(emailError),
            errorType: (emailError as any)?.type,
          } : undefined,
        },
        { status: 201 }
      );
    }

  } catch (error) {
    console.error('❌ 登録APIエラー:', error);
    
    // ユーザーが作成されていた場合は削除
    if (user && user._id) {
      try {
        await User.findByIdAndDelete(user._id);
        console.log('ロールバック: ユーザー削除完了');
      } catch (rollbackError) {
        console.error('ロールバックエラー:', rollbackError);
      }
    }
    
    return NextResponse.json(
      { 
        error: 'サーバーエラーが発生しました',
        suggestion: 'しばらく時間をおいてから再度お試しください',
        type: 'SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}

// その他のHTTPメソッドは許可しない
export async function GET() {
  return NextResponse.json(
    { error: 'メソッドが許可されていません', type: 'METHOD_NOT_ALLOWED' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'メソッドが許可されていません', type: 'METHOD_NOT_ALLOWED' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'メソッドが許可されていません', type: 'METHOD_NOT_ALLOWED' },
    { status: 405 }
  );
}