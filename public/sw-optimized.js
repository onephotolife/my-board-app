
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
