import { create } from "zustand";
import { ResourceData } from "../planetData";

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

export const useInventory = create<InventoryState>((set, get) => ({
  items: [],
  storageCapacity: 100, // Starting storage capacity
  currentStorage: 0,
  
  addResource: (resource, quantity, planetSource) => {
    const state = get();
    const spaceNeeded = quantity;
    
    // Check storage capacity
    if (state.currentStorage + spaceNeeded > state.storageCapacity) {
      console.log(`Insufficient storage space! Need ${spaceNeeded}, available: ${state.storageCapacity - state.currentStorage}`);
      return false;
    }
    
    // Find existing item or create new
    const existingItemIndex = state.items.findIndex(item => item.type === resource.type);
    
    if (existingItemIndex >= 0) {
      // Update existing item
      const updatedItems = [...state.items];
      updatedItems[existingItemIndex] = {
        ...updatedItems[existingItemIndex],
        quantity: updatedItems[existingItemIndex].quantity + quantity
      };
      
      set({
        items: updatedItems,
        currentStorage: state.currentStorage + spaceNeeded
      });
    } else {
      // Add new item
      const newItem: InventoryItem = {
        ...resource,
        quantity,
        planetSource
      };
      
      set({
        items: [...state.items, newItem],
        currentStorage: state.currentStorage + spaceNeeded
      });
    }
    
    console.log(`Added ${quantity} ${resource.type} to inventory from ${planetSource}`);
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
      // Remove item entirely
      updatedItems.splice(itemIndex, 1);
    } else {
      // Reduce quantity
      updatedItems[itemIndex] = {
        ...item,
        quantity: item.quantity - quantity
      };
    }
    
    set({
      items: updatedItems,
      currentStorage: state.currentStorage - quantity
    });
    
    console.log(`Removed ${quantity} ${resourceType} from inventory`);
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
    return state.currentStorage;
  },
  
  upgradeStorage: (additionalCapacity) => {
    set(state => ({
      storageCapacity: state.storageCapacity + additionalCapacity
    }));
    console.log(`Storage upgraded! New capacity: ${get().storageCapacity}`);
  }
}));