// プロフィール機能簡易動作確認スクリプト
// 主要なAPIエンドポイントと機能をチェック

const fetch = require('node-fetch');
const mongoose = require('mongoose');
const readline = require('readline');

const BASE_URL = 'http://localhost:3000';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/board-app';

// カラー出力用
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// テスト結果を収集
const results = {
  passed: [],
  failed: [],
  warnings: []
};

// 1. MongoDB接続とユーザー確認
async function checkDatabase() {
  log('\n📊 データベース確認', 'cyan');
  
  try {
    await mongoose.connect(MONGODB_URI);
    log('✅ MongoDB接続成功', 'green');
    
    const User = mongoose.connection.collection('users');
    const testUser = await User.findOne({ email: 'profile.test@example.com' });
    
    if (testUser) {
      log('✅ テストユーザー確認', 'green');
      log(`  名前: ${testUser.name}`, 'reset');
      log(`  メール確認: ${testUser.emailVerified ? '✅' : '❌'}`, testUser.emailVerified ? 'green' : 'red');
      results.passed.push('データベース接続');
      results.passed.push('テストユーザー存在');
      
      // 名前の頭文字確認
      const initials = testUser.name.substring(0, 2);
      log(`  アバター頭文字: ${initials}`, 'magenta');
      
    } else {
      log('❌ テストユーザーが見つかりません', 'red');
      log('  → test-profile-setup.js を実行してください', 'yellow');
      results.failed.push('テストユーザー不在');
    }
    
    await mongoose.disconnect();
  } catch (error) {
    log(`❌ データベース接続エラー: ${error.message}`, 'red');
    results.failed.push('データベース接続');
  }
}

