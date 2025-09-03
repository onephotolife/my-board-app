// Email sending API endpoint
import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getEmailService } from '@/lib/email/mailer-fixed';
import { EmailError, EmailErrorType } from '@/types/email';

// Request validation schema
const sendEmailSchema = z.object({
  to: z.string().email('Invalid email address'),
  template: z.enum(['verification', 'password-reset', 'welcome']),
  data: z.object({
    userName: z.string().min(1, 'User name is required'),
    verificationUrl: z.string().url().optional(),
    verificationCode: z.string().optional(),
    resetUrl: z.string().url().optional(),
    resetCode: z.string().optional(),
    expiresIn: z.string().optional(),
    loginUrl: z.string().url().optional(),
    features: z.array(z.string()).optional(),
  }),
});

// Rate limiting for API endpoint
const apiRateLimitMap = new Map<string, { count: number; resetTime: number }>();
const API_RATE_LIMIT = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
};

function checkApiRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = apiRateLimitMap.get(ip);

  if (!limit) {
    apiRateLimitMap.set(ip, {
      count: 1,
      resetTime: now + API_RATE_LIMIT.windowMs,
    });
    return true;
  }

  if (now > limit.resetTime) {
    apiRateLimitMap.set(ip, {
      count: 1,
      resetTime: now + API_RATE_LIMIT.windowMs,
    });
    return true;
  }

  if (limit.count >= API_RATE_LIMIT.maxRequests) {
    return false;
  }

  limit.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                    request.headers.get('x-real-ip') || 
                    'unknown';

    // Check API rate limit
    if (!checkApiRateLimit(clientIp)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many requests. Please try again later.',
          type: EmailErrorType.RATE_LIMIT,
        },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const parseResult = sendEmailSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error.issues[0].message,
          type: EmailErrorType.INVALID_RECIPIENT,
          details: parseResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { to, template, data } = parseResult.data;
    const emailService = getEmailService();

    let result;

    // Send email based on template
    switch (template) {
      case 'verification':
        if (!data.verificationUrl) {
          return NextResponse.json(
            {
              success: false,
              error: 'Verification URL is required for verification emails',
              type: EmailErrorType.TEMPLATE_ERROR,
            },
            { status: 400 }
          );
        }
        result = await emailService.sendVerificationEmail(to, {
          userName: data.userName,
          verificationUrl: data.verificationUrl,
        } as any);
        break;

      case 'password-reset':
        if (!data.resetUrl) {
          return NextResponse.json(
            {
              success: false,
              error: 'Reset URL is required for password reset emails',
              type: EmailErrorType.TEMPLATE_ERROR,
            },
            { status: 400 }
          );
        }
        result = await emailService.sendPasswordResetEmail(to, {
          userName: data.userName,
          resetUrl: data.resetUrl,
          expiresIn: data.expiresIn,
        } as any);
        break;

      case 'welcome':
        if (!data.loginUrl) {
          return NextResponse.json(
            {
              success: false,
              error: 'Login URL is required for welcome emails',
              type: EmailErrorType.TEMPLATE_ERROR,
            },
            { status: 400 }
          );
        }
        result = await emailService.sendWelcomeEmail(to, {
          userName: data.userName,
          loginUrl: data.loginUrl,
          features: data.features,
        });
        break;

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid email template',
            type: EmailErrorType.TEMPLATE_ERROR,
          },
          { status: 400 }
        );
    }

    // Log success in production
    if (process.env.NODE_ENV === 'production') {
      console.warn(`Email sent successfully: ${template} to ${to}`);
    }

    return NextResponse.json(
      {
        success: true,
        messageId: result.messageId,
        message: 'Email sent successfully',
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Email API error:', error);

    if (error instanceof EmailError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          type: error.type,
          details: error.details,
        },
        { status: error.type === EmailErrorType.RATE_LIMIT ? 429 : 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send email',
        type: EmailErrorType.SEND_FAILED,
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET(request: NextRequest) {
  try {
    const emailService = getEmailService();
    
    // Check if email service is configured
    const config = process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD;
    
    return NextResponse.json(
      {
        status: 'ok',
        configured: !!config,
        service: 'email',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        configured: false,
        service: 'email',
        error: 'Email service not configured',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}