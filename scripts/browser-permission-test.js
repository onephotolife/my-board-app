/**
 * ブラウザコンソールで実行する権限テストスクリプト
 * 使用方法: 
 * 1. ブラウザでアプリケーションを開く
 * 2. F12で開発者ツールを開く
 * 3. Consoleタブでこのスクリプトを貼り付けて実行
 */

console.log('%c🧪 権限管理テスト開始', 'color: blue; font-size: 16px; font-weight: bold');

// テストヘルパークラス
class BrowserPermissionTester {
  constructor() {
    this.results = [];
  }

  // 現在のユーザー権限を確認
  async checkCurrentPermissions() {
    console.log('%c\n📋 現在のユーザー権限を確認中...', 'color: blue; font-weight: bold');
    
    try {
      const res = await fetch('/api/user/permissions');
      const data = await res.json();
      
      console.log('ユーザーID:', data.userId);
      console.log('ロール:', data.role);
      console.log('権限リスト:', data.permissions);
      
      this.results.push({
        test: '権限情報取得',
        status: 'success',
        data: data
      });
      
      return data;
    } catch (error) {
      console.error('❌ 権限情報の取得に失敗:', error);
      this.results.push({
        test: '権限情報取得',
        status: 'failed',
        error: error.message
      });
    }
  }

  // UI要素の権限状態を確認
  checkUIPermissions() {
    console.log('%c\n🎨 UI要素の権限状態を確認中...', 'color: blue; font-weight: bold');
    
    // 編集ボタンの状態
    const editButtons = document.querySelectorAll('[aria-label="edit"]');
    const editStatus = {
      total: editButtons.length,
      enabled: 0,
      disabled: 0
    };
    
    editButtons.forEach((btn, index) => {
      if (btn.disabled) {
        editStatus.disabled++;
        console.log(`  編集ボタン${index + 1}: ⛔ 無効`);
      } else {
        editStatus.enabled++;
        console.log(`  編集ボタン${index + 1}: ✅ 有効`);
      }
    });
    
    // 削除ボタンの状態
    const deleteButtons = document.querySelectorAll('[aria-label="delete"]');
    const deleteStatus = {
      total: deleteButtons.length,
      enabled: 0,
      disabled: 0
    };
    
    deleteButtons.forEach((btn, index) => {
      if (btn.disabled) {
        deleteStatus.disabled++;
        console.log(`  削除ボタン${index + 1}: ⛔ 無効`);
      } else {
        deleteStatus.enabled++;
        console.log(`  削除ボタン${index + 1}: ✅ 有効`);
      }
    });
    
    console.log('\n📊 統計:');
    console.log(`  編集ボタン: ${editStatus.enabled}個有効 / ${editStatus.disabled}個無効`);
    console.log(`  削除ボタン: ${deleteStatus.enabled}個有効 / ${deleteStatus.disabled}個無効`);
    
    this.results.push({
      test: 'UIボタン状態',
      status: 'success',
      data: { editStatus, deleteStatus }
    });
  }

  // APIアクセステスト（読み取り専用）
  async testAPIAccess() {
    console.log('%c\n🔒 APIアクセステスト中...', 'color: blue; font-weight: bold');
    
    // 投稿一覧を取得
    try {
      const res = await fetch('/api/posts?limit=5');
      const data = await res.json();
      
      if (data.posts && data.posts.length > 0) {
        console.log(`✅ ${data.posts.length}件の投稿を取得`);
        
        // 各投稿の権限情報を確認
        data.posts.forEach((post, index) => {
          console.log(`\n投稿${index + 1}: ${post._id}`);
          console.log(`  作成者: ${post.author}`);
          console.log(`  編集可能: ${post.canEdit ? '✅' : '⛔'}`);
          console.log(`  削除可能: ${post.canDelete ? '✅' : '⛔'}`);
          console.log(`  所有者: ${post.isOwner ? '✅' : '⛔'}`);
        });
        
        this.results.push({
          test: 'API投稿取得',
          status: 'success',
          data: data.posts.map(p => ({
            id: p._id,
            canEdit: p.canEdit,
            canDelete: p.canDelete,
            isOwner: p.isOwner
          }))
        });
      }
    } catch (error) {
      console.error('❌ API取得エラー:', error);
      this.results.push({
        test: 'API投稿取得',
        status: 'failed',
        error: error.message
      });
    }
  }

  // 権限違反シミュレーション（非破壊的）
  async simulatePermissionViolation() {
    console.log('%c\n⚠️ 権限違反シミュレーション（読み取り専用）...', 'color: orange; font-weight: bold');
    
    // 存在しない投稿へのアクセスを試行
    try {
      const res = await fetch('/api/posts/000000000000000000000000');
      console.log(`存在しない投稿へのアクセス: ${res.status} ${res.statusText}`);
      
      if (res.status === 404) {
        console.log('✅ 正しく404エラーが返されました');
      }
      
      this.results.push({
        test: '存在しない投稿アクセス',
        status: res.status === 404 ? 'success' : 'warning',
        statusCode: res.status
      });
    } catch (error) {
      console.error('❌ エラー:', error);
    }
  }

  // Cookieとセッション情報を確認
  checkSession() {
    console.log('%c\n🍪 セッション情報を確認中...', 'color: blue; font-weight: bold');
    
    const cookies = document.cookie.split(';').map(c => c.trim());
    const sessionCookie = cookies.find(c => c.startsWith('next-auth.session-token'));
    
    if (sessionCookie) {
      console.log('✅ セッションCookieが存在します');
      console.log('  Cookie名:', sessionCookie.split('=')[0]);
      console.log('  長さ:', sessionCookie.split('=')[1]?.length || 0, '文字');
    } else {
      console.log('⚠️ セッションCookieが見つかりません');
    }
    
    this.results.push({
      test: 'セッション確認',
      status: sessionCookie ? 'success' : 'warning',
      hasSession: !!sessionCookie
    });
  }

  // テスト結果のサマリー
  showSummary() {
    console.log('%c\n📋 テスト結果サマリー', 'color: green; font-size: 16px; font-weight: bold');
    
    const successCount = this.results.filter(r => r.status === 'success').length;
    const failedCount = this.results.filter(r => r.status === 'failed').length;
    const warningCount = this.results.filter(r => r.status === 'warning').length;
    
    console.table(this.results.map(r => ({
      テスト: r.test,
      結果: r.status === 'success' ? '✅ 成功' : 
            r.status === 'failed' ? '❌ 失敗' : '⚠️ 警告'
    })));
    
    console.log(`\n総合結果: 成功 ${successCount} / 失敗 ${failedCount} / 警告 ${warningCount}`);
    
    if (failedCount === 0) {
      console.log('%c✨ すべてのテストが成功しました！', 'color: green; font-weight: bold');
    } else {
      console.log('%c⚠️ 一部のテストが失敗しました', 'color: red; font-weight: bold');
    }
    
    return this.results;
  }
}

// テスト実行
(async () => {
  const tester = new BrowserPermissionTester();
  
  // 各テストを順番に実行
  await tester.checkCurrentPermissions();
  tester.checkUIPermissions();
  await tester.testAPIAccess();
  await tester.simulatePermissionViolation();
  tester.checkSession();
  
  // 結果表示
  const results = tester.showSummary();
  
  // グローバル変数に保存（後で参照可能）
  window.permissionTestResults = results;
  
  console.log('%c\nテスト完了！', 'color: blue; font-size: 14px; font-weight: bold');
  console.log('結果は window.permissionTestResults で確認できます');
})();