const CACHE_NAME = 'battlenetwork-runtime-v1';
const OFFLINE_URL = './index.html';

self.addEventListener('install', (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        const response = await fetch(OFFLINE_URL, { cache: 'no-store' });
        if (response.ok) {
          await cache.put(OFFLINE_URL, response.clone());
        }
      } catch (_) {
        // 初回インストール時にオフラインでも、起動自体は失敗させない。
      }
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      ),
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
  }
});

async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request, { cache: 'no-store' });

    if (response && response.ok) {
      await cache.put(OFFLINE_URL, response.clone());
    }

    return response;
  } catch (_) {
    const cached = await cache.match(OFFLINE_URL);

    if (cached) {
      return cached;
    }

    return Response.error();
  }
}
