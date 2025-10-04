import { create } from "zustand";
import { toast } from "sonner";
import { useCredits } from "../economy/useCredits";
import { useEquipment } from "./useEquipment";

interface ShipStatusState {
  // Ship resources (0-100) - fuel moved to equipment system
  shield: number;
  hull: number;
  
  // Status flags
  isDestroyed: boolean;
  isCritical: boolean;
  isThrusting: boolean;
  isWarpMode: boolean;
  
  // Damage sources
  lastDamageSource: string | null;
  lastCombatTime: number; // Track last combat for hull regen
  
  // Upgrade system
  upgrades: {
    fuelCapacity: number; // multiplier for fuel storage
    thrustEfficiency: number; // reduces fuel consumption
    warpCapability: boolean; // enables warp mode
  };
  
  // Actions - consumeFuel and refuel moved to equipment system
  takeDamage: (amount: number, source: string) => void;
  rechargeShield: (amount: number) => void;
  repairHull: (amount: number) => void;
  resetShip: () => void;
  setThrusting: (thrusting: boolean) => void;
  setWarpMode: (warpMode: boolean) => void;
  upgradeShip: (upgradeType: 'fuelCapacity' | 'thrustEfficiency' | 'warpCapability', cost: number) => boolean;
  applyPassiveRegen: (delta: number) => void;
}

