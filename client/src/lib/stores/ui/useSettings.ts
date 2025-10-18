import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Controls, DEFAULT_KEYBINDS } from "../../controls";

interface SettingsState {
  sensitivity: number;
  invertY: boolean;
  keybinds: Record<string, string[]>;
  graphicsQuality: 'low' | 'medium' | 'high';
  enableDynamicLights: boolean;
  enableParticles: boolean;
  enableBloom: boolean;
  
  // Mining effect settings
  miningEffectsIntensity: number; // 0-1 overall intensity
  enableScreenShake: boolean;
  enableVisualEffects: boolean;
  
  setSensitivity: (sensitivity: number) => void;
  setInvertY: (invert: boolean) => void;
  updateKeybind: (action: string, keys: string[]) => void;
  setGraphicsQuality: (quality: 'low' | 'medium' | 'high') => void;
  setEnableDynamicLights: (enable: boolean) => void;
  setEnableParticles: (enable: boolean) => void;
  setEnableBloom: (enable: boolean) => void;
  
  // Mining effect setters
  setMiningEffectsIntensity: (intensity: number) => void;
  setEnableScreenShake: (enable: boolean) => void;
  setEnableVisualEffects: (enable: boolean) => void;
  
  resetToDefaults: () => void;
  getKeyboardMap: () => Array<{ name: Controls; keys: string[] }>;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => {
      // Store reference for other systems to access settings
      if (typeof window !== 'undefined') {
        (window as any).settingsStore = get;
      }
      
      return {
      sensitivity: 0.02, // Increased from 0.004 to 0.02 for snappy combat aiming
      invertY: false,
      keybinds: { ...DEFAULT_KEYBINDS },
      graphicsQuality: 'medium',
      enableDynamicLights: true,
      enableParticles: true,
      enableBloom: true,
      
      // Mining effect defaults
      miningEffectsIntensity: 1.0,
      enableScreenShake: true,
      enableVisualEffects: true,

      setSensitivity: (sensitivity: number) => {
        set({ sensitivity });
      },

      setInvertY: (invert: boolean) => {
        set({ invertY: invert });
      },

      updateKeybind: (action: string, keys: string[]) => {
        set((state) => ({
          keybinds: {
            ...state.keybinds,
            [action]: keys,
          },
        }));
      },

      setGraphicsQuality: (quality: 'low' | 'medium' | 'high') => {
        set({ 
          graphicsQuality: quality,
          // Auto-adjust features based on quality
          enableDynamicLights: quality !== 'low',
          enableParticles: quality !== 'low',
          enableBloom: quality === 'high'
        });
      },

      setEnableDynamicLights: (enable: boolean) => {
        set({ enableDynamicLights: enable });
      },

      setEnableParticles: (enable: boolean) => {
        set({ enableParticles: enable });
      },

      setEnableBloom: (enable: boolean) => {
        set({ enableBloom: enable });
      },

      setMiningEffectsIntensity: (intensity: number) => {
        set({ miningEffectsIntensity: Math.max(0, Math.min(1, intensity)) });
      },

      setEnableScreenShake: (enable: boolean) => {
        set({ enableScreenShake: enable });
      },

      setEnableVisualEffects: (enable: boolean) => {
        set({ enableVisualEffects: enable });
      },

      resetToDefaults: () => {
        set({
          sensitivity: 0.02, // Increased from 0.004 to 0.02 for snappy combat aiming
          invertY: false,
          keybinds: { ...DEFAULT_KEYBINDS },
          graphicsQuality: 'medium',
          enableDynamicLights: true,
          enableParticles: true,
          enableBloom: true,
          miningEffectsIntensity: 1.0,
          enableScreenShake: true,
          enableVisualEffects: true,
        });
      },

      getKeyboardMap: () => {
        const state = get();
        return Object.entries(state.keybinds).map(([name, keys]) => ({
          name: name as Controls,
          keys,
        }));
      },
    };
    },
    {
      name: "settings",
    }
  )
);
