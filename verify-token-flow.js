// トークンフローの詳細検証
const https = require('https');

// 認証付きでCSRFトークンを取得し、詳細を分析
function analyzeTokenFlow() {
  return new Promise((resolve, reject) => {
    // まずCSRFトークンを取得
    const options = {
      hostname: 'board.blankbrainai.com',
      path: '/api/csrf',
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      let cookies = res.headers['set-cookie'] || [];
      
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          
          console.log('🔍 トークンフロー検証:\n');
          
          // APIレスポンスの分析
          console.log('1. /api/csrfレスポンス:');
          console.log('   - token:', jsonData.token?.substring(0, 20) + '...');
          console.log('   - message:', jsonData.message);
          
          // Set-Cookieヘッダーの分析
          console.log('\n2. Set-Cookieヘッダー:');
          cookies.forEach((cookie, i) => {
            const parts = cookie.split(';');
            const [name, value] = parts[0].split('=');
            console.log(`   Cookie ${i + 1}: ${name}`);
            console.log(`   - Value: ${value?.substring(0, 20)}...`);
            
            // HTTPOnly, Secure, SameSite属性の確認
            const httpOnly = cookie.toLowerCase().includes('httponly');
            const secure = cookie.toLowerCase().includes('secure');
            const sameSite = cookie.match(/samesite=(\w+)/i);
            
            console.log(`   - HttpOnly: ${httpOnly ? '✅' : '❌'}`);
            console.log(`   - Secure: ${secure ? '✅' : '❌'}`);
            console.log(`   - SameSite: ${sameSite ? sameSite[1] : 'なし'}`);
          });
          
          // クッキーとトークンの一致確認
          console.log('\n3. トークンの整合性:');
          const csrfTokenCookie = cookies.find(c => c.includes('csrf-token='));
          const csrfSessionCookie = cookies.find(c => c.includes('csrf-session='));
          
          if (csrfTokenCookie && csrfSessionCookie) {
            const tokenValue = csrfTokenCookie.split('=')[1].split(';')[0];
            const sessionValue = csrfSessionCookie.split('=')[1].split(';')[0];
            
            console.log('   - JSONトークンとcsrf-tokenクッキー:', 
              jsonData.token === tokenValue ? '✅ 一致' : '❌ 不一致');
            console.log('   - csrf-tokenとcsrf-session:', 
              tokenValue === sessionValue ? '✅ 一致' : '❌ 不一致');
          }
          
          resolve({ token: jsonData.token, cookies });
        } catch (e) {
          reject(`エラー: ${e.message}`);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// メイン実行
async function main() {
  console.log('🔬 CSRFトークンフロー詳細検証\n');
  console.log('=====================================\n');
  
  try {
    await analyzeTokenFlow();
    
    console.log('\n=====================================');
    console.log('📊 検証結果:');
    console.log('\n問題の可能性（優先度順）:');
    console.log('1. 【高】クッキー名の競合');
    console.log('   - NextAuthのcsrf関連クッキーとの競合');
    console.log('2. 【中】HttpOnlyクッキーの扱い');
    console.log('   - ブラウザのJavaScriptからアクセス不可');
    console.log('3. 【低】SameSite属性の影響');
    console.log('   - strict設定によるクッキー送信制限');
    
  } catch (error) {
    console.error('エラー:', error);
  }
}

main();
