import { useCreditsStore } from './credits.store';
import { useInventoryStore } from './inventory.store';
import { useEquipment } from '../../lib/stores/useEquipment';
import { useMining } from '../../lib/stores/useMining';
import { useAudio } from '../../lib/stores/useAudio';
import { useCrypto } from '../../lib/stores/useCrypto';
import { ResourceData } from '../../lib/planetData';
import { economyEvents } from './events';
import {
  createTransactionContext,
  completeTransactionContext,
  createStateSnapshot,
  validateEconomyState,
  logStateDiff,
  checkpoint,
  assert,
  DEBUG_PREFIXES
} from './debug';

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
    // Create transaction context for debugging
    const txContext = createTransactionContext('sellResource', { resourceType, quantity });
    checkpoint(`Starting sellResource: ${resourceType} x${quantity}`, { transactionId: txContext.id });
    
    const inventory = useInventoryStore.getState();
    const credits = useCreditsStore.getState();
    const audio = useAudio.getState();
    
    // Capture initial state for debugging
    const initialState = createStateSnapshot(credits.credits, inventory.items, inventory.storageCapacity);
    checkpoint('Initial state captured', { credits: credits.credits, storageUsed: initialState.storageUsed });
    
    // Validate initial state consistency
    validateEconomyState(credits.credits, inventory.items, inventory.storageCapacity, 'sellResource-start');
    
    // Find the resource item
    const item = inventory.items.find(item => item.type === resourceType);
    if (!item) {
      const result: TransactionResult = {
        success: false,
        message: `Resource ${resourceType} not found in inventory`
      };
      
      console.log(`${DEBUG_PREFIXES.TRANSACTION} sellResource failed - resource not found:`, {
        resourceType,
        availableResources: inventory.items.map(i => i.type),
        transactionId: txContext.id
      });
      
      completeTransactionContext(txContext, false, result);
      return result;
    }
    
    // Check quantity
    if (item.quantity < quantity) {
      const result: TransactionResult = {
        success: false,
        message: `Insufficient ${resourceType}! Have ${item.quantity}, need ${quantity}`
      };
      
      console.log(`${DEBUG_PREFIXES.TRANSACTION} sellResource failed - insufficient quantity:`, {
        resourceType,
        available: item.quantity,
        requested: quantity,
        transactionId: txContext.id
      });
      
      completeTransactionContext(txContext, false, result);
      return result;
    }
    
    // Calculate total value
    const totalValue = item.value * quantity;
    checkpoint('Transaction calculations', { 
      totalValue, 
      itemValue: item.value, 
      quantity,
      transactionId: txContext.id
    });
    
    // Perform atomic transaction with detailed logging
    console.log(`${DEBUG_PREFIXES.TRANSACTION} Executing atomic sellResource transaction:`, {
      resourceType,
      quantity,
      totalValue,
      creditsBefore: credits.credits,
      storageUsedBefore: initialState.storageUsed,
      transactionId: txContext.id
    });
    
    const removeSuccess = inventory.removeResource(resourceType, quantity);
    if (removeSuccess) {
      // Log successful resource removal
      checkpoint('Resource removal successful', { resourceType, quantity, transactionId: txContext.id });
      
      credits.earnCredits(totalValue);
      checkpoint('Credits earned', { totalValue, newCredits: credits.credits, transactionId: txContext.id });
      
      audio.playSuccess();
      
      // Emit event
      economyEvents.emit({
        type: 'credits_earned',
        payload: { amount: totalValue },
        timestamp: Date.now()
      });
      checkpoint('Event emitted', { type: 'credits_earned', amount: totalValue, transactionId: txContext.id });
      
      // Capture final state and log diff
      const finalState = createStateSnapshot(credits.credits, inventory.items, inventory.storageCapacity);
      logStateDiff(initialState, finalState, `sellResource-${resourceType}`);
      
      // Validate final state consistency
      validateEconomyState(credits.credits, inventory.items, inventory.storageCapacity, 'sellResource-end');
      
      // Assert expected changes
      assert(
        finalState.credits === initialState.credits + totalValue,
        `Credits change assertion failed in sellResource: expected ${initialState.credits + totalValue}, got ${finalState.credits}`,
        { initialState, finalState, totalValue, transactionId: txContext.id }
      );
      
      assert(
        finalState.storageUsed === initialState.storageUsed - quantity,
        `Storage change assertion failed in sellResource: expected ${initialState.storageUsed - quantity}, got ${finalState.storageUsed}`,
        { initialState, finalState, quantity, transactionId: txContext.id }
      );
      
      const result: TransactionResult = {
        success: true,
        message: `Sold ${quantity} ${resourceType} for ${totalValue} credits`,
        details: {
          creditsEarned: totalValue,
          resourcesRemoved: [{ type: resourceType, quantity }]
        }
      };
      
      console.log(`${DEBUG_PREFIXES.TRANSACTION} sellResource completed successfully:`, {
        resourceType,
        quantity,
        totalValue,
        creditsAfter: finalState.credits,
        storageUsedAfter: finalState.storageUsed,
        transactionId: txContext.id
      });
      
      completeTransactionContext(txContext, true, result);
      return result;
    }
    
    // Transaction failed - log failure details
    const result: TransactionResult = {
      success: false,
      message: `Failed to remove ${resourceType} from inventory`
    };
    
    console.error(`${DEBUG_PREFIXES.TRANSACTION} sellResource failed - atomic transaction failure:`, {
      resourceType,
      quantity,
      removeSuccess,
      inventoryState: inventory.items,
      transactionId: txContext.id
    });
    
    // Validate state hasn't changed after failure
    const failureState = createStateSnapshot(credits.credits, inventory.items, inventory.storageCapacity);
    assert(
      failureState.checksum === initialState.checksum,
      `State changed after failed sellResource transaction`,
      { initialState, failureState, transactionId: txContext.id }
    );
    
    completeTransactionContext(txContext, false, result);
    return result;
  }
  
  /**
   * Buy and refuel ship with fuel
   */
  buyFuel(fuelAmount: number): TransactionResult {
    // Create transaction context for debugging
    const txContext = createTransactionContext('buyFuel', { fuelAmount });
    checkpoint(`Starting buyFuel: ${fuelAmount} units`, { transactionId: txContext.id });
    
    const credits = useCreditsStore.getState();
    const equipment = useEquipment.getState();
    const audio = useAudio.getState();
    const inventory = useInventoryStore.getState();
    
    // Capture initial state for debugging
    const initialState = createStateSnapshot(credits.credits, inventory.items, inventory.storageCapacity);
    checkpoint('Initial state captured', { credits: credits.credits, transactionId: txContext.id });
    
    // Validate initial state consistency
    validateEconomyState(credits.credits, inventory.items, inventory.storageCapacity, 'buyFuel-start');
    
    // Find fuel tank
    const fuelTank = equipment.equipment.find(e => e.id === 'fuel-tank');
    if (!fuelTank) {
      const result: TransactionResult = {
        success: false,
        message: 'Fuel tank not found'
      };
      
      console.log(`${DEBUG_PREFIXES.TRANSACTION} buyFuel failed - fuel tank not found:`, {
        equipmentList: equipment.equipment.map(e => e.id),
        transactionId: txContext.id
      });
      
      completeTransactionContext(txContext, false, result);
      return result;
    }
    
    // Calculate actual fuel cost using equipment's replenishmentCost
    const maxRefill = fuelTank.maxDurability - fuelTank.currentDurability;
    const actualRefill = Math.min(fuelAmount, maxRefill);
    const fuelCostPerUnit = fuelTank.replenishmentCost || 2;
    const actualCost = Math.ceil(actualRefill * fuelCostPerUnit);
    
    checkpoint('Fuel calculations', {
      maxRefill,
      actualRefill,
      fuelCostPerUnit,
      actualCost,
      fuelTankState: {
        currentDurability: fuelTank.currentDurability,
        maxDurability: fuelTank.maxDurability
      },
      transactionId: txContext.id
    });
    
    // Check credits first
    if (credits.credits < actualCost) {
      const result: TransactionResult = {
        success: false,
        message: `Insufficient credits! Need ${actualCost}, have ${credits.credits}`
      };
      
      console.log(`${DEBUG_PREFIXES.TRANSACTION} buyFuel failed - insufficient credits:`, {
        required: actualCost,
        available: credits.credits,
        deficit: actualCost - credits.credits,
        transactionId: txContext.id
      });
      
      completeTransactionContext(txContext, false, result);
      return result;
    }
    
    // Check if refuel is needed
    if (actualRefill <= 0) {
      const result: TransactionResult = {
        success: false,
        message: 'Fuel tank is already full'
      };
      
      console.log(`${DEBUG_PREFIXES.TRANSACTION} buyFuel failed - tank already full:`, {
        fuelTankState: {
          currentDurability: fuelTank.currentDurability,
          maxDurability: fuelTank.maxDurability,
          percentFull: (fuelTank.currentDurability / fuelTank.maxDurability) * 100
        },
        transactionId: txContext.id
      });
      
      completeTransactionContext(txContext, false, result);
      return result;
    }
    
    // ATOMIC TRANSACTION: Spend credits first, then apply fuel only if successful
    console.log(`${DEBUG_PREFIXES.TRANSACTION} Executing atomic buyFuel transaction:`, {
      actualCost,
      actualRefill,
      creditsBefore: credits.credits,
      fuelBefore: fuelTank.currentDurability,
      transactionId: txContext.id
    });
    
    const spendSuccess = credits.spendCredits(actualCost);
    if (spendSuccess) {
      checkpoint('Credits spent successfully', { actualCost, newCredits: credits.credits, transactionId: txContext.id });
      
      // Apply fuel after successful credit spending
      const refuelResult = equipment.replenishFuel(actualRefill, actualCost + 1); // Pass sufficient credits
      if (refuelResult.success) {
        checkpoint('Fuel replenishment successful', { actualRefill, transactionId: txContext.id });
        
        audio.playSuccess();
        
        // Emit event
        economyEvents.emit({
          type: 'credits_spent',
          payload: { amount: actualCost },
          timestamp: Date.now()
        });
        checkpoint('Event emitted', { type: 'credits_spent', amount: actualCost, transactionId: txContext.id });
        
        // Capture final state and log diff
        const finalState = createStateSnapshot(credits.credits, inventory.items, inventory.storageCapacity);
        logStateDiff(initialState, finalState, 'buyFuel');
        
        // Validate final state consistency
        validateEconomyState(credits.credits, inventory.items, inventory.storageCapacity, 'buyFuel-end');
        
        // Assert expected changes
        assert(
          finalState.credits === initialState.credits - actualCost,
          `Credits change assertion failed in buyFuel: expected ${initialState.credits - actualCost}, got ${finalState.credits}`,
          { initialState, finalState, actualCost, transactionId: txContext.id }
        );
        
        const result: TransactionResult = {
          success: true,
          message: `Refueled ${actualRefill} units for ${actualCost} credits`,
          details: {
            creditsSpent: actualCost,
            fuelAdded: actualRefill
          }
        };
        
        console.log(`${DEBUG_PREFIXES.TRANSACTION} buyFuel completed successfully:`, {
          actualRefill,
          actualCost,
          creditsAfter: finalState.credits,
          transactionId: txContext.id
        });
        
        completeTransactionContext(txContext, true, result);
        return result;
      } else {
        // Rollback - refund credits if fuel application failed
        console.error(`${DEBUG_PREFIXES.TRANSACTION} buyFuel fuel application failed - rolling back:`, {
          refuelResult,
          creditsToRefund: actualCost,
          transactionId: txContext.id
        });
        
        credits.earnCredits(actualCost);
        checkpoint('Credits refunded after fuel failure', { actualCost, transactionId: txContext.id });
        
        // Validate rollback state matches initial state
        const rollbackState = createStateSnapshot(credits.credits, inventory.items, inventory.storageCapacity);
        assert(
          rollbackState.credits === initialState.credits,
          `Rollback credits assertion failed in buyFuel: expected ${initialState.credits}, got ${rollbackState.credits}`,
          { initialState, rollbackState, transactionId: txContext.id }
        );
        
        const result: TransactionResult = {
          success: false,
          message: 'Failed to apply fuel after payment - credits refunded'
        };
        
        completeTransactionContext(txContext, false, result);
        return result;
      }
    }
    
    // Credit spending failed
    const result: TransactionResult = {
      success: false,
      message: 'Failed to spend credits for fuel purchase'
    };
    
    console.error(`${DEBUG_PREFIXES.TRANSACTION} buyFuel failed - credit spending failure:`, {
      actualCost,
      availableCredits: credits.credits,
      spendSuccess,
      transactionId: txContext.id
    });
    
    // Validate state hasn't changed after failure
    const failureState = createStateSnapshot(credits.credits, inventory.items, inventory.storageCapacity);
    assert(
      failureState.checksum === initialState.checksum,
      `State changed after failed buyFuel transaction`,
      { initialState, failureState, transactionId: txContext.id }
    );
    
    completeTransactionContext(txContext, false, result);
    return result;
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
  async applyMiningYield(resource: ResourceData, quantity: number, planetSource: string): Promise<TransactionResult> {
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
      
      // Award cryptocurrency mining rewards (if crypto system is initialized)
      const crypto = useCrypto.getState();
      if (crypto.isInitialized) {
        try {
          const cryptoReward = Math.floor((resource.value * quantity * 0.001) * 1000000) / 1000000;
          const MINIMUM_CRYPTO_PAYOUT = 0.01;
          
          if (cryptoReward >= MINIMUM_CRYPTO_PAYOUT) {
            console.log(`[ECONOMY-SERVICE] Issuing crypto mining reward: ${cryptoReward} SPACE for ${quantity}x ${resource.type}`);
            await crypto.issueMiningReward(cryptoReward, resource.type, planetSource);
          } else {
            console.log(`[ECONOMY-SERVICE] Crypto reward ${cryptoReward} below minimum threshold ${MINIMUM_CRYPTO_PAYOUT}, skipping`);
          }
        } catch (error) {
          console.error('[ECONOMY-SERVICE] Error during crypto reward issuance:', error);
        }
      }
      
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