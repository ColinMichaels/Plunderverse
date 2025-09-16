import { useCreditsStore } from './credits.store';
import { useInventoryStore } from './inventory.store';
import { useEquipment } from '../../lib/stores/useEquipment';
import { useAudio } from '../../lib/stores/useAudio';
import { ResourceData } from '../../lib/planetData';
import { economyEvents } from './events';

export interface TransactionResult {
  success: boolean;
  message: string;
  details?: {
    creditsSpent?: number;
    creditsEarned?: number;
    resourcesAdded?: { type: string; quantity: number }[];
    resourcesRemoved?: { type: string; quantity: number }[];
    durabilityRestored?: { equipmentId: string; amount: number }[];
    fuelAdded?: number;
    storageAdded?: number;
  };
}

class EconomyService {
  // Core transaction operations that coordinate between stores
  
  /**
   * Sell resources from inventory for credits
   */
  sellResource(resourceType: string, quantity: number): TransactionResult {
    console.log(`[ECONOMY-SERVICE] Starting sellResource: ${resourceType} x${quantity}`);
    
    const inventory = useInventoryStore.getState();
    const credits = useCreditsStore.getState();
    const audio = useAudio.getState();
    
    // Find the resource item
    const item = inventory.items.find(item => item.type === resourceType);
    if (!item) {
      return {
        success: false,
        message: `Resource ${resourceType} not found in inventory`
      };
    }
    
    // Check quantity
    if (item.quantity < quantity) {
      return {
        success: false,
        message: `Insufficient ${resourceType}! Have ${item.quantity}, need ${quantity}`
      };
    }
    
    // Calculate total value
    const totalValue = item.value * quantity;
    
    // Perform atomic transaction
    const removeSuccess = inventory.removeResource(resourceType, quantity);
    if (removeSuccess) {
      credits.earnCredits(totalValue);
      audio.playSuccess();
      
      // Emit event
      economyEvents.emit({
        type: 'credits_earned',
        payload: { amount: totalValue },
        timestamp: Date.now()
      });
      
      console.log(`[ECONOMY-SERVICE] Sold ${quantity} ${resourceType} for ${totalValue} credits`);
      return {
        success: true,
        message: `Sold ${quantity} ${resourceType} for ${totalValue} credits`,
        details: {
          creditsEarned: totalValue,
          resourcesRemoved: [{ type: resourceType, quantity }]
        }
      };
    }
    
    return {
      success: false,
      message: `Failed to remove ${resourceType} from inventory`
    };
  }
  
  /**
   * Buy and refuel ship with fuel
   */
  buyFuel(fuelAmount: number): TransactionResult {
    console.log(`[ECONOMY-SERVICE] Starting buyFuel: ${fuelAmount} units`);
    
    const credits = useCreditsStore.getState();
    const equipment = useEquipment.getState();
    const audio = useAudio.getState();
    
    // Find fuel tank
    const fuelTank = equipment.equipment.find(e => e.id === 'fuel-tank');
    if (!fuelTank) {
      return {
        success: false,
        message: 'Fuel tank not found'
      };
    }
    
    // Calculate fuel cost (assuming 10 credits per unit)
    const fuelCostPerUnit = 10;
    const totalCost = fuelAmount * fuelCostPerUnit;
    
    // Check credits
    if (credits.credits < totalCost) {
      return {
        success: false,
        message: `Insufficient credits! Need ${totalCost}, have ${credits.credits}`
      };
    }
    
    // Perform refueling transaction
    const refuelResult = equipment.replenishFuel(fuelAmount, credits.credits);
    if (refuelResult.success) {
      const actualCost = refuelResult.cost;
      credits.spendCredits(actualCost);
      audio.playSuccess();
      
      // Emit event
      economyEvents.emit({
        type: 'credits_spent',
        payload: { amount: actualCost },
        timestamp: Date.now()
      });
      
      console.log(`[ECONOMY-SERVICE] Refueled ${fuelAmount} units for ${actualCost} credits`);
      return {
        success: true,
        message: `Refueled ${fuelAmount} units for ${actualCost} credits`,
        details: {
          creditsSpent: actualCost,
          fuelAdded: fuelAmount
        }
      };
    }
    
    return {
      success: false,
      message: 'Failed to refuel - operation unsuccessful'
    };
  }
  
