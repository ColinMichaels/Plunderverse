import { create } from "zustand";
import * as THREE from "three";

interface WindState {
  direction: THREE.Vector3;
  intensity: number;
  gustStrength: number;
  turbulence: number;
  planetName: string;
  
  // Time-based variations
  timeFactor: number;
  
  // Actions
  updateWind: (deltaTime: number, planetName: string) => void;
  setIntensity: (intensity: number) => void;
  triggerStorm: () => void;
  stopStorm: () => void;
  getWindVector: () => THREE.Vector3;
  cleanup: () => void; // Clean up store state and reset
}

export const useWind = create<WindState>((set, get) => ({
  direction: new THREE.Vector3(1, 0, 0),
  intensity: 0.5,
  gustStrength: 0.2,
  turbulence: 0.1,
  planetName: "Earth",
  timeFactor: 0,
  
  updateWind: (deltaTime: number, planetName: string) => {
    const state = get();
    const newTimeFactor = state.timeFactor + deltaTime;
    
    // Different wind patterns for each planet
    let baseIntensity = 0.5;
    let baseTurbulence = 0.1;
    let gustFrequency = 0.5;
    
    switch (planetName) {
      case "Mars":
        // Strong dust storms with high turbulence
        baseIntensity = 0.7;
        baseTurbulence = 0.3;
        gustFrequency = 1.2;
        break;
      case "Venus":
        // Slow but steady dense atmosphere
        baseIntensity = 0.4;
        baseTurbulence = 0.05;
        gustFrequency = 0.2;
        break;
      case "Earth":
        // Moderate winds with regular gusts
        baseIntensity = 0.5;
        baseTurbulence = 0.15;
        gustFrequency = 0.8;
        break;
      case "Jupiter":
      case "Saturn":
      case "Neptune":
        // Gas giants with extreme winds
        baseIntensity = 1.0;
        baseTurbulence = 0.5;
        gustFrequency = 2.0;
        break;
      case "Moon":
      case "Mercury":
        // No atmosphere, minimal wind
        baseIntensity = 0.05;
        baseTurbulence = 0.01;
        gustFrequency = 0.1;
        break;
      default:
        break;
    }
    
    // Apply time-based variations
    const gustCycle = Math.sin(newTimeFactor * gustFrequency) * 0.5 + 0.5;
    const turbulenceCycle = Math.sin(newTimeFactor * 2.3) * 0.3 + 
                           Math.sin(newTimeFactor * 3.7) * 0.2;
    
    // Update wind direction with slow rotation
    const directionAngle = newTimeFactor * 0.1 + turbulenceCycle * 0.2;
    const newDirection = new THREE.Vector3(
      Math.cos(directionAngle),
      Math.sin(newTimeFactor * 0.3) * 0.2, // Vertical component
      Math.sin(directionAngle)
    ).normalize();
    
    // Calculate final intensity
    const finalIntensity = baseIntensity + gustCycle * state.gustStrength;
    const finalTurbulence = baseTurbulence + Math.abs(turbulenceCycle) * 0.1;
    
    set({
      direction: newDirection,
      intensity: finalIntensity,
      turbulence: finalTurbulence,
      planetName: planetName,
      timeFactor: newTimeFactor
    });
  },
  
  setIntensity: (intensity: number) => {
    set({ intensity: Math.max(0, Math.min(2, intensity)) });
  },
  
  triggerStorm: () => {
    set({
      intensity: 1.5,
      gustStrength: 0.8,
      turbulence: 0.5
    });
  },
  
  stopStorm: () => {
    set({
      intensity: 0.5,
      gustStrength: 0.2,
      turbulence: 0.1
    });
  },
  
  getWindVector: () => {
    const state = get();
    return state.direction.clone().multiplyScalar(state.intensity);
  },
  
  cleanup: () => {
    console.log("[useWind] Cleanup: Resetting wind state");
    set({
      direction: new THREE.Vector3(1, 0, 0),
      intensity: 0.5,
      gustStrength: 0.2,
      turbulence: 0.1,
      planetName: "Earth",
      timeFactor: 0
    });
  }
}))