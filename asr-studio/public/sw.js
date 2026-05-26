const CACHE_NAME = 'asr-studio-runtime-v2';
const APP_SHELL_URLS = ['/', '/index.html', '/manifest.json', '/favicon.svg'];
const CACHEABLE_DESTINATIONS = new Set(['document', 'font', 'image', 'manifest', 'script', 'style', 'worker']);

const isSameOriginGet = (request) => {
  const url = new URL(request.url);
  return request.method === 'GET' && url.origin === self.location.origin;
};

const canCacheResponse = (response) => {
  return response && (response.ok || response.type === 'opaque');
};

const cacheResponse = async (request, response) => {
  if (!canCacheResponse(response)) {
    return;
  }

  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
};

const warmAppShell = async () => {
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(
    APP_SHELL_URLS.map(async (url) => {
      try {
        const response = await fetch(url, { cache: 'reload' });
        if (canCacheResponse(response)) {
          await cache.put(url, response);
        }
      } catch (error) {
        console.warn('Failed to warm app shell cache:', url, error);
      }
    }),
  );
};

const networkFirstNavigation = async (request) => {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    if (canCacheResponse(response)) {
      await Promise.all([cache.put(request, response.clone()), cache.put('/index.html', response.clone())]);
    }
    return response;
  } catch {
    return (
      (await cache.match(request)) || (await cache.match('/index.html')) || (await cache.match('/')) || Response.error()
    );
  }
};

const cacheFirstAsset = async (request) => {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  await cacheResponse(request, response);
  return response;
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      await warmAppShell();
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.filter((cacheName) => cacheName !== CACHE_NAME).map((cacheName) => caches.delete(cacheName)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (!isSameOriginGet(request)) {
    return;
  }

  const url = new URL(request.url);
  if (url.pathname === '/sw.js') {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (url.pathname.startsWith('/assets/') || CACHEABLE_DESTINATIONS.has(request.destination)) {
    event.respondWith(cacheFirstAsset(request));
  }
});
