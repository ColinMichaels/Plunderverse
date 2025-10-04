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

// Unit Tests - Game/3D Graphics
import { SpaceSceneTestSuite } from './unit/game/testSpaceScene';
import { PlanetSurfaceTestSuite } from './unit/game/testPlanetSurface';
import { ShipModelsTestSuite } from './unit/game/testShipModels';
import { EffectsTestSuite } from './unit/game/testEffects';
import { MiningVisualsTestSuite } from './unit/game/testMiningVisuals';
import { PostProcessingTestSuite } from './unit/game/testPostProcessing';
import { LightingTestSuite } from './unit/game/testLighting';
import { PerformanceTestSuite } from './unit/game/testPerformance';

// Unit Tests - Stores (import the index to register all store tests)
import './unit/stores';

// Mobile Tests
import { MobileDetectionTestSuite } from './mobile/testMobileDetection';
import { StationDashboardTestSuite } from './mobile/testStationDashboard';
import { TouchControlsTestSuite } from './mobile/testTouchControls';
import { MobileNavigationTestSuite } from './mobile/testMobileNavigation';
import { MobileUITestSuite } from './mobile/testMobileUI';
import { HapticFeedbackTestSuite } from './mobile/testHapticFeedback';
import { MobilePanelsTestSuite } from './mobile/testMobilePanels';
import { GyroscopeTestSuite } from './mobile/testGyroscope';

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
    },
    game: {
      spaceScene: () => {
        const suite = new SpaceSceneTestSuite();
        return suite.runAllTests();
      },
      planetSurface: () => {
        const suite = new PlanetSurfaceTestSuite();
        return suite.runAllTests();
      },
      shipModels: () => {
        const suite = new ShipModelsTestSuite();
        return suite.runAllTests();
      },
      effects: () => {
        const suite = new EffectsTestSuite();
        return suite.runAllTests();
      },
      miningVisuals: () => {
        const suite = new MiningVisualsTestSuite();
        return suite.runAllTests();
      },
      postProcessing: () => {
        const suite = new PostProcessingTestSuite();
        return suite.runAllTests();
      },
      lighting: () => {
        const suite = new LightingTestSuite();
        return suite.runAllTests();
      },
      performance: () => {
        const suite = new PerformanceTestSuite();
        return suite.runAllTests();
      },
      // Run all 3D/graphics tests
      all: async function() {
        console.log('🎮 Running All 3D/Graphics Tests...');
        const results = { passed: 0, failed: 0, total: 8 };
        
        try {
          await tests.unit.game.spaceScene();
          results.passed++;
        } catch (e) {
          results.failed++;
        }
        
        try {
          await tests.unit.game.planetSurface();
          results.passed++;
        } catch (e) {
          results.failed++;
        }
        
        try {
          await tests.unit.game.shipModels();
          results.passed++;
        } catch (e) {
          results.failed++;
        }
        
        try {
          await tests.unit.game.effects();
          results.passed++;
        } catch (e) {
          results.failed++;
        }
        
        try {
          await tests.unit.game.miningVisuals();
          results.passed++;
        } catch (e) {
          results.failed++;
        }
        
        try {
          await tests.unit.game.postProcessing();
          results.passed++;
        } catch (e) {
          results.failed++;
        }
        
        try {
          await tests.unit.game.lighting();
          results.passed++;
        } catch (e) {
          results.failed++;
        }
        
        try {
          await tests.unit.game.performance();
          results.passed++;
        } catch (e) {
          results.failed++;
        }
        
        console.log(`\n🎮 3D/Graphics Test Results: ${results.passed}/${results.total} passed`);
        return results;
      }
    },
    stores: {
      all: (window as any).testAllStores,
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
    }
  },
  
  // Mobile Tests
  mobile: {
    detection: () => {
      const suite = new MobileDetectionTestSuite();
      return suite.runAllTests();
    },
    stationDashboard: () => {
      const suite = new StationDashboardTestSuite();
      return suite.runAllTests();
    },
    touchControls: () => {
      const suite = new TouchControlsTestSuite();
      return suite.runAllTests();
    },
    navigation: () => {
      const suite = new MobileNavigationTestSuite();
      return suite.runAllTests();
    },
    ui: () => {
      const suite = new MobileUITestSuite();
      return suite.runAllTests();
    },
    haptic: () => {
      const suite = new HapticFeedbackTestSuite();
      return suite.runAllTests();
    },
    panels: () => {
      const suite = new MobilePanelsTestSuite();
      return suite.runAllTests();
    },
    gyroscope: () => {
      const suite = new GyroscopeTestSuite();
      return suite.runAllTests();
    },
    // Run all mobile tests
    all: async function() {
      console.log('📱 Running All Mobile Tests...');
      const results = { passed: 0, failed: 0, total: 8 };
      
      try {
        await tests.mobile.detection();
        results.passed++;
      } catch (e) {
        results.failed++;
      }
      
      try {
        await tests.mobile.stationDashboard();
        results.passed++;
      } catch (e) {
        results.failed++;
      }
      
      try {
        await tests.mobile.touchControls();
        results.passed++;
      } catch (e) {
        results.failed++;
      }
      
      try {
        await tests.mobile.navigation();
        results.passed++;
      } catch (e) {
        results.failed++;
      }
      
      try {
        await tests.mobile.ui();
        results.passed++;
      } catch (e) {
        results.failed++;
      }
      
      try {
        await tests.mobile.haptic();
        results.passed++;
      } catch (e) {
        results.failed++;
      }
      
      try {
        await tests.mobile.panels();
        results.passed++;
      } catch (e) {
        results.failed++;
      }
      
      try {
        await tests.mobile.gyroscope();
        results.passed++;
      } catch (e) {
        results.failed++;
      }
      
      console.log(`\n📱 Mobile Test Results: ${results.passed}/${results.total} passed`);
      return results;
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
  
  // Register mobile test commands
  (window as any).testMobileDetection = () => {
    const suite = new MobileDetectionTestSuite();
    return suite.runAllTests();
  };
  
  (window as any).testStationDashboard = () => {
    const suite = new StationDashboardTestSuite();
    return suite.runAllTests();
  };
  
  (window as any).testTouchControls = () => {
    const suite = new TouchControlsTestSuite();
    return suite.runAllTests();
  };
  
  (window as any).testMobileNavigation = () => {
    const suite = new MobileNavigationTestSuite();
    return suite.runAllTests();
  };
  
  (window as any).testMobileUI = () => {
    const suite = new MobileUITestSuite();
    return suite.runAllTests();
  };
  
  (window as any).testHapticFeedback = () => {
    const suite = new HapticFeedbackTestSuite();
    return suite.runAllTests();
  };
  
  (window as any).testMobilePanels = () => {
    const suite = new MobilePanelsTestSuite();
    return suite.runAllTests();
  };
  
  (window as any).testGyroscope = () => {
    const suite = new GyroscopeTestSuite();
    return suite.runAllTests();
  };
  
  (window as any).testAllMobile = tests.mobile.all;
  
  // Register 3D/graphics test commands
  (window as any).testSpaceScene = () => {
    const suite = new SpaceSceneTestSuite();
    return suite.runAllTests();
  };
  
  (window as any).testPlanetSurface = () => {
    const suite = new PlanetSurfaceTestSuite();
    return suite.runAllTests();
  };
  
  (window as any).testShipModels = () => {
    const suite = new ShipModelsTestSuite();
    return suite.runAllTests();
  };
  
  (window as any).testEffects = () => {
    const suite = new EffectsTestSuite();
    return suite.runAllTests();
  };
  
  (window as any).testMiningVisuals = () => {
    const suite = new MiningVisualsTestSuite();
    return suite.runAllTests();
  };
  
  (window as any).testPostProcessing = () => {
    const suite = new PostProcessingTestSuite();
    return suite.runAllTests();
  };
  
  (window as any).testLighting = () => {
    const suite = new LightingTestSuite();
    return suite.runAllTests();
  };
  
  (window as any).testPerformance = () => {
    const suite = new PerformanceTestSuite();
    return suite.runAllTests();
  };
  
  (window as any).testAll3D = tests.unit.game.all;
  
  console.log('🧪 Test Suite Loaded!');
  console.log('Available test commands:');
  console.log('\n📋 Integration Tests:');
  console.log('  tests.runAll() - Run all tests');
  console.log('  tests.integration.missions.missionSystem() - Test mission system');
  console.log('  tests.integration.systems.combat.test() - Test combat system');
  console.log('  tests.integration.systems.economy() - Test economy balance');
  console.log('\n🔧 Unit Tests - Components:');
  console.log('  tests.unit.components.panels() - Test panel functionality');
  console.log('\n🎮 Unit Tests - 3D/Graphics:');
  console.log('  tests.unit.game.all() - Run ALL 3D/graphics tests');
  console.log('  tests.unit.game.spaceScene() - Test space scene rendering');
  console.log('  tests.unit.game.planetSurface() - Test planet surface scenes');
  console.log('  tests.unit.game.shipModels() - Test ship models & damage');
  console.log('  tests.unit.game.effects() - Test visual effects');
  console.log('  tests.unit.game.miningVisuals() - Test mining graphics');
  console.log('  tests.unit.game.postProcessing() - Test post-processing');
  console.log('  tests.unit.game.lighting() - Test lighting systems');
  console.log('  tests.unit.game.performance() - Test 3D performance');
  console.log('\n💾 Unit Tests - Stores:');
  console.log('  tests.unit.stores.all() - Run ALL store tests');
  console.log('  tests.unit.stores.player() - Test player state');
  console.log('  tests.unit.stores.credits() - Test credits/economy');
  console.log('  tests.unit.stores.combat() - Test combat systems');
  console.log('  tests.unit.stores.ship() - Test ship systems');
  console.log('  tests.unit.stores.economy() - Test economy/trading');
  console.log('  tests.unit.stores.missions() - Test mission management');
  console.log('  tests.unit.stores.navigation() - Test navigation');
  console.log('  tests.unit.stores.ui() - Test UI state');
  console.log('  tests.unit.stores.faction() - Test faction reputation');
  console.log('  tests.unit.stores.heat() - Test heat/wanted system');
  console.log('\n🎯 Quick Store Test Commands:');
  console.log('  testAllStores() - Run all store tests');
  console.log('  testStore("player") - Test specific store by name');
  console.log('\n📝 Individual Store Test Commands:');
  console.log('  testPlayerStore(), testCreditsStore(), testCombatStores()');
  console.log('  testShipStores(), testEconomyStores(), testMissionStores()');
  console.log('  testNavigationStores(), testUIStores()');
  console.log('  testFactionStore(), testHeatStore()');
  console.log('\n📱 Mobile Tests:');
  console.log('  tests.mobile.all() - Run ALL mobile tests');
  console.log('  tests.mobile.detection() - Test mobile platform detection');
  console.log('  tests.mobile.stationDashboard() - Test station dashboard');
  console.log('  tests.mobile.touchControls() - Test touch input systems');
  console.log('  tests.mobile.navigation() - Test mobile navigation');
  console.log('  tests.mobile.ui() - Test mobile UI adaptations');
  console.log('  tests.mobile.haptic() - Test haptic feedback');
  console.log('  tests.mobile.panels() - Test mobile panels');
  console.log('  tests.mobile.gyroscope() - Test gyroscope integration');
  console.log('\n📱 Quick Mobile Test Commands:');
  console.log('  testAllMobile() - Run all mobile tests');
  console.log('  testMobileDetection(), testStationDashboard()');
  console.log('  testTouchControls(), testMobileNavigation()');
  console.log('  testMobileUI(), testHapticFeedback()');
  console.log('  testMobilePanels(), testGyroscope()');
  console.log('\n🎮 Quick 3D/Graphics Test Commands:');
  console.log('  testAll3D() - Run all 3D/graphics tests');
  console.log('  testSpaceScene(), testPlanetSurface()');
  console.log('  testShipModels(), testEffects()');
  console.log('  testMiningVisuals(), testPostProcessing()');
  console.log('  testLighting(), testPerformance()');
}

export default tests;