import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import PasswordReset from '@/models/PasswordReset';
import { sendEmail, getPasswordResetEmailHtml } from '@/lib/mail/sendMail';
import { z } from 'zod';

// Validation Expert: Strong input validation schema
const requestResetSchema = z.object({
  email: z
    .string()
    .email('有効なメールアドレスを入力してください')
    .min(1, 'メールアドレスは必須です')
    .max(255, 'メールアドレスが長すぎます')
    .transform(email => email.toLowerCase().trim()),
});

// Security Expert: Rate limiting implementation (in-memory for demo, use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_ATTEMPTS = 3; // Max 3 requests per 15 minutes per IP

function checkRateLimit(clientIp: string): { allowed: boolean; resetTime?: number } {
  const now = Date.now();
  const clientData = rateLimitMap.get(clientIp);

  if (!clientData) {
    rateLimitMap.set(clientIp, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }

  if (now > clientData.resetTime) {
    // Reset the rate limit window
    rateLimitMap.set(clientIp, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }

  if (clientData.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    return { allowed: false, resetTime: clientData.resetTime };
  }

  clientData.count += 1;
  return { allowed: true };
}

// DevOps Expert: Environment validation
function validateEnvironment() {
  const requiredVars = [
    'EMAIL_SERVER_HOST',
    'EMAIL_SERVER_PORT',
    'EMAIL_SERVER_USER',
    'EMAIL_SERVER_PASSWORD',
    'EMAIL_FROM',
    'NEXTAUTH_URL',
  ];

  const missing = requiredVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Performance Expert: Early validation before DB connection
    validateEnvironment();

    // Security Expert: Get client IP for rate limiting
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                    request.headers.get('x-real-ip') || 
                    'unknown';

    // Check rate limiting
    const rateLimitCheck = checkRateLimit(clientIp);
    if (!rateLimitCheck.allowed) {
      const remainingTime = Math.ceil((rateLimitCheck.resetTime! - Date.now()) / 60000);
      return NextResponse.json(
        { 
          error: `リクエストが多すぎます。${remainingTime}分後に再試行してください`,
          type: 'RATE_LIMIT_EXCEEDED'
        },
        { status: 429 }
      );
    }

    // Validation Expert: Parse and validate request body
    const body = await request.json();
    const parseResult = requestResetSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json(
        { 
          error: parseResult.error.issues[0].message,
          type: 'VALIDATION_ERROR'
        },
        { status: 400 }
      );
    }

    const { email } = parseResult.data;

    // Database Expert: Connect to database
    await dbConnect();

    // Security Expert: Prevent timing attacks by always performing the same operations
    // regardless of whether the email exists or not
    const startTime = Date.now();

    // Check if user exists
    const user = await User.findOne({ email }).select('name email emailVerified');
    
    let resetToken = null;
    let emailSent = false;

    if (user && user.emailVerified) {
      // Database Expert: Clean up old reset tokens for this email
      await PasswordReset.deleteMany({ 
        email, 
        $or: [
          { used: true },
          { expiresAt: { $lt: new Date() } }
        ]
      });

      // Check if user has recent unused token (prevent spam)
      const recentToken = await PasswordReset.findOne({
        email,
        used: false,
        expiresAt: { $gt: new Date() },
        createdAt: { $gt: new Date(Date.now() - 5 * 60 * 1000) } // 5 minutes ago
      });

      if (recentToken) {
        // Don't create new token, but still pretend we sent email (prevent enumeration)
        resetToken = recentToken;
      } else {
        // Create new password reset token
        resetToken = new PasswordReset({ email });
        await resetToken.save();
      }

      // Email Expert: Send reset email
      try {
        const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password/${resetToken.token}`;
        const emailHtml = getPasswordResetEmailHtml(user.name, resetUrl);
        
        const emailResult = await sendEmail({
          to: email,
          subject: 'パスワードリセットのご案内',
          html: emailHtml,
        });

        emailSent = emailResult.success;
        
        if (!emailSent) {
          console.error('Failed to send password reset email:', emailResult.error);
        }
      } catch (error) {
        console.error('Email sending error:', error);
      }
    }

    // Security Expert: Implement timing attack prevention
    // Ensure consistent response time regardless of user existence
    const elapsedTime = Date.now() - startTime;
    const minResponseTime = 500; // Minimum 500ms response time
    
    if (elapsedTime < minResponseTime) {
      await new Promise(resolve => setTimeout(resolve, minResponseTime - elapsedTime));
    }

    // UX Designer: Always return success message to prevent email enumeration
    return NextResponse.json(
      {
        message: 'パスワードリセットのメールを送信しました。メールボックスをご確認ください。',
        success: true,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Password reset request error:', error);
    
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

// Security Expert: Only allow POST method
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}