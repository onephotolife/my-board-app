const CACHE_NAME = 'board-app-v1';
const RUNTIME_CACHE = 'runtime-cache-v1';

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