import { create } from "zustand";
import { useObjectiveTriggers } from "../economy/useObjectiveTriggers";
import { memoryProfiler } from "../../utils/MemoryProfiler";

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
    // Memory profiling: Before landing
    if (import.meta.env.DEV) {
      memoryProfiler.logCurrentStatus(`Before landing on ${planetName}`);
    }
    
    set({
      isLanded: true,
      landedPlanet: planetName,
      landingTime: Date.now()
    });
    console.log(`Successfully landed on ${planetName}`);
    
    // Memory profiling: After landing
    if (import.meta.env.DEV) {
      setTimeout(() => {
        memoryProfiler.logCurrentStatus(`After landing on ${planetName}`);
        memoryProfiler.logSceneTransition('space', `${planetName}-surface`);
      }, 100);
    }
    
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
      
      // Memory profiling: Before takeoff
      if (import.meta.env.DEV) {
        memoryProfiler.logCurrentStatus(`Before takeoff from ${state.landedPlanet}`);
      }
    }
    
    set({
      isLanded: false,
      landedPlanet: null,
      landingTime: null
    });
    
    // Memory profiling: After takeoff
    if (import.meta.env.DEV && state.landedPlanet) {
      const planetName = state.landedPlanet;
      setTimeout(() => {
        memoryProfiler.logCurrentStatus(`After takeoff from ${planetName}`);
        memoryProfiler.logSceneTransition(`${planetName}-surface`, 'space');
      }, 100);
    }
  },
  
  getLandedDuration: () => {
    const state = get();
    if (!state.landingTime) return 0;
    return Date.now() - state.landingTime;
  }
}));