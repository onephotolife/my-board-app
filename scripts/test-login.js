const fetch = require('node-fetch');

async function testLogin() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('🔐 ログインテスト開始...\n');
  
  try {
    // 1. CSRFトークンを取得
    console.log('1. CSRFトークン取得中...');
    const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`);
    const { csrfToken } = await csrfResponse.json();
    console.log('✅ CSRFトークン取得成功\n');
    
    // 2. ログイン実行
    console.log('2. ログイン実行中...');
    const loginResponse = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': csrfResponse.headers.get('set-cookie')
      },
      body: new URLSearchParams({
        csrfToken,
        email: 'test@example.com',
        password: 'Test1234!',
        redirect: 'false',
        json: 'true'
      }),
      redirect: 'manual'
    });
    
    const setCookie = loginResponse.headers.get('set-cookie');
    console.log('ステータス:', loginResponse.status);
    console.log('Cookie設定:', setCookie ? '✅ あり' : '❌ なし');
    
    if (setCookie && setCookie.includes('next-auth.session-token')) {
      console.log('✅ セッショントークン取得成功\n');
      
      // 3. 保護ページへのアクセステスト
      console.log('3. 保護ページアクセステスト...');
      const dashboardResponse = await fetch(`${baseUrl}/dashboard`, {
        headers: {
          'Cookie': setCookie
        },
        redirect: 'manual'
      });
      
      console.log('ダッシュボードアクセス:', dashboardResponse.status === 200 ? '✅ 成功' : `❌ 失敗 (${dashboardResponse.status})`);
      
      // 4. セッション情報取得
      console.log('\n4. セッション情報確認...');
      const sessionResponse = await fetch(`${baseUrl}/api/auth/session`, {
        headers: {
          'Cookie': setCookie
        }
      });
      
      const session = await sessionResponse.json();
      console.log('セッション:', session);
      
      if (session.user) {
        console.log('✅ ログイン成功！');
        console.log('ユーザー:', session.user.email);
        console.log('メール確認状態:', session.user.emailVerified);
      }
      
    } else {
      console.log('❌ セッショントークンが設定されませんでした');
      const body = await loginResponse.text();
      console.log('レスポンス:', body.substring(0, 200));
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

testLogin();