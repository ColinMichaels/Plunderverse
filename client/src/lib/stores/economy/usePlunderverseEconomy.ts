import { create } from 'zustand';
import { EconomyTuning, FactionId } from '../../plunderverse/types';
import { ContentRegistry } from '../../plunderverse/contentRegistry';

interface PlunderverseEconomyState {
  // Economy tuning from content
  tuning: EconomyTuning | null;
  
  // Seeded RNG state
  currentSeed: string;
  rngInstance: (() => number) | null;
  
  // Economy modifiers
  priceModifiers: Map<string, number>; // itemId -> modifier
  demandModifiers: Map<string, number>; // itemId -> demand multiplier
  
  // Faction economy states
  factionEconomies: Map<FactionId, {
    tradeBalance: number;
    blackMarketActivity: number;
    lawEnforcementLevel: number;
  }>;
  
  // Heat decay timer
  heatDecayInterval: number;
  
  // Actions
  loadTuning: () => Promise<void>;
  initializeRNG: (playerId: string) => void;
  getRandom: () => number;
  getSeededRandom: (seed: string) => () => number;
  
  // Economy calculations
  calculatePrice: (basePrice: number, itemId: string, location?: string) => number;
  calculateRepairCost: (damage: number, location?: string) => number;
  calculateFuelCost: (amount: number, location?: string) => number;
  calculateBribe: (heat: number, faction: FactionId) => number;
  
  // Market dynamics
  updateMarketPrices: () => void;
  applyDemandShock: (itemId: string, magnitude: number) => void;
  
  // Heat management
  calculateHeatDecay: (currentHeat: number) => number;
  calculateHeatFromAction: (action: string, faction?: FactionId) => number;
  
  // Reputation economics
  calculateReputationValue: (reputation: number) => number;
  calculateMissionPayoutModifier: (missionType: string, reputation: Record<FactionId, number>) => number;
}

