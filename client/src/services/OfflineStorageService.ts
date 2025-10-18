import { toast } from 'sonner';

export interface OfflineGameState {
  id?: string;
  timestamp: number;
  version: number;
  player: {
    level: number;
    experience: number;
    reputation: {
      corporations: number;
      independents: number;
      outlaws: number;
    };
    notoriety: number;
    heat: number;
    rank: string; // This stores rankTitle, not the numeric rank
  };
  economy: {
    credits: number;
    inventory: any[];
  };
  missions: {
    active: any[];
    completed: string[];
    progress: Record<string, any>;
  };
  crew: {
    members: any[];
    tasks: Record<string, any>;
  };
  miniGame: {
    position: { x: number; y: number };
    currentStation: string;
    npcInteractions: Record<string, any>;
    smugglingMissions: any[];
    unlockedAreas: string[];
  };
}

export interface SyncQueueItem {
  id: string;
  timestamp: number;
  type: 'state_update' | 'state_delta' | 'mission_progress' | 'dialogue_outcome';
  data: any;
  retries: number;
  synced: boolean;
}

class OfflineStorageService {
  private static instance: OfflineStorageService;
  private dbName = 'PlunderverseSyncDB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;
  private isInitialized = false;
  private onlineStatus: boolean = navigator.onLine;
  private syncInProgress = false;
  private lastSyncTime: number = 0;

  private constructor() {
    this.initializeDB();
    this.setupOnlineListener();
    this.registerServiceWorker();
  }

  public static getInstance(): OfflineStorageService {
    if (!OfflineStorageService.instance) {
      OfflineStorageService.instance = new OfflineStorageService();
    }
    return OfflineStorageService.instance;
  }

  private async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('[OfflineStorage] Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        console.log('[OfflineStorage] IndexedDB initialized');
        
        // Load last sync time
        this.loadLastSyncTime();
        resolve();
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('gameState')) {
          const gameStateStore = db.createObjectStore('gameState', { keyPath: 'id' });
          gameStateStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncQueueStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
          syncQueueStore.createIndex('timestamp', 'timestamp', { unique: false });
          syncQueueStore.createIndex('synced', 'synced', { unique: false });
        }

