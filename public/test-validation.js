/**
 * 包括的z-index検証スクリプト
 * ブラウザのコンソールで実行してください
 */

function comprehensiveZIndexValidation() {
  const results = {
    timestamp: new Date().toISOString(),
    browser: navigator.userAgent,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    tests: []
  };

  // Test 1: Portal配置検証
  const portal = document.querySelector('[data-mobile-menu-portal]');
  results.tests.push({
    name: "Portal is direct child of body",
    passed: portal?.parentElement === document.body,
    actual: portal?.parentElement?.tagName || 'NOT_FOUND',
    expected: "BODY"
  });

  // Test 2: z-index値検証
  if (portal) {
    const computedZIndex = window.getComputedStyle(portal).zIndex;
    results.tests.push({
      name: "Z-index is maximum value",
      passed: computedZIndex === "2147483647",
      actual: computedZIndex,
      expected: "2147483647"
    });
  } else {
    results.tests.push({
      name: "Z-index is maximum value",
      passed: false,
      actual: "Portal not found - menu not open",
      expected: "2147483647",
      note: "Open menu first"
    });
  }

  // Test 3: Stacking Context検証
  const content = document.querySelector('#board-content');
  if (content) {
    const contentStyle = window.getComputedStyle(content);
    results.tests.push({
      name: "Content has isolation",
      passed: contentStyle.isolation === "isolate",
      actual: contentStyle.isolation,
      expected: "isolate"
    });
  }

  // Test 4: メニューボタン存在確認
  const menuButton = document.querySelector('[aria-label="menu"]');
  results.tests.push({
    name: "Menu button exists",
    passed: !!menuButton,
    actual: menuButton ? "Found" : "Not Found",
    expected: "Found"
  });

  // 結果サマリー
  const passed = results.tests.filter(t => t.passed).length;
  const failed = results.tests.filter(t => !t.passed).length;
  
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: blue');
  console.log('%c📊 Z-INDEX VALIDATION RESULTS', 'font-size: 20px; font-weight: bold; color: blue');
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: blue');
  
  console.table(results.tests);
  
  if (failed === 0) {
    console.log('%c✅ ALL TESTS PASSED!', 'color: green; font-size: 18px; font-weight: bold');
  } else {
    console.error(`%c❌ FAILED TESTS: ${failed}`, 'color: red; font-size: 18px; font-weight: bold');
  }
  
  return {
    passed: passed,
    failed: failed,
    total: results.tests.length,
    successRate: ((passed / results.tests.length) * 100).toFixed(2) + '%'
  };
}

// 自動実行
comprehensiveZIndexValidation();