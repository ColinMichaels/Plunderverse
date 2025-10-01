// ============================================================================
// PLUNDERVERSE TYPE DEFINITIONS
// ============================================================================

// Base Types
export type Coordinate3D = {
  x: number;
  y: number;
  z: number;
};

export type FactionId = 'corporations' | 'independents' | 'outlaws';
export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'legendary';
export type NodeType = 'planet' | 'moon' | 'station' | 'asteroid' | 'derelict';

// ============================================================================
// PLAYER & PROGRESSION TYPES
// ============================================================================

export interface PlayerProfile {
  id: string;
  name: string;
  rank: number;
  rankTitle: string;
  credits: number;
  notoriety: number;
  reputation: Record<FactionId, number>;
  heatLevel: number;
  combatVictories: number;
  missionsCompleted: number;
  visitedNodes: Set<string>;
  knownLocations: string[];
  unlockedPerks: string[];
  currentLocation: string;
}

export interface Rank {
  id: string;
  level: number;
  title: string;
  description: string;
  requirements: {
    credits: number;
    missionsCompleted: number;
    notoriety: number;
    combatVictories?: number;
    specialRequirement?: string;
    crewLoyalty?: number;
  };
  benefits: {
    cargoCapacity: number;
    crewSlots: number;
    missionDifficultyMax: DifficultyLevel;
    shipUpgrade?: string;
    combatBonus?: number;
    blackMarketAccess?: boolean;
    intimidation?: boolean;
    crewEfficiency?: number;
    fleetCommand?: number;
    legendaryMissions?: boolean;
    fearAura?: boolean;
    allBonuses?: number;
    pirateFleetRespect?: boolean;
    pirateKing?: boolean;
    tributeSystem?: boolean;
    intimidationBonus?: number;
  };
  icon: string;
  special?: {
    title: string;
    description: string;
    rewards: string[];
  };
}

// ============================================================================
// SHIP & EQUIPMENT TYPES
// ============================================================================

export interface Ship {
  id: string;
  name: string;
  hull: number;
  maxHull: number;
  shields: number;
  maxShields: number;
  fuel: number;
  maxFuel: number;
  cargoCapacity: number;
  currentCargo: CargoItem[];
  crew: CrewMember[];
  maxCrewSlots: number;
  modules: ShipModule[];
  speed: number;
  scanResistance: number;
}

export interface ShipModule {
  id: string;
  name: string;
  category: 'utility' | 'defense' | 'weapons' | 'propulsion' | 'cargo' | 'stealth' | 'smuggling' | 'tools' | 'special';
  slot: 'sensor' | 'shield' | 'weapon' | 'engine' | 'cargo' | 'special';
  basePrice: number;
  weight: number;
  effects: Record<string, any>;
  description: string;
  icon: string;
  illegal?: boolean;
  restricted?: boolean;
  powerConsumption?: string;
  rarity?: string;
}

export interface CrewMember {
  id: string;
  name: string;
  role: 'navigator' | 'gunner' | 'engineer' | 'medic' | 'muscle';
  loyalty: number;
  wage: number;
  skills: Record<string, number>;
}

// ============================================================================
// MISSION TYPES
// ============================================================================

export interface Mission {
  id: string;
  title: string;
  description: string;
  type: 'delivery' | 'smuggling' | 'bounty' | 'exploration' | 'combat' | 'survival' | 'discovery';
  difficulty: DifficultyLevel;
  minRank: number;
  requirements: MissionRequirements;
  objectives: MissionObjective[];
  choices: MissionChoice[];
  rewards: MissionRewards;
  failureConsequences?: FailureConsequences;
  specialEvents?: SpecialEvent[];
  progress?: number;
  timeLimit?: number;
  active: boolean;
  completed: boolean;
}

export interface MissionRequirements {
  reputation?: Record<FactionId, number>;
  cargoSpace?: number;
  heatLevel?: { max?: number; min?: number };
  credits?: number;
  combatRating?: number;
  previousMissions?: string[];
  items?: string[];
}

// Trigger types for objectives
export type ObjectiveTriggerType = 
  | 'location'     // Player reaches specific coordinates or planet
  | 'collection'   // Player collects X amount of items
  | 'combat'       // Player defeats X enemies
  | 'interaction'  // Player interacts with specific object
  | 'custom'       // Any custom condition
  | 'travel'       // Legacy compatibility - travel to location
  | 'delivery'     // Legacy compatibility - deliver items
  | 'choice'       // Legacy compatibility - make a choice
  | 'investigation'; // Legacy compatibility - investigate something

