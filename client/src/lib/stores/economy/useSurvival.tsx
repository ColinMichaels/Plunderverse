import { create } from 'zustand';
import { usePlayer } from '../player/usePlayer';
import { useCreditsStore } from '../../../domain/economy/credits.store';
import { useInventoryStore } from '../../../domain/economy/inventory.store';
import { usePlunderverseEconomy } from './usePlunderverseEconomy';

interface SurvivalResource {
  current: number;
  max: number;
  consumptionRate: number; // Per minute/day depending on resource
  criticalLevel: number;
  warningLevel: number;
}

interface SurvivalState {
  // Resources
  food: SurvivalResource;
  oxygen: SurvivalResource;
  medical: SurvivalResource;
  water: SurvivalResource;
  
  // Status flags
  isInSpace: boolean;
  isOnHostilePlanet: boolean;
  isInCombat: boolean;
  crewSize: number;
  
  // Consumption tracking
  lastConsumptionTime: number;
  
  // Actions
  initializeSurvival: () => void;
  consumeResources: (deltaMinutes: number) => void;
  replenishResource: (resource: 'food' | 'oxygen' | 'medical' | 'water', amount: number, cost?: number) => boolean;
  setEnvironment: (inSpace: boolean, onHostilePlanet: boolean, inCombat: boolean) => void;
  checkResourceWarnings: () => string[];
  applyEmergencyConsequences: () => void;
  getResourceStatus: () => { resource: string; status: 'critical' | 'warning' | 'normal'; percentage: number }[];
}