  /**
   * Repair equipment using credits
   */
  repairEquipment(equipmentId: string, repairAmount?: number): TransactionResult {
    console.log(`[ECONOMY-SERVICE] Starting repairEquipment: ${equipmentId} ${repairAmount ? `(${repairAmount} durability)` : '(full repair)'}`);
    
    const credits = useCreditsStore.getState();
    const equipment = useEquipment.getState();
    const audio = useAudio.getState();
    
    // Get equipment item
    const equipmentItem = equipment.getEquipment(equipmentId);
    if (!equipmentItem) {
      return {
        success: false,
        message: `Equipment ${equipmentId} not found`
      };
    }
    
    // Perform repair transaction
    const repairResult = equipment.repairEquipment(equipmentId, repairAmount, credits.credits);
    if (repairResult.success) {
      const actualCost = repairResult.cost;
      credits.spendCredits(actualCost);
      audio.playSuccess();
      
      // Emit event
      economyEvents.emit({
        type: 'credits_spent',
        payload: { amount: actualCost },
        timestamp: Date.now()
      });
      
      console.log(`[ECONOMY-SERVICE] Repaired ${equipmentItem.name} for ${actualCost} credits`);
      return {
        success: true,
        message: `Repaired ${equipmentItem.name} for ${actualCost} credits`,
        details: {
          creditsSpent: actualCost,
          durabilityRestored: [{ equipmentId, amount: repairAmount || (equipmentItem.maxDurability - equipmentItem.currentDurability) }]
        }
      };
    }
    
    return {
      success: false,
      message: `Failed to repair ${equipmentItem.name}. Need ${repairResult.cost} credits, have ${credits.credits}`
    };
  }
  
  /**
   * Process mining yield - add resources and award credits
   */
  applyMiningYield(resource: ResourceData, quantity: number, planetSource: string): TransactionResult {
    console.log(`[ECONOMY-SERVICE] Starting applyMiningYield: ${resource.type} x${quantity} from ${planetSource}`);
    
    const inventory = useInventoryStore.getState();
    const credits = useCreditsStore.getState();
    const equipment = useEquipment.getState();
    const audio = useAudio.getState();
    
    // Check storage capacity
    const storageUsed = inventory.getStorageUsed();
    if (storageUsed + quantity > inventory.storageCapacity) {
      return {
        success: false,
        message: `Inventory full! Need ${quantity} space, have ${inventory.storageCapacity - storageUsed} available`
      };
    }
    
    // Add resource to inventory
    const addSuccess = inventory.addResource(resource, quantity, planetSource);
    if (addSuccess) {
      // Award mining credits (10% of resource value)
      const creditReward = Math.floor(resource.value * quantity * 0.1);
      credits.earnCredits(creditReward);
      
      // Apply equipment wear for mining operation
      const stressFactors = equipment.calculateStressFactor(resource, planetSource);
      equipment.applyWear('drill-mk1', stressFactors, 1.0);
      equipment.applyWear('extractor-basic', stressFactors, 1.0);
      equipment.applyShipDegradation('mining', stressFactors.operationIntensity, 1.0);
      
      audio.playSuccess();
      
      // Emit events
      economyEvents.emit({
        type: 'resource_added',
        payload: { resource, quantity, planetSource },
        timestamp: Date.now()
      });
      
      economyEvents.emit({
        type: 'credits_earned',
        payload: { amount: creditReward },
        timestamp: Date.now()
      });
      
      console.log(`[ECONOMY-SERVICE] Mining yield: ${quantity} ${resource.type} + ${creditReward} credits`);
      return {
        success: true,
        message: `Mined ${quantity} ${resource.type} and earned ${creditReward} credits`,
        details: {
          resourcesAdded: [{ type: resource.type, quantity }],
          creditsEarned: creditReward
        }
      };
    }
    
    return {
      success: false,
      message: 'Failed to add mined resources to inventory'
    };
  }
  
