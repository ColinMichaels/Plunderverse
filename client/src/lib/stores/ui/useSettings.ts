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
  
  setSensitivity: (sensitivity: number) => void;
  setInvertY: (invert: boolean) => void;
  updateKeybind: (action: string, keys: string[]) => void;
  setGraphicsQuality: (quality: 'low' | 'medium' | 'high') => void;
  setEnableDynamicLights: (enable: boolean) => void;
  setEnableParticles: (enable: boolean) => void;
  setEnableBloom: (enable: boolean) => void;
  resetToDefaults: () => void;
  getKeyboardMap: () => Array<{ name: Controls; keys: string[] }>;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      sensitivity: 0.001,
      invertY: false,
      keybinds: { ...DEFAULT_KEYBINDS },
      graphicsQuality: 'medium',
      enableDynamicLights: true,
      enableParticles: true,
      enableBloom: true,

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

      resetToDefaults: () => {
        set({
          sensitivity: 0.001,
          invertY: false,
          keybinds: { ...DEFAULT_KEYBINDS },
          graphicsQuality: 'medium',
          enableDynamicLights: true,
          enableParticles: true,
          enableBloom: true,
        });
      },

      getKeyboardMap: () => {
        const state = get();
        return Object.entries(state.keybinds).map(([name, keys]) => ({
          name: name as Controls,
          keys,
        }));
      },
    }),
    {
      name: "settings",
    }
  )
);
