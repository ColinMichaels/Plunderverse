import { create } from "zustand";
import * as THREE from "three";

export interface TimeOfDayPreset {
  name: string;
  azimuth: number;
  elevation: number;
  sunIntensity: number;
  ambientIntensity: number;
  sunColor?: string;
}

export const TIME_OF_DAY_PRESETS: TimeOfDayPreset[] = [
  {
    name: "Dawn",
    azimuth: 90,
    elevation: 5,
    sunIntensity: 0.8,
    ambientIntensity: 0.2,
    sunColor: "#FF6B6B"
  },
  {
    name: "Morning",
    azimuth: 120,
    elevation: 30,
    sunIntensity: 2.0,
    ambientIntensity: 0.35,
    sunColor: "#FFD23F"
  },
  {
    name: "Noon",
    azimuth: 180,
    elevation: 75,
    sunIntensity: 3.5,
    ambientIntensity: 0.5,
    sunColor: "#FFFFFF"
  },
  {
    name: "Dusk",
    azimuth: 270,
    elevation: 10,
    sunIntensity: 1.0,
    ambientIntensity: 0.25,
    sunColor: "#FF8C42"
  },
  {
    name: "Night",
    azimuth: 0,
    elevation: -30,
    sunIntensity: 0.1,
    ambientIntensity: 0.05,
    sunColor: "#4A5899"
  }
];

interface SurfaceLightingState {
  // Manual override state
  manualOverride: boolean;
  setManualOverride: (enabled: boolean) => void;

  // Manual lighting parameters
  sunAzimuth: number;
  setSunAzimuth: (azimuth: number) => void;
  
  sunElevation: number;
  setSunElevation: (elevation: number) => void;
  
  sunIntensity: number;
  setSunIntensity: (intensity: number) => void;
  
  ambientIntensity: number;
  setAmbientIntensity: (intensity: number) => void;

  sunColor: string;
  setSunColor: (color: string) => void;

  // Current time of day (for display)
  currentTimeOfDay: string;
  setCurrentTimeOfDay: (time: string) => void;

  // Apply preset
  applyPreset: (preset: TimeOfDayPreset) => void;

  // Calculate sun position from azimuth and elevation
  calculateSunPosition: () => THREE.Vector3;

  // Get current lighting data (either manual or automatic)
  getCurrentLightingData: (automaticData?: {
    sunPosition: THREE.Vector3;
    sunIntensity: number;
    ambientIntensity: number;
    sunColor?: string;
  }) => {
    sunPosition: THREE.Vector3;
    sunIntensity: number;
    ambientIntensity: number;
    sunColor: string;
  };
}

export const useSurfaceLighting = create<SurfaceLightingState>((set, get) => ({
  // Initialize with noon preset values
  manualOverride: false,
  sunAzimuth: 180,
  sunElevation: 45,
  sunIntensity: 2.5,
  ambientIntensity: 0.4,
  sunColor: "#FFFFFF",
  currentTimeOfDay: "Automatic",

  setManualOverride: (enabled) => {
    set({ 
      manualOverride: enabled,
      currentTimeOfDay: enabled ? "Manual" : "Automatic"
    });
  },

  setSunAzimuth: (azimuth) => set({ sunAzimuth: azimuth }),
  setSunElevation: (elevation) => set({ sunElevation: elevation }),
  setSunIntensity: (intensity) => set({ sunIntensity: intensity }),
  setAmbientIntensity: (intensity) => set({ ambientIntensity: intensity }),
  setSunColor: (color) => set({ sunColor: color }),
  setCurrentTimeOfDay: (time) => set({ currentTimeOfDay: time }),

  applyPreset: (preset) => {
    set({
      sunAzimuth: preset.azimuth,
      sunElevation: preset.elevation,
      sunIntensity: preset.sunIntensity,
      ambientIntensity: preset.ambientIntensity,
      sunColor: preset.sunColor || "#FFFFFF",
      currentTimeOfDay: preset.name
    });
  },

  calculateSunPosition: () => {
    const state = get();
    const distance = 200; // Distance from origin for sun position

    // Convert azimuth and elevation to radians
    const azimuthRad = (state.sunAzimuth * Math.PI) / 180;
    const elevationRad = (state.sunElevation * Math.PI) / 180;

    // Calculate sun position using spherical coordinates
    const x = distance * Math.cos(elevationRad) * Math.sin(azimuthRad);
    const y = distance * Math.sin(elevationRad);
    const z = distance * Math.cos(elevationRad) * Math.cos(azimuthRad);

    return new THREE.Vector3(x, y, z);
  },

  getCurrentLightingData: (automaticData) => {
    const state = get();

    if (!state.manualOverride && automaticData) {
      // Use automatic lighting data from orbital mechanics
      return {
        sunPosition: automaticData.sunPosition,
        sunIntensity: automaticData.sunIntensity,
        ambientIntensity: automaticData.ambientIntensity,
        sunColor: automaticData.sunColor || "#FFFFFF"
      };
    }

    // Use manual override settings
    return {
      sunPosition: state.calculateSunPosition(),
      sunIntensity: state.sunIntensity,
      ambientIntensity: state.ambientIntensity,
      sunColor: state.sunColor
    };
  }
}));