export interface ObjectiveTriggerData {
  type: ObjectiveTriggerType;
  location?: string;           // For location triggers
  coordinates?: Coordinate3D;   // For precise location triggers
  radius?: number;             // Distance threshold for location triggers
  planet?: string;             // Specific planet name
  itemId?: string;            // For collection triggers
  itemType?: string;          // For collection triggers by type
  enemyType?: string;         // For combat triggers
  enemyFaction?: FactionId;  // For combat triggers by faction
  interactionId?: string;     // For interaction triggers
  customCondition?: string;   // For custom triggers
  currentValue?: number;      // Current progress value
  targetValue?: number;       // Target value to complete
}

export interface MissionObjective {
  id: string;
  type: 'travel' | 'combat' | 'delivery' | 'choice' | 'investigation';
  description: string;
  target?: string;
  locations?: string[];
  cargo?: string;
  quantity?: number;
  dialogue?: Record<string, string>;
  dynamic?: boolean;
  completed: boolean;
  // New trigger system fields
  triggerType?: ObjectiveTriggerType;
  triggerData?: ObjectiveTriggerData;
  progress?: number; // 0-100 percentage
  autoComplete?: boolean; // Whether to auto-complete when trigger conditions are met
}

export interface MissionChoice {
  id: string;
  text: string;
  appears?: string;
  requires?: string[];
  outcomes: ChoiceOutcome[];
}

export interface ChoiceOutcome {
  type: 'reward' | 'cost' | 'combat' | 'dialogue' | 'discovery' | 'skillCheck';
  description?: string;
  credits?: number;
  reputation?: Record<FactionId, number>;
  effects?: {
    notoriety?: number;
    heatLevel?: number;
    knowledge?: string[];
  };
  combat?: boolean;
  enemies?: string[];
  items?: string[];
  missionBranch?: string;
  character?: string;
  text?: string;
  playerOptions?: DialogueOption[];
  skill?: string;
  difficulty?: number;
  success?: Partial<ChoiceOutcome>;
  failure?: Partial<ChoiceOutcome>;
  combatOptional?: boolean;
}

export interface DialogueOption {
  text: string;
  outcome: Partial<ChoiceOutcome>;
}

export interface MissionRewards {
  base?: {
    credits: number;
    reputation?: Record<FactionId, number>;
    items?: string[];
  };
  bonus?: {
    condition: string;
    credits?: number;
    reputation?: Record<FactionId, number>;
    item?: string;
  };
  stealth?: {
    condition: string;
    credits?: number;
    reputation?: Record<FactionId, number>;
    item?: string;
  };
  variable?: boolean;
  description?: string;
}

export interface FailureConsequences {
  reputation?: Record<FactionId, number>;
  credits?: number;
  description?: string;
  heatLevel?: number;
}

export interface SpecialEvent {
  id: string;
  trigger: string;
  chance: number;
  description: string;
  type: 'combat' | 'dialogue' | 'discovery';
  enemies?: string[];
  rewards?: Partial<MissionRewards>;
}

// ============================================================================
// FACTION TYPES
// ============================================================================

export interface Faction {
  id: FactionId;
  name: string;
  description: string;
  color: string;
  traits: {
    lawful?: boolean;
    authoritarian?: boolean;
    wealthy?: boolean;
    neutral?: boolean;
    resourceful?: boolean;
    diverse?: boolean;
    chaotic?: boolean;
    opportunistic?: boolean;
    freedom?: boolean;
  };
  reputationLevels: ReputationLevel[];
  reactionModifiers: ReactionModifiers;
  territories: string[];
  relationships: Record<FactionId, number>;
  shopInventory: {
    focus: string[];
    forbidden: string[];
    exclusive: string[];
  };
  specialMechanics?: {
    notorietyDecay?: {
      description: string;
      rate: number;
    };
    safehouse?: {
      description: string;
      cost: number;
      heatReduction: number;
    };
    neutralGround?: boolean;
    noFactionPenalty?: boolean;
    informationBroker?: boolean;
  };
}

export interface ReputationLevel {
  min: number;
  max: number;
  name: string;
  description: string;
}

export interface ReactionModifiers {
  trading?: {
    priceMultiplier?: FormulaModifier;
    barterBonus?: FormulaModifier;
    blackMarketAccess?: ThresholdModifier;
    fenceMultiplier?: FormulaModifier;
  };
  security?: {
    scanChance?: FormulaModifier;
    responseTime?: FormulaModifier;
  };
  information?: {
    rumorAccess?: ThresholdModifier;
    secretAccess?: ThresholdModifier;
  };
  combat?: {
    intimidation?: FormulaModifier;
    crewMorale?: FormulaModifier;
  };
}

