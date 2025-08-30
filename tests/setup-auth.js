/**
 * 認証セットアップヘルパー
 * 必須認証: one.photolife+1@gmail.com / ?@thc123THC@?
 */

const fetch = require('node-fetch');

class AuthSetup {
  static async authenticate() {
    console.log('[AUTH-SETUP] 認証開始: one.photolife+1@gmail.com');
    
    try {
      // NextAuth credentials providerでログイン
      const response = await fetch('http://localhost:3000/api/auth/callback/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          email: 'one.photolife+1@gmail.com',
          password: '?@thc123THC@?',
          redirect: 'false',
          callbackUrl: '/',
          json: 'true'
        })
      });
      
      if (!response.ok) {
        console.error('[AUTH-SETUP] 認証失敗:', response.status);
        return null;
      }
      
      const cookies = response.headers.get('set-cookie');
      const sessionMatch = cookies?.match(/next-auth\.session-token=([^;]+)/);
      const csrfMatch = cookies?.match(/next-auth\.csrf-token=([^;]+)/);
      
      if (sessionMatch) {
        console.log('[AUTH-SETUP] セッション取得成功');
        return {
          sessionToken: sessionMatch[1],
          csrfToken: csrfMatch ? csrfMatch[1] : null,
          cookies: cookies
        };
      }
    } catch (error) {
      console.error('[AUTH-SETUP] 認証エラー:', error);
    }
    
    return null;
  }
}

module.exports = AuthSetup;