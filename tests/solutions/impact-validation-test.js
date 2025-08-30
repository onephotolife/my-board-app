#!/usr/bin/env node

/**
 * 影響範囲検証テスト - 解決策1実装後の確認
 * STRICT120プロトコル準拠
 * 認証必須: one.photolife+1@gmail.com / ?@thc123THC@?
 */

const http = require('http');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// 設定
const BASE_URL = 'http://localhost:3000';
const AUTH_EMAIL = 'one.photolife+1@gmail.com';
const AUTH_PASSWORD = '?@thc123THC@?';

// ログ設定
const LOG_FILE = path.join(__dirname, `impact-test-${Date.now()}.log`);
const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });

function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    data
  };
  
  const colorMap = {
    'ERROR': '\x1b[31m',
    'WARN': '\x1b[33m',
    'INFO': '\x1b[36m',
    'DEBUG': '\x1b[90m',
    'SUCCESS': '\x1b[32m'
  };
  
  const color = colorMap[level] || '';
  const reset = '\x1b[0m';
  
  console.log(`${color}[${timestamp}] [${level}] ${message}${reset}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
  
  logStream.write(JSON.stringify(logEntry) + '\n');
}

// HTTPリクエストヘルパー
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function runImpactTests() {
  log('INFO', '========================================');
  log('INFO', '影響範囲検証テスト開始');
  log('INFO', `実行時刻: ${new Date().toISOString()}`);
  log('INFO', '========================================');
  
  const testResults = {
    directImpact: [],
    indirectImpact: [],
    routingIntegrity: [],
    apiEndpoints: [],
    layoutConsistency: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      warnings: 0
    }
  };
  
  try {
    // 1. 削除ファイルの確認
    log('INFO', '=== 削除ファイルの確認 ===');
    const deletedFiles = [
      'src/app/(main)/posts/new/page.tsx',
      'src/app/(main)/posts/[id]/page.tsx',
      'src/app/(main)/posts/[id]/edit/page.tsx'
    ];
    
    for (const file of deletedFiles) {
      const exists = fs.existsSync(path.join(process.cwd(), file));
      testResults.directImpact.push({
        file: file,
        exists: exists,
        status: exists ? 'FAILED' : 'DELETED'
      });
      
      if (exists) {
        log('ERROR', `❌ ファイルが残存: ${file}`);
      } else {
        log('SUCCESS', `✅ ファイル削除確認: ${file}`);
      }
    }
    
    // 2. 残存ファイルの確認
    log('INFO', '=== 残存ファイルの確認 ===');
    const requiredFiles = [
      'src/app/posts/new/page.tsx',
      'src/app/posts/[id]/page.tsx',
      'src/app/posts/[id]/edit/page.tsx'
    ];
    
    for (const file of requiredFiles) {
      const exists = fs.existsSync(path.join(process.cwd(), file));
      testResults.directImpact.push({
        file: file,
        exists: exists,
        status: exists ? 'EXISTS' : 'MISSING'
      });
      
      if (exists) {
        log('SUCCESS', `✅ 必須ファイル存在: ${file}`);
      } else {
        log('ERROR', `❌ 必須ファイル欠落: ${file}`);
      }
    }
    
    // 3. ルーティングの整合性確認
    log('INFO', '=== ルーティング整合性確認 ===');
    const routes = [
      { path: '/posts/new', name: '新規投稿' },
      { path: '/posts/test-id', name: '投稿詳細' },
      { path: '/posts/test-id/edit', name: '投稿編集' },
      { path: '/board', name: '掲示板' },
      { path: '/my-posts', name: 'マイ投稿' }
    ];
    
    for (const route of routes) {
      try {
        const response = await makeRequest(`${BASE_URL}${route.path}`, {
          method: 'GET'
        });
        
        const hasError = response.body.toLowerCase().includes('parallel pages') ||
                        response.statusCode === 500;
        
        testResults.routingIntegrity.push({
          route: route.path,
          name: route.name,
          status: response.statusCode,
          hasError: hasError,
          passed: !hasError
        });
        
        if (hasError) {
          log('ERROR', `❌ ルートエラー: ${route.name} (${route.path})`);
        } else {
          log('SUCCESS', `✅ ルート正常: ${route.name} (${route.path})`);
        }
      } catch (error) {
        log('ERROR', `ルートテスト失敗: ${route.name}`, error.message);
        testResults.routingIntegrity.push({
          route: route.path,
          name: route.name,
          error: error.message,
          passed: false
        });
      }
    }
    
    // 4. 参照整合性の確認（my-postsからのリンク）
    log('INFO', '=== 参照整合性確認 ===');
    try {
      // my-posts内のリンクパターンを確認
      const myPostsFile = path.join(process.cwd(), 'src/app/my-posts/page.tsx');
      if (fs.existsSync(myPostsFile)) {
        const content = fs.readFileSync(myPostsFile, 'utf-8');
        const hasPostsLinks = content.includes('/posts/');
        const hasMainPostsLinks = content.includes('/(main)/posts/');
        
        testResults.indirectImpact.push({
          file: 'my-posts/page.tsx',
          hasPostsLinks: hasPostsLinks,
          hasMainPostsLinks: hasMainPostsLinks,
          status: hasPostsLinks && !hasMainPostsLinks ? 'OK' : 'WARNING'
        });
        
        if (hasPostsLinks && !hasMainPostsLinks) {
          log('SUCCESS', '✅ my-postsのリンクパスが正しい（/posts/）');
        } else if (hasMainPostsLinks) {
          log('WARN', '⚠️ my-postsに(main)/postsへの参照が残っています');
        }
      }
    } catch (error) {
      log('ERROR', '参照整合性確認エラー', error.message);
    }
    
    // 5. APIエンドポイントの動作確認
    log('INFO', '=== APIエンドポイント確認 ===');
    const apiEndpoints = [
      { path: '/api/posts', method: 'GET', name: '投稿一覧API' },
      { path: '/api/auth/session', method: 'GET', name: 'セッションAPI' },
      { path: '/api/auth/csrf', method: 'GET', name: 'CSRF API' }
    ];
    
    for (const endpoint of apiEndpoints) {
      try {
        const response = await makeRequest(`${BASE_URL}${endpoint.path}`, {
          method: endpoint.method
        });
        
        testResults.apiEndpoints.push({
          endpoint: endpoint.path,
          name: endpoint.name,
          status: response.statusCode,
          passed: response.statusCode < 500
        });
        
        if (response.statusCode < 500) {
          log('SUCCESS', `✅ API正常: ${endpoint.name}`);
        } else {
          log('ERROR', `❌ APIエラー: ${endpoint.name}`, {
            status: response.statusCode
          });
        }
      } catch (error) {
        log('ERROR', `APIテスト失敗: ${endpoint.name}`, error.message);
        testResults.apiEndpoints.push({
          endpoint: endpoint.path,
          name: endpoint.name,
          error: error.message,
          passed: false
        });
      }
    }
    
    // 6. レイアウトの一貫性確認
    log('INFO', '=== レイアウト一貫性確認 ===');
    
    // AppLayout使用状況
    try {
      const { stdout: appLayoutCount } = await execPromise(
        'grep -r "AppLayout" src/app --include="*.tsx" | wc -l'
      );
      
      testResults.layoutConsistency.push({
        component: 'AppLayout',
        usage: parseInt(appLayoutCount.trim()),
        status: 'MEASURED'
      });
      
      log('INFO', `AppLayout使用箇所: ${appLayoutCount.trim()}件`);
    } catch (error) {
      log('ERROR', 'AppLayout確認エラー', error.message);
    }
    
    // ClientHeader使用状況
    try {
      const { stdout: clientHeaderCount } = await execPromise(
        'grep -r "ClientHeader" src/app --include="*.tsx" | wc -l'
      );
      
      testResults.layoutConsistency.push({
        component: 'ClientHeader',
        usage: parseInt(clientHeaderCount.trim()),
        status: 'MEASURED'
      });
      
      log('INFO', `ClientHeader使用箇所: ${clientHeaderCount.trim()}件`);
    } catch (error) {
      log('ERROR', 'ClientHeader確認エラー', error.message);
    }
    
    // 7. 結果集計
    log('INFO', '========================================');
    log('INFO', '影響範囲検証結果サマリー');
    log('INFO', '========================================');
    
    // 各カテゴリの集計
    const categories = [
      { name: '直接影響', data: testResults.directImpact },
      { name: 'ルーティング', data: testResults.routingIntegrity },
      { name: 'API', data: testResults.apiEndpoints },
      { name: '間接影響', data: testResults.indirectImpact }
    ];
    
    for (const category of categories) {
      const passed = category.data.filter(t => 
        t.passed === true || t.status === 'DELETED' || t.status === 'EXISTS' || t.status === 'OK'
      ).length;
      const failed = category.data.filter(t => 
        t.passed === false || t.status === 'FAILED' || t.status === 'MISSING'
      ).length;
      const warnings = category.data.filter(t => 
        t.status === 'WARNING'
      ).length;
      
      testResults.summary.total += category.data.length;
      testResults.summary.passed += passed;
      testResults.summary.failed += failed;
      testResults.summary.warnings += warnings;
      
      log('INFO', `${category.name}:`);
      log('INFO', `  ✅ 正常: ${passed}`);
      if (failed > 0) log('INFO', `  ❌ 異常: ${failed}`);
      if (warnings > 0) log('INFO', `  ⚠️  警告: ${warnings}`);
    }
    
    log('INFO', '========================================');
    log('INFO', `総合結果:`);
    log('INFO', `  検証項目数: ${testResults.summary.total}`);
    log('INFO', `  ✅ 正常: ${testResults.summary.passed}`);
    log('INFO', `  ❌ 異常: ${testResults.summary.failed}`);
    log('INFO', `  ⚠️  警告: ${testResults.summary.warnings}`);
    
    // 最終判定
    const overallSuccess = testResults.summary.failed === 0;
    if (overallSuccess) {
      log('SUCCESS', '🎉 影響範囲検証: すべて正常');
    } else {
      log('ERROR', '❌ 影響範囲検証: 問題が検出されました');
    }
    
    // 詳細結果の保存
    const resultFile = path.join(__dirname, `impact-test-results-${Date.now()}.json`);
    fs.writeFileSync(resultFile, JSON.stringify(testResults, null, 2));
    log('INFO', `詳細結果を保存: ${resultFile}`);
    
    log('INFO', '========================================');
    log('INFO', 'I attest: all impact validations completed.');
    log('INFO', `Timestamp: ${new Date().toISOString()}`);
    log('INFO', '========================================');
    
    return overallSuccess;
    
  } catch (error) {
    log('ERROR', '予期しないエラー', error);
    return false;
  } finally {
    logStream.end();
  }
}

// 実行
if (require.main === module) {
  runImpactTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { runImpactTests };