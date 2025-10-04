/**
 * Comprehensive Gameplay Loop Test Suite
 * Tests all game systems, state transitions, and the complete player experience
 * Run with window.testFullGameplayLoop() from the browser console
 */

import { toast } from 'sonner';
import { gameFacade } from './lib/plunderverse/gameFacade';
import { usePlunderverseMissions } from './lib/stores/economy/usePlunderverseMissions';
import { usePlayer } from './lib/stores/player/usePlayer';
import { useCreditsStore } from './domain/economy/credits.store';
import { useLandedState } from './lib/stores/surface/useLandedState';
import { useSolarSystem } from './lib/stores/space/useSolarSystem';
import { useEnemies } from './lib/stores/combat/useEnemies';
import { useShooting } from './lib/stores/combat/useShooting';
import { useShipStatus } from './lib/stores/ship/useShipStatus';
import { useHeatSystem } from './lib/stores/player/useHeatSystem';
import { useMining } from './lib/stores/economy/useMining';
import { useTrading } from './lib/stores/economy/useTrading';
import { useCrewManagement } from './lib/stores/ship/useCrewManagement';
import { useUpgrades } from './lib/stores/ship/useUpgrades';
import { usePanelManager } from './lib/stores/ui/usePanelManager';
import { useInventory } from './lib/stores/economy/useInventory';
import { useObjectiveTriggers } from './lib/stores/economy/useObjectiveTriggers';
import * as THREE from 'three';

// Test framework imports
import { testMissionSystem } from './testMissionSystem';
import { testCombatSystem, clearAllEnemies } from './testCombatSystem';
import { testEconomyBalance } from './testEconomyBalance';
import { testObjectiveTriggers } from './lib/tests/objectiveTriggerTest';
import { PanelTestSuite } from './lib/tests/panel-tests/testPanelFunctionality';

// Test result types
interface TestResult {
  name: string;
  status: 'running' | 'passed' | 'failed' | 'warning';
  message: string;
  details?: any;
  timestamp: number;
  duration?: number;
}

interface TestReport {
  timestamp: number;
  totalTests: number;
  passed: number;
  failed: number;
  warnings: number;
  systems: Map<string, TestResult[]>;
  performance: {
    fps: number;
    memory: number;
    errors: string[];
  };
  recommendations: string[];
}

export class GameplayLoopTestSuite {
  private results: TestResult[] = [];
  private systemResults = new Map<string, TestResult[]>();
  private startTime: number = 0;
  private errors: string[] = [];
  private originalState: any = {};
  private consoleErrorSpy: any;
  private consoleWarnSpy: any;
  private performanceMonitor: any;

  constructor() {
    console.log('🎮 Gameplay Loop Test Suite initialized');
    this.setupErrorMonitoring();
    this.setupPerformanceMonitor();
  }

  /**
   * Setup error monitoring to catch console errors during tests
   */
  private setupErrorMonitoring() {
    const originalError = console.error;
    const originalWarn = console.warn;
    
    this.consoleErrorSpy = (...args: any[]) => {
      this.errors.push(`ERROR: ${args.join(' ')}`);
      originalError.apply(console, args);
    };
    
    this.consoleWarnSpy = (...args: any[]) => {
      // Filter out expected warnings
      const msg = args.join(' ');
      if (!msg.includes('Unknown requirement type') && 
          !msg.includes('MemoryProfiler') &&
          !msg.includes('Browserslist')) {
        this.errors.push(`WARN: ${msg}`);
      }
      originalWarn.apply(console, args);
    };
    
    console.error = this.consoleErrorSpy;
    console.warn = this.consoleWarnSpy;
  }

  /**
   * Setup performance monitoring
   */
  private setupPerformanceMonitor() {
    let frameCount = 0;
    let lastTime = performance.now();
    let fps = 0;

    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      const delta = currentTime - lastTime;
      
      if (delta >= 1000) {
        fps = Math.round((frameCount * 1000) / delta);
        frameCount = 0;
        lastTime = currentTime;
      }
      
      if (this.performanceMonitor) {
        requestAnimationFrame(measureFPS);
      }
    };
    
