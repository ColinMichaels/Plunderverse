import { create } from 'zustand';
import { useHeatSystem } from '../player/useHeatSystem';
import { useShipStatus } from '../ship/useShipStatus';
import { Vector3 } from 'three';

interface JumpSystemState {
  isJumping: boolean;
  jumpCooldown: number;
  lastJumpTime: number;
  
  // Actions
  initiateJump: (targetPosition: Vector3) => boolean;
  completeJump: () => void;
  checkForPatrolEncounter: () => void;
}

export const useJumpSystem = create<JumpSystemState>((set, get) => ({
  isJumping: false,
  jumpCooldown: 5000, // 5 seconds between jumps
  lastJumpTime: 0,
  
  initiateJump: (targetPosition: Vector3): boolean => {
    const state = get();
    const now = Date.now();
    
    // Check cooldown
    if (now - state.lastJumpTime < state.jumpCooldown) {
      console.log('[JumpSystem] Jump on cooldown');
      return false;
    }
    
    // Check if already jumping
    if (state.isJumping) {
      console.log('[JumpSystem] Already jumping');
      return false;
    }
    
    // Check ship status
    const shipStatus = useShipStatus.getState();
    if (shipStatus.hull < 20) {
      console.log('[JumpSystem] Hull too damaged to jump');
      return false;
    }
    
    set({
      isJumping: true,
      lastJumpTime: now
    });
    
    // Simulate jump duration
    setTimeout(() => {
      state.completeJump();
    }, 2000); // 2 second jump
    
    console.log('[JumpSystem] Jump initiated');
    return true;
  },
  
  completeJump: () => {
    const state = get();
    
    set({ isJumping: false });
    
    // Check for patrol encounter after jump
    state.checkForPatrolEncounter();
    
    console.log('[JumpSystem] Jump completed');
  },
  
  checkForPatrolEncounter: () => {
    const heatSystem = useHeatSystem.getState();
    
    // Trigger patrol encounter based on heat level
    const encountered = heatSystem.triggerPatrolEncounter();
    
    if (encountered) {
      console.log('[JumpSystem] Patrol encounter triggered after jump!');
      
      // Could play alert sound or show warning
      // This is handled by the PatrolEncounter component
    }
  }
}));