import { toast } from 'sonner';
import { usePlayer } from '../lib/stores/player/usePlayer';
import { useCreditsStore } from '../domain/economy/credits.store';
import { useInventoryStore } from '../domain/economy/inventory.store';
import { useHeatSystem } from '../lib/stores/player/useHeatSystem';
import { useCrewManagement } from '../lib/stores/ship/useCrewManagement';
import { usePlunderverseMissions } from '../lib/stores/economy/usePlunderverseMissions';
import { useShipStatus } from '../lib/stores/ship/useShipStatus';
import { useSolarSystem } from '../lib/stores/space/useSolarSystem';
import OfflineStorageService, { OfflineGameState, SyncQueueItem } from './OfflineStorageService';
import { TransactionClient } from './TransactionClient';
import { CloudSyncManager, SyncPayload, SyncMessageType } from './CloudSyncWebSocket';

// State change event
export interface StateChangeEvent {
  store: string;
  property: string;
  previousValue: any;
  newValue: any;
  timestamp: number;
  source: 'mini-game' | 'main-game';
}

// Sync status
export type SyncStatus = 'connected' | 'syncing' | 'synced' | 'offline' | 'error';

// Conflict resolution strategy
export type ConflictStrategy = 'last-write-wins' | 'merge' | 'server-authority' | 'custom';

// State delta
export interface StateDelta {
  store: string;
  changes: Record<string, any>;
  timestamp: number;
  version: number;
}

// Offline queue item
export interface QueuedUpdate {
  id: string;
  payload: SyncPayload;
  retryCount: number;
  maxRetries: number;
  timestamp: number;
}

class MiniGameSyncService {
  private static instance: MiniGameSyncService;
  private cloudSync: CloudSyncManager;
  private syncStatus: SyncStatus = 'offline';
  private offlineQueue: QueuedUpdate[] = [];
  private pendingAcks: Map<string, QueuedUpdate> = new Map();
  private currentVersion: number = 0;
  private clientId: string;
  private batchTimeout: NodeJS.Timeout | null = null;
  private batchedUpdates: StateDelta[] = [];
  private batchDelay: number = 100; // Batch updates for 100ms
  private syncListeners: Map<string, Function[]> = new Map();
  private isMinigameActive: boolean = false;
  private offlineStorage: OfflineStorageService;
  private autoSaveInterval: NodeJS.Timeout | null = null;
  private messageHandler: ((data: any) => void) | null = null;
  
  // Store unsubscribe functions
  private unsubscribers: (() => void)[] = [];

  private constructor() {
    this.clientId = this.generateClientId();
    this.offlineStorage = OfflineStorageService.getInstance();
    this.cloudSync = CloudSyncManager.getInstance();
    
    // Setup message handler for CloudSync
    this.messageHandler = this.handleCloudSyncMessage.bind(this);
    
    this.setupStoreSubscriptions();
    this.startAutoSave();
    this.loadOfflineState();
  }

  public static getInstance(): MiniGameSyncService {
    if (!MiniGameSyncService.instance) {
      MiniGameSyncService.instance = new MiniGameSyncService();
    }
    return MiniGameSyncService.instance;
  }

