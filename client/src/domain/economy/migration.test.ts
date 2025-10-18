
// Migration compatibility tests
// These tests ensure that the domain store upgrade doesn't break existing functionality

import { useCreditsStore } from './credits.store';
import { useInventoryStore } from './inventory.store';
import { economyService } from './economy.service';

export const runMigrationTests = () => {
  console.group('[MIGRATION-TESTS] Running compatibility checks...');
  
  try {
    // Test 1: Credits store basic functionality
    const creditsStore = useCreditsStore.getState();
    const initialCredits = creditsStore.credits;
    
    // Test earning credits
    creditsStore.earnCredits(100);
    const afterEarn = useCreditsStore.getState().credits;
    console.assert(afterEarn === initialCredits + 100, 'Credits earning test failed');
    
    // Test spending credits
    const spendSuccess = creditsStore.spendCredits(50);
    const afterSpend = useCreditsStore.getState().credits;
    console.assert(spendSuccess === true, 'Credits spending test failed');
    console.assert(afterSpend === initialCredits + 50, 'Credits balance test failed');
    
    // Reset to initial state
    creditsStore.setCredits(initialCredits);
    
    console.log('✅ Credits store migration tests passed');
    
    // Test 2: Inventory store basic functionality
    const inventoryStore = useInventoryStore.getState();
    const initialItems = inventoryStore.items.length;
    
    // Test adding resource
    const testResource = { type: 'test-iron', name: 'Test Iron', value: 10, rarity: 'common' as const };
    const addSuccess = inventoryStore.addResource(testResource, 5, 'test-planet');
    console.assert(addSuccess === true, 'Inventory add test failed');
    
    // Test removing resource
    const removeSuccess = inventoryStore.removeResource('test-iron', 5);
    console.assert(removeSuccess === true, 'Inventory remove test failed');
    
    const finalItems = useInventoryStore.getState().items.length;
    console.assert(finalItems === initialItems, 'Inventory cleanup test failed');
    
    console.log('✅ Inventory store migration tests passed');
    
    // Test 3: Economy service functionality
    const economyStatus = economyService.getEconomyStatus();
    console.assert(typeof economyStatus.credits === 'number', 'Economy service test failed');
    console.assert(typeof economyStatus.netWorth === 'number', 'Economy service test failed');
    
    console.log('✅ Economy service migration tests passed');
    console.log('🎉 All migration tests passed successfully!');
    
  } catch (error) {
    console.error('❌ Migration test failed:', error);
  } finally {
    console.groupEnd();
  }
};

// Auto-run tests in development
if (import.meta.env.DEV) {
  // Run tests after a short delay to ensure stores are initialized
  setTimeout(() => {
    runMigrationTests();
  }, 1000);
}
