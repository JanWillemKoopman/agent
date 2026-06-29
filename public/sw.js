const CACHE_STATIC = 'famapp-static-v1';
const CACHE_PAGES = 'famapp-pages-v1';

// /_next/static/ bevat content-hash bestandsnamen — veilig om altijd te cachen.
const isStaticAsset = (url) =>
  url.pathname.startsWith('/_next/static/') ||
  url.pathname.startsWith('/icon-') ||
  url.pathname === '/manifest.json';

const isApiRoute = (url) => url.pathname.startsWith('/api/');

// ---------------------------------------------------------------------------
// Install — pre-cache de shell
// ---------------------------------------------------------------------------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_PAGES).then((cache) => cache.addAll(['/']))
  );
  // Bewust GEEN skipWaiting: wachten op SKIP_WAITING bericht van de frontend
  // zodat in-sessie updates zichtbaar zijn via UpdateBanner, en app-opens
  // auto-updaten via de visibilitychange-listener in useServiceWorkerUpdate.
});

// ---------------------------------------------------------------------------
// Activate — verwijder oude caches
// ---------------------------------------------------------------------------
self.addEventListener('activate', (event) => {
  const knownCaches = [CACHE_STATIC, CACHE_PAGES];
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((n) => !knownCaches.includes(n))
            .map((n) => caches.delete(n))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // API — altijd netwerk, nooit cachen.
  if (isApiRoute(url)) return;

  // Statische assets (content-hashed) — cache-first, altijd vers in cache.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(CACHE_STATIC).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const response = await fetch(event.request);
        if (response.ok) cache.put(event.request, response.clone());
        return response;
      })
    );
    return;
  }

  // HTML-pagina's — network-first zodat nieuwe deployments direct zichtbaar zijn.
  // Bij netwerk-fout: toon de gecachete versie (offline-fallback).
  event.respondWith(
    caches.open(CACHE_PAGES).then(async (cache) => {
      try {
        const response = await fetch(event.request);
        if (response.ok) cache.put(event.request, response.clone());
        return response;
      } catch {
        const cached = await cache.match(event.request);
        return (
          cached ||
          new Response('Offline — geen internetverbinding', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          })
        );
      }
    })
  );
});

// ---------------------------------------------------------------------------
// Push notifications
// ---------------------------------------------------------------------------
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'FamApp', {
      body: data.body || 'Je hebt een nieuw bericht.',
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      tag: data.tag || 'famapp',
      data: data.data || {},
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((list) => {
      const existing = list.find((c) => c.url === '/' && 'focus' in c);
      return existing ? existing.focus() : clients.openWindow('/');
    })
  );
});
