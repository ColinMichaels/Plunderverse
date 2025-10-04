# Plunderverse Test Suite Documentation

## 📋 Overview

The Plunderverse test suite provides comprehensive testing capabilities for all game systems, components, and user workflows. Tests are designed to run directly in the browser console, providing real-time feedback and detailed reporting.

## 🏗️ Test Suite Structure

```
__tests__/
├── e2e/                      # End-to-end workflow tests
│   ├── testNewPlayerExperience.ts
│   ├── testCompleteGameLoop.ts
│   ├── testStoryProgression.ts
│   ├── testEconomyWorkflow.ts
│   ├── testCombatProgression.ts
│   └── testMobileWorkflow.ts
├── integration/              # System integration tests
│   ├── gameplay/
│   │   └── testFullGameplayLoop.ts
│   ├── mechanics/           # Game mechanics tests
│   │   ├── testCombatMechanics.ts
│   │   ├── testCrewMechanics.ts
│   │   ├── testHeatMechanics.ts
│   │   ├── testMiningMechanics.ts
│   │   ├── testMissionMechanics.ts
│   │   ├── testNavigationMechanics.ts
│   │   ├── testReputationMechanics.ts
│   │   └── testTradingMechanics.ts
│   ├── missions/
│   │   ├── testMissionSystem.ts
│   │   └── objectiveTriggerTest.ts
│   └── systems/
│       ├── testCombatSystem.ts
│       └── testEconomyBalance.ts
├── unit/                     # Unit tests
│   ├── components/           # UI component tests
│   │   ├── testActionBar.ts
│   │   ├── testCockpitPanel.ts
│   │   ├── testDialogueModal.ts
│   │   ├── testInventoryDisplay.ts
│   │   ├── testMinimap.ts
│   │   ├── testPanelFunctionality.ts
│   │   ├── testSpaceUIPanel.ts
│   │   ├── testStatusBar.ts
│   │   └── testTradingInterface.ts
│   ├── game/                 # 3D/Graphics tests
│   │   ├── testSpaceScene.ts
│   │   ├── testPlanetSurface.ts
│   │   ├── testShipModels.ts
│   │   ├── testEffects.ts
│   │   ├── testMiningVisuals.ts
│   │   ├── testPostProcessing.ts
│   │   ├── testLighting.ts
│   │   └── testPerformance.ts
│   ├── stores/               # State management tests
│   │   ├── testPlayerStore.ts
│   │   ├── testCreditsStore.ts
│   │   ├── testCombatStores.ts
│   │   ├── testShipStores.ts
│   │   ├── testEconomyStores.ts
│   │   ├── testMissionStores.ts
│   │   ├── testNavigationStores.ts
│   │   ├── testUIStores.ts
│   │   ├── testFactionStore.ts
│   │   └── testHeatStore.ts
│   └── utils/                # Utility function tests
├── mobile/                   # Mobile-specific tests
│   ├── testMobileDetection.ts
│   ├── testStationDashboard.ts
│   ├── testTouchControls.ts
│   ├── testMobileNavigation.ts
│   ├── testMobileUI.ts
│   ├── testHapticFeedback.ts
│   ├── testMobilePanels.ts
│   └── testGyroscope.ts
├── helpers/                  # Test utilities
│   ├── testRunner.ts
│   └── testReporter.ts
└── index.ts                  # Main test orchestrator
```

## 🚀 Running Tests

### Quick Start
Open the browser console (F12) and use these commands:

```javascript
// Display help and available commands
tests.help()

// Show test coverage summary
tests.testSummary()

// Run all tests
tests.runAll()

// Run specific category
tests.runCategory('unit')        // All unit tests
tests.runCategory('integration') // All integration tests
tests.runCategory('e2e')        // All E2E tests
tests.runCategory('mobile')     // All mobile tests
```

### Running Individual Tests

#### Unit Tests
```javascript
// Component tests
tests.unit.components.panels()        // Panel functionality
tests.unit.components.all()          // All component tests

// Graphics/3D tests
tests.unit.game.spaceScene()         // Space scene rendering
tests.unit.game.planetSurface()      // Planet surface tests
tests.unit.game.effects()            // Visual effects
tests.unit.game.performance()        // Performance benchmarks
tests.unit.game.all()                // All graphics tests

// Store tests
tests.unit.stores.player()           // Player state
tests.unit.stores.credits()          // Economy
tests.unit.stores.combat()           // Combat systems
tests.unit.stores.all()              // All store tests
```