  /**
   * Upgrade storage capacity
   */
  upgradeStorage(additionalCapacity: number): TransactionResult {
    console.log(`[ECONOMY-SERVICE] Starting upgradeStorage: +${additionalCapacity} capacity`);
    
    const credits = useCreditsStore.getState();
    const inventory = useInventoryStore.getState();
    const audio = useAudio.getState();
    
    // Calculate upgrade cost (300 base + 200 per 100 current capacity)
    const baseCost = 300;
    const scalingCost = Math.floor(inventory.storageCapacity / 100) * 200;
    const totalCost = baseCost + scalingCost;
    
    // Check credits
    if (credits.credits < totalCost) {
      return {
        success: false,
        message: `Insufficient credits! Need ${totalCost}, have ${credits.credits}`
      };
    }
    
    // Perform upgrade transaction
    const spendSuccess = credits.spendCredits(totalCost);
    if (spendSuccess) {
      inventory.upgradeStorage(additionalCapacity);
      audio.playSuccess();
      
      // Emit event
      economyEvents.emit({
        type: 'credits_spent',
        payload: { amount: totalCost },
        timestamp: Date.now()
      });
      
      console.log(`[ECONOMY-SERVICE] Storage upgraded by ${additionalCapacity} for ${totalCost} credits`);
      return {
        success: true,
        message: `Storage upgraded by ${additionalCapacity} units for ${totalCost} credits`,
        details: {
          creditsSpent: totalCost,
          storageAdded: additionalCapacity
        }
      };
    }
    
    return {
      success: false,
      message: 'Failed to spend credits for storage upgrade'
    };
  }
  
  /**
   * Buy a resource from a trading station
   */
  buyResource(resource: ResourceData, quantity: number, pricePerUnit: number, planetSource: string): TransactionResult {
    console.log(`[ECONOMY-SERVICE] Starting buyResource: ${resource.type} x${quantity} @ ${pricePerUnit} each`);
    
    const credits = useCreditsStore.getState();
    const inventory = useInventoryStore.getState();
    const audio = useAudio.getState();
    
    const totalCost = quantity * pricePerUnit;
    
    // Check credits
    if (credits.credits < totalCost) {
      return {
        success: false,
        message: `Insufficient credits! Need ${totalCost}, have ${credits.credits}`
      };
    }
    
    // Check storage
    const storageUsed = inventory.getStorageUsed();
    if (storageUsed + quantity > inventory.storageCapacity) {
      return {
        success: false,
        message: `Inventory full! Need ${quantity} space, have ${inventory.storageCapacity - storageUsed} available`
      };
    }
    
    // Perform atomic transaction
    const spendSuccess = credits.spendCredits(totalCost);
    if (spendSuccess) {
      const addSuccess = inventory.addResource(resource, quantity, planetSource);
      if (addSuccess) {
        audio.playSuccess();
        
        // Emit events
        economyEvents.emit({
          type: 'credits_spent',
          payload: { amount: totalCost },
          timestamp: Date.now()
        });
        
        economyEvents.emit({
          type: 'resource_added',
          payload: { resource, quantity, planetSource },
          timestamp: Date.now()
        });
        
        console.log(`[ECONOMY-SERVICE] Bought ${quantity} ${resource.type} for ${totalCost} credits`);
        return {
          success: true,
          message: `Bought ${quantity} ${resource.type} for ${totalCost} credits`,
          details: {
            creditsSpent: totalCost,
            resourcesAdded: [{ type: resource.type, quantity }]
          }
        };
      } else {
        // Rollback - refund credits
        credits.earnCredits(totalCost);
        return {
          success: false,
          message: 'Failed to add purchased resources to inventory'
        };
      }
    }
    
    return {
      success: false,
      message: 'Failed to spend credits for purchase'
    };
  }
  
  // Utility methods
  getNetWorth(): number {
    const credits = useCreditsStore.getState();
    const inventory = useInventoryStore.getState();
    
    const inventoryValue = inventory.items.reduce(
      (total, item) => total + (item.value * item.quantity), 
      0
    );
    
    return credits.credits + inventoryValue;
  }
  
  getEconomyStatus() {
    const credits = useCreditsStore.getState();
    const inventory = useInventoryStore.getState();
    
    return {
      credits: credits.credits,
      inventoryValue: inventory.getTotalValue(),
      netWorth: this.getNetWorth(),
      storageUsed: inventory.getStorageUsed(),
      storageCapacity: inventory.storageCapacity,
      storagePercentage: (inventory.getStorageUsed() / inventory.storageCapacity) * 100
    };
  }
}

export const economyService = new EconomyService();