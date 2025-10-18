/**
 * Heat Store Test Suite
 * Tests heat/wanted system including accumulation, wanted levels, decay, and patrol spawning
 * Run with window.testHeatStore() from the browser console
 */

import { useHeatSystem } from '../../../lib/stores/player/useHeatSystem';
import { usePlayer } from '../../../lib/stores/player/usePlayer';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  details?: any;
}

export class HeatStoreTestSuite {
  private results: TestResult[] = [];
  private originalState: any;

  constructor() {
    console.log('🔥 Heat Store Test Suite initialized');
  }

  async runAllTests() {
    console.clear();
    console.log('%c═══════════════════════════════════════════════', 'color: #dc2626; font-size: 14px');
    console.log('%c   🔥 HEAT STORE TEST SUITE STARTING', 'color: #dc2626; font-size: 16px; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════', 'color: #dc2626; font-size: 14px');
    
    this.results = [];
    
    try {
      // Save original state
      this.originalState = { ...useHeatSystem.getState() };
      
      await this.testInitialHeatState();
      await this.wait(500);
      
      await this.testHeatAccumulation();
      await this.wait(500);
      
      await this.testWantedLevels();
      await this.wait(500);
      
      await this.testHeatDecay();
      await this.wait(500);
      
      await this.testPatrolSpawning();
      await this.wait(500);
      
      await this.testHeatThresholds();
      await this.wait(500);
      
      await this.testHeatModifiers();
      await this.wait(500);
      
      await this.testHeatIntegration();
      
    } catch (error) {
      console.error('Test suite failed:', error);
      this.addResult('Test Suite', 'failed', `Critical error: ${error}`);
    } finally {
      // Restore original state
      this.restoreOriginalState();
      this.printSummary();
    }
  }

  private async testInitialHeatState() {
    console.log('\n📊 Testing Initial Heat State...');
    
    const heatSystem = useHeatSystem.getState();
    
    // Reset heat system
    heatSystem.resetHeat();
    
    // Test initial values
    this.addResult(
      'Initial Heat Level',
      heatSystem.heat === 0 ? 'passed' : 'failed',
      `Heat: ${heatSystem.heat}/100`
    );
    
    this.addResult(
      'Initial Wanted Level',
      heatSystem.wantedLevel === 0 ? 'passed' : 'failed',
      `Wanted level: ${heatSystem.wantedLevel}/5`
    );
    
    this.addResult(
      'Initial Last Crime Time',
      heatSystem.lastCrimeTime === 0 ? 'passed' : 'failed',
      `Last crime: ${heatSystem.lastCrimeTime}`
    );
    
    this.addResult(
      'Initial Patrols Active',
      heatSystem.patrolsActive === 0 ? 'passed' : 'failed',
      `Active patrols: ${heatSystem.patrolsActive}`
    );
    
    // Test wanted status
    const wantedStatus = heatSystem.getWantedStatus();
    this.addResult(
      'Initial Wanted Status',
      wantedStatus.name === 'Clean' ? 'passed' : 'failed',
      `Status: ${wantedStatus.name}`
    );
  }

  private async testHeatAccumulation() {
    console.log('\n🔥 Testing Heat Accumulation...');
    
    const heatSystem = useHeatSystem.getState();
    
    // Reset heat
    heatSystem.resetHeat();
    
    // Test adding heat
    heatSystem.addHeat(25);
    
    this.addResult(
      'Add Heat',
      heatSystem.heat === 25 ? 'passed' : 'failed',
      `Heat increased to: ${heatSystem.heat}`
    );
    
    // Test crime types
    heatSystem.resetHeat();
    heatSystem.commitCrime('assault');
    
    this.addResult(
      'Crime: Assault',
      heatSystem.heat > 0 ? 'passed' : 'failed',
      `Heat from assault: ${heatSystem.heat}`
    );
    
    // Test multiple crimes
    const beforeMultiple = heatSystem.heat;
    heatSystem.commitCrime('theft');
    heatSystem.commitCrime('smuggling');
    
    this.addResult(
      'Multiple Crimes',
      heatSystem.heat > beforeMultiple ? 'passed' : 'failed',
      `Heat accumulated: ${heatSystem.heat}`
    );
    
    // Test murder (high heat crime)
    heatSystem.resetHeat();
    heatSystem.commitCrime('murder');
    
    this.addResult(
      'High Heat Crime',
      heatSystem.heat >= 30 ? 'passed' : 'failed',
      `Murder heat: ${heatSystem.heat}`
    );
    
    // Test heat cap
    heatSystem.addHeat(200);
    
    this.addResult(
      'Heat Cap',
      heatSystem.heat === 100 ? 'passed' : 'failed',
      `Heat capped at: ${heatSystem.heat}`
    );
  }

