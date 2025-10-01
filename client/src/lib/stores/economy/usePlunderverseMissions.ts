import { create } from 'zustand';
import { 
  Mission, 
  MissionObjective, 
  MissionChoice,
  ChoiceOutcome,
  MissionRewards,
  FactionId,
  DifficultyLevel
} from '../../plunderverse/types';

interface PlunderverseMissionsState {
  // Mission state
  availableMissions: Mission[];
  activeMissions: Mission[];
  completedMissionIds: Set<string>;
  failedMissionIds: Set<string>;
  
  // Current mission tracking
  currentMissionId: string | null;
  currentObjectiveProgress: Map<string, Map<string, number>>; // missionId -> objectiveId -> progress
  
  // Mission generation
  lastGenerationTimestamp: number;
  generationSeed: string;
  
  // Actions
  generateMissions: (location: string, playerRank: number, seed: string) => void;
  acceptMission: (missionId: string) => boolean;
  abandonMission: (missionId: string) => void;
  updateObjectiveProgress: (missionId: string, objectiveId: string, progress: number) => void;
  completeObjective: (missionId: string, objectiveId: string) => void;
  makeChoice: (missionId: string, choiceId: string) => ChoiceOutcome[] | undefined;
  completeMission: (missionId: string) => MissionRewards | undefined;
  failMission: (missionId: string) => void;
  getMissionById: (missionId: string) => Mission | undefined;
  getActiveMissionsByType: (type: string) => Mission[];
  checkMissionRequirements: (mission: Mission, playerState: any) => boolean;
  clearExpiredMissions: () => void;
  addEmergencyMissions: (missions: Mission[]) => void;
}

