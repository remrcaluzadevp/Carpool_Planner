// Carpool Planner service worker: makes the app installable and keeps the
// last-viewed pages available offline. Network first, cache as fallback.
const CACHE = 'carpool-v1'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  // Never cache live trip data calls.
  if (url.pathname.startsWith('/_serverFn')) return

  const cacheable = req.mode === 'navigate' || url.pathname.startsWith('/assets/') || url.pathname.startsWith('/.netlify/images')
  if (!cacheable) return

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(req, copy))
        }
        return res
      })
      .catch(() => caches.match(req).then((hit) => hit || Response.error())),
  )
})
