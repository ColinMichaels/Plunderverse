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
    
    console.log(`\n[INVENTORY-DEBUG] === ADD RESOURCE OPERATION START ===`);
    console.log(`[INVENTORY-DEBUG] INPUT: resource=${resource.type}, quantity=${quantity}, planetSource=${planetSource}`);
    console.log(`[INVENTORY-DEBUG] RESOURCE DETAILS: rarity=${resource.rarity}, value=${resource.value}`);
    console.log(`[INVENTORY-DEBUG] CURRENT STATE: items=${state.items.length}, storage=${state.currentStorage}/${state.storageCapacity}`);
    
    // Input validation
    if (quantity <= 0) {
      console.error(`[INVENTORY-DEBUG] ⚠️ INVALID QUANTITY: ${quantity} - must be positive!`);
      console.log(`[INVENTORY-DEBUG] === ADD RESOURCE OPERATION FAILED ===\n`);
      return false;
    }
    
    // Check storage capacity
    const availableSpace = state.storageCapacity - state.currentStorage;
    console.log(`[INVENTORY-DEBUG] CAPACITY CHECK: need=${spaceNeeded}, available=${availableSpace}`);
    if (state.currentStorage + spaceNeeded > state.storageCapacity) {
      console.error(`[INVENTORY-DEBUG] ⚠️ STORAGE FULL! Need ${spaceNeeded}, available: ${availableSpace}`);
      console.log(`[INVENTORY-DEBUG] === ADD RESOURCE OPERATION FAILED ===\n`);
      return false;
    }
    
    // Find existing item or create new
    const existingItemIndex = state.items.findIndex(item => item.type === resource.type);
    console.log(`[INVENTORY-DEBUG] STACKING CHECK: existingItemIndex=${existingItemIndex}`);
    
    if (existingItemIndex >= 0) {
      // Update existing item (stacking)
      const existingItem = state.items[existingItemIndex];
      console.log(`[INVENTORY-DEBUG] STACKING: Found existing ${existingItem.type} with ${existingItem.quantity} units`);
      const newQuantity = existingItem.quantity + quantity;
      
      const updatedItems = [...state.items];
      updatedItems[existingItemIndex] = {
        ...updatedItems[existingItemIndex],
        quantity: newQuantity
      };
      
      set({
        items: updatedItems,
        currentStorage: state.currentStorage + spaceNeeded
      });
      
      console.log(`[INVENTORY-DEBUG] STACKING SUCCESS: ${existingItem.type} now has ${newQuantity} units (added ${quantity})`);
    } else {
      // Add new item
      console.log(`[INVENTORY-DEBUG] NEW ITEM: Creating new inventory slot for ${resource.type}`);
      const newItem: InventoryItem = {
        ...resource,
        quantity,
        planetSource
      };
      
      set({
        items: [...state.items, newItem],
        currentStorage: state.currentStorage + spaceNeeded
      });
      
      console.log(`[INVENTORY-DEBUG] NEW ITEM SUCCESS: Created slot with ${quantity} ${resource.type}`);
    }
    
    // Final state verification
    const finalState = get();
    const totalUnits = finalState.items.reduce((sum, item) => sum + item.quantity, 0);
    console.log(`[INVENTORY-DEBUG] FINAL STATE: items=${finalState.items.length}, storage=${finalState.currentStorage}/${finalState.storageCapacity}`);
    console.log(`[INVENTORY-DEBUG] TOTAL UNITS: ${totalUnits}`);
    console.log(`[INVENTORY-DEBUG] LAST ITEM: ${finalState.items.length > 0 ? finalState.items[finalState.items.length - 1].type : 'none'}`);
    console.log(`[INVENTORY-DEBUG] === ADD RESOURCE OPERATION SUCCESS ===\n`);
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