export const useShipStatus = create<ShipStatusState>((set, get) => ({
  shield: 100,
  hull: 100,
  isDestroyed: false,
  isCritical: false,
  isThrusting: false,
  isWarpMode: false,
  lastDamageSource: null,
  lastCombatTime: 0,
  upgrades: {
    fuelCapacity: 1.0,
    thrustEfficiency: 1.0,
    warpCapability: false,
  },
  
  takeDamage: (amount, source) => {
    set(state => {
      let newShield = state.shield;
      let newHull = state.hull;
      let hullDamageAmount = 0;
      
      // Shield absorbs damage first
      if (newShield > 0) {
        newShield = Math.max(0, newShield - amount);
        // If shield breaks, remaining damage goes to hull
        if (newShield === 0 && amount > state.shield) {
          const remainingDamage = amount - state.shield;
          hullDamageAmount = remainingDamage;
          newHull = Math.max(0, newHull - remainingDamage);
        }
      } else {
        // No shield, direct hull damage
        hullDamageAmount = amount;
        newHull = Math.max(0, newHull - amount);
      }
      
      // Sync hull damage with equipment system
      if (hullDamageAmount > 0) {
        const equipmentStore = useEquipment.getState();
        const hullEquipment = equipmentStore.getEquipment('hull-primary');
        
        if (hullEquipment) {
          // Convert percentage damage to equipment durability damage
          // Hull equipment has 200 max durability, so 1% = 2 durability points
          const durabilityDamage = (hullDamageAmount / 100) * hullEquipment.maxDurability;
          
          // Update equipment store with hull damage
          equipmentStore.equipment = equipmentStore.equipment.map(eq => {
            if (eq.id === 'hull-primary') {
              const newDurability = Math.max(0, eq.currentDurability - durabilityDamage);
              const conditionRatio = newDurability / eq.maxDurability;
              return {
                ...eq,
                currentDurability: newDurability,
                performanceLevel: conditionRatio > 0.8 ? 1.0 : conditionRatio > 0.6 ? 0.9 : conditionRatio > 0.4 ? 0.75 : conditionRatio > 0.2 ? 0.5 : conditionRatio > 0 ? 0.25 : 0
              };
            }
            return eq;
          });
          
          // Force equipment store update to notify components
          useEquipment.setState({ equipment: [...equipmentStore.equipment] });
          console.log(`[HULL-SYNC] Applied ${durabilityDamage.toFixed(1)} durability damage to hull equipment`);
        }
      }
      
      const isDestroyed = newHull <= 0;
      const isCritical = newShield < 20 || newHull < 20;
      
      // DEBUG: Log damage event
      console.log(`[DEBUG-DAMAGE] Player took ${amount} damage from "${source}". Shield: ${newShield.toFixed(1)}, Hull: ${newHull.toFixed(1)}`);
      
      // Check for player death
      if (isDestroyed) {
        console.log(`[DEBUG-DEATH] PLAYER DIED! Hull reached 0. Triggering game over.`);
        
        // Trigger game over state
        try {
          // Import game store dynamically
          import('../ui/useGame').then(({ useGame }) => {
            const gameState = useGame.getState();
            console.log(`[DEBUG-DEATH] Setting game state to GAME_OVER`);
            gameState.setGameState('GAME_OVER');
            
            // Return to main menu after 3 seconds
            setTimeout(() => {
              console.log(`[DEBUG-DEATH] Returning to main menu...`);
              gameState.setGameState('MENU');
            }, 3000);
          });
        } catch (error) {
          console.error(`[DEBUG-DEATH] Error triggering game over:`, error);
        }
      }
      
      // Show damage notifications
      if (amount > 30) {
        // Critical hit notification
        toast.error(`💥 Critical hit! -${Math.round(amount)} damage`, {
          description: `From ${source}`,
          duration: 3000
        });
      } else if (hullDamageAmount > 0) {
        // Hull damage notification (more serious)
        toast.warning(`🛡️ Shield breached! Hull -${Math.round(hullDamageAmount)}`, {
          description: `Hull integrity: ${Math.round(newHull)}%`,
          duration: 3000
        });
      } else if (amount > 0) {
        // Shield damage notification
        toast.info(`⚡ Shield hit! -${Math.round(amount)} shield`, {
          description: `Shield: ${Math.round(newShield)}%`,
          duration: 2500
        });
      }
      
      // Critical status warnings
      if (isDestroyed) {
        toast.error(`💀 Ship destroyed!`, {
          description: 'Your ship has been critically damaged',
          duration: 5000
        });
      } else if (isCritical && !state.isCritical) {
        // Just became critical
        toast.error(`🚨 Hull critical! Seek repairs immediately!`, {
          description: `Hull: ${Math.round(newHull)}%, Shield: ${Math.round(newShield)}%`,
          duration: 4000
        });
      }
      
      console.log(`Ship took ${amount} damage from ${source}! Hull: ${newHull}, Shield: ${newShield}`);
      
      return {
        shield: newShield,
        hull: newHull,
        isDestroyed,
        isCritical,
        lastDamageSource: source,
        lastCombatTime: Date.now() // Update combat time for regen tracking
      };
    });
  },
  
  rechargeShield: (amount) => {
    set(state => ({
      shield: Math.min(100, state.shield + amount),
      isCritical: Math.min(100, state.shield + amount) < 20 || state.hull < 20
    }));
  },
  
  repairHull: (amount) => {
    set(state => {
      const newHull = Math.min(100, state.hull + amount);
      
      // Sync hull repair with equipment system
      const equipmentStore = useEquipment.getState();
      const hullEquipment = equipmentStore.getEquipment('hull-primary');
      
      if (hullEquipment) {
        // Convert percentage repair to equipment durability repair
        const durabilityRepair = (amount / 100) * hullEquipment.maxDurability;
        
        equipmentStore.equipment = equipmentStore.equipment.map(eq => {
          if (eq.id === 'hull-primary') {
            const repairedDurability = Math.min(eq.maxDurability, eq.currentDurability + durabilityRepair);
            const conditionRatio = repairedDurability / eq.maxDurability;
            return {
              ...eq,
              currentDurability: repairedDurability,
              performanceLevel: conditionRatio > 0.8 ? 1.0 : conditionRatio > 0.6 ? 0.9 : conditionRatio > 0.4 ? 0.75 : conditionRatio > 0.2 ? 0.5 : conditionRatio > 0 ? 0.25 : 0
            };
          }
          return eq;
        });
        
        // Force equipment store update
        useEquipment.setState({ equipment: [...equipmentStore.equipment] });
        console.log(`[HULL-SYNC] Repaired ${durabilityRepair.toFixed(1)} durability to hull equipment`);
      }
      
      return {
        hull: newHull,
        isCritical: state.shield < 20 || newHull < 20
      };
    });
  },
  
  
  resetShip: () => {
    // Sync hull reset with equipment system
    const equipmentStore = useEquipment.getState();
    const hullEquipment = equipmentStore.getEquipment('hull-primary');
    
    if (hullEquipment) {
      equipmentStore.equipment = equipmentStore.equipment.map(eq => {
        if (eq.id === 'hull-primary') {
          return {
            ...eq,
            currentDurability: eq.maxDurability,
            performanceLevel: 1.0
          };
        }
        return eq;
      });
      
      // Force equipment store update
      useEquipment.setState({ equipment: [...equipmentStore.equipment] });
      console.log(`[HULL-SYNC] Reset hull equipment to full durability`);
    }
    
    set({
      shield: 100,
      hull: 100,
      isDestroyed: false,
      isCritical: false,
      isThrusting: false,
      isWarpMode: false,
      lastDamageSource: null
    });
  },
  
  setThrusting: (thrusting) => {
    set({ isThrusting: thrusting });
  },
  
  setWarpMode: (warpMode) => {
    set({ isWarpMode: warpMode });
  },
  
  upgradeShip: (upgradeType, cost) => {
    const creditsStore = useCredits.getState();
    
    if (!creditsStore.spendCredits(cost)) {
      console.log(`Not enough credits for ${upgradeType} upgrade. Need ${cost} credits.`);
      return false;
    }
    
    set(state => {
      const newUpgrades = { ...state.upgrades };
      
      switch (upgradeType) {
        case 'fuelCapacity':
          newUpgrades.fuelCapacity = Math.min(3.0, newUpgrades.fuelCapacity + 0.5);
          console.log(`Fuel capacity upgraded to ${newUpgrades.fuelCapacity}x`);
          break;
        case 'thrustEfficiency':
          newUpgrades.thrustEfficiency = Math.max(0.3, newUpgrades.thrustEfficiency - 0.1);
          console.log(`Thrust efficiency improved to ${newUpgrades.thrustEfficiency}x fuel consumption`);
          break;
        case 'warpCapability':
          newUpgrades.warpCapability = true;
          console.log("Warp capability unlocked!");
          break;
      }
      
      return { upgrades: newUpgrades };
    });
    
    return true;
  },
  
  applyPassiveRegen: (delta) => {
    const state = get();
    const currentTime = Date.now();
    
    // Only apply regen if not in combat (5 seconds after last damage)
    if (currentTime - state.lastCombatTime < 5000) {
      return;
    }
    
    // Apply crew medic and mechanic bonuses for hull regeneration
    let hullRegenRate = 0;
    try {
      const crewState = (window as any).useCrewManagement?.getState?.();
      if (crewState?.currentBonuses?.healthRegen) {
        hullRegenRate = crewState.currentBonuses.healthRegen * delta; // Hull points per second
        console.log(`[HULL-REGEN] Applying medic/mechanic bonus: +${hullRegenRate.toFixed(2)} hull/sec`);
      }
    } catch (e) {
      // Crew management might not be initialized yet
    }
    
    if (hullRegenRate > 0 && state.hull < 100) {
      const newHull = Math.min(100, state.hull + hullRegenRate);
      
      set(state => ({
        hull: newHull,
        isCritical: state.shield < 20 || newHull < 20
      }));
      
      // Also sync with equipment system
      const equipmentStore = useEquipment.getState();
      const hullEquipment = equipmentStore.getEquipment('hull-primary');
      
      if (hullEquipment) {
        const durabilityRegen = (hullRegenRate / 100) * hullEquipment.maxDurability;
        
        equipmentStore.equipment = equipmentStore.equipment.map(eq => {
          if (eq.id === 'hull-primary') {
            const regenDurability = Math.min(eq.maxDurability, eq.currentDurability + durabilityRegen);
            const conditionRatio = regenDurability / eq.maxDurability;
            return {
              ...eq,
              currentDurability: regenDurability,
              performanceLevel: conditionRatio > 0.8 ? 1.0 : conditionRatio > 0.6 ? 0.9 : conditionRatio > 0.4 ? 0.75 : conditionRatio > 0.2 ? 0.5 : conditionRatio > 0 ? 0.25 : 0
            };
          }
          return eq;
        });
        
        // Force equipment store update
        useEquipment.setState({ equipment: [...equipmentStore.equipment] });
      }
    }
  }
}));