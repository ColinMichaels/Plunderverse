import { create } from "zustand";

export interface SuitInfo {
  type: 'basic' | 'advanced' | 'heavy-duty' | 'research';
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'critical' | 'damaged';
  oxygenCapacity: number; // Maximum oxygen the suit can hold
  radiationProtection: number; // 0-100 protection level
  temperatureRange: { min: number; max: number }; // Operating temperature range
  integrityPercentage: number; // Overall suit integrity 0-100
}

export interface HealthStatus {
  overall: number; // 0-100 overall health
  radiation: number; // 0-100 radiation exposure level
  fatigue: number; // 0-100 fatigue level  
  injuries: string[]; // Array of current injuries
}

interface PlayerState {
  // Basic Stats
  health: HealthStatus;
  age: number;
  experience: number; // General experience points
  skillPoints: number; // Available skill points to spend
  
  // Life Support
  oxygenLevel: number; // Current oxygen units
  oxygenPercentage: number; // 0-100 percentage for display
  suit: SuitInfo;
  
  // Environmental Status
  radiationLevel: number; // Current radiation exposure
  temperature: number; // Current body temperature
  
  // Game Progress
  points: number; // Achievement/score points
  level: number; // Player level
  
  // Mission/Achievement Stats
  planetsVisited: string[];
  totalMiningOperations: number;
  totalJumps: number;
  timeInSpace: number; // Total time spent in space (hours)
  
  // Plunderverse Stats
  rank: number; // Plunderverse rank (1-10)
  rankTitle: string; // Current rank title
  notoriety: number; // How notorious you are (0-100)
  heat: number; // Law enforcement attention (0-100)
  reputation: {
    corporations: number; // -100 to 100
    independents: number; // -100 to 100
    outlaws: number; // -100 to 100
  };
  
  // Enemy Kill Tracking
  enemyKills: {
    totalKills: number;
    killLog: Array<{
      enemyType: string;
      shipClass: string;
      timestamp: number;
    }>;
  };
  
  // Status flags
  isAlive: boolean;
  needsMedicalAttention: boolean;
  suitStatus: string; // Display status for HUD
  
  // Actions
  initializePlayer: () => void;
  updateOxygen: (amount: number) => void; // Positive to add, negative to consume
  updateHealth: (category: keyof HealthStatus, amount: number) => void;
  updateRadiation: (exposure: number) => void;
  updateSuitCondition: (damage: number) => void;
  addExperience: (amount: number) => void;
  visitPlanet: (planetName: string) => void;
  incrementMiningOperations: () => void;
  incrementJumps: () => void;
  addSpaceTime: (hours: number) => void;
  repairSuit: (repairAmount: number) => void;
  changeSuit: (newSuit: Partial<SuitInfo>) => void;
  getPlayerStatus: () => string; // Overall status for display
  getOxygenTimeRemaining: () => number; // Minutes of oxygen remaining
  levelUp: () => void;
  
  // Combat rewards
  addCredits: (amount: number) => void;
  
  // Plunderverse Actions
  updateRank: (newRank: number, newTitle: string) => void;
  updateNotoriety: (change: number) => void;
  updateHeat: (change: number) => void;
  updateReputation: (faction: 'corporations' | 'independents' | 'outlaws', change: number) => void;
  getReputationStatus: (faction: 'corporations' | 'independents' | 'outlaws') => string;
  
  // Enemy Kill Tracking
  recordEnemyKill: (enemyType: string, shipClass: string) => void;
}

