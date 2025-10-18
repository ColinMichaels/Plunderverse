import { create } from "zustand";
import * as THREE from "three";

interface SurfacePlayerState {
  position: THREE.Vector3;
  rotation: number;
  setPosition: (position: THREE.Vector3) => void;
  setRotation: (rotation: number) => void;
}

export const useSurfacePlayer = create<SurfacePlayerState>((set) => ({
  position: new THREE.Vector3(0, 1.8, 5),
  rotation: 0,
  
  setPosition: (position) => {
    set({ position: position.clone() });
  },
  
  setRotation: (rotation) => {
    set({ rotation });
  },
}));