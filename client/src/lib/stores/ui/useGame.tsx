import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { useCreditsStore } from "@/domain/economy/credits.store";
import { useShipStatus } from "../ship/useShipStatus";
import { useEnemies } from "../combat/useEnemies";
import { useShooting } from "../combat/useShooting";

export type GamePhase = "splash" | "ready" | "playing" | "ended";

const REVIVAL_COST = 300;

interface GameState {
  phase: GamePhase;
  
  // Actions
  start: () => void;
  restart: () => void;
  end: () => void;
  showSplash: () => void;
  revive: () => void;
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
    },
    
    revive: () => {
      // Handle revival: deduct credits, reset ship stats, return to playing
      const creditsState = useCreditsStore.getState();
      const shipState = useShipStatus.getState();
      
      // Check if player has enough credits
      if (creditsState.credits < REVIVAL_COST) {
        console.error('[REVIVE] Insufficient credits for revival');
        return;
      }
      
      // Deduct credits
      creditsState.spendCredits(REVIVAL_COST);
      console.log(`[REVIVE] Spent ${REVIVAL_COST} credits for revival`);
      
      // Reset ship stats to full
      shipState.resetShip();
      
      // Clear combat state
      useEnemies.getState().clearEnemies();
      useShooting.setState({ projectiles: [] });
      console.log('[REVIVE] Cleared enemies and projectiles');
      
      // Return to playing phase
      set(() => ({ phase: "playing" }));
      console.log('[REVIVE] Player revived and returned to game');
    }
  }))
);