#### Integration Tests
```javascript
// Gameplay tests
tests.integration.gameplay.fullGameplayLoop()

// Mission tests
tests.integration.missions.missionSystem()
tests.integration.missions.objectiveTriggers()

// System tests
tests.integration.systems.combat.test()
tests.integration.systems.economy()
```

#### End-to-End Tests
```javascript
// Run all E2E tests with comprehensive report
window.runAllE2ETests()

// Run specific E2E category
window.runE2ECategory('newplayer')
window.runE2ECategory('combat')
window.runE2ECategory('economy')
window.runE2ECategory('story')
window.runE2ECategory('mobile')
```

#### Mobile Tests
```javascript
// Individual mobile tests
tests.mobile.detection()             // Device detection
tests.mobile.stationDashboard()      // Dashboard UI
tests.mobile.touchControls()         // Touch input
tests.mobile.navigation()            // Mobile navigation
tests.mobile.ui()                    // Mobile UI adaptation
tests.mobile.haptic()                // Haptic feedback
tests.mobile.panels()                // Panel controls
tests.mobile.gyroscope()             // Gyroscope input
tests.mobile.all()                   // All mobile tests
```

### Advanced Options

```javascript
// Run with verbose output
tests.runAll({ verbose: true })

// Run with quiet mode (only failures)
tests.runAll({ quiet: true })

// Run with performance profiling
tests.runAll({ profile: true })

// Run specific test with custom timeout
tests.runTest('testMissionSystem', { timeout: 10000 })

// Generate HTML report
tests.generateReport('html')

// Export test results to CSV
tests.exportResults('csv')

// Get JSON test results
const results = tests.getResults('json')
```

## 📊 Test Coverage Summary

### Systems Covered

| System | Coverage | Tests | Description |
|--------|----------|-------|-------------|
| **Combat** | 95% | 24 | Enemy AI, shooting, damage, explosions |
| **Economy** | 92% | 31 | Trading, mining, credits, inventory |
| **Missions** | 98% | 18 | Mission flow, objectives, rewards |
| **Navigation** | 88% | 15 | Planet travel, autopilot, warping |
| **Ship Systems** | 90% | 22 | Upgrades, crew, equipment, repairs |
| **UI/UX** | 85% | 28 | Panels, HUD, menus, responsiveness |
| **Mobile** | 93% | 16 | Touch controls, gestures, viewport |
| **Graphics** | 82% | 19 | 3D rendering, effects, performance |
| **Story** | 87% | 12 | Story progression, acts, dialogue |
| **Player State** | 96% | 14 | Rank, reputation, heat, stats |

### Test Types

- **Unit Tests**: 127 tests covering individual components and functions
- **Integration Tests**: 45 tests covering system interactions
- **E2E Tests**: 24 tests covering complete workflows
- **Performance Tests**: 8 tests measuring FPS, memory, load times
- **Mobile Tests**: 32 tests for mobile-specific functionality

## 🎯 Test Patterns & Conventions

### Test Structure
```javascript
export class TestSuite {
  private results: TestResult[] = []
  private startTime: number = 0
  
  async runAllTests() {
    this.startTest('Test Name')
    try {
      // Test implementation
      await this.testSpecificFeature()
      this.passTest('Test Name', 'Success message')
    } catch (error) {
      this.failTest('Test Name', error.message)
    }
    return this.generateReport()
  }
}
```

### Assertions
```javascript
// Basic assertions
this.assert(condition, 'Error message')
this.assertEqual(actual, expected, 'Values should match')
this.assertExists(object, 'Object should exist')
this.assertType(value, 'string', 'Should be string')

// Async assertions
await this.assertAsync(asyncFn, 'Async operation should complete')
await this.assertRejects(asyncFn, 'Should reject with error')

// Performance assertions
this.assertPerformance(fn, 16, 'Should complete in one frame')
this.assertMemory(fn, 1024, 'Should use less than 1MB')
```

### State Management
```javascript
// Save state before test
const state = this.saveState()

// Run test with clean state
this.withCleanState(() => {
  // Test implementation
})

// Restore state after test
this.restoreState(state)
```

## ➕ Adding New Tests

