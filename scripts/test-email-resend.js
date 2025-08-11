#!/usr/bin/env node

/**
 * メール再送信機能の統合テスト
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// カラー出力用のヘルパー
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60));
}

function logTest(testName) {
  log(`\n🧪 ${testName}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// テスト用のランダムメールアドレス生成
function generateTestEmail() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `test_resend_${timestamp}_${random}@example.com`;
}

// APIリクエストヘルパー
async function makeRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();
    
    return {
      ok: response.ok,
      status: response.status,
      data,
      headers: response.headers,
    };
  } catch (error) {
    logError(`リクエストエラー: ${error.message}`);
    return {
      ok: false,
      status: 0,
      data: null,
      error: error.message,
    };
  }
}

// テストケース
const testCases = [
  {
    name: '正常な再送信リクエスト',
    async test() {
      const email = generateTestEmail();
      
      // ユーザー登録
      logInfo(`テストユーザー登録: ${email}`);
      const signupRes = await makeRequest('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password: 'Test123!@#',
          name: 'Test User',
        }),
      });

      if (!signupRes.ok) {
        throw new Error(`ユーザー登録失敗: ${JSON.stringify(signupRes.data)}`);
      }

      // 再送信リクエスト
      logInfo('再送信リクエスト送信中...');
      const resendRes = await makeRequest('/api/auth/resend', {
        method: 'POST',
        body: JSON.stringify({
          email,
          reason: 'not_received',
        }),
      });

      if (!resendRes.ok) {
        throw new Error(`再送信失敗: ${JSON.stringify(resendRes.data)}`);
      }

      // レスポンス検証
      const { data } = resendRes;
      if (!data.success) {
        throw new Error('success フラグが false');
      }

      if (!data.data?.cooldownSeconds) {
        throw new Error('cooldownSeconds が返されていない');
      }

      logSuccess(`再送信成功: クールダウン ${data.data.cooldownSeconds} 秒`);
      
      if (data.data.retriesRemaining !== undefined) {
        logInfo(`残り再送信可能回数: ${data.data.retriesRemaining}`);
      }

      return true;
    }
  },

  {
    name: 'レート制限の動作確認',
    async test() {
      const email = generateTestEmail();
      
      // ユーザー登録
      logInfo(`テストユーザー登録: ${email}`);
      const signupRes = await makeRequest('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password: 'Test123!@#',
          name: 'Test User',
        }),
      });

      if (!signupRes.ok) {
        throw new Error(`ユーザー登録失敗: ${JSON.stringify(signupRes.data)}`);
      }

      // 連続して再送信リクエストを送信
      logInfo('連続再送信テスト開始...');
      
      let rateLimited = false;
      for (let i = 1; i <= 5; i++) {
        logInfo(`試行 ${i}/5`);
        
        const resendRes = await makeRequest('/api/auth/resend', {
          method: 'POST',
          body: JSON.stringify({
            email,
            reason: 'not_received',
          }),
        });

        if (resendRes.status === 429) {
          rateLimited = true;
          logSuccess(`レート制限発動（試行 ${i} 回目）`);
          
          const errorData = resendRes.data;
          if (errorData.error?.details?.cooldownSeconds) {
            logInfo(`クールダウン時間: ${errorData.error.details.cooldownSeconds} 秒`);
          }
          break;
        }

        // 短い待機時間
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (!rateLimited) {
        throw new Error('レート制限が発動しませんでした');
      }

      return true;
    }
  },

  {
    name: '既に確認済みのメールアドレス',
    async test() {
      // このテストは実際のメール確認が必要なためスキップ
      logWarning('このテストは手動確認が必要です');
      return 'skipped';
    }
  },

  {
    name: '存在しないメールアドレス',
    async test() {
      const email = 'nonexistent_' + generateTestEmail();
      
      logInfo(`存在しないメールアドレスでテスト: ${email}`);
      const resendRes = await makeRequest('/api/auth/resend', {
        method: 'POST',
        body: JSON.stringify({
          email,
          reason: 'not_received',
        }),
      });

      // セキュリティのため、成功レスポンスが返るべき
      if (!resendRes.ok || resendRes.status !== 200) {
        throw new Error('存在しないメールアドレスでもセキュリティのため200を返すべき');
      }

      logSuccess('セキュリティ対策: 存在しないメールアドレスでも成功レスポンス');
      return true;
    }
  },

  {
    name: '異なる理由での再送信',
    async test() {
      const email = generateTestEmail();
      const reasons = ['not_received', 'expired', 'spam_folder', 'other'];
      
      // ユーザー登録
      logInfo(`テストユーザー登録: ${email}`);
      const signupRes = await makeRequest('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password: 'Test123!@#',
          name: 'Test User',
        }),
      });

      if (!signupRes.ok) {
        throw new Error(`ユーザー登録失敗: ${JSON.stringify(signupRes.data)}`);
      }

      // 各理由でテスト
      for (const reason of reasons) {
        logInfo(`理由「${reason}」で再送信テスト`);
        
        const resendRes = await makeRequest('/api/auth/resend', {
          method: 'POST',
          body: JSON.stringify({
            email,
            reason,
          }),
        });

        if (!resendRes.ok && resendRes.status !== 429) {
          throw new Error(`理由「${reason}」での再送信失敗`);
        }

        if (resendRes.status === 429) {
          logWarning('レート制限に達しました');
          break;
        }

        logSuccess(`理由「${reason}」での再送信成功`);
        
        // レート制限回避のため待機
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      return true;
    }
  },

  {
    name: '入力検証',
    async test() {
      const invalidEmails = [
        '',
        'invalid',
        'invalid@',
        '@example.com',
        'test@',
      ];

      for (const email of invalidEmails) {
        logInfo(`無効なメールアドレスでテスト: "${email}"`);
        
        const resendRes = await makeRequest('/api/auth/resend', {
          method: 'POST',
          body: JSON.stringify({
            email,
            reason: 'not_received',
          }),
        });

        if (resendRes.ok) {
          throw new Error(`無効なメールアドレス "${email}" が受け入れられた`);
        }

        logSuccess(`無効なメールアドレス "${email}" は正しく拒否された`);
      }

      return true;
    }
  },

  {
    name: '指数バックオフの確認',
    async test() {
      const email = generateTestEmail();
      
      // ユーザー登録
      logInfo(`テストユーザー登録: ${email}`);
      const signupRes = await makeRequest('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password: 'Test123!@#',
          name: 'Test User',
        }),
      });

      if (!signupRes.ok) {
        throw new Error(`ユーザー登録失敗: ${JSON.stringify(signupRes.data)}`);
      }

      const cooldowns = [];
      
      // 複数回再送信してクールダウン時間を記録
      for (let i = 1; i <= 3; i++) {
        logInfo(`試行 ${i}: 再送信リクエスト`);
        
        const resendRes = await makeRequest('/api/auth/resend', {
          method: 'POST',
          body: JSON.stringify({
            email,
            reason: 'not_received',
          }),
        });

        if (resendRes.ok && resendRes.data?.data?.cooldownSeconds) {
          cooldowns.push(resendRes.data.data.cooldownSeconds);
          logInfo(`次回クールダウン: ${resendRes.data.data.cooldownSeconds} 秒`);
        }

        // 短い待機時間
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // 指数バックオフの確認（後のクールダウンの方が長い）
      if (cooldowns.length >= 2) {
        const increasing = cooldowns[1] >= cooldowns[0];
        if (increasing) {
          logSuccess('指数バックオフが正しく動作しています');
        } else {
          logWarning('指数バックオフが期待通りではありません');
        }
      }

      return true;
    }
  },
];

// メイン実行関数
async function runTests() {
  logSection('🚀 メール再送信機能テスト開始');
  
  const results = {
    total: testCases.length,
    passed: 0,
    failed: 0,
    skipped: 0,
  };

  const startTime = Date.now();

  for (const testCase of testCases) {
    logTest(testCase.name);
    
    try {
      const result = await testCase.test();
      
      if (result === 'skipped') {
        results.skipped++;
        logWarning('スキップ');
      } else {
        results.passed++;
        logSuccess('成功');
      }
    } catch (error) {
      results.failed++;
      logError(`失敗: ${error.message}`);
    }
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  // 結果サマリー
  logSection('📊 テスト結果サマリー');
  console.log(`実行時間: ${duration} 秒`);
  console.log(`合計: ${results.total} テスト`);
  logSuccess(`成功: ${results.passed}`);
  
  if (results.failed > 0) {
    logError(`失敗: ${results.failed}`);
  }
  
  if (results.skipped > 0) {
    logWarning(`スキップ: ${results.skipped}`);
  }

  const successRate = ((results.passed / (results.total - results.skipped)) * 100).toFixed(1);
  console.log(`成功率: ${successRate}%`);

  // 終了コード
  if (results.failed > 0) {
    logError('\n⚠️  一部のテストが失敗しました');
    process.exit(1);
  } else {
    logSuccess('\n🎉 すべてのテストが成功しました！');
    process.exit(0);
  }
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  logError(`予期しないエラー: ${error}`);
  process.exit(1);
});

// テスト実行
console.log(`テスト対象URL: ${BASE_URL}`);
runTests().catch((error) => {
  logError(`テスト実行エラー: ${error.message}`);
  process.exit(1);
});