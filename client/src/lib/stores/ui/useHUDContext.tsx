import { create } from 'zustand';
import { useLandedState } from '../surface/useLandedState';
import { useMining } from '../economy/useMining';
import { useShipStatus } from '../ship/useShipStatus';
import { useAutopilot } from '../navigation/useAutopilot';
import { useShooting } from '../combat/useShooting';
import { useHeatSystem } from '../player/useHeatSystem';

export type GameContext = 
  | 'space-flight'
  | 'planet-surface' 
  | 'mining'
  | 'combat'
  | 'docked'
  | 'minigame'
  | 'autopilot';

export interface UIZoneVisibility {
  topLeft: boolean;    // Ship Core Status
  topRight: boolean;   // Mission Context
  bottomCenter: boolean; // Primary Controls
  rightSidebar: boolean; // Panels
}

interface HUDContextState {
  currentContext: GameContext;
  previousContext: GameContext | null;
  uiZoneVisibility: UIZoneVisibility;
  
  // Context detection flags
  isInCombat: boolean;
  isInWarp: boolean;
  isDocked: boolean;
  isInMinigame: boolean;
  
  // Actions
  detectContext: () => void;
  setContext: (context: GameContext) => void;
  updateZoneVisibility: (zone: keyof UIZoneVisibility, visible: boolean) => void;
  getContextPriority: (context: GameContext) => number;
  getContextVisibility: (context: GameContext) => UIZoneVisibility;
  startContextMonitoring: () => void;
}

export const useHUDContext = create<HUDContextState>((set, get) => ({
  currentContext: 'space-flight',
  previousContext: null,
  uiZoneVisibility: {
    topLeft: true,
    topRight: true,
    bottomCenter: true,
    rightSidebar: true
  },
  
  isInCombat: false,
  isInWarp: false,
  isDocked: false,
  isInMinigame: false,
  
  detectContext: () => {
    const state = get();
    const landedState = useLandedState.getState();
    const miningState = useMining.getState();
    const shipState = useShipStatus.getState();
    const autopilotState = useAutopilot.getState();
    const shootingState = useShooting.getState();
    const heatState = useHeatSystem.getState();
    
    let newContext: GameContext = 'space-flight';
    let contextPriority = 0;
    
    // Priority system for context detection (higher priority wins)
    const contexts: { context: GameContext; condition: boolean; priority: number }[] = [
      { 
        context: 'planet-surface', 
        condition: landedState.isLanded,
        priority: 10
      },
      { 
        context: 'mining', 
        condition: miningState.isActive && landedState.isLanded,
        priority: 15
      },
      { 
        context: 'combat', 
        condition: shootingState.projectiles.length > 0 || heatState.patrolEncounter !== null,
        priority: 20
      },
      { 
        context: 'docked', 
        condition: state.isDocked, // This would be set by docking system
        priority: 12
      },
      { 
        context: 'minigame', 
        condition: state.isInMinigame, // Set by minigame triggers
        priority: 25
      },
      { 
        context: 'autopilot', 
        condition: autopilotState.isActive && !landedState.isLanded,
        priority: 5
      },
      { 
        context: 'space-flight', 
        condition: !landedState.isLanded && !autopilotState.isActive,
        priority: 1
      }
    ];
    
    // Find the highest priority active context
    for (const ctx of contexts) {
      if (ctx.condition && ctx.priority > contextPriority) {
        newContext = ctx.context;
        contextPriority = ctx.priority;
      }
    }
    
    // Update context if changed
    if (newContext !== state.currentContext) {
      console.log(`[HUD Context] Switching from ${state.currentContext} to ${newContext}`);
      
      // Update visibility based on new context
      const visibility = get().getContextVisibility(newContext);
      
      set({
        previousContext: state.currentContext,
        currentContext: newContext,
        uiZoneVisibility: visibility,
        isInCombat: shootingState.projectiles.length > 0,
        isInWarp: shipState.isWarpMode
      });
    }
  },
  
  getContextVisibility: (context: GameContext): UIZoneVisibility => {
    switch (context) {
      case 'planet-surface':
        return {
          topLeft: true,   // Ship status still important
          topRight: false, // Hide missions on surface
          bottomCenter: true, // Show surface controls
          rightSidebar: false // Hide most panels
        };
        
      case 'mining':
        return {
          topLeft: true,   // Equipment status critical
          topRight: false, // Hide missions during mining
          bottomCenter: true, // Mining controls
          rightSidebar: false // Focus on mining
        };
        
      case 'combat':
        return {
          topLeft: true,   // Critical ship info
          topRight: false, // Hide missions in combat
          bottomCenter: true, // Combat controls
          rightSidebar: false // Hide panels during combat
        };
        
      case 'docked':
        return {
          topLeft: false,  // Ship status less important
          topRight: true,  // Show missions/economy
          bottomCenter: false, // No flight controls
          rightSidebar: true  // All panels accessible
        };
        
      case 'minigame':
        return {
          topLeft: false,  // Hide most UI
          topRight: false,
          bottomCenter: true, // Minigame controls
          rightSidebar: false
        };
        
      case 'autopilot':
        return {
          topLeft: true,
          topRight: true,
          bottomCenter: true, // Show autopilot status
          rightSidebar: true
        };
        
      case 'space-flight':
      default:
        return {
          topLeft: true,
          topRight: true,
          bottomCenter: true,
          rightSidebar: true
        };
    }
  },
  
  setContext: (context: GameContext) => {
    const state = get();
    if (context !== state.currentContext) {
      const visibility = get().getContextVisibility(context);
      
      set({
        previousContext: state.currentContext,
        currentContext: context,
        uiZoneVisibility: visibility
      });
      
      console.log(`[HUD Context] Manually set to ${context}`);
    }
  },
  
  updateZoneVisibility: (zone: keyof UIZoneVisibility, visible: boolean) => {
    set(state => ({
      uiZoneVisibility: {
        ...state.uiZoneVisibility,
        [zone]: visible
      }
    }));
  },
  
  getContextPriority: (context: GameContext): number => {
    const priorities: Record<GameContext, number> = {
      'space-flight': 1,
      'autopilot': 5,
      'planet-surface': 10,
      'docked': 12,
      'mining': 15,
      'combat': 20,
      'minigame': 25
    };
    
    return priorities[context] || 0;
  },
  
  startContextMonitoring: () => {
    // Start automatic context detection
    const intervalId = setInterval(() => {
      get().detectContext();
    }, 100); // Check context every 100ms
    
    // Store interval ID for cleanup if needed
    if (typeof window !== 'undefined') {
      (window as any).__hudContextInterval = intervalId;
    }
    
    console.log('[HUD Context] Started context monitoring');
  }
}));

// Auto-start context monitoring when store is created
if (typeof window !== 'undefined') {
  setTimeout(() => {
    useHUDContext.getState().startContextMonitoring();
  }, 1000);
}