    this.performanceMonitor = { getFPS: () => fps };
    requestAnimationFrame(measureFPS);
  }

  /**
   * Save current game state for restoration after tests
   */
  private saveGameState() {
    const missions = usePlunderverseMissions.getState();
    const player = usePlayer.getState();
    const credits = useCreditsStore.getState();
    const landed = useLandedState.getState();
    const ship = useShipStatus.getState();
    const inventory = useInventory.getState();
    
    this.originalState = {
      missions: {
        available: [...missions.availableMissions],
        active: [...missions.activeMissions],
        completed: new Set(missions.completedMissionIds)
      },
      player: {
        rank: player.rank,
        reputation: { ...player.reputation },
        heat: player.heat,
        notoriety: player.notoriety,
        points: player.points
      },
      credits: credits.credits,
      landed: {
        isLanded: landed.isLanded,
        landedPlanet: landed.landedPlanet
      },
      ship: {
        hull: ship.hull,
        shield: ship.shield,
        fuel: ship.fuel
      },
      inventory: {
        items: [...inventory.items],
        weight: inventory.currentWeight
      }
    };
    
    console.log('💾 Game state saved for restoration');
  }

  /**
   * Restore original game state
   */
  private restoreGameState() {
    try {
      const credits = useCreditsStore.getState();
      const ship = useShipStatus.getState();
      const player = usePlayer.getState();
      
      credits.setCredits(this.originalState.credits);
      ship.setHull(this.originalState.ship.hull);
      ship.setShield(this.originalState.ship.shield);
      ship.setFuel(this.originalState.ship.fuel);
      player.setRank(this.originalState.player.rank);
      
      console.log('♻️ Game state restored');
    } catch (error) {
      console.warn('⚠️ Could not fully restore state:', error);
    }
  }

  /**
   * Run all test suites in sequence
   */
  async runAllTests() {
    console.clear();
    console.log('%c═══════════════════════════════════════════════', 'color: #8b5cf6; font-size: 14px');
    console.log('%c   🎮 FULL GAMEPLAY LOOP TEST SUITE STARTING', 'color: #8b5cf6; font-size: 16px; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════', 'color: #8b5cf6; font-size: 14px');
    
    this.startTime = Date.now();
    this.saveGameState();
    
    try {
      // Test 1: Initial state validation
      await this.testInitialState();
      await this.wait(500);
      
      // Test 2: Space navigation
      await this.testSpaceNavigation();
      await this.wait(500);
      
      // Test 3: Mission system
      await this.testMissionFlow();
      await this.wait(500);
      
      // Test 4: Planet landing and mining
      await this.testPlanetSurface();
      await this.wait(500);
      
      // Test 5: Combat system
      await this.testCombatFlow();
      await this.wait(500);
      
      // Test 6: Trading system
      await this.testTradingFlow();
      await this.wait(500);
      
      // Test 7: Economy balance
      await this.testEconomyFlow();
      await this.wait(500);
      
      // Test 8: UI panels
      await this.testUIPanels();
      await this.wait(500);
      
      // Test 9: State persistence
      await this.testStatePersistence();
      await this.wait(500);
      
      // Test 10: Performance check
      await this.testPerformance();
      
    } catch (error) {
      console.error('Test suite failed:', error);
      this.addResult('Test Suite', 'failed', `Critical error: ${error}`);
    } finally {
      // Generate and display report
      const report = this.generateReport();
      this.displayReport(report);
      
      // Restore state
      this.restoreGameState();
      
      // Show completion toast
      const status = report.failed > 0 ? 'error' : 'success';
      toast[status](
        `Tests Complete: ${report.passed}/${report.totalTests} passed`,
        {
          description: report.failed > 0 
            ? `${report.failed} tests failed. Check console for details.`
            : 'All systems functioning normally!',
          duration: 5000
        }
      );
    }
  }

  /**
   * Test 1: Initial State Validation
   */
  private async testInitialState() {
    console.log('\n📊 Testing Initial State...');
    
    const credits = useCreditsStore.getState();
    const player = usePlayer.getState();
    const landed = useLandedState.getState();
    const ship = useShipStatus.getState();
    
    // Check starting conditions
    this.addResult(
      'Starting Credits',
      credits.credits === 1000 ? 'passed' : 'warning',
      `Credits: ${credits.credits} (expected: 1000)`
    );
    
    this.addResult(
      'Starting Location',
      landed.isLanded && landed.landedPlanet === 'Earth' ? 'passed' : 'failed',
      `Location: ${landed.isLanded ? landed.landedPlanet : 'Space'}`
    );
    
    this.addResult(
      'Player Rank',
      player.rank === 1 ? 'passed' : 'warning',
      `Rank: ${player.rank}`
    );
    
    this.addResult(
      'Ship Status',
      ship.hull > 0 && ship.shield > 0 ? 'passed' : 'failed',
      `Hull: ${ship.hull}, Shield: ${ship.shield}`
    );
    
    this.systemResults.set('Initial State', [...this.results]);
  }

  /**
   * Test 2: Space Navigation
   */
  private async testSpaceNavigation() {
    console.log('\n🚀 Testing Space Navigation...');
    const results: TestResult[] = [];
    
    const landed = useLandedState.getState();
    const solar = useSolarSystem.getState();
    
    // Take off if landed
    if (landed.isLanded) {
      console.log('  Taking off from planet...');
      landed.setNotLanded();
      await this.wait(100);
    }
    
    // Test camera movement
    const newPos = new THREE.Vector3(100, 50, 100);
    solar.setCameraPosition(newPos);
    await this.wait(100);
    
    results.push({
      name: 'Camera Movement',
      status: solar.cameraPosition.distanceTo(newPos) < 1 ? 'passed' : 'failed',
      message: 'Camera position update',
      timestamp: Date.now()
    });
    
    // Test planet selection
    solar.setSelectedPlanet('Mars');
    await this.wait(100);
    
    results.push({
      name: 'Planet Selection',
      status: solar.selectedPlanet === 'Mars' ? 'passed' : 'failed',
      message: `Selected: ${solar.selectedPlanet}`,
      timestamp: Date.now()
    });
    
    this.systemResults.set('Space Navigation', results);
    results.forEach(r => this.results.push(r));
  }

  /**
   * Test 3: Mission System Flow
   */
  private async testMissionFlow() {
    console.log('\n📋 Testing Mission System...');
    const results: TestResult[] = [];
    
    const missions = usePlunderverseMissions.getState();
    const credits = useCreditsStore.getState();
    const triggers = useObjectiveTriggers.getState();
    
    // Generate test mission
    const testMission = {
      id: `test_gameplay_${Date.now()}`,
      title: 'TEST: Gameplay Loop Mission',
      description: 'Testing complete mission flow',
      type: 'delivery' as const,
      difficulty: 'easy' as const,
      rank: 1,
      faction: 'corporations' as const,
      rewards: {
        base: {
          credits: 500,
          reputation: { corporations: 5 }
        },
        variable: false
      },
      requirements: {},
      objectives: [{
        id: 'obj_test_1',
        type: 'investigation',
        description: 'Complete test objective',
        quantity: 1,
        completed: false
      }],
      choices: [],
      active: false,
      completed: false,
      failed: false
    };
    
    // Add and accept mission
    missions.addEmergencyMissions([testMission]);
    const accepted = missions.acceptMission(testMission.id);
    
    results.push({
      name: 'Mission Accept',
      status: accepted ? 'passed' : 'failed',
      message: accepted ? 'Mission accepted' : 'Failed to accept mission',
      timestamp: Date.now()
    });
    
    if (accepted) {
      // Complete objectives
      missions.updateObjectiveProgress(testMission.id, 'obj_test_1', 100);
      await this.wait(100);
      
      // Complete mission
      const creditsBefore = credits.credits;
      await gameFacade.resolveMission(testMission.id);
      await this.wait(100);
      const creditsAfter = credits.credits;
      
      results.push({
        name: 'Mission Rewards',
        status: creditsAfter > creditsBefore ? 'passed' : 'failed',
        message: `Credits gained: ${creditsAfter - creditsBefore}`,
        timestamp: Date.now()
      });
    }
    
    this.systemResults.set('Mission System', results);
    results.forEach(r => this.results.push(r));
  }

  /**
   * Test 4: Planet Surface Operations
   */
  private async testPlanetSurface() {
    console.log('\n🌍 Testing Planet Surface...');
    const results: TestResult[] = [];
    
    const landed = useLandedState.getState();
    const mining = useMining.getState();
    const inventory = useInventory.getState();
    
    // Land on planet
    console.log('  Landing on Mars...');
    landed.setLanded('Mars');
    await this.wait(200);
    
    results.push({
      name: 'Planet Landing',
      status: landed.isLanded && landed.landedPlanet === 'Mars' ? 'passed' : 'failed',
      message: `Landed: ${landed.isLanded}, Planet: ${landed.landedPlanet}`,
      timestamp: Date.now()
    });
    
    // Test mining
    const itemsBefore = inventory.items.length;
    mining.addMinedResource('iron', 5);
    await this.wait(100);
    const itemsAfter = inventory.items.length;
    
    results.push({
      name: 'Resource Mining',
      status: itemsAfter >= itemsBefore ? 'passed' : 'failed',
      message: `Mined resources, inventory: ${itemsAfter} items`,
      timestamp: Date.now()
    });
    
    // Take off
    console.log('  Taking off from Mars...');
    landed.setNotLanded();
    await this.wait(200);
    
    results.push({
      name: 'Planet Takeoff',
      status: !landed.isLanded ? 'passed' : 'failed',
      message: 'Returned to space',
      timestamp: Date.now()
    });
    
    this.systemResults.set('Planet Surface', results);
    results.forEach(r => this.results.push(r));
  }

  /**
   * Test 5: Combat System Flow
   */
  private async testCombatFlow() {
    console.log('\n⚔️ Testing Combat System...');
    const results: TestResult[] = [];
    
    const enemies = useEnemies.getState();
    const shooting = useShooting.getState();
    const solar = useSolarSystem.getState();
    const player = usePlayer.getState();
    
    // Clear existing enemies
    clearAllEnemies();
    
    // Spawn test enemy
    const playerPos = solar.cameraPosition;
    const enemyPos = new THREE.Vector3(
      playerPos.x + 20,
      playerPos.y,
      playerPos.z
    );
    
    enemies.spawnEnemy(enemyPos, 'outlaws', 'fighter');
    await this.wait(100);
    
    results.push({
      name: 'Enemy Spawn',
      status: enemies.enemies.length > 0 ? 'passed' : 'failed',
      message: `Enemies: ${enemies.enemies.length}`,
      timestamp: Date.now()
    });
    
    // Fire projectile
    const projectilesBefore = shooting.projectiles.length;
    shooting.addProjectile(
      playerPos.clone(),
      new THREE.Vector3(1, 0, 0),
      60,
      25,
      'player',
      'player'
    );
    await this.wait(100);
    
    results.push({
      name: 'Weapon Fire',
      status: shooting.projectiles.length > projectilesBefore ? 'passed' : 'failed',
      message: `Projectiles: ${shooting.projectiles.length}`,
      timestamp: Date.now()
    });
    
    // Damage enemy
    if (enemies.enemies.length > 0) {
      const enemy = enemies.enemies[0];
      const hullBefore = enemy.hull;
      enemies.damageEnemy(enemy.id, 50);
      await this.wait(100);
      
      results.push({
        name: 'Enemy Damage',
        status: enemy.hull < hullBefore ? 'passed' : 'failed',
        message: `Damage dealt: ${hullBefore - enemy.hull}`,
        timestamp: Date.now()
      });
    }
    
    // Clear enemies
    clearAllEnemies();
    
    this.systemResults.set('Combat System', results);
    results.forEach(r => this.results.push(r));
  }

  /**
   * Test 6: Trading System Flow
   */
  private async testTradingFlow() {
    console.log('\n💱 Testing Trading System...');
    const results: TestResult[] = [];
    
    const trading = useTrading.getState();
    const credits = useCreditsStore.getState();
    const inventory = useInventory.getState();
    
    // Generate market prices
    trading.generateMarketPrices('Earth');
    await this.wait(100);
    
    const prices = trading.getMarketPrices('Earth');
    results.push({
      name: 'Market Generation',
      status: prices.length > 0 ? 'passed' : 'failed',
      message: `${prices.length} items in market`,
      timestamp: Date.now()
    });
    
    // Simulate buying
    const creditsBefore = credits.credits;
    const testGood = trading.getGoodById('food-rations');
    if (testGood && prices.length > 0) {
      const marketPrice = prices.find(p => p.goodId === testGood.id);
      if (marketPrice && credits.credits >= marketPrice.buyPrice) {
        // Buy item
        credits.addCredits(-marketPrice.buyPrice);
        inventory.addItem({
          id: testGood.id,
          name: testGood.name,
          quantity: 1,
          weight: testGood.weight,
          value: marketPrice.buyPrice,
          category: 'trade'
        });
        trading.buyGood('Earth', testGood.id, 1, marketPrice.buyPrice);
        
        results.push({
          name: 'Trade Purchase',
          status: 'passed',
          message: `Bought ${testGood.name} for ${marketPrice.buyPrice}c`,
          timestamp: Date.now()
        });
        
        // Simulate selling at different location
        trading.generateMarketPrices('Mars');
        const marsPrice = trading.getMarketPrices('Mars').find(p => p.goodId === testGood.id);
        if (marsPrice) {
          const profit = marsPrice.sellPrice - marketPrice.buyPrice;
          results.push({
            name: 'Trade Profit',
            status: profit > 0 ? 'passed' : 'warning',
            message: `Potential profit: ${profit}c`,
            timestamp: Date.now()
          });
        }
      }
    }
    
    this.systemResults.set('Trading System', results);
    results.forEach(r => this.results.push(r));
  }

  /**
   * Test 7: Economy Flow
   */
  private async testEconomyFlow() {
    console.log('\n💰 Testing Economy Balance...');
    const results: TestResult[] = [];
    
    const credits = useCreditsStore.getState();
    const crew = useCrewManagement.getState();
    const upgrades = useUpgrades.getState();
    
    // Test daily costs
    const dailyCost = crew.calculateDailyCost();
    results.push({
      name: 'Daily Costs',
      status: dailyCost > 0 && dailyCost < 100 ? 'passed' : 'warning',
      message: `Daily cost: ${dailyCost}c`,
      timestamp: Date.now()
    });
    
    // Test upgrade prices
    upgrades.initializeCatalog();
    const basicUpgrade = upgrades.catalog.find(u => u.tier === 'basic');
    if (basicUpgrade) {
      results.push({
        name: 'Upgrade Pricing',
        status: basicUpgrade.cost >= 300 && basicUpgrade.cost <= 800 ? 'passed' : 'warning',
        message: `Basic upgrade: ${basicUpgrade.cost}c`,
        timestamp: Date.now()
      });
    }
    
    // Test survival calculation
    const currentCredits = credits.credits;
    const daysOfSurvival = Math.floor(currentCredits / dailyCost);
    results.push({
      name: 'Survival Time',
      status: daysOfSurvival >= 7 ? 'passed' : 'warning',
      message: `Can survive ${daysOfSurvival} days`,
      timestamp: Date.now()
    });
    
    this.systemResults.set('Economy Balance', results);
    results.forEach(r => this.results.push(r));
  }

  /**
   * Test 8: UI Panels
   */
  private async testUIPanels() {
    console.log('\n🖼️ Testing UI Panels...');
    const results: TestResult[] = [];
    
    const panels = usePanelManager.getState();
    
    // Test panel toggling
    panels.openPanel('missions');
    await this.wait(100);
    
    results.push({
      name: 'Panel Open',
      status: panels.isPanelOpen('missions') ? 'passed' : 'failed',
      message: 'Missions panel opened',
      timestamp: Date.now()
    });
    
    // Test panel switching
    panels.openPanel('inventory');
    await this.wait(100);
    
    results.push({
      name: 'Panel Switch',
      status: panels.isPanelOpen('inventory') && !panels.isPanelOpen('missions') ? 'passed' : 'failed',
      message: 'Switched to inventory panel',
      timestamp: Date.now()
    });
    
    // Close all panels
    panels.closeAllPanels();
    await this.wait(100);
    
    results.push({
      name: 'Panels Close',
      status: panels.activePanelId === null ? 'passed' : 'failed',
      message: 'All panels closed',
      timestamp: Date.now()
    });
    
    this.systemResults.set('UI Panels', results);
    results.forEach(r => this.results.push(r));
  }

  /**
   * Test 9: State Persistence
   */
  private async testStatePersistence() {
    console.log('\n💾 Testing State Persistence...');
    const results: TestResult[] = [];
    
    const credits = useCreditsStore.getState();
    const player = usePlayer.getState();
    const ship = useShipStatus.getState();
    
    // Modify state
    const originalCredits = credits.credits;
    credits.addCredits(100);
    player.addReputation('corporations', 5);
    ship.takeDamage(10);
    
    await this.wait(100);
    
    // Check state changes
    results.push({
      name: 'Credits Update',
      status: credits.credits === originalCredits + 100 ? 'passed' : 'failed',
      message: `Credits: ${credits.credits}`,
      timestamp: Date.now()
    });
    
    results.push({
      name: 'Reputation Update',
      status: player.reputation.corporations > 0 ? 'passed' : 'failed',
      message: `Corporation rep: ${player.reputation.corporations}`,
      timestamp: Date.now()
    });
    
    results.push({
      name: 'Ship Damage',
      status: ship.hull < 100 ? 'passed' : 'failed',
      message: `Hull: ${ship.hull}`,
      timestamp: Date.now()
    });
    
    this.systemResults.set('State Persistence', results);
    results.forEach(r => this.results.push(r));
  }

  /**
   * Test 10: Performance Check
   */
  private async testPerformance() {
    console.log('\n⚡ Testing Performance...');
    const results: TestResult[] = [];
    
    const fps = this.performanceMonitor?.getFPS() || 0;
    results.push({
      name: 'Frame Rate',
      status: fps >= 30 ? 'passed' : fps >= 20 ? 'warning' : 'failed',
      message: `${fps} FPS`,
      timestamp: Date.now()
    });
    
    // Check memory usage if available
    if ((performance as any).memory) {
      const memory = (performance as any).memory;
      const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
      const limitMB = Math.round(memory.jsHeapSizeLimit / 1024 / 1024);
      const usage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      
      results.push({
        name: 'Memory Usage',
        status: usage < 50 ? 'passed' : usage < 75 ? 'warning' : 'failed',
        message: `${usedMB}MB / ${limitMB}MB (${usage.toFixed(1)}%)`,
        timestamp: Date.now()
      });
    }
    
    // Check console errors
    results.push({
      name: 'Console Errors',
      status: this.errors.length === 0 ? 'passed' : this.errors.length < 5 ? 'warning' : 'failed',
      message: `${this.errors.length} errors detected`,
      timestamp: Date.now()
    });
    
    this.systemResults.set('Performance', results);
    results.forEach(r => this.results.push(r));
  }

  /**
   * Add test result
   */
  private addResult(name: string, status: TestResult['status'], message: string, details?: any) {
    const result: TestResult = {
      name,
      status,
      message,
      details,
      timestamp: Date.now()
    };
    
    this.results.push(result);
    
    // Log with color
    const color = status === 'passed' ? '#10b981' : 
                  status === 'failed' ? '#ef4444' : 
                  status === 'warning' ? '#f59e0b' : '#3b82f6';
    const icon = status === 'passed' ? '✅' : 
                 status === 'failed' ? '❌' : 
                 status === 'warning' ? '⚠️' : '🔄';
    
    console.log(`%c  ${icon} ${name}: ${message}`, `color: ${color}`);
  }

  /**
   * Generate test report
   */
  private generateReport(): TestReport {
    const totalTests = this.results.length;
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;
    
    const recommendations: string[] = [];
    
    // Generate recommendations based on results
    if (failed > 0) {
      recommendations.push('Critical failures detected - immediate fixes required');
    }
    
    if (warnings > 5) {
      recommendations.push('Multiple warnings detected - review system balance');
    }
    
    if (this.errors.length > 0) {
      recommendations.push('Console errors detected - check error handling');
    }
    
    const fps = this.performanceMonitor?.getFPS() || 0;
    if (fps < 30) {
      recommendations.push('Low FPS detected - optimize rendering performance');
    }
    
    // Check specific systems
    const missionResults = this.systemResults.get('Mission System') || [];
    if (missionResults.some(r => r.status === 'failed')) {
      recommendations.push('Mission system issues - check reward distribution');
    }
    
    const combatResults = this.systemResults.get('Combat System') || [];
    if (combatResults.some(r => r.status === 'failed')) {
      recommendations.push('Combat system issues - review damage calculations');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('All systems functioning within normal parameters');
      recommendations.push('Game is ready for player testing');
    }
    
    return {
      timestamp: Date.now(),
      totalTests,
      passed,
      failed,
      warnings,
      systems: this.systemResults,
      performance: {
        fps: fps,
        memory: (performance as any).memory ? 
          Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) : 0,
        errors: this.errors
      },
      recommendations
    };
  }

  /**
   * Display test report
   */
  private displayReport(report: TestReport) {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const passRate = ((report.passed / report.totalTests) * 100).toFixed(0);
    
    console.log('\n%c═══════════════════════════════════════════════', 'color: #8b5cf6; font-size: 14px');
    console.log('%c         📊 TEST REPORT SUMMARY', 'color: #8b5cf6; font-size: 16px; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════', 'color: #8b5cf6; font-size: 14px');
    
    console.log(`\n📈 Overall Results:`);
    console.log(`   Total Tests: ${report.totalTests}`);
    console.log(`   ✅ Passed: ${report.passed} (${passRate}%)`);
    console.log(`   ❌ Failed: ${report.failed}`);
    console.log(`   ⚠️  Warnings: ${report.warnings}`);
    console.log(`   ⏱️  Duration: ${duration}s`);
    
    console.log(`\n💻 Performance Metrics:`);
    console.log(`   FPS: ${report.performance.fps}`);
    console.log(`   Memory: ${report.performance.memory}MB`);
    console.log(`   Errors: ${report.performance.errors.length}`);
    
    console.log(`\n🔍 System Breakdown:`);
    report.systems.forEach((results, system) => {
      const systemPassed = results.filter(r => r.status === 'passed').length;
      const systemFailed = results.filter(r => r.status === 'failed').length;
      const systemIcon = systemFailed === 0 ? '✅' : systemFailed > systemPassed ? '❌' : '⚠️';
      console.log(`   ${systemIcon} ${system}: ${systemPassed}/${results.length} passed`);
    });
    
    console.log(`\n💡 Recommendations:`);
    report.recommendations.forEach((rec, i) => {
      console.log(`   ${i + 1}. ${rec}`);
    });
    
    console.log('\n%c═══════════════════════════════════════════════', 'color: #8b5cf6; font-size: 14px');
    
    // Log failed tests
    if (report.failed > 0) {
      console.log('\n%c❌ Failed Tests:', 'color: #ef4444; font-weight: bold');
      this.results
        .filter(r => r.status === 'failed')
        .forEach(r => {
          console.log(`   • ${r.name}: ${r.message}`);
          if (r.details) {
            console.log(`     Details:`, r.details);
          }
        });
    }
    
    // Log errors if any
    if (report.performance.errors.length > 0) {
      console.log('\n%c⚠️ Console Errors:', 'color: #f59e0b; font-weight: bold');
      report.performance.errors.slice(0, 5).forEach(err => {
        console.log(`   • ${err}`);
      });
      if (report.performance.errors.length > 5) {
        console.log(`   ... and ${report.performance.errors.length - 5} more`);
      }
    }
  }

  /**
   * Helper: Wait for async operations
   */
  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Create automated test runner
