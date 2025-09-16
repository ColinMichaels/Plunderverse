import { useCreditsStore } from './credits.store';
import { useInventoryStore } from './inventory.store';
import { EconomySelectors } from './types';

export const useEconomySelectors = (): EconomySelectors => {
  const credits = useCreditsStore(state => state.credits);
  const inventory = useInventoryStore(state => ({
    items: state.items,
    storageCapacity: state.storageCapacity
  }));

  const currentStorage = inventory.items.reduce((total, item) => total + item.quantity, 0);

  return {
    totalInventoryValue: inventory.items.reduce((total, item) => total + (item.value * item.quantity), 0),
    storageUsed: currentStorage,
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
  return useInventoryStore(state => {
    const used = state.items.reduce((total, item) => total + item.quantity, 0);
    return {
      used,
      capacity: state.storageCapacity,
      available: state.storageCapacity - used,
      percentage: (used / state.storageCapacity) * 100
    };
  });
};

export const useCanAfford = (amount: number) => {
  return useCreditsStore(state => state.credits >= amount);
};

// Comprehensive selector for InventoryDisplay component
export const useInventoryDisplayData = () => {
  return useInventoryStore(state => {
    const storageUsed = state.items.reduce((total, item) => total + item.quantity, 0);
    const totalValue = state.items.reduce((total, item) => total + (item.value * item.quantity), 0);
    
    return {
      items: state.items,
      storageCapacity: state.storageCapacity,
      storageUsed,
      totalValue,
      storagePercentage: (storageUsed / state.storageCapacity) * 100
    };
  });
};

// Selector for components that only need credits information
export const useCreditsData = () => {
  return useCreditsStore(state => ({
    credits: state.credits,
    spendCredits: state.spendCredits,
    earnCredits: state.earnCredits,
    setCredits: state.setCredits
  }));
};

// Selector for trading interface specific data
export const useTradingData = () => {
  const credits = useCreditsStore(state => state.credits);
  const inventory = useInventoryStore(state => ({
    items: state.items,
    storageCapacity: state.storageCapacity
  }));
  
  return {
    credits,
    items: inventory.items,
    storageCapacity: inventory.storageCapacity
  };
};

// Selector for components that need inventory actions (like mining)
export const useInventoryActions = () => {
  return useInventoryStore(state => ({
    addResource: state.addResource,
    removeResource: state.removeResource,
    getResourceQuantity: state.getResourceQuantity,
    getStorageUsed: state.getStorageUsed,
    upgradeStorage: state.upgradeStorage
  }));
};