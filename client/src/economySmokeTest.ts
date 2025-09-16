/**
 * Comprehensive Economy Synchronization Smoke Test
 * 
 * This test validates the complete economy workflow:
 * Mining → Sell Resources → Buy Fuel → Repair Equipment → Final Validation
 * 
 * Tests transaction atomicity, state synchronization, and event consistency
 */

import { economyService } from './domain/economy/economy.service';
import { useCreditsStore } from './domain/economy/credits.store';
import { useInventoryStore } from './domain/economy/inventory.store';
import { useEquipment } from './lib/stores/useEquipment';
import { planets } from './lib/planetData';
import { 
  createStateSnapshot, 
  validateEconomyState, 
  resetDebugState,
  getDebugStats,
  setDebugConfig 
} from './domain/economy/debug';

interface TestStep {
  name: string;
  operation: () => Promise<any> | any;
  validate: (result: any, beforeState: any, afterState: any) => void;
}

interface TestResults {
  stepResults: Array<{
    stepName: string;
    success: boolean;
    result: any;
    beforeState: any;
    afterState: any;
    error?: Error;
  }>;
  overallSuccess: boolean;
  summary: string;
}

class EconomySmokeTest {
  private testResults: TestResults = {
    stepResults: [],
    overallSuccess: false,
    summary: ''
  };

  private logGroup(title: string, fn: () => void) {
    console.group(`🧪 ${title}`);
    fn();
    console.groupEnd();
  }

  private logState(title: string, state: any) {
    console.group(`📊 ${title}`);
    console.log('Credits:', state.credits);
    console.log('Storage Used:', state.storageUsed, '/', state.storageCapacity);
    console.log('Inventory Value:', state.totalInventoryValue);
    console.log('Items:', state.inventoryItems.map(item => `${item.type}: ${item.quantity}`));
    console.groupEnd();
  }

  private async executeStep(step: TestStep): Promise<void> {
    this.logGroup(`Step: ${step.name}`, () => {
      console.log('🔄 Executing...');
    });

    // Capture before state
    const credits = useCreditsStore.getState();
    const inventory = useInventoryStore.getState();
    const beforeState = createStateSnapshot(credits.credits, inventory.items, inventory.storageCapacity);

    this.logState('Before State', beforeState);

    let result: any;
    let error: Error | undefined;

    try {
      // Execute the operation
      result = await step.operation();
      
      // Capture after state
      const afterCredits = useCreditsStore.getState();
      const afterInventory = useInventoryStore.getState();
      const afterState = createStateSnapshot(afterCredits.credits, afterInventory.items, afterInventory.storageCapacity);

      this.logState('After State', afterState);
      
      console.log('🎯 Operation Result:', result);

      // Validate the step
      step.validate(result, beforeState, afterState);

      // Validate overall economy state consistency
      validateEconomyState(afterCredits.credits, afterInventory.items, afterInventory.storageCapacity, `${step.name}-validation`);

      this.testResults.stepResults.push({
        stepName: step.name,
        success: true,
        result,
        beforeState,
        afterState
      });

      console.log('✅ Step completed successfully');

    } catch (e) {
      error = e as Error;
      console.error('❌ Step failed:', error.message);
      
      this.testResults.stepResults.push({
        stepName: step.name,
        success: false,
        result,
        beforeState,
        afterState: beforeState, // Use before state as after state on failure
        error
      });

      throw error; // Re-throw to stop test execution
    }
  }

  private setupInitialState() {
    this.logGroup('Setup Initial State', () => {
      // Reset all stores to known state
      useCreditsStore.getState().setCredits(1000);
      
      // Clear inventory
      const inventory = useInventoryStore.getState();
      inventory.items.forEach(item => {
        inventory.removeResource(item.type, item.quantity);
      });

      // Initialize equipment to full durability
      const equipment = useEquipment.getState();
      equipment.initializeEquipment();

      // Set fuel tank to 50% so we can test refueling
      const fuelTank = equipment.equipment.find(e => e.id === 'fuel-tank');
      if (fuelTank) {
        fuelTank.currentDurability = 50;
      }

      // Damage drill slightly so we can test repairs
      const drill = equipment.equipment.find(e => e.id === 'drill-mk1');
      if (drill) {
        drill.currentDurability = 80;
      }

      console.log('🏁 Initial state configured');
      
      const credits = useCreditsStore.getState();
      const inventoryState = useInventoryStore.getState();
      const initialState = createStateSnapshot(credits.credits, inventoryState.items, inventoryState.storageCapacity);
      this.logState('Initial State', initialState);
    });
  }

