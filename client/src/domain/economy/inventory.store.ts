import { create } from "zustand";
import { InventoryItem, InventoryState } from './types';
import { ResourceData } from '../../lib/planetData';
import { economyEvents } from './events';
import {
  validateStorageConsistency,
  checkpoint,
  assert,
  DEBUG_PREFIXES
} from './debug';

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
    checkpoint(`Inventory addResource attempt: ${resource.type} x${quantity} from ${planetSource}`, {
      resourceType: resource.type,
      quantity,
      planetSource
    });
    
    const state = get();
    const initialStorageUsed = state.items.reduce((total, item) => total + item.quantity, 0);
    const spaceNeeded = quantity;
    
    // Pre-transaction validation
    validateStorageConsistency(state.items, initialStorageUsed, 'addResource-start');
    
    assert(
      quantity > 0,
      `Attempting to add negative or zero quantity: ${quantity}`,
      { resource, quantity, planetSource }
    );
    
    assert(
      Number.isFinite(quantity),
      `Attempting to add non-finite quantity: ${quantity}`,
      { resource, quantity, planetSource }
    );
    
    assert(
      !!(resource && resource.type),
      `Invalid resource object provided`,
      { resource, quantity, planetSource }
    );
    
    if (quantity <= 0) {
      console.error(`${DEBUG_PREFIXES.ASSERTION} Invalid quantity: ${quantity} - must be positive!`);
      checkpoint(`AddResource failed - invalid quantity`, { quantity, resource: resource.type });
      return false;
    }
    
    const currentStorageUsed = state.items.reduce((total, item) => total + item.quantity, 0);
    const availableSpace = state.storageCapacity - currentStorageUsed;
    
    console.log(`${DEBUG_PREFIXES.SYNC_CHECK} addResource storage check: used ${currentStorageUsed}, capacity ${state.storageCapacity}, available ${availableSpace}, needed ${spaceNeeded}`);
    
    if (currentStorageUsed + spaceNeeded > state.storageCapacity) {
      console.error(`${DEBUG_PREFIXES.ASSERTION} Storage full! Need ${spaceNeeded}, available: ${availableSpace}`);
      checkpoint(`AddResource failed - storage full`, {
        spaceNeeded,
        availableSpace,
        currentStorageUsed,
        storageCapacity: state.storageCapacity
      });
      return false;
    }
    
    const existingItemIndex = state.items.findIndex(item => item.type === resource.type);
    
    if (existingItemIndex >= 0) {
      // Stack with existing item
      const existingItem = state.items[existingItemIndex];
      const newQuantity = existingItem.quantity + quantity;
      
      console.log(`${DEBUG_PREFIXES.SYNC_CHECK} addResource stacking: ${existingItem.quantity} + ${quantity} = ${newQuantity}`);
      
      const updatedItems = [...state.items];
      updatedItems[existingItemIndex] = {
        ...updatedItems[existingItemIndex],
        quantity: newQuantity
      };
      
      set({
        items: updatedItems
      });
      
      checkpoint(`Resource stacked successfully`, {
        resourceType: resource.type,
        previousQuantity: existingItem.quantity,
        addedQuantity: quantity,
        newQuantity
      });
    } else {
      // Add new item
      const newItem: InventoryItem = {
        ...resource,
        quantity,
        planetSource
      };
      
      console.log(`${DEBUG_PREFIXES.SYNC_CHECK} addResource new item: ${resource.type} x${quantity}`);
      
      set({
        items: [...state.items, newItem]
      });
      
      checkpoint(`New resource added successfully`, {
        resourceType: resource.type,
        quantity,
        planetSource
      });
    }
    
    // Post-transaction validation
    const finalState = get();
    const finalStorageUsed = finalState.items.reduce((total, item) => total + item.quantity, 0);
    const expectedStorageUsed = initialStorageUsed + quantity;
    
    validateStorageConsistency(finalState.items, finalStorageUsed, 'addResource-end');
    
    assert(
      finalStorageUsed === expectedStorageUsed,
      `Storage calculation mismatch after addResource: expected ${expectedStorageUsed}, got ${finalStorageUsed}`,
      {
        initialStorageUsed,
        quantity,
        expectedStorageUsed,
        finalStorageUsed,
        resource: resource.type
      }
    );
    
    // Verify the specific item was added/updated correctly
    const updatedItem = finalState.items.find(item => item.type === resource.type);
    assert(
      !!updatedItem,
      `Resource not found after addResource: ${resource.type}`,
      { resource, finalState: finalState.items }
    );
    
    economyEvents.emit({
      type: 'resource_added',
      payload: { resource, quantity, planetSource },
      timestamp: Date.now()
    });
    
    checkpoint(`AddResource completed successfully`, {
      resourceType: resource.type,
      quantity,
      planetSource,
      storageUsedBefore: initialStorageUsed,
      storageUsedAfter: finalStorageUsed,
      totalItems: finalState.items.length
    });
    
    console.log(`${DEBUG_PREFIXES.TRANSACTION} addResource success: ${resource.type} x${quantity} (${initialStorageUsed} -> ${finalStorageUsed} storage)`);
    
    return true;
  },
  
  removeResource: (resourceType, quantity) => {
    checkpoint(`Inventory removeResource attempt: ${resourceType} x${quantity}`, {
      resourceType,
      quantity
    });
    
    const state = get();
    const initialStorageUsed = state.items.reduce((total, item) => total + item.quantity, 0);
    const itemIndex = state.items.findIndex(item => item.type === resourceType);
    
    // Pre-transaction validation
    validateStorageConsistency(state.items, initialStorageUsed, 'removeResource-start');
    
    assert(
      quantity > 0,
      `Attempting to remove negative or zero quantity: ${quantity}`,
      { resourceType, quantity }
    );
    
    assert(
      Number.isFinite(quantity),
      `Attempting to remove non-finite quantity: ${quantity}`,
      { resourceType, quantity }
    );
    
    if (itemIndex === -1) {
      console.log(`${DEBUG_PREFIXES.TRANSACTION} Resource ${resourceType} not found in inventory`);
      checkpoint(`RemoveResource failed - resource not found`, {
        resourceType,
        availableResources: state.items.map(item => item.type)
      });
      return false;
    }
    
    const item = state.items[itemIndex];
    if (item.quantity < quantity) {
      console.log(`${DEBUG_PREFIXES.TRANSACTION} Insufficient ${resourceType}! Have ${item.quantity}, need ${quantity}`);
      checkpoint(`RemoveResource failed - insufficient quantity`, {
        resourceType,
        available: item.quantity,
        requested: quantity,
        deficit: quantity - item.quantity
      });
      return false;
    }
    
    console.log(`${DEBUG_PREFIXES.SYNC_CHECK} removeResource: ${item.quantity} - ${quantity} = ${item.quantity - quantity}`);
    
    const updatedItems = [...state.items];
    if (item.quantity === quantity) {
      // Remove item completely
      updatedItems.splice(itemIndex, 1);
      checkpoint(`Resource completely removed`, {
        resourceType,
        removedQuantity: quantity,
        itemsRemaining: updatedItems.length
      });
    } else {
      // Reduce quantity
      const newQuantity = item.quantity - quantity;
      updatedItems[itemIndex] = {
        ...item,
        quantity: newQuantity
      };
      checkpoint(`Resource quantity reduced`, {
        resourceType,
        previousQuantity: item.quantity,
        removedQuantity: quantity,
        newQuantity
      });
    }
    
    set({
      items: updatedItems
    });
    
    // Post-transaction validation
    const finalState = get();
    const finalStorageUsed = finalState.items.reduce((total, item) => total + item.quantity, 0);
    const expectedStorageUsed = initialStorageUsed - quantity;
    
    validateStorageConsistency(finalState.items, finalStorageUsed, 'removeResource-end');
    
    assert(
      finalStorageUsed === expectedStorageUsed,
      `Storage calculation mismatch after removeResource: expected ${expectedStorageUsed}, got ${finalStorageUsed}`,
      {
        initialStorageUsed,
        quantity,
        expectedStorageUsed,
        finalStorageUsed,
        resourceType
      }
    );
    
    // Verify the specific item was removed/updated correctly
    const updatedItem = finalState.items.find(item => item.type === resourceType);
    if (item.quantity === quantity) {
      // Item should be completely removed
      assert(
        !updatedItem,
        `Resource still found after complete removal: ${resourceType}`,
        { resourceType, finalState: finalState.items }
      );
    } else {
      // Item should still exist with reduced quantity
      assert(
        !!(updatedItem && updatedItem.quantity === item.quantity - quantity),
        `Resource quantity not updated correctly after partial removal: ${resourceType}`,
        { resourceType, expectedQuantity: item.quantity - quantity, actualQuantity: updatedItem?.quantity }
      );
    }
    
    economyEvents.emit({
      type: 'resource_removed',
      payload: { resource: item, quantity },
      timestamp: Date.now()
    });
    
    checkpoint(`RemoveResource completed successfully`, {
      resourceType,
      quantity,
      storageUsedBefore: initialStorageUsed,
      storageUsedAfter: finalStorageUsed,
      totalItems: finalState.items.length
    });
    
    console.log(`${DEBUG_PREFIXES.TRANSACTION} removeResource success: ${resourceType} x${quantity} (${initialStorageUsed} -> ${finalStorageUsed} storage)`);
    
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