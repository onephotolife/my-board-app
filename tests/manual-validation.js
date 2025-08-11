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
      actual: "Portal not found",
      expected: "2147483647"
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

    // コンテンツのz-index確認
    results.tests.push({
      name: "Content z-index is limited",
      passed: contentStyle.zIndex === "1" || contentStyle.zIndex === "auto",
      actual: contentStyle.zIndex,
      expected: "1 or auto"
    });
  }

  // Test 4: Transform制約検証
  const allElements = document.querySelectorAll('*');
  let transformViolations = [];
  allElements.forEach(el => {
    const style = window.getComputedStyle(el);
    if (style.transform !== 'none' && 
        !el.closest('.MuiDrawer-paper') && 
        !el.closest('.MuiModal-root') &&
        !el.closest('[data-mobile-menu-portal]')) {
      transformViolations.push({
        element: el.tagName + '.' + el.className,
        transform: style.transform
      });
    }
  });
  results.tests.push({
    name: "No unwanted transforms",
    passed: transformViolations.length === 0,
    violations: transformViolations.length,
    elements: transformViolations
  });

  // Test 5: スクロールロック検証（メニュー開いている場合）
  if (portal) {
    const bodyStyle = window.getComputedStyle(document.body);
    results.tests.push({
      name: "Body scroll is locked when menu open",
      passed: bodyStyle.overflow === 'hidden' && bodyStyle.position === 'fixed',
      overflow: bodyStyle.overflow,
      position: bodyStyle.position
    });
  }

  // Test 6: グローバルCSS適用確認
  const testElement = document.createElement('div');
  testElement.setAttribute('data-mobile-menu-portal', 'true');
  document.body.appendChild(testElement);
  const testStyle = window.getComputedStyle(testElement);
  const hasCorrectCSS = testStyle.zIndex === "2147483647";
  document.body.removeChild(testElement);
  
  results.tests.push({
    name: "Global CSS rules are applied",
    passed: hasCorrectCSS,
    actual: hasCorrectCSS ? "Applied" : "Not Applied",
    expected: "Applied"
  });

  // Test 7: MUI Theme z-index設定確認
  const muiBackdrop = document.querySelector('.MuiBackdrop-root');
  if (muiBackdrop) {
    const backdropZIndex = window.getComputedStyle(muiBackdrop).zIndex;
    results.tests.push({
      name: "MUI Backdrop has correct z-index",
      passed: parseInt(backdropZIndex) > 10000,
      actual: backdropZIndex,
      expected: "> 10000"
    });
  }

  // 結果サマリー
  const passed = results.tests.filter(t => t.passed).length;
  const failed = results.tests.filter(t => !t.passed).length;
  
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: blue');
  console.log('%c📊 Z-INDEX VALIDATION RESULTS', 'font-size: 20px; font-weight: bold; color: blue');
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: blue');
  
  console.table(results.tests);
  
  if (failed === 0) {
    console.log('%c✅ ALL TESTS PASSED!', 'color: green; font-size: 18px; font-weight: bold');
    console.log(`%c${passed}/${results.tests.length} tests successful`, 'color: green; font-size: 14px');
  } else {
    console.error(`%c❌ FAILED TESTS: ${failed}`, 'color: red; font-size: 18px; font-weight: bold');
    console.log(`%c✅ Passed: ${passed}/${results.tests.length}`, 'color: green');
    
    // 失敗したテストの詳細
    console.log('%c\nFailed Test Details:', 'font-weight: bold; color: red');
    results.tests.filter(t => !t.passed).forEach(test => {
      console.error(`  ❌ ${test.name}`);
      console.error(`     Expected: ${test.expected}`);
      console.error(`     Actual: ${test.actual}`);
    });
  }
  
  return {
    passed: passed,
    failed: failed,
    total: results.tests.length,
    successRate: ((passed / results.tests.length) * 100).toFixed(2) + '%',
    results: results
  };
}

// パフォーマンステスト
async function performanceProfile() {
  console.log('%c⏱️ Starting Performance Profile...', 'color: orange; font-weight: bold');
  
  const measurements = [];
  const menuButton = document.querySelector('[aria-label="menu"]');
  
  if (!menuButton) {
    console.error('Menu button not found!');
    return null;
  }
  
  for(let i = 0; i < 5; i++) {
    const startTime = performance.now();
    
    // メニューを開く
    menuButton.click();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // メニューを閉じる
    const closeButton = document.querySelector('[aria-label="close menu"]');
    if (closeButton) {
      closeButton.click();
    } else {
      // 背景クリックで閉じる
      const backdrop = document.querySelector('[data-mobile-menu-portal]');
      if (backdrop) backdrop.click();
    }
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const endTime = performance.now();
    measurements.push(endTime - startTime - 1000); // 待機時間を除外
  }
  
  const avg = measurements.reduce((a, b) => a + b) / measurements.length;
  const max = Math.max(...measurements);
  const min = Math.min(...measurements);
  
  const result = {
    average: avg.toFixed(2) + 'ms',
    maximum: max.toFixed(2) + 'ms',
    minimum: min.toFixed(2) + 'ms',
    acceptable: max < 300,
    estimatedFPS: Math.round(1000 / avg)
  };
  
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: orange');
  console.log('%c⚡ PERFORMANCE RESULTS', 'font-size: 16px; font-weight: bold; color: orange');
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: orange');
  console.table(result);
  
  if (result.acceptable) {
    console.log('%c✅ Performance is ACCEPTABLE', 'color: green; font-size: 14px');
  } else {
    console.error('%c❌ Performance needs improvement', 'color: red; font-size: 14px');
  }
  
  return result;
}

