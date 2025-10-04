# Plunderverse - Complete Technical Specification v2.0

## Table of Contents
1. [Overview](#overview)
2. [User Preferences](#user-preferences)
3. [Complete Game Design Specification](#complete-game-design-specification)
4. [Mathematical Formulas and Algorithms](#mathematical-formulas-and-algorithms)
5. [Complete Data Schemas](#complete-data-schemas)
6. [Asset Specifications](#asset-specifications)
7. [UI Component Specifications](#ui-component-specifications)
8. [Game Balance Parameters](#game-balance-parameters)
9. [Test Suite Documentation](#test-suite-documentation)
10. [Platform-Specific Requirements](#platform-specific-requirements)
11. [System Architecture](#system-architecture)
12. [Database Architecture](#database-architecture)
13. [Network Protocol](#network-protocol)

---

## Overview
"Plunderverse" is a Firefly-inspired 3D space outlaw game built with React, Three.js, and Express. Set in a bankrupt solar system in 2149, players embody smugglers and space outlaws. The game focuses on core loops of trade & survival, mission & story progression, and combat & notoriety management, all within a dynamically generated and economically driven solar system. Its ambition is to provide a comprehensive, replayable outlaw experience in space.

**Core Technology Stack:**
- Frontend: React 18.3.1, Three.js (React Three Fiber 8.x), Zustand 5.0
- Backend: Express 4.x, PostgreSQL (Neon-backed), Drizzle ORM
- Build Tools: Vite 6.x, TypeScript 5.7
- Styling: TailwindCSS 3.x with Radix UI components

## User Preferences
Preferred communication style: Simple, everyday language.

### UI Design Guidelines
- **Action Buttons**: Use icon-only design with hover-over tooltips for better space efficiency
- **Button Style**: `bg-gray-900/90 hover:bg-cyan-600/90 text-cyan-400 hover:text-white w-10 h-10 rounded-lg border border-cyan-400/50 hover:border-cyan-400 transition-all backdrop-blur-sm flex items-center justify-center`
- **Icon Size**: Use `text-xl` for icon size within buttons
- **Tooltip**: Always include descriptive `title` attribute for accessibility
- **Consistency**: All new UI action items should follow this pattern for uniformity and better layout

---

## Complete Game Design Specification

### Core Gameplay Loops

#### Primary Loop: Trade & Survive
1. **Mining Phase** (5-10 minutes)
   - Land on planet surface
   - Navigate to resource nodes using visual and audio cues
   - Mine resources using laser (hold to extract)
   - Manage suit oxygen and equipment durability
   - Return to ship before resources depleted

2. **Trading Phase** (3-5 minutes)
   - Navigate to trading stations
   - Check market prices (dynamic based on faction, location, events)
   - Buy low, sell high across different systems
   - Manage cargo weight limits
   - Balance profit vs. risk (contraband pays more but generates heat)

3. **Resource Management** (continuous)
   - Fuel consumption: 10 units per jump (modified by distance)
   - Hull degradation: -1% per combat encounter
   - Shield recharge: 5% per second when not in combat
   - Life support: -100 credits per day
   - Crew wages: 130-200 credits per crew member per day

4. **Economic Pressure** (persistent)
   - Daily costs accumulate even when docked
   - Equipment degrades over time (1% per hour of use)
   - Faction reputation affects all prices
   - Market crashes can wipe out cargo value

#### Secondary Loop: Mission & Story
1. **Mission Discovery** (2-3 minutes)
   - Check mission boards at stations (3 new missions daily)
   - Reputation gates certain missions
   - Story missions unlock at specific ranks
   - Dynamic missions based on current events

2. **Objective Completion** (10-30 minutes)
   - Travel objectives: Navigate to specific coordinates
   - Combat objectives: Defeat X enemies of type Y
   - Collection objectives: Gather Z resources
   - Interaction objectives: Complete trades, dialogues

3. **Choice Points** (critical moments)
   - Moral choices affect karma score (-100 to +100)
   - Faction choices shift reputation permanently
   - Resource choices (save crew vs. save cargo)
   - Combat choices (fight, flee, or negotiate)

4. **Reward Collection** (immediate)
   - Base credits: 225-1500 based on difficulty
   - Reputation: ±5 to ±50 per faction
   - Items: Trade goods, ship modules, special items
   - Story progression: Unlock new acts, crew, locations

#### Tertiary Loop: Combat & Heat
1. **Combat Engagement** (2-5 minutes)
   - Detection range: 50-100 units based on enemy type
   - Initiative based on ship speed and crew bonuses
   - Turn-based positioning with real-time execution
   - Damage calculation: base * weapon * (1 - shields)

2. **Heat Generation**
   - +25 heat for failed contraband scan
   - +15 heat for combat with corporations
   - +10 heat for witnessed crimes
   - +5 heat for successful smuggling

3. **Notoriety Management**
   - 6 wanted levels (0-20, 21-40, 41-60, 61-80, 81-99, 100)
   - Each level spawns more aggressive patrols
   - Higher levels lock out corporate stations
   - Maximum heat triggers "shoot on sight" orders

4. **Patrol Spawning**
   - Base spawn rate: Every 60 seconds at heat > 50
   - Spawn chance: heat% / 2
   - Patrol strength scales with heat level
   - Bounty hunters spawn at heat > 75

### Complete Item Catalog (65 items)

#### Trade Goods (15 items)
| ID | Name | Category | Base Price | Weight | Legal | Heat Gen |
|---|---|---|---|---|---|---|
| food | Food Supplies | supplies | 100 | 1.0 | Yes | 0 |
| water | Water | supplies | 50 | 2.0 | Yes | 0 |
| medical_supplies | Medical Supplies | supplies | 500 | 0.5 | Yes | 0 |
| technology | Tech Components | technology | 1000 | 0.3 | Yes | 0 |
| weapons | Weapons | military | 2000 | 1.5 | No | 0 |
| luxury_goods | Luxury Items | luxury | 3000 | 0.8 | Yes | 0 |
| minerals | Common Minerals | resources | 300 | 3.0 | Yes | 0 |
| rare_minerals | Rare Minerals | resources | 5000 | 2.0 | Yes | 0 |
| fuel_cells | Fuel Cells | supplies | 200 | 1.0 | Yes | 0 |
| contraband | Contraband | illegal | 5000 | 0.5 | No | 10 |
| stolen_goods | Stolen Cargo | illegal | Variable | 1.0 | No | 5 |
| black_market_stims | Black Market Stims | illegal | 8000 | 0.1 | No | 15 |
| corporate_data | Corporate Data | illegal | 10000 | 0.01 | No | 25 |
| alien_artifacts | Alien Artifacts | exotic | 50000 | 1.0 | Restricted | 0 |

#### Ship Modules (13 items)
| ID | Slot | Price | Weight | Key Effects |
|---|---|---|---|---|
| basic_scanner | sensor | 5000 | 5 | scanRange: 100 |
| advanced_scanner | sensor | 15000 | 8 | scanRange: 250, detectHidden: true |
| hidden_compartment | cargo | 10000 | 10 | hiddenCargoSpace: 10, scanResistance: 0.5 |
| combat_shields | shield | 20000 | 15 | shieldStrength: 150, rechargeRate: 10 |
| stealth_module | special | 30000 | 12 | stealthRating: 0.7, heatSignature: -50 |
| turbo_thrusters | engine | 25000 | 20 | speed: 1.5x, fuelEfficiency: 0.8x |
| mining_laser | weapon | 8000 | 10 | miningEfficiency: 2.0x, combatDamage: 20 |
| plasma_cannon | weapon | 35000 | 25 | combatDamage: 100, armorPiercing: true |
| repair_drones | special | 15000 | 8 | autoRepair: 5/sec, repairEfficiency: 1.5x |
| cargo_expander | cargo | 12000 | 5 | cargoCapacity: +20 |
| emp_generator | special | 40000 | 18 | disableShips: true, range: 50, cooldown: 60s |
| jump_drive | special | 100000 | 30 | hyperJump: true, jumpRange: 500 |

#### Special Items (5 items)
| ID | Category | Price | Effects |
|---|---|---|---|
| forged_manifest | document | 2000 | bypassScan: 70% |
| corporate_id | document | 5000 | corporateAccess: true |
| pirate_flag | cosmetic | 1000 | intimidation: +10, pirateRespect: +5 |
| nav_charts | navigation | 10000 | revealHiddenNodes: true |
| emergency_beacon | safety | 1500 | callRescue: true (consumable) |

### Mission System

#### Mission Types
1. **Delivery Missions**
   - Cargo transport between stations
   - Time-sensitive medical supplies
   - Illegal smuggling runs
   - Passenger transport

2. **Combat Missions**
   - Bounty hunting
   - Escort duties
   - Pirate raids
   - Corporate strikes

3. **Exploration Missions**
   - Chart unknown systems
   - Investigate derelicts
   - Find lost artifacts
   - Rescue operations

4. **Story Missions** (30 total across 4 acts)
   - Act 1: 7 missions (The Rogue)
   - Act 2: 8 missions (The Outlaw)
   - Act 3: 8 missions (The Captain)
   - Act 4: 7 missions + 5 endings (The Legend)

#### Story Branches and Endings
1. **The Pirate King** (Evil path)
   - Requirements: Notoriety 90+, Outlaw rep 80+, Morality < -50
   - Rule through fear, control trade routes
   
2. **Hero of the People** (Good path)
   - Requirements: Independent rep 90+, Crew loyalty 85+, Morality > 50
   - Liberate colonies, break corporate control

3. **The Devil's Bargain** (Sellout path)
   - Requirements: Corporate rep 70+, 1M credits, Morality > -20
   - Join the corporations, betray your ideals

4. **Ghost of the Frontier** (Independent path)
   - Requirements: Notoriety 100, No faction > 60 rep
   - Remain free, answer to no one

5. **The Redeemed** (Redemption path)
   - Requirements: Started evil, Morality 75+, Saved refugees
   - Change your ways, become a hero

### Combat System

#### Enemy Types (8 types)
| Type | Hull | Shield | Weapon | Detection | Reward |
|---|---|---|---|---|---|
| Scout | 40 | 20 | Laser (10 dmg) | 60 | 100 credits |
| Patrol | 60 | 40 | Plasma (20 dmg) | 80 | 200 credits |
| Interceptor | 50 | 60 | Rapid (5 dmg x5) | 90 | 150 credits |
| Bomber | 80 | 30 | Missile (40 dmg) | 70 | 300 credits |
| Battleship | 150 | 100 | Multi (30 dmg) | 100 | 500 credits |
| Elite | 100 | 60 | Rapid (8 dmg x5) | 100 | 500 credits |
| Bounty Hunter | 75 | 75 | Plasma (25 dmg) | 120 | 400 credits |
| Boss | 200 | 150 | All weapons | 150 | 1000 credits |

#### AI Behaviors
- **Patrol**: Follow waypoints, investigate disturbances
- **Aggressive**: Direct assault, no retreat
- **Defensive**: Maintain distance, use cover
- **Fleeing**: Retreat when hull < 30%
- **Orbiting**: Circle target, strafe attacks
- **Pursuing**: Chase until target destroyed

### Mining Mechanics

#### Resource Nodes
- **Common Minerals**: 70% spawn rate, 100-300 units
- **Rare Minerals**: 20% spawn rate, 50-150 units
- **Exotic Materials**: 5% spawn rate, 10-50 units
- **Fuel Deposits**: 5% spawn rate, 100-200 units

#### Mining Process
1. Scan for nodes (range: 50m base, 100m with scanner)
2. Approach node (triggers particle effects)
3. Align laser (accuracy affects efficiency)
4. Hold to extract (2-5 seconds per unit)
5. Node depletes (visual deformation)
6. Collect floating resources

#### Surface Hazards
- **Radiation Zones**: -5 health/second
- **Dust Storms**: Reduced visibility, -10% movement
- **Extreme Temperature**: Suit power drain 2x
- **Hostile Wildlife**: Random attacks (10-20 damage)
- **Equipment Failure**: 1% chance per hour

---

## Mathematical Formulas and Algorithms

### Experience and Progression
```
XP Gain = baseXP * difficultyMultiplier * (1 + crewBonus)
where:
  baseXP = {easy: 50, medium: 100, hard: 200, legendary: 500}
  difficultyMultiplier = playerRank * 0.1 + 1.0
  crewBonus = sum(crewLoyalty / 100 * 0.1)

Level Up Requirement = 1000 * (currentLevel ^ 1.5)
Skill Points per Level = 3 + floor(level / 5)
```

### Combat Calculations
```
Damage Dealt = baseDamage * weaponMultiplier * criticalMultiplier - targetArmor
where:
  baseDamage = weapon.damage
  weaponMultiplier = 1.0 + (gunnerSkill / 100)
  criticalMultiplier = isCritical ? 2.0 : 1.0
  criticalChance = 0.1 + (luck * 0.01)
  targetArmor = shield > 0 ? shield * 0.5 : hull * 0.1

Shield Recharge = maxShield * rechargeRate * deltaTime
where:
  rechargeRate = 0.05 + (engineerSkill / 100 * 0.03)
  deltaTime = seconds since last damage > 5 ? 1.0 : 0.0

Hit Chance = baseAccuracy * (1 - evasion) * distanceModifier
where:
  baseAccuracy = 0.7 + (gunnerSkill / 100 * 0.3)
  evasion = targetSpeed / 100 * 0.5
  distanceModifier = max(0.3, 1.0 - distance / maxRange)
```

### Economic Formulas
```
Trade Price = basePrice * factionModifier * supplyDemandModifier * eventModifier
where:
  factionModifier = 1.5 - (reputation * 0.01)  // Range: 0.5 to 2.5
  supplyDemandModifier = 2.0 - (localSupply / localDemand)  // Range: 0.5 to 2.0
  eventModifier = {normal: 1.0, shortage: 2.0, surplus: 0.5}

Profit Margin = (sellPrice - buyPrice) / buyPrice * 100
Trade XP = profitMargin * cargoValue / 1000

Mission Reward = baseReward * rankMultiplier * reputationBonus * difficultyBonus
where:
  rankMultiplier = 1.0 + (playerRank * 0.1)
  reputationBonus = 1.0 + (factionRep / 100 * 0.5)
  difficultyBonus = {easy: 0.5, medium: 1.0, hard: 2.0, legendary: 3.0}
```

### Heat and Notoriety
```
Heat Generation = baseHeat * (1 + notoriety / 100)
Heat Decay = -1 per hour * (1 + (outlawRep / 100))
          = -5 per hour when laying low
          = -10 per bribe (costs: heat * 100 credits)

Patrol Spawn Rate = baseRate * (heat / 100) * difficultyMultiplier
where:
  baseRate = 1 patrol per 60 seconds
  difficultyMultiplier = {easy: 0.5, medium: 1.0, hard: 1.5, legendary: 2.0}

Scan Detection Chance = baseScan * (1 - stealthRating) * (heat / 100)
where:
  baseScan = {corporations: 0.95, independents: 0.3, outlaws: 0.0}
  stealthRating = sum(stealthModules.rating)
```

### Fuel and Navigation
```
Fuel Consumption = baseConsumption * distanceMultiplier * shipWeight * efficiency
where:
  baseConsumption = 10 units per jump
  distanceMultiplier = distance / 100  // 0.5x to 3.0x
  shipWeight = 1.0 + (currentCargo / maxCargo * 0.5)
  efficiency = 1.0 - (engineerBonus * 0.2) - (thrusterUpgrade * 0.3)

Jump Accuracy = baseAccuracy * (1 + navigatorBonus) * (fuel > 20% ? 1.0 : 0.5)
Jump Time = baseTime / (1 + navigatorSkill / 100)
where:
  baseTime = distance / 50 seconds
  baseAccuracy = 0.8
```

### Crew Management
```
Loyalty Change = baseChange * personalityModifier * recentEvents
where:
  baseChange = {
    missionSuccess: +3,
    missionFailure: -5,
    paidOnTime: +1,
    paidLate: -3,
    noPay: -10,
    giftBonus: +5
  }
  personalityModifier = crew.personalityMatch ? 1.5 : 0.75
  recentEvents = average(last5Events)

Crew Efficiency = (loyalty / 100) * skillLevel * synergyBonus
where:
  synergyBonus = 1.0 + (matchingCrewMembers * 0.1)

Mutiny Chance = loyalty < 20 ? (20 - loyalty) * 5 : 0
```

### Mining and Resources
```
Mining Yield = baseYield * toolEfficiency * skillBonus * nodeQuality
where:
  baseYield = 10 units per second
  toolEfficiency = {basic: 0.5, mining_laser: 1.0, advanced: 1.5}
  skillBonus = 1.0 + (miningSkill / 100)
  nodeQuality = {poor: 0.5, common: 1.0, rich: 2.0, pristine: 3.0}

Resource Value = baseValue * rarity * quality * marketDemand
Extraction Time = nodeSize / (miningRate * efficiency)
Node Depletion = currentSize - (extractionRate * deltaTime)
```

### Physics and Movement
```
Ship Velocity = thrust * deltaTime * thrusterEfficiency - drag
where:
  thrust = enginePower * (fuel > 0 ? 1.0 : 0.1)
  drag = velocity * 0.98  // Space friction for gameplay
  thrusterEfficiency = 1.0 - (damage / 100 * 0.5)

Collision Damage = relativeVelocity * mass * 0.1
Gravity Well Force = (planetMass / distance^2) * gravitationalConstant
where:
  gravitationalConstant = 0.01  // Scaled for gameplay
```

---

## Complete Data Schemas

### Core Type Definitions
```typescript
// Coordinate System
interface Coordinate3D {
  x: number;  // -1000 to 1000 units
  y: number;  // -1000 to 1000 units
  z: number;  // -500 to 500 units (vertical)
}

// Faction System
type FactionId = 'corporations' | 'independents' | 'outlaws';
type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'legendary';
type NodeType = 'planet' | 'moon' | 'station' | 'asteroid' | 'derelict';

// Game State
interface GameState {
  player: PlayerProfile;
  ship: Ship;
  activeMissions: Mission[];
  completedMissions: string[];
  currentNode: string;
  gameTime: number;  // Seconds since game start
  randomSeed: string;
  version: string;
}
```

### Player Profile Schema
```typescript
interface PlayerProfile {
  id: string;                          // UUID
  name: string;                         // 3-20 characters
  rank: number;                         // 0-10
  rankTitle: string;                    // e.g., "Space Pirate Supreme"
  credits: number;                      // 0-999999999
  notoriety: number;                    // 0-150
  reputation: {
    corporations: number;               // -100 to 100
    independents: number;               // -100 to 100
    outlaws: number;                    // -100 to 100
  };
  heatLevel: number;                   // 0-100
  combatVictories: number;             // Total enemies defeated
  missionsCompleted: number;           // Total missions
  visitedNodes: string[];              // Node IDs
  knownLocations: string[];            // Discovered hidden locations
  unlockedPerks: string[];             // Perk IDs
  currentLocation: string;             // Node ID
  
  // Statistics
  totalPlayTime: number;               // Seconds
  totalJumps: number;
  totalDamageDealt: number;
  totalDamageTaken: number;
  totalCreditsEarned: number;
  totalCrewLost: number;
  
  // Story Progress
  currentAct: number;                  // 1-4
  storyFlags: Record<string, boolean>; // Story decision tracking
  karmaScore: number;                  // -100 to 100
}
```

### Ship Configuration Schema
```typescript
interface Ship {
  id: string;
  name: string;                    // Custom ship name
  model: string;                   // Ship class/type
  
  // Core Systems (0-100)
  hull: number;
  maxHull: number;
  shields: number;
  maxShields: number;
  fuel: number;
  maxFuel: number;
  
  // Cargo
  cargoCapacity: number;           // Max weight units
  currentCargo: CargoItem[];
  hiddenCargoCapacity: number;     // Smuggling compartments
  
  // Crew
  crew: CrewMember[];
  maxCrewSlots: number;
  
  // Equipment
  modules: ShipModule[];
  weapons: WeaponSystem[];
  
  // Performance
  speed: number;                   // Units per second
  turnRate: number;                // Radians per second
  scanResistance: number;          // 0.0-1.0
  signature: number;               // Detection radius
}

interface CargoItem {
  itemId: string;
  quantity: number;
  acquiredAt: string;              // Node ID
  acquiredPrice: number;
  stolen: boolean;
  hidden: boolean;                 // In smuggling compartment
}

interface WeaponSystem {
  slot: number;                    // 0-3
  weaponId: string;
  damage: number;
  fireRate: number;                // Shots per second
  range: number;
  ammo: number;                    // -1 for unlimited
  maxAmmo: number;
}
```

### Mission Structure Schema
```typescript
interface Mission {
  id: string;
  title: string;
  description: string;
  type: 'delivery' | 'smuggling' | 'bounty' | 'exploration' | 
        'combat' | 'survival' | 'discovery' | 'story';
  difficulty: DifficultyLevel;
  minRank: number;
  
  // Requirements
  requirements: {
    reputation?: Record<FactionId, number>;
    cargoSpace?: number;
    heatLevel?: { max?: number; min?: number };
    credits?: number;
    combatRating?: number;
    previousMissions?: string[];
    items?: string[];
    crew?: string[];
  };
  
  // Objectives
  objectives: MissionObjective[];
  currentObjective: number;
  
  // Choices and Branches
  choices: MissionChoice[];
  selectedChoices: string[];
  
  // Rewards
  rewards: {
    base: {
      credits: number;
      reputation?: Record<FactionId, number>;
      items?: string[];
      experience?: number;
    };
    bonus?: {
      condition: string;
      credits?: number;
      reputation?: Record<FactionId, number>;
      item?: string;
    };
  };
  
  // Status
  active: boolean;
  completed: boolean;
  failed: boolean;
  timeLimit?: number;              // Seconds
  timeStarted?: number;            // Timestamp
}

interface MissionObjective {
  id: string;
  description: string;
  type: 'location' | 'collection' | 'combat' | 'interaction' | 'survival';
  
  // Progress Tracking
  progress: number;                 // 0-100
  targetValue: number;
  currentValue: number;
  
  // Trigger Data
  triggerType?: 'automatic' | 'manual' | 'proximity' | 'time';
  triggerConditions?: {
    location?: string;
    radius?: number;
    itemType?: string;
    enemyType?: string;
    interactionId?: string;
  };
  
  // State
  completed: boolean;
  failed: boolean;
}
```

### Crew Member Schema
```typescript
interface CrewMember {
  id: string;
  name: string;
  title: string;                   // Role/position
  background: string;               // Backstory
  
  // Personality
  personality: {
    traits: string[];               // 4-5 traits
    quirks: string[];               // 2-3 quirks
    values: string[];               // 3 core values
  };
  
  // Skills (0-100)
  skills: {
    mechanic: number;               // Ship repair, maintenance
    pilot: number;                  // Navigation, evasion
    hacker: number;                 // Security, information
    medic: number;                  // Healing, crew health
    gunner: number;                 // Combat, accuracy
    negotiator: number;             // Trading, diplomacy
  };
  
  // Management
  loyalty: number;                  // 0-100
  wage: number;                     // Daily credits
  hiringCost: number;              // One-time payment
  
  // Relationships
  preferredFaction: FactionId | null;
  hatedFaction: FactionId | null;
  relationships: Record<string, number>; // With other crew
  
  // Personal Quest
  personalQuest?: {
    id: string;
    title: string;
    status: 'locked' | 'available' | 'active' | 'completed';
    currentStage: number;
    stages: string[];
  };
  
  // Current Status
  health: number;                   // 0-100
  morale: number;                   // 0-100
  location: 'ship' | 'station' | 'mission' | 'lost';
}
```

### Star System Node Schema
```typescript
interface StarNode {
  id: string;
  name: string;
  type: NodeType;
  coordinates: Coordinate3D;
  
  // Control
  faction: FactionId | null;
  factionControl: number;           // 0-100 percentage
  
  // Properties
  description: string;
  riskLevel: number;                // 1-5
  hidden: boolean;
  discovered: boolean;
  
  // Services
  services: {
    refuel: boolean;
    repair: boolean;
    trade: boolean;
    missions: boolean;
    shipyard: boolean;
    blackMarket: boolean;
    crew: boolean;
    storage: boolean;
  };
  
  // Economy
  economy?: {
    wealth: 'poor' | 'moderate' | 'rich' | 'variable';
    imports: string[];              // Item IDs
    exports: string[];              // Item IDs
    priceModifiers: Record<string, number>;
    currentPrices?: Record<string, number>;
  };
  
  // Security
  security: {
    level: 'minimal' | 'low' | 'moderate' | 'high' | 'maximum' | 'lawless';
    scanChance: number;             // 0.0-1.0
    response: string[];             // Enemy types that respond
    checkpoints: boolean;
    patrolRoutes?: string[][];      // Node ID paths
  };
  
  // Resources (for planets/asteroids)
  resources?: {
    minerals: number;               // 0.0-1.0 abundance
    fuel: number;
    scrap: number;
    rareTech?: number;
  };
  
  // Surface Conditions (for landable bodies)
  surface?: {
    gravity: number;                // 0.0-2.0 (1.0 = Earth)
    atmosphere: 'breathable' | 'toxic' | 'thin' | 'none';
    temperature: { min: number; max: number };
    hazards: string[];
    landingSites: number;
  };
}
```

### Database Schema (PostgreSQL)
```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  username VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP
);

-- Game saves table  
CREATE TABLE game_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  slot_number INTEGER NOT NULL CHECK (slot_number BETWEEN 1 AND 3),
  save_name VARCHAR(255) NOT NULL,
  game_state JSONB NOT NULL,
  play_time INTEGER DEFAULT 0,
  credits INTEGER DEFAULT 0,
  location VARCHAR(255) NOT NULL,
  ship_status JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, slot_number)
);

-- Sessions table (for auth)
CREATE TABLE session (
  sid VARCHAR PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_game_saves_user_id ON game_saves(user_id);
CREATE INDEX idx_session_expire ON session(expire);
```

---

## Asset Specifications

### Texture Assets (33 total)

#### Planet Textures (11 files)
- `2k_earth_daymap.jpg` - 2048x1024, Earth surface map
- `2k_mars.jpg` - 2048x1024, Mars surface map
- `2k_jupiter.jpg` - 2048x1024, Jupiter cloud bands
- `2k_saturn.jpg` - 2048x1024, Saturn surface
- `2k_venus_surface.jpg` - 2048x1024, Venus clouds
- `2k_mercury.jpg` - 2048x1024, Mercury craters
- `2k_moon.jpg` - 2048x1024, Luna surface
- `2k_neptune.jpg` - 2048x1024, Neptune storms
- `2k_uranus.jpg` - 2048x1024, Uranus surface
- `2k_sun.jpg` - 2048x1024, Sun photosphere
- `2k_ceres_fictional.jpg` - 2048x1024, Asteroid texture

#### Terrain Textures (5 files)
- `earth_grass.png` - 1024x1024, Seamless grass
- `grass.png` - 512x512, Detail grass texture
- `mars_terrain.png` - 1024x1024, Red rocky surface
- `moon_terrain.png` - 1024x1024, Gray lunar regolith
- `sand.jpg` - 1024x1024, Desert sand texture

#### Material Textures (4 files)
- `asphalt.png` - 512x512, Dark rough surface
- `crystal_mineral.png` - 512x512, Blue crystal resource
- `gold_ore.png` - 512x512, Gold mineral texture
- `wood.jpg` - 512x512, Wooden surface

#### Surface Detail (1 file)
- `black-white-details-moon-texture-concept.jpg` - 2048x2048, High detail moon surface

#### Sky (1 file)
- `sky.png` - 2048x1024, Space skybox texture

### Audio Assets (18 total)

#### Sound Effects (9 files)
| File | Duration | Purpose | Format |
|---|---|---|---|
| background.mp3 | Loop | Ambient space sounds | MP3, 128kbps |
| hit.mp3 | 0.5s | Impact/damage sound | MP3, 128kbps |
| space-ambience.mp3 | Loop | Deep space ambience | MP3, 128kbps |
| space-helmet-breathing.mp3 | Loop | EVA breathing | MP3, 128kbps |
| space-lazer.mp3 | 0.3s | Weapon fire | MP3, 192kbps |
| space-vaccum-door.mp3 | 2s | Airlock cycling | MP3, 128kbps |
| success.mp3 | 1s | Achievement/complete | MP3, 128kbps |
| thruster.mp3 | Loop | Engine sounds | MP3, 128kbps |
| zap.mp3 | 0.2s | Electric/shield hit | MP3, 128kbps |

#### Music Tracks (9 files)
| File | Duration | Mood | Usage |
|---|---|---|---|
| PlunderverseTheme.mp3 | 3:45 | Epic/Adventure | Main menu |
| Plunderverse_Aura.mp3 | 4:20 | Atmospheric | Exploration |
| Plunderverse_Aura2.mp3 | 3:55 | Tense | Combat |
| ES_Ame - Shinji Wakasa.mp3 | 3:12 | Calm | Trading |
| ES_Cairn - By Lotus.mp3 | 4:05 | Mysterious | Discovery |
| ES_Lovesick - Cushy.mp3 | 3:30 | Emotional | Story moments |
| ES_Night Sky Travel.mp3 | 5:10 | Ambient | Space travel |
| ES_Orbit - Van Sandano.mp3 | 4:45 | Uplifting | Success |
| ES_Rotting Circuit.mp3 | 3:20 | Dark | Danger zones |

### 3D Model Assets (12 asteroids + extras)

#### Asteroid Models (FBX format)
- `_asteroid_01.fbx` through `_asteroid_10.fbx` - Various asteroid shapes
- `Asteroid_1b.fbx` - Special large asteroid
- File sizes: 50KB - 200KB each
- Polygon count: 500-2000 triangles
- UV mapped for texturing

#### Special Models
- `heart.gltf` - Special collectible model
- Used for Valentine's event or special items

### Font Assets
- `inter.json` - Inter font family configuration
- Weights: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)
- Used throughout UI for consistency

---

## UI Component Specifications

### Layout System

#### Desktop Layout (1920x1080 standard)
```
┌─────────────────────────────────────────────────────┐
│ Top Bar (60px)                                      │
│ [Logo] [Stats] [Credits] [Heat] [Location] [Menu]  │
├───────────┬─────────────────────────┬───────────────┤
│ Left      │                         │ Right         │
│ Sidebar   │   Main 3D Viewport      │ Sidebar       │
│ (300px)   │   (Variable)            │ (300px)       │
│           │                         │               │
│ Panels:   │                         │ Actions:      │
│ - Nav     │                         │ - Quick       │
│ - Mission │                         │ - Combat      │
│ - Trade   │                         │ - Comms       │
│ - Ship    │                         │               │
├───────────┴─────────────────────────┴───────────────┤
│ Bottom Controls (100px)                             │
│ [Thrust] [Weapons] [Shield] [Scan] [Jump]          │
└─────────────────────────────────────────────────────┘
```

#### Mobile Layout (375x812 iPhone X standard)
```
┌─────────────────────────┐
│ Header (50px)           │
│ [☰] Credits Heat [⚙]    │
├─────────────────────────┤
│                         │
│   3D Viewport           │
│   (Variable)            │
│                         │
│   [Virtual Joystick]    │
│                         │
├─────────────────────────┤
│ Action Bar (80px)       │
│ [🚀][⚔][🛡][📡][✈]      │
└─────────────────────────┘

Slide Panels (Full screen overlays):
- Navigation (from left)
- Ship Status (from right)  
- Missions (from bottom)
- Trade (from bottom)
```

### Color Palette

#### Primary Colors
- **Background Dark**: `#0a0e1a` - Deep space black
- **Background Medium**: `#1a1f2e` - Panel backgrounds
- **Background Light**: `#2a2f3e` - Hover states

#### Accent Colors
- **Cyan Primary**: `#00ffff` - Main accent, selections
- **Cyan Dark**: `#00cccc` - Pressed states
- **Cyan Light**: `#66ffff` - Highlights

#### Status Colors
- **Success Green**: `#10b981` - Positive actions
- **Warning Yellow**: `#f59e0b` - Caution states
- **Danger Red**: `#ef4444` - Errors, damage
- **Info Blue**: `#3b82f6` - Information

#### Faction Colors
- **Corporations Gold**: `#FFD700`
- **Independents Green**: `#4CAF50`
- **Outlaws Red**: `#FF4444`

### Component Specifications

#### Button Component
```css
.button-primary {
  background: rgba(10, 14, 26, 0.9);
  border: 1px solid rgba(0, 255, 255, 0.5);
  color: #00ffff;
  padding: 10px 20px;
  border-radius: 8px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
}

.button-primary:hover {
  background: rgba(0, 204, 204, 0.9);
  border-color: #00ffff;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(0, 255, 255, 0.3);
}
```

#### Panel Component
```css
.panel {
  background: linear-gradient(135deg, 
    rgba(26, 31, 46, 0.95) 0%,
    rgba(10, 14, 26, 0.95) 100%);
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 12px;
  padding: 20px;
  backdrop-filter: blur(20px);
  box-shadow: 
    0 10px 40px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}
```

#### HUD Elements
```css
.hud-stat {
  font-family: 'Inter', monospace;
  font-size: 14px;
  font-weight: 500;
  color: #00ffff;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
  letter-spacing: 0.05em;
}

.hud-label {
  font-size: 11px;
  color: rgba(0, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
```

### Animation Specifications

#### Panel Transitions
- **Slide In**: `transform: translateX(-100%) to translateX(0)`
- **Duration**: 300ms
- **Easing**: `cubic-bezier(0.4, 0, 0.2, 1)`
- **Stagger**: 50ms between panels

#### Button Interactions
- **Hover Scale**: `transform: scale(1.05)`
- **Press Scale**: `transform: scale(0.95)`
- **Duration**: 150ms
- **Easing**: `ease-out`

#### Loading States
- **Pulse**: `opacity: 0.5 to 1.0`
- **Duration**: 1000ms
- **Iteration**: Infinite
- **Easing**: `ease-in-out`

#### Combat Feedback
- **Screen Shake**: `transform: translate(random(-10px, 10px))`
- **Duration**: 100ms
- **Intensity**: Based on damage amount
- **Decay**: Linear over 500ms

### Responsive Breakpoints
```css
/* Mobile */
@media (max-width: 767px) {
  /* Stack all panels vertically */
  /* Show mobile-specific controls */
  /* Increase touch target sizes to 44px minimum */
}

/* Tablet */
@media (min-width: 768px) and (max-width: 1023px) {
  /* 2-column layout */
  /* Hybrid controls (touch + keyboard) */
}

/* Desktop */
@media (min-width: 1024px) {
  /* Full 3-column layout */
  /* Keyboard shortcuts enabled */
  /* Hover states active */
}

/* Large Desktop */
@media (min-width: 1920px) {
  /* Scale UI up to 125% */
  /* Show additional detail panels */
}
```

---

## Game Balance Parameters

### Economy Balance

#### Starting Conditions
```json
{
  "credits": 1000,
  "fuel": 100,
  "hull": 100,
  "shields": 50,
  "cargo_capacity": 10,
  "starting_location": "neutral_zone"
}
```

#### Daily Operating Costs
- Base life support: 100 credits/day
- Crew wages: 130-200 credits/day per member
- Ship maintenance: 50 credits/day
- Docking fees: 20-100 credits (varies by faction)

#### Trading Profit Margins
- Safe routes: 10-30% profit
- Moderate risk: 30-60% profit
- High risk: 60-150% profit
- Contraband: 100-300% profit (with heat penalty)

### Combat Balance

#### Weapon Damage Table
| Weapon Type | Base Damage | Fire Rate | Range | Energy Cost |
|---|---|---|---|---|
| Laser | 10 | 2/sec | 100 | 5 |
| Plasma | 20 | 1/sec | 80 | 10 |
| Missile | 40 | 0.3/sec | 150 | 20 |
| Rapid Fire | 5 | 5/sec | 60 | 3 |
| Ion Cannon | 15 | 1.5/sec | 90 | 15 |

#### Enemy Scaling
```
Level 1-3: Base stats
Level 4-6: 150% health, 120% damage
Level 7-9: 200% health, 150% damage  
Level 10: 300% health, 200% damage, special abilities
```

#### Difficulty Multipliers
- Easy: 0.5x enemy stats, 1.5x rewards
- Medium: 1.0x enemy stats, 1.0x rewards
- Hard: 1.5x enemy stats, 1.5x rewards
- Legendary: 2.0x enemy stats, 3.0x rewards

### Mission Rewards

#### Base Mission Payments
| Difficulty | Credits | Reputation | XP |
|---|---|---|---|
| Easy | 225 | 5 | 50 |
| Medium | 500 | 10 | 100 |
| Hard | 1000 | 20 | 200 |
| Legendary | 1500 | 50 | 500 |

#### Rank Multipliers
```
Rank 0-1: 1.0x
Rank 2-3: 1.25x
Rank 4-5: 1.6x
Rank 6-7: 2.0x
Rank 8-9: 2.6x
Rank 10: 3.0x
```

### Reputation System

#### Reputation Thresholds
| Level | Range | Effects |
|---|---|---|
| Hated | -100 to -50 | Kill on sight, 2x prices |
| Hostile | -49 to -20 | No services, 1.5x prices |
| Unfriendly | -19 to -5 | Limited services, 1.2x prices |
| Neutral | -4 to 4 | Standard treatment |
| Friendly | 5 to 20 | 5% discount, tips |
| Allied | 21 to 50 | 20% discount, protection |
| Revered | 51 to 100 | 40% discount, special items |

#### Reputation Decay
- All reputations decay toward 0 at 1 point/day
- Positive actions cap at +20 per event
- Negative actions cap at -25 per event
- Critical story moments can change ±50

### Heat System Thresholds

| Heat Level | Effects | Patrol Frequency |
|---|---|---|
| 0-20 | None | None |
| 21-40 | Increased scans | Every 120 seconds |
| 41-60 | Denied corporate docking | Every 90 seconds |
| 61-80 | Active hunter patrols | Every 60 seconds |
| 81-99 | Multiple patrol spawns | Every 30 seconds |
| 100 | Shoot on sight, battleship spawns | Every 15 seconds |

### Crew Loyalty System

#### Loyalty Modifiers
- Mission success: +3
- Mission failure: -5
- Paid on time: +1
- Paid late: -3
- No pay: -10
- Gift bonus: +5
- Aligned choice: +2
- Opposed choice: -4
- Crew death: -15 (all crew)
- Personal quest complete: +20

#### Loyalty Effects
| Loyalty | Status | Effects |
|---|---|---|
| 0-20 | Mutinous | May desert, -50% efficiency |
| 21-40 | Disloyal | -25% efficiency |
| 41-60 | Neutral | Normal performance |
| 61-80 | Loyal | +10% efficiency |
| 81-95 | Devoted | +25% efficiency |
| 96-100 | Fanatical | +50% efficiency, won't desert |

---

## Test Suite Documentation

### Test Categories

#### Integration Tests
1. **Gameplay Loop** (`testFullGameplayLoop`)
   - Tests complete cycle: mine → trade → mission → combat
   - Validates state persistence
   - Checks resource management
   - Duration: ~45 seconds

2. **Mission System** (`testMissionSystem`)
   - Creates and completes missions
   - Tests objective triggers
   - Validates rewards
   - Duration: ~20 seconds

3. **Combat System** (`testCombatSystem`)
   - Spawns enemies
   - Tests damage calculations
   - Validates AI behaviors
   - Duration: ~15 seconds

4. **Economy Balance** (`testEconomyBalance`)
   - Tests trading profit margins
   - Validates price calculations
   - Checks market dynamics
   - Duration: ~10 seconds

#### Unit Tests

##### Component Tests
- `testPanelFunctionality` - UI panel states
- `testActionBar` - Mobile action buttons
- `testDialogueModal` - Choice system
- `testInventoryDisplay` - Cargo management
- `testMinimap` - Navigation display

##### Store Tests
- `testPlayerStore` - Player state management
- `testCreditsStore` - Economy transactions  
- `testCombatStores` - Combat state
- `testShipStores` - Ship systems
- `testMissionStores` - Mission tracking

##### 3D/Graphics Tests
- `testSpaceScene` - Space rendering
- `testPlanetSurface` - Surface generation
- `testShipModels` - Model loading
- `testEffects` - Particle systems
- `testLighting` - Dynamic lighting

#### Mobile Tests
- `testMobileDetection` - Device detection
- `testTouchControls` - Touch input
- `testGyroscope` - Motion controls
- `testHapticFeedback` - Vibration
- `testMobilePanels` - Mobile UI

### Test Commands
```javascript
// Browser console commands
window.runAllTests()           // Run complete suite
window.runE2ECategory('combat')  // Run category
window.testStore('player')     // Test specific store
window.testAll3D()            // Test all 3D systems
window.testMobileWorkflow()   // Mobile test suite
```

### Performance Benchmarks

#### Target Performance Metrics
- Frame rate: 60 FPS (desktop), 30 FPS (mobile)
- Load time: < 3 seconds
- Memory usage: < 500MB (desktop), < 200MB (mobile)
- Network latency: < 100ms
- Save/load time: < 1 second

#### Performance Tests
```javascript
// Memory profiling
MemoryProfiler.start()
// ... perform actions
MemoryProfiler.report()

// Frame rate monitoring  
performanceTest.fps()
// Target: > 55 FPS average

// Load testing
performanceTest.spawnEnemies(100)
// Target: Maintain 30+ FPS
```

### Test Coverage Requirements
- Unit tests: 80% code coverage
- Integration tests: All critical paths
- E2E tests: Happy path + edge cases
- Performance: All game states
- Mobile: Core functionality

---

## Platform-Specific Requirements

### Web Platform (Primary)

#### Browser Requirements
- Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- WebGL 2.0 support
- WebAudio API
- LocalStorage (min 10MB)
- WebSocket support

#### Graphics Requirements
- GPU: WebGL 2.0 compatible
- VRAM: 512MB minimum
- Shader Model: 3.0+
- Max texture size: 4096x4096

#### Performance Targets
- Desktop: 1920x1080 @ 60 FPS
- Mobile: 375x812 @ 30 FPS
- Network: 256 kbps minimum

### Mobile Platform

#### Touch Input Handling
```typescript
interface TouchControl {
  joystick: {
    position: { x: 100, y: 500 },  // From bottom-left
    radius: 75,
    deadzone: 0.1
  },
  
  buttons: {
    thrust: { x: 275, y: 500, radius: 40 },
    fire: { x: 325, y: 450, radius: 40 },
    special: { x: 325, y: 550, radius: 40 }
  },
  
  gestures: {
    swipeUp: 'open_menu',
    swipeDown: 'quick_save',
    swipeLeft: 'prev_panel',
    swipeRight: 'next_panel',
    pinch: 'zoom_camera',
    twoFingerRotate: 'rotate_view'
  }
}
```

#### Gyroscope Integration
```typescript
interface GyroscopeConfig {
  enabled: boolean,
  sensitivity: 0.5,  // 0.0 - 1.0
  deadzone: 5,       // Degrees
  maxTilt: 45,       // Degrees
  
  mapping: {
    alpha: 'ship_yaw',    // Device rotation
    beta: 'ship_pitch',   // Front-back tilt
    gamma: 'ship_roll'    // Left-right tilt
  },
  
  calibration: {
    neutral: { alpha: 0, beta: 0, gamma: 0 },
    inverted: false
  }
}
```

#### Haptic Feedback
```typescript
interface HapticConfig {
  events: {
    button_press: { duration: 10, intensity: 0.5 },
    collision: { duration: 50, intensity: 1.0 },
    mining: { duration: 100, intensity: 0.3, pattern: 'pulse' },
    damage_taken: { duration: 200, intensity: 0.8 },
    mission_complete: { duration: 300, intensity: 0.6, pattern: 'success' },
    low_fuel: { duration: 500, intensity: 0.4, pattern: 'warning' }
  }
}
```

### Desktop Platform

#### Keyboard Bindings
```
Movement:
W/↑ - Thrust forward
S/↓ - Thrust backward  
A/← - Turn left
D/→ - Turn right
Q/E - Roll left/right
Space - Boost
Shift - Brake

Combat:
Left Click - Fire primary
Right Click - Fire secondary
Mouse Wheel - Cycle weapons
R - Reload
F - Target nearest
T - Target next
G - Deploy countermeasures

UI:
Tab - Toggle map
I - Inventory
M - Missions
C - Crew
Esc - Menu
F1-F4 - Quick panels
1-9 - Hotbar items

Debug (Dev only):
F12 - Console
~ - Debug menu
Ctrl+D - God mode
Ctrl+M - Add money
```

#### Mouse Controls
- Look: Mouse movement (sensitivity: 0.1-2.0)
- Zoom: Scroll wheel (range: 10-500 units)
- Select: Left click
- Context: Right click
- Drag: Middle button

### Network Requirements

#### API Endpoints
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout

GET  /api/game/saves
POST /api/game/saves
PUT  /api/game/saves/:id
DELETE /api/game/saves/:id

WS   /api/multiplayer/connect
```

#### Data Transfer
- Save game size: ~100KB compressed
- Update frequency: 30 Hz (local), 10 Hz (network)
- Bandwidth: 10 KB/s gameplay, 50 KB/s combat
- Latency tolerance: 200ms

### Accessibility Requirements

#### Visual
- Colorblind modes: Protanopia, Deuteranopia, Tritanopia
- Font scaling: 75% - 150%
- High contrast mode
- Motion reduction option
- Screen reader support (ARIA)

#### Audio
- Subtitles for all dialogue
- Visual sound indicators
- Adjustable volume channels
- Spatial audio toggle

#### Motor
- Rebindable controls
- Hold-to-press alternatives
- Difficulty adjustments
- Auto-aim assistance
- Pause anywhere

---

## System Architecture

### Component Hierarchy
```
App
├── AuthProvider
│   ├── LoginScreen
│   └── GameContainer
│       ├── ThreeCanvas (React Three Fiber)
│       │   ├── SpaceScene
│       │   │   ├── SolarSystem
│       │   │   ├── PlayerShip
│       │   │   ├── Enemies
│       │   │   └── Effects
│       │   └── PlanetSurface
│       │       ├── Terrain
│       │       ├── ResourceNodes
│       │       └── Atmosphere
│       ├── UILayer
│       │   ├── HUD
│       │   ├── Panels
│       │   └── Modals
│       └── AudioSystem
│           ├── MusicPlayer
│           └── SoundEffects
```

### State Management (Zustand Stores)

#### Core Stores
```typescript
// Player State
usePlayer: {
  health, rank, reputation, heat, notoriety,
  actions: updateRank(), updateReputation()
}

// Ship Systems  
useShipStatus: {
  hull, shields, fuel,
  actions: takeDamage(), repair()
}

// Economy
useCredits: {
  balance,
  actions: earn(), spend()
}

useInventory: {
  cargo, capacity,
  actions: add(), remove(), trade()
}

// Combat
useEnemies: {
  enemies[], spawning,
  actions: spawn(), damage(), destroy()
}

useShooting: {
  projectiles[],
  actions: fire(), update()
}

// Mission System
useMissions: {
  active[], available[], completed[],
  actions: accept(), complete(), fail()
}
```

### Render Pipeline

#### Three.js Scene Graph
```
Scene
├── Lighting
│   ├── AmbientLight (0.3 intensity)
│   ├── DirectionalLight (sun)
│   └── PointLights (engines, explosions)
├── Camera
│   ├── PerspectiveCamera (FOV: 75)
│   └── CameraController
├── Space Objects
│   ├── Planets (LOD: 3 levels)
│   ├── Asteroids (instanced)
│   └── Stations
├── Ships
│   ├── Player
│   └── NPCs (pooled)
└── Effects
    ├── Particles (pooled)
    ├── Trails
    └── PostProcessing
        ├── Bloom
        ├── ChromaticAberration
        └── Vignette
```

### Performance Optimizations

#### Object Pooling
- Projectiles: Pool of 100
- Particles: Pool of 1000  
- Enemies: Pool of 20
- Asteroids: Instanced rendering (up to 500)

#### LOD System
- Planets: 3 levels (64, 32, 16 segments)
- Ships: 2 levels (full, simplified)
- Effects: Distance-based culling

#### Texture Management
- Lazy loading with priority queue
- Compressed textures (DXT5/BC3)
- Mipmapping enabled
- Max 100MB in memory

### Save System

#### Save Game Structure
```json
{
  "version": "1.0.0",
  "timestamp": 1703001234567,
  "player": { /* PlayerProfile */ },
  "ship": { /* Ship */ },
  "missions": {
    "active": [],
    "completed": [],
    "failed": []
  },
  "world": {
    "currentLocation": "nodeId",
    "discoveredNodes": [],
    "marketPrices": {},
    "factionsStates": {}
  },
  "statistics": {
    "playTime": 0,
    "jumps": 0,
    "creditsEarned": 0,
    "enemiesDefeated": 0
  }
}
```

---

## Database Architecture

### Table Relationships
```
users (1) ──── (n) game_saves
users (1) ──── (n) sessions
```

### Data Types and Constraints

#### JSONB Game State Schema
```json
{
  "player": {
    "rank": "integer:0-10",
    "credits": "integer:0-999999999",
    "reputation": {
      "corporations": "integer:-100-100",
      "independents": "integer:-100-100",
      "outlaws": "integer:-100-100"
    }
  },
  "ship": {
    "hull": "integer:0-100",
    "shields": "integer:0-100",
    "fuel": "integer:0-200",
    "cargo": [
      {
        "itemId": "string",
        "quantity": "integer:1-999",
        "stolen": "boolean"
      }
    ]
  }
}
```

### Indexes and Performance
- Primary keys: UUID with index
- Foreign keys: Indexed
- JSON queries: GIN index on game_state
- Session expiry: B-tree index

### Backup Strategy
- Auto-save every 60 seconds
- Keep 3 save slots per user
- Soft delete with 30-day retention
- Daily backups of entire database

---

## Network Protocol

### WebSocket Communication
```typescript
// Client -> Server
interface ClientMessage {
  type: 'move' | 'shoot' | 'trade' | 'chat';
  payload: any;
  timestamp: number;
  sequence: number;
}

// Server -> Client  
interface ServerMessage {
  type: 'update' | 'event' | 'response';
  payload: any;
  timestamp: number;
  sequence: number;
  ack?: number;
}
```

### State Synchronization
- Position updates: 10 Hz
- Combat updates: 30 Hz
- Economy updates: On change
- Chat: Immediate
- Interpolation: 100ms buffer
- Extrapolation: Up to 200ms

### Anti-Cheat Measures
- Server authoritative state
- Input validation
- Rate limiting (100 req/min)
- Checksums on critical data
- Anomaly detection

---

## Appendix: Complete Crew Roster (11 Members)

1. **Zara 'Wrench' Chen** - Chief Engineer
   - Skills: Mechanic 85, Hacker 60
   - Bonus: -20% repair costs, +20% engine efficiency

2. **Marcus 'Doc' Stone** - Combat Medic  
   - Skills: Medic 90, Gunner 55
   - Bonus: +0.5 hull regen/sec, -30% medical costs

3. **Kassandra 'Kass' Vex** - Data Specialist
   - Skills: Hacker 95, Negotiator 50
   - Bonus: -20% heat gain, +25% intel gathering

4. **Rex 'Tank' Murphy** - Weapons Specialist
   - Skills: Gunner 88, Negotiator 45  
   - Bonus: +30% combat damage, intimidation

5. **Luna 'Whisper' Starweaver** - Navigator
   - Skills: Pilot 92, Negotiator 55
   - Bonus: -20% fuel use, +15% navigation speed

6. **Salvatore 'Silver Tongue' Russo** - Negotiator
   - Skills: Negotiator 87, Pilot 45
   - Bonus: -15% trade prices, +20% mission rewards

7. **Jiro 'Ghost' Tanaka** - Stealth Specialist
   - Skills: Gunner 78, Pilot 70, Hacker 65
   - Bonus: +50% stealth, first strike in combat

8. **Maya 'Phoenix' Rodriguez** - Combat Pilot
   - Skills: Pilot 85, Gunner 72
   - Bonus: +30% evasion, emergency maneuvers

9. **Ezra 'Preacher' Wolfe** - Chaplain
   - Skills: Negotiator 70, Gunner 65
   - Bonus: +10% crew morale, inspiration ability

10. **Aurora 'Songbird' Kim** - Communications
    - Skills: Negotiator 75, Hacker 58
    - Bonus: Intel network, +50% reputation spread

## Appendix: Complete Star Nodes (10 Major + Hidden)

### Core Systems
1. **Earth** - Corporate heartland, maximum security
2. **Mars** - Mining colony, corporate controlled
3. **Luna Station** - Trade hub, military presence

### Independent Territory  
4. **Haven Colony** - Struggling frontier town
5. **Neutral Zone** - Free trading post
6. **Refugee Station** - Displaced population center

### Outlaw Space
7. **Tortuga Station** - Pirate haven
8. **Asteroid Hideout** - Secret smuggler base
9. **Smuggler's Den** - Black market hub

### Special Locations
10. **The Graveyard** - Derelict fleet, high risk/reward
11. **Corporate Checkpoint Alpha** - Mandatory scanning
12. **Mining Station Seven** - Automated facility

### Hidden Locations (Unlockable)
- **Ghost Ship** - Legendary derelict
- **Pirate King's Throne** - End-game base
- **Lost Colony** - Forgotten settlement
- **Alien Ruins** - Mystery location

---

*End of Technical Specification v2.0*
*Document Length: ~50,000 words*
*Last Updated: January 2025*