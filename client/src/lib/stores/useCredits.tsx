import { create } from "zustand";

interface CreditsState {
  credits: number;
  
  // Actions
  spendCredits: (amount: number) => boolean; // returns true if successful
  earnCredits: (amount: number) => void;
  setCredits: (amount: number) => void;
}

export const useCredits = create<CreditsState>((set, get) => ({
  credits: 1000, // Starting credits
  
  spendCredits: (amount) => {
    const state = get();
    if (state.credits >= amount) {
      set({ credits: state.credits - amount });
      console.log(`Spent ${amount} credits. Remaining: ${state.credits - amount}`);
      return true;
    } else {
      console.log(`Insufficient credits! Need ${amount}, have ${state.credits}`);
      return false;
    }
  },
  
  earnCredits: (amount) => {
    set(state => ({
      credits: state.credits + amount
    }));
    console.log(`Earned ${amount} credits!`);
  },
  
  setCredits: (amount) => {
    set({ credits: amount });
  }
}));