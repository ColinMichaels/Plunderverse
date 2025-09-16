import { create } from "zustand";
import { InventoryItem, InventoryState } from './types';
import { ResourceData } from '../../lib/planetData';
import { economyEvents } from './events';

interface InventoryActions {
  addResource: (resource: ResourceData, quantity: number, planetSource: string) => boolean;
  removeResource: (resourceType: string, quantity: number) => boolean;
  getResourceQuantity: (resourceType: string) => number;
  getTotalValue: () => number;
  getStorageUsed: () => number;
  upgradeStorage: (additionalCapacity: number) => void;
}

type InventoryStore = InventoryState & InventoryActions;

export const useInventoryStore = create<InventoryStore>((set, get) => ({
  items: [],
  storageCapacity: 100,
  
  addResource: (resource, quantity, planetSource) => {
    const state = get();
    const spaceNeeded = quantity;
    
    if (quantity <= 0) {
      console.error(`Invalid quantity: ${quantity} - must be positive!`);
      return false;
    }
    
    const currentStorageUsed = state.items.reduce((total, item) => total + item.quantity, 0);
    const availableSpace = state.storageCapacity - currentStorageUsed;
    if (currentStorageUsed + spaceNeeded > state.storageCapacity) {
      console.error(`Storage full! Need ${spaceNeeded}, available: ${availableSpace}`);
      return false;
    }
    
    const existingItemIndex = state.items.findIndex(item => item.type === resource.type);
    
    if (existingItemIndex >= 0) {
      // Stack with existing item
      const existingItem = state.items[existingItemIndex];
      const newQuantity = existingItem.quantity + quantity;
      
      const updatedItems = [...state.items];
      updatedItems[existingItemIndex] = {
        ...updatedItems[existingItemIndex],
        quantity: newQuantity
      };
      
      set({
        items: updatedItems
      });
    } else {
      // Add new item
      const newItem: InventoryItem = {
        ...resource,
        quantity,
        planetSource
      };
      
      set({
        items: [...state.items, newItem]
      });
    }
    
    economyEvents.emit({
      type: 'resource_added',
      payload: { resource, quantity, planetSource },
      timestamp: Date.now()
    });
    
    return true;
  },
  
  removeResource: (resourceType, quantity) => {
    const state = get();
    const itemIndex = state.items.findIndex(item => item.type === resourceType);
    
    if (itemIndex === -1) {
      console.log(`Resource ${resourceType} not found in inventory`);
      return false;
    }
    
    const item = state.items[itemIndex];
    if (item.quantity < quantity) {
      console.log(`Insufficient ${resourceType}! Have ${item.quantity}, need ${quantity}`);
      return false;
    }
    
    const updatedItems = [...state.items];
    if (item.quantity === quantity) {
      updatedItems.splice(itemIndex, 1);
    } else {
      updatedItems[itemIndex] = {
        ...item,
        quantity: item.quantity - quantity
      };
    }
    
    set({
      items: updatedItems
    });
    
    economyEvents.emit({
      type: 'resource_removed',
      payload: { resource: item, quantity },
      timestamp: Date.now()
    });
    
    return true;
  },
  
  getResourceQuantity: (resourceType) => {
    const state = get();
    const item = state.items.find(item => item.type === resourceType);
    return item ? item.quantity : 0;
  },
  
  getTotalValue: () => {
    const state = get();
    return state.items.reduce((total, item) => total + (item.value * item.quantity), 0);
  },
  
  getStorageUsed: () => {
    const state = get();
    return state.items.reduce((total, item) => total + item.quantity, 0);
  },
  
  upgradeStorage: (additionalCapacity) => {
    set(state => ({
      storageCapacity: state.storageCapacity + additionalCapacity
    }));
    console.log(`Storage upgraded! New capacity: ${get().storageCapacity}`);
  }
}));