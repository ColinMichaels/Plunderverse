// Service Worker for offline support
const CACHE_NAME = 'plunderverse-minigame-v1';
const SYNC_TAG = 'sync-game-state';

// Assets to cache for offline play
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/components/mobile/MobileMinigame.tsx',
  '/src/components/mobile/minigame/BootScene.ts',
  '/src/components/mobile/minigame/MainGameScene.ts',
  '/src/components/mobile/minigame/UIOverlayScene.ts',
  '/sounds/music/PlunderverseTheme.mp3',
  '/sounds/success.mp3',
  '/sounds/hit.mp3',
  '/sounds/explosion.mp3',
  '/textures/terrain/mars_terrain.png',
  '/textures/terrain/moon_terrain.png',
  '/textures/terrain/earth_grass.png'
];

// Dynamic cache for API responses and game data
const DYNAMIC_CACHE = 'plunderverse-dynamic-v1';
const MAX_DYNAMIC_ITEMS = 50;

// Feature flags / cache buckets
const ENABLE_NAV_PRELOAD = true;
const HTML_CACHE = 'plunderverse-html-v1';
const ASSET_CACHE = CACHE_NAME; // keep existing naming for static assets
const API_CACHE = DYNAMIC_CACHE; // keep existing naming for runtime API responses
const IMAGE_CACHE = 'plunderverse-images-v1';

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('[ServiceWorker] Installing...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[ServiceWorker] Caching static assets');
        return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })));
      })
      .catch(err => {
        console.error('[ServiceWorker] Error caching static assets:', err);
      })
  );

  // Force immediate activation
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[ServiceWorker] Activating...');

    event.waitUntil((async () => {
        // Enable navigation preload to speed up navigations
        if (ENABLE_NAV_PRELOAD && 'navigationPreload' in self.registration) {
            try {
                await self.registration.navigationPreload.enable();
                console.log('[ServiceWorker] Navigation preload enabled');
            } catch (e) {
                console.warn('[ServiceWorker] Navigation preload not enabled:', e);
            }
        }

        // Clean up old caches
        const cacheNames = await caches.keys();
        await Promise.all(
            cacheNames.map((cacheName) => {
                const keep = [ASSET_CACHE, API_CACHE, HTML_CACHE, IMAGE_CACHE];
                if (!keep.includes(cacheName)) {
                    console.log('[ServiceWorker] Deleting old cache:', cacheName);
                    return caches.delete(cacheName);
                }
            })
        );

        // Take control immediately
        await self.clients.claim();
    })());
});

// Helper function to check if a request/response can be cached
function isCacheable(request, response) {
  const url = new URL(request.url);

  // Only cache http and https URLs
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    console.log('[ServiceWorker] Skipping cache for unsupported protocol:', url.protocol);
    return false;
  }

  // Skip partial responses (status 206)
  if (response && response.status === 206) {
    console.log('[ServiceWorker] Skipping cache for partial response (206)');
    return false;
  }

  // Skip chrome-extension and other browser internal URLs
    if (url.href.startsWith('chrome-extension://') ||
      url.href.startsWith('chrome://') ||
      url.href.startsWith('edge://') ||
      url.href.startsWith('firefox://') ||
      url.href.startsWith('about:')) {
    console.log('[ServiceWorker] Skipping cache for browser internal URL');
    return false;
  }

  return true;
}

// Broadcast channel for status/messages to clients (fallback to postMessage if unsupported)
const bc = ('BroadcastChannel' in self) ? new BroadcastChannel('sw-events') : null;

function notifyClients(msg) {
    if (bc) {
        bc.postMessage(msg);
    } else {
        self.clients.matchAll().then((clients) => {
            clients.forEach((client) => client.postMessage(msg));
        });
    }
}

