import { useEffect, useCallback } from 'react';
import { useObjectiveTriggers } from './useObjectiveTriggers';
import { useInventory } from './useInventory';

/**
 * Hook that automatically reports collection-based objective progress
 * Monitors inventory changes and reports when items are collected
 */
export const useCollectionTrigger = (enabled: boolean = true) => {
  const triggers = useObjectiveTriggers();
  const inventory = useInventory();
  
  // Track previous inventory state to detect changes
  useEffect(() => {
    if (!enabled) return;
    
    // Store previous inventory for comparison
    let previousItems = new Map<string, number>();
    
    const checkInventoryChanges = () => {
      const currentItems = new Map<string, number>();
      
      // Build current inventory map
      inventory.items.forEach(item => {
        const itemKey = item.type; // Use type as the identifier
        const current = currentItems.get(itemKey) || 0;
        currentItems.set(itemKey, current + item.quantity);
      });
      
      // Check for new or increased items
      currentItems.forEach((quantity, itemType) => {
        const previousQuantity = previousItems.get(itemType) || 0;
        
        if (quantity > previousQuantity) {
          const added = quantity - previousQuantity;
          
          // Report collection progress
          triggers.reportCollectionProgress(
            itemType, // Use type as itemId
            itemType, // Also pass it as itemType
            added
          );
          
          console.log(`[CollectionTrigger] Collected ${added}x ${itemType}`);
        }
      });
      
      // Update previous inventory
      previousItems = currentItems;
    };
    
    // Check immediately
    checkInventoryChanges();
    
    // Set up interval to check periodically
    const interval = setInterval(checkInventoryChanges, 500);
    
    return () => clearInterval(interval);
  }, [enabled, inventory.items, triggers]);
  
  // Manual collection reporting functions
  const reportItemCollected = useCallback((itemId: string, itemType?: string, quantity: number = 1) => {
    triggers.reportCollectionProgress(itemId, itemType, quantity);
  }, [triggers]);
  
  const reportResourceCollected = useCallback((resourceType: string, quantity: number = 1) => {
    triggers.reportCollectionProgress(resourceType, 'resource', quantity);
  }, [triggers]);
  
  const reportCargoCollected = useCallback((cargoId: string, quantity: number = 1) => {
    triggers.reportCollectionProgress(cargoId, 'cargo', quantity);
  }, [triggers]);
  
  return {
    reportItemCollected,
    reportResourceCollected,
    reportCargoCollected,
    // Also expose generic collection report
    reportCollection: triggers.reportCollectionProgress
  };
};

export default useCollectionTrigger;