#!/bin/bash

# 14人天才会議 - 修正適用スクリプト
# 天才6: キャッシュ完全無効化

echo "🧠 14人天才会議 - 修正適用スクリプト"
echo "========================================"
echo ""
echo "📋 以下の手順を実行してください:"
echo ""
echo "1️⃣  ブラウザでの操作:"
echo "   a) http://localhost:3000 を開く"
echo "   b) デベロッパーツール（F12）を開く"
echo "   c) Applicationタブ > Service Workers"
echo "   d) すべてのService Workerを「Unregister」"
echo "   e) Applicationタブ > Storage > Clear site data"
echo ""
echo "2️⃣  またはコンソールで以下を実行:"
echo ""
cat << 'EOF'
// コピー＆ペーストして実行
(async () => {
  // Service Worker解除
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (let reg of regs) {
      await reg.unregister();
      console.log('✅ SW解除:', reg.scope);
    }
  }
  
  // キャッシュ削除
  if ('caches' in window) {
    const names = await caches.keys();
    for (let name of names) {
      await caches.delete(name);
      console.log('✅ キャッシュ削除:', name);
    }
  }
  
  // Storage クリア
  localStorage.clear();
  sessionStorage.clear();
  
  console.log('✨ 完了！3秒後にリロードします...');
  setTimeout(() => location.reload(true), 3000);
})();
EOF

echo ""
echo "========================================"
echo "3️⃣  キャッシュクリア後:"
echo "   - ページを再読み込み（Ctrl+Shift+R）"
echo "   - メールリンクをテスト"
echo ""
echo "✅ Service Workerは現在無効化されています"
echo "   元のファイル: sw.js.backup"
echo "========================================"