import { useCreditsStore } from './credits.store';
import { useInventoryStore } from './inventory.store';
import { useEquipment } from '../../lib/stores/useEquipment';
import { useMining } from '../../lib/stores/useMining';
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
    
    // Calculate actual fuel cost using equipment's replenishmentCost
    const maxRefill = fuelTank.maxDurability - fuelTank.currentDurability;
    const actualRefill = Math.min(fuelAmount, maxRefill);
    const fuelCostPerUnit = fuelTank.replenishmentCost || 2;
    const actualCost = Math.ceil(actualRefill * fuelCostPerUnit);
    
    // Check credits first
    if (credits.credits < actualCost) {
      return {
        success: false,
        message: `Insufficient credits! Need ${actualCost}, have ${credits.credits}`
      };
    }
    
    // Check if refuel is needed
    if (actualRefill <= 0) {
      return {
        success: false,
        message: 'Fuel tank is already full'
      };
    }
    
    // ATOMIC TRANSACTION: Spend credits first, then apply fuel only if successful
    const spendSuccess = credits.spendCredits(actualCost);
    if (spendSuccess) {
      // Apply fuel after successful credit spending
      const refuelResult = equipment.replenishFuel(actualRefill, actualCost + 1); // Pass sufficient credits
      if (refuelResult.success) {
        audio.playSuccess();
        
        // Emit event
        economyEvents.emit({
          type: 'credits_spent',
          payload: { amount: actualCost },
          timestamp: Date.now()
        });
        
        console.log(`[ECONOMY-SERVICE] Refueled ${actualRefill} units for ${actualCost} credits`);
        return {
          success: true,
          message: `Refueled ${actualRefill} units for ${actualCost} credits`,
          details: {
            creditsSpent: actualCost,
            fuelAdded: actualRefill
          }
        };
      } else {
        // Rollback - refund credits if fuel application failed
        credits.earnCredits(actualCost);
        return {
          success: false,
          message: 'Failed to apply fuel after payment - credits refunded'
        };
      }
    }
    
    return {
      success: false,
      message: 'Failed to spend credits for fuel purchase'
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
    
    // Calculate repair cost first without applying the repair
    const damageAmount = equipmentItem.maxDurability - equipmentItem.currentDurability;
    const actualRepairAmount = repairAmount ? Math.min(repairAmount, damageAmount) : damageAmount;
    const repairCost = Math.round(equipmentItem.repairCost * (actualRepairAmount / equipmentItem.maxDurability));
    
    // Check if repair is needed
    if (actualRepairAmount <= 0) {
      return {
        success: false,
        message: `${equipmentItem.name} does not need repair`
      };
    }
    
    // Check credits first
    if (credits.credits < repairCost) {
      return {
        success: false,
        message: `Insufficient credits! Need ${repairCost}, have ${credits.credits}`
      };
    }
    
    // ATOMIC TRANSACTION: Spend credits first, then apply repair only if successful
    const spendSuccess = credits.spendCredits(repairCost);
    if (spendSuccess) {
      // Apply repair after successful credit spending
      const repairResult = equipment.repairEquipment(equipmentId, repairAmount, repairCost + 1); // Pass sufficient credits
      if (repairResult.success) {
        audio.playSuccess();
        
        // Emit event
        economyEvents.emit({
          type: 'credits_spent',
          payload: { amount: repairCost },
          timestamp: Date.now()
        });
        
        console.log(`[ECONOMY-SERVICE] Repaired ${equipmentItem.name} for ${repairCost} credits`);
        return {
          success: true,
          message: `Repaired ${equipmentItem.name} for ${repairCost} credits`,
          details: {
            creditsSpent: repairCost,
            durabilityRestored: [{ equipmentId, amount: actualRepairAmount }]
          }
        };
      } else {
        // Rollback - refund credits if repair application failed
        credits.earnCredits(repairCost);
        return {
          success: false,
          message: `Failed to apply repair to ${equipmentItem.name} after payment - credits refunded`
        };
      }
    }
    
    return {
      success: false,
      message: `Failed to spend credits for ${equipmentItem.name} repair`
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
  
  /**
   * Upgrade mining drill for increased mining power
   */
  upgradeDrill(): TransactionResult {
    console.log(`[ECONOMY-SERVICE] Starting upgradeDrill`);
    
    const credits = useCreditsStore.getState();
    const mining = useMining.getState();
    const audio = useAudio.getState();
    
    // Calculate upgrade cost based on current drill power
    const upgradeCost = 200 + (mining.drillPower - 1) * 150;
    
    // Check credits
    if (credits.credits < upgradeCost) {
      audio.playHit();
      return {
        success: false,
        message: `Insufficient credits! Need ${upgradeCost}, have ${credits.credits}`
      };
    }
    
    // Perform atomic transaction
    const spendSuccess = credits.spendCredits(upgradeCost);
    if (spendSuccess) {
      mining.upgradeDrill();
      audio.playSuccess();
      
      // Emit event
      economyEvents.emit({
        type: 'credits_spent',
        payload: { amount: upgradeCost },
        timestamp: Date.now()
      });
      
      console.log(`[ECONOMY-SERVICE] Upgraded drill for ${upgradeCost} credits. New power: ${mining.drillPower}`);
      return {
        success: true,
        message: `Upgraded mining drill for ${upgradeCost} credits`,
        details: {
          creditsSpent: upgradeCost
        }
      };
    }
    
    return {
      success: false,
      message: 'Failed to spend credits for drill upgrade'
    };
  }
  
  /**
   * Upgrade resource extractor for increased mining efficiency
   */
  upgradeExtractor(): TransactionResult {
    console.log(`[ECONOMY-SERVICE] Starting upgradeExtractor`);
    
    const credits = useCreditsStore.getState();
    const mining = useMining.getState();
    const audio = useAudio.getState();
    
    // Calculate upgrade cost based on current extractor level
    const upgradeCost = 150 + (mining.extractorLevel - 1) * 100;
    
    // Check credits
    if (credits.credits < upgradeCost) {
      audio.playHit();
      return {
        success: false,
        message: `Insufficient credits! Need ${upgradeCost}, have ${credits.credits}`
      };
    }
    
    // Perform atomic transaction
    const spendSuccess = credits.spendCredits(upgradeCost);
    if (spendSuccess) {
      mining.upgradeExtractor();
      audio.playSuccess();
      
      // Emit event
      economyEvents.emit({
        type: 'credits_spent',
        payload: { amount: upgradeCost },
        timestamp: Date.now()
      });
      
      console.log(`[ECONOMY-SERVICE] Upgraded extractor for ${upgradeCost} credits. New level: ${mining.extractorLevel}`);
      return {
        success: true,
        message: `Upgraded resource extractor for ${upgradeCost} credits`,
        details: {
          creditsSpent: upgradeCost
        }
      };
    }
    
    return {
      success: false,
      message: 'Failed to spend credits for extractor upgrade'
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