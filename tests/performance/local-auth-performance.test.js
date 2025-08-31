#!/usr/bin/env node

/**
 * ローカルパフォーマンステスト（認証付き）
 * 
 * 必須認証情報:
 * - Email: one.photolife+1@gmail.com
 * - Password: ?@thc123THC@?
 */

const http = require('http');
const https = require('https');

// テスト設定
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  authEmail: 'one.photolife+1@gmail.com',
  authPassword: '?@thc123THC@?',
  testTimeout: 30000
};

// HTTPクライアント
class HttpClient {
  constructor() {
    this.cookies = new Map();
    this.csrfToken = null;
  }

  async request(options) {
    return new Promise((resolve, reject) => {
      const protocol = options.protocol === 'https:' ? https : http;
      
      // クッキーヘッダー追加
      if (this.cookies.size > 0) {
        const cookieHeader = Array.from(this.cookies.entries())
          .map(([key, value]) => `${key}=${value}`)
          .join('; ');
        options.headers = options.headers || {};
        options.headers.Cookie = cookieHeader;
      }

      // CSRFトークンヘッダー追加
      if (this.csrfToken && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method)) {
        options.headers = options.headers || {};
        options.headers['X-CSRF-Token'] = this.csrfToken;
      }

      const req = protocol.request(options, (res) => {
        // Set-Cookieヘッダーからクッキーを保存
        if (res.headers['set-cookie']) {
          res.headers['set-cookie'].forEach(cookie => {
            const [nameValue] = cookie.split(';');
            const [name, value] = nameValue.split('=');
            this.cookies.set(name, value);
          });
        }

        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body
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
}

// パフォーマンステスター
class PerformanceTestRunner {
  constructor() {
    this.client = new HttpClient();
    this.results = {
      authentication: {},
      pageLoad: {},
      apiParallelization: {},
      improvements: {}
    };
  }

  async authenticate() {
    console.log('🔐 認証プロセス開始...');
    const startTime = Date.now();

    try {
      // 1. CSRFトークン取得
      console.log('  📝 CSRFトークン取得中...');
      const csrfStartTime = Date.now();
      const csrfResponse = await this.client.request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/csrf/token',
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const csrfTime = Date.now() - csrfStartTime;

      if (csrfResponse.statusCode !== 200) {
        throw new Error(`CSRFトークン取得失敗: ${csrfResponse.statusCode}`);
      }

      const csrfData = JSON.parse(csrfResponse.body);
      this.client.csrfToken = csrfData.csrfToken;
      console.log(`  ✅ CSRFトークン取得完了 (${csrfTime}ms)`);

      // 2. ログイン実行
      console.log('  🔑 ログイン実行中...');
      const loginStartTime = Date.now();
      const loginData = JSON.stringify({
        email: TEST_CONFIG.authEmail,
        password: TEST_CONFIG.authPassword,
        csrfToken: this.client.csrfToken
      });

      const loginResponse = await this.client.request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/signin',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': loginData.length
        },
        body: loginData
      });
      const loginTime = Date.now() - loginStartTime;

      console.log(`  ✅ ログイン完了 (${loginTime}ms, status: ${loginResponse.statusCode})`);

      const totalAuthTime = Date.now() - startTime;
      this.results.authentication = {
        success: loginResponse.statusCode < 400,
        csrfTime,
        loginTime,
        totalTime: totalAuthTime,
        cookieCount: this.client.cookies.size
      };

      console.log(`✅ 認証完了 (合計: ${totalAuthTime}ms)`);
      return loginResponse.statusCode < 400;
    } catch (error) {
      console.error('❌ 認証エラー:', error.message);
      this.results.authentication = {
        success: false,
        error: error.message
      };
      return false;
    }
  }

  async testPageLoad() {
    console.log('\n📊 ページロードパフォーマンステスト...');
    
    const pageLoadStartTime = Date.now();
    try {
      const response = await this.client.request({
        hostname: 'localhost',
        port: 3000,
        path: '/',
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });

      const pageLoadTime = Date.now() - pageLoadStartTime;
      
      this.results.pageLoad = {
        success: response.statusCode === 200,
        statusCode: response.statusCode,
        loadTime: pageLoadTime,
        bodySize: response.body.length
      };

      console.log(`  ⏱️ ページロード時間: ${pageLoadTime}ms`);
      console.log(`  📦 レスポンスサイズ: ${response.body.length} bytes`);
      
      // HTMLにPerformance Markerがあるか確認
      const hasPerformanceMarker = response.body.includes('[PERF]');
      if (hasPerformanceMarker) {
        console.log('  ✅ パフォーマンスマーカー検出');
      }

      return response.statusCode === 200;
    } catch (error) {
      console.error('❌ ページロードエラー:', error.message);
      this.results.pageLoad = {
        success: false,
        error: error.message
      };
      return false;
    }
  }

  async testAPIParallelization() {
    console.log('\n🚀 API並列化テスト...');
    
    // 順次実行のシミュレーション
    console.log('  📊 順次実行テスト...');
    const sequentialStartTime = Date.now();
    
    await this.client.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/profile',
      method: 'GET'
    });
    
