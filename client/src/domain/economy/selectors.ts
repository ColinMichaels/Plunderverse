import { useCreditsStore } from './credits.store';
import { useInventoryStore } from './inventory.store';
import { EconomySelectors } from './types';

export const useEconomySelectors = (): EconomySelectors => {
  const credits = useCreditsStore(state => state.credits);
  const inventory = useInventoryStore(state => ({
    items: state.items,
    currentStorage: state.currentStorage,
    storageCapacity: state.storageCapacity
  }));

  return {
    totalInventoryValue: inventory.items.reduce((total, item) => total + (item.value * item.quantity), 0),
    storageUsed: inventory.currentStorage,
    canAfford: (amount: number) => credits >= amount,
    hasResource: (resourceType: string, quantity: number) => {
      const item = inventory.items.find(item => item.type === resourceType);
      return item ? item.quantity >= quantity : false;
    }
  };
};

// Individual selectors for specific use cases
export const useTotalInventoryValue = () => {
  return useInventoryStore(state => 
    state.items.reduce((total, item) => total + (item.value * item.quantity), 0)
  );
};

export const useStorageInfo = () => {
  return useInventoryStore(state => ({
    used: state.currentStorage,
    capacity: state.storageCapacity,
    available: state.storageCapacity - state.currentStorage,
    percentage: (state.currentStorage / state.storageCapacity) * 100
  }));
};

export const useCanAfford = (amount: number) => {
  return useCreditsStore(state => state.credits >= amount);
};