import { create } from "zustand";
import * as THREE from "three";

interface AutopilotState {
  isActive: boolean;
  target: THREE.Vector3 | null;
  
  // Actions
  activate: (target: THREE.Vector3) => void;
  deactivate: () => void;
  setTarget: (target: THREE.Vector3 | null) => void;
}

export const useAutopilot = create<AutopilotState>((set) => ({
  isActive: false,
  target: null,
  
  activate: (target) => {
    set({
      isActive: true,
      target: target.clone()
    });
    console.log("Autopilot activated!");
  },
  
  deactivate: () => {
    set({
      isActive: false,
      target: null
    });
    console.log("Autopilot deactivated!");
  },
  
  setTarget: (target) => {
    set({ target });
  }
}));