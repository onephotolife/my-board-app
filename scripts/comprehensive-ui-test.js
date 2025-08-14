/**
 * 包括的UIテストスクリプト
 * TEST_BEST_PRACTICES.mdに基づく完全版
 * 
 * 使用方法:
 * 1. ブラウザで http://localhost:3000/board を開く
 * 2. F12で開発者ツールを開く
 * 3. Consoleタブでこのスクリプトを実行
 */

console.log('%c🧪 包括的UIテスト開始', 'color: blue; font-size: 18px; font-weight: bold');
console.log('テスト開始時刻:', new Date().toLocaleString());

class ComprehensiveUITester {
  constructor() {
    this.results = {
      passed: [],
      failed: [],
      warnings: [],
      metrics: {}
    };
    this.startTime = performance.now();
  }

  // 1. セッション状態テスト
  async testSessionState() {
    console.log('%c\n📝 セッション状態テスト', 'color: green; font-weight: bold');
    
    try {
      // Cookieの確認
      const cookies = document.cookie.split(';').map(c => c.trim());
      const sessionCookie = cookies.find(c => 
        c.startsWith('next-auth.session-token') || 
        c.startsWith('__Secure-next-auth.session-token')
      );
      
      // APIセッション確認
      const response = await fetch('/api/auth/session');
      const session = await response.json();
      
      const testResult = {
        test: 'セッション状態',
        hasCookie: !!sessionCookie,
        hasSession: !!session?.user,
        sessionEmail: session?.user?.email || 'なし',
        status: 'unknown'
      };
      
      if (sessionCookie && session?.user) {
        testResult.status = 'authenticated';
        console.log('✅ 認証済み:', session.user.email);
        this.results.passed.push('セッション状態: 認証済み');
      } else if (!sessionCookie && !session?.user) {
        testResult.status = 'guest';
        console.log('⚠️ ゲストモード');
        this.results.warnings.push('セッション状態: ゲスト');
      } else {
        testResult.status = 'inconsistent';
        console.log('❌ セッション不整合');
        this.results.failed.push('セッション状態: 不整合');
      }
      
      this.results.metrics.sessionStatus = testResult;
      return testResult.status;
      
    } catch (error) {
      console.error('❌ セッションテストエラー:', error);
      this.results.failed.push('セッションテスト: エラー');
      return 'error';
    }
  }

  // 2. 権限情報取得テスト
  async testPermissionsFetch() {
    console.log('%c\n🔐 権限情報取得テスト', 'color: green; font-weight: bold');
    
    try {
      const startTime = performance.now();
      const response = await fetch('/api/user/permissions');
      const responseTime = performance.now() - startTime;
      const permissions = await response.json();
      
      console.log('応答時間:', responseTime.toFixed(2) + 'ms');
      console.log('ユーザーID:', permissions.userId || 'なし');
      console.log('ロール:', permissions.role);
      console.log('権限:', permissions.permissions);
      
      this.results.metrics.permissionsFetch = {
        responseTime,
        role: permissions.role,
        permissionsCount: permissions.permissions?.length || 0
      };
      
      // パフォーマンス目標チェック（< 200ms）
      if (responseTime < 200) {
        this.results.passed.push(`権限取得API: ${responseTime.toFixed(2)}ms (目標達成)`);
      } else if (responseTime < 500) {
        this.results.warnings.push(`権限取得API: ${responseTime.toFixed(2)}ms (やや遅い)`);
      } else {
        this.results.failed.push(`権限取得API: ${responseTime.toFixed(2)}ms (目標未達成)`);
      }
      
      return permissions;
      
    } catch (error) {
      console.error('❌ 権限取得エラー:', error);
      this.results.failed.push('権限取得: エラー');
      return null;
    }
  }

