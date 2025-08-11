/**
 * エッジケース・ストレステスト
 * 極限状態でのメニュー動作を検証
 */

// エッジケーステストスイート
const edgeCaseTests = {
  // Test 1: 極小画面サイズ
  async testTinyScreen() {
    console.log('🔬 Testing tiny screen size (320x480)...');
    
    const originalWidth = window.innerWidth;
    const originalHeight = window.innerHeight;
    
    // 画面サイズ変更をシミュレート
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 320
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 480
    });
    
    window.dispatchEvent(new Event('resize'));
    
    // メニューボタンを探す
    const menuButton = document.querySelector('[aria-label="menu"]');
    if (menuButton) {
      menuButton.click();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const portal = document.querySelector('[data-mobile-menu-portal]');
      const result = {
        test: 'Tiny Screen (320x480)',
        menuVisible: !!portal,
        zIndex: portal ? getComputedStyle(portal).zIndex : 'N/A',
        passed: portal && getComputedStyle(portal).zIndex === '2147483647'
      };
      
      // メニューを閉じる
      const closeButton = document.querySelector('[aria-label="close menu"]');
      if (closeButton) closeButton.click();
      
      // サイズを戻す
      Object.defineProperty(window, 'innerWidth', { value: originalWidth });
      Object.defineProperty(window, 'innerHeight', { value: originalHeight });
      window.dispatchEvent(new Event('resize'));
      
      return result;
    }
    
    return { test: 'Tiny Screen', passed: false, error: 'Menu button not found' };
  },

  // Test 2: 超高速連続タップ
  async testRapidTapping() {
    console.log('⚡ Testing rapid continuous tapping...');
    
    const menuButton = document.querySelector('[aria-label="menu"]');
    if (!menuButton) {
      return { test: 'Rapid Tapping', passed: false, error: 'Menu button not found' };
    }
    
    let errors = [];
    let clickCount = 0;
    
    // エラーリスナー設定
    const errorHandler = (e) => errors.push(e.message);
    window.addEventListener('error', errorHandler);
    
    // 50回高速クリック
    for (let i = 0; i < 50; i++) {
      try {
        menuButton.click();
        clickCount++;
        await new Promise(resolve => setTimeout(resolve, 10));
      } catch (e) {
        errors.push(e.message);
      }
    }
    
    // 安定化を待つ
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // クリーンアップ
    window.removeEventListener('error', errorHandler);
    
    // 最終状態を確認
    const portal = document.querySelector('[data-mobile-menu-portal]');
    const finalState = portal ? 'open' : 'closed';
    
    return {
      test: 'Rapid Tapping (50 clicks)',
      clickCount: clickCount,
      errors: errors.length,
      finalState: finalState,
      passed: errors.length === 0 && clickCount === 50
    };
  },

  // Test 3: メモリ圧迫状態シミュレーション
  async testMemoryPressure() {
    console.log('💾 Testing under memory pressure...');
    
    // 大量のDOMノードを作成してメモリを圧迫
    const fragment = document.createDocumentFragment();
    const heavyElements = [];
    
    for (let i = 0; i < 1000; i++) {
      const div = document.createElement('div');
      div.innerHTML = `<span>Heavy Element ${i}</span>`.repeat(10);
      div.style.display = 'none';
      heavyElements.push(div);
      fragment.appendChild(div);
    }
    
    document.body.appendChild(fragment);
    
    // メニューテスト
    const menuButton = document.querySelector('[aria-label="menu"]');
    let testPassed = false;
    
    if (menuButton) {
      const startTime = performance.now();
      menuButton.click();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const portal = document.querySelector('[data-mobile-menu-portal]');
      const endTime = performance.now();
      
      testPassed = !!portal && (endTime - startTime) < 1000;
      
      // メニューを閉じる
      if (portal) {
        const closeButton = document.querySelector('[aria-label="close menu"]');
        if (closeButton) closeButton.click();
      }
    }
    
    // クリーンアップ
    heavyElements.forEach(el => el.remove());
    
    return {
      test: 'Memory Pressure',
      elementsCreated: 1000,
      passed: testPassed
    };
  },

  // Test 4: 同時複数操作
  async testConcurrentOperations() {
    console.log('🔀 Testing concurrent operations...');
    
    const operations = [];
    const results = [];
    
    // 複数の操作を同時実行
    operations.push(
      // スクロール
      new Promise(resolve => {
        window.scrollTo(0, 100);
        setTimeout(() => {
          results.push({ op: 'scroll', success: true });
          resolve();
        }, 100);
      }),
      
      // リサイズ
      new Promise(resolve => {
        window.dispatchEvent(new Event('resize'));
        setTimeout(() => {
          results.push({ op: 'resize', success: true });
          resolve();
        }, 100);
      }),
      
      // メニュー開閉
      new Promise(async resolve => {
        const menuButton = document.querySelector('[aria-label="menu"]');
        if (menuButton) {
          menuButton.click();
          await new Promise(r => setTimeout(r, 200));
          const portal = document.querySelector('[data-mobile-menu-portal]');
          results.push({ 
            op: 'menu', 
            success: !!portal,
            zIndex: portal ? getComputedStyle(portal).zIndex : 'N/A'
          });
          
          // 閉じる
          const closeButton = document.querySelector('[aria-label="close menu"]');
          if (closeButton) closeButton.click();
        }
        resolve();
      })
    );
    
    await Promise.all(operations);
    
    return {
      test: 'Concurrent Operations',
      operations: results.length,
      allSuccessful: results.every(r => r.success),
      passed: results.every(r => r.success)
    };
  },

  // Test 5: DOM Mutation観察
  async testDOMMutations() {
    console.log('🔄 Testing DOM mutation handling...');
    
    let mutationCount = 0;
    const observer = new MutationObserver((mutations) => {
      mutationCount += mutations.length;
    });
    
    // body全体を監視
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });
    
    // メニューを開く
    const menuButton = document.querySelector('[aria-label="menu"]');
    if (menuButton) {
      menuButton.click();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // DOMを激しく変更
      for (let i = 0; i < 10; i++) {
        const div = document.createElement('div');
        div.className = 'test-mutation-' + i;
        document.body.appendChild(div);
        div.remove();
      }
      
      // メニューがまだ正常か確認
      const portal = document.querySelector('[data-mobile-menu-portal]');
      const stillWorks = portal && getComputedStyle(portal).zIndex === '2147483647';
      
      // メニューを閉じる
      const closeButton = document.querySelector('[aria-label="close menu"]');
      if (closeButton) closeButton.click();
      
      observer.disconnect();
      
      return {
        test: 'DOM Mutations',
        mutationCount: mutationCount,
        menuStillWorks: stillWorks,
        passed: stillWorks
      };
    }
    
    observer.disconnect();
    return { test: 'DOM Mutations', passed: false, error: 'Menu button not found' };
  },

  // Test 6: CSS Animation干渉テスト
  async testCSSAnimationInterference() {
    console.log('🎨 Testing CSS animation interference...');
    
    // 干渉するCSSアニメーションを追加
    const style = document.createElement('style');
    style.textContent = `
      @keyframes interferenceTest {
        0% { transform: scale(1) rotate(0deg); }
        50% { transform: scale(1.5) rotate(180deg); }
        100% { transform: scale(1) rotate(360deg); }
      }
      .interference-test {
        animation: interferenceTest 1s infinite;
        z-index: 999999 !important;
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
      }
    `;
    document.head.appendChild(style);
    
    // 干渉要素を作成
    const interferenceDiv = document.createElement('div');
    interferenceDiv.className = 'interference-test';
    interferenceDiv.style.width = '100px';
    interferenceDiv.style.height = '100px';
    interferenceDiv.style.background = 'rgba(255,0,0,0.3)';
    document.body.appendChild(interferenceDiv);
    
    // メニューテスト
    const menuButton = document.querySelector('[aria-label="menu"]');
    let passed = false;
    
    if (menuButton) {
      menuButton.click();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const portal = document.querySelector('[data-mobile-menu-portal]');
      if (portal) {
        const portalZIndex = parseInt(getComputedStyle(portal).zIndex);
        const interferenceZIndex = parseInt(getComputedStyle(interferenceDiv).zIndex);
        passed = portalZIndex > interferenceZIndex;
        
        // メニューを閉じる
        const closeButton = document.querySelector('[aria-label="close menu"]');
        if (closeButton) closeButton.click();
      }
    }
    
    // クリーンアップ
    style.remove();
    interferenceDiv.remove();
    
    return {
      test: 'CSS Animation Interference',
      passed: passed
    };
  },

  // 全テスト実行
  async runAll() {
    console.clear();
    console.log('%c🚀 EDGE CASE & STRESS TESTS', 'font-size: 20px; font-weight: bold; color: #ff5722');
    console.log('%c' + '='.repeat(50), 'color: #ff5722');
    
    const results = [];
    
    // 各テストを順番に実行
    const tests = [
      this.testTinyScreen,
      this.testRapidTapping,
      this.testMemoryPressure,
      this.testConcurrentOperations,
      this.testDOMMutations,
      this.testCSSAnimationInterference
    ];
    
    for (let i = 0; i < tests.length; i++) {
      console.log(`\n%c[${i + 1}/${tests.length}] Running test...`, 'color: gray');
      try {
        const result = await tests[i]();
        results.push(result);
        
        if (result.passed) {
          console.log(`%c✅ ${result.test}: PASSED`, 'color: green');
        } else {
          console.error(`%c❌ ${result.test}: FAILED`, 'color: red');
        }
      } catch (error) {
        console.error(`%c❌ Test failed with error: ${error.message}`, 'color: red');
        results.push({ test: tests[i].name, passed: false, error: error.message });
      }
      
      // テスト間で少し待機
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // 結果サマリー
    console.log('\n%c' + '='.repeat(50), 'color: #ff5722');
    console.log('%c📊 EDGE CASE TEST RESULTS', 'font-size: 18px; font-weight: bold; color: #ff5722');
    console.log('%c' + '='.repeat(50), 'color: #ff5722');
    
    console.table(results);
    
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    
    console.log(`\n%cPassed: ${passed}/${results.length}`, 'color: green; font-size: 16px');
    
    if (failed === 0) {
      console.log('%c✅ ALL EDGE CASES HANDLED!', 'color: green; font-size: 20px; font-weight: bold');
    } else {
      console.error(`%c❌ ${failed} edge cases failed`, 'color: red; font-size: 16px');
    }
    
    return {
      total: results.length,
      passed: passed,
      failed: failed,
      results: results
    };
  }
};

// グローバルに登録
window.edgeCaseTests = edgeCaseTests;

console.log('%c🔬 Edge Case Tests Loaded!', 'color: #ff5722; font-weight: bold');
console.log('Run: edgeCaseTests.runAll()');