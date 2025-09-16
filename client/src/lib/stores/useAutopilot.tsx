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
  updateThrusterVolume: () => void;
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
    
    // Start thruster sound with current fuel level
    import('./useAudio').then(({ useAudio }) => {
      import('./useEquipment').then(({ useEquipment }) => {
        const fuelTank = useEquipment.getState().getEquipment('fuel-tank');
        const fuelLevel = fuelTank?.currentDurability || 0;
        useAudio.getState().playThruster(fuelLevel);
      });
    });
  },
  
  deactivate: () => {
    set({
      isActive: false,
      target: null,
      isOrbiting: false,
      orbitAngle: 0
    });
    console.log("Autopilot deactivated!");
    
    // Stop thruster sound
    import('./useAudio').then(({ useAudio }) => {
      useAudio.getState().stopThruster();
    });
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
  },

  updateThrusterVolume: () => {
    const state = get();
    if (!state.isActive) return;
    
    // Update thruster volume based on current fuel level
    import('./useAudio').then(({ useAudio }) => {
      import('./useEquipment').then(({ useEquipment }) => {
        const fuelTank = useEquipment.getState().getEquipment('fuel-tank');
        const fuelLevel = fuelTank?.currentDurability || 0;
        
        // Only update if thruster sound is loaded
        const audioState = useAudio.getState();
        if (audioState.thrusterSound && audioState.thrusterSound.volume !== undefined) {
          const baseVolume = 0.15;
          const fuelRatio = Math.max(0, Math.min(1, fuelLevel / 100));
          const newVolume = baseVolume * fuelRatio;
          
          audioState.thrusterSound.volume = newVolume;
          console.log(`[THRUSTER] Volume updated: ${newVolume.toFixed(3)} (Fuel: ${fuelLevel}%)`);
        }
      });
    });
  }
}));