  private getTestSteps(): TestStep[] {
    return [
      {
        name: 'Mining Operation - Extract Iron Ore',
        operation: () => {
          // Use Mercury's Iron Ore resource
          const mercury = planets.find(p => p.name === 'Mercury');
          const ironOre = mercury?.resources.find(r => r.type === 'Iron Ore');
          if (!ironOre) throw new Error('Iron Ore resource not found');
          
          return economyService.applyMiningYield(ironOre, 15, 'Mercury');
        },
        validate: (result, beforeState, afterState) => {
          if (!result.success) throw new Error(`Mining failed: ${result.message}`);
          if (afterState.storageUsed !== beforeState.storageUsed + 15) {
            throw new Error(`Storage not updated correctly: expected ${beforeState.storageUsed + 15}, got ${afterState.storageUsed}`);
          }
          console.log('✅ Mining validation passed');
        }
      },

      {
        name: 'Mining Operation - Extract Platinum',
        operation: () => {
          const mercury = planets.find(p => p.name === 'Mercury');
          const platinum = mercury?.resources.find(r => r.type === 'Platinum');
          if (!platinum) throw new Error('Platinum resource not found');
          
          return economyService.applyMiningYield(platinum, 8, 'Mercury');
        },
        validate: (result, beforeState, afterState) => {
          if (!result.success) throw new Error(`Mining failed: ${result.message}`);
          if (afterState.storageUsed !== beforeState.storageUsed + 8) {
            throw new Error(`Storage not updated correctly: expected ${beforeState.storageUsed + 8}, got ${afterState.storageUsed}`);
          }
          // Check that credits increased due to mining bonus
          if (afterState.credits <= beforeState.credits) {
            throw new Error('Credits should have increased from mining bonus');
          }
          console.log('✅ Platinum mining validation passed');
        }
      },

      {
        name: 'Sell Resources - Iron Ore',
        operation: () => {
          return economyService.sellResource('Iron Ore', 10);
        },
        validate: (result, beforeState, afterState) => {
          if (!result.success) throw new Error(`Sell failed: ${result.message}`);
          const expectedCredits = beforeState.credits + (15 * 10); // 15 credits per Iron Ore unit
          if (afterState.credits !== expectedCredits) {
            throw new Error(`Credits not updated correctly: expected ${expectedCredits}, got ${afterState.credits}`);
          }
          if (afterState.storageUsed !== beforeState.storageUsed - 10) {
            throw new Error(`Storage not updated correctly: expected ${beforeState.storageUsed - 10}, got ${afterState.storageUsed}`);
          }
          console.log('✅ Iron Ore sell validation passed');
        }
      },

      {
        name: 'Sell Resources - Platinum',
        operation: () => {
          return economyService.sellResource('Platinum', 5);
        },
        validate: (result, beforeState, afterState) => {
          if (!result.success) throw new Error(`Sell failed: ${result.message}`);
          const expectedCredits = beforeState.credits + (85 * 5); // 85 credits per Platinum unit
          if (afterState.credits !== expectedCredits) {
            throw new Error(`Credits not updated correctly: expected ${expectedCredits}, got ${afterState.credits}`);
          }
          if (afterState.storageUsed !== beforeState.storageUsed - 5) {
            throw new Error(`Storage not updated correctly: expected ${beforeState.storageUsed - 5}, got ${afterState.storageUsed}`);
          }
          console.log('✅ Platinum sell validation passed');
        }
      },

      {
        name: 'Buy Fuel',
        operation: () => {
          return economyService.buyFuel(30);
        },
        validate: (result, beforeState, afterState) => {
          if (!result.success) throw new Error(`Fuel purchase failed: ${result.message}`);
          
          // Calculate expected cost (fuel tank has replenishmentCost of 2 per unit)
          const fuelCostPerUnit = 2;
          const expectedCost = Math.ceil(30 * fuelCostPerUnit);
          const expectedCredits = beforeState.credits - expectedCost;
          
          if (afterState.credits !== expectedCredits) {
            throw new Error(`Credits not updated correctly: expected ${expectedCredits}, got ${afterState.credits}`);
          }
          
          // Check that fuel tank durability increased
          const equipment = useEquipment.getState();
          const fuelTank = equipment.equipment.find(e => e.id === 'fuel-tank');
          if (!fuelTank || fuelTank.currentDurability < 50) {
            throw new Error('Fuel tank durability should have increased');
          }
          
          console.log('✅ Fuel purchase validation passed');
        }
      },

      {
        name: 'Repair Equipment - Drill',
        operation: () => {
          return economyService.repairEquipment('drill-mk1');
        },
        validate: (result, beforeState, afterState) => {
          if (!result.success) throw new Error(`Repair failed: ${result.message}`);
          
          // Credits should have decreased
          if (afterState.credits >= beforeState.credits) {
            throw new Error('Credits should have decreased after repair');
          }
          
          // Check that drill is fully repaired
          const equipment = useEquipment.getState();
          const drill = equipment.equipment.find(e => e.id === 'drill-mk1');
          if (!drill || drill.currentDurability !== drill.maxDurability) {
            throw new Error('Drill should be fully repaired');
          }
          
          console.log('✅ Equipment repair validation passed');
        }
      },

      {
        name: 'Storage Upgrade',
        operation: () => {
          return economyService.upgradeStorage(50);
        },
        validate: (result, beforeState, afterState) => {
          if (!result.success) throw new Error(`Storage upgrade failed: ${result.message}`);
          
          // Storage capacity should have increased
          if (afterState.storageCapacity !== beforeState.storageCapacity + 50) {
            throw new Error(`Storage capacity not updated: expected ${beforeState.storageCapacity + 50}, got ${afterState.storageCapacity}`);
          }
          
          // Credits should have decreased
          if (afterState.credits >= beforeState.credits) {
            throw new Error('Credits should have decreased after storage upgrade');
          }
          
          console.log('✅ Storage upgrade validation passed');
        }
      },

      {
        name: 'Final State Validation',
        operation: () => {
          const credits = useCreditsStore.getState();
          const inventory = useInventoryStore.getState();
          const equipment = useEquipment.getState();
          
          return {
            finalCredits: credits.credits,
            finalStorageUsed: inventory.getStorageUsed(),
            finalStorageCapacity: inventory.storageCapacity,
            finalTotalValue: inventory.getTotalValue(),
            equipmentStatus: equipment.equipment.map(e => ({
              id: e.id,
              condition: equipment.getConditionStatus(e.id),
              durability: `${e.currentDurability}/${e.maxDurability}`
            }))
          };
        },
        validate: (result, beforeState, afterState) => {
          // Validate final state consistency
          const credits = useCreditsStore.getState();
          const inventory = useInventoryStore.getState();
          
          validateEconomyState(credits.credits, inventory.items, inventory.storageCapacity, 'final-validation');
          
          // Log final status
          console.log('🏆 Final Economy Status:');
          console.log('  Credits:', result.finalCredits);
          console.log('  Storage:', `${result.finalStorageUsed}/${result.finalStorageCapacity}`);
          console.log('  Total Inventory Value:', result.finalTotalValue);
          console.log('  Equipment Status:', result.equipmentStatus);
          
          console.log('✅ Final state validation passed');
        }
      }
    ];
  }

