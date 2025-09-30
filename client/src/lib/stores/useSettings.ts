import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Controls, DEFAULT_KEYBINDS } from "../controls";

interface SettingsState {
  sensitivity: number;
  invertY: boolean;
  keybinds: Record<string, string[]>;
  
  setSensitivity: (sensitivity: number) => void;
  setInvertY: (invert: boolean) => void;
  updateKeybind: (action: string, keys: string[]) => void;
  resetToDefaults: () => void;
  getKeyboardMap: () => Array<{ name: Controls; keys: string[] }>;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      sensitivity: 0.001,
      invertY: false,
      keybinds: { ...DEFAULT_KEYBINDS },

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

      resetToDefaults: () => {
        set({
          sensitivity: 0.001,
          invertY: false,
          keybinds: { ...DEFAULT_KEYBINDS },
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
