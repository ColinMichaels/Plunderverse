import { create } from "zustand";

interface FocusState {
  hasFocus: boolean;
  isPaused: boolean;
  setFocus: (focused: boolean) => void;
  setPaused: (paused: boolean) => void;
}

export const useFocusState = create<FocusState>((set) => ({
  hasFocus: true,
  isPaused: false,
  setFocus: (focused: boolean) => set({ 
    hasFocus: focused,
    isPaused: !focused // Auto-pause when losing focus
  }),
  setPaused: (paused: boolean) => set({ isPaused: paused }),
}));