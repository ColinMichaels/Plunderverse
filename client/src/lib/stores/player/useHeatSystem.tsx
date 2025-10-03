import { create } from 'zustand';
import { usePlayer } from './usePlayer';
import { useCreditsStore } from '../../../domain/economy/credits.store';
import { usePlunderverseMissions } from '../economy/usePlunderverseMissions';

export type WantedLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type CrimeType = 
  | 'minor_smuggling'
  | 'major_smuggling'
  | 'assault'
  | 'murder'
  | 'theft_minor'
  | 'theft_major'
  | 'corporate_espionage'
  | 'piracy'
  | 'resisting_arrest'
  | 'bribery'
  | 'faction_betrayal';

export interface WantedLevelInfo {
  level: WantedLevel;
  name: string;
  description: string;
  heatRange: { min: number; max: number };
  encounterChance: number;
  priceMarkup: number;
  color: string;
  icon: string;
}

export interface PatrolEncounterState {
  active: boolean;
  encounterType: 'routine' | 'suspicious' | 'hostile' | 'extreme';
  patrolFaction: string;
  bribeCost: number;
  canBribe: boolean;
  canFlee: boolean;
  inspectionRisk: number;
}

interface HeatSystemState {
  // Core Heat System
  currentHeat: number;
  wantedLevel: WantedLevel;
  wantedLevelInfo: WantedLevelInfo;
  
  // Crime Heat Values
  crimeHeatValues: Record<CrimeType, number>;
  
  // Laying Low State
  isLayingLow: boolean;
  layingLowLocation: string | null;
  layingLowDaysRemaining: number;
  fakeIdAvailable: boolean;
  
  // Patrol Encounter State
  patrolEncounter: PatrolEncounterState | null;
  lastEncounterTime: number;
  encounterCooldown: number; // ms between encounters
  
  // Heat Consequences
  missionRestrictions: string[];
  dockedStationsBlacklist: string[];
  bountyHunterActive: boolean;
  bountyAmount: number;
  
  // Actions - Heat Management
  applyHeat: (crime: CrimeType, multiplier?: number) => void;
  calculateWantedLevel: (heat: number) => WantedLevel;
  getWantedLevelInfo: (level: WantedLevel) => WantedLevelInfo;
  updateHeat: (amount: number) => void;
  
  // Actions - Laying Low
  startLayingLow: (location: string) => boolean;
  stopLayingLow: () => void;
  processLayingLowTick: () => void;
  purchaseFakeId: () => boolean;
  
  // Actions - Patrol Encounters
  triggerPatrolEncounter: () => boolean;
  resolveEncounter: (choice: 'submit' | 'bribe' | 'flee' | 'fight') => void;
  calculateBribeCost: (heat: number, wantedLevel: WantedLevel) => number;
  
  // Actions - Consequences
  checkHeatConsequences: () => void;
  applyPriceModifiers: (basePrice: number) => number;
  canDockAtStation: (stationFaction: string) => boolean;
  triggerBountyHunter: () => void;
  
  // Actions - Heat Decay
  applyHeatDecay: (amount?: number) => void;
  getHeatDecayRate: () => number;
}

// Wanted Level Configuration
const WANTED_LEVELS: Record<WantedLevel, WantedLevelInfo> = {
  0: {
    level: 0,
    name: 'Clean',
    description: 'No criminal record',
    heatRange: { min: 0, max: 10 },
    encounterChance: 0,
    priceMarkup: 0,
    color: '#10b981', // Green
    icon: '✅'
  },
  1: {
    level: 1,
    name: 'Person of Interest',
    description: 'Occasional checks by patrols',
    heatRange: { min: 11, max: 30 },
    encounterChance: 0.1,
    priceMarkup: 0.1,
    color: '#eab308', // Yellow
    icon: '👁️'
  },
  2: {
    level: 2,
    name: 'Wanted',
    description: 'Active patrols searching',
    heatRange: { min: 31, max: 50 },
    encounterChance: 0.25,
    priceMarkup: 0.2,
    color: '#f97316', // Orange
    icon: '⚠️'
  },
  3: {
    level: 3,
    name: 'High Priority',
    description: 'Frequent encounters, bounty hunters active',
    heatRange: { min: 51, max: 70 },
    encounterChance: 0.5,
    priceMarkup: 0.3,
    color: '#ef4444', // Red
    icon: '🚨'
  },
  4: {
    level: 4,
    name: 'Most Wanted',
    description: 'Constant harassment, restricted access',
    heatRange: { min: 71, max: 90 },
    encounterChance: 0.75,
    priceMarkup: 0.4,
    color: '#dc2626', // Dark Red
    icon: '💀'
  },
  5: {
    level: 5,
    name: 'Shoot on Sight',
    description: 'Extreme danger, immediate hostility',
    heatRange: { min: 91, max: 100 },
    encounterChance: 1.0,
    priceMarkup: 0.5,
    color: '#991b1b', // Very Dark Red
    icon: '☠️'
  }
};

