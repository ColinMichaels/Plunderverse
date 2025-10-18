/**
 * Store Test Suite Registry
 * Central registry for all store test suites
 * Import this file to make all store tests available in the browser console
 */

// Import all store test suites
import './testPlayerStore';
import './testCreditsStore';
import './testCombatStores';
import './testShipStores';
import './testEconomyStores';
import './testMissionStores';
import './testNavigationStores';
import './testUIStores';
import './testFactionStore';
import './testHeatStore';

// Helper function to run all store tests
export class AllStoreTestsSuite {
  async runAllTests() {
    console.clear();
    console.log('%c═══════════════════════════════════════════════', 'color: #a855f7; font-size: 16px');
    console.log('%c   🧪 ALL STORE TESTS SUITE STARTING', 'color: #a855f7; font-size: 18px; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════', 'color: #a855f7; font-size: 16px');
    
    console.log('\n📋 Available Store Tests:');
    console.log('  • testPlayerStore() - Player state management');
    console.log('  • testCreditsStore() - Credits/economy state');
    console.log('  • testCombatStores() - Combat systems');
    console.log('  • testShipStores() - Ship systems');
    console.log('  • testEconomyStores() - Economy/trading');
    console.log('  • testMissionStores() - Mission management');
    console.log('  • testNavigationStores() - Navigation/space');
    console.log('  • testUIStores() - UI state management');
    console.log('  • testFactionStore() - Faction reputation');
    console.log('  • testHeatStore() - Heat/wanted system');
    
    console.log('\n🚀 Starting sequential test execution...\n');
    
    const testResults = [];
    
    // Run each test suite and collect results
    const testSuites = [
      { name: 'Player Store', func: (window as any).testPlayerStore },
      { name: 'Credits Store', func: (window as any).testCreditsStore },
      { name: 'Combat Stores', func: (window as any).testCombatStores },
      { name: 'Ship Stores', func: (window as any).testShipStores },
      { name: 'Economy Stores', func: (window as any).testEconomyStores },
      { name: 'Mission Stores', func: (window as any).testMissionStores },
      { name: 'Navigation Stores', func: (window as any).testNavigationStores },
      { name: 'UI Stores', func: (window as any).testUIStores },
      { name: 'Faction Store', func: (window as any).testFactionStore },
      { name: 'Heat Store', func: (window as any).testHeatStore }
    ];
    
    for (const suite of testSuites) {
      if (suite.func) {
        console.log(`\n▶️ Running ${suite.name} tests...`);
        try {
          await suite.func();
          testResults.push({ name: suite.name, status: 'completed' });
        } catch (error) {
          testResults.push({ name: suite.name, status: 'failed', error });
          console.error(`❌ ${suite.name} failed:`, error);
        }
        // Wait between test suites to avoid overwhelming console
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        testResults.push({ name: suite.name, status: 'not found' });
        console.warn(`⚠️ ${suite.name} test suite not found`);
      }
    }
    
    // Print final summary
    this.printFinalSummary(testResults);
  }
  
  private printFinalSummary(results: any[]) {
    console.log('\n%c═══════════════════════════════════════════════', 'color: #f59e0b; font-size: 16px');
    console.log('%c   📊 FINAL TEST SUMMARY', 'color: #f59e0b; font-size: 18px; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════', 'color: #f59e0b; font-size: 16px');
    
    const completed = results.filter(r => r.status === 'completed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const notFound = results.filter(r => r.status === 'not found').length;
    
    console.log(`\n✅ Completed: ${completed}/${results.length}`);
    console.log(`❌ Failed: ${failed}/${results.length}`);
    console.log(`⚠️ Not Found: ${notFound}/${results.length}`);
    
    if (failed > 0) {
      console.log('\n🔴 Failed Test Suites:');
      results.filter(r => r.status === 'failed').forEach(r => {
        console.log(`  • ${r.name}: ${r.error}`);
      });
    }
    
    console.log('\n%c═══════════════════════════════════════════════', 'color: #f59e0b; font-size: 16px');
    console.log('%c   🎉 ALL TESTS COMPLETE!', 'color: #10b981; font-size: 16px; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════', 'color: #f59e0b; font-size: 16px');
  }
}

// Make individual test functions available globally
(window as any).testAllStores = async () => {
  const suite = new AllStoreTestsSuite();
  await suite.runAllTests();
};

// Create a quick test function that runs a specific store test
(window as any).testStore = (storeName: string) => {
  const storeTests: Record<string, any> = {
    player: (window as any).testPlayerStore,
    credits: (window as any).testCreditsStore,
    combat: (window as any).testCombatStores,
    ship: (window as any).testShipStores,
    economy: (window as any).testEconomyStores,
    missions: (window as any).testMissionStores,
    navigation: (window as any).testNavigationStores,
    ui: (window as any).testUIStores,
    faction: (window as any).testFactionStore,
    heat: (window as any).testHeatStore
  };
  
  const testFunc = storeTests[storeName.toLowerCase()];
  if (testFunc) {
    testFunc();
  } else {
    console.error(`❌ Store test not found: ${storeName}`);
    console.log('Available store tests:', Object.keys(storeTests).join(', '));
  }
};

// Log that all store tests are loaded
console.log('%c═══════════════════════════════════════════════', 'color: #8b5cf6');
console.log('%c🧪 ALL STORE TEST SUITES LOADED!', 'color: #8b5cf6; font-weight: bold; font-size: 14px');
console.log('%c═══════════════════════════════════════════════', 'color: #8b5cf6');
console.log('\n📚 Available Commands:');
console.log('  • %ctestAllStores()%c - Run all store tests sequentially', 'color: #3b82f6; font-weight: bold', 'color: inherit');
console.log('  • %ctestStore("name")%c - Run specific store test (e.g., "player", "credits")', 'color: #3b82f6; font-weight: bold', 'color: inherit');
console.log('\n🎯 Individual Store Tests:');
console.log('  • testPlayerStore()    • testCreditsStore()');
console.log('  • testCombatStores()   • testShipStores()');
console.log('  • testEconomyStores()  • testMissionStores()');
console.log('  • testNavigationStores() • testUIStores()');
console.log('  • testFactionStore()   • testHeatStore()');
console.log('%c═══════════════════════════════════════════════', 'color: #8b5cf6');