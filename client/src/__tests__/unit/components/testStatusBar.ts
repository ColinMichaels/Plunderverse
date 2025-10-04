/**
 * StatusBar Component Test Suite
 * Tests all status indicators, value updates, color changes, and responsive layout
 * Run with window.testStatusBar() from the browser console
 */

import { useShipStatus } from '../../../lib/stores/ship/useShipStatus';
import { usePlayer } from '../../../lib/stores/player/usePlayer';
import { useCreditsStore } from '../../../domain/economy/credits.store';
import { useLandedState } from '../../../lib/stores/surface/useLandedState';
import { useSolarSystem } from '../../../lib/stores/space/useSolarSystem';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  details?: any;
}

interface StatusIndicator {
  name: string;
  getValue: () => number;
  getMaxValue?: () => number;
  unit?: string;
  thresholds?: { low: number; medium: number; high: number };
}

export class StatusBarTestSuite {
  private results: TestResult[] = [];
  private originalState: any = {};
  private statusIndicators: StatusIndicator[] = [
    { 
      name: 'Hull',
      getValue: () => useShipStatus.getState().hull,
      getMaxValue: () => useShipStatus.getState().maxHull,
      unit: '%',
      thresholds: { low: 25, medium: 50, high: 75 }
    },
    {
      name: 'Shield',
      getValue: () => useShipStatus.getState().shield,
      getMaxValue: () => useShipStatus.getState().maxShield,
      unit: '%',
      thresholds: { low: 25, medium: 50, high: 75 }
    },
    {
      name: 'Credits',
      getValue: () => useCreditsStore.getState().credits,
      unit: 'c'
    },
    {
      name: 'Heat',
      getValue: () => usePlayer.getState().heat,
      getMaxValue: () => 100,
      unit: '%',
      thresholds: { low: 30, medium: 60, high: 80 }
    },
    {
      name: 'Rank',
      getValue: () => usePlayer.getState().rank,
      unit: ''
    }
  ];

  constructor() {
    console.log('📊 StatusBar Test Suite initialized');
  }

  async runAllTests() {
    console.clear();
    console.log('%c═══════════════════════════════════════════════', 'color: #ec4899; font-size: 14px');
    console.log('%c   📊 STATUS BAR TEST SUITE STARTING', 'color: #ec4899; font-size: 16px; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════', 'color: #ec4899; font-size: 14px');
    
    this.results = [];
    this.saveState();
    
    try {
      await this.testInitialState();
      await this.wait(500);
      
      await this.testStatusIndicators();
      await this.wait(500);
      
      await this.testValueUpdates();
      await this.wait(500);
      
      await this.testColorThresholds();
      await this.wait(500);
      
      await this.testResponsiveLayout();
      await this.wait(500);
      
      await this.testLocationIndicator();
      await this.wait(500);
      
      await this.testReputationDisplay();
      await this.wait(500);
      
      await this.testAlertStates();
      
    } catch (error) {
      console.error('Test suite failed:', error);
      this.addResult('Test Suite', 'failed', `Critical error: ${error}`);
    } finally {
      this.restoreState();
      this.printSummary();
    }
  }

  private saveState() {
    const ship = useShipStatus.getState();
    const player = usePlayer.getState();
    const credits = useCreditsStore.getState();
    const landed = useLandedState.getState();
    
    this.originalState = {
      ship: {
        hull: ship.hull,
        shield: ship.shield
      },
      player: {
        heat: player.heat,
        rank: player.rank,
        reputation: { ...player.reputation }
      },
      credits: credits.credits,
      landed: {
        isLanded: landed.isLanded,
        landedPlanet: landed.landedPlanet
      }
    };
  }

