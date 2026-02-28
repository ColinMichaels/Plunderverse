import { create } from "zustand";

export type Vec3 = { x: number; y: number; z: number };

export function vec3Distance(a: Vec3, b: { x: number; y: number; z: number }): number {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

interface SolarSystemState {
  universeStartTime: number | null;
  timeScale: number;
  accumulatedTime: number;

  time: number;

  selectedPlanet: string | null;
  isLanding: boolean;
  cameraPosition: Vec3;
  distanceToTarget: number;

  shipPosition: Vec3;
  shipRotation: Vec3;
  shipVelocity: Vec3;
  hasRestoredState: boolean;

  initializeUniverseTime: () => void;
  updateUniverseTime: (delta: number) => void;
  getUniverseTime: () => number;
  setTime: (time: number) => void;
  setSelectedPlanet: (planet: string | null) => void;
  setIsLanding: (landing: boolean) => void;
  setCameraPosition: (position: Vec3) => void;
  setDistanceToTarget: (distance: number) => void;
  setShipPosition: (position: Vec3) => void;
  setShipRotation: (rotation: Vec3) => void;
  setShipVelocity: (velocity: Vec3) => void;
  setHasRestoredState: (restored: boolean) => void;
  cleanup: () => void;

  setCameraPositionRaw: (x: number, y: number, z: number) => void;
  setShipPositionRaw: (x: number, y: number, z: number) => void;
  setShipRotationRaw: (x: number, y: number, z: number) => void;
  setShipVelocityRaw: (x: number, y: number, z: number) => void;
}

const INITIAL_POS: Vec3 = { x: 0, y: 10, z: 50 };
const ZERO_VEC3: Vec3 = { x: 0, y: 0, z: 0 };

export const useSolarSystem = create<SolarSystemState>((set, get) => ({
  universeStartTime: null,
  timeScale: 1,
  accumulatedTime: 0,

  time: 0,
  selectedPlanet: null,
  isLanding: false,
  cameraPosition: { ...INITIAL_POS },
  distanceToTarget: 0,

  shipPosition: { ...INITIAL_POS },
  shipRotation: { ...ZERO_VEC3 },
  shipVelocity: { ...ZERO_VEC3 },
  hasRestoredState: false,

  initializeUniverseTime: () => {
    const state = get();
    if (!state.universeStartTime) {
      const now = Date.now();
      set({ universeStartTime: now });
      console.log("[useSolarSystem] Universe time initialized at", now);
    }
  },

  updateUniverseTime: (delta: number) => {
    const state = get();
    set({ accumulatedTime: state.accumulatedTime + delta * state.timeScale });
  },

  getUniverseTime: () => {
    const state = get();
    if (!state.universeStartTime) {
      state.initializeUniverseTime();
      return 0;
    }
    return state.accumulatedTime;
  },

  setTime: (time) => set({ time }),
  setSelectedPlanet: (planet) => {
    if (planet === "Sun") {
      console.log("[useSolarSystem] Prevented Sun from being selected");
      return;
    }
    set({ selectedPlanet: planet });
  },
  setIsLanding: (landing) => set({ isLanding: landing }),
  setCameraPosition: (position) => set({ cameraPosition: { x: position.x, y: position.y, z: position.z } }),
  setDistanceToTarget: (distance) => set({ distanceToTarget: distance }),
  setShipPosition: (position) => set({ shipPosition: { x: position.x, y: position.y, z: position.z } }),
  setShipRotation: (rotation) => set({ shipRotation: { x: rotation.x, y: rotation.y, z: rotation.z } }),
  setShipVelocity: (velocity) => set({ shipVelocity: { x: velocity.x, y: velocity.y, z: velocity.z } }),
  setHasRestoredState: (restored) => set({ hasRestoredState: restored }),

  setCameraPositionRaw: (x, y, z) => set({ cameraPosition: { x, y, z } }),
  setShipPositionRaw: (x, y, z) => set({ shipPosition: { x, y, z } }),
  setShipRotationRaw: (x, y, z) => set({ shipRotation: { x, y, z } }),
  setShipVelocityRaw: (x, y, z) => set({ shipVelocity: { x, y, z } }),

  cleanup: () => {
    console.log("[useSolarSystem] Cleanup: Preserving universe time, resetting scene state");
    set({
      time: 0,
      selectedPlanet: null,
      isLanding: false,
      cameraPosition: { ...INITIAL_POS },
      distanceToTarget: 0,
      shipPosition: { ...INITIAL_POS },
      shipRotation: { ...ZERO_VEC3 },
      shipVelocity: { ...ZERO_VEC3 },
      hasRestoredState: false,
    });
  }
}));
