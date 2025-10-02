import { create } from "zustand";
import * as THREE from "three";

interface SolarSystemState {
  // Persistent universe time tracking
  universeStartTime: number | null;
  timeScale: number; // How much faster game time runs vs real time
  accumulatedTime: number; // Total accumulated universe time in seconds
  
  // Scene-specific time (for local animations)
  time: number;
  
  // Planet and landing state
  selectedPlanet: string | null;
  isLanding: boolean;
  cameraPosition: THREE.Vector3;
  distanceToTarget: number;
  
  // Actions
  initializeUniverseTime: () => void;
  updateUniverseTime: (delta: number) => void;
  getUniverseTime: () => number;
  setTime: (time: number) => void;
  setSelectedPlanet: (planet: string | null) => void;
  setIsLanding: (landing: boolean) => void;
  setCameraPosition: (position: THREE.Vector3) => void;
  setDistanceToTarget: (distance: number) => void;
  cleanup: () => void; // Clean up store state but preserve universe time
}

export const useSolarSystem = create<SolarSystemState>((set, get) => ({
  // Persistent universe time - survives scene changes
  universeStartTime: null,
  timeScale: 1, // 1 real second = 1 game second for realistic orbital periods
  accumulatedTime: 0,
  
  // Local scene time
  time: 0,
  selectedPlanet: null,
  isLanding: false,
  cameraPosition: new THREE.Vector3(0, 10, 50),
  distanceToTarget: 0,
  
  // Initialize universe time on first game start
  initializeUniverseTime: () => {
    const state = get();
    if (!state.universeStartTime) {
      const now = Date.now();
      set({
        universeStartTime: now,
      });
      console.log("[useSolarSystem] Universe time initialized at", now);
    }
  },
  
  // Update universe time based on delta
  updateUniverseTime: (delta: number) => {
    const state = get();
    const scaledDelta = delta * state.timeScale;
    set({
      accumulatedTime: state.accumulatedTime + scaledDelta
    });
  },
  
  // Get the current universe time (in seconds)
  getUniverseTime: () => {
    const state = get();
    
    // If not initialized, initialize now
    if (!state.universeStartTime) {
      state.initializeUniverseTime();
      return 0;
    }
    
    // Return accumulated time (already scaled)
    return state.accumulatedTime;
  },
  
  setTime: (time) => set({ time }),
  setSelectedPlanet: (planet) => set({ selectedPlanet: planet }),
  setIsLanding: (landing) => set({ isLanding: landing }),
  setCameraPosition: (position) => set({ cameraPosition: position.clone() }),
  setDistanceToTarget: (distance) => set({ distanceToTarget: distance }),
  
  cleanup: () => {
    console.log("[useSolarSystem] Cleanup: Preserving universe time, resetting scene state");
    
    // Preserve universe time but reset everything else
    set({
      // Keep universe time running
      // universeStartTime: preserved
      // timeScale: preserved
      // accumulatedTime: preserved
      
      // Reset scene-specific state
      time: 0,
      selectedPlanet: null,
      isLanding: false,
      cameraPosition: new THREE.Vector3(0, 10, 50),
      distanceToTarget: 0
    });
  }
}));