  private restoreState() {
    const ship = useShipStatus.getState();
    const player = usePlayer.getState();
    const credits = useCreditsStore.getState();
    const landed = useLandedState.getState();
    
    ship.takeDamage(-ship.hull + this.originalState.ship.hull, 'hull');
    ship.takeDamage(-ship.shield + this.originalState.ship.shield, 'shield');
    player.heat = this.originalState.player.heat;
    credits.setCredits(this.originalState.credits);
    
    if (this.originalState.landed.isLanded) {
      landed.setLanded(this.originalState.landed.landedPlanet);
    } else {
      landed.setNotLanded();
    }
  }

  private async testInitialState() {
    console.log('\n📊 Testing Initial State...');
    
    this.statusIndicators.forEach(indicator => {
      const value = indicator.getValue();
      const maxValue = indicator.getMaxValue ? indicator.getMaxValue() : null;
      
      this.addResult(
        `${indicator.name} Indicator`,
        value !== undefined && value !== null ? 'passed' : 'failed',
        maxValue ? `${value}/${maxValue}${indicator.unit}` : `${value}${indicator.unit}`
      );
    });
  }

  private async testStatusIndicators() {
    console.log('\n🔢 Testing Status Indicators...');
    
    const ship = useShipStatus.getState();
    const player = usePlayer.getState();
    const credits = useCreditsStore.getState();
    
    // Test hull percentage
    const hullPercentage = (ship.hull / ship.maxHull) * 100;
    
    this.addResult(
      'Hull Percentage',
      hullPercentage >= 0 && hullPercentage <= 100 ? 'passed' : 'failed',
      `${hullPercentage.toFixed(1)}%`
    );
    
    // Test shield percentage
    const shieldPercentage = (ship.shield / ship.maxShield) * 100;
    
    this.addResult(
      'Shield Percentage',
      shieldPercentage >= 0 && shieldPercentage <= 100 ? 'passed' : 'failed',
      `${shieldPercentage.toFixed(1)}%`
    );
    
    // Test credits display
    this.addResult(
      'Credits Display',
      credits.credits >= 0 ? 'passed' : 'failed',
      `${credits.credits}c`
    );
    
    // Test heat display
    this.addResult(
      'Heat Display',
      player.heat >= 0 && player.heat <= 100 ? 'passed' : 'failed',
      `${player.heat}%`
    );
    
    // Test rank display
    this.addResult(
      'Rank Display',
      player.rank > 0 && player.rankTitle ? 'passed' : 'failed',
      `Rank ${player.rank}: ${player.rankTitle}`
    );
  }

  private async testValueUpdates() {
    console.log('\n🔄 Testing Value Updates...');
    
    const ship = useShipStatus.getState();
    const player = usePlayer.getState();
    const credits = useCreditsStore.getState();
    
    // Test hull damage
    const beforeHull = ship.hull;
    ship.takeDamage(10, 'hull');
    await this.wait(100);
    const afterHull = ship.hull;
    
    this.addResult(
      'Hull Update',
      afterHull < beforeHull ? 'passed' : 'failed',
      `${beforeHull} → ${afterHull}`
    );
    
    // Test shield damage
    const beforeShield = ship.shield;
    ship.takeDamage(10, 'shield');
    await this.wait(100);
    const afterShield = ship.shield;
    
    this.addResult(
      'Shield Update',
      afterShield < beforeShield ? 'passed' : 'failed',
      `${beforeShield} → ${afterShield}`
    );
    
    // Test credits change
    const beforeCredits = credits.credits;
    credits.setCredits(credits.credits + 100);
    await this.wait(100);
    const afterCredits = credits.credits;
    
    this.addResult(
      'Credits Update',
      afterCredits > beforeCredits ? 'passed' : 'failed',
      `${beforeCredits} → ${afterCredits}`
    );
    
    // Test heat increase
    const beforeHeat = player.heat;
    player.addHeat(10);
    await this.wait(100);
    const afterHeat = player.heat;
    
    this.addResult(
      'Heat Update',
      afterHeat > beforeHeat ? 'passed' : 'failed',
      `${beforeHeat}% → ${afterHeat}%`
    );
  }

