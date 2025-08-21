import { NextResponse } from 'next/server';

/**
 * 認証APIディスカバリーエンドポイント
 * テストツール向けに利用可能なエンドポイント一覧を提供
 */
export async function GET() {
  return NextResponse.json({
    service: '会員制掲示板 認証システム',
    version: '1.0.0',
    endpoints: {
      authentication: {
        signin: '/api/auth/signin',
        register: '/api/auth/register',
        signout: '/api/auth/signout',
        session: '/api/auth/session',
        csrf: '/api/auth/csrf',
        providers: '/api/auth/providers'
      },
      user_management: {
        profile: '/api/user/profile',
        permissions: '/api/user/permissions',
        activity: '/api/user/activity'
      },
      password_management: {
        reset_request: '/api/auth/request-reset',
        reset_password: '/api/auth/reset-password',
        verify_email: '/api/auth/verify-email'
      },
      testing: {
        test_login: '/api/auth/test-login',
        check_email: '/api/auth/check-email'
      }
    },
    authentication_flow: {
      new_user: [
        'POST /api/auth/register',
        'GET /api/auth/verify-email',
        'POST /api/auth/signin'
      ],
      existing_user: [
        'POST /api/auth/signin',
        'GET /api/auth/session'
      ],
      password_reset: [
        'POST /api/auth/request-reset',
        'POST /api/auth/reset-password'
      ]
    },
    security_features: [
      'CSRF Protection',
      'Rate Limiting',
      'Email Verification',
      'Session Management',
      'Input Sanitization'
    ],
    documentation: 'https://board.blankbrainai.com/docs/api',
    health_check: '/api/health'
  }, {
    headers: {
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      'Content-Type': 'application/json'
    }
  });
}

/**
 * 認証状態の確認
 */
export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache',
      'X-Auth-Available': 'true'
    }
  });
}