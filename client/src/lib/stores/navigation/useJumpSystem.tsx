import { create } from 'zustand';
import { useHeatSystem } from '../player/useHeatSystem';
import { useShipStatus } from '../ship/useShipStatus';

interface Vec3 { x: number; y: number; z: number }

interface JumpSystemState {
  isJumping: boolean;
  jumpCooldown: number;
  lastJumpTime: number;

  initiateJump: (targetPosition: Vec3) => boolean;
  completeJump: () => void;
  checkForPatrolEncounter: () => void;
}

export const useJumpSystem = create<JumpSystemState>((set, get) => ({
  isJumping: false,
  jumpCooldown: 5000,
  lastJumpTime: 0,

  initiateJump: (_targetPosition: Vec3): boolean => {
    const state = get();
    const now = Date.now();

    if (now - state.lastJumpTime < state.jumpCooldown) return false;
    if (state.isJumping) return false;

    const shipStatus = useShipStatus.getState();
    if (shipStatus.hull < 20) return false;

    set({ isJumping: true, lastJumpTime: now });

    setTimeout(() => state.completeJump(), 2000);
    return true;
  },

  completeJump: () => {
    const state = get();
    set({ isJumping: false });
    state.checkForPatrolEncounter();
  },

  checkForPatrolEncounter: () => {
    const heatSystem = useHeatSystem.getState();
    heatSystem.triggerPatrolEncounter();
  }
}));
