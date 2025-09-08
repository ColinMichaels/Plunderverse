import { create } from "zustand";

interface ShipStatusState {
  // Ship resources (0-100)
  fuel: number;
  shield: number;
  hull: number;
  
  // Status flags
  isDestroyed: boolean;
  isCritical: boolean;
  
  // Damage sources
  lastDamageSource: string | null;
  
  // Actions
  consumeFuel: (amount: number) => void;
  takeDamage: (amount: number, source: string) => void;
  rechargeShield: (amount: number) => void;
  repairHull: (amount: number) => void;
  refuel: (amount: number) => void;
  resetShip: () => void;
}

export const useShipStatus = create<ShipStatusState>((set, get) => ({
  fuel: 100,
  shield: 100,
  hull: 100,
  isDestroyed: false,
  isCritical: false,
  lastDamageSource: null,
  
  consumeFuel: (amount) => {
    set(state => {
      const newFuel = Math.max(0, state.fuel - amount);
      return {
        fuel: newFuel,
        isCritical: newFuel < 20 || state.shield < 20 || state.hull < 20
      };
    });
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
      const isCritical = newFuel < 20 || newShield < 20 || newHull < 20;
      
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
      isCritical: state.fuel < 20 || Math.min(100, state.shield + amount) < 20 || state.hull < 20
    }));
  },
  
  repairHull: (amount) => {
    set(state => ({
      hull: Math.min(100, state.hull + amount),
      isCritical: state.fuel < 20 || state.shield < 20 || Math.min(100, state.hull + amount) < 20
    }));
  },
  
  refuel: (amount) => {
    set(state => ({
      fuel: Math.min(100, state.fuel + amount),
      isCritical: Math.min(100, state.fuel + amount) < 20 || state.shield < 20 || state.hull < 20
    }));
  },
  
  resetShip: () => {
    set({
      fuel: 100,
      shield: 100,
      hull: 100,
      isDestroyed: false,
      isCritical: false,
      lastDamageSource: null
    });
  }
}));