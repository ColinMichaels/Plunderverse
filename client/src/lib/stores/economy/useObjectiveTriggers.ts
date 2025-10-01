import { create } from 'zustand';
import { 
  Mission, 
  MissionObjective, 
  ObjectiveTriggerType, 
  ObjectiveTriggerData,
  Coordinate3D
} from '../../plunderverse/types';
import { usePlunderverseMissions } from './usePlunderverseMissions';

interface TriggerListener {
  missionId: string;
  objectiveId: string;
  triggerType: ObjectiveTriggerType;
  triggerData: ObjectiveTriggerData;
  callback?: (progress: number) => void;
}

interface ObjectiveTriggerState {
  // Registry of active listeners
  activeListeners: Map<string, TriggerListener[]>; // objectiveId -> listeners
  
  // Progress tracking
  progressData: Map<string, ObjectiveTriggerData>; // objectiveId -> current trigger data
  
  // Registration and management
  registerObjective: (mission: Mission, objective: MissionObjective) => void;
  unregisterObjective: (objectiveId: string) => void;
  unregisterMission: (missionId: string) => void;
  
  // Progress reporting - main API for game components
  reportObjectiveProgress: (objectiveId: string, data: Partial<ObjectiveTriggerData>) => void;
  reportProgress: (type: ObjectiveTriggerType, data: any) => void; // Generic progress report
  
  // Specific trigger reporting
  reportLocationProgress: (location: string | undefined, coordinates?: Coordinate3D, planet?: string) => void;
  reportCollectionProgress: (itemId: string, itemType?: string, quantity?: number) => void;
  reportCombatProgress: (enemyType?: string, enemyFaction?: string, count?: number) => void;
  reportInteractionProgress: (interactionId: string) => void;
  reportCustomProgress: (condition: string, value: number) => void;
  
  // Check and update objectives
  checkObjectiveCompletion: (objectiveId: string) => boolean;
  updateObjectiveProgress: (missionId: string, objectiveId: string, progress: number) => void;
  
  // Utility
  getActiveObjectives: () => MissionObjective[];
  clearAll: () => void;
  initializeFromMissions: (missions: Mission[]) => void;
}

