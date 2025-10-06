import { create } from 'zustand';
import { gameApi, SaveSlot } from './gameApi';
import { collectGameState, restoreGameState } from '../utils/saveGame';

const CLOUD_SYNC_SLOT = 1;
const SYNC_INTERVAL = 30000;
const MAX_RETRY_ATTEMPTS = 5;
const MAX_RETRY_DELAY = 60000;
const STORAGE_KEY = 'cloudSync:lastSyncedAt';

type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'conflict' | 'error';

interface CloudSyncState {
  status: SyncStatus;
  lastSyncedAt: number | null;
  lastError: string | null;
  retryCount: number;
  conflictData: { serverTime: number; localTime: number } | null;
  
  syncInterval: NodeJS.Timeout | null;
  isInitialized: boolean;
  isInitializing: boolean;
  
  setStatus: (status: SyncStatus) => void;
  setLastSyncedAt: (timestamp: number) => void;
  setConflict: (serverTime: number, localTime: number) => void;
  clearConflict: () => void;
  setError: (error: string) => void;
  clearError: () => void;
  checkForConflict: (saveTimestamp: number) => Promise<boolean>;
  
  initialize: () => Promise<void>;
  syncNow: () => Promise<void>;
  startPeriodicSync: () => void;
  stopPeriodicSync: () => void;
  resolveConflict: (useServer: boolean) => Promise<void>;
  reset: () => void;
  
  _performSync: () => Promise<void>;
  _handleSyncError: (error: Error) => Promise<void>;
  _getRetryDelay: () => number;
}

function loadLastSyncedAt(): number | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseInt(stored, 10) : null;
  } catch (error) {
    console.error('[CloudSync] Failed to load lastSyncedAt:', error);
    return null;
  }
}

function saveLastSyncedAt(timestamp: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, timestamp.toString());
  } catch (error) {
    console.error('[CloudSync] Failed to save lastSyncedAt:', error);
  }
}

function isAuthenticated(): boolean {
  const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
  return !!token;
}

