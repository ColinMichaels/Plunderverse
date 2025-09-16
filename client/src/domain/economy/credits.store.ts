import { create } from "zustand";
import { CreditsState } from './types';
import { economyEvents } from './events';
import {
  validateCreditsConsistency,
  checkpoint,
  assert,
  DEBUG_PREFIXES
} from './debug';

interface CreditsActions {
  spendCredits: (amount: number) => boolean;
  earnCredits: (amount: number) => void;
  setCredits: (amount: number) => void;
}

type CreditsStore = CreditsState & CreditsActions;

export const useCreditsStore = create<CreditsStore>((set, get) => ({
  credits: 1000,
  
  spendCredits: (amount) => {
    checkpoint(`Credits spend attempt: ${amount}`, { amount });
    
    const state = get();
    const initialCredits = state.credits;
    
    // Pre-transaction validation
    validateCreditsConsistency(state.credits, 'spendCredits-start');
    
    assert(
      amount > 0,
      `Attempting to spend negative or zero credits: ${amount}`,
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
  }
}));