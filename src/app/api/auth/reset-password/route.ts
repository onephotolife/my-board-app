import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import PasswordReset from '@/models/PasswordReset';
import { isPasswordReused, getPasswordReuseError, updatePasswordHistory, PASSWORD_HISTORY_LIMIT } from '@/lib/auth/password-validator';
import { logPasswordReuseAttempt, logPasswordResetSuccess } from '@/lib/security/audit-log';

// Validation Expert: Password strength validation schema for 2025 standards
const passwordSchema = z
  .string()
  .min(8, 'パスワードは8文字以上で入力してください')
  .max(128, 'パスワードは128文字以内で入力してください')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'パスワードには大文字、小文字、数字、特殊文字(@$!%*?&)をそれぞれ1文字以上含めてください'
  )
  .refine(
    (password) => {
      // Check for common weak patterns
      const weakPatterns = [
        /^(.)\1{3,}/, // Same character repeated 4+ times
        /^(.)(.)\1\2/, // Simple patterns like abab
        /password/i, // Contains "password"
        /^[0-9]+$/, // Only numbers
        /^[a-zA-Z]+$/, // Only letters
        /qwerty|asdf|zxcv|1234/i, // Common keyboard patterns
      ];
      
      return !weakPatterns.some(pattern => pattern.test(password));
    },
    'パスワードが簡単すぎます。より複雑なパスワードを設定してください'
  );

const resetPasswordSchema = z.object({
  token: z
    .string()
    .min(1, 'トークンが必要です')
    .regex(/^[a-f0-9]{64}$/, '無効なトークン形式です'), // 64 character hex string
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'パスワード確認は必須です'),
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: 'パスワードが一致しません',
    path: ['confirmPassword'],
  }
);

// Security Expert: Rate limiting for password reset attempts
const resetAttemptMap = new Map<string, { count: number; resetTime: number }>();
const RESET_RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RESET_RATE_LIMIT_MAX_ATTEMPTS = 5; // Max 5 attempts per 15 minutes per IP

function checkResetRateLimit(clientIp: string): { allowed: boolean; resetTime?: number } {
  const now = Date.now();
  const clientData = resetAttemptMap.get(clientIp);

  if (!clientData) {
    resetAttemptMap.set(clientIp, { count: 1, resetTime: now + RESET_RATE_LIMIT_WINDOW });
    return { allowed: true };
  }

  if (now > clientData.resetTime) {
    resetAttemptMap.set(clientIp, { count: 1, resetTime: now + RESET_RATE_LIMIT_WINDOW });
    return { allowed: true };
  }

  if (clientData.count >= RESET_RATE_LIMIT_MAX_ATTEMPTS) {
    return { allowed: false, resetTime: clientData.resetTime };
  }

  clientData.count += 1;
  return { allowed: true };
}

// Security Expert: Validate password strength using additional checks
function validatePasswordStrength(password: string): { isValid: boolean; score: number; feedback: string[] } {
  const feedback: string[] = [];
  let score = 0;

  // Length scoring
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  // Character variety scoring
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[@$!%*?&]/.test(password)) score += 1;

  // Complexity checks
  const hasRepeatedChars = /(.)\1{2,}/.test(password);
  const hasSequential = /012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i.test(password);
  
  if (!hasRepeatedChars) score += 1;
  if (!hasSequential) score += 1;

  // Entropy check
  const uniqueChars = new Set(password).size;
  const entropyScore = uniqueChars / password.length;
  if (entropyScore > 0.7) score += 1;

  // Generate feedback
  if (score < 5) {
    feedback.push('パスワードをより強力にしてください');
  }
  if (hasRepeatedChars) {
    feedback.push('同じ文字を連続して使用しないでください');
  }
  if (hasSequential) {
    feedback.push('連続した文字や数字は使用しないでください');
  }

  return {
    isValid: score >= 5,
    score: Math.min(score, 10),
    feedback
  };
}

