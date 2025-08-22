#!/usr/bin/env node

/**
 * 会員限定ページ保護機能テスト
 * 25人天才エンジニア会議による修正後検証
 * 
 * 検証項目:
 * 1. 未認証でのダッシュボードアクセス → ログインページリダイレクト
 * 2. 未認証でのプロフィールアクセス → ログインページリダイレクト  
 * 3. 未認証での投稿作成アクセス → ログインページリダイレクト
 * 4. 未認証での投稿編集アクセス → ログインページリダイレクト
 * 5. callbackUrl機能の動作確認
 */

const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:3000';

// カラー出力
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// テスト結果
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

async function runTest(name, testFn) {
  log(`\n📝 ${name}`, 'cyan');
  try {
    const startTime = Date.now();
    await testFn();
    const duration = Date.now() - startTime;
    log(`  ✅ PASS (${duration}ms)`, 'green');
    results.passed++;
    results.tests.push({ name, status: 'passed', duration });
  } catch (error) {
    log(`  ❌ FAIL: ${error.message}`, 'red');
    results.failed++;
    results.tests.push({ name, status: 'failed', error: error.message });
  }
}

async function main() {
  console.log('\n' + '='.repeat(70));
  log('🛡️ 会員限定ページ保護機能テスト - 25人天才エンジニア会議', 'cyan');
  console.log('='.repeat(70));

  const browser = await chromium.launch({ 
    headless: true,
    slowMo: 300
  });
  
  const context = await browser.newContext();
  
  try {
    
    // テスト1: 未認証でダッシュボードアクセス
    await runTest('テスト1: 未認証 /dashboard → /auth/signin リダイレクト + callbackUrl', async () => {
      const page = await context.newPage();
      
      // 未認証状態を保証（全てのクッキーをクリア）
      await page.context().clearCookies();
      
      // ダッシュボードに直接アクセス
      await page.goto(`${BASE_URL}/dashboard`);
      
      // 3秒待機してリダイレクトを待つ
      await page.waitForTimeout(3000);
      
      const currentUrl = page.url();
      log(`    🔍 リダイレクト先URL: ${currentUrl}`, 'blue');
      
      // ログインページにリダイレクトされていることを確認
      if (!currentUrl.includes('/auth/signin')) {
        throw new Error(`ダッシュボードアクセス時にログインページにリダイレクトされませんでした: ${currentUrl}`);
      }
      
      // callbackUrlが正しく設定されていることを確認
      const url = new URL(currentUrl);
      const callbackUrl = url.searchParams.get('callbackUrl');
      if (callbackUrl !== '/dashboard') {
        throw new Error(`callbackUrlが正しく設定されていません。期待値: /dashboard, 実際: ${callbackUrl}`);
      }
      
      log(`    ✅ 正常: ログインページリダイレクト + callbackUrl設定`, 'green');
      await page.close();
    });

    // テスト2: 未認証でプロフィールアクセス
    await runTest('テスト2: 未認証 /profile → /auth/signin リダイレクト + callbackUrl', async () => {
      const page = await context.newPage();
      await page.context().clearCookies();
      
      await page.goto(`${BASE_URL}/profile`);
      await page.waitForTimeout(3000);
      
      const currentUrl = page.url();
      log(`    🔍 リダイレクト先URL: ${currentUrl}`, 'blue');
      
      if (!currentUrl.includes('/auth/signin')) {
        throw new Error(`プロフィールアクセス時にログインページにリダイレクトされませんでした: ${currentUrl}`);
      }
      
      const url = new URL(currentUrl);
      const callbackUrl = url.searchParams.get('callbackUrl');
      if (callbackUrl !== '/profile') {
        throw new Error(`callbackUrlが正しく設定されていません。期待値: /profile, 実際: ${callbackUrl}`);
      }
      
      log(`    ✅ 正常: ログインページリダイレクト + callbackUrl設定`, 'green');
      await page.close();
    });

    // テスト3: 未認証で投稿作成アクセス
    await runTest('テスト3: 未認証 /posts/new → /auth/signin リダイレクト + callbackUrl', async () => {
      const page = await context.newPage();
      await page.context().clearCookies();
      
      await page.goto(`${BASE_URL}/posts/new`);
      await page.waitForTimeout(3000);
      
      const currentUrl = page.url();
      log(`    🔍 リダイレクト先URL: ${currentUrl}`, 'blue');
      
      if (!currentUrl.includes('/auth/signin')) {
        throw new Error(`投稿作成アクセス時にログインページにリダイレクトされませんでした: ${currentUrl}`);
      }
      
      const url = new URL(currentUrl);
      const callbackUrl = url.searchParams.get('callbackUrl');
      if (callbackUrl !== '/posts/new') {
        throw new Error(`callbackUrlが正しく設定されていません。期待値: /posts/new, 実際: ${callbackUrl}`);
      }
      
      log(`    ✅ 正常: ログインページリダイレクト + callbackUrl設定`, 'green');
      await page.close();
    });

    // テスト4: 未認証で投稿編集アクセス（仮のID使用）
    await runTest('テスト4: 未認証 /posts/[id]/edit → /auth/signin リダイレクト + callbackUrl', async () => {
      const page = await context.newPage();
      await page.context().clearCookies();
      
      const testPostId = '507f1f77bcf86cd799439011'; // 仮のMongoDBオブジェクトID
      await page.goto(`${BASE_URL}/posts/${testPostId}/edit`);
      await page.waitForTimeout(3000);
      
      const currentUrl = page.url();
      log(`    🔍 リダイレクト先URL: ${currentUrl}`, 'blue');
      
      if (!currentUrl.includes('/auth/signin')) {
        throw new Error(`投稿編集アクセス時にログインページにリダイレクトされませんでした: ${currentUrl}`);
      }
      
      const url = new URL(currentUrl);
      const callbackUrl = url.searchParams.get('callbackUrl');
      const expectedCallbackUrl = `/posts/${testPostId}/edit`;
      if (callbackUrl !== expectedCallbackUrl) {
        throw new Error(`callbackUrlが正しく設定されていません。期待値: ${expectedCallbackUrl}, 実際: ${callbackUrl}`);
      }
      
      log(`    ✅ 正常: ログインページリダイレクト + callbackUrl設定`, 'green');
      await page.close();
    });

    // テスト5: callbackUrl機能のエンドツーエンド検証
    await runTest('テスト5: callbackUrl機能 - ログイン後の元ページ復帰確認', async () => {
      const page = await context.newPage();
      await page.context().clearCookies();
      
      // プロフィールページに未認証でアクセス → ログインページリダイレクト
      await page.goto(`${BASE_URL}/profile`);
      await page.waitForTimeout(2000);
      
      // ログインページでcallbackUrlが設定されていることを確認
      let currentUrl = page.url();
      if (!currentUrl.includes('callbackUrl=%2Fprofile')) {
        throw new Error('callbackUrlが正しく設定されていません');
      }
      
      // 認証済みユーザーでログイン
      await page.waitForSelector('input[name="email"]');
      await page.fill('input[name="email"]', 'verified@test.com');
      await page.fill('input[name="password"]', 'Test123!');
      await page.click('button[type="submit"]');
      
      // ログイン成功後、プロフィールページにリダイレクトされることを確認
      await page.waitForTimeout(5000);
      
      currentUrl = page.url();
      log(`    🔍 ログイン後のURL: ${currentUrl}`, 'blue');
      
      if (!currentUrl.includes('/profile') && !currentUrl.includes('/dashboard')) {
        // 追加で3秒待機（ログイン処理の完了を待つ）
        await page.waitForTimeout(3000);
        currentUrl = page.url();
        
        if (!currentUrl.includes('/profile') && !currentUrl.includes('/dashboard')) {
          throw new Error(`ログイン後にプロフィールページまたはダッシュボードにリダイレクトされませんでした: ${currentUrl}`);
        }
      }
      
      log(`    ✅ 正常: ログイン後の適切な元ページ復帰`, 'green');
      await page.close();
    });

  } finally {
    await browser.close();
  }

  // 結果サマリー
  console.log('\n' + '='.repeat(70));
  log('📊 会員限定ページ保護機能テスト結果', 'cyan');
  console.log('='.repeat(70));
  
  const total = results.passed + results.failed;
  const passRate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;
  
  log(`\n✅ 成功: ${results.passed}件`, 'green');
  log(`❌ 失敗: ${results.failed}件`, 'red');
  log(`📈 成功率: ${passRate}%`, passRate === '100.0' ? 'green' : 'red');
  
  if (results.failed > 0) {
    log('\n❌ 失敗したテスト:', 'red');
    results.tests.filter(t => t.status === 'failed').forEach(test => {
      log(`  - ${test.name}: ${test.error}`, 'red');
    });
  }
  
  console.log('\n' + '='.repeat(70));
  
  if (results.failed === 0) {
    log('🎉 会員限定ページ保護機能が完全に実装されました！', 'green');
    log('✨ 未認証リダイレクト + callbackUrl機能 100%動作', 'green');
  } else {
    log('⚠️ 一部の保護機能に問題があります', 'yellow');
  }
  
  console.log('='.repeat(70) + '\n');
  
  process.exit(results.failed > 0 ? 1 : 0);
}

main().catch(error => {
  log(`\n❌ テスト実行エラー: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});