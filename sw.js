/* ============================================
   Service Worker
   策略：
     · 页面导航 → 网络优先，断网回落缓存的 index.html
     · 静态资源 → 缓存优先，同时后台更新（stale-while-revalidate）
   改了 sw.js 本身记得把 CACHE 版本号 +1，否则旧缓存不会清
   ============================================ */

const CACHE = 'ledger-v2'

/** 安装时预缓存的应用外壳 */
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
]

// ---------- 安装 ----------

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // 单个文件失败不影响整体安装
      .then((cache) =>
        Promise.allSettled(SHELL.map((url) => cache.add(url)))
      )
      .then(() => self.skipWaiting())
  )
})

// ---------- 激活：清掉旧版本缓存 ----------

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  )
})

// ---------- 拦截请求 ----------

self.addEventListener('fetch', (event) => {
  const req = event.request

  // 只处理同源的 GET
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // 页面导航：网络优先，保证能拿到最新版本
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put('./index.html', copy))
          return res
        })
        .catch(() =>
          caches
            .match('./index.html')
            .then((hit) => hit || caches.match('./'))
        )
    )
    return
  }

  // 静态资源：先给缓存，后台顺便更新
  event.respondWith(
    caches.match(req).then((hit) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok && res.type === 'basic') {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(req, copy))
          }
          return res
        })
        .catch(() => hit)

      return hit || network
    })
  )
})
