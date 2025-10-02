import { create } from "zustand";
import { useObjectiveTriggers } from "../economy/useObjectiveTriggers";
import { memoryProfiler } from "../../utils/MemoryProfiler";
import { useSolarSystem } from "../space/useSolarSystem";
import { planets } from "../../planetData";
import * as THREE from "three";

interface LandedState {
  isLanded: boolean;
  landedPlanet: string | null;
  landingTime: number | null; // Real-world timestamp
  landingUniverseTime: number | null; // Universe time when landed
  isTakingOff: boolean;
  takeoffPlanetName: string | null; // Planet we're taking off from
  
  // Actions
  setLanded: (planetName: string) => void;
  setNotLanded: () => void;
  getLandedDuration: () => number;
  setIsTakingOff: (takingOff: boolean) => void;
  getTakeoffOrbitPosition: () => { position: THREE.Vector3; velocity: THREE.Vector3 } | null;
}

export const useLandedState = create<LandedState>((set, get) => ({
  isLanded: false,
  landedPlanet: null,
  landingTime: null,
  landingUniverseTime: null,
  isTakingOff: false,
  takeoffPlanetName: null,
  
  setLanded: (planetName) => {
    // Memory profiling: Before landing
    if (import.meta.env.DEV) {
      memoryProfiler.logCurrentStatus(`Before landing on ${planetName}`);
    }
    
    // Store universe time when landing
    const universeTime = useSolarSystem.getState().getUniverseTime();
    
    set({
      isLanded: true,
      landedPlanet: planetName,
      landingTime: Date.now(),
      landingUniverseTime: universeTime
    });
    console.log(`Successfully landed on ${planetName} at universe time ${universeTime}`);
    
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
      
      // Store takeoff planet for positioning
      set({ takeoffPlanetName: state.landedPlanet });
    }
    
    set({
      isLanded: false,
      landedPlanet: null,
      landingTime: null,
      landingUniverseTime: null
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
  },
  
  setIsTakingOff: (takingOff) => {
    set({ isTakingOff: takingOff });
    if (takingOff) {
      console.log(`Initiating takeoff sequence from ${get().landedPlanet}`);
    }
  },
  
  // Calculate orbital position for takeoff based on current universe time
  getTakeoffOrbitPosition: () => {
    const state = get();
    const { takeoffPlanetName } = state;
    
    if (!takeoffPlanetName) return null;
    
    // Find the planet data
    const planet = planets.find(p => p.name === takeoffPlanetName);
    if (!planet) return null;
    
    // Get current universe time
    const universeTime = useSolarSystem.getState().getUniverseTime();
    
    // Calculate planet's current position
    const angle = universeTime * planet.orbitalSpeed;
    const x = Math.cos(angle) * planet.distance;
    const z = Math.sin(angle) * planet.distance;
    const planetPosition = new THREE.Vector3(x, 0, z);
    
    // Place ship at orbital distance (8x planet radius)
    const orbitRadius = planet.size * 8;
    const orbitOffset = new THREE.Vector3(orbitRadius, 0, 0).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      angle + Math.PI / 4 // Offset angle for variety
    );
    const shipPosition = planetPosition.clone().add(orbitOffset);
    
    // Calculate tangential velocity for orbital motion
    const tangentialSpeed = Math.sqrt(planet.distance) * 0.05; // Simple orbital speed
    const velocity = new THREE.Vector3(
      -Math.sin(angle + Math.PI / 4) * tangentialSpeed,
      0,
      Math.cos(angle + Math.PI / 4) * tangentialSpeed
    );
    
    console.log(`[TAKEOFF] Positioning ship at orbit around ${takeoffPlanetName} at position:`, shipPosition, 'with velocity:', velocity);
    
    // Clear takeoff planet after calculating position
    set({ takeoffPlanetName: null });
    
    return { position: shipPosition, velocity };
  }
}));