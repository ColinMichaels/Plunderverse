import { create } from "zustand";
import * as THREE from "three";

interface AutopilotState {
  isActive: boolean;
  target: THREE.Vector3 | null;
  isOrbiting: boolean;
  orbitRadius: number;
  orbitAngle: number;
  
  // Actions
  activate: (target: THREE.Vector3) => void;
  deactivate: () => void;
  setTarget: (target: THREE.Vector3 | null) => void;
  enterOrbit: (radius: number) => void;
}

export const useAutopilot = create<AutopilotState>((set, get) => ({
  isActive: false,
  target: null,
  isOrbiting: false,
  orbitRadius: 50,
  orbitAngle: 0,
  
  activate: (target) => {
    set({
      isActive: true,
      target: target.clone(),
      isOrbiting: false,
      orbitAngle: 0
    });
    console.log("Autopilot activated!");
  },
  
  deactivate: () => {
    set({
      isActive: false,
      target: null,
      isOrbiting: false,
      orbitAngle: 0
    });
    console.log("Autopilot deactivated!");
  },
  
  setTarget: (target) => {
    set({ target });
  },
  
  enterOrbit: (radius) => {
    set({
      isOrbiting: true,
      orbitRadius: radius
    });
    console.log(`Entering stable orbit at ${radius} units`);
  }
}));