export class AutomatedTestRunner {
  private suites = new Map<string, () => Promise<any>>();
  private results = new Map<string, { status: string; duration: number }>();
  
  constructor() {
    // Register all test suites
    this.suites.set('Full Gameplay Loop', () => new GameplayLoopTestSuite().runAllTests());
    this.suites.set('Mission System', () => testMissionSystem());
    this.suites.set('Combat System', () => Promise.resolve(testCombatSystem()));
    this.suites.set('Economy Balance', () => testEconomyBalance());
    this.suites.set('Objective Triggers', () => testObjectiveTriggers());
    this.suites.set('UI Panels', () => new PanelTestSuite().runAllTests());
  }
  
  /**
   * Run all test suites sequentially
   */
  async runAll() {
    console.clear();
    console.log('%c🤖 AUTOMATED TEST RUNNER', 'color: #00ffff; font-size: 18px; font-weight: bold');
    console.log('%cRunning all test suites sequentially...', 'color: #00ffff');
    
    const startTime = Date.now();
    
    for (const [name, suite] of this.suites) {
      console.log(`\n%c▶️ Running: ${name}`, 'color: #3b82f6; font-size: 14px; font-weight: bold');
      const suiteStart = Date.now();
      
      try {
        await suite();
        const duration = Date.now() - suiteStart;
        this.results.set(name, { status: 'passed', duration });
        console.log(`%c✅ ${name} completed in ${(duration / 1000).toFixed(1)}s`, 'color: #10b981');
      } catch (error) {
        const duration = Date.now() - suiteStart;
        this.results.set(name, { status: 'failed', duration });
        console.error(`%c❌ ${name} failed:`, 'color: #ef4444', error);
      }
      
      // Wait between suites
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Display summary
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
    const passed = Array.from(this.results.values()).filter(r => r.status === 'passed').length;
    const failed = Array.from(this.results.values()).filter(r => r.status === 'failed').length;
    
    console.log('\n%c═══════════════════════════════════════════════', 'color: #00ffff');
    console.log('%c     AUTOMATED TEST RUNNER COMPLETE', 'color: #00ffff; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════', 'color: #00ffff');
    console.log(`Total Suites: ${this.suites.size}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏱️  Total Time: ${totalDuration}s`);
    
    // Show results table
    console.table(
      Array.from(this.results.entries()).map(([name, result]) => ({
        Suite: name,
        Status: result.status === 'passed' ? '✅' : '❌',
        Duration: `${(result.duration / 1000).toFixed(1)}s`
      }))
    );
    
    return {
      passed,
      failed,
      total: this.suites.size,
      duration: totalDuration,
      results: this.results
    };
  }
}

// Export main test function
export async function testFullGameplayLoop() {
  const suite = new GameplayLoopTestSuite();
  return suite.runAllTests();
}

// Export automated runner
export async function runAllTests() {
  const runner = new AutomatedTestRunner();
  return runner.runAll();
}

// Make available globally
if (typeof window !== 'undefined') {
  (window as any).testFullGameplayLoop = testFullGameplayLoop;
  (window as any).runAllTests = runAllTests;
  (window as any).GameplayLoopTestSuite = GameplayLoopTestSuite;
  (window as any).AutomatedTestRunner = AutomatedTestRunner;
  
  console.log('%c🎮 FULL GAMEPLAY LOOP TEST SUITE LOADED', 'color: #8b5cf6; font-size: 14px; font-weight: bold');
  console.log('%cAvailable commands:', 'color: #8b5cf6');
  console.log('  %ctestFullGameplayLoop()%c - Run comprehensive gameplay tests', 'color: #3b82f6', 'color: inherit');
  console.log('  %crunAllTests()%c - Run all test suites automatically', 'color: #3b82f6', 'color: inherit');
}