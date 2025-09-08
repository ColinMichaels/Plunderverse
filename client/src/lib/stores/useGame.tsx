import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export type GamePhase = "splash" | "ready" | "playing" | "ended";

interface GameState {
  phase: GamePhase;
  
  // Actions
  start: () => void;
  restart: () => void;
  end: () => void;
  showSplash: () => void;
}

export const useGame = create<GameState>()(
  subscribeWithSelector((set) => ({
    phase: "splash",
    
    start: () => {
      set((state) => {
        // Transition from splash or ready to playing
        if (state.phase === "splash" || state.phase === "ready") {
          return { phase: "playing" };
        }
        return {};
      });
    },
    
    restart: () => {
      set(() => ({ phase: "splash" }));
    },
    
    end: () => {
      set((state) => {
        // Only transition from playing to ended
        if (state.phase === "playing") {
          return { phase: "ended" };
        }
        return {};
      });
    },
    
    showSplash: () => {
      set(() => ({ phase: "splash" }));
    }
  }))
);
