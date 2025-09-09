import { create } from "zustand";
import * as THREE from "three";

interface SolarSystemState {
  time: number;
  selectedPlanet: string | null;
  isLanding: boolean;
  cameraPosition: THREE.Vector3;
  distanceToTarget: number;
  
  // Actions
  setTime: (time: number) => void;
  setSelectedPlanet: (planet: string | null) => void;
  setIsLanding: (landing: boolean) => void;
  setCameraPosition: (position: THREE.Vector3) => void;
  setDistanceToTarget: (distance: number) => void;
}

export const useSolarSystem = create<SolarSystemState>((set) => ({
  time: 0,
  selectedPlanet: null,
  isLanding: false,
  cameraPosition: new THREE.Vector3(0, 10, 50),
  distanceToTarget: 0,
  
  setTime: (time) => set({ time }),
  setSelectedPlanet: (planet) => set({ selectedPlanet: planet }),
  setIsLanding: (landing) => set({ isLanding: landing }),
  setCameraPosition: (position) => set({ cameraPosition: position.clone() }),
  setDistanceToTarget: (distance) => set({ distanceToTarget: distance }),
}));