// Crime Heat Values Configuration
const CRIME_HEAT_VALUES: Record<CrimeType, number> = {
  minor_smuggling: 5,
  major_smuggling: 15,
  assault: 15,
  murder: 30,
  theft_minor: 10,
  theft_major: 20,
  corporate_espionage: 25,
  piracy: 20,
  resisting_arrest: 10,
  bribery: 5,
  faction_betrayal: 35
};

export const useHeatSystem = create<HeatSystemState>((set, get) => ({
  // Initial State
  currentHeat: 0,
  wantedLevel: 0,
  wantedLevelInfo: WANTED_LEVELS[0],
  crimeHeatValues: CRIME_HEAT_VALUES,
  
  isLayingLow: false,
  layingLowLocation: null,
  layingLowDaysRemaining: 0,
  fakeIdAvailable: true,
  
  patrolEncounter: null,
  lastEncounterTime: 0,
  encounterCooldown: 300000, // 5 minutes
  
  missionRestrictions: [],
  dockedStationsBlacklist: [],
  bountyHunterActive: false,
  bountyAmount: 0,
  
  // Heat Management
  applyHeat: (crime: CrimeType, multiplier: number = 1) => {
    const state = get();
    let heatIncrease = (state.crimeHeatValues[crime] || 0) * multiplier;
    
    // Apply crew hacker bonus to reduce heat gain
    try {
      const crewState = (window as any).useCrewManagement?.getState?.();
      if (crewState?.currentBonuses?.heatReduction && heatIncrease > 0) {
        const reduction = 1 - crewState.currentBonuses.heatReduction;
        heatIncrease *= reduction;
        console.log(`[HeatSystem] Hacker bonus reducing heat by ${(crewState.currentBonuses.heatReduction * 100).toFixed(0)}%`);
      }
    } catch (e) {
      // Crew management might not be initialized yet
    }
    
    if (heatIncrease > 0) {
      state.updateHeat(heatIncrease);
      console.log(`[HeatSystem] Applied ${heatIncrease.toFixed(1)} heat for ${crime}`);
      
      // Also update player's heat stat
      const player = usePlayer.getState();
      player.updateHeat(heatIncrease);
      
      // Check consequences after heat increase
      state.checkHeatConsequences();
    }
  },
  
  calculateWantedLevel: (heat: number): WantedLevel => {
    if (heat <= 10) return 0;
    if (heat <= 30) return 1;
    if (heat <= 50) return 2;
    if (heat <= 70) return 3;
    if (heat <= 90) return 4;
    return 5;
  },
  
  getWantedLevelInfo: (level: WantedLevel): WantedLevelInfo => {
    return WANTED_LEVELS[level];
  },
  
  updateHeat: (amount: number) => {
    set(state => {
      const newHeat = Math.max(0, Math.min(100, state.currentHeat + amount));
      const newWantedLevel = state.calculateWantedLevel(newHeat);
      const newWantedInfo = state.getWantedLevelInfo(newWantedLevel);
      
      // Log level changes
      if (newWantedLevel !== state.wantedLevel) {
        console.log(`[HeatSystem] Wanted level changed: ${state.wantedLevel} → ${newWantedLevel} (${newWantedInfo.name})`);
      }
      
      return {
        currentHeat: newHeat,
        wantedLevel: newWantedLevel,
        wantedLevelInfo: newWantedInfo
      };
    });
  },
  
  // Laying Low System
  startLayingLow: (location: string): boolean => {
    const credits = useCreditsStore.getState();
    const dailyCost = 100;
    
    // Check if player can afford it
    if (credits.credits < dailyCost) {
      console.log('[HeatSystem] Cannot afford to lay low (need 100 credits)');
      return false;
    }
    
    // Check if location is suitable (not in outlaw territory with high heat)
    const player = usePlayer.getState();
    const isHostileTerritory = location.includes('Uranus') || location.includes('Neptune');
    if (isHostileTerritory && player.heat > 50) {
      console.log('[HeatSystem] Cannot lay low in hostile territory with high heat');
      return false;
    }
    
    // Deduct credits and start laying low
    if (credits.spendCredits(dailyCost)) {
      set({
        isLayingLow: true,
        layingLowLocation: location,
        layingLowDaysRemaining: 1
      });
      
      // TODO: Disable missions while laying low
      // Note: pauseAllMissions method doesn't exist yet in PlunderverseMissions
      // const missions = usePlunderverseMissions.getState();
      // missions.pauseAllMissions();
      
      console.log(`[HeatSystem] Started laying low at ${location}`);
      return true;
    }
    
    return false;
  },
  
  stopLayingLow: () => {
    set({
      isLayingLow: false,
      layingLowLocation: null,
      layingLowDaysRemaining: 0
    });
    
    // TODO: Re-enable missions
    // Note: resumeAllMissions method doesn't exist yet in PlunderverseMissions
    // const missions = usePlunderverseMissions.getState();
    // missions.resumeAllMissions();
    
    console.log('[HeatSystem] Stopped laying low');
  },
  
  processLayingLowTick: () => {
    const state = get();
    if (!state.isLayingLow) return;
    
    // Apply accelerated heat decay (5 points)
    state.applyHeatDecay(5);
    
    // Check if should continue
    set(state => ({
      layingLowDaysRemaining: Math.max(0, state.layingLowDaysRemaining - 1)
    }));
    
    if (get().layingLowDaysRemaining <= 0) {
      state.stopLayingLow();
    }
  },
  
  purchaseFakeId: (): boolean => {
    const state = get();
    const credits = useCreditsStore.getState();
    const cost = 1000;
    
    if (!state.fakeIdAvailable) {
      console.log('[HeatSystem] Fake ID already purchased recently');
      return false;
    }
    
    if (credits.credits < cost) {
      console.log('[HeatSystem] Cannot afford fake ID (need 1000 credits)');
      return false;
    }
    
    if (credits.spendCredits(cost)) {
      // Reduce heat by 20
      state.updateHeat(-20);
      
      // Fake ID has cooldown
      set({ fakeIdAvailable: false });
      
      // Re-enable after 10 minutes
      setTimeout(() => {
        set({ fakeIdAvailable: true });
      }, 600000);
      
      console.log('[HeatSystem] Purchased fake ID, heat reduced by 20');
      return true;
    }
    
    return false;
  },
  
  // Patrol Encounter System
  triggerPatrolEncounter: (): boolean => {
    const state = get();
    const now = Date.now();
    
    // Check cooldown
    if (now - state.lastEncounterTime < state.encounterCooldown) {
      return false;
    }
    
    // Check encounter probability based on wanted level
    const chance = state.wantedLevelInfo.encounterChance;
    if (Math.random() > chance) {
      return false;
    }
    
    // Determine encounter severity based on heat
    let encounterType: 'routine' | 'suspicious' | 'hostile' | 'extreme';
    if (state.currentHeat <= 30) encounterType = 'routine';
    else if (state.currentHeat <= 50) encounterType = 'suspicious';
    else if (state.currentHeat <= 80) encounterType = 'hostile';
    else encounterType = 'extreme';
    
    // Calculate bribe cost
    const bribeCost = state.calculateBribeCost(state.currentHeat, state.wantedLevel);
    
    const encounter: PatrolEncounterState = {
      active: true,
      encounterType,
      patrolFaction: 'corporations', // Could vary based on location
      bribeCost,
      canBribe: state.wantedLevel < 5, // Can't bribe at max wanted
      canFlee: state.wantedLevel < 4, // Harder to flee at high levels
      inspectionRisk: Math.min(0.9, 0.2 + (state.wantedLevel * 0.15))
    };
    
    set({
      patrolEncounter: encounter,
      lastEncounterTime: now
    });
    
    console.log(`[HeatSystem] Patrol encounter triggered: ${encounterType}`);
    return true;
  },
  
  resolveEncounter: (choice: 'submit' | 'bribe' | 'flee' | 'fight') => {
    const state = get();
    const encounter = state.patrolEncounter;
    if (!encounter) return;
    
    const player = usePlayer.getState();
    const credits = useCreditsStore.getState();
    
    switch (choice) {
      case 'submit':
        // Risk of contraband discovery
        if (Math.random() < encounter.inspectionRisk) {
          // Found contraband!
          state.applyHeat('minor_smuggling', 1.5);
          console.log('[HeatSystem] Contraband found during inspection!');
        } else {
          // Clean inspection, slight heat reduction
          state.updateHeat(-2);
          console.log('[HeatSystem] Clean inspection, heat reduced slightly');
        }
        break;
        
      case 'bribe':
        if (encounter.canBribe && credits.spendCredits(encounter.bribeCost)) {
          // Successful bribe
          state.updateHeat(-5);
          state.applyHeat('bribery', 0.5); // Small heat for bribing
          console.log(`[HeatSystem] Bribed patrol for ${encounter.bribeCost} credits`);
        } else {
          console.log('[HeatSystem] Bribe failed!');
          state.applyHeat('bribery', 2);
        }
        break;
        
      case 'flee':
        if (encounter.canFlee && Math.random() > 0.3) {
          // Successful escape
          state.applyHeat('resisting_arrest', 1);
          console.log('[HeatSystem] Successfully fled from patrol');
        } else {
          // Failed escape
          state.applyHeat('resisting_arrest', 2);
          // Ship damage would be handled elsewhere
          console.log('[HeatSystem] Failed to escape, heat increased significantly');
        }
        break;
        
      case 'fight':
        // Major heat increase
        state.applyHeat('assault', 2);
        // Combat would be initiated elsewhere
        console.log('[HeatSystem] Engaged in combat with patrol!');
        break;
    }
    
    // Clear encounter
    set({ patrolEncounter: null });
  },
  
  calculateBribeCost: (heat: number, wantedLevel: WantedLevel): number => {
    const baseCost = 50;
    const heatMultiplier = heat / 10;
    const levelMultiplier = Math.pow(2, wantedLevel);
    
    return Math.round(baseCost * heatMultiplier * levelMultiplier);
  },
  
  // Heat Consequences
  checkHeatConsequences: () => {
    const state = get();
    const restrictions: string[] = [];
    const blacklist: string[] = [];
    
    // Apply mission restrictions
    if (state.wantedLevel >= 2) {
      restrictions.push('delivery'); // No legal deliveries
      restrictions.push('exploration'); // No corporate exploration
    }
    if (state.wantedLevel >= 3) {
      restrictions.push('escort'); // No escort missions
    }
    
    // Apply docking restrictions
    if (state.wantedLevel >= 4) {
      blacklist.push('Earth', 'Mars'); // Corporate strongholds
    }
    if (state.wantedLevel >= 5) {
      blacklist.push('Venus', 'Jupiter', 'Saturn'); // All major stations
    }
    
    // Trigger bounty hunters
    const bountyActive = state.wantedLevel >= 3;
    const bountyAmount = state.currentHeat * 100; // 100 credits per heat point
    
    set({
      missionRestrictions: restrictions,
      dockedStationsBlacklist: blacklist,
      bountyHunterActive: bountyActive,
      bountyAmount
    });
    
    if (bountyActive && !state.bountyHunterActive) {
      state.triggerBountyHunter();
    }
  },
  
  applyPriceModifiers: (basePrice: number): number => {
    const state = get();
    const markup = state.wantedLevelInfo.priceMarkup;
    return Math.round(basePrice * (1 + markup));
  },
  
  canDockAtStation: (stationFaction: string): boolean => {
    const state = get();
    const location = stationFaction; // Could be mapped to planet/station
    
    return !state.dockedStationsBlacklist.includes(location);
  },
  
  triggerBountyHunter: () => {
    console.log('[HeatSystem] Bounty hunters are now tracking you!');
    // This would trigger spawning of bounty hunter ships
    // Implementation would be in the combat/spawning system
  },
  
  // Heat Decay
  applyHeatDecay: (amount?: number) => {
    const state = get();
    const decayAmount = amount || state.getHeatDecayRate();
    
    state.updateHeat(-decayAmount);
    
    // Also update player's heat
    const player = usePlayer.getState();
    player.updateHeat(-decayAmount);
  },
  
  getHeatDecayRate: (): number => {
    const state = get();
    const baseDecay = 1; // 1 point per minute normally
    
    if (state.isLayingLow) {
      return 5; // 5 points per tick while laying low
    }
    
    // Modify based on reputation with corporations
    const player = usePlayer.getState();
    const corpRep = player.reputation.corporations;
    
    if (corpRep > 50) {
      return baseDecay * 1.5; // Faster decay with good corp reputation
    } else if (corpRep < -50) {
      return baseDecay * 0.5; // Slower decay with bad corp reputation
    }
    
    return baseDecay;
  }
}));