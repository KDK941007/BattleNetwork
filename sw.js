const CACHE_NAME = 'battlenetwork-runtime-v88';
const OFFLINE_URL = './index.html';
const STATIC_ASSETS = [
  OFFLINE_URL,
  './css/style.css',
  './css/font.css',
  './css/player-hud.css',
  './css/field-grid.css',
  './css/range-preview.css',
  './css/chip-detail.css',
  './css/chip-detail-title-extension.css',
  './css/chip-detail-range-fix.css',
  './css/chip-detail-range-grid.css',
  './css/chip-class-theme.css',
  './css/chip-detail-theme-refinement.css',
  './css/components.css',
  './js/master/chip-definitions.js',
  './js/master/chip-master.js',
  './js/master/chip-relations.js',
  './js/master/chip-service.js',
  './js/data/database.js',
  './js/data/save-data.js',
  './js/ui/chip-detail-ui.js',
  './js/ui/chip-theme-ui.js',
  './js/ui/camera-zoom-settings.js',
  './js/field/field-grid.js',
  './js/field/field-grid-renderer.js',
  './js/combat/range-geometry.js',
  './js/combat/range-preview-renderer.js',
  './js/combat/bomb-preview-renderer.js',
  './js/combat/enemy-foundation.js',
  './js/combat/player-health.js',
  './js/combat/player-damage-system.js',
  './js/combat/enemy-test-attack.js',
  './js/ui/player-hud.js',
  './js/combat/projectile-shadow-renderer.js',
  './js/combat/buster-projectile-layer.js',
  './js/combat/b-attack-system.js',
  './js/combat/combat-hit-test.js',
  './js/ui/test-chip-ui.js',
  './js/game.js',
  './js/service-worker-register.js',
  './assets/attributes/01_normal.png',
  './assets/attributes/02_fire.png',
  './assets/attributes/03_water.png',
  './assets/attributes/04_electric.png',
  './assets/attributes/05_wood.png',
  './assets/attributes/06_terrain_break.png',
  './assets/attributes/07_recovery.png',
  './assets/attributes/08_sword.png',
  './assets/attributes/09_wind.png',
  './assets/attributes/10_invisible.png',
  './assets/attributes/11_object.png',
  './assets/attributes/12_plus.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(
        STATIC_ASSETS.map(async (asset) => {
          try {
            const response = await fetch(asset, { cache: 'no-store' });
            if (response.ok) {
              await cache.put(asset, response.clone());
            }
          } catch (_) {
            // 初回インストール時にオフラインでも、起動自体は失敗させない。
          }
        })
      );
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
  const isExternalFont =
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com';

  if (url.origin !== self.location.origin && !isExternalFont) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isExternalFont) {
    event.respondWith(cacheFirstAsset(request));
    return;
  }

  if (url.pathname.includes('/css/') || url.pathname.includes('/js/')) {
    event.respondWith(networkFirstAsset(request));
    return;
  }

  if (
    url.pathname.includes('/assets/attributes/') ||
    url.pathname.includes('/assets/chips/')
  ) {
    event.respondWith(cacheFirstAsset(request));
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

async function networkFirstAsset(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response && response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (_) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) {
      return cached;
    }
    return Response.error();
  }
}

async function cacheFirstAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, { ignoreSearch: true });

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response && response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (_) {
    return Response.error();
  }
}
