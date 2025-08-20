#!/usr/bin/env node

/**
 * Service Worker キャッシュクリアスクリプト
 * 14人天才会議 - 天才6
 */

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

// クライアント側で実行するコード
const clientCode = `
// Service Workerの登録解除とキャッシュクリア
async function clearServiceWorkerAndCache() {
  console.log('🧹 Service Workerとキャッシュをクリアしています...');
  
  try {
    // 1. Service Workerの登録解除
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (let registration of registrations) {
        await registration.unregister();
        console.log('✅ Service Worker登録解除:', registration.scope);
      }
    }
    
    // 2. キャッシュストレージのクリア
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (let cacheName of cacheNames) {
        await caches.delete(cacheName);
        console.log('✅ キャッシュ削除:', cacheName);
      }
    }
    
    // 3. LocalStorageとSessionStorageのクリア
    localStorage.clear();
    sessionStorage.clear();
    console.log('✅ LocalStorage/SessionStorageクリア');
    
    // 4. ページの再読み込み（強制リフレッシュ）
    console.log('🔄 ページを再読み込みします...');
    setTimeout(() => {
      location.reload(true);
    }, 1000);
    
    return '✨ すべてのキャッシュとService Workerがクリアされました';
  } catch (error) {
    console.error('❌ エラー:', error);
    return 'エラーが発生しました: ' + error.message;
  }
}

// 実行
clearServiceWorkerAndCache().then(result => {
  console.log(result);
});
`;

log('\n🧠 天才6: Service Worker キャッシュクリアガイド\n', 'cyan');
log('=' .repeat(60), 'cyan');

log('\n📋 以下の手順でキャッシュをクリアしてください:', 'yellow');
log('\n1. ブラウザでアプリケーションを開く (http://localhost:3000)', 'blue');
log('2. デベロッパーツールを開く (F12またはCmd+Option+I)', 'blue');
log('3. コンソールタブを選択', 'blue');
log('4. 以下のコードをコピー＆ペーストして実行:\n', 'blue');

log('─'.repeat(60), 'cyan');
console.log(clientCode);
log('─'.repeat(60), 'cyan');

log('\n💡 または、ブラウザの設定から手動でクリア:', 'green');
log('  Chrome: デベロッパーツール > Application > Service Workers > Unregister', 'cyan');
log('         Application > Storage > Clear site data', 'cyan');
log('  Firefox: about:debugging > This Firefox > Service Workers > Unregister', 'cyan');
log('  Safari: Develop > Empty Caches', 'cyan');

log('\n🔍 Service Worker更新の確認方法:', 'magenta');
log('  1. デベロッパーツール > Network タブ', 'cyan');
log('  2. sw.js をリロード', 'cyan');
log('  3. Response Headers で Cache-Control を確認', 'cyan');
log('  4. Application > Service Workers で新しいバージョンを確認', 'cyan');

log('\n⚠️  重要な注意事項:', 'yellow');
log('  • Service Workerは自動更新されますが、24時間キャッシュされる場合があります', 'cyan');
log('  • 強制更新するには上記の手順でクリアしてください', 'cyan');
log('  • メールリンクをクリックする前にキャッシュをクリアすることを推奨', 'cyan');

log('\n✅ Service Worker修正内容:', 'green');
log('  • 認証関連ページ (/auth/*) をキャッシュ対象から除外', 'cyan');
log('  • verify-email, reset-password ページは常にネットワークから取得', 'cyan');
log('  • オフラインページの表示を認証ページでは無効化', 'cyan');
log('  • キャッシュバージョンを v2 に更新', 'cyan');

log('\n' + '='.repeat(60), 'cyan');
log('📌 準備完了！上記の手順でキャッシュをクリアしてテストしてください', 'green');
log('='.repeat(60) + '\n', 'cyan');