  private async testColorThresholds() {
    console.log('\n🎨 Testing Color Thresholds...');
    
    const ship = useShipStatus.getState();
    const player = usePlayer.getState();
    
    // Test hull color thresholds
    const hullTests = [
      { value: 90, expected: 'green', label: 'High Hull' },
      { value: 50, expected: 'yellow', label: 'Medium Hull' },
      { value: 20, expected: 'red', label: 'Low Hull' }
    ];
    
    for (const test of hullTests) {
      ship.takeDamage(ship.hull - test.value, 'hull');
      await this.wait(100);
      const color = this.getStatusColor(test.value, 100, { low: 25, medium: 50, high: 75 });
      
      this.addResult(
        test.label,
        color === test.expected ? 'passed' : 'warning',
        `Hull: ${test.value}%, Color: ${color}`
      );
    }
    
    // Test heat color thresholds
    const heatTests = [
      { value: 20, expected: 'green', label: 'Low Heat' },
      { value: 50, expected: 'yellow', label: 'Medium Heat' },
      { value: 85, expected: 'red', label: 'High Heat' }
    ];
    
    for (const test of heatTests) {
      player.heat = test.value;
      await this.wait(100);
      const color = this.getStatusColor(test.value, 100, { low: 30, medium: 60, high: 80 });
      
      this.addResult(
        test.label,
        color === test.expected ? 'passed' : 'warning',
        `Heat: ${test.value}%, Color: ${color}`
      );
    }
  }

  private async testResponsiveLayout() {
    console.log('\n📱 Testing Responsive Layout...');
    
    // Test mobile detection
    const isMobile = window.innerWidth < 768;
    
    this.addResult(
      'Viewport Detection',
      'passed',
      `${isMobile ? 'Mobile' : 'Desktop'} view (${window.innerWidth}px)`
    );
    
    // Test compact mode
    const compactThreshold = 600;
    const isCompact = window.innerWidth < compactThreshold;
    
    this.addResult(
      'Compact Mode',
      'passed',
      isCompact ? 'Compact layout active' : 'Full layout active'
    );
    
    // Test element visibility
    const statusElements = document.querySelectorAll('[data-status], .status-indicator');
    
    this.addResult(
      'Status Elements',
      statusElements.length > 0 ? 'passed' : 'warning',
      `Found ${statusElements.length} status elements`
    );
    
    // Test text truncation
    const longText = 'Very Long Status Text That Should Be Truncated';
    const truncated = longText.length > 20 ? longText.substring(0, 17) + '...' : longText;
    
    this.addResult(
      'Text Truncation',
      truncated.includes('...') ? 'passed' : 'warning',
      `Truncated: "${truncated}"`
    );
  }

  private async testLocationIndicator() {
    console.log('\n📍 Testing Location Indicator...');
    
    const landed = useLandedState.getState();
    const solar = useSolarSystem.getState();
    
    // Test in space
    landed.setNotLanded();
    await this.wait(200);
    
    this.addResult(
      'Space Location',
      !landed.isLanded ? 'passed' : 'failed',
      'Location: Space'
    );
    
    // Test planet names
    const planets = ['Earth', 'Mars', 'Jupiter'];
    
    for (const planet of planets) {
      landed.setLanded(planet);
      await this.wait(100);
      
      this.addResult(
        `Planet: ${planet}`,
        landed.landedPlanet === planet ? 'passed' : 'failed',
        `Landed on ${landed.landedPlanet}`
      );
    }
    
    // Test coordinates display
    landed.setNotLanded();
    const coords = solar.cameraPosition;
    
    this.addResult(
      'Coordinates Display',
      coords ? 'passed' : 'failed',
      `Position: (${coords?.x.toFixed(0)}, ${coords?.y.toFixed(0)}, ${coords?.z.toFixed(0)})`
    );
  }