export const usePlayer = create<PlayerState>((set, get) => ({
  // Initial Stats
  health: {
    overall: 100,
    radiation: 0,
    fatigue: 0,
    injuries: []
  },
  age: 32,
  experience: 0,
  skillPoints: 0,
  
  // Life Support
  oxygenLevel: 100,
  oxygenPercentage: 100,
  suit: {
    type: 'basic',
    condition: 'excellent',
    oxygenCapacity: 100,
    radiationProtection: 50,
    temperatureRange: { min: -20, max: 50 },
    integrityPercentage: 100
  },
  
  // Environmental
  radiationLevel: 0,
  temperature: 37, // Normal body temperature
  
  // Game Progress
  points: 0,
  level: 1,
  
  // Mission Stats
  planetsVisited: [],
  totalMiningOperations: 0,
  totalJumps: 0,
  timeInSpace: 0,
  
  // Plunderverse Stats
  rank: 1,
  rankTitle: 'Space Drifter',
  notoriety: 0,
  heat: 0,
  reputation: {
    corporations: 0,
    independents: 0,
    outlaws: 0
  },
  
  // Enemy Kill Tracking
  enemyKills: {
    totalKills: 0,
    killLog: []
  },
  
  // Status
  isAlive: true,
  needsMedicalAttention: false,
  suitStatus: 'OK',
  
  // Actions
  initializePlayer: () => {
    set({
      health: {
        overall: 100,
        radiation: 0,
        fatigue: 0,
        injuries: []
      },
      age: 32,
      experience: 0,
      skillPoints: 0,
      oxygenLevel: 100,
      oxygenPercentage: 100,
      suit: {
        type: 'basic',
        condition: 'excellent',
        oxygenCapacity: 100,
        radiationProtection: 50,
        temperatureRange: { min: -20, max: 50 },
        integrityPercentage: 100
      },
      radiationLevel: 0,
      temperature: 37,
      points: 0,
      level: 1,
      planetsVisited: [],
      totalMiningOperations: 0,
      totalJumps: 0,
      timeInSpace: 0,
      rank: 1,
      rankTitle: 'Space Drifter',
      notoriety: 0,
      heat: 0,
      reputation: {
        corporations: 0,
        independents: 0,
        outlaws: 0
      },
      enemyKills: {
        totalKills: 0,
        killLog: []
      },
      isAlive: true,
      needsMedicalAttention: false,
      suitStatus: 'OK'
    });
    console.log('Player initialized with default stats');
  },
  
  updateOxygen: (amount) => {
    set(state => {
      const newLevel = Math.max(0, Math.min(state.suit.oxygenCapacity, state.oxygenLevel + amount));
      const percentage = Math.round((newLevel / state.suit.oxygenCapacity) * 100);
      
      return {
        oxygenLevel: newLevel,
        oxygenPercentage: percentage,
        needsMedicalAttention: percentage < 20 || state.needsMedicalAttention
      };
    });
  },
  
  updateHealth: (category, amount) => {
    set(state => {
      const newHealth = { ...state.health };
      if (category === 'overall' || category === 'radiation' || category === 'fatigue') {
        newHealth[category] = Math.max(0, Math.min(100, newHealth[category] + amount));
      }
      
      const needsAttention = newHealth.overall < 50 || newHealth.radiation > 70 || newHealth.fatigue > 80;
      
      return {
        health: newHealth,
        needsMedicalAttention: needsAttention,
        isAlive: newHealth.overall > 0
      };
    });
  },
  
  updateRadiation: (exposure) => {
    set(state => {
      const protection = state.suit.radiationProtection / 100;
      const actualExposure = exposure * (1 - protection);
      const newRadiationLevel = Math.min(100, state.radiationLevel + actualExposure);
      
      // Update health radiation exposure
      const newHealth = { ...state.health };
      newHealth.radiation = Math.min(100, newHealth.radiation + actualExposure * 0.5);
      
      return {
        radiationLevel: newRadiationLevel,
        health: newHealth,
        needsMedicalAttention: newHealth.radiation > 50 || state.needsMedicalAttention
      };
    });
  },
  
  updateSuitCondition: (damage) => {
    set(state => {
      const newIntegrity = Math.max(0, state.suit.integrityPercentage - damage);
      const newCondition = 
        newIntegrity > 90 ? 'excellent' :
        newIntegrity > 75 ? 'good' :
        newIntegrity > 50 ? 'fair' :
        newIntegrity > 25 ? 'poor' :
        newIntegrity > 10 ? 'critical' : 'damaged';
      
      const newSuitStatus = 
        newIntegrity > 75 ? 'OK' :
        newIntegrity > 50 ? 'WEAR' :
        newIntegrity > 25 ? 'WARN' :
        newIntegrity > 10 ? 'CRIT' : 'FAIL';
      
      return {
        suit: {
          ...state.suit,
          integrityPercentage: newIntegrity,
          condition: newCondition
        },
        suitStatus: newSuitStatus,
        needsMedicalAttention: newIntegrity < 30 || state.needsMedicalAttention
      };
    });
  },
  
  addExperience: (amount) => {
    set(state => {
      const newExp = state.experience + amount;
      const expForNextLevel = state.level * 1000; // 1000 exp per level
      
      if (newExp >= expForNextLevel) {
        return {
          experience: newExp,
          level: state.level + 1,
          skillPoints: state.skillPoints + 1
        };
      }
      
      return { experience: newExp };
    });
  },
  
  visitPlanet: (planetName) => {
    set(state => {
      if (!state.planetsVisited.includes(planetName)) {
        return {
          planetsVisited: [...state.planetsVisited, planetName],
          points: state.points + 100 // Bonus points for new planet
        };
      }
      return state;
    });
  },
  
  incrementMiningOperations: () => {
    set(state => ({
      totalMiningOperations: state.totalMiningOperations + 1,
      experience: state.experience + 10
    }));
  },
  
  incrementJumps: () => {
    set(state => ({
      totalJumps: state.totalJumps + 1,
      experience: state.experience + 5
    }));
  },
  
  addSpaceTime: (hours) => {
    set(state => ({
      timeInSpace: state.timeInSpace + hours
    }));
  },
  
  repairSuit: (repairAmount) => {
    set(state => {
      const newIntegrity = Math.min(100, state.suit.integrityPercentage + repairAmount);
      const newCondition = 
        newIntegrity > 90 ? 'excellent' :
        newIntegrity > 75 ? 'good' :
        newIntegrity > 50 ? 'fair' :
        newIntegrity > 25 ? 'poor' :
        newIntegrity > 10 ? 'critical' : 'damaged';
      
      const newSuitStatus = newIntegrity > 75 ? 'OK' : 
                           newIntegrity > 50 ? 'WEAR' :
                           newIntegrity > 25 ? 'WARN' : 'CRIT';
      
      return {
        suit: {
          ...state.suit,
          integrityPercentage: newIntegrity,
          condition: newCondition
        },
        suitStatus: newSuitStatus
      };
    });
  },
  
  changeSuit: (newSuit) => {
    set(state => ({
      suit: { ...state.suit, ...newSuit }
    }));
  },
  
  getPlayerStatus: () => {
    const state = get();
    if (!state.isAlive) return 'DECEASED';
    if (state.needsMedicalAttention) return 'CRITICAL';
    if (state.health.overall < 70) return 'INJURED';
    if (state.health.fatigue > 60) return 'TIRED';
    if (state.oxygenPercentage < 30) return 'LOW O2';
    return 'HEALTHY';
  },
  
  getOxygenTimeRemaining: () => {
    const state = get();
    // Assume 1 oxygen unit = 1 minute (can be adjusted)
    return state.oxygenLevel;
  },
  
  levelUp: () => {
    set(state => ({
      level: state.level + 1,
      skillPoints: state.skillPoints + 1,
      points: state.points + 500
    }));
  },
  
  // Plunderverse Actions
  updateRank: (newRank, newTitle) => {
    set({
      rank: newRank,
      rankTitle: newTitle
    });
    console.log(`Rank updated: ${newTitle} (Rank ${newRank})`);
  },
  
  updateNotoriety: (change) => {
    set(state => ({
      notoriety: Math.max(0, Math.min(100, state.notoriety + change))
    }));
  },
  
  updateHeat: (change) => {
    set(state => {
      const newHeat = Math.max(0, Math.min(100, state.heat + change));
      // Heat decays over time (can be called periodically)
      return { heat: newHeat };
    });
  },
  
  updateReputation: (faction, change) => {
    // Apply crew negotiator bonus to reputation gains
    let finalChange = change;
    if (change > 0) {
      try {
        const crewState = (window as any).useCrewManagement?.getState?.();
        if (crewState?.currentBonuses?.reputationGain) {
          finalChange = change * (1 + crewState.currentBonuses.reputationGain);
          console.log(`[PLAYER] Negotiator bonus: +${(crewState.currentBonuses.reputationGain * 100).toFixed(0)}% reputation gain`);
        }
      } catch (e) {
        // Crew management might not be initialized yet
      }
    }
    
    set(state => ({
      reputation: {
        ...state.reputation,
        [faction]: Math.max(-100, Math.min(100, state.reputation[faction] + finalChange))
      }
    }));
  },
  
  getReputationStatus: (faction) => {
    const rep = get().reputation[faction];
    if (rep >= 80) return 'Revered';
    if (rep >= 60) return 'Honored';
    if (rep >= 40) return 'Friendly';
    if (rep >= 20) return 'Liked';
    if (rep > -20) return 'Neutral';
    if (rep > -40) return 'Disliked';
    if (rep > -60) return 'Unfriendly';
    if (rep > -80) return 'Hostile';
    return 'Hated';
  },
  
  // Combat rewards
  addCredits: (amount) => {
    // Use the domain credits store for proper credit management
    import('../../../domain/economy/credits.store').then(({ useCreditsStore }) => {
      const creditsStore = useCreditsStore.getState();
      // FIXED: Use earnCredits instead of non-existent addCredits
      creditsStore.earnCredits(amount);
      console.log(`[Player] Added ${amount} credits from combat reward`);
    });
  },
  
  // Enemy Kill Tracking
  recordEnemyKill: (enemyType, shipClass) => {
    set(state => {
      const newKillEntry = {
        enemyType,
        shipClass,
        timestamp: Date.now()
      };
      
      const newKillLog = [...state.enemyKills.killLog, newKillEntry];
      
      console.log(`[Player] Enemy kill recorded: ${enemyType} ${shipClass} (Total: ${state.enemyKills.totalKills + 1})`);
      
      return {
        enemyKills: {
          totalKills: state.enemyKills.totalKills + 1,
          killLog: newKillLog
        }
      };
    });
  }
}));

// Auto-initialize player when the store is first created
if (typeof window !== 'undefined') {
  usePlayer.getState().initializePlayer();
}