export const usePlunderverseMissions = create<PlunderverseMissionsState>((set, get) => ({
  availableMissions: [],
  activeMissions: [],
  completedMissionIds: new Set(),
  failedMissionIds: new Set(),
  currentMissionId: null,
  currentObjectiveProgress: new Map(),
  lastGenerationTimestamp: 0,
  generationSeed: '',
  
  generateMissions: (location: string, playerRank: number, seed: string) => {
    const state = get();
    
    // Don't regenerate if we have recent missions (within 5 minutes)
    const now = Date.now();
    if (now - state.lastGenerationTimestamp < 300000 && state.availableMissions.length > 0) {
      console.log(`[Missions] Skipping generation - recent missions exist (${state.availableMissions.length} available)`);
      return;
    }
    
    // Use seeded random for consistent generation
    console.log(`[Missions] Generating missions with deterministic seed: "${seed}"`);
    const random = seedRandom(seed);
    
    // Test determinism by generating some test values
    const testValues = [random(), random(), random()];
    console.log(`[Missions] Seed test values: ${testValues.map(v => v.toFixed(4)).join(', ')}`);
    
    // Generate 3-7 missions based on location and rank
    const missionCount = 3 + Math.floor(random() * 5);
    const newMissions: Mission[] = [];
    
    // Mission templates would be loaded from content registry
    // For now, create placeholder missions
    for (let i = 0; i < missionCount; i++) {
      const missionId = `${location}_${playerRank}_${i}_${seed.replace(/:/g, '_')}`;
      const difficulty = getDifficultyForRank(playerRank, random);
      const missionType = getMissionType(random);
      
      newMissions.push({
        id: missionId,
        title: `${missionType.charAt(0).toUpperCase() + missionType.slice(1)} Mission ${i + 1}`,
        description: `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} ${missionType} mission at ${location}`,
        type: missionType,
        difficulty,
        minRank: Math.max(1, playerRank - 1),
        requirements: {},
        objectives: generateObjectives(random),
        choices: [],
        rewards: generateRewards(difficulty, random),
        active: false,
        completed: false
      });
    }
    
    set({
      availableMissions: newMissions,
      lastGenerationTimestamp: now,
      generationSeed: seed
    });
    
    console.log(`[Missions] Generated ${missionCount} missions for ${location} (rank ${playerRank}):`, 
      newMissions.map(m => `${m.type}/${m.difficulty}`).join(', '));
  },
  
  acceptMission: (missionId: string) => {
    const state = get();
    const mission = state.availableMissions.find(m => m.id === missionId);
    
    if (!mission) {
      console.warn(`[MISSION-ACCEPT] ❌ Mission ${missionId} not found`);
      return false;
    }
    
    // Check if we already have too many active missions (max 5)
    if (state.activeMissions.length >= 5) {
      console.warn(`[MISSION-ACCEPT] ❌ Too many active missions (${state.activeMissions.length}/5)`);
      return false;
    }
    
    console.log(`[MISSION-ACCEPT] 📋 Accepting mission: ${mission.title}`);
    console.log(`[MISSION-ACCEPT] Type: ${mission.type}, Difficulty: ${mission.difficulty}`);
    console.log(`[MISSION-ACCEPT] Objectives:`, mission.objectives.map(o => o.description).join(', '));
    
    // Move mission from available to active
    const activeMission = { ...mission, active: true };
    const objectiveProgress = new Map<string, number>();
    
    // Initialize objective progress
    activeMission.objectives.forEach(obj => {
      objectiveProgress.set(obj.id, 0);
      console.log(`[MISSION-ACCEPT] Initialized objective progress: ${obj.id} = 0%`);
    });
    
    const newObjectiveProgress = new Map(state.currentObjectiveProgress);
    newObjectiveProgress.set(missionId, objectiveProgress);
    
    set({
      availableMissions: state.availableMissions.filter(m => m.id !== missionId),
      activeMissions: [...state.activeMissions, activeMission],
      currentMissionId: missionId,
      currentObjectiveProgress: newObjectiveProgress
    });
    
    console.log(`[MISSION-ACCEPT] ✅ Mission accepted successfully: ${mission.title}`);
    console.log(`[MISSION-ACCEPT] Active missions count: ${state.activeMissions.length + 1}`);
    return true;
  },
  
  abandonMission: (missionId: string) => {
    const state = get();
    const mission = state.activeMissions.find(m => m.id === missionId);
    
    if (!mission) return;
    
    const newObjectiveProgress = new Map(state.currentObjectiveProgress);
    newObjectiveProgress.delete(missionId);
    
    set({
      activeMissions: state.activeMissions.filter(m => m.id !== missionId),
      currentMissionId: state.currentMissionId === missionId ? null : state.currentMissionId,
      currentObjectiveProgress: newObjectiveProgress
    });
    
    console.log(`Abandoned mission: ${mission.title}`);
  },
  
  updateObjectiveProgress: (missionId: string, objectiveId: string, progress: number) => {
    const state = get();
    const mission = state.activeMissions.find(m => m.id === missionId);
    
    if (!mission) {
      console.warn(`[OBJECTIVE-PROGRESS] ❌ Mission ${missionId} not found`);
      return;
    }
    
    const missionProgress = state.currentObjectiveProgress.get(missionId);
    if (!missionProgress) {
      console.warn(`[OBJECTIVE-PROGRESS] ❌ No progress tracking for mission ${missionId}`);
      return;
    }
    
    const oldProgress = missionProgress.get(objectiveId) || 0;
    const newProgress = Math.min(100, Math.max(0, progress));
    
    console.log(`[OBJECTIVE-PROGRESS] 📈 Updating objective for "${mission.title}"`);
    console.log(`[OBJECTIVE-PROGRESS] Objective ${objectiveId}: ${oldProgress}% -> ${newProgress}%`);
    
    missionProgress.set(objectiveId, newProgress);
    
    const newObjectiveProgress = new Map(state.currentObjectiveProgress);
    newObjectiveProgress.set(missionId, missionProgress);
    
    set({ currentObjectiveProgress: newObjectiveProgress });
    
    // Check if objective is complete
    if (newProgress >= 100 && oldProgress < 100) {
      console.log(`[OBJECTIVE-PROGRESS] ✅ Objective ${objectiveId} completed!`);
      get().completeObjective(missionId, objectiveId);
    }
  },
  
  completeObjective: (missionId: string, objectiveId: string) => {
    const state = get();
    const mission = state.activeMissions.find(m => m.id === missionId);
    
    if (!mission) return;
    
    const objective = mission.objectives.find(o => o.id === objectiveId);
    if (!objective || objective.completed) return;
    
    // Mark objective as completed
    objective.completed = true;
    
    // Update mission
    const updatedMissions = state.activeMissions.map(m => 
      m.id === missionId ? { ...m, objectives: [...m.objectives] } : m
    );
    
    set({ activeMissions: updatedMissions });
    
    console.log(`[OBJECTIVE-COMPLETE] Completed objective: ${objective.description}`);
    
    // Check if all objectives are complete
    const allComplete = mission.objectives.every(o => o.completed);
    if (allComplete && mission.choices.length === 0) {
      console.log(`[OBJECTIVE-COMPLETE] All objectives complete for mission "${mission.title}"`);
      // Don't auto-complete - let gameFacade handle it
      console.log(`[OBJECTIVE-COMPLETE] Mission ready for completion (use gameFacade.resolveMission)`);
    }
  },
  
  makeChoice: (missionId: string, choiceId: string) => {
    const state = get();
    const mission = state.activeMissions.find(m => m.id === missionId);
    
    if (!mission) return undefined;
    
    const choice = mission.choices.find(c => c.id === choiceId);
    if (!choice) return undefined;
    
    console.log(`Made choice: ${choice.text}`);
    return choice.outcomes;
  },
  
  completeMission: (missionId: string) => {
    const state = get();
    const mission = state.activeMissions.find(m => m.id === missionId);
    
    if (!mission) {
      console.warn(`[MISSION-COMPLETE] ❌ Mission ${missionId} not found in active missions`);
      return undefined;
    }
    
    console.log(`[MISSION-COMPLETE] 🎯 Completing mission: ${mission.title}`);
    console.log(`[MISSION-COMPLETE] Mission type: ${mission.type}, Difficulty: ${mission.difficulty}`);
    console.log(`[MISSION-COMPLETE] Rewards:`, {
      credits: mission.rewards?.base?.credits || 0,
      reputation: mission.rewards?.base?.reputation || {},
      items: mission.rewards?.base?.items || []
    });
    
    // Remove from active missions
    const newObjectiveProgress = new Map(state.currentObjectiveProgress);
    newObjectiveProgress.delete(missionId);
    
    const prevCompletedCount = state.completedMissionIds.size;
    
    set({
      activeMissions: state.activeMissions.filter(m => m.id !== missionId),
      completedMissionIds: new Set(Array.from(state.completedMissionIds).concat(missionId)),
      currentMissionId: state.currentMissionId === missionId ? null : state.currentMissionId,
      currentObjectiveProgress: newObjectiveProgress
    });
    
    console.log(`[MISSION-COMPLETE] ✅ Mission completed successfully: ${mission.title}`);
    console.log(`[MISSION-COMPLETE] Total completed missions: ${prevCompletedCount} -> ${prevCompletedCount + 1}`);
    console.log(`[MISSION-COMPLETE] Active missions remaining: ${state.activeMissions.length - 1}`);
    
    return mission.rewards;
  },
  
  failMission: (missionId: string) => {
    const state = get();
    const mission = state.activeMissions.find(m => m.id === missionId);
    
    if (!mission) return;
    
    const newObjectiveProgress = new Map(state.currentObjectiveProgress);
    newObjectiveProgress.delete(missionId);
    
    set({
      activeMissions: state.activeMissions.filter(m => m.id !== missionId),
      failedMissionIds: new Set(Array.from(state.failedMissionIds).concat(missionId)),
      currentMissionId: state.currentMissionId === missionId ? null : state.currentMissionId,
      currentObjectiveProgress: newObjectiveProgress
    });
    
    console.log(`Failed mission: ${mission.title}`);
  },
  
  getMissionById: (missionId: string) => {
    const state = get();
    return state.availableMissions.find(m => m.id === missionId) || 
           state.activeMissions.find(m => m.id === missionId);
  },
  
  getActiveMissionsByType: (type: string) => {
    return get().activeMissions.filter(m => m.type === type);
  },
  
  checkMissionRequirements: (mission: Mission, playerState: any) => {
    const reqs = mission.requirements;
    
    // Check reputation requirements
    if (reqs.reputation) {
      for (const [faction, required] of Object.entries(reqs.reputation)) {
        if ((playerState.reputation?.[faction] || 0) < required) {
          return false;
        }
      }
    }
    
    // Check other requirements
    if (reqs.credits && playerState.credits < reqs.credits) return false;
    if (reqs.cargoSpace && playerState.cargoSpace < reqs.cargoSpace) return false;
    if (reqs.combatRating && playerState.combatRating < reqs.combatRating) return false;
    
    // Check heat level
    if (reqs.heatLevel) {
      if (reqs.heatLevel.max !== undefined && playerState.heat > reqs.heatLevel.max) return false;
      if (reqs.heatLevel.min !== undefined && playerState.heat < reqs.heatLevel.min) return false;
    }
    
    return true;
  },
  
  clearExpiredMissions: () => {
    const state = get();
    const now = Date.now();
    
    // Clear missions with time limits that have expired
    const activeMissions = state.activeMissions.filter(m => {
      if (m.timeLimit && m.active) {
        // Assuming timeLimit is in minutes from mission start
        // This would need proper tracking of mission start time
        return true; // Placeholder
      }
      return true;
    });
    
    set({ activeMissions });
  },
  
  addEmergencyMissions: (missions: Mission[]) => {
    const state = get();
    console.log(`[Missions] Adding ${missions.length} emergency missions`);
    
    // Add emergency missions to available missions
    set({
      availableMissions: [...state.availableMissions, ...missions]
    });
    
    console.log(`[Missions] Emergency missions added. Total available: ${state.availableMissions.length + missions.length}`);
  }
}));