// Fetch event - serve from cache when offline, with cache buckets and navigation preload
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

    // Skip non-GET and WebSocket
    if (request.method !== 'GET') return;
    if (url.protocol === 'ws:' || url.protocol === 'wss:') return;

    // Handle document navigations (HTML) with network-first + preload
    if (request.mode === 'navigate') {
        event.respondWith((async () => {
            try {
                // Try preload response first if available
                const preload = event.preloadResponse ? await event.preloadResponse : null;
                if (preload) return preload;
                const network = await fetch(request);
                const cache = await caches.open(HTML_CACHE);
                if (network.ok) await cache.put(request, network.clone());
                return network;
            } catch (err) {
                // Offline: fall back to cached HTML or index
                const cache = await caches.open(HTML_CACHE);
                const cached = await cache.match(request) || await caches.match('/index.html');
                if (cached) return cached;
                return new Response('Offline', {status: 503});
            }
        })());
    return;
  }

    // API calls: network-first
    if (request.url.includes('/api/') || request.url.includes('/ws/')) {
        event.respondWith(networkFirstStrategy(request));
    return;
  }

    // Images: cache-first with separate bucket
    if (request.destination === 'image') {
        event.respondWith(cacheFirstStrategyBucketed(request, IMAGE_CACHE));
        return;
    }

    // Static assets: cache-first
    event.respondWith(cacheFirstStrategy(request));
});

// Cache-first strategy for static assets
async function cacheFirstStrategy(request) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      // Update cache in background
      fetchAndCache(request, CACHE_NAME);
      return cachedResponse;
    }

    const networkResponse = await fetch(request);

    // Only cache if response is OK and cacheable
    if (networkResponse.ok && isCacheable(request, networkResponse)) {
      try {
        await cache.put(request, networkResponse.clone());
      } catch (cacheError) {
        console.warn('[ServiceWorker] Unable to cache response:', cacheError.message);
      }
    }

    return networkResponse;
  } catch (error) {
    console.error('[ServiceWorker] Fetch failed:', error);

    // Return offline page if available
    const cache = await caches.open(CACHE_NAME);
    const offlineResponse = await cache.match('/offline.html');

    if (offlineResponse) {
      return offlineResponse;
    }

    // Return a basic offline response
    return new Response('Offline - Content not available', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Cache-first strategy for a custom cache bucket (e.g. images)
async function cacheFirstStrategyBucketed(request, bucketName) {
    try {
        const cache = await caches.open(bucketName);
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            // Background refresh
            fetchAndCache(request, bucketName);
            return cachedResponse;
        }
        const networkResponse = await fetch(request);
        if (networkResponse.ok && isCacheable(request, networkResponse)) {
            try {
                await cache.put(request, networkResponse.clone());
            } catch {
            }
        }
        return networkResponse;
    } catch (error) {
        return new Response('Offline - Content not available', {status: 503});
    }
}

// Network-first strategy for API calls
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);

    // Only cache if response is OK and cacheable
    if (networkResponse.ok && isCacheable(request, networkResponse)) {
      try {
        // Cache successful API responses
          const cache = await caches.open(API_CACHE);
        await cache.put(request, networkResponse.clone());

        // Clean up old dynamic cache entries
        cleanDynamicCache();
      } catch (cacheError) {
        console.warn('[ServiceWorker] Unable to cache API response:', cacheError.message);
      }
    }

    return networkResponse;
  } catch (error) {
    console.log('[ServiceWorker] Network request failed, serving from cache');

    // Try to serve from cache
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

      // Return error response for API calls
    return new Response(JSON.stringify({
      error: 'Offline',
      message: 'This feature requires an internet connection'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Background fetch helper
async function fetchAndCache(request, cacheName) {
  try {
    const networkResponse = await fetch(request);

      // Only cache if response is OK and cacheable
    if (networkResponse.ok && isCacheable(request, networkResponse)) {
      try {
        const cache = await caches.open(cacheName);
        await cache.put(request, networkResponse.clone());
      } catch (cacheError) {
        // Silent fail for background updates but log for debugging
        console.debug('[ServiceWorker] Background cache update failed:', cacheError.message);
      }
    }
  } catch (error) {
    // Silent fail for background updates
  }
}

// Clean up old dynamic cache entries
async function cleanDynamicCache() {
    // API cache trim
    const apiCache = await caches.open(API_CACHE);
    const apiRequests = await apiCache.keys();
    if (apiRequests.length > MAX_DYNAMIC_ITEMS) {
        const toDelete = apiRequests.slice(0, apiRequests.length - MAX_DYNAMIC_ITEMS);
        for (const req of toDelete) await apiCache.delete(req);
    }

    // Image cache trim (so images don't balloon)
    const imgCache = await caches.open(IMAGE_CACHE);
    const imgRequests = await imgCache.keys();
    const MAX_IMAGES = 100;
    if (imgRequests.length > MAX_IMAGES) {
        const toDeleteImg = imgRequests.slice(0, imgRequests.length - MAX_IMAGES);
        for (const req of toDeleteImg) await imgCache.delete(req);
  }
}

// Background sync event
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Sync event triggered:', event.tag);
  if (event.tag === SYNC_TAG) {
    event.waitUntil(syncGameState());
  }
});

// Sync game state with server, with exponential backoff and status updates
async function syncGameState(retryAttempt = 0) {
  try {
    const pendingData = await getPendingSyncData();
      if (!pendingData.length) {
          notifyClients({type: 'sync-empty', ts: Date.now()});
      return;
    }

      notifyClients({type: 'sync-start', count: pendingData.length, ts: Date.now()});

    const response = await fetch('/api/sync/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({updates: pendingData}),
    });

      if (response.ok) {
      await clearSyncedData(pendingData);
          notifyClients({type: 'sync-complete', count: pendingData.length, ts: Date.now()});
          return;
      }

      throw new Error('Sync failed with status: ' + response.status);
  } catch (error) {
    console.error('[ServiceWorker] Sync failed:', error);
      notifyClients({type: 'sync-error', error: String(error), ts: Date.now()});

      // Retry with exponential backoff (cap at ~5 minutes)
      const nextAttempt = Math.min(5 * 60 * 1000, Math.pow(2, retryAttempt) * 30000);
    setTimeout(() => {
        if ('sync' in self.registration) {
            self.registration.sync.register(SYNC_TAG);
        } else {
            syncGameState(retryAttempt + 1);
        }
    }, nextAttempt);
  }
}

// IndexedDB helpers for sync queue
function openSyncDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('PlunderverseSyncDB', 1);
      request.onupgradeneeded = (event) => {
      const db = event.target.result;
          if (!db.objectStoreNames.contains('syncQueue')) {
              db.createObjectStore('syncQueue', {keyPath: 'id', autoIncrement: true});
          }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
  });
}

