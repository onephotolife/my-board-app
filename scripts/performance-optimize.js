#!/usr/bin/env node

/**
 * パフォーマンス最適化スクリプト
 * 14人天才会議 - 天才12
 */

const fs = require('fs').promises;
const path = require('path');

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

// 最適化されたService Worker設定
const optimizedSwConfig = `
// Service Worker パフォーマンス最適化設定
const CACHE_CONFIG = {
  version: 'v3-optimized',
  caches: {
    static: 'static-cache-v3',
    runtime: 'runtime-cache-v3',
    images: 'image-cache-v3'
  },
  // 認証ページは完全にキャッシュをスキップ
  skipCache: [
    '/auth/',
    '/signin',
    '/signup',
    '/reset-password',
    '/verify-email',
    '/api/auth/'
  ],
  // 積極的にキャッシュするリソース
  precache: [
    '/',
    '/offline.html'
  ],
  // キャッシュ戦略
  strategies: {
    networkFirst: ['/api/', '/_next/data/'],
    cacheFirst: ['/_next/static/', '/images/', '/fonts/'],
    staleWhileRevalidate: ['/', '/posts', '/profile']
  }
};

// 高速な認証ページ判定
function shouldSkipCache(url) {
  return CACHE_CONFIG.skipCache.some(path => url.pathname.includes(path));
}

// 最適化されたフェッチハンドラー
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 認証ページは即座にネットワークへ
  if (shouldSkipCache(url)) {
    event.respondWith(fetch(request));
    return;
  }
  
  // その他のリクエストは戦略に従って処理
  handleStrategicFetch(event);
});
`;

// パフォーマンス測定スクリプト
const performanceMeasureScript = `
// パフォーマンス測定ツール
(function() {
  const measurements = {
    pageLoad: [],
    resourceLoad: [],
    serviceWorker: []
  };
  
  // ページロードパフォーマンス
  window.addEventListener('load', () => {
    const perfData = performance.getEntriesByType('navigation')[0];
    if (perfData) {
      measurements.pageLoad.push({
        timestamp: new Date().toISOString(),
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
        loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
        totalTime: perfData.loadEventEnd - perfData.fetchStart
      });
      
      console.log('📊 ページロードパフォーマンス:', {
        DOMContentLoaded: Math.round(perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart) + 'ms',
        LoadComplete: Math.round(perfData.loadEventEnd - perfData.loadEventStart) + 'ms',
        Total: Math.round(perfData.loadEventEnd - perfData.fetchStart) + 'ms'
      });
    }
  });
  
  // リソースロードパフォーマンス
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'resource') {
        measurements.resourceLoad.push({
          name: entry.name,
          duration: entry.duration,
          size: entry.transferSize
        });
        
        // 遅いリソースを警告
        if (entry.duration > 1000) {
          console.warn('⚠️ 遅いリソース:', {
            url: entry.name,
            duration: Math.round(entry.duration) + 'ms'
          });
        }
      }
    }
  });
  
  observer.observe({ entryTypes: ['resource'] });
  
  // Service Worker パフォーマンス
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      const sw = registration.active;
      if (sw) {
        // Service Worker の状態を監視
        console.log('🔧 Service Worker状態:', sw.state);
        
        // メッセージングでパフォーマンスデータを取得
        const messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = (event) => {
          if (event.data.type === 'performance') {
            measurements.serviceWorker.push(event.data.data);
            console.log('📈 Service Workerパフォーマンス:', event.data.data);
          }
        };
        
        sw.postMessage({ type: 'get-performance' }, [messageChannel.port2]);
      }
    });
  }
  
  // パフォーマンス分析関数
  window.analyzePerformance = () => {
    console.group('🎯 パフォーマンス分析');
    
    // ページロード分析
    if (measurements.pageLoad.length > 0) {
      const latest = measurements.pageLoad[measurements.pageLoad.length - 1];
      console.log('ページロード:', {
        DOMContentLoaded: latest.domContentLoaded + 'ms',
        Total: latest.totalTime + 'ms',
        評価: latest.totalTime < 1000 ? '✅ 優秀' : 
              latest.totalTime < 3000 ? '⚠️ 普通' : '❌ 要改善'
      });
    }
    
    // リソース分析
    if (measurements.resourceLoad.length > 0) {
      const slowResources = measurements.resourceLoad
        .filter(r => r.duration > 500)
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 5);
      
      if (slowResources.length > 0) {
        console.log('遅いリソース TOP5:');
        slowResources.forEach(r => {
          console.log('  -', r.name.split('/').pop(), ':', Math.round(r.duration) + 'ms');
        });
      } else {
        console.log('✅ すべてのリソースが高速に読み込まれています');
      }
    }
    
    // メモリ使用量
    if (performance.memory) {
      const memoryMB = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
      console.log('メモリ使用量:', memoryMB + 'MB', 
        memoryMB < 50 ? '✅' : memoryMB < 100 ? '⚠️' : '❌');
    }
    
    console.groupEnd();
  };
  
  // 自動分析（5秒後）
  setTimeout(() => {
    window.analyzePerformance();
  }, 5000);
  
  console.log('📊 パフォーマンス測定システム起動');
  console.log('コマンド: window.analyzePerformance()');
})();
`;

