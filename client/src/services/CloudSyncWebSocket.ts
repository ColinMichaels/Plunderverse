// WebSocket-based Cloud Sync Manager for real-time sync
// This handles the WebSocket connection and message routing

export type SyncMessageType = 
  | 'state_update'
  | 'state_delta'
  | 'state_request'
  | 'state_ack'
  | 'state_conflict'
  | 'heartbeat'
  | 'sync_complete'
  | 'transaction'
  | 'transaction_result';

export interface SyncPayload {
  type: SyncMessageType;
  timestamp: number;
  version: number;
  clientId?: string;
  data: any;
  checksum?: string;
  transaction?: any;
  actionId?: string;
}

export class CloudSyncManager {
  private static instance: CloudSyncManager | null = null;
  
  // WebSocket connection
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelay = 2000;
  
  // Connection state
  private connected = false;
  private authenticated = false;
  private clientId: string = '';
  private userId: string = '';
  private deviceId: string = '';
  
  // Sync version tracking
  private localVersion = 0;
  private serverVersion = 0;
  
  // Message handlers
  private messageHandlers: Set<(data: any) => void> = new Set();
  
  // Queue for messages while reconnecting
  private messageQueue: SyncPayload[] = [];
  private reconnectTimeout: NodeJS.Timeout | null = null;
  
  private constructor() {
    this.deviceId = this.generateDeviceId();
    console.log('[CloudSyncManager] Initialized with device ID:', this.deviceId);
  }
  
  static getInstance(): CloudSyncManager {
    if (!CloudSyncManager.instance) {
      CloudSyncManager.instance = new CloudSyncManager();
      console.log('[CloudSyncWebSocket] Instance created with token support');
    }
    return CloudSyncManager.instance;
  }
  
  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    if (this.ws && this.connected) {
      console.log('[CloudSyncManager] Already connected');
      return;
    }
    
    const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
    if (!token) {
      console.log('[CloudSyncManager] No auth token, skipping connection');
      this.authenticated = false;
      return;
    }
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    
    // In development, use port 5000. In production, don't specify port (uses default for protocol)
    let wsUrl;
    if (import.meta.env.DEV) {
      wsUrl = `${protocol}//${host}:5000/ws/sync?deviceId=${this.deviceId}&token=${encodeURIComponent(token)}`;
    } else {
      wsUrl = `${protocol}//${host}/ws/sync?deviceId=${this.deviceId}&token=${encodeURIComponent(token)}`;
    }
    
    console.log('[CloudSyncManager] Connecting to:', wsUrl.replace(/token=[^&]+/, 'token=***')); // Mask token in logs
    