export interface FormulaModifier {
  formula: string;
  min: number;
  max: number;
  description?: string;
}

export interface ThresholdModifier {
  threshold: number;
  description: string;
}

// ============================================================================
// STAR NODE TYPES
// ============================================================================

export interface StarNode {
  id: string;
  name: string;
  type: NodeType;
  coordinates: Coordinate3D;
  faction: FactionId | null;
  factionControl: number;
  description: string;
  riskLevel: number;
  hidden?: boolean;
  services: NodeServices;
  economy?: NodeEconomy;
  security: NodeSecurity;
  yields?: ResourceYields;
  surfaceConditions?: SurfaceConditions;
  specialEvents?: SpecialNodeEvent[];
  warnings?: string[];
  specialMechanics?: Record<string, any>;
  discovery?: {
    requiresIntel: boolean;
    sources: string[];
  };
  hazards?: string[];
  exploration?: {
    loot_quality: string;
    danger: string;
    special_finds: string[];
  };
}

export interface NodeServices {
  refuel: boolean;
  repair: boolean;
  trade: boolean;
  missions: boolean;
  shipyard: boolean;
  blackMarket: boolean;
}

export interface NodeEconomy {
  wealth: 'poor' | 'moderate' | 'rich' | 'variable';
  imports: string[];
  exports: string[];
  priceModifiers: Record<string, number>;
}

export interface NodeSecurity {
  level: 'minimal' | 'low' | 'moderate' | 'high' | 'maximum' | 'lawless' | 'neutral' | 'paranoid';
  scanChance: number;
  response: string[];
  checkpoints: boolean;
  contraband_penalty?: {
    credits: number;
    reputation: number;
    heat: number;
    confiscate: boolean;
  };
}

export interface ResourceYields {
  minerals: number;
  fuel: number;
  scrap: number;
  rare_tech?: number;
}

export interface SurfaceConditions {
  gravity: number;
  atmosphere: 'breathable' | 'toxic' | 'thin' | 'none';
  hazards: string[];
}

export interface SpecialNodeEvent {
  id: string;
  type: string;
  chance: number;
  description: string;
}

// ============================================================================
// ITEM TYPES
// ============================================================================

export interface TradeGood {
  id: string;
  name: string;
  category: 'supplies' | 'technology' | 'military' | 'luxury' | 'resources' | 'illegal' | 'exotic';
  basePrice: number;
  weight: number;
  legal: boolean;
  restricted?: boolean;
  description: string;
  icon: string;
  heatGeneration?: number;
  fenceValue?: number;
  rarity?: string;
}

export interface CargoItem {
  itemId: string;
  quantity: number;
  acquiredAt: string;
  acquiredPrice: number;
  stolen?: boolean;
}

export interface SpecialItem {
  id: string;
  name: string;
  category: 'document' | 'cosmetic' | 'navigation' | 'safety';
  basePrice: number;
  weight: number;
  consumable?: boolean;
  effects: Record<string, any>;
  description: string;
  icon: string;
}

// ============================================================================
// ECONOMY TUNING TYPES
// ============================================================================

export interface EconomyTuning {
  starting_conditions: StartingConditions;
  fuel_costs: FuelCosts;
  repair_costs: RepairCosts;
  trading: TradingConfig;
  combat: CombatConfig;
  missions: MissionConfig;
  heat_system: HeatSystem;
  crew_management: CrewManagement;
  random_events: RandomEventConfig;
  progression: ProgressionConfig;
  difficulty_scaling: DifficultyScaling;
  balance_constants: BalanceConstants;
}

export interface StartingConditions {
  credits: number;
  fuel: number;
  hull: number;
  shields: number;
  cargo_capacity: number;
  starting_location: string;
}

export interface FuelCosts {
  base_consumption_per_jump: number;
  consumption_multipliers: Record<string, number>;
  refuel_prices: Record<FactionId, number>;
}

export interface RepairCosts {
  hull_per_point: number;
  shield_per_point: number;
  module_repair_base: number;
  faction_modifiers: Record<FactionId, number>;
}

export interface TradingConfig {
  base_profit_margin: number;
  distance_bonus_per_sector: number;
  risk_bonus: Record<string, number>;
  bulk_discount: {
    threshold: number;
    discount: number;
  };
  reputation_price_modifier: FormulaModifier;
}