  private async testWantedLevels() {
    console.log('\n⭐ Testing Wanted Levels...');
    
    const heatSystem = useHeatSystem.getState();
    
    // Test wanted level progression
    const levelTests = [
      { heat: 0, expectedLevel: 0, expectedName: 'Clean' },
      { heat: 15, expectedLevel: 1, expectedName: 'Suspicious' },
      { heat: 35, expectedLevel: 2, expectedName: 'Wanted' },
      { heat: 55, expectedLevel: 3, expectedName: 'High Priority' },
      { heat: 75, expectedLevel: 4, expectedName: 'Most Wanted' },
      { heat: 95, expectedLevel: 5, expectedName: 'Public Enemy' }
    ];
    
    levelTests.forEach(test => {
      heatSystem.heat = test.heat;
      heatSystem.updateWantedLevel();
      
      this.addResult(
        `Wanted Level at ${test.heat} heat`,
        heatSystem.wantedLevel === test.expectedLevel ? 'passed' : 'failed',
        `Level ${heatSystem.wantedLevel}: ${heatSystem.getWantedStatus().name}`
      );
    });
    
    // Test wanted status details
    heatSystem.heat = 60;
    heatSystem.updateWantedLevel();
    const status = heatSystem.getWantedStatus();
    
    this.addResult(
      'Wanted Status Details',
      status.level > 0 && status.encounterChance > 0 ? 'passed' : 'failed',
      `Encounter chance: ${(status.encounterChance * 100).toFixed(0)}%`
    );
    
    // Test price markup at high heat
    heatSystem.heat = 80;
    heatSystem.updateWantedLevel();
    const highHeatStatus = heatSystem.getWantedStatus();
    
    this.addResult(
      'Price Markup',
      highHeatStatus.priceMarkup > 0 ? 'passed' : 'failed',
      `Price markup: ${(highHeatStatus.priceMarkup * 100).toFixed(0)}%`
    );
  }

  private async testHeatDecay() {
    console.log('\n❄️ Testing Heat Decay...');
    
    const heatSystem = useHeatSystem.getState();
    
    // Test basic decay
    heatSystem.heat = 50;
    heatSystem.decayHeat(10);
    
    this.addResult(
      'Basic Heat Decay',
      heatSystem.heat === 40 ? 'passed' : 'failed',
      `Heat decayed to: ${heatSystem.heat}`
    );
    
    // Test decay over time
    heatSystem.heat = 60;
    heatSystem.lastCrimeTime = Date.now() - 60000; // 1 minute ago
    heatSystem.updateHeatDecay(60); // 60 seconds passed
    
    this.addResult(
      'Time-Based Decay',
      heatSystem.heat < 60 ? 'passed' : 'failed',
      `Heat after 1 minute: ${heatSystem.heat}`
    );
    
    // Test decay rate at different levels
    const decayTests = [
      { startHeat: 90, decayAmount: 5, expected: 'slower' },
      { startHeat: 50, decayAmount: 5, expected: 'normal' },
      { startHeat: 20, decayAmount: 5, expected: 'faster' }
    ];
    
    decayTests.forEach(test => {
      heatSystem.heat = test.startHeat;
      heatSystem.decayHeat(test.decayAmount);
      
      this.addResult(
        `Decay at ${test.startHeat} heat`,
        heatSystem.heat === test.startHeat - test.decayAmount ? 'passed' : 'failed',
        `${test.expected} decay rate`
      );
    });
    
    // Test minimum heat
    heatSystem.heat = 5;
    heatSystem.decayHeat(10);
    
    this.addResult(
      'Minimum Heat',
      heatSystem.heat === 0 ? 'passed' : 'failed',
      `Heat floor: ${heatSystem.heat}`
    );
    
    // Test lay low mechanic
    heatSystem.heat = 70;
    heatSystem.layLow(30); // Lay low for 30 seconds
    
    this.addResult(
      'Lay Low Mechanic',
      heatSystem.heat < 70 ? 'passed' : 'failed',
      `Heat after laying low: ${heatSystem.heat}`
    );
  }