  private generateClientId(): string {
    return `mini-game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Handle incoming messages from CloudSyncManager
   */
  private handleCloudSyncMessage(payload: SyncPayload): void {
    // Only process messages when mini-game is active
    if (!this.isMinigameActive) return;
    
    console.log(`[MiniGameSync] Received ${payload.type} via CloudSync`);
    
    switch (payload.type) {
      case 'state_update':
        this.handleStateUpdate(payload);
        break;
      case 'state_delta':
        this.handleStateDelta(payload);
        break;
      case 'state_ack':
        this.handleAcknowledgment(payload);
        break;
      case 'state_conflict':
        this.handleConflict(payload);
        break;
      case 'sync_complete':
        this.setSyncStatus('synced');
        break;
      case 'heartbeat':
        // Heartbeat received, connection is alive
        break;
    }
  }

  private messageHandlerRegistered: boolean = false;

  /**
   * Initialize mini-game sync - register with CloudSyncManager
   */
  private initializeSync(): void {
    if (!this.messageHandler) return;
    
    console.log('[MiniGameSync] Initializing WebSocket connection via CloudSyncManager...');
    
    // Register message handler with CloudSync (only if not already registered)
    if (!this.messageHandlerRegistered) {
      this.cloudSync.addMessageHandler(this.messageHandler);
      this.messageHandlerRegistered = true;
    }
    
    // Update status based on CloudSync state
    if (this.cloudSync.isConnected()) {
      this.setSyncStatus('connected');
    } else {
      this.setSyncStatus('offline');
    }
    
    // Request full state sync - CloudSyncManager will queue if not connected
    this.requestFullStateSync();
  }

  /**
   * Cleanup mini-game sync - unregister from CloudSyncManager
   */
  private cleanupSync(): void {
    if (!this.messageHandler || !this.messageHandlerRegistered) return;
    
    console.log('[MiniGameSync] Cleaning up WebSocket connection...');
    
    // Unregister message handler from CloudSync
    this.cloudSync.removeMessageHandler(this.messageHandler);
    this.messageHandlerRegistered = false;
    this.setSyncStatus('offline');
  }

  private setSyncStatus(status: SyncStatus): void {
    this.syncStatus = status;
    this.notifyListeners('status', status);
    
    // Update UI indicator
    const event = new CustomEvent('sync-status-changed', { detail: status });
    window.dispatchEvent(event);
  }

  private setupStoreSubscriptions(): void {
    // Subscribe to player store changes
    const unsubPlayer = usePlayer.subscribe((state, prevState) => {
      if (!this.isMinigameActive) return;
      
      // Check for reputation changes
      if (state.reputation !== prevState.reputation) {
        this.queueStateChange('player', 'reputation', prevState.reputation, state.reputation);
      }
      
      // Check for heat changes
      if (state.heat !== prevState.heat) {
        this.queueStateChange('player', 'heat', prevState.heat, state.heat);
      }
      
      // Check for notoriety changes
      if (state.notoriety !== prevState.notoriety) {
        this.queueStateChange('player', 'notoriety', prevState.notoriety, state.notoriety);
      }

      // Check for rank changes
      if (state.rank !== prevState.rank) {
        this.queueStateChange('player', 'rank', prevState.rank, state.rank);
      }
    });
    this.unsubscribers.push(unsubPlayer);

    // Subscribe to credits store changes
    const unsubCredits = useCreditsStore.subscribe((state, prevState) => {
      if (!this.isMinigameActive) return;
      
      if (state.credits !== prevState.credits) {
        this.queueStateChange('credits', 'credits', prevState.credits, state.credits);
      }
    });
    this.unsubscribers.push(unsubCredits);

    // Subscribe to inventory store changes
    const unsubInventory = useInventoryStore.subscribe((state, prevState) => {
      if (!this.isMinigameActive) return;
      
      if (JSON.stringify(state.items) !== JSON.stringify(prevState.items)) {
        this.queueStateChange('inventory', 'items', prevState.items, state.items);
      }
    });
    this.unsubscribers.push(unsubInventory);

    // Subscribe to heat system changes
    const unsubHeat = useHeatSystem.subscribe((state, prevState) => {
      if (!this.isMinigameActive) return;
      
      if (state.currentHeat !== prevState.currentHeat) {
        this.queueStateChange('heat', 'level', prevState.currentHeat, state.currentHeat);
      }
      
      if (state.wantedLevel !== prevState.wantedLevel) {
        this.queueStateChange('heat', 'wantedLevel', prevState.wantedLevel, state.wantedLevel);
      }
    });
    this.unsubscribers.push(unsubHeat);

    // Subscribe to crew management changes
    const unsubCrew = useCrewManagement.subscribe((state, prevState) => {
      if (!this.isMinigameActive) return;
      
      if (JSON.stringify(state.activeCrew) !== JSON.stringify(prevState.activeCrew)) {
        this.queueStateChange('crew', 'members', prevState.activeCrew, state.activeCrew);
      }
    });
    this.unsubscribers.push(unsubCrew);

    // Subscribe to mission changes
    const unsubMissions = usePlunderverseMissions.subscribe((state, prevState) => {
      if (!this.isMinigameActive) return;
      
      if (JSON.stringify(state.activeMissions) !== JSON.stringify(prevState.activeMissions)) {
        this.queueStateChange('missions', 'active', prevState.activeMissions, state.activeMissions);
      }
      
      if (JSON.stringify(Array.from(state.completedMissionIds)) !== JSON.stringify(Array.from(prevState.completedMissionIds))) {
        this.queueStateChange('missions', 'completed', Array.from(prevState.completedMissionIds), Array.from(state.completedMissionIds));
      }
    });
    this.unsubscribers.push(unsubMissions);
  }

  private queueStateChange(store: string, property: string, previousValue: any, newValue: any): void {
    const delta: StateDelta = {
      store,
      changes: { [property]: newValue },
      timestamp: Date.now(),
      version: ++this.currentVersion
    };

    this.batchedUpdates.push(delta);
    this.scheduleBatch();
  }

  private scheduleBatch(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    this.batchTimeout = setTimeout(() => {
      this.sendBatchedUpdates();
    }, this.batchDelay);
  }

  private sendBatchedUpdates(): void {
    if (this.batchedUpdates.length === 0) return;

    const payload: SyncPayload = {
      type: 'state_delta',
      timestamp: Date.now(),
      version: this.currentVersion,
      clientId: this.clientId,
      data: {
        deltas: this.batchedUpdates,
        source: 'mini-game'
      }
    };

    this.sendMessage(payload);
    this.batchedUpdates = [];
  }

  private sendMessage(payload: SyncPayload): void {
    // Always use CloudSyncManager's send - it handles queuing internally
    try {
      this.cloudSync.sendMessage(payload);
      
      // Update status based on connection state
      if (this.cloudSync.isConnected()) {
        this.setSyncStatus('syncing');
      } else {
        this.setSyncStatus('offline');
      }
    } catch (error) {
      console.error('[MiniGameSync] Failed to send message:', error);
      this.setSyncStatus('error');
    }
  }

  private async queueUpdate(payload: SyncPayload): Promise<void> {
    const queuedUpdate: QueuedUpdate = {
      id: `${Date.now()}-${Math.random()}`,
      payload,
      retryCount: 0,
      maxRetries: 3,
      timestamp: Date.now()
    };

    this.offlineQueue.push(queuedUpdate);
    
    // Limit queue size
    if (this.offlineQueue.length > 100) {
      this.offlineQueue = this.offlineQueue.slice(-100);
    }

    // Also persist to IndexedDB for recovery after app restart
    const syncType = payload.type === 'state_delta' || payload.type === 'state_update' || 
                     payload.type === 'state_request' || payload.type === 'state_ack' ? 
                     payload.type : 'state_update';
    
    await this.offlineStorage.queueSyncItem({
      type: syncType as any,
      timestamp: payload.timestamp,
      data: payload.data,
      retries: 0
    });
  }

  private sendQueuedUpdates(): void {
    while (this.offlineQueue.length > 0) {
      const update = this.offlineQueue.shift();
      if (update) {
        this.sendMessage(update.payload);
      }
    }
  }

  private requestFullStateSync(): void {
    const payload: SyncPayload = {
      type: 'state_request',
      timestamp: Date.now(),
      version: this.currentVersion,
      clientId: this.clientId,
      data: {
        stores: ['player', 'credits', 'inventory', 'missions', 'crew', 'ship']
      }
    };

    this.sendMessage(payload);
  }

  private handleStateUpdate(payload: SyncPayload): void {
    const { data } = payload;
    
    if (data.source === 'mini-game' && payload.clientId === this.clientId) {
      // Ignore our own updates (but allow other mini-game instances)
      return;
    }

    // Handle specific update types
    if (data.type === 'victory_rewards' && data.rewards) {
      console.log('[MiniGameSync] Received victory rewards from another client');
      this.applyVictoryRewards(data.rewards);
    }
    // Apply general store updates
    else if (data.stores) {
      this.applyStateUpdates(data.stores);
    }

    this.currentVersion = payload.version;
  }
  
  private applyVictoryRewards(rewards: any): void {
    // Apply credits
    useCreditsStore.getState().earnCredits(rewards.credits);
    console.log(`[MiniGameSync] Received ${rewards.credits} credits from victory`);
    
    // Apply ship repairs using the proper methods
    const shipStatus = useShipStatus.getState();
    shipStatus.rechargeShield(rewards.shipRepairs.shields);
    shipStatus.repairHull(rewards.shipRepairs.hull);
    console.log('[MiniGameSync] Applied ship repairs:', rewards.shipRepairs);
    
    // Note: Fuel is managed by equipment system, not ship status
    // Items would need proper ResourceData objects to add to inventory
    // For now, just log the items (this would need proper implementation)
    if (rewards.items && rewards.items.length > 0) {
      console.log('[MiniGameSync] Victory items received (inventory integration needed):', rewards.items);
    }
    
    // Notify listeners
    this.notifyListeners('victoryComplete', rewards);
  }

  private handleStateDelta(payload: SyncPayload): void {
    const { data } = payload;
    
    if (data.source === 'mini-game') {
      // Ignore our own updates
      return;
    }

    // Apply deltas to stores
    if (data.deltas) {
      for (const delta of data.deltas) {
        this.applyDelta(delta);
      }
    }

    this.currentVersion = payload.version;
  }

  private applyStateUpdates(stores: Record<string, any>): void {
    // Apply full state updates
    if (stores.player) {
      const playerStore = usePlayer.getState();
      Object.assign(playerStore, stores.player);
    }

    if (stores.credits) {
      useCreditsStore.setState({ credits: stores.credits });
    }

    if (stores.inventory) {
      useInventoryStore.setState({ items: stores.inventory });
    }

    if (stores.missions) {
      usePlunderverseMissions.setState(stores.missions);
    }

    if (stores.crew) {
      useCrewManagement.setState({ activeCrew: stores.crew });
    }

    if (stores.ship) {
      useShipStatus.setState(stores.ship);
    }
  }

  private applyDelta(delta: StateDelta): void {
    switch (delta.store) {
      case 'player':
        const playerStore = usePlayer.getState();
        Object.assign(playerStore, delta.changes);
        break;
        
      case 'credits':
        if (delta.changes.credits !== undefined) {
          useCreditsStore.setState({ credits: delta.changes.credits });
        }
        break;
        
      case 'inventory':
        if (delta.changes.items) {
          useInventoryStore.setState({ items: delta.changes.items });
        }
        break;
        
      case 'heat':
        const heatStore = useHeatSystem.getState();
        Object.assign(heatStore, delta.changes);
        break;
        
      case 'crew':
        if (delta.changes.members) {
          useCrewManagement.setState({ activeCrew: delta.changes.members });
        }
        break;
        
      case 'missions':
        const missionStore = usePlunderverseMissions.getState();
        Object.assign(missionStore, delta.changes);
        break;
    }
  }

  private handleAcknowledgment(payload: SyncPayload): void {
    const ackId = payload.data.ackId;
    if (ackId && this.pendingAcks.has(ackId)) {
      this.pendingAcks.delete(ackId);
    }
  }

  private handleConflict(payload: SyncPayload): void {
    const { data } = payload;
    const strategy: ConflictStrategy = data.strategy || 'last-write-wins';

    switch (strategy) {
      case 'last-write-wins':
        // Server wins, apply server state
        this.applyStateUpdates(data.resolvedState);
        break;
        
      case 'merge':
        // Merge arrays and objects
        this.mergeStates(data.localState, data.serverState);
        break;
        
      case 'server-authority':
        // Server always wins
        this.applyStateUpdates(data.serverState);
        break;
        
      case 'custom':
        // Handle custom resolution
        this.handleCustomConflict(data);
        break;
    }

    toast.warning('Sync conflict resolved');
  }

  private mergeStates(localState: any, serverState: any): void {
    // Implement merge logic for arrays and objects
    // For now, use simple last-write-wins
    this.applyStateUpdates(serverState);
  }

  private handleCustomConflict(data: any): void {
    // Implement custom conflict resolution based on specific rules
    console.log('[MiniGameSync] Custom conflict resolution:', data);
  }

  private notifyListeners(event: string, data: any): void {
    const listeners = this.syncListeners.get(event) || [];
    listeners.forEach(listener => listener(data));
  }

  // Public API
  public setMinigameActive(active: boolean): void {
    console.log(`[MiniGameSync] Mini-game ${active ? 'activated' : 'deactivated'}`);
    
    this.isMinigameActive = active;
    
    if (active) {
      // Initialize sync with CloudSyncManager (this also requests full state sync)
      this.initializeSync();
    } else {
      // Send any pending updates when mini-game becomes inactive
      this.sendBatchedUpdates();
      // Cleanup sync connection
      this.cleanupSync();
      // Save final state before deactivating
      this.saveOfflineState();
    }
  }

  public getSyncStatus(): SyncStatus {
    return this.syncStatus;
  }

  public addEventListener(event: string, callback: Function): void {
    if (!this.syncListeners.has(event)) {
      this.syncListeners.set(event, []);
    }
    this.syncListeners.get(event)?.push(callback);
  }

  public removeEventListener(event: string, callback: Function): void {
    const listeners = this.syncListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  public forceSync(): void {
    this.sendBatchedUpdates();
    this.requestFullStateSync();
  }

  public getQueueSize(): number {
    return this.offlineQueue.length;
  }

  public clearQueue(): void {
    this.offlineQueue = [];
  }


  // Mini-game specific sync methods
  public syncCrewTask(crewMemberId: string, task: any, progress: number): void {
    this.queueStateChange('crew', `task_${crewMemberId}`, null, { task, progress });
  }

  public syncSmugglingMission(mission: any, outcome: 'success' | 'failure' | 'detected'): void {
    const payload: SyncPayload = {
      type: 'state_update',
      timestamp: Date.now(),
      version: ++this.currentVersion,
      clientId: this.clientId,
      data: {
        type: 'smuggling_mission',
        mission,
        outcome,
        source: 'mini-game'
      }
    };

    this.sendMessage(payload);
  }

  public syncDialogueOutcome(npcId: string, outcomes: any[]): void {
    const payload: SyncPayload = {
      type: 'state_update',
      timestamp: Date.now(),
      version: ++this.currentVersion,
      clientId: this.clientId,
      data: {
        type: 'dialogue_outcome',
        npcId,
        outcomes,
        source: 'mini-game'
      }
    };

    this.sendMessage(payload);
  }

  public syncMissionProgress(missionId: string, progress: any): void {
    this.queueStateChange('missions', `progress_${missionId}`, null, progress);
  }

  public syncVictoryRewards(rewards: {
    credits: number;
    shipRepairs: {
      hull: number;
      shields: number;
      fuel: number;
    };
    items: Array<{ id: string; quantity: number }>;
  }): void {
    console.log('[MiniGameSync] Syncing victory rewards to other clients:', rewards);
    
    const payload: SyncPayload = {
      type: 'state_update',
      timestamp: Date.now(),
      version: ++this.currentVersion,
      clientId: this.clientId,
      data: {
        type: 'victory_rewards',
        rewards,
        source: 'mini-game'
      }
    };

    this.sendMessage(payload);
    
    // Note: Local rewards are already applied by SyncIntegration before calling this
    // No need to notify listeners here - they're notified by the local application
    // Remote clients will be notified when they receive and apply the rewards
  }

  // Offline storage methods
  private async saveOfflineState(): Promise<void> {
    try {
      const playerState = usePlayer.getState();
      const state: OfflineGameState = {
        timestamp: Date.now(),
        version: this.currentVersion,
        player: {
          level: playerState.level,
          experience: playerState.experience,
          reputation: playerState.reputation, // This is already the correct object type
          notoriety: playerState.notoriety,
          heat: playerState.heat,
          rank: playerState.rankTitle // Use rankTitle (string) instead of rank (number)
        },
        economy: {
          credits: useCreditsStore.getState().credits,
          inventory: useInventoryStore.getState().items
        },
        missions: {
          active: usePlunderverseMissions.getState().activeMissions,
          completed: Array.from(usePlunderverseMissions.getState().completedMissionIds),
          progress: {}
        },
        crew: {
          members: useCrewManagement.getState().activeCrew,
          tasks: {}
        },
        miniGame: {
          position: { x: 0, y: 0 },
          currentStation: 'main',
          npcInteractions: {},
          smugglingMissions: [],
          unlockedAreas: []
        }
      };

      await this.offlineStorage.saveGameState(state);
      console.log('[MiniGameSync] Game state saved to offline storage');
    } catch (error) {
      console.error('[MiniGameSync] Failed to save offline state:', error);
    }
  }

  private async loadOfflineState(): Promise<void> {
    try {
      const state = await this.offlineStorage.loadGameState();
      
      if (!state) {
        console.log('[MiniGameSync] No offline state found');
        return;
      }

      console.log('[MiniGameSync] Loading offline state from', new Date(state.timestamp).toLocaleString());

      // Apply offline state to stores
      const playerStore = usePlayer.getState();
      usePlayer.setState({
        level: state.player.level,
        experience: state.player.experience,
        reputation: state.player.reputation, // This is already the correct object type
        notoriety: state.player.notoriety,
        heat: state.player.heat,
        rankTitle: state.player.rank // rank in saved state is actually rankTitle (string)
      });

      useCreditsStore.setState({ credits: state.economy.credits });
      useInventoryStore.setState({ items: state.economy.inventory });
      
      usePlunderverseMissions.setState({
        activeMissions: state.missions.active,
        completedMissionIds: new Set(state.missions.completed)
      });

      useCrewManagement.setState({ activeCrew: state.crew.members });

      this.currentVersion = state.version;
      
      toast.info('Loaded offline game state');
    } catch (error) {
      console.error('[MiniGameSync] Failed to load offline state:', error);
    }
  }

  private startAutoSave(): void {
    // Auto-save every 30 seconds
    this.autoSaveInterval = setInterval(() => {
      if (this.isMinigameActive) {
        this.saveOfflineState();
      }
    }, 30000);
  }

  private stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }


  // Check if offline mode
  public isOffline(): boolean {
    return this.syncStatus === 'offline' || !navigator.onLine;
  }

  // Get offline storage status
  public getOfflineStatus(): {
    online: boolean;
    syncing: boolean;
    lastSync: number;
    queueSize: number;
  } {
    const storageStatus = this.offlineStorage.getSyncStatus();
    
    return {
      online: !this.isOffline(),
      syncing: this.syncStatus === 'syncing',
      lastSync: storageStatus.lastSync,
      queueSize: this.offlineQueue.length
    };
  }

  // Force offline sync
  public async forceOfflineSync(): Promise<void> {
    if (!this.isOffline()) {
      this.forceSync();
      return;
    }

    // Save current state
    await this.saveOfflineState();
    
    // Try to trigger background sync
    await this.offlineStorage.triggerBackgroundSync();
  }

  // Override destroy to clean up auto-save
  public destroy(): void {
    this.stopAutoSave();
    
    // Cleanup sync connection
    this.cleanupSync();

    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];

    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    this.syncListeners.clear();
    
    // Save final state before destroying
    this.saveOfflineState();
  }
}

export default MiniGameSyncService;