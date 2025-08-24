/**
 * 本番環境デザイン確認スクリプト（手動検証用）
 * 実行: node verify-production.js
 */

const https = require('https');

const BASE_URL = 'board.blankbrainai.com';

// カラー出力
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// HTTPSリクエスト
function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          location: res.headers.location,
          data: data.substring(0, 500) // 最初の500文字のみ
        });
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

// メイン処理
async function verifyProduction() {
  log('\n' + '='.repeat(60), 'blue');
  log('🔍 本番環境デザイン改善確認', 'blue');
  log('='.repeat(60), 'blue');
  
  log('\n📊 確認項目:', 'yellow');
  log('以下のURLをブラウザで手動確認してください', 'yellow');
  log('認証情報: one.photolife+2@gmail.com / ?@thc123THC@?', 'yellow');
  
  const pages = [
    { name: 'ログインページ', url: 'https://board.blankbrainai.com/auth/signin' },
    { name: 'ダッシュボード', url: 'https://board.blankbrainai.com/dashboard' },
    { name: 'プロフィール', url: 'https://board.blankbrainai.com/profile' },
    { name: 'マイ投稿', url: 'https://board.blankbrainai.com/my-posts' },
    { name: '掲示板', url: 'https://board.blankbrainai.com/board' }
  ];
  
  log('\n📝 チェックリスト:', 'green');
  pages.forEach((page, index) => {
    log(`${index + 1}. ${page.name}`, 'green');
    log(`   URL: ${page.url}`, 'reset');
  });
  
  log('\n✅ 確認ポイント:', 'yellow');
  log('1. グラデーション背景の表示', 'reset');
  log('   - ヘッダー部分に紫色のグラデーション', 'reset');
  log('   - ボタンにグラデーション効果', 'reset');
  
  log('\n2. シャドウとアニメーション', 'reset');
  log('   - カードに影効果', 'reset');
  log('   - ボタンホバー時の変化', 'reset');
  log('   - スムーズなトランジション', 'reset');
  
  log('\n3. レスポンシブ動作', 'reset');
  log('   - モバイル: ハンバーガーメニュー表示', 'reset');
  log('   - タブレット: サイドバー調整', 'reset');
  log('   - デスクトップ: サイドバー常時表示（280px幅）', 'reset');
  
  log('\n4. 新機能', 'reset');
  log('   - スクロールトップボタン（ページ下部で表示）', 'reset');
  log('   - 通知バッジ（ヘッダー右上）', 'reset');
  log('   - ダークモード切り替えアイコン', 'reset');
  
  log('\n5. レイアウト統一性', 'reset');
  log('   - 全ページで統一されたヘッダー', 'reset');
  log('   - 一貫性のあるサイドバーメニュー', 'reset');
  log('   - 美しいタイポグラフィ', 'reset');
  
  // ページステータスチェック
  log('\n🔍 ページアクセス状況:', 'yellow');
  
  for (const page of pages) {
    try {
      const path = page.url.replace('https://board.blankbrainai.com', '');
      const response = await makeRequest(path);
      
      if (response.statusCode === 200) {
        log(`✅ ${page.name}: アクセス可能`, 'green');
      } else if (response.statusCode === 302 || response.statusCode === 301) {
        log(`⚠️  ${page.name}: リダイレクト (${response.location})`, 'yellow');
      } else {
        log(`❌ ${page.name}: エラー (${response.statusCode})`, 'red');
      }
    } catch (error) {
      log(`❌ ${page.name}: 接続エラー`, 'red');
    }
  }
  
  log('\n' + '='.repeat(60), 'blue');
  log('📌 手動検証手順:', 'blue');
  log('1. 上記URLにブラウザでアクセス', 'reset');
  log('2. 提供された認証情報でログイン', 'reset');
  log('3. 各ページのデザイン改善を確認', 'reset');
  log('4. レスポンシブ動作をデベロッパーツールで検証', 'reset');
  log('5. スクリーンショットを撮影（必要に応じて）', 'reset');
  log('='.repeat(60), 'blue');
}

// 実行
verifyProduction().catch(console.error);