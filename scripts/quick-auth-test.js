#!/usr/bin/env node

/**
 * 🚀 クイック認証テスト
 * 軽量・高速な認証フロー検証スクリプト
 * 
 * Playwrightなしで実行可能な簡易テスト
 */

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.bold}${colors.cyan}═══ ${msg} ═══${colors.reset}`)
};

const BASE_URL = 'http://localhost:3000';

// テスト結果
let results = {
  total: 0,
  passed: 0,
  failed: 0
};

/**
 * HTTPリクエストヘルパー
 */
async function makeRequest(path, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      redirect: 'manual' // リダイレクトを手動処理
    });
    
    return {
      status: response.status,
      headers: response.headers,
      location: response.headers.get('location'),
      body: response.status !== 302 && response.status !== 303 
        ? await response.text().catch(() => null)
        : null
    };
  } catch (error) {
    throw new Error(`リクエスト失敗: ${error.message}`);
  }
}

/**
 * テスト実行
 */
async function runTest(name, testFn) {
  results.total++;
  try {
    await testFn();
    results.passed++;
    log.success(name);
    return true;
  } catch (error) {
    results.failed++;
    log.error(`${name}: ${error.message}`);
    return false;
  }
}

/**
 * メインテスト
 */
async function main() {
  log.section('クイック認証テスト開始');
  
  // ==========================================
  // 1. サーバー接続確認
  // ==========================================
  log.section('サーバー接続確認');
  
  await runTest('開発サーバー接続', async () => {
    const response = await makeRequest('/');
    if (response.status !== 200) {
      throw new Error(`サーバーが応答しません: ${response.status}`);
    }
  });
  
  // ==========================================
  // 2. 保護ページリダイレクトテスト
  // ==========================================
  log.section('保護ページリダイレクトテスト');
  
  const protectedPages = [
    '/dashboard',
    '/profile',
    '/posts/new',
    '/posts/test-id/edit'
  ];
  
  for (const page of protectedPages) {
    await runTest(`${page} リダイレクト`, async () => {
      const response = await makeRequest(page, {
        method: 'GET'
      });
      
      // Next.jsのサーバーコンポーネントは302/303でリダイレクト
      if (response.status !== 302 && response.status !== 303 && response.status !== 307) {
        // HTMLレスポンスの場合はログインページかチェック
        if (response.status === 200 && response.body) {
          if (!response.body.includes('signin') && !response.body.includes('ログイン')) {
            throw new Error(`リダイレクトされませんでした: Status ${response.status}`);
          }
        } else {
          throw new Error(`予期しないステータス: ${response.status}`);
        }
      }
      
      // Locationヘッダーチェック（リダイレクトの場合）
      if (response.location) {
        if (!response.location.includes('/auth/signin')) {
          throw new Error(`誤ったリダイレクト先: ${response.location}`);
        }
        
        // callbackUrlチェック
        const encodedPath = encodeURIComponent(page);
        if (!response.location.includes('callbackUrl')) {
          log.warning(`  callbackUrlが設定されていません: ${response.location}`);
        }
      }
    });
  }
  
  // ==========================================
  // 3. API認証テスト
  // ==========================================
  log.section('API認証テスト');
  
  const apiTests = [
    { 
      path: '/api/profile', 
      method: 'GET', 
      expectedStatus: 401,
      name: 'プロフィールAPI'
    },
    { 
      path: '/api/posts', 
      method: 'POST',
      body: { content: 'test' },
      expectedStatus: 401, // 未認証時は401が正しい
      name: '投稿作成API'
    },
    { 
      path: '/api/user', 
      method: 'DELETE',
      expectedStatus: 405, // メソッド未実装なので405が正しい
      name: 'ユーザー削除API'
    },
    { 
      path: '/api/user/permissions', 
      method: 'GET',
      expectedStatus: 200, // ゲスト許可
      name: '権限確認API'
    }
  ];
  
  for (const test of apiTests) {
    await runTest(`${test.name} (${test.expectedStatus})`, async () => {
      const response = await makeRequest(test.path, {
        method: test.method,
        body: test.body ? JSON.stringify(test.body) : undefined
      });
      
      if (response.status !== test.expectedStatus) {
        throw new Error(`期待: ${test.expectedStatus}, 実際: ${response.status}`);
      }
      
      // エラーレスポンスの形式確認
      if (response.status >= 400 && response.body) {
        try {
          const json = JSON.parse(response.body);
          if (!json.error && !json.message) {
            log.warning('  エラーレスポンスに message/error フィールドがありません');
          }
        } catch {
          // JSONパースエラーは無視
        }
      }
    });
  }
  
  // ==========================================
  // 4. 静的リソーステスト
  // ==========================================
  log.section('静的リソーステスト');
  
  await runTest('favicon.ico アクセス', async () => {
    const response = await makeRequest('/favicon.ico');
    // ファイルが存在するか、404が適切に返されるか
    if (response.status !== 200 && response.status !== 404) {
      throw new Error(`予期しないステータス: ${response.status}`);
    }
  });
  
  // ==========================================
  // 5. セキュリティヘッダーテスト
  // ==========================================
  log.section('セキュリティヘッダーテスト');
  
  await runTest('APIセキュリティヘッダー', async () => {
    const response = await makeRequest('/api/profile');
    
    // Content-Typeチェック
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      log.warning('  Content-Type が application/json ではありません');
    }
    
    // X-Powered-Byヘッダーが露出していないか
    const poweredBy = response.headers.get('x-powered-by');
    if (poweredBy) {
      log.warning('  X-Powered-By ヘッダーが露出しています（セキュリティリスク）');
    }
  });
  
  // ==========================================
  // 6. エラーハンドリングテスト
  // ==========================================
  log.section('エラーハンドリングテスト');
  
  await runTest('存在しないAPI', async () => {
    const response = await makeRequest('/api/nonexistent');
    if (response.status !== 404) {
      throw new Error(`404が返されませんでした: ${response.status}`);
    }
  });
  
  await runTest('不正なJSONボディ', async () => {
    const response = await fetch(`${BASE_URL}/api/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: '{ invalid json }'
    });
    
    // 400番台のエラーが期待される
    if (response.status < 400 || response.status >= 500) {
      log.warning(`  不正なリクエストに対して適切なエラーが返されていません: ${response.status}`);
    }
  });
  
  // ==========================================
  // テスト結果サマリー
  // ==========================================
  log.section('テスト結果サマリー');
  
  const passRate = Math.round((results.passed / results.total) * 100);
  
  console.log(`
${colors.bold}📊 結果:${colors.reset}
  総テスト: ${results.total}
  成功: ${colors.green}${results.passed}${colors.reset}
  失敗: ${colors.red}${results.failed}${colors.reset}
  成功率: ${passRate >= 100 ? colors.green : passRate >= 80 ? colors.yellow : colors.red}${passRate}%${colors.reset}
  `);
  
  if (passRate === 100) {
    console.log(`
${colors.green}${colors.bold}✅ すべてのテストに合格${colors.reset}
会員限定ページ保護が正しく機能しています。
    `);
  } else if (passRate >= 80) {
    console.log(`
${colors.yellow}${colors.bold}⚠ 一部テストが失敗${colors.reset}
主要機能は動作していますが、改善の余地があります。
    `);
  } else {
    console.log(`
${colors.red}${colors.bold}❌ 重大な問題を検出${colors.reset}
会員限定ページ保護に問題があります。即座の修正が必要です。
    `);
  }
  
  process.exit(results.failed > 0 ? 1 : 0);
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  log.error(`未処理のエラー: ${error.message}`);
  process.exit(1);
});

// 実行
main().catch(error => {
  log.error(`テスト実行失敗: ${error.message}`);
  process.exit(1);
});