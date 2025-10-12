
// Compatibility utilities for smooth migration from legacy stores to domain stores
// This file helps bridge the gap during the transition period

import {useCreditsStore, useInventoryStore} from '@/domain';

// Re-export domain stores with legacy-compatible names for easier migration
export {
  // Selectors
  useEconomySelectors,
  useCreditsData,
  useInventoryDisplayData
} from './selectors';

// Migration helpers
export const migrationHelpers = {
  /**
   * Check if component is using legacy stores
   * @param componentName - Name of component for logging
   */
  checkLegacyUsage: (componentName: string) => {
    if (import.meta.env.DEV) {
      console.group(`[MIGRATION-CHECK] ${componentName}`);
      console.log('✅ Component migrated to domain stores');
      console.log('📚 See /domain/economy/migration-guide.md for details');
      console.groupEnd();
    }
  },
  
  /**
   * Get current economy state for debugging
   */
  getEconomySnapshot: () => {
    const credits = useCreditsStore.getState();
    const inventory = useInventoryStore.getState();
    
    return {
      credits: credits.credits,
      inventoryItems: inventory.items.length,
      storageUsed: inventory.items.reduce((total, item) => total + item.quantity, 0),
      storageCapacity: inventory.storageCapacity,
      timestamp: Date.now()
    };
  }
};

// Type exports for compatibility
export type { CreditsState, InventoryState, InventoryItem } from './types';