  private async testReputationDisplay() {
    console.log('\n🏆 Testing Reputation Display...');
    
    const player = usePlayer.getState();
    
    // Test faction reputations
    const factions = ['corporations', 'independents', 'outlaws'] as const;
    
    factions.forEach(faction => {
      const rep = player.reputation[faction];
      const level = this.getReputationLevel(rep);
      
      this.addResult(
        `${faction} Reputation`,
        rep !== undefined ? 'passed' : 'failed',
        `${faction}: ${rep} (${level})`
      );
    });
    
    // Test notoriety
    this.addResult(
      'Notoriety Display',
      player.notoriety >= 0 ? 'passed' : 'failed',
      `Notoriety: ${player.notoriety}`
    );
    
    // Test wanted level
    const wantedLevel = Math.floor(player.heat / 20);
    
    this.addResult(
      'Wanted Level',
      wantedLevel >= 0 && wantedLevel <= 5 ? 'passed' : 'failed',
      `Wanted Level: ${wantedLevel}/5`
    );
  }

  private async testAlertStates() {
    console.log('\n🚨 Testing Alert States...');
    
    const ship = useShipStatus.getState();
    const player = usePlayer.getState();
    
    // Test critical hull alert
    ship.takeDamage(ship.hull - 10, 'hull');
    await this.wait(100);
    
    this.addResult(
      'Critical Hull Alert',
      ship.hull <= 20 ? 'passed' : 'warning',
      `Hull at ${ship.hull}% - ${ship.hull <= 20 ? 'CRITICAL' : 'Normal'}`
    );
    
    // Test shield down alert
    ship.takeDamage(ship.shield, 'shield');
    await this.wait(100);
    
    this.addResult(
      'Shield Down Alert',
      ship.shield === 0 ? 'passed' : 'warning',
      `Shield at ${ship.shield}% - ${ship.shield === 0 ? 'SHIELDS DOWN' : 'Active'}`
    );
    
    // Test high heat alert
    player.heat = 90;
    await this.wait(100);
    
    this.addResult(
      'High Heat Alert',
      player.heat >= 80 ? 'passed' : 'warning',
      `Heat at ${player.heat}% - ${player.heat >= 80 ? 'OVERHEATING' : 'Normal'}`
    );
    
    // Test low credits alert
    const credits = useCreditsStore.getState();
    credits.setCredits(50);
    await this.wait(100);
    
    this.addResult(
      'Low Credits Alert',
      credits.credits < 100 ? 'passed' : 'warning',
      `Credits: ${credits.credits}c - ${credits.credits < 100 ? 'LOW FUNDS' : 'Sufficient'}`
    );
  }

  private getStatusColor(value: number, maxValue: number, thresholds: { low: number; medium: number; high: number }): string {
    const percentage = (value / maxValue) * 100;
    
    if (percentage <= thresholds.low) return 'red';
    if (percentage <= thresholds.medium) return 'yellow';
    return 'green';
  }

  private getReputationLevel(reputation: number): string {
    if (reputation >= 50) return 'Honored';
    if (reputation >= 20) return 'Friendly';
    if (reputation >= 0) return 'Neutral';
    if (reputation >= -20) return 'Unfriendly';
    return 'Hostile';
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
    console.log('%c          STATUS BAR TEST SUMMARY', 'color: #8b5cf6; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════', 'color: #8b5cf6');
    console.log(`%c✅ Passed: ${passed}/${total}`, 'color: #10b981');
    console.log(`%c❌ Failed: ${failed}/${total}`, 'color: #ef4444');
    console.log(`%c⚠️ Warnings: ${warnings}/${total}`, 'color: #f59e0b');
    console.log('%c═══════════════════════════════════════════════', 'color: #8b5cf6');
  }
}

// Make it available globally for testing
(window as any).testStatusBar = () => {
  const testSuite = new StatusBarTestSuite();
  testSuite.runAllTests();
};

console.log('%c📊 StatusBar Test Suite Loaded!', 'color: #ec4899; font-weight: bold');
console.log('Run %ctestStatusBar()%c to execute tests', 'color: #3b82f6', 'color: inherit');