import { useCreditsStore } from './credits.store';
import { useInventoryStore } from './inventory.store';
import { ResourceData } from '../../lib/planetData';

class EconomyService {
  // Transaction operations that coordinate between stores
  sellResource(resourceType: string, quantity: number, pricePerUnit: number): boolean {
    const creditsStore = useCreditsStore.getState();
    const inventoryStore = useInventoryStore.getState();
    
    // Check if we have the resource
    if (inventoryStore.getResourceQuantity(resourceType) < quantity) {
      console.log(`Cannot sell: insufficient ${resourceType}`);
      return false;
    }
    
    // Calculate total value
    const totalValue = quantity * pricePerUnit;
    
    // Perform transaction
    if (inventoryStore.removeResource(resourceType, quantity)) {
      creditsStore.earnCredits(totalValue);
      console.log(`Sold ${quantity} ${resourceType} for ${totalValue} credits`);
      return true;
    }
    
    return false;
  }
  
  buyResource(resource: ResourceData, quantity: number, pricePerUnit: number, planetSource: string): boolean {
    const creditsStore = useCreditsStore.getState();
    const inventoryStore = useInventoryStore.getState();
    
    const totalCost = quantity * pricePerUnit;
    
    // Check if we can afford it
    if (!creditsStore.spendCredits(totalCost)) {
      console.log(`Cannot buy: insufficient credits for ${totalCost}`);
      return false;
    }
    
    // Try to add to inventory
    if (inventoryStore.addResource(resource, quantity, planetSource)) {
      console.log(`Bought ${quantity} ${resource.type} for ${totalCost} credits`);
      return true;
    } else {
      // Refund if inventory addition failed
      creditsStore.earnCredits(totalCost);
      console.log(`Purchase failed: inventory full, refunded ${totalCost} credits`);
      return false;
    }
  }
  
  upgradeStorage(additionalCapacity: number, cost: number): boolean {
    const creditsStore = useCreditsStore.getState();
    const inventoryStore = useInventoryStore.getState();
    
    if (creditsStore.spendCredits(cost)) {
      inventoryStore.upgradeStorage(additionalCapacity);
      console.log(`Storage upgraded by ${additionalCapacity} for ${cost} credits`);
      return true;
    }
    
    return false;
  }
  
  // Utility methods
  getNetWorth(): number {
    const creditsStore = useCreditsStore.getState();
    const inventoryStore = useInventoryStore.getState();
    
    const inventoryValue = inventoryStore.items.reduce(
      (total, item) => total + (item.value * item.quantity), 
      0
    );
    
    return creditsStore.credits + inventoryValue;
  }
}

export const economyService = new EconomyService();