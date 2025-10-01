import { create } from "zustand";

interface LandingWarningState {
  isVisible: boolean;
  planetName: string;
  currentDistance: number;
  requiredDistance: number;
  
  // Actions
  showWarning: (planetName: string, currentDistance: number, requiredDistance: number) => void;
  hideWarning: () => void;
}

export const useLandingWarning = create<LandingWarningState>((set) => ({
  isVisible: false,
  planetName: "",
  currentDistance: 0,
  requiredDistance: 0,
  
  showWarning: (planetName, currentDistance, requiredDistance) => {
    set({
      isVisible: true,
      planetName,
      currentDistance,
      requiredDistance
    });
  },
  
  hideWarning: () => {
    set({
      isVisible: false,
      planetName: "",
      currentDistance: 0,
      requiredDistance: 0
    });
  }
}));