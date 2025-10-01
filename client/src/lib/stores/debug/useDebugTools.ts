import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface DebugToolsState {
  isVisible: boolean;
  timeScale: number;
  showCollisionBoxes: boolean;
  showWireframes: boolean;
  selectedDebugPlanet: string | null;
  
  // Actions
  toggleVisibility: () => void;
  setTimeScale: (scale: number) => void;
  toggleCollisionBoxes: () => void;
  toggleWireframes: () => void;
  setSelectedDebugPlanet: (planet: string | null) => void;
  resetDebug: () => void;
}

export const useDebugTools = create<DebugToolsState>()(
  persist(
    (set, get) => ({
      // State properties
      isVisible: false,
      timeScale: 1,
      showCollisionBoxes: false,
      showWireframes: false,
      selectedDebugPlanet: null,
      
      // Actions
      toggleVisibility: () => {
        set((state) => ({ isVisible: !state.isVisible }));
      },
      
      setTimeScale: (scale: number) => {
        // Clamp the value between 0 and 10 (0 = paused)
        const clampedScale = Math.max(0, Math.min(10, scale));
        set({ timeScale: clampedScale });
      },
      
      toggleCollisionBoxes: () => {
        set((state) => ({ showCollisionBoxes: !state.showCollisionBoxes }));
      },
      
      toggleWireframes: () => {
        set((state) => ({ showWireframes: !state.showWireframes }));
      },
      
      setSelectedDebugPlanet: (planet: string | null) => {
        set({ selectedDebugPlanet: planet });
      },
      
      resetDebug: () => {
        set({
          timeScale: 1,
          showCollisionBoxes: false,
          showWireframes: false,
          selectedDebugPlanet: null,
        });
      },
    }),
    {
      name: "debug-tools",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ isVisible: state.isVisible }),
    }
  )
);