    await this.client.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/user/permissions',
      method: 'GET'
    });
    
    await this.client.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/csrf/token',
      method: 'GET'
    });
    
    const sequentialTime = Date.now() - sequentialStartTime;
    console.log(`  ⏱️ 順次実行時間: ${sequentialTime}ms`);
    
    // 並列実行
    console.log('  ⚡ 並列実行テスト...');
    const parallelStartTime = Date.now();
    
    await Promise.all([
      this.client.request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/profile',
        method: 'GET'
      }),
      this.client.request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/user/permissions',
        method: 'GET'
      }),
      this.client.request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/csrf/token',
        method: 'GET'
      })
    ]);
    
    const parallelTime = Date.now() - parallelStartTime;
    console.log(`  ⏱️ 並列実行時間: ${parallelTime}ms`);
    
    const improvement = ((sequentialTime - parallelTime) / sequentialTime * 100).toFixed(1);
    console.log(`  📈 改善率: ${improvement}%`);
    
    this.results.apiParallelization = {
      sequentialTime,
      parallelTime,
      improvement: parseFloat(improvement),
      timeSaved: sequentialTime - parallelTime
    };
    
    return true;
  }

  calculateImprovements() {
    console.log('\n📈 改善効果の計算...');
    
    // 推定される改善効果
    const estimatedImprovements = {
      apiParallelization: this.results.apiParallelization.timeSaved || 0,
      codeSplitting: 1000, // 推定値: 1秒
      totalEstimated: 0
    };
    
    estimatedImprovements.totalEstimated = 
      estimatedImprovements.apiParallelization + 
      estimatedImprovements.codeSplitting;
    
    this.results.improvements = estimatedImprovements;
    
    console.log(`  🎯 API並列化による改善: ${estimatedImprovements.apiParallelization}ms`);
    console.log(`  🎯 Code Splittingによる改善（推定）: ${estimatedImprovements.codeSplitting}ms`);
    console.log(`  🎯 合計改善時間（推定）: ${estimatedImprovements.totalEstimated}ms`);
  }

  generateReport() {
    console.log('\n');
    console.log('=' * 60);
    console.log('📊 パフォーマンステスト結果レポート');
    console.log('=' * 60);
    
    console.log('\n【認証結果】');
    console.log(`  成功: ${this.results.authentication.success ? '✅' : '❌'}`);
    if (this.results.authentication.success) {
      console.log(`  CSRF取得時間: ${this.results.authentication.csrfTime}ms`);
      console.log(`  ログイン時間: ${this.results.authentication.loginTime}ms`);
      console.log(`  合計時間: ${this.results.authentication.totalTime}ms`);
    }
    
    console.log('\n【ページロード性能】');
    console.log(`  成功: ${this.results.pageLoad.success ? '✅' : '❌'}`);
    if (this.results.pageLoad.success) {
      console.log(`  ロード時間: ${this.results.pageLoad.loadTime}ms`);
      console.log(`  レスポンスサイズ: ${this.results.pageLoad.bodySize} bytes`);
    }
    
    console.log('\n【API並列化効果】');
    console.log(`  順次実行時間: ${this.results.apiParallelization.sequentialTime}ms`);
    console.log(`  並列実行時間: ${this.results.apiParallelization.parallelTime}ms`);
    console.log(`  改善率: ${this.results.apiParallelization.improvement}%`);
    console.log(`  削減時間: ${this.results.apiParallelization.timeSaved}ms`);
    
    console.log('\n【推定改善効果】');
    console.log(`  API並列化: ${this.results.improvements.apiParallelization}ms`);
    console.log(`  Code Splitting: ${this.results.improvements.codeSplitting}ms`);
    console.log(`  合計: ${this.results.improvements.totalEstimated}ms`);
    
    console.log('\n' + '=' * 60);
    
    // 想定される結果パターン
    if (this.results.apiParallelization.improvement > 30) {
      console.log('✅ OKパターン: API並列化が効果的に動作しています');
    } else {
      console.log('⚠️ NGパターン: API並列化の効果が限定的です');
      console.log('  対処法: ネットワーク遅延やサーバー負荷を確認してください');
    }
    
    if (this.results.pageLoad.loadTime < 3000) {
      console.log('✅ OKパターン: ページロード時間が目標範囲内です');
    } else {
      console.log('⚠️ NGパターン: ページロード時間が長すぎます');
      console.log('  対処法: Provider階層の最適化やSSRの導入を検討してください');
    }
  }

  async run() {
    console.log('🚀 ローカルパフォーマンステスト開始');
    console.log(`📅 実行時刻: ${new Date().toISOString()}`);
    console.log(`🔗 対象URL: ${TEST_CONFIG.baseUrl}`);
    console.log('');

    // 1. 認証
    const authSuccess = await this.authenticate();
    if (!authSuccess) {
      console.error('❌ 認証失敗のためテストを中断します');
      return;
    }

    // 2. ページロードテスト
    await this.testPageLoad();

    // 3. API並列化テスト
    await this.testAPIParallelization();

    // 4. 改善効果計算
    this.calculateImprovements();

    // 5. レポート生成
    this.generateReport();
  }
}

// メイン実行
if (require.main === module) {
  const tester = new PerformanceTestRunner();
  tester.run()
    .then(() => {
      console.log('\n✅ テスト完了');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ テストエラー:', error);
      process.exit(1);
    });
}

module.exports = { PerformanceTestRunner };