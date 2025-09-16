import { create } from "zustand";
import { CreditsState } from './types';
import { economyEvents } from './events';

interface CreditsActions {
  spendCredits: (amount: number) => boolean;
  earnCredits: (amount: number) => void;
  setCredits: (amount: number) => void;
}

type CreditsStore = CreditsState & CreditsActions;

export const useCreditsStore = create<CreditsStore>((set, get) => ({
  credits: 1000,
  
  spendCredits: (amount) => {
    const state = get();
    if (state.credits >= amount) {
      set({ credits: state.credits - amount });
      economyEvents.emit({
        type: 'credits_spent',
        payload: { amount },
        timestamp: Date.now()
      });
      console.log(`Spent ${amount} credits. Remaining: ${state.credits - amount}`);
      return true;
    } else {
      console.log(`Insufficient credits! Need ${amount}, have ${state.credits}`);
      return false;
    }
  },
  
  earnCredits: (amount) => {
    set(state => ({ credits: state.credits + amount }));
    economyEvents.emit({
      type: 'credits_earned',
      payload: { amount },
      timestamp: Date.now()
    });
    console.log(`Earned ${amount} credits!`);
  },
  
  setCredits: (amount) => {
    set({ credits: amount });
  }
}));