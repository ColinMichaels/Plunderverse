import { create } from "zustand";

interface FocusState {
  hasFocus: boolean;
  setFocus: (focused: boolean) => void;
}

export const useFocusState = create<FocusState>((set) => ({
  hasFocus: true,
  setFocus: (focused: boolean) => set({ hasFocus: focused }),
}));