// メモリリークテスト
async function memoryLeakTest() {
  if (!('memory' in performance)) {
    console.warn('Memory API not available in this browser');
    return null;
  }
  
  console.log('%c🧪 Starting Memory Leak Test...', 'color: purple; font-weight: bold');
  
  const initialMemory = (performance as any).memory.usedJSHeapSize;
  const menuButton = document.querySelector('[aria-label="menu"]');
  
  if (!menuButton) {
    console.error('Menu button not found!');
    return null;
  }
  
  // 10回開閉
  for(let i = 0; i < 10; i++) {
    menuButton.click();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const closeButton = document.querySelector('[aria-label="close menu"]');
    if (closeButton) {
      closeButton.click();
    } else {
      const backdrop = document.querySelector('[data-mobile-menu-portal]');
      if (backdrop) backdrop.click();
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // ガベージコレクションを待つ
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const finalMemory = (performance as any).memory.usedJSHeapSize;
  const memoryIncrease = finalMemory - initialMemory;
  const memoryIncreaseKB = (memoryIncrease / 1024).toFixed(2);
  
  const result = {
    initialMemory: (initialMemory / 1024 / 1024).toFixed(2) + ' MB',
    finalMemory: (finalMemory / 1024 / 1024).toFixed(2) + ' MB',
    increase: memoryIncreaseKB + ' KB',
    hasLeak: memoryIncrease > 1024 * 1024, // 1MB以上の増加でリーク判定
    acceptable: memoryIncrease < 100 * 1024 // 100KB未満なら許容
  };
  
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: purple');
  console.log('%c💾 MEMORY TEST RESULTS', 'font-size: 16px; font-weight: bold; color: purple');
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: purple');
  console.table(result);
  
  if (result.acceptable) {
    console.log('%c✅ No memory leak detected', 'color: green; font-size: 14px');
  } else if (result.hasLeak) {
    console.error('%c❌ MEMORY LEAK DETECTED!', 'color: red; font-size: 14px; font-weight: bold');
  } else {
    console.warn('%c⚠️ Minor memory increase detected', 'color: orange; font-size: 14px');
  }
  
  return result;
}

// 統合テスト実行
async function runAllTests() {
  console.clear();
  console.log('%c🚀 STARTING COMPREHENSIVE TEST SUITE', 'font-size: 24px; font-weight: bold; color: #1976d2');
  console.log('%c' + '='.repeat(50), 'color: #1976d2');
  
  const allResults = {
    zIndex: null,
    performance: null,
    memory: null,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent
  };
  
  // 1. Z-Index検証
  console.log('\n%c[1/3] Running Z-Index Validation...', 'font-size: 14px; color: gray');
  allResults.zIndex = comprehensiveZIndexValidation();
  
  // 2. パフォーマンステスト
  console.log('\n%c[2/3] Running Performance Tests...', 'font-size: 14px; color: gray');
  allResults.performance = await performanceProfile();
  
  // 3. メモリテスト
  console.log('\n%c[3/3] Running Memory Tests...', 'font-size: 14px; color: gray');
  allResults.memory = await memoryLeakTest();
  
  // 最終レポート
  console.log('\n%c' + '='.repeat(50), 'color: #1976d2');
  console.log('%c📊 FINAL TEST REPORT', 'font-size: 20px; font-weight: bold; color: #1976d2');
  console.log('%c' + '='.repeat(50), 'color: #1976d2');
  
  const totalTests = allResults.zIndex.total + 2; // performance + memory
  const passedTests = allResults.zIndex.passed + 
    (allResults.performance?.acceptable ? 1 : 0) + 
    (allResults.memory?.acceptable ? 1 : 0);
  
  const summary = {
    'Total Tests': totalTests,
    'Passed': passedTests,
    'Failed': totalTests - passedTests,
    'Success Rate': ((passedTests / totalTests) * 100).toFixed(2) + '%',
    'Z-Index Tests': `${allResults.zIndex.passed}/${allResults.zIndex.total}`,
    'Performance': allResults.performance?.acceptable ? '✅ PASS' : '❌ FAIL',
    'Memory': allResults.memory?.acceptable ? '✅ PASS' : '❌ FAIL'
  };
  
  console.table(summary);
  
  if (summary['Failed'] === 0) {
    console.log('%c' + '🎉'.repeat(10), 'font-size: 20px');
    console.log('%c✅ ZERO DEFECTS ACHIEVED!', 'color: green; font-size: 24px; font-weight: bold');
    console.log('%cAll tests passed successfully!', 'color: green; font-size: 16px');
    console.log('%c' + '🎉'.repeat(10), 'font-size: 20px');
  } else {
    console.error('%c❌ DEFECTS FOUND: ' + summary['Failed'], 'color: red; font-size: 20px; font-weight: bold');
    console.error('%cPlease fix the issues and run tests again', 'color: red; font-size: 14px');
  }
  
  return allResults;
}

// エクスポート
window.zIndexTests = {
  validate: comprehensiveZIndexValidation,
  performance: performanceProfile,
  memory: memoryLeakTest,
  runAll: runAllTests
};

console.log('%c✨ Test suite loaded successfully!', 'color: green; font-weight: bold');
console.log('Available commands:');
console.log('  - zIndexTests.validate()   : Run z-index validation');
console.log('  - zIndexTests.performance() : Run performance tests');
console.log('  - zIndexTests.memory()      : Run memory leak tests');
console.log('  - zIndexTests.runAll()      : Run all tests');