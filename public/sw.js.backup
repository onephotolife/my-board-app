
// Service Worker エラーハンドリング強化
self.addEventListener('error', (event) => {
  console.error('[SW Error]', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW Unhandled Rejection]', event.reason);
});

// フェッチエラーの詳細ログ
const originalFetch = self.fetch;
self.fetch = function(...args) {
  const request = args[0];
  const url = request.url || request;
  
  // 認証ページのfetchはログのみ（処理はしない）
  if (typeof url === 'string' && (url.includes('/auth/') || url.includes('verify-email') || url.includes('reset-password'))) {
    console.log('[SW] Auth page fetch bypassed:', url);
    return originalFetch.apply(this, args);
  }
  
  return originalFetch.apply(this, args)
    .then(response => {
      return response;
    })
    .catch(error => {
      console.error('[SW] Fetch error:', {
        url: url,
        error: error.message
      });
      throw error;
    });
};


const CACHE_NAME = 'board-app-v3';
const RUNTIME_CACHE = 'runtime-cache-v3';

// キャッシュするファイルのリスト
const STATIC_CACHE_URLS = [
  '/',
  '/offline.html',
];

// インストールイベント
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // 静的ファイルを事前キャッシュ
      return cache.addAll(STATIC_CACHE_URLS).catch(err => {
        console.log('Cache addAll failed:', err);
      });
    })
  );
  self.skipWaiting();
});

// アクティベートイベント
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE)
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );
  self.clients.claim();
});

// フェッチイベント - ネットワークファーストストラテジー
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 認証関連のページとAPIは完全にバイパス（Service Workerで処理しない）
  if (
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/signin') ||
    url.pathname.startsWith('/signup') ||
    url.pathname.startsWith('/reset-password') ||
    url.pathname.startsWith('/verify-email') ||
    url.pathname.includes('verify-email') ||
    url.pathname.includes('reset-password') ||
    url.pathname.startsWith('/api/auth/')
  ) {
    // Service Workerで処理せず、ブラウザのデフォルト動作に任せる
    console.log('[SW] Bypassing auth-related request:', url.pathname);
    return;
  }

  // APIリクエストの処理
  if (url.pathname.startsWith('/api/')) {
    // POSTリクエストはキャッシュしない
    if (request.method !== 'GET') {
      event.respondWith(fetch(request));
      return;
    }
    
    event.respondWith(
      fetch(request)
        .then((response) => {
          // GETリクエストで成功したAPIレスポンスのみキャッシュ
          if (request.method === 'GET' && response.status === 200) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            }).catch(err => {
              console.log('Cache put failed for API:', err);
            });
          }
          return response;
        })
        .catch(() => {
          // オフライン時はキャッシュから返す（GETリクエストのみ）
          if (request.method === 'GET') {
            return caches.match(request);
          }
          // POSTリクエストなどはエラーを返す
          return new Response('Network error', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        })
    );
    return;
  }

  // 静的アセット（JS、CSS、画像）の処理
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image' ||
    request.destination === 'font'
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          // 成功したレスポンスをキャッシュ
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // HTMLページの処理 - ネットワークファースト
  if (request.mode === 'navigate') {
    // POSTリクエストはキャッシュしない
    if (request.method !== 'GET') {
      event.respondWith(fetch(request));
      return;
    }
    
    event.respondWith(
      fetch(request)
        .then((response) => {
          // GETリクエストで成功した場合のみキャッシュ
          if (request.method === 'GET' && response.status === 200) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            }).catch(err => {
              console.log('Cache put failed for HTML:', err);
            });
          }
          return response;
        })
        .catch(() => {
          // オフライン時はキャッシュから（GETリクエストのみ）
          if (request.method === 'GET') {
            return caches.match(request).then((response) => {
              if (response) {
                return response;
              }
              // キャッシュにない場合はオフラインページ
              return caches.match('/offline.html');
            });
          }
          // POSTリクエストはエラーを返す
          return new Response('Network error', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        })
    );
    return;
  }

  // デフォルト処理
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});