export interface CombatConfig {
  base_reward_per_enemy: number;
  difficulty_multipliers: Record<string, number>;
  salvage_chance: number;
  salvage_value_range: {
    min: number;
    max: number;
  };
  escape_penalty: {
    reputation: number;
    credits: number;
  };
}

export interface MissionConfig {
  base_rewards: Record<DifficultyLevel, number>;
  time_bonus: Record<string, number>;
  reputation_rewards: Record<DifficultyLevel, number>;
  rank_multipliers?: Record<number, number>; // Multipliers for mission rewards based on player rank
  failure_penalties: {
    credits: number;
    reputation: number;
    notoriety: number;
  };
  daily_mission_refresh: number;
  max_active_missions: number;
}

export interface HeatSystem {
  max_heat: number;
  heat_generation: Record<string, number>;
  heat_decay: Record<string, number>;
  heat_consequences: Record<string, string>;
}

export interface CrewManagement {
  wages: Record<string, number>;
  loyalty: {
    base: number;
    success_bonus: number;
    failure_penalty: number;
    no_pay_penalty: number;
    shared_loot_bonus: number;
  };
  efficiency_bonuses: Record<string, Record<string, number>>;
  mutiny_threshold: number;
}

export interface RandomEventConfig {
  frequency: number;
  types: Record<string, RandomEventType>;
}

export interface RandomEventType {
  chance: number;
  karma_impact?: boolean;
  scales_with_cargo_value?: boolean;
  scales_with_heat?: boolean;
  loot_quality?: string;
  effects?: string;
  special_deals?: boolean;
}

export interface ProgressionConfig {
  xp_sources: Record<string, number>;
  rank_xp_requirements: number[];
  skill_points_per_rank: number;
  perk_unlock_ranks: number[];
}

export interface DifficultyScaling {
  enemy_health: FormulaScaling;
  enemy_damage: FormulaScaling;
  mission_complexity: {
    objectives_per_rank: number;
    max_objectives: number;
  };
  economy_inflation: {
    rate_per_rank: number;
    cap: number;
  };
}

export interface FormulaScaling {
  formula: string;
  cap: number;
}

export interface BalanceConstants {
  max_cargo_weight: number;
  base_ship_speed: number;
  scan_detection_base: number;
  combat_escape_chance: number;
  critical_hit_chance: number;
  critical_hit_multiplier: number;
  dodge_chance_base: number;
  shield_recharge_delay: number;
  fuel_emergency_reserve: number;
  reputation_change_cap: number;
  notoriety_decay_rate: number;
}

// ============================================================================
// CONTENT REGISTRY TYPES
// ============================================================================

export interface PlunderverseContent {
  missions: Mission[];
  factions: Faction[];
  starNodes: StarNode[];
  ranks: Rank[];
  tradeGoods: TradeGood[];
  shipModules: ShipModule[];
  specialItems: SpecialItem[];
  economyTuning: EconomyTuning;
}

export interface ContentValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type ReputationState = {
  [K in FactionId]: number;
};

export type MissionState = 'available' | 'active' | 'completed' | 'failed';

export interface GameState {
  player: PlayerProfile;
  ship: Ship;
  activeMissions: Mission[];
  completedMissions: string[];
  currentNode: string;
  gameTime: number;
  randomSeed: string;
}

// ============================================================================
// EVENT TYPES
// ============================================================================

export interface GameEvent {
  id: string;
  type: 'mission' | 'combat' | 'trade' | 'discovery' | 'faction' | 'random';
  timestamp: number;
  description: string;
  effects?: {
    credits?: number;
    reputation?: Record<FactionId, number>;
    notoriety?: number;
    heat?: number;
    items?: string[];
  };
}

// ============================================================================
// HELPER FUNCTIONS TYPE GUARDS
// ============================================================================

export function isFactionId(value: string): value is FactionId {
  return ['corporations', 'independents', 'outlaws'].includes(value);
}

export function isDifficultyLevel(value: string): value is DifficultyLevel {
  return ['easy', 'medium', 'hard', 'legendary'].includes(value);
}

export function isNodeType(value: string): value is NodeType {
  return ['planet', 'moon', 'station', 'asteroid', 'derelict'].includes(value);
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const MAX_HEAT = 100;
export const MAX_REPUTATION = 100;
export const MIN_REPUTATION = -100;
export const MAX_NOTORIETY = 150;
export const MAX_CARGO_WEIGHT = 1000;
export const MAX_CREW_LOYALTY = 100;
export const MIN_CREW_LOYALTY = 0;
export const MUTINY_THRESHOLD = 20;