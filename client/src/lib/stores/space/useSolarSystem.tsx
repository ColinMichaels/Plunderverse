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
  
  // Ship state for save/load
  shipPosition: THREE.Vector3;
  shipRotation: THREE.Euler;
  shipVelocity: THREE.Vector3;
  hasRestoredState: boolean; // Flag to indicate if saved state was restored
  
  // Actions
  initializeUniverseTime: () => void;
  updateUniverseTime: (delta: number) => void;
  getUniverseTime: () => number;
  setTime: (time: number) => void;
  setSelectedPlanet: (planet: string | null) => void;
  setIsLanding: (landing: boolean) => void;
  setCameraPosition: (position: THREE.Vector3) => void;
  setDistanceToTarget: (distance: number) => void;
  setShipPosition: (position: THREE.Vector3) => void;
  setShipRotation: (rotation: THREE.Euler) => void;
  setShipVelocity: (velocity: THREE.Vector3) => void;
  setHasRestoredState: (restored: boolean) => void;
  cleanup: () => void; // Clean up store state but preserve universe time
  
  // Engine-agnostic setters (accept plain {x,y,z} objects for Babylon.js compatibility)
  setCameraPositionRaw: (x: number, y: number, z: number) => void;
  setShipPositionRaw: (x: number, y: number, z: number) => void;
  setShipRotationRaw: (x: number, y: number, z: number) => void;
  setShipVelocityRaw: (x: number, y: number, z: number) => void;
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
  
  // Ship state for save/load
  shipPosition: new THREE.Vector3(0, 10, 50),
  shipRotation: new THREE.Euler(0, 0, 0),
  shipVelocity: new THREE.Vector3(0, 0, 0),
  hasRestoredState: false,
  
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
  setSelectedPlanet: (planet) => {
    // Explicitly prevent sun from being selected
    if (planet === "Sun") {
      console.log("[useSolarSystem] Prevented Sun from being selected");
      return;
    }
    set({ selectedPlanet: planet });
  },
  setIsLanding: (landing) => set({ isLanding: landing }),
  setCameraPosition: (position) => set({ cameraPosition: position.clone() }),
  setDistanceToTarget: (distance) => set({ distanceToTarget: distance }),
  setShipPosition: (position) => set({ shipPosition: position.clone() }),
  setShipRotation: (rotation) => set({ shipRotation: rotation.clone() }),
  setShipVelocity: (velocity) => set({ shipVelocity: velocity.clone() }),
  setHasRestoredState: (restored) => set({ hasRestoredState: restored }),
  
  // Engine-agnostic setters for Babylon.js compatibility
  setCameraPositionRaw: (x, y, z) => set({ cameraPosition: new THREE.Vector3(x, y, z) }),
  setShipPositionRaw: (x, y, z) => set({ shipPosition: new THREE.Vector3(x, y, z) }),
  setShipRotationRaw: (x, y, z) => set({ shipRotation: new THREE.Euler(x, y, z) }),
  setShipVelocityRaw: (x, y, z) => set({ shipVelocity: new THREE.Vector3(x, y, z) }),
  
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
      distanceToTarget: 0,
      shipPosition: new THREE.Vector3(0, 10, 50),
      shipRotation: new THREE.Euler(0, 0, 0),
      shipVelocity: new THREE.Vector3(0, 0, 0),
      hasRestoredState: false,
    });
  }
}));