export async function POST(request: NextRequest) {
  try {
    // Security Expert: Get client IP for rate limiting
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                    request.headers.get('x-real-ip') || 
                    'unknown';

    // Check rate limiting
    const rateLimitCheck = checkResetRateLimit(clientIp);
    if (!rateLimitCheck.allowed) {
      const remainingTime = Math.ceil((rateLimitCheck.resetTime! - Date.now()) / 60000);
      return NextResponse.json(
        { 
          error: `パスワードリセットの試行回数が上限に達しました。${remainingTime}分後に再試行してください`,
          type: 'RATE_LIMIT_EXCEEDED'
        },
        { status: 429 }
      );
    }

    // Validation Expert: Parse and validate request body
    const body = await request.json();
    const parseResult = resetPasswordSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json(
        { 
          error: parseResult.error.issues[0].message,
          type: 'VALIDATION_ERROR',
          field: parseResult.error.issues[0].path[0]
        },
        { status: 400 }
      );
    }

    const { token, password } = parseResult.data;

    // Additional password strength validation
    const strengthCheck = validatePasswordStrength(password);
    if (!strengthCheck.isValid) {
      return NextResponse.json(
        {
          error: strengthCheck.feedback.join(', '),
          type: 'WEAK_PASSWORD',
          score: strengthCheck.score
        },
        { status: 400 }
      );
    }

    // Database Expert: Connect to database
    await dbConnect();

    // Security Expert: Find and validate token with timing-safe comparison
    const passwordReset = await PasswordReset.findOne({ 
      token,
      used: false,
      expiresAt: { $gt: new Date() }
    });

    if (!passwordReset) {
      return NextResponse.json(
        { 
          error: 'パスワードリセットトークンが無効または期限切れです',
          type: 'INVALID_TOKEN'
        },
        { status: 400 }
      );
    }

    // Additional security check using timing-safe comparison
    // Skip if compareToken method doesn't exist or if tokens match directly
    if (passwordReset.compareToken && typeof passwordReset.compareToken === 'function') {
      if (!passwordReset.compareToken(token)) {
        return NextResponse.json(
          { 
            error: 'パスワードリセットトークンが無効です',
            type: 'INVALID_TOKEN'
          },
          { status: 400 }
        );
      }
    }

    // Find the user
    const user = await User.findOne({ email: passwordReset.email });
    if (!user) {
      // Mark token as used even if user not found to prevent reuse
      passwordReset.used = true;
      await passwordReset.save();
      
      return NextResponse.json(
        { 
          error: 'ユーザーが見つかりません',
          type: 'USER_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // パスワード再利用チェック
    const isReused = await isPasswordReused(
      password,
      user.password,
      user.passwordHistory || []
    );
    
    if (isReused) {
      // セキュリティログ記録
      const userAgent = request.headers.get('user-agent') || 'unknown';
      await logPasswordReuseAttempt(
        user._id.toString(),
        user.email,
        clientIp,
        userAgent
      );
      
      return NextResponse.json(
        { 
          error: 'パスワードの再利用は禁止されています',
          message: '以前使用したパスワードは設定できません。セキュリティ向上のため、新しいパスワードを作成してください。',
          type: 'PASSWORD_REUSED',
          details: {
            reason: 'セキュリティポリシーにより、過去5回分のパスワードとは異なるものを設定する必要があります',
            suggestion: '大文字・小文字・数字・記号を組み合わせた、推測されにくいパスワードをお勧めします'
          }
        },
        { status: 400 }
      );
    }

    // Security Expert: Hash the new password with high-strength settings
    const saltRounds = 12; // Higher than default for better security in 2025
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Database Expert: Update user password and mark token as used (transaction-like operation)
    try {
      // パスワード履歴を更新
      const updatedHistory = updatePasswordHistory(
        user.password,
        user.passwordHistory || [],
        user.lastPasswordChange
      );
      
      // CRITICAL FIX: Use updateOne to avoid pre-save hook that would re-hash the password
      // The password is already hashed, so we need to bypass the pre-save middleware
      const updateResult = await User.updateOne(
        { _id: user._id },
        {
          $set: {
            password: hashedPassword,
            passwordHistory: updatedHistory,
            lastPasswordChange: new Date(),
            passwordResetCount: (user.passwordResetCount || 0) + 1,
            emailVerified: user.emailVerified || new Date(),
          },
          $unset: {
            passwordResetToken: 1,
            passwordResetExpires: 1,
          }
        }
      );
      
      if (updateResult.modifiedCount === 0) {
        throw new Error('Failed to update user password');
      }
      
      console.log(`Password reset successful for ${user.email}, emailVerified: ${user.emailVerified}`);

      // Mark the reset token as used
      passwordReset.used = true;
      await passwordReset.save();

      // Clean up all other reset tokens for this user
      await PasswordReset.deleteMany({
        email: passwordReset.email,
        _id: { $ne: passwordReset._id }
      });

      // Performance Expert: Log successful password reset for monitoring
      console.log(`Password successfully reset for user: ${user.email} at ${new Date().toISOString()}`);
      
      // セキュリティ監査ログ
      const userAgent = request.headers.get('user-agent') || 'unknown';
      await logPasswordResetSuccess(
        user._id.toString(),
        user.email,
        clientIp,
        userAgent
      );

      return NextResponse.json(
        {
          message: 'パスワードが正常にリセットされました。新しいパスワードでログインしてください。',
          success: true,
        },
        { status: 200 }
      );

    } catch (error) {
      console.error('Password reset database error:', error);
      return NextResponse.json(
        { 
          error: 'パスワードの更新に失敗しました。もう一度お試しください。',
          type: 'UPDATE_ERROR'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Password reset error:', error);
    
    // Error Handling Expert: User-friendly error message
    return NextResponse.json(
      { 
        error: 'サーバーエラーが発生しました。しばらく時間をおいて再試行してください。',
        type: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}

// Token validation endpoint (GET) - for checking token validity before showing form
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    console.log('🔍 パスワードリセットトークン検証:', token);

    if (!token) {
      console.log('⚠️ トークンが提供されていません');
      return NextResponse.json(
        { valid: false, error: 'トークンが必要です' },
        { status: 400 }
      );
    }

    // トークン形式のチェック（64文字の16進数）
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      console.log('⚠️ トークン形式が不正:', token.length, '文字');
      return NextResponse.json(
        { valid: false, error: '無効なトークン形式です' },
        { status: 400 }
      );
    }

    // データベース接続
    try {
      await dbConnect();
      console.log('✅ MongoDB接続成功');
    } catch (dbError) {
      console.error('❌ MongoDB接続エラー:', dbError);
      return NextResponse.json(
        { valid: false, error: 'データベース接続エラー' },
        { status: 500 }
      );
    }

    // トークンを検索
    const passwordReset = await PasswordReset.findOne({ 
      token,
      used: false,
      expiresAt: { $gt: new Date() }
    });

    if (!passwordReset) {
      console.log('⚠️ トークンが見つかりませんまたは期限切れ/使用済み');
      
      // 期限切れのトークンを確認
      const expiredToken = await PasswordReset.findOne({ token });
      if (expiredToken) {
        if (expiredToken.used) {
          return NextResponse.json(
            { valid: false, error: 'このリセットリンクは既に使用されています' },
            { status: 400 }
          );
        } else if (expiredToken.expiresAt < new Date()) {
          return NextResponse.json(
            { valid: false, error: 'パスワードリセットリンクの有効期限が切れています' },
            { status: 400 }
          );
        }
      }
      
      return NextResponse.json(
        { valid: false, error: '無効なパスワードリセットリンクです' },
        { status: 400 }
      );
    }

    // トークンの正当性を確認（タイミング攻撃対策）
    let isValid = false;
    try {
      if (passwordReset.compareToken && typeof passwordReset.compareToken === 'function') {
        isValid = passwordReset.compareToken(token);
      } else {
        // compareTokenメソッドがない場合は直接比較
        isValid = passwordReset.token === token;
      }
    } catch (compareError) {
      console.error('トークン比較エラー:', compareError);
      isValid = passwordReset.token === token;
    }

    if (!isValid) {
      console.log('⚠️ トークンが一致しません');
      return NextResponse.json(
        { valid: false, error: '無効なパスワードリセットリンクです' },
        { status: 400 }
      );
    }

    console.log('✅ トークン検証成功:', passwordReset.email);

    return NextResponse.json(
      { 
        valid: true,
        email: passwordReset.email.replace(/(.{2}).*(@.*)/, '$1***$2') // Partially masked email
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('トークン検証エラー:', error);
    
    // エラーの詳細をログに出力
    if (error instanceof Error) {
      console.error('エラー詳細:', error.message);
      console.error('スタックトレース:', error.stack);
    }
    
    return NextResponse.json(
      { 
        valid: false, 
        error: 'サーバーエラーが発生しました',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

// Security Expert: Disable other HTTP methods
export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}