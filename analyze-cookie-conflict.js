// クッキー競合の詳細分析
const https = require('https');

function analyzeCookies() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'board.blankbrainai.com',
      path: '/',
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    };

    const req = https.request(options, (res) => {
      let cookies = res.headers['set-cookie'] || [];
      
      console.log('🍪 本番環境のクッキー分析:\n');
      console.log('取得したクッキー数:', cookies.length);
      console.log('\nクッキー名一覧:');
      
      cookies.forEach((cookie, index) => {
        const name = cookie.split('=')[0];
        console.log(`  ${index + 1}. ${name}`);
        
        // CSRFやトークン関連のクッキーを特定
        if (name.toLowerCase().includes('csrf') || 
            name.toLowerCase().includes('token') ||
            name.includes('auth')) {
          console.log(`     → 注目: ${name} (認証/CSRF関連)`);
        }
      });
      
      // NextAuth関連のクッキーを特定
      const nextAuthCookies = cookies.filter(c => 
        c.includes('next-auth') || 
        c.includes('__Host-next-auth') || 
        c.includes('__Secure-next-auth')
      );
      
      console.log('\n\nNextAuth関連クッキー:', nextAuthCookies.length + '個');
      nextAuthCookies.forEach(c => {
        const name = c.split('=')[0];
        console.log('  -', name);
      });
      
      // 独自CSRFクッキーを特定
      const customCSRFCookies = cookies.filter(c => 
        (c.includes('csrf') && !c.includes('next-auth'))
      );
      
      console.log('\n独自CSRFクッキー:', customCSRFCookies.length + '個');
      customCSRFCookies.forEach(c => {
        const name = c.split('=')[0];
        console.log('  -', name);
      });
      
      resolve({ cookies, nextAuthCookies, customCSRFCookies });
    });

    req.on('error', reject);
    req.end();
  });
}

// メイン実行
async function main() {
  console.log('🔬 クッキー競合分析\n');
  console.log('=====================================\n');
  
  try {
    await analyzeCookies();
    
    console.log('\n=====================================');
    console.log('📊 分析結果:');
    console.log('\n問題の可能性:');
    console.log('1. NextAuthが__Host-next-auth.csrf-tokenを使用');
    console.log('2. 我々のコードがcsrf-tokenを使用');
    console.log('3. request.cookies.get()が予期しない動作をする可能性');
    
    console.log('\n推奨される解決策:');
    console.log('- クッキー名を「app-csrf-token」に変更');
    console.log('- これによりNextAuthとの競合を完全に回避');
    
  } catch (error) {
    console.error('エラー:', error);
  }
}

main();
