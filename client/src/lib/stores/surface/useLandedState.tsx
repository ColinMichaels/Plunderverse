import { create } from "zustand";
import { useObjectiveTriggers } from "../economy/useObjectiveTriggers";

interface LandedState {
  isLanded: boolean;
  landedPlanet: string | null;
  landingTime: number | null;
  
  // Actions
  setLanded: (planetName: string) => void;
  setNotLanded: () => void;
  getLandedDuration: () => number;
}

export const useLandedState = create<LandedState>((set, get) => ({
  isLanded: false,
  landedPlanet: null,
  landingTime: null,
  
  setLanded: (planetName) => {
    set({
      isLanded: true,
      landedPlanet: planetName,
      landingTime: Date.now()
    });
    console.log(`Successfully landed on ${planetName}`);
    
    // Report location trigger progress for missions
    try {
      const triggers = useObjectiveTriggers.getState();
      triggers.reportProgress('location', { planet: planetName });
      triggers.reportLocationProgress(undefined, undefined, planetName);
      console.log(`[OBJECTIVE-TRIGGER] Reported landing on ${planetName} for mission objectives`);
    } catch (error) {
      console.error('[OBJECTIVE-TRIGGER] Error reporting landing:', error);
    }
  },
  
  setNotLanded: () => {
    const state = get();
    if (state.isLanded && state.landedPlanet) {
      const duration = state.getLandedDuration();
      console.log(`Took off from ${state.landedPlanet} after ${Math.round(duration / 1000)} seconds`);
    }
    
    set({
      isLanded: false,
      landedPlanet: null,
      landingTime: null
    });
  },
  
  getLandedDuration: () => {
    const state = get();
    if (!state.landingTime) return 0;
    return Date.now() - state.landingTime;
  }
}));