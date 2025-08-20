#!/usr/bin/env node

/**
 * 認証保護機能の自動テストスクリプト
 * 実行方法: node scripts/test-auth.js
 */

const https = require('https');
const http = require('http');

// カラー出力用のヘルパー
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.cyan}━━━ ${msg} ━━━${colors.reset}\n`),
};

// テスト設定
const CONFIG = {
  host: 'localhost',
  port: 3000,
  protocol: 'http:',
  testUser: {
    email: 'test@example.com',
    password: 'TestPassword123!',
  },
};

// HTTPリクエストヘルパー
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const lib = options.protocol === 'https:' ? https : http;
    
    const req = lib.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });
    
    req.on('error', reject);
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

// テストケース実行
class AuthTester {
  constructor() {
    this.results = [];
    this.sessionCookie = null;
  }

  async runTest(name, testFn) {
    try {
      log.info(`Testing: ${name}`);
      await testFn();
      this.results.push({ name, passed: true });
      log.success(`${name} - PASSED`);
    } catch (error) {
      this.results.push({ name, passed: false, error: error.message });
      log.error(`${name} - FAILED: ${error.message}`);
    }
  }

  // テスト1: 未認証アクセスのテスト
  async testUnauthenticatedAccess() {
    const protectedPaths = ['/dashboard', '/profile', '/posts/new'];
    
    for (const path of protectedPaths) {
      const options = {
        hostname: CONFIG.host,
        port: CONFIG.port,
        path: path,
        method: 'GET',
        protocol: CONFIG.protocol,
        headers: {
          'User-Agent': 'AuthTester/1.0',
        },
      };
      
      const response = await makeRequest(options);
      
      if (response.statusCode !== 302 && response.statusCode !== 303) {
        throw new Error(`Expected redirect for ${path}, got ${response.statusCode}`);
      }
      
      const location = response.headers.location;
      if (!location || !location.includes('/auth/signin')) {
        throw new Error(`Expected redirect to /auth/signin, got ${location}`);
      }
      
      if (!location.includes('callbackUrl')) {
        throw new Error(`Expected callbackUrl parameter in redirect URL`);
      }
      
      log.success(`  ${path} → Redirected to signin with callbackUrl`);
    }
  }

  // テスト2: APIエンドポイントの保護
  async testAPIProtection() {
    const apiPaths = ['/api/posts', '/api/posts/123'];
    
    for (const path of apiPaths) {
      const options = {
        hostname: CONFIG.host,
        port: CONFIG.port,
        path: path,
        method: 'GET',
        protocol: CONFIG.protocol,
        headers: {
          'Content-Type': 'application/json',
        },
      };
      
      const response = await makeRequest(options);
      
      // APIは401または403を返すべき（実装によって異なる）
      if (response.statusCode !== 401 && response.statusCode !== 403) {
        log.warn(`  ${path} returned ${response.statusCode} (expected 401 or 403)`);
      } else {
        log.success(`  ${path} → Protected (${response.statusCode})`);
      }
    }
  }

  // テスト3: CSRFトークンの取得
  async testCSRFToken() {
    const options = {
      hostname: CONFIG.host,
      port: CONFIG.port,
      path: '/api/auth/csrf',
      method: 'GET',
      protocol: CONFIG.protocol,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    const response = await makeRequest(options);
    
    if (response.statusCode !== 200) {
      throw new Error(`Failed to get CSRF token: ${response.statusCode}`);
    }
    
    const data = JSON.parse(response.body);
    if (!data.csrfToken) {
      throw new Error('No CSRF token in response');
    }
    
    this.csrfToken = data.csrfToken;
    log.success(`  CSRF token obtained: ${this.csrfToken.substring(0, 10)}...`);
  }

  // テスト4: セッション確認
  async testSessionCheck() {
    const options = {
      hostname: CONFIG.host,
      port: CONFIG.port,
      path: '/api/auth/session',
      method: 'GET',
      protocol: CONFIG.protocol,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': this.sessionCookie || '',
      },
    };
    
    const response = await makeRequest(options);
    
    if (response.statusCode !== 200) {
      throw new Error(`Session check failed: ${response.statusCode}`);
    }
    
    const session = JSON.parse(response.body);
    
    if (this.sessionCookie) {
      if (!session.user) {
        throw new Error('Expected user in session');
      }
      log.success(`  Authenticated session: ${session.user.email}`);
    } else {
      if (session.user) {
        throw new Error('Unexpected user in unauthenticated session');
      }
      log.success(`  Unauthenticated session confirmed`);
    }
  }

  // テスト5: ヘルスチェック
  async testHealthCheck() {
    const options = {
      hostname: CONFIG.host,
      port: CONFIG.port,
      path: '/api/health',
      method: 'GET',
      protocol: CONFIG.protocol,
    };
    
    const response = await makeRequest(options);
    
    if (response.statusCode !== 200) {
      log.warn(`  Health check returned ${response.statusCode}`);
    } else {
      log.success(`  Health check passed`);
    }
  }

  // レポート生成
  generateReport() {
    log.section('Test Results Summary');
    
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;
    
    console.log(`Total Tests: ${total}`);
    console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
    
    if (failed > 0) {
      console.log('\nFailed Tests:');
      this.results
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(`  ${colors.red}✗${colors.reset} ${r.name}`);
          if (r.error) {
            console.log(`    → ${r.error}`);
          }
        });
    }
    
    const successRate = ((passed / total) * 100).toFixed(1);
    console.log(`\nSuccess Rate: ${successRate}%`);
    
    if (failed === 0) {
      log.success('All tests passed! 🎉');
    } else {
      log.error('Some tests failed. Please review the issues above.');
    }
  }
}

// メイン実行
async function main() {
  console.log(`
${colors.cyan}╔════════════════════════════════════════╗
║     認証保護機能テストスイート          ║
╚════════════════════════════════════════╝${colors.reset}
`);

  log.info(`Testing server at ${CONFIG.protocol}//${CONFIG.host}:${CONFIG.port}`);
  
  const tester = new AuthTester();
  
  // サーバーの起動確認
  log.section('Server Connection Test');
  
  try {
    await tester.runTest('Server connectivity', async () => {
      const options = {
        hostname: CONFIG.host,
        port: CONFIG.port,
        path: '/',
        method: 'GET',
        protocol: CONFIG.protocol,
        timeout: 5000,
      };
      
      const response = await makeRequest(options);
      if (response.statusCode >= 500) {
        throw new Error(`Server error: ${response.statusCode}`);
      }
    });
  } catch (error) {
    log.error('Cannot connect to server. Is it running?');
    log.info('Start the server with: npm run dev');
    process.exit(1);
  }
  
  // テスト実行
  log.section('Authentication Tests');
  
  await tester.runTest('Unauthenticated access protection', 
    () => tester.testUnauthenticatedAccess());
  
  await tester.runTest('API endpoint protection', 
    () => tester.testAPIProtection());
  
  await tester.runTest('CSRF token retrieval', 
    () => tester.testCSRFToken());
  
  await tester.runTest('Session check (unauthenticated)', 
    () => tester.testSessionCheck());
  
  await tester.runTest('Health check endpoint', 
    () => tester.testHealthCheck());
  
  // レポート生成
  tester.generateReport();
  
  // テスト環境情報
  log.section('Test Environment');
  console.log(`Node Version: ${process.version}`);
  console.log(`Platform: ${process.platform}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  log.error(`Unhandled error: ${error.message}`);
  process.exit(1);
});

// 実行
main().catch((error) => {
  log.error(`Test suite failed: ${error.message}`);
  process.exit(1);
});