  // 3. UIボタン状態テスト
  testUIButtonStates() {
    console.log('%c\n🎨 UIボタン状態テスト', 'color: green; font-weight: bold');
    
    const testResults = {
      editButtons: { total: 0, enabled: 0, disabled: 0, tooltips: [] },
      deleteButtons: { total: 0, enabled: 0, disabled: 0, tooltips: [] }
    };
    
    // 編集ボタンのテスト
    const editButtons = document.querySelectorAll('[aria-label="edit"]');
    testResults.editButtons.total = editButtons.length;
    
    editButtons.forEach((btn, index) => {
      const parent = btn.closest('[data-post-id]');
      const postId = parent?.dataset.postId || 'unknown';
      
      if (btn.disabled) {
        testResults.editButtons.disabled++;
        console.log(`  📝 編集ボタン[${index + 1}] (Post: ${postId}): ⛔ 無効`);
        
        // Tooltipの確認
        const tooltip = btn.getAttribute('title') || btn.parentElement?.getAttribute('title');
        if (tooltip) {
          testResults.editButtons.tooltips.push(tooltip);
          console.log(`     → Tooltip: "${tooltip}"`);
        }
      } else {
        testResults.editButtons.enabled++;
        console.log(`  📝 編集ボタン[${index + 1}] (Post: ${postId}): ✅ 有効`);
      }
    });
    
    // 削除ボタンのテスト
    const deleteButtons = document.querySelectorAll('[aria-label="delete"]');
    testResults.deleteButtons.total = deleteButtons.length;
    
    deleteButtons.forEach((btn, index) => {
      const parent = btn.closest('[data-post-id]');
      const postId = parent?.dataset.postId || 'unknown';
      
      if (btn.disabled) {
        testResults.deleteButtons.disabled++;
        console.log(`  🗑️ 削除ボタン[${index + 1}] (Post: ${postId}): ⛔ 無効`);
        
        // Tooltipの確認
        const tooltip = btn.getAttribute('title') || btn.parentElement?.getAttribute('title');
        if (tooltip) {
          testResults.deleteButtons.tooltips.push(tooltip);
          console.log(`     → Tooltip: "${tooltip}"`);
        }
      } else {
        testResults.deleteButtons.enabled++;
        console.log(`  🗑️ 削除ボタン[${index + 1}] (Post: ${postId}): ✅ 有効`);
      }
    });
    
    // 結果サマリー
    console.log('\n📊 ボタン状態サマリー:');
    console.log(`編集ボタン: ${testResults.editButtons.enabled}個有効 / ${testResults.editButtons.disabled}個無効 / 合計${testResults.editButtons.total}個`);
    console.log(`削除ボタン: ${testResults.deleteButtons.enabled}個有効 / ${testResults.deleteButtons.disabled}個無効 / 合計${testResults.deleteButtons.total}個`);
    
    this.results.metrics.uiButtons = testResults;
    
    // テスト結果の判定
    if (testResults.editButtons.total > 0 && testResults.deleteButtons.total > 0) {
      this.results.passed.push('UIボタン表示: 正常');
    } else {
      this.results.failed.push('UIボタン表示: ボタンが見つからない');
    }
    
    return testResults;
  }

  // 4. 投稿データ権限テスト
  async testPostPermissions() {
    console.log('%c\n📄 投稿データ権限テスト', 'color: green; font-weight: bold');
    
    try {
      const response = await fetch('/api/posts?limit=5');
      const data = await response.json();
      
      if (!data.posts || data.posts.length === 0) {
        console.log('⚠️ 投稿データなし');
        this.results.warnings.push('投稿データ: なし');
        return;
      }
      
      const permissionStats = {
        total: data.posts.length,
        canEdit: 0,
        canDelete: 0,
        isOwner: 0
      };
      
      console.log(`\n📑 ${data.posts.length}件の投稿を分析:`);
      data.posts.forEach((post, index) => {
        console.log(`\n投稿${index + 1}: ${post._id}`);
        console.log(`  作成者: ${post.author}`);
        console.log(`  編集可能: ${post.canEdit ? '✅' : '⛔'}`);
        console.log(`  削除可能: ${post.canDelete ? '✅' : '⛔'}`);
        console.log(`  所有者: ${post.isOwner ? '✅' : '⛔'}`);
        console.log(`  内容: "${post.content?.substring(0, 30)}..."`);
        
        if (post.canEdit) permissionStats.canEdit++;
        if (post.canDelete) permissionStats.canDelete++;
        if (post.isOwner) permissionStats.isOwner++;
      });
      
      console.log('\n📊 権限統計:');
      console.log(`  編集可能: ${permissionStats.canEdit}/${permissionStats.total} 件`);
      console.log(`  削除可能: ${permissionStats.canDelete}/${permissionStats.total} 件`);
      console.log(`  所有投稿: ${permissionStats.isOwner}/${permissionStats.total} 件`);
      
      this.results.metrics.postPermissions = permissionStats;
      this.results.passed.push(`投稿権限分析: ${permissionStats.total}件完了`);
      
      return permissionStats;
      
    } catch (error) {
      console.error('❌ 投稿権限テストエラー:', error);
      this.results.failed.push('投稿権限テスト: エラー');
    }
  }