    try {
      this.ws = new WebSocket(wsUrl);
      this.setupEventHandlers();
    } catch (error) {
      console.error('[CloudSyncManager] Failed to create WebSocket:', error);
      this.scheduleReconnect();
    }
  }
  
  private setupEventHandlers(): void {
    if (!this.ws) return;
    
    this.ws.onopen = () => {
      console.log('[CloudSyncManager] WebSocket connected');
      this.connected = true;
      this.reconnectAttempts = 0;
      
      // Authenticate
      this.authenticate();
      
      // Process queued messages
      this.flushMessageQueue();
    };
    
    this.ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as SyncPayload;
        this.handleMessage(payload);
      } catch (error) {
        console.error('[CloudSyncManager] Failed to parse message:', error);
      }
    };
    
    this.ws.onerror = (error) => {
      console.error('[CloudSyncManager] WebSocket error:', error);
    };
    
    this.ws.onclose = () => {
      console.log('[CloudSyncManager] WebSocket disconnected');
      this.connected = false;
      this.authenticated = false;
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      }
    };
  }
  
  private authenticate(): void {
    // Authentication is now handled via the WebSocket URL token parameter
    // This method is just for setting the authenticated state after connection
    const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
    if (!token) {
      console.log('[CloudSyncManager] No auth token');
      return;
    }
    
    // Mark as authenticated and extract user ID
    this.authenticated = true;
    this.userId = this.getUserIdFromToken(token);
    console.log('[CloudSyncManager] Authenticated as user:', this.userId);
    
    // Request initial state sync
    this.sendMessage({
      type: 'state_request',
      timestamp: Date.now(),
      version: this.localVersion,
      data: {
        deviceId: this.deviceId,
        stores: []  // Request all stores
      }
    });
  }
  
  private handleMessage(payload: SyncPayload): void {
    console.log(`[CloudSyncManager] Received ${payload.type}`);
    
    // Update version tracking
    if (payload.version) {
      this.serverVersion = payload.version;
    }
    
    // Notify all handlers
    this.messageHandlers.forEach(handler => {
      try {
        handler(payload);
      } catch (error) {
        console.error('[CloudSyncManager] Handler error:', error);
      }
    });
    
    // Handle specific message types
    switch (payload.type) {
      case 'state_update':
        this.handleStateUpdate(payload);
        break;
      case 'transaction_result':
        // Transaction results are handled by registered handlers
        break;
      case 'sync_complete':
        console.log('[CloudSyncManager] Sync completed');
        break;
    }
  }
  
  private handleStateUpdate(payload: SyncPayload): void {
    if (!payload.data) return;
    
    // Update local stores with server state
    const data = payload.data;
    
    // Update credits if present
    if (data.credits !== undefined) {
      import('../domain/economy/credits.store').then(({ useCreditsStore }) => {
        useCreditsStore.getState().setAmount(data.credits);
        console.log(`[CloudSyncManager] Credits updated to ${data.credits}`);
      });
    }
    
    // Update fuel if present (fuel system not yet implemented)
    if (data.fuel !== undefined) {
      console.log(`[CloudSyncManager] Fuel update received: ${data.fuel} (fuel store not yet implemented)`);
      // TODO: Add fuel store when implemented
    }
    
    // Update inventory if present (inventory system not yet implemented)
    if (data.inventory) {
      console.log(`[CloudSyncManager] Inventory update received (inventory store not yet implemented)`);
      // TODO: Add inventory store when implemented
    }
    
    // Update location if present (player store not yet implemented)
    if (data.location) {
      console.log(`[CloudSyncManager] Location update received: ${data.location} (player store not yet implemented)`);
      // TODO: Add player store when implemented
    }
    
    // Update ship stats if present (ship store not yet implemented)
    if (data.shipHull !== undefined || data.shipShield !== undefined) {
      console.log('[CloudSyncManager] Ship stats update received (ship store not yet implemented)');
      // TODO: Add ship store when implemented
    }
  }
  
  /**
   * Send a message through WebSocket
   */
  sendMessage(message: SyncPayload): void {
    if (!this.ws || !this.connected) {
      console.log('[CloudSyncManager] Queueing message (not connected)');
      this.messageQueue.push(message);
      
      // Try to reconnect
      if (!this.reconnectTimeout) {
        this.connect();
      }
      return;
    }
    
    try {
      this.ws.send(JSON.stringify(message));
      this.localVersion++;
    } catch (error) {
      console.error('[CloudSyncManager] Failed to send message:', error);
      this.messageQueue.push(message);
    }
  }
  
  /**
   * Add a message handler
   */
  addMessageHandler(handler: (data: any) => void): void {
    this.messageHandlers.add(handler);
    console.log('[CloudSyncManager] Added message handler');
  }
  
  /**
   * Remove a message handler
   */
  removeMessageHandler(handler: (data: any) => void): void {
    this.messageHandlers.delete(handler);
    console.log('[CloudSyncManager] Removed message handler');
  }
  
  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return this.authenticated;
  }
  
  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }
  
  private flushMessageQueue(): void {
    if (!this.connected || this.messageQueue.length === 0) return;
    
    console.log(`[CloudSyncManager] Flushing ${this.messageQueue.length} queued messages`);
    const queue = [...this.messageQueue];
    this.messageQueue = [];
    
    for (const message of queue) {
      this.sendMessage(message);
    }
  }
  
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) return;
    
    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * this.reconnectAttempts, 30000);
    
    console.log(`[CloudSyncManager] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, delay);
  }
  
  private generateDeviceId(): string {
    const stored = localStorage.getItem('deviceId');
    if (stored) return stored;
    
    const id = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('deviceId', id);
    return id;
  }
  
  private getUserIdFromToken(token: string): string {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.userId || payload.sub || 'unknown';
    } catch {
      return 'unknown';
    }
  }
  
  /**
   * Initialize and connect
   */
  async initialize(): Promise<void> {
    await this.connect();
  }
  
  /**
   * Reconnect with new token (call after token refresh)
   */
  async reconnectWithNewToken(): Promise<void> {
    console.log('[CloudSyncManager] Reconnecting with new token...');
    
    // Disconnect current connection
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.connected = false;
    this.authenticated = false;
    
    // Reset reconnect attempts
    this.reconnectAttempts = 0;
    
    // Connect with new token
    await this.connect();
  }
  
  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.connected = false;
    this.authenticated = false;
    this.messageHandlers.clear();
    this.messageQueue = [];
    
    console.log('[CloudSyncManager] Disconnected and cleaned up');
  }
}