async function getPendingSyncData() {
    const db = await openSyncDB();
  return new Promise((resolve, reject) => {
      const tx = db.transaction(['syncQueue'], 'readonly');
      const store = tx.objectStore('syncQueue');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
  });
}

async function addToSyncQueue(payload) {
    const db = await openSyncDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(['syncQueue'], 'readwrite');
        const store = tx.objectStore('syncQueue');
        const req = store.add({...payload, queuedAt: Date.now()});
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function clearSyncedData(items) {
    const db = await openSyncDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(['syncQueue'], 'readwrite');
        const store = tx.objectStore('syncQueue');
        items.forEach((item) => store.delete(item.id));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
  });
}

// Message handling
self.addEventListener('message', (event) => {
    const {type, data} = event.data || {};
  switch (type) {
    case 'queue-sync':
        // Queue data for background sync and request a sync
        if (data) {
            addToSyncQueue(data).then(() => {
                notifyClients({type: 'queued', count: 1});
            });
        }
        if ('sync' in self.registration) {
            self.registration.sync.register(SYNC_TAG);
        } else {
            // Fallback: attempt immediate sync
            syncGameState();
        }
      break;

      case 'force-sync':
      syncGameState();
      break;

      case 'clear-cache':
          caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n))));
          break;

      case 'flush-queue':
          syncGameState();
      break;
  }
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', event => {
  if (event.tag === 'sync-game-state-periodic') {
    event.waitUntil(syncGameState());
  }
});

self.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'sw-version') {
        e.source?.postMessage({
            type: 'sw-version',
            CACHE_NAME: ASSET_CACHE,
            DYNAMIC_CACHE: API_CACHE,
            HTML_CACHE,
            IMAGE_CACHE,
        });
  }
});
