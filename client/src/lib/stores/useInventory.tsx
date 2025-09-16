import { create } from "zustand";
import { ResourceData } from "../planetData";
import { useInventoryStore } from "../../domain/economy/inventory.store";

export interface InventoryItem extends ResourceData {
  quantity: number;
  planetSource: string;
}

interface InventoryState {
  items: InventoryItem[];
  storageCapacity: number;
  currentStorage: number;
  
  // Actions
  addResource: (resource: ResourceData, quantity: number, planetSource: string) => boolean;
  removeResource: (resourceType: string, quantity: number) => boolean;
  getResourceQuantity: (resourceType: string) => number;
  getTotalValue: () => number;
  getStorageUsed: () => number;
  upgradeStorage: (additionalCapacity: number) => void;
}

// Legacy adapter store that delegates to the domain store
// This maintains backward compatibility while ensuring single source of truth
export const useInventory = create<InventoryState>((set, get) => {
  // Subscribe to domain store changes and sync legacy store
  useInventoryStore.subscribe((domainState) => {
    set({
      items: domainState.items,
      storageCapacity: domainState.storageCapacity,
      currentStorage: domainState.currentStorage
    });
  });

  // Initialize with current domain store state
  const domainState = useInventoryStore.getState();
  
  return {
    items: domainState.items,
    storageCapacity: domainState.storageCapacity,
    currentStorage: domainState.currentStorage,
    
    // Delegate all operations to domain store
    addResource: (resource, quantity, planetSource) => {
      console.log(`[LEGACY-INVENTORY] Delegating addResource to domain store: ${resource.type} x${quantity}`);
      return useInventoryStore.getState().addResource(resource, quantity, planetSource);
    },
    
    removeResource: (resourceType, quantity) => {
      console.log(`[LEGACY-INVENTORY] Delegating removeResource to domain store: ${resourceType} x${quantity}`);
      return useInventoryStore.getState().removeResource(resourceType, quantity);
    },
    
    getResourceQuantity: (resourceType) => {
      return useInventoryStore.getState().getResourceQuantity(resourceType);
    },
    
    getTotalValue: () => {
      const domainState = useInventoryStore.getState();
      return domainState.items.reduce((total, item) => total + (item.value * item.quantity), 0);
    },
    
    getStorageUsed: () => {
      return useInventoryStore.getState().currentStorage;
    },
    
    upgradeStorage: (additionalCapacity) => {
      console.log(`[LEGACY-INVENTORY] Delegating upgradeStorage to domain store: +${additionalCapacity}`);
      useInventoryStore.getState().upgradeStorage(additionalCapacity);
    }
  };
});