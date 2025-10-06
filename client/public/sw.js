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
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE) {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Take control immediately
  self.clients.claim();
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle WebSocket connections differently
  if (url.protocol === 'ws:' || url.protocol === 'wss:') {
    return;
  }
  
  event.respondWith(
    // Try network first for API calls
    request.url.includes('/api/') || request.url.includes('/ws/') ?
      networkFirstStrategy(request) :
      // Cache first for static assets
      cacheFirstStrategy(request)
  );
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
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
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

// Network-first strategy for API calls
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful API responses
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
      
      // Clean up old dynamic cache entries
      cleanDynamicCache();
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
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
  } catch (error) {
    // Silent fail for background updates
  }
}

// Clean up old dynamic cache entries
async function cleanDynamicCache() {
  const cache = await caches.open(DYNAMIC_CACHE);
  const requests = await cache.keys();
  
  if (requests.length > MAX_DYNAMIC_ITEMS) {
    // Remove oldest entries
    const toDelete = requests.slice(0, requests.length - MAX_DYNAMIC_ITEMS);
    
    for (const request of toDelete) {
      cache.delete(request);
    }
  }
}

// Background sync event
self.addEventListener('sync', event => {
  console.log('[ServiceWorker] Sync event triggered:', event.tag);
  
  if (event.tag === SYNC_TAG) {
    event.waitUntil(syncGameState());
  }
});

// Sync game state with server
async function syncGameState() {
  try {
    // Get all pending sync data from IndexedDB
    const pendingData = await getPendingSyncData();
    
    if (pendingData.length === 0) {
      console.log('[ServiceWorker] No pending data to sync');
      return;
    }
    
    console.log(`[ServiceWorker] Syncing ${pendingData.length} pending updates`);
    
    // Send data to server
    const response = await fetch('/api/sync/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates: pendingData })
    });
    
    if (response.ok) {
      // Clear synced data from IndexedDB
      await clearSyncedData(pendingData);
      
      // Notify clients of successful sync
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'sync-complete',
          timestamp: Date.now()
        });
      });
    } else {
      throw new Error('Sync failed with status: ' + response.status);
    }
  } catch (error) {
    console.error('[ServiceWorker] Sync failed:', error);
    
    // Retry sync after delay
    setTimeout(() => {
      self.registration.sync.register(SYNC_TAG);
    }, 30000); // Retry in 30 seconds
  }
}

// IndexedDB helpers for sync queue
async function getPendingSyncData() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('PlunderverseSyncDB', 1);
    
    request.onsuccess = event => {
      const db = event.target.result;
      const transaction = db.transaction(['syncQueue'], 'readonly');
      const store = transaction.objectStore('syncQueue');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => {
        resolve(getAllRequest.result || []);
      };
      
      getAllRequest.onerror = () => {
        reject(getAllRequest.error);
      };
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
}

async function clearSyncedData(syncedData) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('PlunderverseSyncDB', 1);
    
    request.onsuccess = event => {
      const db = event.target.result;
      const transaction = db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      
      syncedData.forEach(item => {
        store.delete(item.id);
      });
      
      transaction.oncomplete = () => {
        resolve();
      };
      
      transaction.onerror = () => {
        reject(transaction.error);
      };
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Message handling
self.addEventListener('message', event => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'queue-sync':
      // Queue data for background sync
      self.registration.sync.register(SYNC_TAG);
      break;
      
    case 'force-sync':
      // Force immediate sync
      syncGameState();
      break;
      
    case 'clear-cache':
      // Clear all caches
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
      break;
  }
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', event => {
  if (event.tag === 'sync-game-state-periodic') {
    event.waitUntil(syncGameState());
  }
});

console.log('[ServiceWorker] Script loaded');