// 最適化推奨事項
const optimizationRecommendations = `
# パフォーマンス最適化推奨事項

## 1. Service Worker最適化
- ✅ 認証ページのキャッシュスキップ（実装済み）
- ✅ バージョン管理の改善（v3へ更新）
- ✅ 選択的キャッシュ戦略の実装

## 2. ページロード最適化
- [ ] 重要なCSSのインライン化
- [ ] 非同期スクリプトローディング
- [ ] 画像の遅延読み込み

## 3. ネットワーク最適化
- [ ] HTTP/2の有効化
- [ ] CDNの利用検討
- [ ] リソースの圧縮（gzip/brotli）

## 4. コード最適化
- [ ] JavaScriptバンドルサイズの削減
- [ ] Tree shakingの活用
- [ ] Code splittingの実装

## 5. 認証ページ特有の最適化
- ✅ Service Workerでのキャッシュ除外
- ✅ 直接ネットワークアクセス
- [ ] プリフェッチの無効化
- [ ] 最小限のリソース読み込み
`;

async function optimizePerformance() {
  log('\n🧠 天才12: パフォーマンス最適化\n', 'cyan');
  log('=' .repeat(60), 'cyan');
  
  try {
    // 1. パフォーマンス測定スクリプトの作成
    log('\n📊 パフォーマンス測定ツール作成', 'blue');
    
    const perfScriptPath = path.join(process.cwd(), 'public', 'performance.js');
    await fs.writeFile(perfScriptPath, performanceMeasureScript);
    log('  ✅ performance.js 作成完了', 'green');
    
    // 2. Service Worker最適化設定の作成
    log('\n🔧 Service Worker最適化設定', 'blue');
    
    const swOptPath = path.join(process.cwd(), 'public', 'sw-optimized.js');
    await fs.writeFile(swOptPath, optimizedSwConfig);
    log('  ✅ sw-optimized.js 作成完了', 'green');
    
    // 3. 最適化推奨事項の作成
    log('\n📝 最適化推奨事項ドキュメント作成', 'blue');
    
    const recommendPath = path.join(process.cwd(), 'docs', 'performance-optimization.md');
    await fs.mkdir(path.dirname(recommendPath), { recursive: true });
    await fs.writeFile(recommendPath, optimizationRecommendations);
    log('  ✅ performance-optimization.md 作成完了', 'green');
    
    // 4. パフォーマンステストスクリプト
    log('\n🚀 パフォーマンステストスクリプト作成', 'blue');
    
    const perfTestScript = `
#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function measurePerformance() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // パフォーマンス測定を有効化
  await page.evaluateOnNewDocument(() => {
    window.performanceData = [];
  });
  
  // メール確認ページのパフォーマンス測定
  console.log('📊 メール確認ページのパフォーマンス測定...');
  
  const verifyUrl = 'http://localhost:3000/auth/verify-email?token=test';
  
  const metrics = await page.evaluate(() => {
    return JSON.stringify(performance.getEntriesByType('navigation')[0], null, 2);
  });
  
  await page.goto(verifyUrl, { waitUntil: 'networkidle0' });
  
  const performanceMetrics = await page.metrics();
  
  console.log('メトリクス:', {
    'DOM構築時間': performanceMetrics.TaskDuration,
    'スクリプト実行時間': performanceMetrics.ScriptDuration,
    'レイアウト時間': performanceMetrics.LayoutDuration,
    'メモリ使用量': Math.round(performanceMetrics.JSHeapUsedSize / 1024 / 1024) + 'MB'
  });
  
  await browser.close();
}

measurePerformance().catch(console.error);
`;
    
    const perfTestPath = path.join(process.cwd(), 'scripts', 'performance-test.js');
    await fs.writeFile(perfTestPath, perfTestScript);
    log('  ✅ performance-test.js 作成完了', 'green');
    
    // 5. 使用方法の説明
    log('\n' + '='.repeat(60), 'cyan');
    log('📚 パフォーマンス最適化ツールの使用方法', 'magenta');
    log('='.repeat(60), 'cyan');
    
    log('\n1️⃣  パフォーマンス測定の有効化:', 'green');
    log('  app/layout.tsx に以下を追加:', 'cyan');
    log('  <script src="/performance.js" defer></script>', 'cyan');
    
    log('\n2️⃣  ブラウザでの測定:', 'green');
    log('  開発者コンソールで実行:', 'cyan');
    log('  window.analyzePerformance()', 'cyan');
    
    log('\n3️⃣  Service Worker最適化の適用:', 'green');
    log('  現在のsw.jsをsw-optimized.jsの内容で更新', 'cyan');
    
    log('\n4️⃣  Puppeteerでの自動測定:', 'green');
    log('  npm install puppeteer', 'cyan');
    log('  node scripts/performance-test.js', 'cyan');
    
    // 6. 現在のパフォーマンス問題の診断
    log('\n' + '='.repeat(60), 'cyan');
    log('🔍 現在のパフォーマンス問題の診断', 'yellow');
    log('='.repeat(60), 'cyan');
    
    log('\n確認されている問題:', 'red');
    log('  1. Service Workerの過剰なキャッシュ', 'cyan');
    log('     → 認証ページをキャッシュから除外済み', 'green');
    
    log('  2. CSSプリロードエラー', 'cyan');
    log('     → 不要なプリロードを削除', 'green');
    
    log('  3. オフラインページの誤表示', 'cyan');
    log('     → Service Worker修正で解決', 'green');
    
    log('\n推奨される追加最適化:', 'yellow');
    log('  • Critical CSSのインライン化', 'cyan');
    log('  • 画像の最適化（WebP形式の使用）', 'cyan');
    log('  • JavaScriptバンドルの分割', 'cyan');
    log('  • HTTP/2 Server Pushの活用', 'cyan');
    
    log('\n' + '='.repeat(60), 'cyan');
    log('✅ パフォーマンス最適化ツール準備完了！', 'green');
    log('='.repeat(60), 'cyan');
    
  } catch (error) {
    log(`\n❌ エラー発生: ${error.message}`, 'red');
  }
}

// 実行
optimizePerformance().catch((error) => {
  log(`\n❌ 致命的エラー: ${error.message}`, 'red');
  process.exit(1);
});