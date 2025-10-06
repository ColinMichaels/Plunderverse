/**
 * Game Handbook TypeScript Interfaces
 * Comprehensive type definitions for the Plunderverse game handbook
 */

export interface GameHandbook {
  storyline: Storyline;
  controls: Controls;
  gameMechanics: GameMechanics;
  additionalInfo: AdditionalInfo;
}

export interface Storyline {
  year: number;
  setting: {
    name: string;
    description: string;
  };
  narrative: {
    overview: string;
    playerRole: string;
    acts: Act[];
    endings: number;
  };
}

export interface Act {
  number: number;
  title: string;
  description: string;
}

export interface Controls {
  movement: ControlGroup;
  thrust: ControlGroup;
  weapons: ControlGroup;
  camera: {
    look: string;
    zoom: string;
    description: string;
  };
  uiShortcuts: {
    [key: string]: string[];
    description: string;
  };
}

export interface ControlGroup {
  [key: string]: string[] | string;
  description: string;
}

export interface GameMechanics {
  tradeAndSurvive: TradeAndSurvive;
  missionAndStory: MissionAndStory;
  combatAndHeat: CombatAndHeat;
  economySystem: EconomySystem;
  factionReputation: FactionReputation;
  xpAndLeveling: XpAndLeveling;
}

export interface TradeAndSurvive {
  mining: {
    laserActivation: {
      min: number;
      max: number;
      unit: string;
    };
    resourceYield: {
      min: number;
      max: number;
      unit: string;
    };
    nodeTypes: string[];
    description: string;
  };
  trading: {
    totalGoods: number;
    strategy: string;
    planetEconomies: string;
    profitMargins: {
      min: number;
      max: number;
      unit: string;
    };
  };
  resourceManagement: {
    fuel: {
      max: number;
      consumption: string;
    };
    oxygen: {
      dailyConsumption: number;
      criticalLevel: number;
    };
    hull: {
      max: number;
      repairCost: string;
    };
    dailyCosts: {
      total: number;
      breakdown: {
        crew: number;
        maintenance: number;
        supplies: number;
      };
    };
    equipmentDegradation: {
      rate: number;
      unit: string;
    };
  };
}

export interface MissionAndStory {
  missionTypes: MissionType[];
  dialogueSystem: {
    features: string[];
    consequences: string;
  };
  rewards: {
    credits: {
      min: number;
      max: number;
    };
    reputation: {
      min: number;
      max: number;
    };
    additionalRewards: string[];
  };
}

export interface MissionType {
  type: 'delivery' | 'combat' | 'exploration' | 'story';
  description: string;
  frequency: 'common' | 'uncommon' | 'rare';
}

export interface CombatAndHeat {
  positioning: {
    type: string;
    description: string;
  };
  damageCalculation: {
    formula: string;
    criticalChance: string;
    criticalMultiplier: number;
    damageRange: {
      min: number;
      max: number;
      unit: string;
    };
  };
  wantedLevels: WantedLevel[];
  heatGeneration: {
    crime: {
      min: number;
      max: number;
    };
    killing: number;
    decay: string;
  };
}

export interface WantedLevel {
  level: number;
  name: string;
  heatThreshold: number;
  description: string;
}

export interface EconomySystem {
  pricingFormula: {
    description: string;
    formula: string;
    modifiers: {
      supply: string;
      demand: string;
      faction: string;
      heat: string;
    };
  };
  supplyDemand: {
    updateFrequency: string;
    volatility: string;
    playerImpact: string;
  };
  startingConditions: {
    credits: number;
    fuel: number;
    basicCargo: string[];
  };
}

export interface FactionReputation {
  range: {
    min: number;
    max: number;
  };
  levels: ReputationLevel[];
  changeFormula: string;
  decayRate: number;
  decayTarget: string;
  majorFactions: string[];
}

export interface ReputationLevel {
  name: string;
  threshold: number;
  effect: string;
}

export interface XpAndLeveling {
  levelCap: number;
  xpFormula: {
    required: string;
    missionBonus: string;
  };
  progression: {
    statsPerLevel: number;
    rankProgression: string;
    unlocks: string[];
  };
  experienceSources: ExperienceSource[];
}

export interface ExperienceSource {
  source: string;
  xp: string;
}

export interface AdditionalInfo {
  performanceTargets: {
    desktop: string;
    mobile: string;
    loadTime: string;
  };
  accessibility: {
    features: string[];
  };
  platforms: {
    web: string;
    mobile: string;
  };
}