export const usePlunderverseEconomy = create<PlunderverseEconomyState>((set, get) => ({
  tuning: null,
  currentSeed: '',
  rngInstance: null,
  priceModifiers: new Map(),
  demandModifiers: new Map(),
  factionEconomies: new Map([
    ['corporations', { tradeBalance: 0, blackMarketActivity: 0, lawEnforcementLevel: 70 }],
    ['independents', { tradeBalance: 0, blackMarketActivity: 30, lawEnforcementLevel: 30 }],
    ['outlaws', { tradeBalance: 0, blackMarketActivity: 80, lawEnforcementLevel: 10 }]
  ]),
  heatDecayInterval: 60000, // 1 minute
  
  loadTuning: async () => {
    try {
      const registry = new ContentRegistry();
      const content = await registry.loadContent();
      
      if (content.economyTuning) {
        set({ tuning: content.economyTuning });
        console.log('Loaded economy tuning from content registry');
      }
    } catch (error) {
      console.error('Failed to load economy tuning:', error);
      // Use default tuning matching the actual structure from tuning.json
      set({
        tuning: {
          starting_conditions: {
            credits: 1000,
            fuel: 100,
            hull: 100,
            shields: 50,
            cargo_capacity: 10,
            starting_location: 'neutral_zone'
          },
          fuel_costs: {
            base_consumption_per_jump: 10,
            consumption_multipliers: {
              short_range: 0.5,
              medium_range: 1.0,
              long_range: 2.0,
              emergency_jump: 3.0
            },
            refuel_prices: {
              corporations: 50,
              independents: 40,
              outlaws: 60
            }
          },
          repair_costs: {
            hull_per_point: 25,
            shield_per_point: 15,
            module_repair_base: 500,
            faction_modifiers: {
              corporations: 1.2,
              independents: 1.0,
              outlaws: 0.8
            }
          },
          trading: {
            base_profit_margin: 0.2,
            distance_bonus_per_sector: 0.1,
            risk_bonus: {
              low: 0,
              medium: 0.15,
              high: 0.3,
              extreme: 0.5
            },
            bulk_discount: {
              threshold: 50,
              discount: 0.1
            },
            reputation_price_modifier: {
              formula: '1.0 - (reputation * 0.003)',
              min: 0.7,
              max: 1.3
            }
          },
          combat: {
            base_reward_per_enemy: 1000,
            difficulty_multipliers: {
              scout: 0.5,
              patrol: 1.0,
              interceptor: 1.5,
              battleship: 3.0,
              boss: 5.0
            },
            salvage_chance: 0.3,
            salvage_value_range: {
              min: 100,
              max: 2000
            },
            escape_penalty: {
              reputation: -5,
              credits: 500
            }
          },
          missions: {
            base_rewards: {
              easy: 2500,
              medium: 5000,
              hard: 10000,
              legendary: 25000
            },
            time_bonus: {
              early_completion: 1.25,
              on_time: 1.0,
              late: 0.75
            },
            reputation_rewards: {
              easy: 5,
              medium: 10,
              hard: 20,
              legendary: 50
            },
            rank_multipliers: {},
            failure_penalties: {
              credits: 0,
              reputation: -15,
              notoriety: -10
            },
            daily_mission_refresh: 3,
            max_active_missions: 5
          },
          heat_system: {
            max_heat: 100,
            heat_generation: {
              contraband_scan_failed: 25,
              combat_with_corporations: 15,
              witnessed_crime: 10,
              smuggling_success: 5
            },
            heat_decay: {
              base_rate: 1,
              laying_low: 5,
              outlaw_territory: 3,
              bribe_efficiency: 10
            },
            heat_consequences: {}
          },
          crew_management: {
            wages: {
              navigator: 500,
              gunner: 750,
              engineer: 600,
              medic: 400,
              muscle: 300
            },
            loyalty: {
              base: 50,
              success_bonus: 5,
              failure_penalty: -10,
              no_pay_penalty: -25,
              shared_loot_bonus: 10
            },
            efficiency_bonuses: {
              navigator: {
                fuel_efficiency: 0.9,
                jump_accuracy: 1.2
              },
              gunner: {
                weapon_damage: 1.3,
                accuracy: 1.2
              },
              engineer: {
                repair_speed: 1.5,
                module_efficiency: 1.2
              }
            },
            mutiny_threshold: 20
          },
          random_events: {
            frequency: 0.15,
            types: {}
          },
          progression: {
            xp_sources: {
              mission_complete: 100,
              combat_victory: 50,
              successful_trade: 25,
              exploration: 30,
              smuggling_run: 75
            },
            rank_xp_requirements: [0, 500, 1500, 3000, 5000, 8000, 12000, 17000, 23000, 30000],
            skill_points_per_rank: 2,
            perk_unlock_ranks: [2, 4, 6, 8]
          },
          difficulty_scaling: {
            enemy_health: {
              formula: '100 * (1 + rank * 0.2)',
              cap: 500
            },
            enemy_damage: {
              formula: '10 * (1 + rank * 0.15)',
              cap: 50
            },
            mission_complexity: {
              objectives_per_rank: 0.5,
              max_objectives: 5
            },
            economy_inflation: {
              rate_per_rank: 0.05,
              cap: 2.0
            }
          },
          balance_constants: {
            max_cargo_weight: 1000,
            base_ship_speed: 100,
            scan_detection_base: 0.5,
            combat_escape_chance: 0.3,
            critical_hit_chance: 0.1,
            critical_hit_multiplier: 2.0,
            dodge_chance_base: 0.1,
            shield_recharge_delay: 5,
            fuel_emergency_reserve: 10,
            reputation_change_cap: 50,
            notoriety_decay_rate: 0.1
          }
        } as EconomyTuning
      });
    }
  },
  
  initializeRNG: (playerId: string) => {
    // Use game day from localStorage for deterministic seeding
    const gameDay = localStorage.getItem('plunderverse_game_day') || '1';
    const seed = `${playerId}:economy:${gameDay}`;
    const rng = createSeededRandom(seed);
    
    set({
      currentSeed: seed,
      rngInstance: rng
    });
    
    console.log(`[Economy] Initialized RNG with deterministic seed: ${seed}`);
  },
  
  getRandom: () => {
    const state = get();
    if (!state.rngInstance) {
      // Fallback to Math.random if not initialized
      return Math.random();
    }
    return state.rngInstance();
  },
  
  getSeededRandom: (seed: string) => {
    return createSeededRandom(seed);
  },
  
  calculatePrice: (basePrice: number, itemId: string, location?: string) => {
    const state = get();
    const tuning = state.tuning;
    if (!tuning) return basePrice;
    
    let price = basePrice;
    
    // Apply item-specific modifiers
    const itemModifier = state.priceModifiers.get(itemId) || 1;
    price *= itemModifier;
    
    // Apply demand modifiers
    const demandModifier = state.demandModifiers.get(itemId) || 1;
    price *= demandModifier;
    
    // Apply location-based modifiers (if implemented)
    if (location) {
      // Could apply faction-based pricing
      const faction = getFactionForLocation(location);
      if (faction === 'outlaws') {
        price *= tuning.trading.base_profit_margin + 0.5; // Outlaws charge more
      }
    }
    
    // Apply supply/demand variance (using a default range if not in constants)
    const variance = (state.getRandom() - 0.5) * 0.3;
    price *= (1 + variance);
    
    return Math.round(price);
  },
  
  calculateRepairCost: (damage: number, location?: string) => {
    const state = get();
    const tuning = state.tuning;
    if (!tuning) return damage * 50;
    
    let cost = damage * tuning.repair_costs.hull_per_point;
    
    // Apply location modifiers
    if (location) {
      const faction = getFactionForLocation(location);
      if (faction === 'corporations') {
        cost *= 1.2; // More expensive at corporate facilities
      } else if (faction === 'outlaws') {
        cost *= 0.8; // Cheaper but maybe less reliable
      }
    }
    
    return Math.round(cost);
  },
  
  calculateFuelCost: (amount: number, location?: string) => {
    const state = get();
    const tuning = state.tuning;
    if (!tuning) return amount * 10;
    
    let cost = amount * (tuning.fuel_costs.base_consumption_per_jump || 10);
    
    // Apply location modifiers
    if (location) {
      const faction = getFactionForLocation(location);
      const economy = state.factionEconomies.get(faction as FactionId);
      if (economy) {
        // Adjust based on trade balance
        cost *= (1 + economy.tradeBalance * 0.01);
      }
    }
    
    return Math.round(cost);
  },
  
  calculateBribe: (heat: number, faction: FactionId) => {
    const state = get();
    const tuning = state.tuning;
    if (!tuning) return heat * 50;
    
    const economy = state.factionEconomies.get(faction);
    const lawLevel = economy?.lawEnforcementLevel || 50;
    
    // Higher law enforcement = higher bribes
    const lawMultiplier = lawLevel / 50;
    const baseBribe = heat * (tuning.heat_system.heat_decay.bribe_efficiency * 5 || 50);
    
    return Math.round(baseBribe * lawMultiplier);
  },
  
  updateMarketPrices: () => {
    const state = get();
    const tuning = state.tuning;
    if (!tuning) return;
    
    const newPriceModifiers = new Map<string, number>();
    const newDemandModifiers = new Map<string, number>();
    
    // Simulate market fluctuations
    state.priceModifiers.forEach((currentMod, itemId) => {
      // Random walk with mean reversion
      const change = (state.getRandom() - 0.5) * 0.1;
      const newMod = currentMod + change;
      
      // Mean reversion towards 1.0
      const reversion = (1.0 - newMod) * 0.05;
      const finalMod = Math.max(0.5, Math.min(2.0, newMod + reversion));
      
      newPriceModifiers.set(itemId, finalMod);
    });
    
    // Update demand based on random events
    state.demandModifiers.forEach((currentDemand, itemId) => {
      const change = (state.getRandom() - 0.5) * 0.2;
      const newDemand = Math.max(0.3, Math.min(3.0, currentDemand + change));
      newDemandModifiers.set(itemId, newDemand);
    });
    
    set({
      priceModifiers: newPriceModifiers,
      demandModifiers: newDemandModifiers
    });
  },
  
  applyDemandShock: (itemId: string, magnitude: number) => {
    const state = get();
    const current = state.demandModifiers.get(itemId) || 1;
    const newDemand = Math.max(0.1, Math.min(5.0, current * magnitude));
    
    const newDemandModifiers = new Map(state.demandModifiers);
    newDemandModifiers.set(itemId, newDemand);
    
    set({ demandModifiers: newDemandModifiers });
    console.log(`Demand shock for ${itemId}: ${magnitude}x`);
  },
  
  calculateHeatDecay: (currentHeat: number) => {
    const state = get();
    const tuning = state.tuning;
    if (!tuning) return currentHeat * 0.9;
    
    const decay = tuning.heat_system.heat_decay.base_rate || 1;
    return Math.max(0, currentHeat - decay);
  },
  
  calculateHeatFromAction: (action: string, faction?: FactionId) => {
    const state = get();
    const tuning = state.tuning;
    if (!tuning) return 0;
    
    let heat = 0;
    
    switch (action) {
      case 'smuggling':
        heat = tuning.heat_system.heat_generation.smuggling_success;
        break;
      case 'combat':
        heat = tuning.heat_system.heat_generation.combat_with_corporations;
        break;
      case 'theft':
        heat = 15;
        break;
      case 'piracy':
        heat = 20;
        break;
      default:
        heat = 0;
    }
    
    // Modify based on faction
    if (faction) {
      const economy = state.factionEconomies.get(faction);
      if (economy) {
        heat *= (economy.lawEnforcementLevel / 50);
      }
    }
    
    return heat;
  },
  
  calculateReputationValue: (reputation: number) => {
    // Convert reputation to a economic value modifier
    // Positive reputation gives discounts, negative gives penalties
    const modifier = reputation / 100; // -1 to 1
    return 1 - (modifier * 0.2); // 0.8 to 1.2
  },
  
  calculateMissionPayoutModifier: (missionType: string, reputation: Record<FactionId, number>) => {
    let modifier = 1;
    
    // Different mission types benefit from different reputations
    switch (missionType) {
      case 'delivery':
        modifier *= 1 + (reputation.corporations * 0.002);
        break;
      case 'smuggling':
        modifier *= 1 + (reputation.outlaws * 0.003);
        break;
      case 'bounty':
        modifier *= 1 + (reputation.independents * 0.002);
        break;
      case 'exploration':
        modifier *= 1 + (Math.max(...Object.values(reputation)) * 0.001);
        break;
      default:
        break;
    }
    
    return Math.max(0.5, Math.min(2.0, modifier));
  }
}));

// Helper functions
function createSeededRandom(seed: string): () => number {
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

function getFactionForLocation(location: string): string {
  // Map locations to factions (simplified)
  const locationFactions: Record<string, string> = {
    'Earth': 'corporations',
    'Mars': 'corporations',
    'Mercury': 'corporations',
    'Venus': 'independents',
    'Jupiter': 'independents',
    'Saturn': 'independents',
    'Uranus': 'outlaws',
    'Neptune': 'outlaws'
  };
  
  return locationFactions[location] || 'independents';
}

// Auto-initialize on load
if (typeof window !== 'undefined') {
  setTimeout(() => {
    const store = usePlunderverseEconomy.getState();
    store.loadTuning();
    // Note: Actual player ID will be set by GameFacade.initialize()
    // This auto-init is just a fallback for legacy code
  }, 100);
}