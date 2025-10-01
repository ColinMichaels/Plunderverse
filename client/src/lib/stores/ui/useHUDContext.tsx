import { create } from 'zustand';
import { useLandedState } from '../surface/useLandedState';
import { useMining } from '../economy/useMining';
import { useShipStatus } from '../ship/useShipStatus';
import { useAutopilot } from '../navigation/useAutopilot';
import { useShooting } from '../combat/useShooting';
import { useHeatSystem } from '../player/useHeatSystem';
import { useSolarSystem } from '../space/useSolarSystem';
import { planets } from '../../planetData';
import { calculatePlanetPosition } from '../../utils3d';

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
  dockedStationName: string | null;
  
  // Combat tracking
  lastDamageTime: number;
  lastShotTime: number;
  combatCooldown: number; // 5 seconds after last shot/damage
  
  // Transition state
  isTransitioning: boolean;
  transitionDuration: number;
  
  // Enhanced context data
  nearestPlanet: string | null;
  distanceToNearest: number;
  
  // Manual override for panel visibility
  manualPanelOverride: boolean;
  panelOverrideTimeout: NodeJS.Timeout | null;
  
  // Actions
  detectContext: () => void;
  setContext: (context: GameContext, smooth?: boolean) => void;
  updateZoneVisibility: (zone: keyof UIZoneVisibility, visible: boolean) => void;
  getContextPriority: (context: GameContext) => number;
  getContextVisibility: (context: GameContext) => UIZoneVisibility;
  startContextMonitoring: () => void;
  
  // New actions for enhanced detection
  setDocked: (docked: boolean, stationName?: string) => void;
  setMinigame: (active: boolean) => void;
  registerDamage: () => void;
  registerShot: () => void;
  updateNearestPlanet: (planet: string | null, distance: number) => void;
  
  // Manual override actions
  setManualPanelOverride: (override: boolean) => void;
  refreshPanelOverrideTimeout: () => void;
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
  dockedStationName: null,
  
  lastDamageTime: 0,
  lastShotTime: 0,
  combatCooldown: 5000, // 5 seconds
  
  isTransitioning: false,
  transitionDuration: 300, // 300ms default transition
  
  nearestPlanet: null,
  distanceToNearest: Infinity,
  
  // Manual override state
  manualPanelOverride: false,
  panelOverrideTimeout: null,
  
  detectContext: () => {
    const state = get();
    const landedState = useLandedState.getState();
    const miningState = useMining.getState();
    const shipState = useShipStatus.getState();
    const autopilotState = useAutopilot.getState();
    const shootingState = useShooting.getState();
    const heatState = useHeatSystem.getState();
    
    const currentTime = Date.now();
    
    // Enhanced combat detection
    const recentDamage = currentTime - state.lastDamageTime < state.combatCooldown;
    const recentShot = currentTime - state.lastShotTime < state.combatCooldown;
    const hasProjectiles = shootingState.projectiles.length > 0;
    const hasPatrolEncounter = heatState.patrolEncounter !== null;
    const inCombat = recentDamage || recentShot || hasProjectiles || hasPatrolEncounter;
    
    let newContext: GameContext = 'space-flight';
    let contextPriority = 0;
    
    // Priority system for context detection (higher priority wins)
    const contexts: { context: GameContext; condition: boolean; priority: number }[] = [
      { 
        context: 'planet-surface', 
        condition: landedState.isLanded && !miningState.isActive,
        priority: 10
      },
      { 
        context: 'mining', 
        condition: miningState.isActive && landedState.isLanded,
        priority: 15
      },
      { 
        context: 'combat', 
        condition: inCombat && !landedState.isLanded,
        priority: 20
      },
      { 
        context: 'docked', 
        condition: state.isDocked,
        priority: 12
      },
      { 
        context: 'minigame', 
        condition: state.isInMinigame,
        priority: 25
      },
      { 
        context: 'autopilot', 
        condition: autopilotState.isActive && !landedState.isLanded && !inCombat,
        priority: 5
      },
      { 
        context: 'space-flight', 
        condition: !landedState.isLanded && !autopilotState.isActive && !inCombat,
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
      
      // Trigger smooth transition
      set({
        isTransitioning: true,
        isInCombat: inCombat,
        isInWarp: shipState.isWarpMode
      });
      
      // Delayed visibility update for smooth transition
      setTimeout(() => {
        const visibility = get().getContextVisibility(newContext);
        // Preserve rightSidebar visibility if manual override is active
        const finalVisibility = state.manualPanelOverride 
          ? { ...visibility, rightSidebar: true } 
          : visibility;
        
        set({
          previousContext: state.currentContext,
          currentContext: newContext,
          uiZoneVisibility: finalVisibility,
          isTransitioning: false
        });
      }, 150);
    } else {
      // Update combat state even if context hasn't changed
      set({
        isInCombat: inCombat,
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
          bottomCenter: true, // Station services
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
  
  setContext: (context: GameContext, smooth = true) => {
    const state = get();
    if (context !== state.currentContext) {
      if (smooth) {
        set({ isTransitioning: true });
        
        setTimeout(() => {
          const visibility = get().getContextVisibility(context);
          set({
            previousContext: state.currentContext,
            currentContext: context,
            uiZoneVisibility: visibility,
            isTransitioning: false
          });
        }, state.transitionDuration / 2);
      } else {
        const visibility = get().getContextVisibility(context);
        set({
          previousContext: state.currentContext,
          currentContext: context,
          uiZoneVisibility: visibility
        });
      }
      
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
  
  setDocked: (docked: boolean, stationName?: string) => {
    set({
      isDocked: docked,
      dockedStationName: stationName || null
    });
    
    if (docked) {
      console.log(`[HUD Context] Docked at ${stationName || 'station'}`);
    } else {
      console.log('[HUD Context] Undocked from station');
    }
  },
  
  setMinigame: (active: boolean) => {
    set({ isInMinigame: active });
    console.log(`[HUD Context] Minigame ${active ? 'started' : 'ended'}`);
  },
  
  registerDamage: () => {
    set({ lastDamageTime: Date.now() });
    console.log('[HUD Context] Damage registered');
  },
  
  registerShot: () => {
    set({ lastShotTime: Date.now() });
  },
  
  updateNearestPlanet: (planet: string | null, distance: number) => {
    set({
      nearestPlanet: planet,
      distanceToNearest: distance
    });
  },
  
  setManualPanelOverride: (override: boolean) => {
    const state = get();
    
    // Clear existing timeout if any
    if (state.panelOverrideTimeout) {
      clearTimeout(state.panelOverrideTimeout);
    }
    
    if (override) {
      // Set manual override and create auto-reset timeout
      const timeout = setTimeout(() => {
        console.log('[HUD Context] Auto-resetting manual panel override after 30s');
        get().setManualPanelOverride(false);
      }, 30000); // 30 seconds
      
      set({
        manualPanelOverride: true,
        panelOverrideTimeout: timeout,
        uiZoneVisibility: {
          ...state.uiZoneVisibility,
          rightSidebar: true // Ensure panels are visible
        }
      });
      
      console.log('[HUD Context] Manual panel override activated');
    } else {
      set({
        manualPanelOverride: false,
        panelOverrideTimeout: null
      });
      
      // Re-apply context visibility without override
      const visibility = get().getContextVisibility(state.currentContext);
      set({ uiZoneVisibility: visibility });
      
      console.log('[HUD Context] Manual panel override deactivated');
    }
  },
  
  refreshPanelOverrideTimeout: () => {
    const state = get();
    
    if (state.manualPanelOverride && state.panelOverrideTimeout) {
      // Clear and reset the timeout
      clearTimeout(state.panelOverrideTimeout);
      
      const timeout = setTimeout(() => {
        console.log('[HUD Context] Auto-resetting manual panel override after 30s');
        get().setManualPanelOverride(false);
      }, 30000);
      
      set({ panelOverrideTimeout: timeout });
    }
  },
  
  startContextMonitoring: () => {
    // Start automatic context detection
    const intervalId = setInterval(() => {
      get().detectContext();
      
      // Also update nearest planet info
      const solarSystem = useSolarSystem.getState();
      if (solarSystem.cameraPosition) {
        let nearest = null;
        let minDist = Infinity;
        
        // Use the imported planets array and calculate their current positions
        planets.forEach(planet => {
          // Calculate the planet's current position based on time
          const planetPosition = calculatePlanetPosition(planet, solarSystem.time);
          
          const dist = Math.sqrt(
            Math.pow(planetPosition.x - solarSystem.cameraPosition.x, 2) +
            Math.pow(planetPosition.y - solarSystem.cameraPosition.y, 2) +
            Math.pow(planetPosition.z - solarSystem.cameraPosition.z, 2)
          );
          
          if (dist < minDist) {
            minDist = dist;
            nearest = planet.name;
          }
        });
        
        get().updateNearestPlanet(nearest, minDist);
      }
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