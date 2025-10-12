// Client-side Transaction Service
// Routes all economic transactions through WebSocket to server-authoritative TransactionManager

import { CloudSyncManager } from './CloudSyncWebSocket';

export interface TransactionRequest {
  type: 'debit' | 'credit';
  category: string;
  subtype?: string;
  amount: number;
  metadata?: {
    itemId?: string;
    quantity?: number;
    source?: string;
    destination?: string;
    reason?: string;
    durability?: number;
    systems?: string[];
    [key: string]: any;
  };
  resourceCosts?: {
    fuel?: number;
    oxygen?: number;
    materials?: { [type: string]: number };
  };
}

export interface TransactionResponse {
  success: boolean;
  error?: string;
  transactionId?: string;
  newBalances?: {
    credits: number;
    fuel: number;
    oxygen: number;
    materials?: { [type: string]: number };
    inventory?: any[];
    location?: string;
    shipHull?: number;
    shipShield?: number;
  };
  sideEffects?: any[];
}

// Pending transaction tracking
interface PendingTransaction {
  request: TransactionRequest;
  resolve: (response: TransactionResponse) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

export class TransactionClient {
  private static instance: TransactionClient | null = null;
  private syncManager: CloudSyncManager | null = null;
  private pendingTransactions: Map<string, PendingTransaction> = new Map();
  private messageHandler: ((data: any) => void) | null = null;
  
  private constructor() {
    console.log('[TransactionClient] Initializing...');
    this.setupMessageHandler();
  }
  
  static getInstance(): TransactionClient {
    if (!TransactionClient.instance) {
      TransactionClient.instance = new TransactionClient();
    }
    return TransactionClient.instance;
  }
  
  private setupMessageHandler(): void {
    // Listen for transaction results from server
    this.messageHandler = (data: any) => {
      if (data.type === 'transaction_result' && data.data?.actionId) {
        const pending = this.pendingTransactions.get(data.data.actionId);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingTransactions.delete(data.data.actionId);
          
          if (data.data.success) {
            pending.resolve({
              success: true,
              transactionId: data.data.transactionId,
              newBalances: data.data.newBalances,
              sideEffects: data.data.sideEffects
            });
          } else {
            pending.resolve({
              success: false,
              error: data.data.error || 'Transaction failed'
            });
          }
        }
      }
    };
  }
  
  /**
   * Execute a transaction through the server
   */
  async executeTransaction(request: TransactionRequest): Promise<TransactionResponse> {
    const syncManager = CloudSyncManager.getInstance();
    
    if (!syncManager.isAuthenticated()) {
      console.log('[TransactionClient] Not authenticated, executing locally');
      // Fallback to local-only mode (for dev/testing)
      return this.executeLocalTransaction(request);
    }
    
    return new Promise((resolve, reject) => {
      const actionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Set timeout for transaction
      const timeout = setTimeout(() => {
        this.pendingTransactions.delete(actionId);
        reject(new Error('Transaction timeout'));
      }, 10000); // 10 second timeout
      
      // Store pending transaction
      this.pendingTransactions.set(actionId, {
        request,
        resolve,
        reject,
        timeout
      });
      
      // Register message handler with sync manager if not already done
      if (this.messageHandler && !this.syncManager) {
        this.syncManager = syncManager;
        syncManager.addMessageHandler(this.messageHandler);
      }
      
      // Send transaction through WebSocket
      const message = {
        type: 'transaction' as const,
        timestamp: Date.now(),
        version: 1,
        actionId,
        transaction: request,
        data: request // Fallback for compatibility
      };
      
      console.log(`[TransactionClient] Sending transaction: ${request.category}/${request.subtype} amount=${request.amount}`);
      syncManager.sendMessage(message);
    });
  }
  
  /**
   * Helper method: Process a purchase
   */
  async purchase(itemId: string, price: number, quantity: number = 1): Promise<TransactionResponse> {
    return this.executeTransaction({
      type: 'debit',
      category: 'item',
      subtype: 'purchase',
      amount: price,
      metadata: {
        itemId,
        quantity,
        reason: `Purchased ${quantity}x ${itemId}`
      }
    });
  }
  
