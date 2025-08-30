const axios = require('axios');

async function testDashboard() {
  try {
    console.log('🔐 認証開始...');
    
    // 1. CSRFトークン取得
    const csrfResponse = await axios.get('http://localhost:3000/api/auth/csrf');
    const csrfToken = csrfResponse.data.csrfToken;
    
    // 2. 認証実行
    const authResponse = await axios.post(
      'http://localhost:3000/api/auth/callback/credentials',
      {
        email: 'one.photolife+1@gmail.com',
        password: '?@thc123THC@?',
        csrfToken: csrfToken
      },
      {
        maxRedirects: 0,
        validateStatus: (status) => true
      }
    );
    
    console.log('✅ 認証レスポンス:', authResponse.status);
    
    // 3. Cookieを取得
    const cookies = authResponse.headers['set-cookie'];
    const cookieString = cookies ? cookies.join('; ') : '';
    
    // 4. Dashboardページアクセス
    console.log('📊 Dashboardアクセス中...');
    const dashboardResponse = await axios.get('http://localhost:3000/dashboard', {
      headers: {
        'Cookie': cookieString
      },
      maxRedirects: 0,
      validateStatus: (status) => true
    });
    
    console.log('📊 Dashboard HTTPステータス:', dashboardResponse.status);
    console.log('📊 Dashboard Location:', dashboardResponse.headers.location || 'なし');
    
    if (dashboardResponse.status === 200) {
      console.log('✅ [SUCCESS] Dashboard正常表示');
      const html = dashboardResponse.data;
      if (html.includes('ROUTE GROUP')) {
        console.log('✅ Route Groupからのレンダリング確認');
      }
      if (html.includes('DIRECT PATH')) {
        console.log('⚠️ Direct Pathからのレンダリング（削除されているはず）');
      }
      if (!html.includes('parallel pages')) {
        console.log('✅ Route競合エラーなし');
      }
    } else if (dashboardResponse.status === 500) {
      console.log('❌ [ERROR] 500エラー');
      if (dashboardResponse.data.includes('parallel pages')) {
        console.log('❌ Route競合エラーが残存');
      }
    } else if (dashboardResponse.status === 307) {
      console.log('⚠️ 認証リダイレクト発生');
    }
    
    // 5. APIテスト
    console.log('\n📊 API動作テスト...');
    const profileResponse = await axios.get('http://localhost:3000/api/profile', {
      headers: { 'Cookie': cookieString },
      validateStatus: (status) => true
    });
    console.log('Profile API:', profileResponse.status);
    
  } catch (error) {
    console.error('❌ テストエラー:', error.message);
  }
}

testDashboard();
