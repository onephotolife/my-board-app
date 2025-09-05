/**
 * Create a mock storageState with valid session tokens for testing
 */
export function createMockStorageState() {
  const mockSessionToken = 'mock-session-token-for-e2e-testing';
  const mockCsrfToken = 'mock-csrf-token-for-e2e-testing';
  
  return {
    cookies: [
      // NextAuth session token (required by middleware)
      {
        name: 'next-auth.session-token',
        value: mockSessionToken,
        domain: 'localhost',
        path: '/',
        expires: Date.now() / 1000 + (30 * 24 * 60 * 60), // 30 days
        httpOnly: false, // Development mode
        secure: false,
        sameSite: 'Lax'
      },
      // CSRF tokens
      {
        name: 'csrf-token',
        value: mockCsrfToken,
        domain: 'localhost',
        path: '/',
        expires: Date.now() / 1000 + (24 * 60 * 60), // 24 hours
        httpOnly: true,
        secure: false,
        sameSite: 'Strict'
      },
      {
        name: 'csrf-token-public',
        value: mockCsrfToken,
        domain: 'localhost',
        path: '/',
        expires: Date.now() / 1000 + (24 * 60 * 60), // 24 hours
        httpOnly: false,
        secure: false,
        sameSite: 'Strict'
      },
      // NextAuth CSRF token
      {
        name: 'next-auth.csrf-token',
        value: `${mockCsrfToken}%7C${mockCsrfToken}`,
        domain: 'localhost',
        path: '/',
        expires: -1,
        httpOnly: true,
        secure: false,
        sameSite: 'Lax'
      },
      // NextAuth callback URL
      {
        name: 'next-auth.callback-url',
        value: 'http%3A%2F%2Flocalhost%3A3000%2Fdashboard',
        domain: 'localhost',
        path: '/',
        expires: -1,
        httpOnly: true,
        secure: false,
        sameSite: 'Lax'
      }
    ],
    origins: [
      {
        origin: 'http://localhost:3000',
        localStorage: [
          {
            name: 'sns-store',
            value: JSON.stringify({
              state: {
                currentUser: {
                  id: 'mock-user-id',
                  email: 'one.photolife+1@gmail.com',
                  name: 'E2E Test User',
                  emailVerified: true
                },
                featureFlags: {
                  follow: true,
                  timeline: true,
                  likes: true,
                  notifications: true,
                  comments: false,
                  realtimeNotifications: false,
                  profile: false,
                  search: false,
                  privacy: false,
                  recommendations: false,
                  analytics: false
                },
                unreadNotificationCount: 0
              },
              version: 0
            })
          },
          {
            name: 'auth-debug-logs',
            value: JSON.stringify([
              {
                timestamp: new Date().toISOString(),
                message: 'Mock authentication established',
                data: {
                  url: 'http://localhost:3000/posts/new',
                  authenticated: true,
                  sessionType: 'mock'
                }
              }
            ])
          }
        ]
      }
    ]
  };
}