// Export the type of the imported JSON for direct usage
export type HandbookData = typeof import('../data/gameHandbook.json');

// Helper function to load and validate the handbook
export function loadGameHandbook(): GameHandbook {
  return import('../data/gameHandbook.json') as unknown as GameHandbook;
}

// Utility type for accessing specific sections
export type HandbookSection = keyof GameHandbook;

// Utility function to get a specific section
export function getHandbookSection<T extends HandbookSection>(
  handbook: GameHandbook, 
  section: T
): GameHandbook[T] {
  return handbook[section];
}

// Export individual control types for easier usage
export type MovementControls = Controls['movement'];
export type WeaponControls = Controls['weapons'];
export type UIShortcuts = Controls['uiShortcuts'];

// Export mission type as enum for better type safety
export enum MissionTypeEnum {
  DELIVERY = 'delivery',
  COMBAT = 'combat',
  EXPLORATION = 'exploration',
  STORY = 'story'
}

// Export frequency enum
export enum MissionFrequency {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare'
}

// Export wanted level names as enum
export enum WantedLevelName {
  CLEAN = 'Clean',
  SUSPECTED = 'Suspected',
  WANTED = 'Wanted',
  DANGEROUS = 'Dangerous',
  INFAMOUS = 'Infamous',
  TERRORIST = 'Terrorist'
}

// Export faction names as constants
export const MAJOR_FACTIONS = [
  'Earth Government Remnants',
  'Mars Mining Consortium',
  'Belt Pirates',
  'Venus Trade Union',
  'Independent Traders'
] as const;

export type MajorFaction = typeof MAJOR_FACTIONS[number];

// Export reputation level names
export const REPUTATION_LEVELS = {
  HOSTILE: 'Hostile',
  UNFRIENDLY: 'Unfriendly',
  NEUTRAL: 'Neutral',
  FRIENDLY: 'Friendly',
  ALLIED: 'Allied'
} as const;

export type ReputationLevelName = typeof REPUTATION_LEVELS[keyof typeof REPUTATION_LEVELS];

// Export resource node types
export const RESOURCE_NODE_TYPES = ['Gold', 'Crystal', 'Iron', 'Rare Earth'] as const;
export type ResourceNodeType = typeof RESOURCE_NODE_TYPES[number];

// Constants extracted from the handbook
export const GAME_CONSTANTS = {
  YEAR: 2149,
  MAX_LEVEL: 100,
  MAX_FUEL: 100,
  MAX_HULL: 100,
  DAILY_COSTS: 60,
  STARTING_CREDITS: 300,
  STARTING_FUEL: 50,
  EQUIPMENT_DEGRADATION_RATE: 5,
  HEAT_DECAY_RATE: 1,
  FACTION_DECAY_RATE: 0.1,
  STATS_PER_LEVEL: 3,
  CRITICAL_CHANCE_BASE: 5,
  CRITICAL_MULTIPLIER: 1.5
} as const;

// Export formulas as functions for easy usage
export const GameFormulas = {
  calculateDamage: (weaponDamage: number, gunnerSkill: number): number => {
    return weaponDamage * (1 + gunnerSkill / 100);
  },
  
  calculateCriticalChance: (gunnerSkill: number): number => {
    return GAME_CONSTANTS.CRITICAL_CHANCE_BASE + (gunnerSkill * 0.1);
  },
  
  calculatePrice: (
    basePrice: number,
    supply: number,
    maxSupply: number,
    demand: number,
    maxDemand: number,
    reputation: number,
    wantedLevel: number
  ): number => {
    const supplyModifier = 1 - (supply / maxSupply) * 0.5;
    const demandModifier = 1 + (demand / maxDemand) * 0.5;
    const factionModifier = 1 + (reputation * 0.003);
    const heatModifier = 1 + (wantedLevel * 0.1);
    return basePrice * supplyModifier * demandModifier * factionModifier * heatModifier;
  },
  
  calculateXpRequired: (level: number): number => {
    return 100 * Math.pow(level, 1.5);
  },
  
  calculateMissionXp: (baseXp: number, difficulty: number): number => {
    return baseXp * (1 + difficulty * 0.5);
  }
};

// Type guard functions
export function isMissionType(type: string): type is MissionType['type'] {
  return ['delivery', 'combat', 'exploration', 'story'].includes(type);
}

export function isWantedLevel(level: number): level is 0 | 1 | 2 | 3 | 4 | 5 {
  return level >= 0 && level <= 5;
}

// Export default for convenient import
export default GameHandbook;