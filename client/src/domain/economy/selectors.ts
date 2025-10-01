import { useMemo } from 'react';
import { useCreditsStore } from './credits.store';
import { useInventoryStore } from './inventory.store';
import { EconomySelectors } from './types';

// Direct data selectors for easier migration
export const useCreditsData = () => useCreditsStore(state => state.credits);
export const useInventoryDisplayData = () => {
  const items = useInventoryStore(state => state.items);
  const storageCapacity = useInventoryStore(state => state.storageCapacity);
  const storageUsed = items.reduce((total, item) => total + item.quantity, 0);
  
  return {
    items,
    storageCapacity,
    storageUsed,
    storagePercentage: (storageUsed / storageCapacity) * 100
  };
};
import {
  validateEconomyState,
  assert,
  checkpoint,
  DEBUG_PREFIXES,
  getDebugConfig
} from './debug';

export const useEconomySelectors = (): EconomySelectors => {
  const config = getDebugConfig();
  
  if (config.enabled && config.consistencyChecks) {
    checkpoint('useEconomySelectors called');
  }
  
  const credits = useCreditsStore(state => state.credits);
  const items = useInventoryStore(state => state.items);
  const storageCapacity = useInventoryStore(state => state.storageCapacity);

  // Memoize calculations to prevent infinite loops
  const calculations = useMemo(() => {
    const currentStorage = items.reduce((total, item) => total + item.quantity, 0);
    const totalInventoryValue = items.reduce((total, item) => total + (item.value * item.quantity), 0);

    // Validate state consistency
    if (config.enabled && config.consistencyChecks) {
      validateEconomyState(credits, items, storageCapacity, 'useEconomySelectors');
      
      assert(
        currentStorage >= 0,
        `Negative storage calculated in useEconomySelectors: ${currentStorage}`,
        { inventory: items, currentStorage }
      );
      
      assert(
        currentStorage <= storageCapacity,
        `Storage overflow detected in useEconomySelectors: ${currentStorage} > ${storageCapacity}`,
        { currentStorage, storageCapacity }
      );
      
      assert(
        totalInventoryValue >= 0,
        `Negative inventory value calculated in useEconomySelectors: ${totalInventoryValue}`,
        { inventory: items, totalInventoryValue }
      );
      
      console.log(`${DEBUG_PREFIXES.CONSISTENCY} useEconomySelectors calculations:`, {
        credits,
        storageUsed: currentStorage,
        storageCapacity,
        totalInventoryValue,
        itemCount: items.length
      });
    }

    return {
      totalInventoryValue,
      storageUsed: currentStorage
    };
  }, [items, storageCapacity, credits, config.enabled, config.consistencyChecks]);

  // Memoize functions to prevent recreation on every render
  const canAfford = useMemo(() => (amount: number) => {
    const result = credits >= amount;
    if (config.enabled && config.consistencyChecks) {
      assert(
        typeof amount === 'number' && amount >= 0,
        `Invalid amount passed to canAfford: ${amount}`,
        { amount, credits }
      );
      console.log(`${DEBUG_PREFIXES.CONSISTENCY} canAfford(${amount}): ${result} (credits: ${credits})`);
    }
    return result;
  }, [credits, config.enabled, config.consistencyChecks]);

  const hasResource = useMemo(() => (resourceType: string, quantity: number) => {
    const item = items.find(item => item.type === resourceType);
    const result = item ? item.quantity >= quantity : false;
    
    if (config.enabled && config.consistencyChecks) {
      assert(
        typeof quantity === 'number' && quantity >= 0,
        `Invalid quantity passed to hasResource: ${quantity}`,
        { resourceType, quantity }
      );
      
      console.log(`${DEBUG_PREFIXES.CONSISTENCY} hasResource(${resourceType}, ${quantity}): ${result}`, {
        available: item?.quantity || 0,
        requested: quantity
      });
    }
    
    return result;
  }, [items, config.enabled, config.consistencyChecks]);

  return useMemo(() => ({
    totalInventoryValue: calculations.totalInventoryValue,
    storageUsed: calculations.storageUsed,
    canAfford,
    hasResource
  }), [calculations.totalInventoryValue, calculations.storageUsed, canAfford, hasResource]);
};

// Individual selectors for specific use cases
export const useTotalInventoryValue = () => {
  const items = useInventoryStore(state => state.items);
  return useMemo(() => 
    items.reduce((total, item) => total + (item.value * item.quantity), 0),
    [items]
  );
};

export const useStorageInfo = () => {
  const items = useInventoryStore(state => state.items);
  const capacity = useInventoryStore(state => state.storageCapacity);
  
  return useMemo(() => {
    const used = items.reduce((total, item) => total + item.quantity, 0);
    return {
      used,
      capacity,
      available: capacity - used,
      percentage: (used / capacity) * 100
    };
  }, [items, capacity]);
};

export const useCanAfford = (amount: number) => {
  return useCreditsStore(state => state.credits >= amount);
};

// Comprehensive selector for InventoryDisplay component
export const useInventoryDisplayData = () => {
  const items = useInventoryStore(state => state.items);
  const storageCapacity = useInventoryStore(state => state.storageCapacity);
  
  return useMemo(() => {
    const storageUsed = items.reduce((total, item) => total + item.quantity, 0);
    const totalValue = items.reduce((total, item) => total + (item.value * item.quantity), 0);
    
    return {
      items,
      storageCapacity,
      storageUsed,
      totalValue,
      storagePercentage: (storageUsed / storageCapacity) * 100
    };
  }, [items, storageCapacity]);
};

// Selector for components that only need credits information
export const useCreditsData = () => {
  const credits = useCreditsStore(state => state.credits);
  const spendCredits = useCreditsStore(state => state.spendCredits);
  const earnCredits = useCreditsStore(state => state.earnCredits);
  const setCredits = useCreditsStore(state => state.setCredits);
  
  return {
    credits,
    spendCredits,
    earnCredits,
    setCredits
  };
};

// Selector for trading interface specific data
export const useTradingData = () => {
  const credits = useCreditsStore(state => state.credits);
  const items = useInventoryStore(state => state.items);
  const storageCapacity = useInventoryStore(state => state.storageCapacity);
  
  return useMemo(() => ({
    credits,
    items,
    storageCapacity
  }), [credits, items, storageCapacity]);
};

// Selector for components that need inventory actions (like mining)
export const useInventoryActions = () => {
  const addResource = useInventoryStore(state => state.addResource);
  const removeResource = useInventoryStore(state => state.removeResource);
  const getResourceQuantity = useInventoryStore(state => state.getResourceQuantity);
  const getStorageUsed = useInventoryStore(state => state.getStorageUsed);
  const upgradeStorage = useInventoryStore(state => state.upgradeStorage);
  
  return useMemo(() => ({
    addResource,
    removeResource,
    getResourceQuantity,
    getStorageUsed,
    upgradeStorage
  }), [addResource, removeResource, getResourceQuantity, getStorageUsed, upgradeStorage]);
};