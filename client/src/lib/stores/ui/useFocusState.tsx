import { create } from "zustand";

interface FocusState {
  hasFocus: boolean;
  isPaused: boolean;
  isInteractingWithUI: boolean;
  hoveredUIElements: Set<string>;
  setFocus: (focused: boolean) => void;
  setPaused: (paused: boolean) => void;
  setUIInteraction: (elementId: string, isHovering: boolean) => void;
  clearUIInteraction: () => void;
  isControlsEnabled: () => boolean;
}

export const useFocusState = create<FocusState>((set, get) => ({
  hasFocus: true,
  isPaused: false,
  isInteractingWithUI: false,
  hoveredUIElements: new Set(),
  
  setFocus: (focused: boolean) => set({ 
    hasFocus: focused,
    isPaused: !focused // Auto-pause when losing focus
  }),
  
  setPaused: (paused: boolean) => set({ isPaused: paused }),
  
  setUIInteraction: (elementId: string, isHovering: boolean) => {
    set((state) => {
      const newHoveredElements = new Set(state.hoveredUIElements);
      
      if (isHovering) {
        newHoveredElements.add(elementId);
      } else {
        newHoveredElements.delete(elementId);
      }
      
      const isInteractingWithUI = newHoveredElements.size > 0;
      
      // Log UI interaction state changes for debugging
      if (state.isInteractingWithUI !== isInteractingWithUI) {
        console.log(`[UI-FOCUS] Controls ${isInteractingWithUI ? 'disabled' : 'enabled'} - hovering: ${Array.from(newHoveredElements).join(', ')}`);
      }
      
      return {
        hoveredUIElements: newHoveredElements,
        isInteractingWithUI
      };
    });
  },
  
  clearUIInteraction: () => set({ 
    hoveredUIElements: new Set(),
    isInteractingWithUI: false 
  }),
  
  isControlsEnabled: () => {
    const state = get();
    return state.hasFocus && !state.isPaused && !state.isInteractingWithUI;
  }
}));