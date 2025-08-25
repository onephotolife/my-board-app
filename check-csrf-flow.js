// CSRFトークンフロー検証スクリプト
const https = require('https');

// 1. /api/csrfからトークンを取得して解析
function getCSRFToken() {
  return new Promise((resolve, reject) => {
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
          console.log('🔍 CSRFトークン取得レスポンス:');
          console.log('  - Status:', res.statusCode);
          console.log('  - Token:', jsonData.token);
          console.log('  - Cookies設定数:', cookies.length);
          console.log('\n📦 設定されたクッキー:');
          cookies.forEach((cookie, index) => {
            const name = cookie.split('=')[0];
            const value = cookie.split('=')[1]?.split(';')[0];
            console.log(`  ${index + 1}. ${name} = ${value?.substring(0, 20)}...`);
          });
          
          // csrf-tokenとcsrf-sessionの両方が設定されているか確認
          const hasCSRFToken = cookies.some(c => c.includes('csrf-token='));
          const hasCSRFSession = cookies.some(c => c.includes('csrf-session='));
          
          console.log('\n✓ チェック結果:');
          console.log('  - csrf-tokenクッキー:', hasCSRFToken ? '✅ 存在' : '❌ 不足');
          console.log('  - csrf-sessionクッキー:', hasCSRFSession ? '✅ 存在' : '❌ 不足');
          
          resolve({ 
            token: jsonData.token, 
            cookies,
            hasCSRFToken,
            hasCSRFSession
          });
        } catch (e) {
          reject(`JSONパースエラー: ${e.message}`);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// メイン実行
async function main() {
  console.log('🔬 CSRF検証フロー分析開始\n');
  console.log('URL: https://board.blankbrainai.com/api/csrf');
  console.log('=====================================\n');
  
  try {
    const result = await getCSRFToken();
    
    console.log('\n=====================================');
    console.log('📊 分析結果:');
    
    if (!result.hasCSRFSession) {
      console.log('\n❌ 問題発見: csrf-sessionクッキーが設定されていません');
      console.log('これが403エラーの原因です。');
      console.log('\n必要な3つのトークン:');
      console.log('1. csrf-tokenクッキー:', result.hasCSRFToken ? '✅' : '❌');
      console.log('2. x-csrf-tokenヘッダー: ✅ (csrfFetchで設定)');
      console.log('3. csrf-sessionクッキー:', result.hasCSRFSession ? '✅' : '❌');
    } else {
      console.log('\n✅ すべてのクッキーが正しく設定されています');
    }
    
  } catch (error) {
    console.error('エラー:', error);
  }
}

main();