// Helper functions for seeded random generation
function seedRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return function() {
    hash = ((hash + 0x6D2B79F5) * 1103515245 + 12345) & 0x7fffffff;
    return hash / 0x7fffffff;
  };
}

function getDifficultyForRank(rank: number, random: () => number): DifficultyLevel {
  const roll = random();
  if (rank <= 2) {
    return roll < 0.7 ? 'easy' : 'medium';
  } else if (rank <= 5) {
    return roll < 0.3 ? 'easy' : roll < 0.7 ? 'medium' : 'hard';
  } else if (rank <= 8) {
    return roll < 0.2 ? 'medium' : roll < 0.7 ? 'hard' : 'legendary';
  } else {
    return roll < 0.5 ? 'hard' : 'legendary';
  }
}

function getMissionType(random: () => number): Mission['type'] {
  const types: Mission['type'][] = ['delivery', 'smuggling', 'bounty', 'exploration', 'combat', 'survival', 'discovery'];
  return types[Math.floor(random() * types.length)];
}

function generateObjectives(random: () => number): MissionObjective[] {
  const count = 1 + Math.floor(random() * 3);
  const objectives: MissionObjective[] = [];
  
  for (let i = 0; i < count; i++) {
    objectives.push({
      id: `obj_${i}`,
      type: 'travel',
      description: `Objective ${i + 1}`,
      completed: false
    });
  }
  
  return objectives;
}

function generateRewards(difficulty: DifficultyLevel, random: () => number): MissionRewards {
  const baseCredits = {
    easy: 500,
    medium: 1000,
    hard: 2000,
    legendary: 5000
  };
  
  const credits = baseCredits[difficulty] + Math.floor(random() * baseCredits[difficulty] * 0.5);
  
  return {
    base: { credits },
    variable: true
  };
}