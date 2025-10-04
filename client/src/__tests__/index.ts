/**
 * Test Suite Index
 * Central export for all test runners
 * All tests can be accessed from the browser console through window.tests
 */

// Integration Tests - Gameplay
import { GameplayLoopTestSuite } from './integration/gameplay/testFullGameplayLoop';

// Integration Tests - Missions
import { testMissionSystem } from './integration/missions/testMissionSystem';
import { ObjectiveTriggerTest } from './integration/missions/objectiveTriggerTest';

// Integration Tests - Systems
import { 
  testCombatSystem, 
  clearAllEnemies, 
  spawnPatrol, 
  spawnBountyHunter 
} from './integration/systems/testCombatSystem';
import { testEconomyBalance } from './integration/systems/testEconomyBalance';

// Unit Tests - Components
import { PanelTestSuite } from './unit/components/testPanelFunctionality';

// Export all test functions as a structured object
export const tests = {
  // Integration Tests
  integration: {
    gameplay: {
      fullGameplayLoop: () => {
        const suite = new GameplayLoopTestSuite();
        return (window as any).testFullGameplayLoop();
      }
    },
    missions: {
      missionSystem: testMissionSystem,
      objectiveTriggers: () => {
        const suite = new ObjectiveTriggerTest();
        return (window as any).testObjectiveTriggers();
      }
    },
    systems: {
      combat: {
        test: testCombatSystem,
        clearEnemies: clearAllEnemies,
        spawnPatrol,
        spawnBountyHunter
      },
      economy: testEconomyBalance
    }
  },
  
  // Unit Tests
  unit: {
    components: {
      panels: () => {
        const suite = new PanelTestSuite();
        return suite.runAllTests();
      }
    }
  },
  
  // Utility function to run all tests
  runAll: async function() {
    console.log('🧪 Running All Tests...');
    const results = {
      passed: 0,
      failed: 0,
      total: 0
    };
    
    try {
      console.log('\n📋 Mission System Test');
      await this.integration.missions.missionSystem();
      results.passed++;
    } catch (e) {
      console.error('Mission System Test Failed:', e);
      results.failed++;
    }
    results.total++;
    
    try {
      console.log('\n⚔️ Combat System Test');
      this.integration.systems.combat.test();
      results.passed++;
    } catch (e) {
      console.error('Combat System Test Failed:', e);
      results.failed++;
    }
    results.total++;
    
    try {
      console.log('\n💰 Economy Balance Test');
      await this.integration.systems.economy();
      results.passed++;
    } catch (e) {
      console.error('Economy Balance Test Failed:', e);
      results.failed++;
    }
    results.total++;
    
    console.log('\n================================');
    console.log(`Test Results: ${results.passed}/${results.total} passed`);
    console.log('================================\n');
    
    return results;
  }
};

// Make tests available globally in the browser console
if (typeof window !== 'undefined') {
  (window as any).tests = tests;
  
  // Keep backward compatibility with old test function names
  (window as any).testFullGameplayLoop = () => {
    const suite = new GameplayLoopTestSuite();
    return suite.runAllTests();
  };
  
  (window as any).testMissionSystem = testMissionSystem;
  (window as any).testCombatSystem = testCombatSystem;
  (window as any).clearAllEnemies = clearAllEnemies;
  (window as any).spawnPatrol = spawnPatrol;
  (window as any).spawnBountyHunter = spawnBountyHunter;
  (window as any).testEconomyBalance = testEconomyBalance;
  
  (window as any).testObjectiveTriggers = () => {
    const suite = new ObjectiveTriggerTest();
    return suite.runAllTests();
  };
  
  (window as any).testPanelFunctionality = () => {
    const suite = new PanelTestSuite();
    return suite.runAllTests();
  };
  
  console.log('🧪 Test Suite Loaded!');
  console.log('Available test commands:');
  console.log('  tests.runAll() - Run all tests');
  console.log('  tests.integration.missions.missionSystem() - Test mission system');
  console.log('  tests.integration.systems.combat.test() - Test combat system');
  console.log('  tests.integration.systems.economy() - Test economy balance');
  console.log('  tests.unit.components.panels() - Test panel functionality');
  console.log('\nBackward compatible commands:');
  console.log('  testFullGameplayLoop() - Run full gameplay loop test');
  console.log('  testMissionSystem() - Test mission system');
  console.log('  testCombatSystem() - Test combat system');
  console.log('  testEconomyBalance() - Test economy balance');
  console.log('  testObjectiveTriggers() - Test objective triggers');
  console.log('  testPanelFunctionality() - Test panel functionality');
}

export default tests;