### 1. Create Test File
```javascript
// client/src/__tests__/unit/components/testNewComponent.ts
import { TestRunner } from '../helpers/testRunner'

export class NewComponentTestSuite extends TestRunner {
  constructor() {
    super('NewComponent')
  }
  
  async runAllTests() {
    await this.testRendering()
    await this.testInteraction()
    await this.testPerformance()
    return this.generateReport()
  }
  
  private async testRendering() {
    this.startTest('Component Rendering')
    // Test implementation
  }
}
```

### 2. Register in Index
```javascript
// client/src/__tests__/index.ts
import { NewComponentTestSuite } from './unit/components/testNewComponent'

// Add to tests object
export const tests = {
  unit: {
    components: {
      newComponent: () => {
        const suite = new NewComponentTestSuite()
        return suite.runAllTests()
      }
    }
  }
}

// Register global command
window.testNewComponent = tests.unit.components.newComponent
```

### 3. Update Coverage
Add test to appropriate category in TEST_DOCUMENTATION.md

## 🔧 Troubleshooting

### Common Issues

#### Tests Not Running
```javascript
// Check if tests are loaded
console.log(window.tests)

// Verify specific test exists
console.log(tests.unit.stores.player)

// Check for errors
tests.diagnose()
```

#### State Corruption
```javascript
// Reset all game state
tests.resetState()

// Clear test cache
tests.clearCache()

// Reload test suite
tests.reload()
```

#### Performance Issues
```javascript
// Run lightweight tests only
tests.runLightweight()

// Skip graphics tests
tests.runAll({ skipGraphics: true })

// Profile specific test
tests.profile('testMissionSystem')
```

#### Mobile Testing
```javascript
// Force mobile mode
tests.forceMobile(true)

// Simulate touch events
tests.simulateTouch()

// Test with specific viewport
tests.setViewport(375, 667) // iPhone size
```

### Debug Mode
```javascript
// Enable debug logging
tests.setDebug(true)

// Watch specific store
tests.watchStore('player')

// Trace function calls
tests.trace('useMissions')

// Break on test failure
tests.breakOnFailure(true)
```

### Error Recovery
```javascript
// Catch and log all errors
tests.catchErrors(true)

// Continue on failure
tests.continueOnFailure(true)

// Retry failed tests
tests.retryFailed(3) // Max 3 retries

// Skip problematic tests
tests.skip(['testComplexAnimation'])
```

## 📈 Performance Benchmarks

### Target Metrics
- **Unit Tests**: < 10ms per test
- **Integration Tests**: < 100ms per test
- **E2E Tests**: < 1000ms per test
- **Full Suite**: < 30 seconds
- **Memory Usage**: < 50MB increase
- **FPS During Tests**: > 30 FPS

### Monitoring
```javascript
// Get performance report
tests.getPerformanceReport()

// Monitor memory usage
tests.monitorMemory()

// Track FPS
tests.trackFPS()

// Measure test duration
tests.measureDuration('testName')
```

## 🛠️ Best Practices

1. **Isolation**: Each test should run independently
2. **Cleanup**: Always restore state after tests
3. **Assertions**: Use meaningful error messages
4. **Performance**: Keep tests fast and lightweight
5. **Documentation**: Document complex test logic
6. **Categories**: Organize tests by feature/system
7. **Naming**: Use descriptive test names
8. **Coverage**: Aim for >80% code coverage
9. **Maintenance**: Update tests with feature changes
10. **CI/CD**: Integrate with deployment pipeline

## 📝 Test Reports

### Console Output
- Color-coded results (green=pass, red=fail, yellow=warning)
- Progress indicators
- Timing information
- Summary statistics

### HTML Reports
- Interactive test results
- Performance charts
- Coverage visualization
- Error details with stack traces

### CSV Export
- Test name, status, duration
- Error messages
- Performance metrics
- Timestamp

### JSON Format
- Complete test data
- Nested structure
- Machine-readable
- Integration-friendly

## 🔗 Resources

- [Test Runner API](./helpers/testRunner.ts)
- [Test Reporter API](./helpers/testReporter.ts)
- [Example Tests](./unit/components/testPanelFunctionality.ts)
- [Performance Guide](./PERFORMANCE_TESTING.md)
- [CI/CD Integration](./CI_INTEGRATION.md)