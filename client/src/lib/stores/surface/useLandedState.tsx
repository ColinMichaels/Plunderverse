import { create } from "zustand";
import { useObjectiveTriggers } from "../economy/useObjectiveTriggers";
import { memoryProfiler } from "../../utils/MemoryProfiler";
import { useSolarSystem } from "../space/useSolarSystem";
import { planets } from "../../planetData";
import * as THREE from "three";
import { useMusicPlayer } from "../ui/useMusicPlayer";

interface LandedState {
  isLanded: boolean;
  landedPlanet: string | null;
  landingTime: number | null; // Real-world timestamp
  landingUniverseTime: number | null; // Universe time when landed
  isTakingOff: boolean;
  takeoffPlanetName: string | null; // Planet we're taking off from
  takeoffTimeoutId: NodeJS.Timeout | null; // Timeout ID for tracking delayed takeoff completion
  
  // Actions
  setLanded: (planetName: string) => void;
  setNotLanded: () => void;
  getLandedDuration: () => number;
  setIsTakingOff: (takingOff: boolean) => void;
  completeTakeoff: () => void;
  getTakeoffOrbitPosition: () => { position: THREE.Vector3; velocity: THREE.Vector3 } | null;
}

export const useLandedState = create<LandedState>((set, get) => ({
  isLanded: true,
  landedPlanet: 'Earth',
  landingTime: null,
  landingUniverseTime: null,
  isTakingOff: false,
  takeoffPlanetName: null,
  takeoffTimeoutId: null,
  
  setLanded: (planetName) => {
    // Cancel any pending takeoff timeout to prevent race conditions
    const state = get();
    if (state.takeoffTimeoutId) {
      clearTimeout(state.takeoffTimeoutId);
      console.log(`[TAKEOFF-TIMEOUT] Cancelled pending takeoff timeout due to new landing on ${planetName}`);
    }
    
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
      landingUniverseTime: universeTime,
      takeoffTimeoutId: null // Clear timeout ID
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
    
    // Trigger Minecraft-style music scheduling for planet entry
    try {
      const musicPlayer = useMusicPlayer.getState();
      musicPlayer.resetTimerOnLocationChange('planet');
      console.log(`[MUSIC] Triggered planet entry music schedule for ${planetName}`);
    } catch (error) {
      console.error('[MUSIC] Error triggering planet music:', error);
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
    
    // Trigger Minecraft-style music scheduling for space entry
    try {
      const musicPlayer = useMusicPlayer.getState();
      musicPlayer.resetTimerOnLocationChange('space');
      console.log(`[MUSIC] Triggered space entry music schedule after takeoff`);
    } catch (error) {
      console.error('[MUSIC] Error triggering space music:', error);
    }
  },
  
  getLandedDuration: () => {
    const state = get();
    if (!state.landingTime) return 0;
    return Date.now() - state.landingTime;
  },
  
  setIsTakingOff: (takingOff) => {
    // Cancel any pending takeoff timeout to prevent race conditions
    const state = get();
    if (state.takeoffTimeoutId) {
      clearTimeout(state.takeoffTimeoutId);
      console.log(`[TAKEOFF-TIMEOUT] Cancelled pending takeoff timeout due to new takeoff state: ${takingOff}`);
    }
    
    set({ 
      isTakingOff: takingOff,
      takeoffTimeoutId: null // Clear timeout ID
    });
    if (takingOff) {
      console.log(`Initiating takeoff sequence from ${get().landedPlanet}`);
    }
  },
  
  completeTakeoff: () => {
    const state = get();
    const previousPlanet = state.landedPlanet;
    console.log(`[TAKEOFF-COMPLETE] Starting completion from ${previousPlanet}`, {
      isLanded: state.isLanded,
      isTakingOff: state.isTakingOff,
      landedPlanet: state.landedPlanet
    });
    
    // Cancel any existing timeout to prevent race conditions
    if (state.takeoffTimeoutId) {
      clearTimeout(state.takeoffTimeoutId);
      console.log(`[TAKEOFF-TIMEOUT] Cancelled existing timeout before creating new one`);
    }
    
    // Store expected state values before creating timeout
    const expectedPlanet = previousPlanet;
    const expectedIsTakingOff = false; // We expect isTakingOff to be false after we set it
    
    // First set isTakingOff to false to unmount the transition overlay
    console.log(`[TAKEOFF-COMPLETE] Setting isTakingOff to false to unmount transition...`);
    set({ 
      isTakingOff: false,
      takeoffPlanetName: previousPlanet // Store for positioning
    });
    
    // Add a small delay before switching scenes to ensure transition is fully unmounted
    const timeoutId = setTimeout(() => {
      // Guard: Check if state has changed since we started
      const currentState = get();
      
      // Verify we're still in the expected state
      if (currentState.isTakingOff !== expectedIsTakingOff) {
        console.log(`[TAKEOFF-TIMEOUT] State guard failed: isTakingOff changed from ${expectedIsTakingOff} to ${currentState.isTakingOff}, skipping delayed update`);
        return;
      }
      
      if (currentState.landedPlanet !== expectedPlanet) {
        console.log(`[TAKEOFF-TIMEOUT] State guard failed: landedPlanet changed from ${expectedPlanet} to ${currentState.landedPlanet}, skipping delayed update`);
        return;
      }
      
      // Additional guard: Check if we've already completed the takeoff
      if (!currentState.isLanded) {
        console.log(`[TAKEOFF-TIMEOUT] State guard: Already in space (isLanded=false), skipping redundant update`);
        return;
      }
      
      console.log(`[TAKEOFF-COMPLETE] State guards passed, now setting isLanded to false to switch to space scene...`);
      set({ 
        isLanded: false,
        landedPlanet: null,
        takeoffTimeoutId: null // Clear timeout ID since it's completed
      });
      
      // Log the new state
      const newState = get();
      console.log(`[TAKEOFF-COMPLETE] State after delayed update:`, {
        isLanded: newState.isLanded,
        isTakingOff: newState.isTakingOff,
        landedPlanet: newState.landedPlanet,
        takeoffPlanetName: newState.takeoffPlanetName
      });
    }, 100); // 100ms delay to ensure clean transition
    
    // Store the timeout ID for potential cancellation
    set({ takeoffTimeoutId: timeoutId });
    
    // Handle memory profiling
    if (import.meta.env.DEV && previousPlanet) {
      memoryProfiler.logCurrentStatus(`After takeoff from ${previousPlanet}`);
      memoryProfiler.logSceneTransition(`${previousPlanet}-surface`, 'space');
    }
    
    // Report location trigger progress for missions
    try {
      const triggers = useObjectiveTriggers.getState();
      triggers.reportProgress('location', { planet: 'space' });
      console.log(`[OBJECTIVE-TRIGGER] Reported return to space after takeoff`);
    } catch (error) {
      console.error('[OBJECTIVE-TRIGGER] Error reporting takeoff:', error);
    }
    
    // Trigger space music scheduling
    try {
      const musicPlayer = useMusicPlayer.getState();
      musicPlayer.resetTimerOnLocationChange('space');
      console.log(`[MUSIC] Triggered space entry music schedule after takeoff`);
    } catch (error) {
      console.error('[MUSIC] Error triggering space music:', error);
    }
    
    console.log(`[TAKEOFF-COMPLETE] Takeoff sequence FULLY COMPLETE!`);
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