
// 診断スクリプト
function diagnoseEmailLinkIssue() {
  console.group('📧 メールリンク問題診断');
  
  // 1. 現在のページ確認
  const currentPath = window.location.pathname;
  console.log('現在のパス:', currentPath);
  
  // 2. Service Worker状態確認
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(regs => {
      if (regs.length === 0) {
        console.warn('⚠️ Service Workerが登録されていません');
      } else {
        regs.forEach(reg => {
          console.log('Service Worker:', {
            scope: reg.scope,
            state: reg.active?.state,
            scriptURL: reg.active?.scriptURL
          });
        });
      }
    });
  }
  
  // 3. オンライン状態確認
  console.log('オンライン状態:', navigator.onLine);
  
  // 4. ページコンテンツ確認
  const bodyText = document.body.textContent;
  if (bodyText.includes('オフラインです')) {
    console.error('❌ オフラインページが表示されています');
    console.log('対処法:');
    console.log('  1. Service Workerをクリア');
    console.log('  2. ブラウザキャッシュをクリア');
    console.log('  3. ページを再読み込み');
  } else if (currentPath.includes('/auth/verify-email')) {
    console.log('✅ 確認ページが正常に表示されています');
  } else if (currentPath.includes('/auth/reset-password')) {
    console.log('✅ リセットページが正常に表示されています');
  }
  
  // 5. トークン確認
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token') || window.location.pathname.split('/').pop();
  if (token && token.length > 20) {
    console.log('トークン検出:', token.substring(0, 10) + '...');
  } else {
    console.warn('⚠️ 有効なトークンが見つかりません');
  }
  
  console.groupEnd();
}

// 自動診断
if (window.location.pathname.includes('/auth/')) {
  setTimeout(diagnoseEmailLinkIssue, 1000);
}