        if (!db.objectStoreNames.contains('cachedData')) {
          const cachedDataStore = db.createObjectStore('cachedData', { keyPath: 'key' });
          cachedDataStore.createIndex('expiry', 'expiry', { unique: false });
        }

        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }

        console.log('[OfflineStorage] Object stores created');
      };
    });
  }

  private async registerServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
        
        console.log('[OfflineStorage] Service Worker registered:', registration);
        
        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60000); // Check every minute

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));
      } catch (error) {
        console.error('[OfflineStorage] Service Worker registration failed:', error);
      }
    }
  }

  private handleServiceWorkerMessage(event: MessageEvent): void {
    const { type, data } = event.data;
    
    switch (type) {
      case 'sync-complete':
        this.lastSyncTime = Date.now();
        this.saveLastSyncTime();
        this.clearSyncedItems();
        toast.success('Game state synced successfully');
        break;
        
      case 'sync-failed':
        toast.error('Failed to sync game state');
        break;
        
      case 'cache-updated':
        console.log('[OfflineStorage] Cache updated:', data);
        break;
    }
  }

  private setupOnlineListener(): void {
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // Check initial status
    this.onlineStatus = navigator.onLine;
    
    if (!this.onlineStatus) {
      toast.warning('You are offline. Game progress will be saved locally.');
    }
  }

  private handleOnline(): void {
    console.log('[OfflineStorage] Connection restored');
    this.onlineStatus = true;
    
    toast.success('Back online! Syncing game progress...');
    
    // Trigger background sync
    this.triggerBackgroundSync();
    
    // Dispatch event for UI updates
    window.dispatchEvent(new CustomEvent('connection-status-changed', {
      detail: { online: true }
    }));
  }

  private handleOffline(): void {
    console.log('[OfflineStorage] Connection lost');
    this.onlineStatus = false;
    
    toast.warning('You are offline. Progress will be saved locally.');
    
    // Dispatch event for UI updates
    window.dispatchEvent(new CustomEvent('connection-status-changed', {
      detail: { online: false }
    }));
  }

  // Save game state
  public async saveGameState(state: OfflineGameState): Promise<void> {
    if (!this.db) {
      await this.initializeDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['gameState'], 'readwrite');
      const store = transaction.objectStore('gameState');
      
      // Add ID and timestamp
      state.id = 'current';
      state.timestamp = Date.now();
      state.version = state.version || 1;
      
      const request = store.put(state);
      
      request.onsuccess = () => {
        console.log('[OfflineStorage] Game state saved');
        resolve();
      };
      
      request.onerror = () => {
        console.error('[OfflineStorage] Failed to save game state:', request.error);
        reject(request.error);
      };
    });
  }

  // Load game state
  public async loadGameState(): Promise<OfflineGameState | null> {
    if (!this.db) {
      await this.initializeDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['gameState'], 'readonly');
      const store = transaction.objectStore('gameState');
      const request = store.get('current');
      
      request.onsuccess = () => {
        const state = request.result;
        if (state) {
          console.log('[OfflineStorage] Game state loaded');
          resolve(state);
        } else {
          resolve(null);
        }
      };
      
      request.onerror = () => {
        console.error('[OfflineStorage] Failed to load game state:', request.error);
        reject(request.error);
      };
    });
  }

  // Queue sync item
  public async queueSyncItem(item: Omit<SyncQueueItem, 'id' | 'synced'>): Promise<void> {
    if (!this.db) {
      await this.initializeDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      
      const syncItem: SyncQueueItem = {
        ...item,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        synced: false
      };
      
      const request = store.add(syncItem);
      
      request.onsuccess = () => {
        console.log('[OfflineStorage] Sync item queued:', syncItem.type);
        
        // Try to sync if online
        if (this.onlineStatus) {
          this.triggerBackgroundSync();
        }
        
        resolve();
      };
      
      request.onerror = () => {
        console.error('[OfflineStorage] Failed to queue sync item:', request.error);
        reject(request.error);
      };
    });
  }

  // Get pending sync items
  public async getPendingSyncItems(): Promise<SyncQueueItem[]> {
    if (!this.db) {
      await this.initializeDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readonly');
      const store = transaction.objectStore('syncQueue');
      const index = store.index('synced');
      // Get all items where synced = false
      const request = index.getAll(IDBKeyRange.only(false));
      
      request.onsuccess = () => {
        resolve(request.result || []);
      };
      
      request.onerror = () => {
        console.error('[OfflineStorage] Failed to get pending sync items:', request.error);
        reject(request.error);
      };
    });
  }

  // Clear synced items
  public async clearSyncedItems(): Promise<void> {
    if (!this.db) {
      await this.initializeDB();
    }

    const items = await this.getPendingSyncItems();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      
      // Delete synced items older than 1 hour
      const cutoffTime = Date.now() - 3600000;
      
      items.forEach(item => {
        if (item.synced && item.timestamp < cutoffTime) {
          store.delete(item.id);
        }
      });
      
      transaction.oncomplete = () => {
        console.log('[OfflineStorage] Cleared old synced items');
        resolve();
      };
      
      transaction.onerror = () => {
        reject(transaction.error);
      };
    });
  }

  // Cache data with expiry
  public async cacheData(key: string, data: any, expiryMinutes: number = 60): Promise<void> {
    if (!this.db) {
      await this.initializeDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cachedData'], 'readwrite');
      const store = transaction.objectStore('cachedData');
      
      const cachedItem = {
        key,
        data,
        expiry: Date.now() + (expiryMinutes * 60 * 1000),
        timestamp: Date.now()
      };
      
      const request = store.put(cachedItem);
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Get cached data
  public async getCachedData(key: string): Promise<any | null> {
    if (!this.db) {
      await this.initializeDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cachedData'], 'readonly');
      const store = transaction.objectStore('cachedData');
      const request = store.get(key);
      
      request.onsuccess = () => {
        const item = request.result;
        
        if (item && item.expiry > Date.now()) {
          resolve(item.data);
        } else {
          // Expired or not found
          if (item) {
            // Clean up expired item
            this.deleteCachedData(key);
          }
          resolve(null);
        }
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Delete cached data
  private async deleteCachedData(key: string): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['cachedData'], 'readwrite');
    const store = transaction.objectStore('cachedData');
    store.delete(key);
  }

  // Trigger background sync
  public async triggerBackgroundSync(): Promise<void> {
    if (!this.onlineStatus || this.syncInProgress) {
      return;
    }

    this.syncInProgress = true;

    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        // Use type assertion for the sync API which may not be in TypeScript definitions
        if ('sync' in registration) {
          await (registration as any).sync.register('sync-game-state');
          console.log('[OfflineStorage] Background sync triggered');
        } else {
          // Fallback to manual sync
          await this.manualSync();
        }
      } else {
        // Fallback to manual sync
        await this.manualSync();
      }
    } catch (error) {
      console.error('[OfflineStorage] Failed to trigger background sync:', error);
      
      // Fallback to manual sync
      await this.manualSync();
    } finally {
      this.syncInProgress = false;
    }
  }

  // Manual sync fallback
  private async manualSync(): Promise<void> {
    const pendingItems = await this.getPendingSyncItems();
    
    if (pendingItems.length === 0) {
      return;
    }

    try {
      const response = await fetch('/api/sync/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: pendingItems })
      });

      if (response.ok) {
        // Mark items as synced
        await this.markItemsAsSynced(pendingItems.map(item => item.id));
        this.lastSyncTime = Date.now();
        this.saveLastSyncTime();
        toast.success('Game progress synced!');
      } else {
        throw new Error('Sync failed');
      }
    } catch (error) {
      console.error('[OfflineStorage] Manual sync failed:', error);
      toast.error('Failed to sync game progress');
    }
  }

  // Mark items as synced
  private async markItemsAsSynced(ids: string[]): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');
    
    ids.forEach(id => {
      const request = store.get(id);
      request.onsuccess = () => {
        const item = request.result;
        if (item) {
          item.synced = true;
          store.put(item);
        }
      };
    });
  }

  // Save last sync time
  private async saveLastSyncTime(): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['metadata'], 'readwrite');
    const store = transaction.objectStore('metadata');
    store.put({ key: 'lastSyncTime', value: this.lastSyncTime });
  }

  // Load last sync time
  private async loadLastSyncTime(): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['metadata'], 'readonly');
    const store = transaction.objectStore('metadata');
    const request = store.get('lastSyncTime');
    
    request.onsuccess = () => {
      if (request.result) {
        this.lastSyncTime = request.result.value;
      }
    };
  }

  // Get sync status
  public getSyncStatus(): {
    online: boolean;
    syncing: boolean;
    lastSync: number;
    queueSize?: number;
  } {
    return {
      online: this.onlineStatus,
      syncing: this.syncInProgress,
      lastSync: this.lastSyncTime
    };
  }

  // Get storage quota
  public async getStorageQuota(): Promise<{
    used: number;
    total: number;
    percentage: number;
  }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage || 0;
      const total = estimate.quota || 0;
      const percentage = total > 0 ? (used / total) * 100 : 0;
      
      return { used, total, percentage };
    }
    
    return { used: 0, total: 0, percentage: 0 };
  }

  // Request persistent storage
  public async requestPersistentStorage(): Promise<boolean> {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      const isPersisted = await navigator.storage.persist();
      
      if (isPersisted) {
        console.log('[OfflineStorage] Storage will not be cleared automatically');
      } else {
        console.log('[OfflineStorage] Storage may be cleared under pressure');
      }
      
      return isPersisted;
    }
    
    return false;
  }

  // Clean up old data
  public async cleanup(): Promise<void> {
    await this.clearSyncedItems();
    
    // Clear expired cache
    if (!this.db) return;

    const transaction = this.db.transaction(['cachedData'], 'readwrite');
    const store = transaction.objectStore('cachedData');
    const index = store.index('expiry');
    const range = IDBKeyRange.upperBound(Date.now());
    const request = index.getAllKeys(range);
    
    request.onsuccess = () => {
      const keys = request.result;
      keys.forEach(key => store.delete(key));
      console.log(`[OfflineStorage] Cleaned up ${keys.length} expired cache entries`);
    };
  }
}

export default OfflineStorageService;