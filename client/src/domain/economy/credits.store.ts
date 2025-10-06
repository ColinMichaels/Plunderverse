import { create } from "zustand";
import { CreditsState } from './types';
import { economyEvents } from './events';
import {
  validateCreditsConsistency,
  checkpoint,
  assert,
  DEBUG_PREFIXES
} from './debug';
import { TransactionClient } from '../../services/TransactionClient';
import { CloudSyncManager } from '../../services/CloudSyncWebSocket';

interface CreditsActions {
  spendCredits: (amount: number) => boolean;
  earnCredits: (amount: number) => void;
  setCredits: (amount: number) => void;
  
  // NEW: Transaction-based methods
  spend: (amount: number, reason?: string) => Promise<boolean>;
  earn: (amount: number, reason?: string) => Promise<boolean>;
  setAmount: (amount: number) => void;
}

type CreditsStore = CreditsState & CreditsActions & { 
  amount: number; // Alias for credits for TransactionClient compatibility
};

export const useCreditsStore = create<CreditsStore>((set, get) => ({
  credits: 1000,
  
  // Alias for compatibility
  get amount() {
    return get().credits;
  },
  
  spendCredits: (amount) => {
    checkpoint(`Credits spend attempt: ${amount}`, { amount });
    
    const state = get();
    const initialCredits = state.credits;
    
    // Pre-transaction validation
    validateCreditsConsistency(state.credits, 'spendCredits-start');
    
    assert(
      amount >= 0,
      `Attempting to spend negative credits: ${amount}`,
      { amount, currentCredits: state.credits }
    );
    
    assert(
      Number.isFinite(amount),
      `Attempting to spend non-finite credits: ${amount}`,
      { amount, currentCredits: state.credits }
    );
    
    if (state.credits >= amount) {
      const newCredits = state.credits - amount;
      
      console.log(`${DEBUG_PREFIXES.SYNC_CHECK} spendCredits: ${initialCredits} - ${amount} = ${newCredits}`);
      
      set({ credits: newCredits });
      
      // Post-transaction validation
      const finalState = get();
      validateCreditsConsistency(finalState.credits, 'spendCredits-end');
      
      assert(
        finalState.credits === newCredits,
        `Credits state inconsistency after spend: expected ${newCredits}, got ${finalState.credits}`,
        { initialCredits, amount, expectedCredits: newCredits, actualCredits: finalState.credits }
      );
      
      economyEvents.emit({
        type: 'credits_spent',
        payload: { amount },
        timestamp: Date.now()
      });
      
      checkpoint(`Credits spent successfully`, { 
        amount, 
        before: initialCredits, 
        after: finalState.credits,
        diff: finalState.credits - initialCredits
      });
      
      console.log(`${DEBUG_PREFIXES.TRANSACTION} Spent ${amount} credits. ${initialCredits} -> ${finalState.credits}`);
      return true;
    } else {
      const deficit = amount - state.credits;
      console.log(`${DEBUG_PREFIXES.TRANSACTION} Insufficient credits! Need ${amount}, have ${state.credits} (deficit: ${deficit})`);
      
      checkpoint(`Credits spend failed - insufficient funds`, {
        requested: amount,
        available: state.credits,
        deficit
      });
      
      return false;
    }
  },
  
  earnCredits: (amount) => {
    checkpoint(`Credits earn attempt: ${amount}`, { amount });
    
    const state = get();
    const initialCredits = state.credits;
    
    // Pre-transaction validation
    validateCreditsConsistency(state.credits, 'earnCredits-start');
    
    assert(
      amount > 0,
      `Attempting to earn negative or zero credits: ${amount}`,
      { amount, currentCredits: state.credits }
    );
    
    assert(
      Number.isFinite(amount),
      `Attempting to earn non-finite credits: ${amount}`,
      { amount, currentCredits: state.credits }
    );
    
    const newCredits = state.credits + amount;
    
    console.log(`${DEBUG_PREFIXES.SYNC_CHECK} earnCredits: ${initialCredits} + ${amount} = ${newCredits}`);
    
    set(state => ({ credits: state.credits + amount }));
    
    // Post-transaction validation
    const finalState = get();
    validateCreditsConsistency(finalState.credits, 'earnCredits-end');
    
    assert(
      finalState.credits === newCredits,
      `Credits state inconsistency after earn: expected ${newCredits}, got ${finalState.credits}`,
      { initialCredits, amount, expectedCredits: newCredits, actualCredits: finalState.credits }
    );
    
    economyEvents.emit({
      type: 'credits_earned',
      payload: { amount },
      timestamp: Date.now()
    });
    
    checkpoint(`Credits earned successfully`, { 
      amount, 
      before: initialCredits, 
      after: finalState.credits,
      diff: finalState.credits - initialCredits
    });
    
    console.log(`${DEBUG_PREFIXES.TRANSACTION} Earned ${amount} credits! ${initialCredits} -> ${finalState.credits}`);
  },
  
  setCredits: (amount) => {
    set({ credits: amount });
  },
  
  // NEW: Transaction-based methods with server authority
  spend: async (amount: number, reason?: string): Promise<boolean> => {
    const syncManager = CloudSyncManager.getInstance();
    
    // If connected, route through transaction system
    if (syncManager.isAuthenticated()) {
      try {
        const transactionClient = TransactionClient.getInstance();
        const result = await transactionClient.executeTransaction({
          type: 'debit',
          category: 'general',
          amount,
          metadata: { reason: reason || 'General spending' }
        });
        
        if (result.success && result.newBalances) {
          // Server will sync the new balance to all devices
          console.log(`[CreditsStore] Transaction successful, new balance: ${result.newBalances.credits}`);
        }
        
        return result.success;
      } catch (error) {
        console.error('[CreditsStore] Transaction failed:', error);
        return false;
      }
    } else {
      // Offline mode: use local spendCredits
      return get().spendCredits(amount);
    }
  },
  
  earn: async (amount: number, reason?: string): Promise<boolean> => {
    const syncManager = CloudSyncManager.getInstance();
    
    // If connected, route through transaction system
    if (syncManager.isAuthenticated()) {
      try {
        const transactionClient = TransactionClient.getInstance();
        const result = await transactionClient.executeTransaction({
          type: 'credit',
          category: 'general',
          amount,
          metadata: { reason: reason || 'General income' }
        });
        
        if (result.success && result.newBalances) {
          // Server will sync the new balance to all devices
          console.log(`[CreditsStore] Transaction successful, new balance: ${result.newBalances.credits}`);
        }
        
        return result.success;
      } catch (error) {
        console.error('[CreditsStore] Transaction failed:', error);
        return false;
      }
    } else {
      // Offline mode: use local earnCredits
      get().earnCredits(amount);
      return true;
    }
  },
  
  setAmount: (amount: number) => {
    // Direct setter for server sync updates
    set({ credits: amount });
    console.log(`[CreditsStore] Credits set to ${amount} by server sync`);
  }
}));