export const useObjectiveTriggers = create<ObjectiveTriggerState>((set, get) => ({
  activeListeners: new Map(),
  progressData: new Map(),
  
  registerObjective: (mission: Mission, objective: MissionObjective) => {
    const state = get();
    const triggerType = objective.triggerType || objective.type as ObjectiveTriggerType;
    
    if (!triggerType) return;
    
    const listener: TriggerListener = {
      missionId: mission.id,
      objectiveId: objective.id,
      triggerType,
      triggerData: objective.triggerData || {
        type: triggerType,
        currentValue: 0,
        targetValue: objective.quantity || 1
      }
    };
    
    // Register by objective ID
    const listeners = state.activeListeners.get(objective.id) || [];
    listeners.push(listener);
    
    const newListeners = new Map(state.activeListeners);
    newListeners.set(objective.id, listeners);
    
    // Initialize progress data
    const newProgressData = new Map(state.progressData);
    newProgressData.set(objective.id, listener.triggerData);
    
    set({
      activeListeners: newListeners,
      progressData: newProgressData
    });
    
    console.log(`[ObjectiveTriggers] Registered objective ${objective.id} with trigger type ${triggerType}`);
  },
  
  unregisterObjective: (objectiveId: string) => {
    const state = get();
    const newListeners = new Map(state.activeListeners);
    const newProgressData = new Map(state.progressData);
    
    newListeners.delete(objectiveId);
    newProgressData.delete(objectiveId);
    
    set({
      activeListeners: newListeners,
      progressData: newProgressData
    });
    
    console.log(`[ObjectiveTriggers] Unregistered objective ${objectiveId}`);
  },
  
  unregisterMission: (missionId: string) => {
    const state = get();
    const newListeners = new Map(state.activeListeners);
    const newProgressData = new Map(state.progressData);
    
    // Remove all listeners for this mission
    Array.from(newListeners.entries()).forEach(([objectiveId, listeners]) => {
      const filtered = listeners.filter(l => l.missionId !== missionId);
      if (filtered.length === 0) {
        newListeners.delete(objectiveId);
        newProgressData.delete(objectiveId);
      } else {
        newListeners.set(objectiveId, filtered);
      }
    });
    
    set({
      activeListeners: newListeners,
      progressData: newProgressData
    });
    
    console.log(`[ObjectiveTriggers] Unregistered all objectives for mission ${missionId}`);
  },
  
  reportObjectiveProgress: (objectiveId: string, data: Partial<ObjectiveTriggerData>) => {
    const state = get();
    const listeners = state.activeListeners.get(objectiveId);
    
    if (!listeners || listeners.length === 0) {
      return; // No active listeners for this objective
    }
    
    // Update progress data
    const currentData = state.progressData.get(objectiveId);
    if (!currentData) return;
    
    const updatedData = { ...currentData, ...data };
    
    const newProgressData = new Map(state.progressData);
    newProgressData.set(objectiveId, updatedData);
    
    set({ progressData: newProgressData });
    
    // Check each listener and update mission progress
    listeners.forEach(listener => {
      const progress = get().checkObjectiveCompletion(objectiveId) ? 100 : 
        (updatedData.currentValue && updatedData.targetValue ? 
          Math.min(100, (updatedData.currentValue / updatedData.targetValue) * 100) : 0);
      
      console.log(`[ObjectiveTriggers] Progress for ${objectiveId}: ${progress}%`);
      
      // Update mission system
      get().updateObjectiveProgress(listener.missionId, objectiveId, progress);
      
      // Call callback if exists
      if (listener.callback) {
        listener.callback(progress);
      }
    });
  },
  
  reportProgress: (type: ObjectiveTriggerType, data: any) => {
    const state = get();
    
    // Find all objectives with matching trigger type
    Array.from(state.activeListeners.entries()).forEach(([objectiveId, listeners]) => {
      listeners.forEach(listener => {
        if (listener.triggerType === type) {
          // Check if the data matches the trigger conditions
          if (get().matchesTriggerConditions(listener.triggerData, type, data)) {
            get().reportObjectiveProgress(objectiveId, data);
          }
        }
      });
    });
  },
  
  reportLocationProgress: (location: string | undefined, coordinates?: Coordinate3D, planet?: string) => {
    const state = get();
    
    console.log(`[ObjectiveTriggers] Location progress: ${location || planet || 'coordinates'}`);
    
    Array.from(state.activeListeners.entries()).forEach(([objectiveId, listeners]) => {
      listeners.forEach(listener => {
        if (listener.triggerType === 'location' || listener.triggerType === 'travel') {
          const triggerData = listener.triggerData;
          
          // Check location match
          if (triggerData.location && location && triggerData.location === location) {
            get().reportObjectiveProgress(objectiveId, { currentValue: 1, targetValue: 1 });
          }
          
          // Check planet match
          if (triggerData.planet && planet && triggerData.planet === planet) {
            get().reportObjectiveProgress(objectiveId, { currentValue: 1, targetValue: 1 });
          }
          
          // Check coordinates match (within radius)
          if (triggerData.coordinates && coordinates) {
            const distance = Math.sqrt(
              Math.pow(coordinates.x - triggerData.coordinates.x, 2) +
              Math.pow(coordinates.y - triggerData.coordinates.y, 2) +
              Math.pow(coordinates.z - triggerData.coordinates.z, 2)
            );
            
            const radius = triggerData.radius || 10; // Default radius
            if (distance <= radius) {
              get().reportObjectiveProgress(objectiveId, { currentValue: 1, targetValue: 1 });
            }
          }
        }
      });
    });
  },
  
  reportCollectionProgress: (itemId: string, itemType?: string, quantity: number = 1) => {
    const state = get();
    
    console.log(`[ObjectiveTriggers] Collection progress: ${itemId} (${itemType}) x${quantity}`);
    
    Array.from(state.activeListeners.entries()).forEach(([objectiveId, listeners]) => {
      listeners.forEach(listener => {
        if (listener.triggerType === 'collection' || listener.triggerType === 'delivery') {
          const triggerData = listener.triggerData;
          
          // Check item match
          if (triggerData.itemId === itemId || triggerData.itemType === itemType) {
            const currentValue = (triggerData.currentValue || 0) + quantity;
            get().reportObjectiveProgress(objectiveId, { 
              currentValue,
              targetValue: triggerData.targetValue || 1
            });
          }
        }
      });
    });
  },
  
  reportCombatProgress: (enemyType?: string, enemyFaction?: string, count: number = 1) => {
    const state = get();
    
    console.log(`[ObjectiveTriggers] Combat progress: ${enemyType || enemyFaction} x${count}`);
    
    Array.from(state.activeListeners.entries()).forEach(([objectiveId, listeners]) => {
      listeners.forEach(listener => {
        if (listener.triggerType === 'combat') {
          const triggerData = listener.triggerData;
          
          // Check enemy match
          if ((triggerData.enemyType && triggerData.enemyType === enemyType) ||
              (triggerData.enemyFaction && triggerData.enemyFaction === enemyFaction) ||
              (!triggerData.enemyType && !triggerData.enemyFaction)) {
            const currentValue = (triggerData.currentValue || 0) + count;
            get().reportObjectiveProgress(objectiveId, { 
              currentValue,
              targetValue: triggerData.targetValue || 1
            });
          }
        }
      });
    });
  },
  
  reportInteractionProgress: (interactionId: string) => {
    const state = get();
    
    console.log(`[ObjectiveTriggers] Interaction progress: ${interactionId}`);
    
    Array.from(state.activeListeners.entries()).forEach(([objectiveId, listeners]) => {
      listeners.forEach(listener => {
        if (listener.triggerType === 'interaction' || listener.triggerType === 'investigation') {
          const triggerData = listener.triggerData;
          
          if (triggerData.interactionId === interactionId) {
            get().reportObjectiveProgress(objectiveId, { currentValue: 1, targetValue: 1 });
          }
        }
      });
    });
  },
  
  reportCustomProgress: (condition: string, value: number) => {
    const state = get();
    
    console.log(`[ObjectiveTriggers] Custom progress: ${condition} = ${value}`);
    
    Array.from(state.activeListeners.entries()).forEach(([objectiveId, listeners]) => {
      listeners.forEach(listener => {
        if (listener.triggerType === 'custom') {
          const triggerData = listener.triggerData;
          
          if (triggerData.customCondition === condition) {
            get().reportObjectiveProgress(objectiveId, { 
              currentValue: value,
              targetValue: triggerData.targetValue || 1
            });
          }
        }
      });
    });
  },
  
  checkObjectiveCompletion: (objectiveId: string) => {
    const state = get();
    const triggerData = state.progressData.get(objectiveId);
    
    if (!triggerData) return false;
    
    // Check based on trigger type
    switch (triggerData.type) {
      case 'location':
      case 'travel':
      case 'interaction':
      case 'investigation':
        return (triggerData.currentValue || 0) >= 1;
        
      case 'collection':
      case 'delivery':
      case 'combat':
      case 'custom':
        return (triggerData.currentValue || 0) >= (triggerData.targetValue || 1);
        
      default:
        return false;
    }
  },
  
  updateObjectiveProgress: (missionId: string, objectiveId: string, progress: number) => {
    // Update the mission system
    const missionsStore = usePlunderverseMissions.getState();
    missionsStore.updateObjectiveProgress(missionId, objectiveId, progress);
  },
  
  getActiveObjectives: () => {
    const missions = usePlunderverseMissions.getState().activeMissions;
    const objectives: MissionObjective[] = [];
    
    missions.forEach(mission => {
      mission.objectives.forEach(obj => {
        if (!obj.completed) {
          objectives.push(obj);
        }
      });
    });
    
    return objectives;
  },
  
  clearAll: () => {
    set({
      activeListeners: new Map(),
      progressData: new Map()
    });
    
    console.log('[ObjectiveTriggers] Cleared all triggers');
  },
  
  initializeFromMissions: (missions: Mission[]) => {
    const state = get();
    
    // Clear existing listeners
    state.clearAll();
    
    // Register objectives from all active missions
    missions.forEach(mission => {
      if (mission.active && !mission.completed) {
        mission.objectives.forEach(objective => {
          if (!objective.completed) {
            state.registerObjective(mission, objective);
          }
        });
      }
    });
    
    console.log(`[ObjectiveTriggers] Initialized ${state.activeListeners.size} objective triggers from ${missions.length} missions`);
  },
  
  // Helper function to match trigger conditions  
  matchesTriggerConditions: (triggerData: ObjectiveTriggerData, type: ObjectiveTriggerType, data: any) => {
    switch (type) {
      case 'location':
      case 'travel':
        return (triggerData.location && data.location === triggerData.location) ||
               (triggerData.planet && data.planet === triggerData.planet);
               
      case 'collection':
      case 'delivery':
        return (triggerData.itemId && data.itemId === triggerData.itemId) ||
               (triggerData.itemType && data.itemType === triggerData.itemType);
               
      case 'combat':
        return (triggerData.enemyType && data.enemyType === triggerData.enemyType) ||
               (triggerData.enemyFaction && data.enemyFaction === triggerData.enemyFaction);
               
      case 'interaction':
      case 'investigation':
        return triggerData.interactionId === data.interactionId;
        
      case 'custom':
        return triggerData.customCondition === data.condition;
        
      default:
        return false;
    }
  }
}));

// Helper function to make the store globally accessible
export const objectiveTriggers = useObjectiveTriggers.getState();