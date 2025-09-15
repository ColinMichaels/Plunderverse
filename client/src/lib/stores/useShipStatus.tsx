import { create } from "zustand";
import { useCredits } from "./useCredits";
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
}

export const useShipStatus = create<ShipStatusState>((set, get) => ({
  shield: 100,
  hull: 100,
  isDestroyed: false,
  isCritical: false,
  isThrusting: false,
  isWarpMode: false,
  lastDamageSource: null,
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
      
      console.log(`Ship took ${amount} damage from ${source}! Hull: ${newHull}, Shield: ${newShield}`);
      
      return {
        shield: newShield,
        hull: newHull,
        isDestroyed,
        isCritical,
        lastDamageSource: source
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
  }
}));