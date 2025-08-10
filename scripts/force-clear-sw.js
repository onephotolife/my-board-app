#!/usr/bin/env node

/**
 * Service Worker強制クリアスクリプト
 * 14人天才会議 - 天才4
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

log('\n🧠 天才4: Service Worker強制クリア\n', 'cyan');
log('=' .repeat(60), 'cyan');

log('\n⚠️  重要: 以下のコードをブラウザのコンソールで実行してください', 'red');
log('=' .repeat(60), 'cyan');

const clearCode = `
// Service Worker完全削除とキャッシュクリア
(async () => {
  console.log('🧹 Service Worker完全削除を開始...');
  
  try {
    // 1. すべてのService Worker登録を解除
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      console.log('見つかったService Worker数:', registrations.length);
      
      for (let registration of registrations) {
        const success = await registration.unregister();
        console.log('Service Worker解除:', registration.scope, success ? '✅成功' : '❌失敗');
      }
    }
    
    // 2. すべてのキャッシュを削除
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      console.log('見つかったキャッシュ数:', cacheNames.length);
      
      for (let cacheName of cacheNames) {
        const success = await caches.delete(cacheName);
        console.log('キャッシュ削除:', cacheName, success ? '✅成功' : '❌失敗');
      }
    }
    
    // 3. IndexedDBをクリア（Service Worker関連）
    if ('indexedDB' in window) {
      const databases = await indexedDB.databases();
      for (let db of databases) {
        indexedDB.deleteDatabase(db.name);
        console.log('IndexedDB削除:', db.name, '✅');
      }
    }
    
    // 4. LocalStorageとSessionStorageをクリア
    localStorage.clear();
    sessionStorage.clear();
    console.log('Storage クリア ✅');
    
    // 5. Service Worker無効化フラグを設定
    localStorage.setItem('disableServiceWorker', 'true');
    console.log('Service Worker無効化フラグ設定 ✅');
    
    console.log('\\n✨ Service Worker完全削除完了！');
    console.log('📌 3秒後にページをリロードします...');
    
    // 6. 強制リロード
    setTimeout(() => {
      location.reload(true);
    }, 3000);
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
})();
`;

console.log(clearCode);

log('\n' + '=' .repeat(60), 'cyan');
log('\n📋 実行手順:', 'yellow');
log('1. ブラウザで http://localhost:3000 を開く', 'cyan');
log('2. デベロッパーツール（F12）を開く', 'cyan');
log('3. コンソールタブを選択', 'cyan');
log('4. 上記のコードをコピー＆ペースト', 'cyan');
log('5. Enterキーを押して実行', 'cyan');

log('\n' + '=' .repeat(60), 'cyan');
log('🔍 確認方法:', 'yellow');
log('1. Application タブ > Service Workers', 'cyan');
log('   → 何も登録されていないことを確認', 'cyan');
log('2. Application タブ > Storage > Cache Storage', 'cyan');
log('   → キャッシュが空であることを確認', 'cyan');
log('3. Network タブでsw.jsを確認', 'cyan');
log('   → 404または無効になっていることを確認', 'cyan');

log('\n' + '=' .repeat(60), 'cyan');
log('✅ 実行後、メールリンクをテストしてください', 'green');
log('=' .repeat(60) + '\n', 'cyan');