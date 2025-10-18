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
        // Strong dust storms with moderate turbulence (reduced for stability)
        baseIntensity = 0.6;
        baseTurbulence = 0.15;
        gustFrequency = 0.4;
        break;
      case "Venus":
        // Slow but steady dense atmosphere
        baseIntensity = 0.35;
        baseTurbulence = 0.03;
        gustFrequency = 0.1;
        break;
      case "Earth":
        // Moderate winds with gentle gusts
        baseIntensity = 0.45;
        baseTurbulence = 0.08;
        gustFrequency = 0.3;
        break;
      case "Jupiter":
      case "Saturn":
      case "Neptune":
        // Gas giants with strong but stable winds
        baseIntensity = 0.8;
        baseTurbulence = 0.2;
        gustFrequency = 0.5;
        break;
      case "Moon":
      case "Mercury":
        // No atmosphere, minimal wind
        baseIntensity = 0.02;
        baseTurbulence = 0.005;
        gustFrequency = 0.05;
        break;
      default:
        break;
    }
    
    // Apply time-based variations with much slower changes to reduce jitter
    const gustCycle = Math.sin(newTimeFactor * gustFrequency * 0.3) * 0.5 + 0.5;  // Slowed down by 0.3x
    const turbulenceCycle = Math.sin(newTimeFactor * 0.5) * 0.15 +   // Reduced amplitude and frequency
                           Math.sin(newTimeFactor * 0.8) * 0.1;
    
    // Update wind direction with VERY slow rotation to reduce jitter
    const directionAngle = newTimeFactor * 0.02 + turbulenceCycle * 0.05;  // Much slower rotation
    const targetDirection = new THREE.Vector3(
      Math.cos(directionAngle),
      Math.sin(newTimeFactor * 0.1) * 0.1, // Reduced vertical component
      Math.sin(directionAngle)
    );
    
    // Smooth interpolation of direction to prevent sudden changes
    const currentDirection = state.direction;
    const smoothedDirection = currentDirection.clone().lerp(targetDirection, deltaTime * 0.5);
    smoothedDirection.normalize();
    
    // Calculate final intensity with reduced variations
    const targetIntensity = baseIntensity + gustCycle * state.gustStrength * 0.5;  // Reduced gust effect
    const currentIntensity = state.intensity;
    const smoothedIntensity = currentIntensity + (targetIntensity - currentIntensity) * deltaTime * 2;
    
    const finalTurbulence = baseTurbulence + Math.abs(turbulenceCycle) * 0.05;  // Reduced turbulence
    
    set({
      direction: smoothedDirection,
      intensity: smoothedIntensity,
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