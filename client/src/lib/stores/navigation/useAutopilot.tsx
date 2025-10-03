import { create } from "zustand";
import * as THREE from "three";
import { useLandedState } from "../surface/useLandedState";

// Easing functions for smooth orbital mechanics
const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

const easeOutCubic = (t: number): number => {
  return 1 - Math.pow(1 - t, 3);
};

interface AutopilotState {
  isActive: boolean;
  target: THREE.Vector3 | null;
  isOrbiting: boolean;
  orbitRadius: number;
  orbitAngle: number;
  approachProgress: number; // Track approach progress for easing
  orbitSway: number; // Camera sway for realism during orbit
  orbitSpeed: number; // Variable orbit speed for cinematic effect
  
  // Actions
  activate: (target: THREE.Vector3) => void;
  deactivate: () => void;
  setTarget: (target: THREE.Vector3 | null) => void;
  enterOrbit: (radius: number) => void;
  updateThrusterVolume: () => void;
  updateApproachProgress: (progress: number) => void;
  updateOrbitSway: (delta: number) => void;
  getEasedSpeed: (baseSpeed: number, distance: number, targetDistance: number) => number;
}

export const useAutopilot = create<AutopilotState>((set, get) => ({
  isActive: false,
  target: null,
  isOrbiting: false,
  orbitRadius: 50,
  orbitAngle: 0,
  approachProgress: 0,
  orbitSway: 0,
  orbitSpeed: 0.15,
  
  activate: (target) => {
    // Check if landed before allowing activation
    const landedState = useLandedState.getState();
    if (landedState.isLanded) {
      console.log(`[AUTOPILOT] Cannot activate while landed on ${landedState.landedPlanet}`);
      return;
    }
    
    set({
      isActive: true,
      target: target.clone(),
      isOrbiting: false,
      orbitAngle: 0,
      approachProgress: 0,
      orbitSway: 0,
      orbitSpeed: 0.15
    });
    console.log("Autopilot activated!");
    
    // Start thruster sound with current fuel level
    import('../ui/useAudio').then(({ useAudio }) => {
      import('../ship/useEquipment').then(({ useEquipment }) => {
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
      orbitAngle: 0,
      approachProgress: 0,
      orbitSway: 0
    });
    console.log("Autopilot deactivated!");
    
    // Stop thruster sound
    import('../ui/useAudio').then(({ useAudio }) => {
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
    import('../ui/useAudio').then(({ useAudio }) => {
      import('../ship/useEquipment').then(({ useEquipment }) => {
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
  },
  
  updateApproachProgress: (progress) => {
    set({ approachProgress: progress });
  },
  
  updateOrbitSway: (delta) => {
    const state = get();
    // Add subtle camera sway during orbit for realism
    const swayAmount = Math.sin(Date.now() * 0.001) * 0.05;
    set({ orbitSway: swayAmount });
  },
  
  getEasedSpeed: (baseSpeed, distance, targetDistance) => {
    // Calculate progress (0 to 1) as we approach target
    const progress = 1 - Math.min(distance / targetDistance, 1);
    
    // Use cubic easing for smooth deceleration
    const easedProgress = easeOutCubic(progress);
    
    // Apply easing to speed (slow down as we get closer)
    const minSpeed = baseSpeed * 0.2; // Minimum 20% of base speed
    const speed = baseSpeed * (1 - easedProgress * 0.8) + minSpeed;
    
    return speed;
  }
}));

// Subscribe to landing state changes to automatically deactivate autopilot when landing
useLandedState.subscribe((state, prevState) => {
  // If we just landed, deactivate autopilot
  if (state.isLanded && !prevState?.isLanded) {
    const autopilotState = useAutopilot.getState();
    if (autopilotState.isActive) {
      console.log('[AUTOPILOT] Auto-deactivating due to landing on', state.landedPlanet);
      autopilotState.deactivate();
    }
  }
});