  private async testPatrolSpawning() {
    console.log('\n🚔 Testing Patrol Spawning...');
    
    const heatSystem = useHeatSystem.getState();
    
    // Test patrol spawn at different heat levels
    heatSystem.heat = 10;
    heatSystem.updateWantedLevel();
    const lowHeatPatrols = heatSystem.shouldSpawnPatrol();
    
    this.addResult(
      'Low Heat Patrol Chance',
      typeof lowHeatPatrols === 'boolean' ? 'passed' : 'failed',
      `Should spawn at low heat: ${lowHeatPatrols}`
    );
    
    // Test high heat patrol spawning
    heatSystem.heat = 80;
    heatSystem.updateWantedLevel();
    const highHeatPatrols = heatSystem.shouldSpawnPatrol();
    
    this.addResult(
      'High Heat Patrol Spawn',
      typeof highHeatPatrols === 'boolean' ? 'passed' : 'failed',
      `Should spawn at high heat: ${highHeatPatrols} (likely)`
    );
    
    // Test patrol count management
    heatSystem.patrolsActive = 0;
    heatSystem.spawnPatrol();
    
    this.addResult(
      'Spawn Patrol',
      heatSystem.patrolsActive === 1 ? 'passed' : 'failed',
      `Active patrols: ${heatSystem.patrolsActive}`
    );
    
    // Test multiple patrols
    heatSystem.spawnPatrol();
    heatSystem.spawnPatrol();
    
    this.addResult(
      'Multiple Patrols',
      heatSystem.patrolsActive === 3 ? 'passed' : 'failed',
      `Patrol count: ${heatSystem.patrolsActive}`
    );
    
    // Test despawn patrol
    heatSystem.despawnPatrol();
    
    this.addResult(
      'Despawn Patrol',
      heatSystem.patrolsActive === 2 ? 'passed' : 'failed',
      `Remaining patrols: ${heatSystem.patrolsActive}`
    );
    
    // Test patrol limit
    heatSystem.heat = 100;
    heatSystem.updateWantedLevel();
    const maxPatrols = heatSystem.getMaxPatrols();
    
    this.addResult(
      'Max Patrol Limit',
      maxPatrols > 0 ? 'passed' : 'failed',
      `Max patrols at max heat: ${maxPatrols}`
    );
  }

  private async testHeatThresholds() {
    console.log('\n📏 Testing Heat Thresholds...');
    
    const heatSystem = useHeatSystem.getState();
    
    // Test threshold transitions
    const thresholds = [20, 40, 60, 80];
    let previousLevel = 0;
    
    thresholds.forEach(threshold => {
      heatSystem.heat = threshold;
      heatSystem.updateWantedLevel();
      
      this.addResult(
        `Threshold at ${threshold}`,
        heatSystem.wantedLevel > previousLevel ? 'passed' : 'failed',
        `Wanted level: ${heatSystem.wantedLevel}`
      );
      
      previousLevel = heatSystem.wantedLevel;
    });
    
    // Test just below threshold
    heatSystem.heat = 19;
    heatSystem.updateWantedLevel();
    const belowThreshold = heatSystem.wantedLevel;
    
    heatSystem.heat = 20;
    heatSystem.updateWantedLevel();
    const atThreshold = heatSystem.wantedLevel;
    
    this.addResult(
      'Threshold Boundary',
      atThreshold > belowThreshold ? 'passed' : 'failed',
      `Level changes at exact threshold`
    );
    
    // Test hysteresis (prevent flickering)
    heatSystem.heat = 40;
    heatSystem.updateWantedLevel();
    const level40 = heatSystem.wantedLevel;
    
    heatSystem.heat = 39;
    heatSystem.updateWantedLevel();
    const level39 = heatSystem.wantedLevel;
    
    this.addResult(
      'Hysteresis Check',
      Math.abs(level40 - level39) <= 1 ? 'passed' : 'failed',
      `Stable around thresholds`
    );
  }

  private async testHeatModifiers() {
    console.log('\n🎯 Testing Heat Modifiers...');
    
    const heatSystem = useHeatSystem.getState();
    const player = usePlayer.getState();
    
    // Test faction reputation effect on heat
    player.reputation.corporations = 80;
    heatSystem.heat = 50;
    const corpBonus = heatSystem.getFactionHeatModifier('corporations');
    
    this.addResult(
      'Corporation Heat Reduction',
      corpBonus <= 1.0 ? 'passed' : 'warning',
      `Corp modifier: ${corpBonus.toFixed(2)}x`
    );
    
    // Test outlaw reputation effect
    player.reputation.outlaws = 60;
    const outlawBonus = heatSystem.getFactionHeatModifier('outlaws');
    
    this.addResult(
      'Outlaw Heat Reduction',
      outlawBonus <= 1.0 ? 'passed' : 'warning',
      `Outlaw modifier: ${outlawBonus.toFixed(2)}x`
    );
    
    // Test location-based heat
    const stationModifier = heatSystem.getLocationHeatModifier('corporation_station');
    const lawlessModifier = heatSystem.getLocationHeatModifier('lawless_space');
    
    this.addResult(
      'Location Modifiers',
      stationModifier !== lawlessModifier ? 'passed' : 'warning',
      `Station: ${stationModifier}x, Lawless: ${lawlessModifier}x`
    );
    
    // Test crime severity modifiers
    const crimes = ['theft', 'assault', 'murder', 'piracy'];
    const severities = crimes.map(crime => heatSystem.getCrimeSeverity(crime));
    
    const increasingSeverity = severities.every((sev, i) => 
      i === 0 || sev >= severities[i - 1]
    );
    
    this.addResult(
      'Crime Severity Scale',
      increasingSeverity ? 'passed' : 'warning',
      `Severities: ${severities.join(', ')}`
    );
  }

