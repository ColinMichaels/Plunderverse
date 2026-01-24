import { create } from "zustand";
import { ResourceData } from "../../planetData";
import { useInventoryStore } from "../../../domain/economy/inventory.store";

export interface InventoryItem extends ResourceData {
  quantity: number;
  planetSource: string;
}

interface InventoryState {
  items: InventoryItem[];
  storageCapacity: number;
  
  // Actions
  addResource: (resource: ResourceData, quantity: number, planetSource: string) => boolean;
  removeResource: (resourceType: string, quantity: number) => boolean;
  getResourceQuantity: (resourceType: string) => number;
  getTotalValue: () => number;
  getStorageUsed: () => number;
  upgradeStorage: (additionalCapacity: number) => void;
}

let inventoryDeprecationWarned = false;

export const useInventory = create<InventoryState>((set, get) => {
  if (import.meta.env.DEV && !inventoryDeprecationWarned) {
    console.warn('[DEPRECATED] useInventory is deprecated. Use useInventoryStore from domain stores instead.');
    inventoryDeprecationWarned = true;
  }

  useInventoryStore.subscribe((domainState) => {
    set({
      items: domainState.items,
      storageCapacity: domainState.storageCapacity
    });
  });

  const domainState = useInventoryStore.getState();
  
  return {
    items: domainState.items,
    storageCapacity: domainState.storageCapacity,
    addResource: (resource, quantity, planetSource) => useInventoryStore.getState().addResource(resource, quantity, planetSource),
    removeResource: (resourceType, quantity) => useInventoryStore.getState().removeResource(resourceType, quantity),
    getResourceQuantity: (resourceType) => useInventoryStore.getState().getResourceQuantity(resourceType),
    getTotalValue: () => {
      const domainState = useInventoryStore.getState();
      return domainState.items.reduce((total, item) => total + (item.value * item.quantity), 0);
    },
    getStorageUsed: () => useInventoryStore.getState().getStorageUsed(),
    upgradeStorage: (additionalCapacity) => useInventoryStore.getState().upgradeStorage(additionalCapacity)
  };
});