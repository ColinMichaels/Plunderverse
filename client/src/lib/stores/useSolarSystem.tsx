import { create } from "zustand";

interface SolarSystemState {
  time: number;
  selectedPlanet: string | null;
  isLanding: boolean;
  
  // Actions
  setTime: (time: number) => void;
  setSelectedPlanet: (planet: string | null) => void;
  setIsLanding: (landing: boolean) => void;
}

export const useSolarSystem = create<SolarSystemState>((set) => ({
  time: 0,
  selectedPlanet: null,
  isLanding: false,
  
  setTime: (time) => set({ time }),
  setSelectedPlanet: (planet) => set({ selectedPlanet: planet }),
  setIsLanding: (landing) => set({ isLanding: landing }),
}));
