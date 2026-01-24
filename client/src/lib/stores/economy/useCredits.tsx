import { create } from "zustand";
import { useCreditsStore } from "../../../domain/economy/credits.store";

interface CreditsState {
  credits: number;
  
  // Actions
  spendCredits: (amount: number) => boolean; // returns true if successful
  earnCredits: (amount: number) => void;
  setCredits: (amount: number) => void;
}

let creditsDeprecationWarned = false;

export const useCredits = create<CreditsState>((set, get) => {
  if (import.meta.env.DEV && !creditsDeprecationWarned) {
    console.warn('[DEPRECATED] useCredits is deprecated. Use useCreditsStore from domain stores instead.');
    creditsDeprecationWarned = true;
  }

  useCreditsStore.subscribe((domainState) => {
    set({ credits: domainState.credits });
  });

  const domainState = useCreditsStore.getState();
  
  return {
    credits: domainState.credits,
    spendCredits: (amount) => useCreditsStore.getState().spendCredits(amount),
    earnCredits: (amount) => useCreditsStore.getState().earnCredits(amount),
    setCredits: (amount) => useCreditsStore.getState().setCredits(amount)
  };
});