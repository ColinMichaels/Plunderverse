import { create } from 'zustand';
import { 
  Mission, 
  MissionObjective, 
  MissionChoice,
  ChoiceOutcome,
  MissionRewards,
  FactionId,
  DifficultyLevel,
  ObjectiveTriggerType,
  ObjectiveTriggerData
} from '../../plunderverse/types';
import { useObjectiveTriggers } from './useObjectiveTriggers';
import { usePlayer } from '../player/usePlayer';

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
    
    // Get player reputation for faction-based mission generation
    const player = usePlayer.getState();
    const corpRep = player.reputation.corporations || 0;
    const indRep = player.reputation.independents || 0;
    const outlawRep = player.reputation.outlaws || 0;
    
    // Determine dominant faction for the location
    let locationFaction: 'corporations' | 'independents' | 'outlaws' = 'independents';
    if (location === 'Earth' || location === 'Mars') {
      locationFaction = 'corporations';
    } else if (location === 'Uranus' || location === 'Neptune') {
      locationFaction = 'outlaws';
    }
    
    // Generate 3-7 missions based on location and rank
    const missionCount = 3 + Math.floor(random() * 5);
    const newMissions: Mission[] = [];
    
    // Mission templates would be loaded from content registry
    // For now, create placeholder missions with faction requirements
    for (let i = 0; i < missionCount; i++) {
      const missionId = `${location}_${i}_player${playerRank}_${Date.now()}_${seed.replace(/:/g, '_')}`;
      const difficulty = getDifficultyForRank(playerRank, random);
      const missionType = getMissionType(random);
      
      // Determine faction alignment and requirements
      const factionRoll = random();
      let missionFaction: 'corporations' | 'independents' | 'outlaws' = locationFaction;
      let requirements: any = {};
      
      // 60% chance of location faction missions, 40% mixed
      if (factionRoll > 0.6) {
        const altRoll = random();
        if (altRoll < 0.33) missionFaction = 'corporations';
        else if (altRoll < 0.66) missionFaction = 'independents';
        else missionFaction = 'outlaws';
      }
      
      // Set reputation requirements based on faction
      switch (missionFaction) {
        case 'corporations':
          // Corporation missions require good standing or neutrality
          requirements.reputation = { corporations: -20 }; // Min -20 rep
          if (difficulty === 'hard' || difficulty === 'legendary') {
            requirements.reputation.corporations = 20; // Need positive rep for high-tier
          }
          break;
          
        case 'outlaws':
          // Outlaw missions require either bad corp rep OR good outlaw rep
          if (random() < 0.5) {
            requirements.reputation = { corporations: -30 }; // Max -30 corp rep
            requirements.maxReputation = { corporations: -30 };
          } else {
            requirements.reputation = { outlaws: 10 }; // Min 10 outlaw rep
          }
          if (difficulty === 'legendary') {
            requirements.reputation = { outlaws: 50 }; // Need high outlaw rep for legendary
          }
          break;
          
        case 'independents':
          // Independent missions available to all, but may have soft requirements
          if (difficulty === 'hard' || difficulty === 'legendary') {
            requirements.reputation = { independents: 20 };
          }
          break;
      }
      
      // Add special requirements for certain mission types
      if (missionType === 'smuggling') {
        // Smuggling requires low heat or outlaw connections
        requirements.heatLevel = { max: 50 };
        if (!requirements.reputation) requirements.reputation = {};
        requirements.reputation.outlaws = requirements.reputation.outlaws || -20; // At least not hostile
      } else if (missionType === 'bounty') {
        // Bounty missions may require combat rating or specific faction alignment
        requirements.combatRating = 30 + (difficulty === 'hard' ? 20 : 0);
      }
      
      // Generate mission title with faction flavor
      const factionPrefix = missionFaction === 'corporations' ? 'Corporate' :
                           missionFaction === 'outlaws' ? 'Outlaw' :
                           'Independent';
      const title = `${factionPrefix} ${missionType.charAt(0).toUpperCase() + missionType.slice(1)} Mission`;
      
      newMissions.push({
        id: missionId,
        title: `${title} ${i + 1}`,
        description: `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} ${missionType} mission for ${factionPrefix} faction at ${location}`,
        type: missionType,
        difficulty,
        minRank: Math.max(1, playerRank - 1),
        requirements,
        objectives: generateObjectives(random),
        choices: [],
        rewards: generateRewards(difficulty, random, missionFaction),
        active: false,
        completed: false,
        faction: missionFaction // Store faction for reference
      });
    }
    
    set({
      availableMissions: newMissions,
      lastGenerationTimestamp: now,
      generationSeed: seed
    });
    
    console.log(`[Missions] Generated ${missionCount} missions for ${location} (rank ${playerRank}):`, 
      newMissions.map(m => `${m.faction}/${m.type}/${m.difficulty}`).join(', '));
    console.log(`[Missions] Player reputation - Corp: ${corpRep}, Ind: ${indRep}, Outlaw: ${outlawRep}`);
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
    
    // Register objectives with the trigger system
    const triggerSystem = useObjectiveTriggers.getState();
    activeMission.objectives.forEach(objective => {
      triggerSystem.registerObjective(activeMission, objective);
      console.log(`[MISSION-ACCEPT] Registered objective trigger: ${objective.id}`);
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
    
    // Unregister objectives from the trigger system
    const triggerSystem = useObjectiveTriggers.getState();
    triggerSystem.unregisterMission(missionId);
    
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
    
    // Check minimum reputation requirements
    if (reqs.reputation) {
      for (const [faction, required] of Object.entries(reqs.reputation)) {
        const playerRep = playerState.reputation?.[faction] || 0;
        if (playerRep < required) {
          console.log(`[MISSION-REQ] Failed: ${faction} rep ${playerRep} < ${required}`);
          return false;
        }
      }
    }
    
    // Check maximum reputation requirements (for outlaw missions that require bad corp rep)
    if (reqs.maxReputation) {
      for (const [faction, maxRequired] of Object.entries(reqs.maxReputation)) {
        const playerRep = playerState.reputation?.[faction] || 0;
        if (playerRep > maxRequired) {
          console.log(`[MISSION-REQ] Failed: ${faction} rep ${playerRep} > max ${maxRequired}`);
          return false;
        }
      }
    }
    
    // Check other requirements
    if (reqs.credits && playerState.credits < reqs.credits) {
      console.log(`[MISSION-REQ] Failed: credits ${playerState.credits} < ${reqs.credits}`);
      return false;
    }
    if (reqs.cargoSpace && playerState.cargoSpace < reqs.cargoSpace) {
      console.log(`[MISSION-REQ] Failed: cargo space ${playerState.cargoSpace} < ${reqs.cargoSpace}`);
      return false;
    }
    if (reqs.combatRating && playerState.combatRating < reqs.combatRating) {
      console.log(`[MISSION-REQ] Failed: combat rating ${playerState.combatRating} < ${reqs.combatRating}`);
      return false;
    }
    
    // Check heat level
    if (reqs.heatLevel) {
      if (reqs.heatLevel.max !== undefined && playerState.heat > reqs.heatLevel.max) {
        console.log(`[MISSION-REQ] Failed: heat ${playerState.heat} > max ${reqs.heatLevel.max}`);
        return false;
      }
      if (reqs.heatLevel.min !== undefined && playerState.heat < reqs.heatLevel.min) {
        console.log(`[MISSION-REQ] Failed: heat ${playerState.heat} < min ${reqs.heatLevel.min}`);
        return false;
      }
    }
    
    // Check faction-specific mission availability
    if ((mission as any).faction) {
      const missionFaction = (mission as any).faction;
      const factionRep = playerState.reputation?.[missionFaction] || 0;
      
      // Faction stations won't give missions to enemies
      if (factionRep <= -50) {
        console.log(`[MISSION-REQ] Failed: Faction ${missionFaction} refuses service (rep: ${factionRep})`);
        return false;
      }
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
  
  const objectiveTypes: Array<{ 
    type: MissionObjective['type'], 
    triggerType: ObjectiveTriggerType,
    descriptions: string[],
    generateTriggerData: () => ObjectiveTriggerData
  }> = [
    {
      type: 'travel',
      triggerType: 'location',
      descriptions: [
        'Navigate to the target location',
        'Reach the designated coordinates',
        'Travel to the specified planet'
      ],
      generateTriggerData: () => ({
        type: 'location',
        planet: ['Mars', 'Earth', 'Jupiter', 'Saturn'][Math.floor(random() * 4)],
        targetValue: 1
      })
    },
    {
      type: 'delivery',
      triggerType: 'collection',
      descriptions: [
        'Collect the required cargo',
        'Gather necessary supplies',
        'Acquire the specified items'
      ],
      generateTriggerData: () => ({
        type: 'collection',
        itemType: ['cargo', 'supplies', 'minerals'][Math.floor(random() * 3)],
        targetValue: Math.ceil(random() * 5) * 10,
        currentValue: 0
      })
    },
    {
      type: 'combat',
      triggerType: 'combat',
      descriptions: [
        'Defeat hostile targets',
        'Eliminate enemy forces',
        'Neutralize the threat'
      ],
      generateTriggerData: () => ({
        type: 'combat',
        enemyType: ['pirate', 'drone', 'raider'][Math.floor(random() * 3)],
        targetValue: Math.ceil(random() * 3),
        currentValue: 0
      })
    },
    {
      type: 'investigation',
      triggerType: 'interaction',
      descriptions: [
        'Investigate the anomaly',
        'Scan the target object',
        'Examine the mysterious signal'
      ],
      generateTriggerData: () => ({
        type: 'interaction',
        interactionId: `interact_${Math.floor(random() * 1000)}`,
        targetValue: 1,
        currentValue: 0
      })
    }
  ];
  
  for (let i = 0; i < count; i++) {
    const objType = objectiveTypes[Math.floor(random() * objectiveTypes.length)];
    const description = objType.descriptions[Math.floor(random() * objType.descriptions.length)];
    
    objectives.push({
      id: `obj_${i}`,
      type: objType.type,
      description,
      completed: false,
      triggerType: objType.triggerType,
      triggerData: objType.generateTriggerData(),
      progress: 0,
      autoComplete: true
    });
  }
  
  return objectives;
}

function generateRewards(difficulty: DifficultyLevel, random: () => number, faction?: string): MissionRewards {
  const baseCredits = {
    easy: 500,
    medium: 1000,
    hard: 2000,
    legendary: 5000
  };
  
  let credits = baseCredits[difficulty] + Math.floor(random() * baseCredits[difficulty] * 0.5);
  const reputation: Record<string, number> = {};
  
  // Apply faction-specific reward modifiers
  if (faction) {
    switch (faction) {
      case 'corporations':
        // Corp missions pay well but reduce outlaw rep
        credits = Math.floor(credits * 1.2);
        reputation.corporations = 5 + (difficulty === 'hard' ? 5 : 0) + (difficulty === 'legendary' ? 10 : 0);
        reputation.outlaws = -5 - (difficulty === 'hard' ? 5 : 0);
        break;
        
      case 'outlaws':
        // Outlaw missions pay less credits but give notoriety and outlaw rep
        credits = Math.floor(credits * 0.9);
        reputation.outlaws = 8 + (difficulty === 'hard' ? 7 : 0) + (difficulty === 'legendary' ? 10 : 0);
        reputation.corporations = -10 - (difficulty === 'hard' ? 5 : 0);
        break;
        
      case 'independents':
        // Independent missions have balanced rewards
        reputation.independents = 5 + (difficulty === 'hard' ? 5 : 0) + (difficulty === 'legendary' ? 10 : 0);
        // Small positive rep with both other factions
        reputation.corporations = 2;
        reputation.outlaws = 2;
        break;
    }
  }
  
  return {
    base: { 
      credits,
      reputation: Object.keys(reputation).length > 0 ? reputation : undefined
    },
    variable: true
  };
}