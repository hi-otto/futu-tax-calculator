// Service Worker for 富途税务计算器 PWA
const CACHE_NAME = 'futu-tax-calculator-v1';

// 需要缓存的资源列表
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.svg'
];

// 安装事件 - 缓存静态资源
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // 跳过等待，立即激活
  self.skipWaiting();
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  // 立即控制所有页面
  self.clients.claim();
});

// 请求拦截 - 缓存优先策略
self.addEventListener('fetch', (event) => {
  // 只处理 GET 请求
  if (event.request.method !== 'GET') return;

  // 只处理同源请求
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // 如果有缓存，返回缓存
      if (cachedResponse) {
        // 同时在后台更新缓存（stale-while-revalidate）
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
            });
          }
        }).catch(() => { });

        return cachedResponse;
      }

      // 没有缓存，从网络获取
      return fetch(event.request).then((networkResponse) => {
        // 缓存新资源
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // 离线且无缓存时，返回离线页面（如果是 HTML 请求）
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/');
        }
      });
    })
  );
});

// 监听消息 - 支持手动更新
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
