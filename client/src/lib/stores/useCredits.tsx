import { create } from "zustand";
import { useCreditsStore } from "../../domain/economy/credits.store";

interface CreditsState {
  credits: number;
  
  // Actions
  spendCredits: (amount: number) => boolean; // returns true if successful
  earnCredits: (amount: number) => void;
  setCredits: (amount: number) => void;
}

// Legacy adapter store that delegates to the domain store
// This maintains backward compatibility while ensuring single source of truth
export const useCredits = create<CreditsState>((set, get) => {
  // Subscribe to domain store changes and sync legacy store
  useCreditsStore.subscribe((domainState) => {
    set({ credits: domainState.credits });
  });

  // Initialize with current domain store state
  const domainState = useCreditsStore.getState();
  
  return {
    credits: domainState.credits,
    
    // Delegate all operations to domain store
    spendCredits: (amount) => {
      console.log(`[LEGACY-CREDITS] Delegating spendCredits to domain store: ${amount}`);
      return useCreditsStore.getState().spendCredits(amount);
    },
    
    earnCredits: (amount) => {
      console.log(`[LEGACY-CREDITS] Delegating earnCredits to domain store: ${amount}`);
      useCreditsStore.getState().earnCredits(amount);
    },
    
    setCredits: (amount) => {
      console.log(`[LEGACY-CREDITS] Delegating setCredits to domain store: ${amount}`);
      useCreditsStore.getState().setCredits(amount);
    }
  };
});