export const useSurvival = create<SurvivalState>((set, get) => ({
  food: {
    current: 50,
    max: 50,
    consumptionRate: 1, // per crew per day
    criticalLevel: 5,
    warningLevel: 15
  },
  oxygen: {
    current: 100,
    max: 100,
    consumptionRate: 0.5, // per minute in normal conditions
    criticalLevel: 10,
    warningLevel: 30
  },
  medical: {
    current: 20,
    max: 20,
    consumptionRate: 0, // consumed on use only
    criticalLevel: 2,
    warningLevel: 5
  },
  water: {
    current: 30,
    max: 30,
    consumptionRate: 0.5, // per crew per day
    criticalLevel: 3,
    warningLevel: 10
  },
  
  isInSpace: true,
  isOnHostilePlanet: false,
  isInCombat: false,
  crewSize: 1,
  lastConsumptionTime: Date.now(),
  
  initializeSurvival: () => {
    const tuning = usePlunderverseEconomy.getState().tuning;
    const storage = tuning?.economy?.survival_system?.resource_storage;
    
    if (storage) {
      set({
        food: { ...get().food, max: storage.food_max, current: storage.food_max },
        oxygen: { ...get().oxygen, max: storage.oxygen_max, current: storage.oxygen_max },
        medical: { ...get().medical, max: storage.medical_max, current: storage.medical_max },
        water: { ...get().water, max: storage.water_max, current: storage.water_max },
        lastConsumptionTime: Date.now()
      });
    }
    
    console.log('[Survival] Initialized survival resources');
  },
  
  consumeResources: (deltaMinutes) => {
    const state = get();
    const tuning = usePlunderverseEconomy.getState().tuning;
    const survivalTuning = tuning?.economy?.survival_system;
    
    if (!survivalTuning) {
      console.warn('[Survival] No survival tuning found');
      return;
    }
    
    // Calculate consumption rates based on environment
    let oxygenRate = survivalTuning.oxygen_consumption.normal_per_minute;
    if (state.isInCombat) {
      oxygenRate = survivalTuning.oxygen_consumption.combat_per_minute;
    } else if (state.isOnHostilePlanet) {
      oxygenRate = survivalTuning.oxygen_consumption.planet_hostile_per_minute;
    }
    
    // Food and water consumption (per day, so convert minutes to days)
    const daysElapsed = deltaMinutes / (60 * 24);
    const foodConsumption = survivalTuning.food_consumption.per_crew_per_day * state.crewSize * daysElapsed;
    const waterConsumption = (state.water.consumptionRate * state.crewSize * daysElapsed);
    
    // Apply consumption
    const newFood = Math.max(0, state.food.current - foodConsumption);
    const newOxygen = Math.max(0, state.oxygen.current - (oxygenRate * deltaMinutes));
    const newWater = Math.max(0, state.water.current - waterConsumption);
    
    set({
      food: { ...state.food, current: newFood },
      oxygen: { ...state.oxygen, current: newOxygen },
      water: { ...state.water, current: newWater }
    });
    
    // Check for critical situations
    const warnings = get().checkResourceWarnings();
    if (warnings.length > 0) {
      console.warn('[Survival] Resource warnings:', warnings);
      get().applyEmergencyConsequences();
    }
    
    // Log consumption if significant
    if (foodConsumption > 0.1 || oxygenRate * deltaMinutes > 1) {
      console.log(`[Survival] Consumed: Food -${foodConsumption.toFixed(1)}, Oxygen -${(oxygenRate * deltaMinutes).toFixed(1)}, Water -${waterConsumption.toFixed(1)}`);
    }
  },
  
  replenishResource: (resource, amount, cost) => {
    const state = get();
    const resourceData = state[resource];
    
    if (!resourceData) {
      console.error(`[Survival] Invalid resource: ${resource}`);
      return false;
    }
    
    // Check if player can afford it
    if (cost && cost > 0) {
      const creditsStore = useCreditsStore.getState();
      if (!creditsStore.spendCredits(cost)) {
        console.log(`[Survival] Cannot afford ${resource}. Need ${cost} credits`);
        return false;
      }
    }
    
    // Replenish the resource
    const newAmount = Math.min(resourceData.max, resourceData.current + amount);
    const actualReplenished = newAmount - resourceData.current;
    
    set(state => ({
      [resource]: { ...state[resource], current: newAmount }
    }));
    
    console.log(`[Survival] Replenished ${actualReplenished.toFixed(1)} ${resource}${cost ? ` for ${cost} credits` : ''}`);
    return true;
  },
  
  setEnvironment: (inSpace, onHostilePlanet, inCombat) => {
    set({
      isInSpace: inSpace,
      isOnHostilePlanet: onHostilePlanet,
      isInCombat: inCombat
    });
    
    console.log(`[Survival] Environment updated - Space: ${inSpace}, Hostile: ${onHostilePlanet}, Combat: ${inCombat}`);
  },
  
  checkResourceWarnings: () => {
    const state = get();
    const warnings: string[] = [];
    
    // Check each resource
    if (state.food.current <= state.food.criticalLevel) {
      warnings.push(`CRITICAL: Food supplies at ${state.food.current.toFixed(1)}!`);
    } else if (state.food.current <= state.food.warningLevel) {
      warnings.push(`Warning: Low food (${state.food.current.toFixed(1)})`);
    }
    
    if (state.oxygen.current <= state.oxygen.criticalLevel) {
      warnings.push(`CRITICAL: Oxygen at ${state.oxygen.current.toFixed(1)}%!`);
    } else if (state.oxygen.current <= state.oxygen.warningLevel) {
      warnings.push(`Warning: Low oxygen (${state.oxygen.current.toFixed(1)}%)`);
    }
    
    if (state.medical.current <= state.medical.criticalLevel) {
      warnings.push(`CRITICAL: Medical supplies at ${state.medical.current}!`);
    } else if (state.medical.current <= state.medical.warningLevel) {
      warnings.push(`Warning: Low medical supplies (${state.medical.current})`);
    }
    
    if (state.water.current <= state.water.criticalLevel) {
      warnings.push(`CRITICAL: Water at ${state.water.current.toFixed(1)}!`);
    } else if (state.water.current <= state.water.warningLevel) {
      warnings.push(`Warning: Low water (${state.water.current.toFixed(1)})`);
    }
    
    return warnings;
  },
  
  applyEmergencyConsequences: () => {
    const state = get();
    const player = usePlayer.getState();
    const tuning = usePlunderverseEconomy.getState().tuning;
    const emergencySettings = tuning?.economy?.survival_system?.emergency_situations;
    
    if (!emergencySettings) return;
    
    // Apply consequences for critical resources
    if (state.food.current <= 0) {
      // Starvation damage
      const damagePerDay = tuning?.economy?.survival_system?.food_consumption?.starvation_damage_per_day || 10;
      const healthBefore = player.health.overall;
      player.updateHealth('overall', -damagePerDay);
      const healthAfter = player.health.overall;
      
      // Morale penalty
      if (emergencySettings.no_food_morale_penalty) {
        player.updateNotoriety(emergencySettings.no_food_morale_penalty);
      }
      
      console.error(`[Survival] STARVATION: Crew is taking damage! Health: ${healthBefore} -> ${healthAfter} (-${damagePerDay})`);
    }
    
    if (state.oxygen.current <= 0) {
      // Suffocation damage
      const suffocationDamage = tuning?.economy?.survival_system?.oxygen_consumption?.suffocation_damage_per_minute || 20;
      const healthBefore = player.health.overall;
      player.updateHealth('overall', -suffocationDamage);
      const healthAfter = player.health.overall;
      
      // Panic
      if (state.oxygen.current <= emergencySettings.no_oxygen_panic_threshold) {
        console.error(`[Survival] PANIC: Crew is suffocating! Health: ${healthBefore} -> ${healthAfter} (-${suffocationDamage})`);
      } else {
        console.error(`[Survival] SUFFOCATION: No oxygen! Health: ${healthBefore} -> ${healthAfter} (-${suffocationDamage})`);
      }
    }
    
    if (state.medical.current <= 0 && player.health.overall < 50) {
      // Infection risk
      const infectionRate = emergencySettings.no_medical_infection_rate || 5;
      if (Math.random() < (tuning?.economy?.survival_system?.medical_supplies?.infection_risk_without_treatment || 0.3)) {
        const healthBefore = player.health.overall;
        player.updateHealth('overall', -infectionRate);
        const healthAfter = player.health.overall;
        console.error(`[Survival] INFECTION: No medical supplies to treat injuries! Health: ${healthBefore} -> ${healthAfter} (-${infectionRate})`);
      }
    }
    
    // Trigger emergency missions if configured
    if (emergencySettings.resource_critical_mission_trigger) {
      // This would trigger special emergency missions through GameFacade
      console.log('[Survival] Emergency situation - special missions may be available');
    }
  },
  
  getResourceStatus: () => {
    const state = get();
    const resources = ['food', 'oxygen', 'medical', 'water'] as const;
    
    return resources.map(resource => {
      const data = state[resource];
      const percentage = (data.current / data.max) * 100;
      let status: 'critical' | 'warning' | 'normal' = 'normal';
      
      if (data.current <= data.criticalLevel) {
        status = 'critical';
      } else if (data.current <= data.warningLevel) {
        status = 'warning';
      }
      
      return { resource, status, percentage };
    });
  }
}));

// Auto-initialize when store is created
if (typeof window !== 'undefined') {
  useSurvival.getState().initializeSurvival();
}