  private async testHeatIntegration() {
    console.log('\n🔗 Testing Heat System Integration...');
    
    const heatSystem = useHeatSystem.getState();
    const player = usePlayer.getState();
    
    // Test heat affects player stats
    player.heat = 0;
    heatSystem.heat = 75;
    player.updateHeat(heatSystem.heat - player.heat);
    
    this.addResult(
      'Heat-Player Sync',
      player.heat === heatSystem.heat ? 'passed' : 'failed',
      `Player heat: ${player.heat}, System heat: ${heatSystem.heat}`
    );
    
    // Test heat affects notoriety
    const beforeNotoriety = player.notoriety;
    heatSystem.commitCrime('piracy');
    
    // Notoriety might increase with crimes
    this.addResult(
      'Heat-Notoriety Link',
      player.notoriety >= beforeNotoriety ? 'passed' : 'warning',
      `Notoriety: ${beforeNotoriety} -> ${player.notoriety}`
    );
    
    // Test complete heat clear
    heatSystem.heat = 90;
    heatSystem.patrolsActive = 5;
    heatSystem.clearAllHeat();
    
    this.addResult(
      'Clear All Heat',
      heatSystem.heat === 0 && heatSystem.patrolsActive === 0 ? 'passed' : 'failed',
      `Heat cleared: ${heatSystem.heat}, Patrols: ${heatSystem.patrolsActive}`
    );
    
    // Test bribe mechanic
    heatSystem.heat = 60;
    const bribeCost = heatSystem.calculateBribeCost();
    
    this.addResult(
      'Bribe Cost Calculation',
      bribeCost > 0 ? 'passed' : 'failed',
      `Bribe cost: ${bribeCost} credits`
    );
    
    // Test successful bribe
    if (bribeCost > 0) {
      const beforeBribe = heatSystem.heat;
      heatSystem.bribeAuthorities(bribeCost);
      
      this.addResult(
        'Bribe Authorities',
        heatSystem.heat < beforeBribe ? 'passed' : 'failed',
        `Heat after bribe: ${heatSystem.heat}`
      );
    }
  }

  private restoreOriginalState() {
    // Restore the original state
    if (this.originalState) {
      const heatSystem = useHeatSystem.getState();
      heatSystem.heat = this.originalState.heat || 0;
      heatSystem.wantedLevel = this.originalState.wantedLevel || 0;
      heatSystem.patrolsActive = this.originalState.patrolsActive || 0;
      heatSystem.lastCrimeTime = this.originalState.lastCrimeTime || 0;
    }
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private addResult(name: string, status: 'passed' | 'failed' | 'warning', message: string, details?: any) {
    this.results.push({ name, status, message, details });
    
    const emoji = status === 'passed' ? '✅' : status === 'failed' ? '❌' : '⚠️';
    const color = status === 'passed' ? '#10b981' : status === 'failed' ? '#ef4444' : '#f59e0b';
    console.log(`%c${emoji} ${name}: ${message}`, `color: ${color}`);
    
    if (details) {
      console.log('   Details:', details);
    }
  }

  private printSummary() {
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;
    const total = this.results.length;
    
    console.log('\n%c═══════════════════════════════════════════════', 'color: #8b5cf6');
    console.log('%c          HEAT STORE TEST SUMMARY', 'color: #8b5cf6; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════', 'color: #8b5cf6');
    console.log(`%c✅ Passed: ${passed}/${total}`, 'color: #10b981');
    console.log(`%c❌ Failed: ${failed}/${total}`, 'color: #ef4444');
    console.log(`%c⚠️ Warnings: ${warnings}/${total}`, 'color: #f59e0b');
    console.log('%c═══════════════════════════════════════════════', 'color: #8b5cf6');
    
    if (failed > 0) {
      console.log('\n%cFailed Tests:', 'color: #ef4444; font-weight: bold');
      this.results
        .filter(r => r.status === 'failed')
        .forEach(r => console.log(`  • ${r.name}: ${r.message}`));
    }
    
    if (warnings > 0) {
      console.log('\n%cWarnings:', 'color: #f59e0b; font-weight: bold');
      this.results
        .filter(r => r.status === 'warning')
        .forEach(r => console.log(`  • ${r.name}: ${r.message}`));
    }
  }
}

// Make it available globally for testing
(window as any).testHeatStore = () => {
  const testSuite = new HeatStoreTestSuite();
  testSuite.runAllTests();
};

console.log('%c🔥 Heat Store Test Suite Loaded!', 'color: #dc2626; font-weight: bold');
console.log('Run %ctestHeatStore()%c to execute tests', 'color: #3b82f6', 'color: inherit');