export const useCloudSync = create<CloudSyncState>((set, get) => ({
  status: 'idle',
  lastSyncedAt: loadLastSyncedAt(),
  lastError: null,
  retryCount: 0,
  conflictData: null,
  syncInterval: null,
  isInitialized: false,
  isInitializing: false,
  
  setStatus: (status: SyncStatus) => {
    set({ status });
    console.log(`[CloudSync] Status changed to: ${status}`);
  },
  
  setLastSyncedAt: (timestamp: number) => {
    saveLastSyncedAt(timestamp);
    set({ lastSyncedAt: timestamp });
    console.log(`[CloudSync] Last synced at: ${new Date(timestamp).toISOString()}`);
  },
  
  setConflict: (serverTime: number, localTime: number) => {
    set({ 
      status: 'conflict',
      conflictData: { serverTime, localTime }
    });
    console.warn('[CloudSync] Conflict detected:', { serverTime, localTime });
  },
  
  clearConflict: () => {
    set({ conflictData: null });
    console.log('[CloudSync] Conflict cleared');
  },
  
  setError: (error: string) => {
    set({ 
      status: 'error',
      lastError: error
    });
    console.error('[CloudSync] Error:', error);
  },
  
  clearError: () => {
    set({ 
      status: 'idle',
      lastError: null 
    });
    console.log('[CloudSync] Error cleared');
  },
  
  checkForConflict: async (saveTimestamp: number): Promise<boolean> => {
    if (!isAuthenticated()) {
      return false; // No conflict check if offline
    }
    
    try {
      const latestServerSave = await gameApi.getLatestSave();
      if (!latestServerSave) {
        return false; // No conflict if no server save
      }
      
      const serverTime = new Date(latestServerSave.timestamp).getTime();
      const localTime = saveTimestamp;
      
      // If server has a newer save, we have a conflict
      if (serverTime > localTime) {
        get().setConflict(serverTime, localTime);
        console.log('[CloudSync] Conflict detected when loading old save');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[CloudSync] Error checking for conflict:', error);
      return false; // Don't block load on error
    }
  },
  
  initialize: async () => {
    const state = get();
    
    // Prevent concurrent initialization
    if (state.isInitializing) {
      console.log('[CLOUD-SYNC] Already initializing, skipping');
      return;
    }
    
    if (state.isInitialized) {
      console.log('[CloudSync] Already initialized');
      return;
    }
    
    if (!isAuthenticated()) {
      console.log('[CloudSync] User not authenticated, skipping initialization');
      set({ status: 'offline', isInitialized: false });
      return;
    }
    
    console.log('[CloudSync] Initializing...');
    set({ isInitializing: true, status: 'syncing' });
    
    try {
      const latestSave = await gameApi.getLatestSave();
      
      if (!latestSave) {
        console.log('[CloudSync] No server save found, using local state');
        set({ 
          status: 'idle',
          isInitialized: true
        });
        get().startPeriodicSync();
        return;
      }
      
      const serverUpdatedAt = new Date(latestSave.timestamp).getTime();
      const localLastSyncedAt = state.lastSyncedAt || 0;
      
      console.log('[CloudSync] Comparing timestamps:', {
        server: new Date(serverUpdatedAt).toISOString(),
        local: localLastSyncedAt ? new Date(localLastSyncedAt).toISOString() : 'never'
      });
      
      // On initialization, always load from server if available (no conflict prompt)
      // This ensures the latest cloud save is used when starting the game
      if (serverUpdatedAt > localLastSyncedAt) {
        console.log('[CloudSync] Server has newer save, loading automatically...');
        try {
          restoreGameState(latestSave.stores || latestSave);
          get().setLastSyncedAt(serverUpdatedAt);
          console.log('[CloudSync] Server save loaded successfully');
        } catch (error) {
          console.error('[CloudSync] Failed to load server save:', error);
          get().setError((error as Error).message);
          set({ isInitialized: true });
          return;
        }
      } else {
        console.log('[CloudSync] Local state is current');
      }
      
      set({ 
        status: 'synced',
        isInitialized: true
      });
      get().startPeriodicSync();
      
    } catch (error) {
      console.error('[CLOUD-SYNC] Initialize error:', error);
      set({ 
        status: 'error',
        lastError: error instanceof Error ? error.message : 'Unknown error',
        isInitialized: true
      });
      throw error;
    } finally {
      set({ isInitializing: false });
    }
  },
  
  syncNow: async () => {
    const state = get();
    
    if (!isAuthenticated()) {
      console.log('[CloudSync] Cannot sync: user not authenticated');
      set({ status: 'offline' });
      return;
    }
    
    if (state.status === 'syncing') {
      console.log('[CloudSync] Sync already in progress');
      return;
    }
    
    if (state.conflictData) {
      console.log('[CloudSync] Cannot sync: conflict must be resolved first');
      return;
    }
    
    console.log('[CloudSync] Starting manual sync...');
    await get()._performSync();
  },
  
  startPeriodicSync: () => {
    // Clear any existing interval first
    get().stopPeriodicSync();
    
    console.log(`[CloudSync] Starting periodic sync (every ${SYNC_INTERVAL / 1000}s)`);
    
    const interval = setInterval(async () => {
      const currentState = get();
      
      if (!isAuthenticated()) {
        console.log('[CloudSync] User not authenticated, stopping periodic sync');
        get().stopPeriodicSync();
        set({ status: 'offline' });
        return;
      }
      
      if (currentState.conflictData) {
        console.log('[CloudSync] Skipping sync due to unresolved conflict');
        return;
      }
      
      await get()._performSync();
    }, SYNC_INTERVAL);
    
    set({ syncInterval: interval });
  },
  
  stopPeriodicSync: () => {
    const state = get();
    
    if (state.syncInterval) {
      clearInterval(state.syncInterval);
      set({ syncInterval: null });
      console.log('[CloudSync] Periodic sync stopped');
    }
  },
  
  resolveConflict: async (useServer: boolean) => {
    const state = get();
    
    if (!state.conflictData) {
      console.warn('[CloudSync] No conflict to resolve');
      return;
    }
    
    console.log(`[CloudSync] Resolving conflict: ${useServer ? 'use server' : 'use local'}`);
    
    try {
      if (useServer) {
        const serverSave = await gameApi.loadGame(CLOUD_SYNC_SLOT);
        restoreGameState(serverSave.stores || serverSave);
        get().setLastSyncedAt(state.conflictData.serverTime);
        console.log('[CloudSync] Loaded server save');
      } else {
        await get()._performSync();
        console.log('[CloudSync] Uploaded local save');
      }
      
      get().clearConflict();
      set({ status: 'synced' });
      
      // Restart periodic sync (this will clear old interval)
      get().stopPeriodicSync();
      get().startPeriodicSync();
      
      console.log(`[CloudSync] Conflict resolved, using ${useServer ? 'server' : 'local'} save`);
      
    } catch (error) {
      console.error('[CloudSync] Failed to resolve conflict:', error);
      get().setError((error as Error).message);
    }
  },
  
  reset: () => {
    // Stop any active sync
    get().stopPeriodicSync();
    
    // Reset all state to initial values
    set({
      status: 'idle',
      lastError: null,
      retryCount: 0,
      conflictData: null,
      syncInterval: null,
      isInitialized: false,
      isInitializing: false,
    });
    
    console.log('[CloudSync] Store reset complete');
  },
  
  _performSync: async () => {
    const state = get();
    
    set({ status: 'syncing' });
    
    try {
      const gameState = collectGameState();
      
      await gameApi.saveGame(CLOUD_SYNC_SLOT, gameState);
      
      const now = Date.now();
      get().setLastSyncedAt(now);
      
      set({ 
        status: 'synced',
        lastError: null,
        retryCount: 0
      });
      
      console.log('[CloudSync] Sync successful');
      
    } catch (error) {
      console.error('[CloudSync] Sync failed:', error);
      await get()._handleSyncError(error as Error);
    }
  },
  
  _handleSyncError: async (error: Error) => {
    const state = get();
    const newRetryCount = state.retryCount + 1;
    
    if (error.message.includes('Network') || error.message.includes('Failed to fetch')) {
      set({ status: 'offline', retryCount: 0 });
      console.log('[CloudSync] Network error, setting status to offline');
      return;
    }
    
    if (newRetryCount >= MAX_RETRY_ATTEMPTS) {
      get().setError(error.message);
      set({ retryCount: 0 });
      console.error(`[CloudSync] Max retry attempts (${MAX_RETRY_ATTEMPTS}) reached`);
      return;
    }
    
    const delay = get()._getRetryDelay();
    set({ retryCount: newRetryCount });
    
    console.log(`[CloudSync] Retry ${newRetryCount}/${MAX_RETRY_ATTEMPTS} in ${delay / 1000}s`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    await get()._performSync();
  },
  
  _getRetryDelay: () => {
    const state = get();
    const baseDelay = 1000;
    const exponentialDelay = baseDelay * Math.pow(2, state.retryCount);
    return Math.min(exponentialDelay, MAX_RETRY_DELAY);
  }
}));

export const cloudSyncManager = {
  initialize: () => useCloudSync.getState().initialize(),
  syncNow: () => useCloudSync.getState().syncNow(),
  startPeriodicSync: () => useCloudSync.getState().startPeriodicSync(),
  stopPeriodicSync: () => useCloudSync.getState().stopPeriodicSync(),
  resolveConflict: (useServer: boolean) => useCloudSync.getState().resolveConflict(useServer),
  reset: () => useCloudSync.getState().reset(),
  clearError: () => useCloudSync.getState().clearError(),
  checkForConflict: (saveTimestamp: number) => useCloudSync.getState().checkForConflict(saveTimestamp),
  getStatus: () => useCloudSync.getState().status,
  getLastSyncedAt: () => useCloudSync.getState().lastSyncedAt,
  hasConflict: () => !!useCloudSync.getState().conflictData,
};

if (import.meta.env.DEV) {
  (window as any).cloudSyncManager = cloudSyncManager;
  (window as any).useCloudSync = useCloudSync;
  console.log('[CloudSync] Dev tools exposed: window.cloudSyncManager, window.useCloudSync');
}
