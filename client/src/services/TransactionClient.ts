// Client-side Transaction Service
// Routes all economic transactions through WebSocket to server-authoritative TransactionManager

import {CloudSyncManager} from './CloudSyncWebSocket';

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
    timeout: ReturnType<typeof setTimeout>;
}

export class TransactionClient {
  private static instance: TransactionClient | null = null;
  private syncManager: CloudSyncManager | null = null;
  private pendingTransactions: Map<string, PendingTransaction> = new Map();
  private messageHandler: ((data: any) => void) | null = null;
    private registeredWithSync = false;

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
      this.messageHandler = async (raw: any) => {
          try {
              const type = raw?.type;
              if (type !== 'transaction_result') return;
              const payload = raw?.data ?? raw;
              const actionId = payload?.actionId || raw?.actionId || payload?.correlationId;
              if (!actionId) return;

              const pending = this.pendingTransactions.get(actionId);
              if (!pending) return;

              clearTimeout(pending.timeout);
              this.pendingTransactions.delete(actionId);

              const success = (typeof payload.success === 'boolean') ? payload.success : !!raw?.success;
              if (success) {
                  return pending.resolve({
                      success: true,
                      transactionId: payload.transactionId || raw?.transactionId,
                      newBalances: payload.newBalances || raw?.newBalances,
                      sideEffects: payload.sideEffects || raw?.sideEffects,
                  });
              }

              const errMsg = (payload.error || raw?.error || '').toString();
              // If server says not authenticated, fall back to local apply and queue for sync
              if (/not\s*authenticated|unauthorized|401/i.test(errMsg)) {
                  try {
                      if (typeof navigator !== 'undefined' && (navigator as any).serviceWorker?.controller) {
                          (navigator as any).serviceWorker.controller.postMessage({
                              type: 'queue-sync',
                              data: {kind: 'transaction_offline', ts: Date.now(), transaction: pending.request},
                          });
              }
                  } catch {
                  }
                  const local = await this.executeLocalTransaction(pending.request);
                  return pending.resolve(local);
              }

              // Otherwise surface the failure
              return pending.resolve({success: false, error: errMsg || 'Transaction failed'});
          } catch (e) {
              console.warn('[TransactionClient] Message handler error:', e);
          }
      };
  }

    private async ensureSyncManager(): Promise<CloudSyncManager> {
        const sm = CloudSyncManager.getInstance();
        if (!this.registeredWithSync && this.messageHandler) {
            this.syncManager = sm;
            sm.addMessageHandler(this.messageHandler);
            this.registeredWithSync = true;
        }
        // Best-effort wait for connection if the API is available
        try {
            // Prefer an explicit wait API if provided by CloudSyncManager
            if (typeof (sm as any).waitForOpen === 'function') {
                await (sm as any).waitForOpen(5000);
            } else if (typeof (sm as any).isConnected === 'function') {
                const start = Date.now();
                while (!(sm as any).isConnected() && Date.now() - start < 3000) {
                    await new Promise(r => setTimeout(r, 100));
                }
            }
        } catch {
        }
        return sm;
    }

    private validateRequest(req: TransactionRequest): void {
        if (!req || typeof req.amount !== 'number' || !Number.isFinite(req.amount)) {
            throw new Error('Invalid transaction amount');
        }
        if (req.amount < 0) {
            throw new Error('Transaction amount must be >= 0');
        }
        if (!req.category) {
            throw new Error('Transaction category required');
        }
  }

  /**
   * Execute a transaction through the server
   */
  async executeTransaction(request: TransactionRequest): Promise<TransactionResponse> {
      this.validateRequest(request);

    const syncManager = CloudSyncManager.getInstance();

      // Not authenticated → local apply + opportunistic queue to SW
    if (!syncManager.isAuthenticated()) {
        console.warn('[TransactionClient] Not authenticated, executing locally + queuing for sync');
        try {
            // Opportunistic queue into SW for later reconciliation
            if (typeof navigator !== 'undefined' && (navigator as any).serviceWorker?.controller) {
                (navigator as any).serviceWorker.controller.postMessage({
                    type: 'queue-sync',
                    data: {kind: 'transaction_offline', ts: Date.now(), transaction: request},
                });
            }
        } catch {
        }
      return this.executeLocalTransaction(request);
    }

      return new Promise(async (resolve, reject) => {
          // Prefer robust UUIDs when available
          const actionId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
              ? (crypto as any).randomUUID()
              : `txn_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

      const timeout = setTimeout(() => {
        this.pendingTransactions.delete(actionId);
        reject(new Error('Transaction timeout'));
      }, 15000); // 15s to accommodate network jitter

          // Store pending before sending
          this.pendingTransactions.set(actionId, {request, resolve, reject, timeout});

          try {
              const sm = await this.ensureSyncManager();
              const message = {
                  type: 'transaction' as const,
                  timestamp: Date.now(),
                  version: 1,
                  actionId,
                  transaction: request,
                  data: request, // backwards compatibility
              };
              console.log(`[TransactionClient] Sending transaction: ${request.category}/${request.subtype ?? '—'} amount=${request.amount}`);
              (sm as any).sendMessage(message);
          } catch (err) {
              clearTimeout(timeout);
              this.pendingTransactions.delete(actionId);
              reject(err instanceof Error ? err : new Error(String(err)));
          }
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
        subtype: 'jump',
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
        // Local-only fallback: apply state client-side for dev/testing
        // Also see executeTransaction() which attempts to queue an offline sync entry.
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
        this.registeredWithSync = false;
        this.syncManager = null;
    TransactionClient.instance = null;
  }
}