  // 5. パフォーマンステスト
  async testPerformance() {
    console.log('%c\n⚡ パフォーマンステスト', 'color: green; font-weight: bold');
    
    const performanceTests = [];
    
    // API応答時間テスト
    const endpoints = [
      { url: '/api/posts?limit=10', name: '投稿一覧' },
      { url: '/api/user/permissions', name: '権限情報' },
      { url: '/api/auth/session', name: 'セッション' }
    ];
    
    for (const endpoint of endpoints) {
      const times = [];
      
      // 3回測定して平均を取る
      for (let i = 0; i < 3; i++) {
        const startTime = performance.now();
        try {
          await fetch(endpoint.url);
          const responseTime = performance.now() - startTime;
          times.push(responseTime);
        } catch (error) {
          console.error(`❌ ${endpoint.name} エラー:`, error);
        }
      }
      
      if (times.length > 0) {
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const maxTime = Math.max(...times);
        const minTime = Math.min(...times);
        
        console.log(`\n${endpoint.name}:`);
        console.log(`  平均: ${avgTime.toFixed(2)}ms`);
        console.log(`  最小: ${minTime.toFixed(2)}ms`);
        console.log(`  最大: ${maxTime.toFixed(2)}ms`);
        
        performanceTests.push({
          endpoint: endpoint.name,
          avg: avgTime,
          min: minTime,
          max: maxTime
        });
        
        // 目標値チェック（平均 < 200ms）
        if (avgTime < 200) {
          this.results.passed.push(`${endpoint.name}: ${avgTime.toFixed(2)}ms (目標達成)`);
        } else if (avgTime < 500) {
          this.results.warnings.push(`${endpoint.name}: ${avgTime.toFixed(2)}ms (要改善)`);
        } else {
          this.results.failed.push(`${endpoint.name}: ${avgTime.toFixed(2)}ms (目標未達成)`);
        }
      }
    }
    
    this.results.metrics.performance = performanceTests;
    return performanceTests;
  }