  public async runSmokeTest(): Promise<TestResults> {
    console.log('🚀 Starting Economy Synchronization Smoke Test');
    console.log('=====================================');

    try {
      // Enable full debugging
      setDebugConfig({
        enabled: true,
        transactionLogging: true,
        stateAssertions: true,
        eventValidation: true,
        consistencyChecks: true,
        performanceTracking: true
      });

      // Reset debug state
      resetDebugState();

      // Setup initial state
      this.setupInitialState();

      // Execute all test steps
      const steps = this.getTestSteps();
      for (let i = 0; i < steps.length; i++) {
        console.log(`\n📋 Step ${i + 1}/${steps.length}`);
        await this.executeStep(steps[i]);
      }

      // Mark test as successful
      this.testResults.overallSuccess = true;
      this.testResults.summary = `All ${steps.length} test steps completed successfully! Economy synchronization is working perfectly.`;

    } catch (error) {
      this.testResults.overallSuccess = false;
      this.testResults.summary = `Test failed at step: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('💥 Smoke test failed:', error);
    }

    // Log debug statistics
    this.logGroup('Debug Statistics', () => {
      const debugStats = getDebugStats();
      console.log('Debug Stats:', debugStats);
    });

    // Log final summary
    this.logGroup('Test Summary', () => {
      console.log('Overall Success:', this.testResults.overallSuccess ? '✅' : '❌');
      console.log('Summary:', this.testResults.summary);
      console.log('Steps Completed:', this.testResults.stepResults.filter(r => r.success).length);
      console.log('Total Steps:', this.testResults.stepResults.length);
      
      if (!this.testResults.overallSuccess) {
        const failedSteps = this.testResults.stepResults.filter(r => !r.success);
        console.log('Failed Steps:', failedSteps.map(s => s.stepName));
      }
    });

    console.log('\n🏁 Smoke Test Complete');
    console.log('=====================================');

    return this.testResults;
  }
}

// Export test runner
export const runEconomySmokeTest = () => {
  const test = new EconomySmokeTest();
  return test.runSmokeTest();
};

// Global window function for easy browser console access
if (typeof window !== 'undefined') {
  (window as any).runEconomySmokeTest = runEconomySmokeTest;
}

export default EconomySmokeTest;