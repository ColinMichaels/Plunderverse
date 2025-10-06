import { WebSocketServer, WebSocket } from 'ws';
import { Server as HTTPServer } from 'http';

// Sync message types matching client
export type SyncMessageType = 
  | 'state_update'
  | 'state_delta'
  | 'state_request'
  | 'state_ack'
  | 'state_conflict'
  | 'heartbeat'
  | 'sync_complete';

// Sync payload structure
export interface SyncPayload {
  type: SyncMessageType;
  timestamp: number;
  version: number;
  clientId?: string;
  data: any;
  checksum?: string;
}

// Client connection
export interface SyncClient {
  id: string;
  ws: WebSocket;
  clientId: string;
  userId?: string;
  lastActivity: number;
  version: number;
  pendingAcks: Set<string>;
}

// State version tracker
export interface StateVersion {
  version: number;
  timestamp: number;
  checksum: string;
}

// Conflict resolution strategy
export type ConflictStrategy = 'last-write-wins' | 'merge' | 'server-authority' | 'custom';

class SyncService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, SyncClient> = new Map();
  private stateVersions: Map<string, StateVersion> = new Map();
  private globalVersion: number = 0;
  private heartbeatInterval: NodeJS.Timer | null = null;
  
  // Store latest game states per user for sync
  private gameStates: Map<string, any> = new Map();
  
  constructor() {
    console.log('[SyncService] Initialized');
  }

  public setupWebSocketServer(server: HTTPServer): void {
    this.wss = new WebSocketServer({
      server,
      path: '/ws/sync',
      verifyClient: this.verifyClient.bind(this)
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    
    // Start heartbeat monitoring
    this.startHeartbeatMonitor();
    
    console.log('[SyncService] WebSocket server setup complete on /ws/sync');
  }

  private verifyClient(info: any, callback: (result: boolean) => void): void {
    // In production, verify authentication here
    // For now, allow all connections
    callback(true);
  }

  private handleConnection(ws: WebSocket, request: any): void {
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const syncClient: SyncClient = {
      id: clientId,
      ws,
      clientId: '',
      lastActivity: Date.now(),
      version: this.globalVersion,
      pendingAcks: new Set()
    };

    this.clients.set(clientId, syncClient);
    
    console.log(`[SyncService] Client connected: ${clientId}`);

    ws.on('message', (data) => this.handleMessage(clientId, data));
    ws.on('close', () => this.handleDisconnection(clientId));
    ws.on('error', (error) => this.handleError(clientId, error));
    
    // Send initial connection acknowledgment
    this.sendToClient(clientId, {
      type: 'state_ack',
      timestamp: Date.now(),
      version: this.globalVersion,
      data: {
        clientId,
        connected: true
      }
    });
  }

  private handleMessage(clientId: string, data: WebSocket.RawData): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.lastActivity = Date.now();

    try {
      const payload: SyncPayload = JSON.parse(data.toString());
      
      // Store the client's clientId from their message
      if (payload.clientId && !client.clientId) {
        client.clientId = payload.clientId;
      }

      console.log(`[SyncService] Received ${payload.type} from ${clientId}`);

      switch (payload.type) {
        case 'state_update':
          this.handleStateUpdate(clientId, payload);
          break;
        case 'state_delta':
          this.handleStateDelta(clientId, payload);
          break;
        case 'state_request':
          this.handleStateRequest(clientId, payload);
          break;
        case 'heartbeat':
          this.handleHeartbeat(clientId);
          break;
      }
    } catch (error) {
      console.error(`[SyncService] Failed to parse message from ${clientId}:`, error);
    }
  }

  private handleStateUpdate(clientId: string, payload: SyncPayload): void {
    const client = this.clients.get(clientId);
    if (!client || !client.userId) {
      // Store update temporarily if user not authenticated
      this.pendingAuthUpdate(clientId, payload);
      return;
    }

    // Update stored game state
    const currentState = this.gameStates.get(client.userId) || {};
    
    if (payload.data.type === 'smuggling_mission') {
      // Handle smuggling mission outcome
      this.processSmugglingMissionUpdate(client.userId, payload.data);
    } else if (payload.data.type === 'dialogue_outcome') {
      // Handle dialogue outcome
      this.processDialogueOutcome(client.userId, payload.data);
    } else {
      // Generic state update
      Object.assign(currentState, payload.data);
    }
    
    this.gameStates.set(client.userId, currentState);
    
    // Update version
    this.globalVersion++;
    client.version = this.globalVersion;
    
    // Broadcast to other clients of the same user (multi-device sync)
    this.broadcastToUserClients(client.userId, payload, clientId);
    
    // Send acknowledgment
    this.sendToClient(clientId, {
      type: 'state_ack',
      timestamp: Date.now(),
      version: this.globalVersion,
      data: {
        ackId: payload.timestamp
      }
    });
  }

  private handleStateDelta(clientId: string, payload: SyncPayload): void {
    const client = this.clients.get(clientId);
    if (!client || !client.userId) {
      this.pendingAuthUpdate(clientId, payload);
      return;
    }

    const currentState = this.gameStates.get(client.userId) || {};
    
    // Apply deltas
    if (payload.data.deltas) {
      for (const delta of payload.data.deltas) {
        this.applyDelta(currentState, delta);
      }
    }
    
    this.gameStates.set(client.userId, currentState);
    
    // Update version
    this.globalVersion++;
    client.version = this.globalVersion;
    
    // Check for conflicts
    if (payload.version < this.globalVersion - 10) {
      // Version is too far behind, might have conflicts
      this.resolveConflict(clientId, payload, currentState);
    } else {
      // No conflict, broadcast changes
      this.broadcastToUserClients(client.userId, payload, clientId);
      
      // Send acknowledgment
      this.sendToClient(clientId, {
        type: 'state_ack',
        timestamp: Date.now(),
        version: this.globalVersion,
        data: {
          ackId: payload.timestamp
        }
      });
    }
  }

  private handleStateRequest(clientId: string, payload: SyncPayload): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const requestedStores = payload.data.stores || [];
    const userId = client.userId || 'anonymous';
    const currentState = this.gameStates.get(userId) || this.getDefaultState();
    
    // Filter requested stores
    const responseData: any = {};
    if (requestedStores.length > 0) {
      for (const store of requestedStores) {
        if (currentState[store]) {
          responseData[store] = currentState[store];
        }
      }
    } else {
      // Send all stores
      Object.assign(responseData, currentState);
    }
    
    // Send state update
    this.sendToClient(clientId, {
      type: 'state_update',
      timestamp: Date.now(),
      version: this.globalVersion,
      data: {
        stores: responseData,
        source: 'server'
      }
    });
    
    // Mark sync as complete
    this.sendToClient(clientId, {
      type: 'sync_complete',
      timestamp: Date.now(),
      version: this.globalVersion,
      data: {}
    });
  }

  private handleHeartbeat(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.lastActivity = Date.now();
    }
  }

  private applyDelta(state: any, delta: any): void {
    const { store, changes } = delta;
    
    if (!state[store]) {
      state[store] = {};
    }
    
    // Apply changes with merge strategy
    for (const [key, value] of Object.entries(changes)) {
      if (Array.isArray(state[store][key]) && Array.isArray(value)) {
        // Merge arrays (avoid duplicates)
        const merged = new Set([...state[store][key], ...value]);
        state[store][key] = Array.from(merged);
      } else if (typeof state[store][key] === 'object' && typeof value === 'object' && !Array.isArray(value)) {
        // Deep merge objects
        state[store][key] = { ...state[store][key], ...value };
      } else {
        // Simple replacement
        state[store][key] = value;
      }
    }
  }

  private resolveConflict(clientId: string, payload: SyncPayload, serverState: any): void {
    const strategy: ConflictStrategy = this.determineConflictStrategy(payload.data);
    
    let resolvedState = serverState;
    
    switch (strategy) {
      case 'last-write-wins':
        // Server state wins (already the current state)
        break;
        
      case 'merge':
        // Attempt to merge client changes with server state
        if (payload.data.deltas) {
          for (const delta of payload.data.deltas) {
            this.applyDelta(resolvedState, delta);
          }
        }
        break;
        
      case 'server-authority':
        // Server always wins, no changes
        break;
        
      case 'custom':
        // Custom resolution based on data type
        resolvedState = this.customConflictResolution(payload.data, serverState);
        break;
    }
    
    // Send conflict resolution to client
    this.sendToClient(clientId, {
      type: 'state_conflict',
      timestamp: Date.now(),
      version: this.globalVersion,
      data: {
        strategy,
        resolvedState,
        serverState,
        localState: payload.data
      }
    });
  }

  private determineConflictStrategy(data: any): ConflictStrategy {
    // Determine strategy based on data type
    if (data.type === 'credits' || data.type === 'currency') {
      return 'server-authority'; // Critical values
    } else if (data.type === 'inventory' || data.type === 'missions') {
      return 'merge'; // Arrays can be merged
    } else {
      return 'last-write-wins'; // Default strategy
    }
  }

  private customConflictResolution(clientData: any, serverState: any): any {
    // Implement custom resolution logic here
    // For now, return server state
    return serverState;
  }

  private processSmugglingMissionUpdate(userId: string, data: any): void {
    const { mission, outcome } = data;
    const currentState = this.gameStates.get(userId) || {};
    
    if (!currentState.smuggling) {
      currentState.smuggling = {};
    }
    
    // Update smuggling state based on outcome
    switch (outcome) {
      case 'success':
        currentState.credits = (currentState.credits || 0) + mission.baseReward + mission.bonusReward;
        currentState.heat = Math.min((currentState.heat || 0) + mission.heatGenerated, 100);
        break;
        
      case 'failure':
        currentState.heat = Math.min((currentState.heat || 0) + mission.heatGenerated * 2, 100);
        break;
        
      case 'detected':
        currentState.heat = Math.min((currentState.heat || 0) + mission.heatGenerated * 1.5, 100);
        currentState.wantedLevel = Math.min((currentState.wantedLevel || 0) + 1, 5);
        break;
    }
    
    this.gameStates.set(userId, currentState);
  }

  private processDialogueOutcome(userId: string, data: any): void {
    const { npcId, outcomes } = data;
    const currentState = this.gameStates.get(userId) || {};
    
    for (const outcome of outcomes) {
      switch (outcome.type) {
        case 'reputation':
          if (!currentState.reputation) currentState.reputation = {};
          currentState.reputation[outcome.faction] = 
            (currentState.reputation[outcome.faction] || 50) + outcome.value;
          break;
          
        case 'credits':
          currentState.credits = (currentState.credits || 0) + outcome.value;
          break;
          
        case 'item':
          if (!currentState.inventory) currentState.inventory = [];
          currentState.inventory.push(outcome.value);
          break;
          
        case 'heat':
          currentState.heat = Math.min((currentState.heat || 0) + outcome.value, 100);
          break;
      }
    }
    
    this.gameStates.set(userId, currentState);
  }

  private broadcastToUserClients(userId: string, payload: SyncPayload, excludeClientId?: string): void {
    // Find all clients for this user
    for (const [clientId, client] of this.clients) {
      if (client.userId === userId && clientId !== excludeClientId) {
        this.sendToClient(clientId, payload);
      }
    }
  }

  private sendToClient(clientId: string, payload: SyncPayload): void {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) return;

    try {
      client.ws.send(JSON.stringify(payload));
    } catch (error) {
      console.error(`[SyncService] Failed to send message to ${clientId}:`, error);
    }
  }

  private handleDisconnection(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      console.log(`[SyncService] Client disconnected: ${clientId}`);
      this.clients.delete(clientId);
    }
  }

  private handleError(clientId: string, error: Error): void {
    console.error(`[SyncService] Client error for ${clientId}:`, error);
  }

  private pendingAuthUpdate(clientId: string, payload: SyncPayload): void {
    // Store update for when client authenticates
    // In production, implement proper authentication flow
    console.log(`[SyncService] Pending auth update for ${clientId}`);
  }

  private startHeartbeatMonitor(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeout = 60000; // 60 seconds timeout
      
      for (const [clientId, client] of this.clients) {
        if (now - client.lastActivity > timeout) {
          console.log(`[SyncService] Client ${clientId} timed out`);
          client.ws.terminate();
          this.clients.delete(clientId);
        }
      }
    }, 30000); // Check every 30 seconds
  }

  private getDefaultState(): any {
    return {
      player: {
        health: 100,
        rank: 1,
        reputation: {
          corporations: 50,
          independents: 50,
          outlaws: 50
        },
        heat: 0,
        notoriety: 0
      },
      credits: 1000,
      inventory: [],
      missions: {
        active: [],
        completed: []
      },
      crew: [],
      ship: {
        hull: 100,
        shield: 100
      }
    };
  }

  public authenticateClient(clientId: string, userId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.userId = userId;
      console.log(`[SyncService] Client ${clientId} authenticated as user ${userId}`);
    }
  }

  public shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    for (const client of this.clients.values()) {
      client.ws.close();
    }

    this.clients.clear();
    
    if (this.wss) {
      this.wss.close();
    }
  }
}

export const syncService = new SyncService();