// 2. API動作確認
async function checkAPIs() {
  log('\n🔌 API動作確認', 'cyan');
  
  // プロフィールAPI（認証なし）
  try {
    const res = await fetch(`${BASE_URL}/api/profile`);
    if (res.status === 401) {
      log('✅ プロフィールAPI保護確認（401エラー正常）', 'green');
      results.passed.push('API認証保護');
    } else {
      log(`⚠️  プロフィールAPI異常レスポンス: ${res.status}`, 'yellow');
      results.warnings.push('API認証異常');
    }
  } catch (error) {
    log(`❌ プロフィールAPI接続エラー: ${error.message}`, 'red');
    results.failed.push('プロフィールAPI');
  }
  
  // パスワード変更API（認証なし）
  try {
    const res = await fetch(`${BASE_URL}/api/profile/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'data' })
    });
    if (res.status === 401) {
      log('✅ パスワード変更API保護確認（401エラー正常）', 'green');
      results.passed.push('パスワードAPI保護');
    } else {
      log(`⚠️  パスワード変更API異常レスポンス: ${res.status}`, 'yellow');
      results.warnings.push('パスワードAPI異常');
    }
  } catch (error) {
    log(`❌ パスワード変更API接続エラー: ${error.message}`, 'red');
    results.failed.push('パスワード変更API');
  }
}

// 3. ページアクセス確認
async function checkPages() {
  log('\n📄 ページアクセス確認', 'cyan');
  
  // プロフィールページ（リダイレクト確認）
  try {
    const res = await fetch(`${BASE_URL}/profile`, {
      redirect: 'manual'
    });
    
    if (res.status === 308 || res.status === 307) {
      const location = res.headers.get('location');
      if (location && location.includes('/auth/signin')) {
        log('✅ 未認証時のリダイレクト動作確認', 'green');
        results.passed.push('認証リダイレクト');
      } else {
        log(`⚠️  予期しないリダイレクト先: ${location}`, 'yellow');
        results.warnings.push('リダイレクト先異常');
      }
    } else {
      log(`⚠️  プロフィールページ異常レスポンス: ${res.status}`, 'yellow');
      results.warnings.push('プロフィールページ異常');
    }
  } catch (error) {
    log(`❌ プロフィールページ接続エラー: ${error.message}`, 'red');
    results.failed.push('プロフィールページ');
  }
}

// 4. 機能チェックリスト表示
function showChecklist() {
  log('\n✅ 手動確認チェックリスト', 'cyan');
  log('================================', 'cyan');
  
  const checklist = [
    '[ ] ログイン後、ヘッダーにユーザー名が表示される',
    '[ ] ヘッダーにアバターアイコンが表示される',
    '[ ] アバターに名前の頭文字が表示される',
    '[ ] アバタークリックでメニューが開く',
    '[ ] メニューから「プロフィール」を選択できる',
    '[ ] プロフィールページで現在の情報が表示される',
    '[ ] 編集ボタンで編集モードに切り替わる',
    '[ ] 名前と自己紹介を変更できる',
    '[ ] 保存後、成功メッセージが表示される',
    '[ ] ヘッダーの名前が更新される',
    '[ ] パスワード変更ダイアログが開く',
    '[ ] パスワード変更後、再ログインが必要',
  ];
  
  checklist.forEach(item => {
    log(item, 'reset');
  });
}

// 5. テスト結果サマリー
function showSummary() {
  log('\n📊 テスト結果サマリー', 'magenta');
  log('================================', 'magenta');
  
  log(`\n✅ 成功: ${results.passed.length}項目`, 'green');
  results.passed.forEach(item => log(`  - ${item}`, 'green'));
  
  if (results.warnings.length > 0) {
    log(`\n⚠️  警告: ${results.warnings.length}項目`, 'yellow');
    results.warnings.forEach(item => log(`  - ${item}`, 'yellow'));
  }
  
  if (results.failed.length > 0) {
    log(`\n❌ 失敗: ${results.failed.length}項目`, 'red');
    results.failed.forEach(item => log(`  - ${item}`, 'red'));
  }
  
  // 総合判定
  log('\n📝 総合判定:', 'cyan');
  if (results.failed.length === 0 && results.warnings.length === 0) {
    log('  🎉 すべてのチェックをパスしました！', 'green');
    log('  手動テストに進んでください。', 'green');
  } else if (results.failed.length === 0) {
    log('  ⚠️  警告はありますが、基本機能は動作しています。', 'yellow');
    log('  手動テストで詳細を確認してください。', 'yellow');
  } else {
    log('  ❌ 問題が検出されました。修正が必要です。', 'red');
    log('  上記のエラーを解決してから手動テストに進んでください。', 'red');
  }
}

// インタラクティブモード
async function interactiveMode() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    log('\n🎯 追加テストを実行しますか？', 'cyan');
    log('1. パフォーマンステスト', 'reset');
    log('2. ブラウザを開いて手動テスト', 'reset');
    log('3. 終了', 'reset');
    
    rl.question('\n選択 (1-3): ', async (answer) => {
      rl.close();
      
      if (answer === '1') {
        await performanceTest();
      } else if (answer === '2') {
        const { exec } = require('child_process');
        exec('open http://localhost:3000/profile');
        log('\n🌐 ブラウザでプロフィールページを開きました', 'green');
        log('PROFILE_COMPLETE_TEST_GUIDE.md を参照してテストを実施してください', 'yellow');
      }
      resolve();
    });
  });
}

// パフォーマンステスト
async function performanceTest() {
  log('\n⚡ パフォーマンステスト', 'cyan');
  
  const endpoints = [
    { url: '/api/profile', method: 'GET', name: 'プロフィール取得' },
    { url: '/profile', method: 'GET', name: 'プロフィールページ' },
  ];
  
  for (const endpoint of endpoints) {
    const start = Date.now();
    try {
      await fetch(`${BASE_URL}${endpoint.url}`, {
        method: endpoint.method,
        redirect: 'manual'
      });
      const time = Date.now() - start;
      
      const status = time < 100 ? '🚀 高速' : time < 500 ? '✅ 良好' : '⚠️  遅い';
      log(`${endpoint.name}: ${time}ms ${status}`, time < 500 ? 'green' : 'yellow');
    } catch (error) {
      log(`${endpoint.name}: ❌ エラー`, 'red');
    }
  }
}

// メイン実行
async function main() {
  log('🔍 プロフィール機能 簡易動作確認', 'magenta');
  log('====================================\n', 'magenta');
  
  // 各チェックを実行
  await checkDatabase();
  await checkAPIs();
  await checkPages();
  
  // 結果表示
  showSummary();
  showChecklist();
  
  // インタラクティブモード
  await interactiveMode();
  
  log('\n✨ チェック完了\n', 'magenta');
  process.exit(results.failed.length > 0 ? 1 : 0);
}

// 実行
main().catch(error => {
  log(`\n致命的エラー: ${error.message}`, 'red');
  process.exit(1);
});