  /**
   * Helper method: Process a sale
   */
  async sell(itemId: string, price: number, quantity: number = 1): Promise<TransactionResponse> {
    return this.executeTransaction({
      type: 'credit',
      category: 'item',
      subtype: 'sale',
      amount: price,
      metadata: {
        itemId,
        quantity,
        reason: `Sold ${quantity}x ${itemId}`
      }
    });
  }
  
  /**
   * Helper method: Process fast travel
   */
  async fastTravel(destination: string, cost: number, fuelCost: number = 0): Promise<TransactionResponse> {
    return this.executeTransaction({
      type: 'debit',
      category: 'fast_travel',
      amount: cost,
      metadata: {
        destination,
        reason: `Fast travel to ${destination}`
      },
      resourceCosts: fuelCost > 0 ? { fuel: fuelCost } : undefined
    });
  }
  
  /**
   * Helper method: Process repairs
   */
  async repair(systems: string[], cost: number): Promise<TransactionResponse> {
    return this.executeTransaction({
      type: 'debit',
      category: 'repair',
      amount: cost,
      metadata: {
        systems,
        reason: `Repaired ${systems.join(', ')}`
      }
    });
  }
  
  /**
   * Helper method: Mission rewards
   */
  async missionReward(missionId: string, credits: number, items?: any[]): Promise<TransactionResponse> {
    return this.executeTransaction({
      type: 'credit',
      category: 'mission',
      subtype: 'reward',
      amount: credits,
      metadata: {
        missionId,
        items,
        reason: `Mission completed: ${missionId}`
      }
    });
  }
  
  /**
   * Helper method: Mining income
   */
  async miningIncome(resource: string, amount: number, value: number): Promise<TransactionResponse> {
    return this.executeTransaction({
      type: 'credit',
      category: 'mining',
      amount: value,
      metadata: {
        resource,
        quantity: amount,
        reason: `Mined ${amount} units of ${resource}`
      }
    });
  }
  
  /**
   * Local fallback for dev/testing
   */
  private async executeLocalTransaction(request: TransactionRequest): Promise<TransactionResponse> {
    // For local-only mode, always succeed (this allows dev without backend)
    console.warn('[TransactionClient] Running in local-only mode');
    
    // Get current balances from stores
    const creditsStore = await import('../domain/economy/credits.store');
    
    const currentCredits = creditsStore.useCreditsStore.getState().amount;
    const currentFuel = 100; // TODO: Add fuel store when implemented
    
    // Simple validation
    if (request.type === 'debit') {
      if (request.amount > currentCredits) {
        return { success: false, error: 'Insufficient credits (local mode)' };
      }
      if (request.resourceCosts?.fuel && request.resourceCosts.fuel > currentFuel) {
        return { success: false, error: 'Insufficient fuel (local mode)' };
      }
    }
    
    // Apply changes locally
    if (request.type === 'debit') {
      creditsStore.useCreditsStore.getState().spendCredits(request.amount);
      if (request.resourceCosts?.fuel) {
        // TODO: Deduct fuel when fuel store is implemented
        console.log(`[TransactionClient] Would deduct ${request.resourceCosts.fuel} fuel (not yet implemented)`);
      }
    } else {
      creditsStore.useCreditsStore.getState().earnCredits(request.amount);
      if (request.resourceCosts?.fuel) {
        // TODO: Add fuel when fuel store is implemented
        console.log(`[TransactionClient] Would add ${request.resourceCosts.fuel} fuel (not yet implemented)`);
      }
    }
    
    return {
      success: true,
      transactionId: `local_${Date.now()}`,
      newBalances: {
        credits: creditsStore.useCreditsStore.getState().amount,
        fuel: currentFuel, // Use the mock value for now
        oxygen: 100,
        shipHull: 100,
        shipShield: 100
      }
    };
  }
  
  /**
   * Clean up resources
   */
  dispose(): void {
    // Clear all pending transactions
    for (const [id, pending] of Array.from(this.pendingTransactions)) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('TransactionClient disposed'));
    }
    this.pendingTransactions.clear();
    
    // Remove message handler
    if (this.syncManager && this.messageHandler) {
      this.syncManager.removeMessageHandler(this.messageHandler);
    }
    
    TransactionClient.instance = null;
  }
}