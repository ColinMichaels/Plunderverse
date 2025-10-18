import { create } from 'zustand';

export interface InputState {
  // Input actions
  look: (delta: { x: number; y: number }) => void;
  move: (vector: { x: number; y: number; z: number }) => void;
  shoot: () => void;
  land: () => void;
  
  // Control state
  isGyroEnabled: boolean;
  setGyroEnabled: (enabled: boolean) => void;
  
  // Mouse steering state
  isMouseSteering: boolean;
  setMouseSteering: (steering: boolean) => void;
  
  // Mobile state
  isMobile: boolean;
  isDragging: boolean;
  setDragging: (dragging: boolean) => void;
}

export const useInput = create<InputState>((set) => ({
  // Default implementations - will be overridden by game components
  look: () => {},
  move: () => {},
  shoot: () => {},
  land: () => {},
  
  // Control state
  isGyroEnabled: false,
  setGyroEnabled: (enabled: boolean) => set({ isGyroEnabled: enabled }),
  
  // Mouse steering state
  isMouseSteering: false,
  setMouseSteering: (steering: boolean) => set({ isMouseSteering: steering }),
  
  // Mobile detection
  isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
  isDragging: false,
  setDragging: (dragging: boolean) => set({ isDragging: dragging }),
}));

// Helper to bind input handlers from game components
export const bindInputHandlers = (handlers: {
  onLook?: (delta: { x: number; y: number }) => void;
  onMove?: (vector: { x: number; y: number; z: number }) => void;
  onShoot?: () => void;
  onLand?: () => void;
  onSetGyroEnabled?: (enabled: boolean) => void;
  onSetDragging?: (dragging: boolean) => void;
}) => {
  const updates: Partial<InputState> = {};
  
  // Only update handlers that are provided
  if (handlers.onLook) updates.look = handlers.onLook;
  if (handlers.onMove) updates.move = handlers.onMove;
  if (handlers.onShoot) updates.shoot = handlers.onShoot;
  if (handlers.onLand) updates.land = handlers.onLand;
  // Don't override setters - they're implemented in the store
  
  useInput.setState(updates);
};