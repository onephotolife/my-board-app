/**
 * クイックテスト - モバイルメニューz-index検証
 */

// メニューを開く
function openMenu() {
  const menuButton = document.querySelector('[aria-label="menu"]');
  if (menuButton) {
    menuButton.click();
    console.log('✅ Menu opened');
    return true;
  } else {
    console.error('❌ Menu button not found');
    return false;
  }
}

// z-indexチェック
function checkZIndex() {
  const portal = document.querySelector('[data-mobile-menu-portal]');
  
  if (!portal) {
    console.warn('⚠️ Portal not found - opening menu...');
    openMenu();
    setTimeout(checkZIndex, 500);
    return;
  }
  
  const portalZIndex = window.getComputedStyle(portal).zIndex;
  const boardContent = document.querySelector('#board-content');
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Z-INDEX CHECK RESULTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Portal z-index:', portalZIndex);
  
  if (boardContent) {
    const contentZIndex = window.getComputedStyle(boardContent).zIndex;
    console.log('Board content z-index:', contentZIndex);
  }
  
  // Portal parent check
  console.log('Portal parent:', portal.parentElement.tagName);
  console.log('Is body child:', portal.parentElement === document.body);
  
  // Success check
  if (portalZIndex === '2147483647') {
    console.log('%c✅ Z-INDEX IS CORRECT!', 'color: green; font-size: 16px; font-weight: bold');
  } else {
    console.error('%c❌ Z-INDEX IS WRONG!', 'color: red; font-size: 16px; font-weight: bold');
    console.error('Expected: 2147483647');
    console.error('Actual:', portalZIndex);
  }
  
  // Visual test
  const portalRect = portal.getBoundingClientRect();
  console.log('Portal visibility:', {
    visible: portalRect.width > 0 && portalRect.height > 0,
    width: portalRect.width,
    height: portalRect.height
  });
  
  return portalZIndex === '2147483647';
}

// 実行
console.log('🚀 Starting quick test...');
checkZIndex();