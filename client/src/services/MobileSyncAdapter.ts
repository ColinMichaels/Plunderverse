// Mobile Sync Adapter
// Bridges mobile mini-game operations with the server-authoritative transaction system

import { TransactionClient } from './TransactionClient';
import { CloudSyncManager } from './CloudSyncWebSocket';
import { toast } from 'sonner';

export interface MobileTransactionRequest {
  type: 'trade' | 'repair' | 'upgrade' | 'crew' | 'mission' | 'station';
  operation: 'buy' | 'sell' | 'hire' | 'complete' | 'service';
  itemId?: string;
  itemName?: string;
  quantity?: number;
  price?: number;
  metadata?: Record<string, any>;
}

export class MobileSyncAdapter {
  private static instance: MobileSyncAdapter | null = null;
  private transactionClient: TransactionClient;
  private syncManager: CloudSyncManager;
  private isMinigameActive: boolean = false;
  
  private constructor() {
    this.transactionClient = TransactionClient.getInstance();
    this.syncManager = CloudSyncManager.getInstance();
    console.log('[MobileSyncAdapter] Initialized');
  }
  
  static getInstance(): MobileSyncAdapter {
    if (!MobileSyncAdapter.instance) {
      MobileSyncAdapter.instance = new MobileSyncAdapter();
    }
    return MobileSyncAdapter.instance;
  }
  
  /**
   * Set whether the mini-game is active
   */
  setMinigameActive(active: boolean): void {
    this.isMinigameActive = active;
    console.log(`[MobileSyncAdapter] Mini-game ${active ? 'activated' : 'deactivated'}`);
    
    if (active && !this.syncManager.isConnected()) {
      // Ensure WebSocket is connected
      this.syncManager.initialize().catch(err => {
        console.error('[MobileSyncAdapter] Failed to initialize sync:', err);
      });
    }
  }
  
  /**
   * Process a trade transaction (buy/sell items)
   */
  async processTrade(
    operation: 'buy' | 'sell',
    itemId: string,
    itemName: string,
    quantity: number,
    pricePerUnit: number,
    station?: string
  ): Promise<boolean> {
    const totalAmount = pricePerUnit * quantity;
    
    try {
      let result;
      if (operation === 'buy') {
        result = await this.transactionClient.purchase(itemId, totalAmount, quantity);
      } else {
        result = await this.transactionClient.sell(itemId, totalAmount, quantity);
      }
      
      if (result.success) {
        toast.success(
          `${operation === 'buy' ? 'Purchase' : 'Sale'} successful`,
          {
            description: `${operation === 'buy' ? 'Bought' : 'Sold'} ${quantity}x ${itemName} for ${totalAmount}c`
          }
        );
        
        console.log(`[MobileSyncAdapter] Trade successful: ${result.transactionId}`);
        return true;
      } else {
        toast.error(`Transaction failed: ${result.error || 'Unknown error'}`);
        return false;
      }
    } catch (error) {
      console.error('[MobileSyncAdapter] Trade failed:', error);
      toast.error('Transaction error', {
        description: error instanceof Error ? error.message : 'Connection failed'
      });
      return false;
    }
  }
  
  /**
   * Process a repair transaction
   */
  async processRepair(systems: string[], cost: number): Promise<boolean> {
    try {
      const result = await this.transactionClient.repair(systems, cost);
      
      if (result.success) {
        toast.success('Repairs completed', {
          description: `Repaired ${systems.join(', ')} for ${cost}c`
        });
        console.log(`[MobileSyncAdapter] Repair successful: ${result.transactionId}`);
        return true;
      } else {
        toast.error(`Repair failed: ${result.error || 'Unknown error'}`);
        return false;
      }
    } catch (error) {
      console.error('[MobileSyncAdapter] Repair failed:', error);
      toast.error('Repair error', {
        description: error instanceof Error ? error.message : 'Connection failed'
      });
      return false;
    }
  }
  
  /**
   * Process a crew hiring transaction
   */
  async hireCrew(
    crewId: string,
    crewName: string,
    hiringCost: number
  ): Promise<boolean> {
    try {
      const result = await this.transactionClient.executeTransaction({
        type: 'debit',
        category: 'crew',
        subtype: 'hire',
        amount: hiringCost,
        metadata: {
          crewId,
          crewName,
          reason: `Hired crew member: ${crewName}`
        }
      });
      
      if (result.success) {
        toast.success('Crew hired', {
          description: `Hired ${crewName} for ${hiringCost}c`
        });
        console.log(`[MobileSyncAdapter] Crew hire successful: ${result.transactionId}`);
        return true;
      } else {
        toast.error(`Hiring failed: ${result.error || 'Unknown error'}`);
        return false;
      }
    } catch (error) {
      console.error('[MobileSyncAdapter] Crew hire failed:', error);
      toast.error('Hiring error', {
        description: error instanceof Error ? error.message : 'Connection failed'
      });
      return false;
    }
  }
  
  /**
   * Process a mission completion reward
   */
  async completeMission(
    missionId: string,
    missionName: string,
    creditReward: number,
    items?: any[]
  ): Promise<boolean> {
    try {
      const result = await this.transactionClient.missionReward(
        missionId,
        creditReward,
        items
      );
      
      if (result.success) {
        toast.success('Mission complete!', {
          description: `Earned ${creditReward}c from ${missionName}`
        });
        console.log(`[MobileSyncAdapter] Mission reward successful: ${result.transactionId}`);
        return true;
      } else {
        toast.error(`Reward failed: ${result.error || 'Unknown error'}`);
        return false;
      }
    } catch (error) {
      console.error('[MobileSyncAdapter] Mission reward failed:', error);
      toast.error('Reward error', {
        description: error instanceof Error ? error.message : 'Connection failed'
      });
      return false;
    }
  }
  
  /**
   * Process a station service payment
   */
  async payStationService(
    service: string,
    cost: number,
    station: string
  ): Promise<boolean> {
    try {
      const result = await this.transactionClient.executeTransaction({
        type: 'debit',
        category: 'station',
        subtype: 'service',
        amount: cost,
        metadata: {
          service,
          station,
          reason: `Station service: ${service} at ${station}`
        }
      });
      
      if (result.success) {
        toast.success('Service completed', {
          description: `Paid ${cost}c for ${service}`
        });
        console.log(`[MobileSyncAdapter] Station service successful: ${result.transactionId}`);
        return true;
      } else {
        toast.error(`Service failed: ${result.error || 'Unknown error'}`);
        return false;
      }
    } catch (error) {
      console.error('[MobileSyncAdapter] Station service failed:', error);
      toast.error('Service error', {
        description: error instanceof Error ? error.message : 'Connection failed'
      });
      return false;
    }
  }
  
  /**
   * Get connection status
   */
  getConnectionStatus(): {
    connected: boolean;
    authenticated: boolean;
    isOnline: boolean;
  } {
    return {
      connected: this.syncManager.isConnected(),
      authenticated: this.syncManager.isAuthenticated(),
      isOnline: navigator.onLine
    };
  }
  
  /**
   * Force reconnection attempt
   */
  async reconnect(): Promise<void> {
    if (!this.syncManager.isConnected()) {
      await this.syncManager.initialize();
    }
  }
}