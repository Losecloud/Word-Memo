// 词忆 - Service Worker
// 版本号（更新时修改此版本号以触发更新）
const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `word-memory-${CACHE_VERSION}`;

// 需要缓存的核心文件
const CORE_ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/storage.js',
  './js/word-parser.js',
  './js/dictionary-api.js',
  './data/cefr-data.js',
  './static/image/book.svg',
  './static/image/menu.png',
  './manifest.json'
];

// 安装事件 - 缓存核心资源
self.addEventListener('install', (event) => {
  console.log('[Service Worker] 安装中...', CACHE_VERSION);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] 缓存核心资源');
        return cache.addAll(CORE_ASSETS);
      })
      .then(() => {
        console.log('[Service Worker] 安装成功');
        return self.skipWaiting(); // 立即激活新的Service Worker
      })
      .catch((error) => {
        console.error('[Service Worker] 安装失败:', error);
      })
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] 激活中...', CACHE_VERSION);
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[Service Worker] 删除旧缓存:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[Service Worker] 激活成功');
        return self.clients.claim(); // 立即控制所有页面
      })
  );
});

// 请求拦截 - 缓存策略
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 忽略非HTTP(S)请求
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // 忽略Chrome扩展请求
  if (url.protocol === 'chrome-extension:') {
    return;
  }
  
  // 策略：网络优先，失败时使用缓存（适合动态内容）
  if (request.method === 'GET') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // 克隆响应（响应只能读取一次）
          const responseToCache = response.clone();
          
          // 只缓存成功的响应
          if (response.status === 200) {
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseToCache);
              });
          }
          
          return response;
        })
        .catch(() => {
          // 网络请求失败，尝试从缓存中获取
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                console.log('[Service Worker] 从缓存返回:', request.url);
                return cachedResponse;
              }
              
              // 如果缓存中也没有，返回离线页面（如果有的话）
              if (request.destination === 'document') {
                return caches.match('./index.html');
              }
              
              // 其他资源返回错误
              return new Response('离线状态下资源不可用', {
                status: 503,
                statusText: 'Service Unavailable',
                headers: new Headers({
                  'Content-Type': 'text/plain'
                })
              });
            });
        })
    );
  }
});

// 后台同步（可选 - 如果未来需要同步功能）
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

// 推送通知（可选 - 如果未来需要复习提醒）
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : '该复习单词啦！',
    icon: './static/image/icon-192.png',
    badge: './static/image/badge-72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };
  
  event.waitUntil(
    self.registration.showNotification('词忆提醒', options)
  );
});

// 通知点击事件
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('./')
  );
});

// 同步数据函数（占位）
function syncData() {
  return Promise.resolve();
}

// 消息监听（用于主页面与Service Worker通信）
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
});

