import { create } from "zustand";
import { useCredits } from "./useCredits";

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
      
      // Shield absorbs damage first
      if (newShield > 0) {
        newShield = Math.max(0, newShield - amount);
        // If shield breaks, remaining damage goes to hull
        if (newShield === 0 && amount > state.shield) {
          const remainingDamage = amount - state.shield;
          newHull = Math.max(0, newHull - remainingDamage);
        }
      } else {
        // No shield, direct hull damage
        newHull = Math.max(0, newHull - amount);
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
    set(state => ({
      hull: Math.min(100, state.hull + amount),
      isCritical: state.shield < 20 || Math.min(100, state.hull + amount) < 20
    }));
  },
  
  
  resetShip: () => {
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