  // 6. セキュリティテスト
  async testSecurity() {
    console.log('%c\n🔒 セキュリティテスト', 'color: green; font-weight: bold');
    
    const securityChecks = [];
    
    // 1. 未認証での保護エンドポイントアクセス
    console.log('\n1. 未認証アクセステスト:');
    try {
      const testPostId = '000000000000000000000000';
      const response = await fetch(`/api/posts/${testPostId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Unauthorized test' })
      });
      
      if (response.status === 401) {
        console.log('  ✅ 401エラーが正しく返される');
        this.results.passed.push('未認証アクセス防御: 正常');
        securityChecks.push({ test: '未認証アクセス', result: 'PASS' });
      } else {
        console.log(`  ❌ 予期しないステータス: ${response.status}`);
        this.results.failed.push('未認証アクセス防御: 異常');
        securityChecks.push({ test: '未認証アクセス', result: 'FAIL' });
      }
    } catch (error) {
      console.error('  ❌ テストエラー:', error);
    }
    
    // 2. CSRFトークンの確認
    console.log('\n2. CSRFトークン確認:');
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
    if (csrfToken) {
      console.log('  ✅ CSRFトークン存在');
      this.results.passed.push('CSRFトークン: 存在');
      securityChecks.push({ test: 'CSRFトークン', result: 'PASS' });
    } else {
      console.log('  ⚠️ CSRFトークンが見つからない');
      this.results.warnings.push('CSRFトークン: なし');
      securityChecks.push({ test: 'CSRFトークン', result: 'WARNING' });
    }
    
    // 3. HTTPSの確認
    console.log('\n3. HTTPS確認:');
    if (window.location.protocol === 'https:') {
      console.log('  ✅ HTTPS使用中');
      this.results.passed.push('HTTPS: 有効');
      securityChecks.push({ test: 'HTTPS', result: 'PASS' });
    } else {
      console.log('  ⚠️ HTTP使用中（開発環境）');
      this.results.warnings.push('HTTPS: 無効（開発環境）');
      securityChecks.push({ test: 'HTTPS', result: 'WARNING' });
    }
    
    this.results.metrics.security = securityChecks;
    return securityChecks;
  }

  // 7. 手動テストシナリオのガイド表示
  displayManualTestGuide() {
    console.log('%c\n📋 手動テストシナリオ', 'color: purple; font-size: 16px; font-weight: bold');
    
    console.log('\n%c【シナリオ1: 投稿所有者のテスト】', 'color: blue; font-weight: bold');
    console.log('1. ログイン状態を確認');
    console.log('2. 新規投稿を作成（テスト投稿）');
    console.log('3. 作成した投稿の編集ボタンをクリック');
    console.log('   期待結果: 編集ダイアログが開く');
    console.log('4. 内容を変更して保存');
    console.log('   期待結果: 投稿が更新される');
    console.log('5. 削除ボタンをクリック');
    console.log('   期待結果: 確認ダイアログが表示');
    
    console.log('\n%c【シナリオ2: 非所有者のテスト】', 'color: blue; font-weight: bold');
    console.log('1. 他のユーザーの投稿を表示');
    console.log('2. 編集ボタンにマウスオーバー');
    console.log('   期待結果: 「編集権限がありません」のTooltip');
    console.log('3. 編集ボタンをクリック');
    console.log('   期待結果: 何も起こらない（無効化）');
    console.log('4. 削除ボタンも同様に確認');
    
    this.results.metrics.manualTestGuide = 'Displayed';
  }

  // テスト結果のサマリー生成
  generateSummary() {
    const endTime = performance.now();
    const totalTime = ((endTime - this.startTime) / 1000).toFixed(2);
    
    console.log('%c\n📊 テスト結果サマリー', 'color: green; font-size: 18px; font-weight: bold');
    console.log('=====================================');
    
    // 結果統計
    const stats = {
      passed: this.results.passed.length,
      failed: this.results.failed.length,
      warnings: this.results.warnings.length,
      total: this.results.passed.length + this.results.failed.length + this.results.warnings.length
    };
    
    // 成功率計算
    const successRate = stats.total > 0 ? 
      ((stats.passed / stats.total) * 100).toFixed(1) : 0;
    
    console.log(`\n📈 統計情報:`);
    console.log(`  実行時間: ${totalTime}秒`);
    console.log(`  テスト項目数: ${stats.total}`);
    console.log(`  成功: ${stats.passed} (${successRate}%)`);
    console.log(`  失敗: ${stats.failed}`);
    console.log(`  警告: ${stats.warnings}`);
    
    // 詳細結果
    if (this.results.passed.length > 0) {
      console.log('\n✅ 成功項目:');
      this.results.passed.forEach(item => console.log(`  • ${item}`));
    }
    
    if (this.results.failed.length > 0) {
      console.log('\n❌ 失敗項目:');
      this.results.failed.forEach(item => console.log(`  • ${item}`));
    }
    
    if (this.results.warnings.length > 0) {
      console.log('\n⚠️ 警告項目:');
      this.results.warnings.forEach(item => console.log(`  • ${item}`));
    }
    
    // 総合評価
    console.log('\n🎯 総合評価:');
    if (stats.failed === 0 && stats.warnings < 3) {
      console.log('%c  優秀 - すべての主要テストに合格', 'color: green; font-weight: bold');
    } else if (stats.failed < 2) {
      console.log('%c  良好 - 軽微な問題あり', 'color: orange; font-weight: bold');
    } else {
      console.log('%c  要改善 - 複数の問題を検出', 'color: red; font-weight: bold');
    }
    
    // 推奨アクション
    console.log('\n💡 推奨アクション:');
    if (this.results.metrics.sessionStatus?.status === 'guest') {
      console.log('  • ログインして認証済みユーザーのテストを実施');
    }
    if (this.results.failed.length > 0) {
      console.log('  • 失敗項目の原因調査と修正');
    }
    if (this.results.warnings.length > 2) {
      console.log('  • 警告項目の改善');
    }
    
    return {
      stats,
      successRate,
      totalTime,
      timestamp: new Date().toISOString()
    };
  }
}

// テスト実行
(async function runComprehensiveTest() {
  const tester = new ComprehensiveUITester();
  
  try {
    // テストを順次実行
    await tester.testSessionState();
    await tester.testPermissionsFetch();
    tester.testUIButtonStates();
    await tester.testPostPermissions();
    await tester.testPerformance();
    await tester.testSecurity();
    tester.displayManualTestGuide();
    
    // サマリー生成
    const summary = tester.generateSummary();
    
    // 結果をグローバル変数に保存
    window.comprehensiveTestResults = {
      results: tester.results,
      summary
    };
    
    console.log('\n%c✨ テスト完了!', 'color: blue; font-size: 16px; font-weight: bold');
    console.log('詳細結果は window.comprehensiveTestResults で確認できます');
    console.log('=====================================\n');
    
    // 結果をJSONとして出力（コピー用）
    console.log('📋 JSONレポート（コピー用）:');
    console.log(JSON.stringify(window.comprehensiveTestResults, null, 2));
    
  } catch (error) {
    console.error('%c❌ テスト実行エラー', 'color: red; font-weight: bold');
    console.error(error);
  }
})();