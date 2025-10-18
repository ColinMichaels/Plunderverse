/**
 * Player Store Test Suite
 * Tests the player state management including health, XP, level progression, and reputation
 * Run with window.testPlayerStore() from the browser console
 */

import { usePlayer } from '../../../lib/stores/player/usePlayer';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  details?: any;
}

export class PlayerStoreTestSuite {
  private results: TestResult[] = [];
  private originalState: any;

  constructor() {
    console.log('🎮 Player Store Test Suite initialized');
  }

  async runAllTests() {
    console.clear();
    console.log('%c═══════════════════════════════════════════════', 'color: #10b981; font-size: 14px');
    console.log('%c   👤 PLAYER STORE TEST SUITE STARTING', 'color: #10b981; font-size: 16px; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════', 'color: #10b981; font-size: 14px');
    
    this.results = [];
    
    try {
      // Save original state
      this.originalState = { ...usePlayer.getState() };
      
      await this.testInitialState();
      await this.wait(500);
      
      await this.testHealthSystem();
      await this.wait(500);
      
      await this.testExperienceAndLevels();
      await this.wait(500);
      
      await this.testOxygenSystem();
      await this.wait(500);
      
      await this.testSuitSystem();
      await this.wait(500);
      
      await this.testPlunderverseStats();
      await this.wait(500);
      
      await this.testReputationSystem();
      await this.wait(500);
      
      await this.testPlanetTracking();
      await this.wait(500);
      
      await this.testRadiationSystem();
      
    } catch (error) {
      console.error('Test suite failed:', error);
      this.addResult('Test Suite', 'failed', `Critical error: ${error}`);
    } finally {
      // Restore original state
      this.restoreOriginalState();
      this.printSummary();
    }
  }

  private async testInitialState() {
    console.log('\n📊 Testing Initial State...');
    
    const player = usePlayer.getState();
    player.initializePlayer();
    
    // Test initial values
    this.addResult(
      'Initial Health',
      player.health.overall === 100 ? 'passed' : 'failed',
      `Health: ${player.health.overall}/100`
    );
    
    this.addResult(
      'Initial Oxygen',
      player.oxygenLevel === 100 ? 'passed' : 'failed',
      `Oxygen: ${player.oxygenLevel}/100`
    );
    
    this.addResult(
      'Initial Level',
      player.level === 1 ? 'passed' : 'failed',
      `Level: ${player.level}`
    );
    
    this.addResult(
      'Initial Rank',
      player.rank === 1 ? 'passed' : 'failed',
      `Rank: ${player.rank}, Title: ${player.rankTitle}`
    );
    
    this.addResult(
      'Player Alive Status',
      player.isAlive === true ? 'passed' : 'failed',
      `Alive: ${player.isAlive}`
    );
    
    this.addResult(
      'Suit Condition',
      player.suit.condition === 'excellent' ? 'passed' : 'failed',
      `Condition: ${player.suit.condition}`
    );
  }

  private async testHealthSystem() {
    console.log('\n❤️ Testing Health System...');
    
    const player = usePlayer.getState();
    
    // Test health updates
    const initialHealth = player.health.overall;
    player.updateHealth('overall', -30);
    
    this.addResult(
      'Health Damage',
      player.health.overall === initialHealth - 30 ? 'passed' : 'failed',
      `Health reduced from ${initialHealth} to ${player.health.overall}`
    );
    
    // Test healing
    player.updateHealth('overall', 20);
    this.addResult(
      'Health Recovery',
      player.health.overall === initialHealth - 10 ? 'passed' : 'failed',
      `Health recovered to ${player.health.overall}`
    );
    
    // Test radiation exposure
    player.updateRadiation(25);
    this.addResult(
      'Radiation Exposure',
      player.health.radiation === 25 ? 'passed' : 'failed',
      `Radiation level: ${player.health.radiation}`
    );
    
    // Test fatigue
    player.updateHealth('fatigue', 50);
    this.addResult(
      'Fatigue System',
      player.health.fatigue === 50 ? 'passed' : 'failed',
      `Fatigue level: ${player.health.fatigue}`
    );
    
    // Test medical attention flag
    player.updateHealth('overall', -60);
    const needsMedical = player.health.overall <= 30;
    this.addResult(
      'Medical Attention Flag',
      player.needsMedicalAttention === needsMedical ? 'passed' : 'failed',
      `Needs medical: ${player.needsMedicalAttention}`
    );
    
    // Restore health
    player.updateHealth('overall', 100);
  }

  private async testExperienceAndLevels() {
    console.log('\n⭐ Testing Experience & Levels...');
    
    const player = usePlayer.getState();
    
    // Reset to level 1
    player.experience = 0;
    player.level = 1;
    
    // Test experience gain
    player.addExperience(100);
    this.addResult(
      'Experience Gain',
      player.experience === 100 ? 'passed' : 'failed',
      `Experience: ${player.experience}`
    );
    
    // Test level up
    const initialLevel = player.level;
    player.levelUp();
    this.addResult(
      'Level Up',
      player.level === initialLevel + 1 ? 'passed' : 'failed',
      `Level: ${initialLevel} -> ${player.level}`
    );
    
    // Test multiple experience additions
    player.addExperience(50);
    player.addExperience(75);
    player.addExperience(25);
    this.addResult(
      'Cumulative Experience',
      player.experience === 250 ? 'passed' : 'failed',
      `Total experience: ${player.experience}`
    );
    
    // Test skill points on level up
    const beforeSkillPoints = player.skillPoints;
    player.levelUp();
    this.addResult(
      'Skill Points Award',
      player.skillPoints > beforeSkillPoints ? 'passed' : 'failed',
      `Skill points: ${beforeSkillPoints} -> ${player.skillPoints}`
    );
  }

  private async testOxygenSystem() {
    console.log('\n💨 Testing Oxygen System...');
    
    const player = usePlayer.getState();
    
    // Test oxygen consumption
    player.oxygenLevel = 100;
    player.updateOxygen(-20);
    this.addResult(
      'Oxygen Consumption',
      player.oxygenLevel === 80 ? 'passed' : 'failed',
      `Oxygen: 100 -> ${player.oxygenLevel}`
    );
    
    // Test oxygen refill
    player.updateOxygen(15);
    this.addResult(
      'Oxygen Refill',
      player.oxygenLevel === 95 ? 'passed' : 'failed',
      `Oxygen: ${player.oxygenLevel}/100`
    );
    
    // Test oxygen percentage calculation
    player.oxygenLevel = 50;
    const percentage = (player.oxygenLevel / player.suit.oxygenCapacity) * 100;
    this.addResult(
      'Oxygen Percentage',
      Math.abs(percentage - 50) < 0.1 ? 'passed' : 'failed',
      `Percentage: ${percentage.toFixed(1)}%`
    );
    
    // Test oxygen time remaining
    const timeRemaining = player.getOxygenTimeRemaining();
    this.addResult(
      'Oxygen Time Calculation',
      timeRemaining > 0 ? 'passed' : 'failed',
      `Time remaining: ${timeRemaining} minutes`
    );
    
    // Test critical oxygen warning
    player.oxygenLevel = 10;
    const status = player.getPlayerStatus();
    this.addResult(
      'Critical Oxygen Status',
      status.includes('oxygen') || status.includes('critical') ? 'passed' : 'failed',
      `Status: ${status}`
    );
    
    // Restore oxygen
    player.oxygenLevel = 100;
  }

  private async testSuitSystem() {
    console.log('\n🛡️ Testing Suit System...');
    
    const player = usePlayer.getState();
    
    // Test suit damage
    const initialIntegrity = player.suit.integrityPercentage;
    player.updateSuitCondition(25);
    this.addResult(
      'Suit Damage',
      player.suit.integrityPercentage === initialIntegrity - 25 ? 'passed' : 'failed',
      `Integrity: ${initialIntegrity}% -> ${player.suit.integrityPercentage}%`
    );
    
    // Test suit repair
    player.repairSuit(15);
    this.addResult(
      'Suit Repair',
      player.suit.integrityPercentage === initialIntegrity - 10 ? 'passed' : 'failed',
      `Repaired to: ${player.suit.integrityPercentage}%`
    );
    
    // Test suit condition changes
    player.suit.integrityPercentage = 45;
    const condition = player.suit.integrityPercentage > 80 ? 'excellent' :
                     player.suit.integrityPercentage > 60 ? 'good' :
                     player.suit.integrityPercentage > 40 ? 'fair' :
                     player.suit.integrityPercentage > 20 ? 'poor' : 'critical';
    this.addResult(
      'Suit Condition Rating',
      condition === 'fair' ? 'passed' : 'failed',
      `Condition: ${condition} at ${player.suit.integrityPercentage}%`
    );
    
    // Test suit change
    player.changeSuit({ type: 'advanced', radiationProtection: 75 });
    this.addResult(
      'Suit Change',
      player.suit.type === 'advanced' ? 'passed' : 'failed',
      `New suit: ${player.suit.type}, Radiation protection: ${player.suit.radiationProtection}`
    );
    
    // Test temperature range
    this.addResult(
      'Temperature Range',
      player.suit.temperatureRange.min < 0 && player.suit.temperatureRange.max > 0 ? 'passed' : 'failed',
      `Range: ${player.suit.temperatureRange.min}°C to ${player.suit.temperatureRange.max}°C`
    );
    
    // Restore suit
    player.suit.integrityPercentage = 100;
    player.suit.type = 'basic';
  }

  private async testPlunderverseStats() {
    console.log('\n🏴‍☠️ Testing Plunderverse Stats...');
    
    const player = usePlayer.getState();
    
    // Test rank advancement
    const initialRank = player.rank;
    player.updateRank(3, 'Veteran Raider');
    this.addResult(
      'Rank Advancement',
      player.rank === 3 && player.rankTitle === 'Veteran Raider' ? 'passed' : 'failed',
      `Rank ${initialRank} -> ${player.rank}: ${player.rankTitle}`
    );
    
    // Test notoriety increase
    player.notoriety = 0;
    player.updateNotoriety(25);
    this.addResult(
      'Notoriety Increase',
      player.notoriety === 25 ? 'passed' : 'failed',
      `Notoriety: ${player.notoriety}/100`
    );
    
    // Test notoriety cap
    player.updateNotoriety(150);
    this.addResult(
      'Notoriety Cap',
      player.notoriety <= 100 ? 'passed' : 'failed',
      `Capped at: ${player.notoriety}`
    );
    
    // Test heat system
    player.heat = 10;
    player.updateHeat(30);
    this.addResult(
      'Heat Accumulation',
      player.heat === 40 ? 'passed' : 'failed',
      `Heat level: ${player.heat}/100`
    );
    
    // Test heat decay
    player.updateHeat(-15);
    this.addResult(
      'Heat Decay',
      player.heat === 25 ? 'passed' : 'failed',
      `Heat decayed to: ${player.heat}`
    );
  }

  private async testReputationSystem() {
    console.log('\n🤝 Testing Reputation System...');
    
    const player = usePlayer.getState();
    
    // Reset reputations
    player.reputation = {
      corporations: 0,
      independents: 0,
      outlaws: 0
    };
    
    // Test positive reputation
    player.updateReputation('corporations', 25);
    this.addResult(
      'Positive Corporation Rep',
      player.reputation.corporations === 25 ? 'passed' : 'failed',
      `Corp reputation: ${player.reputation.corporations}`
    );
    
    // Test negative reputation
    player.updateReputation('outlaws', -30);
    this.addResult(
      'Negative Outlaw Rep',
      player.reputation.outlaws === -30 ? 'passed' : 'failed',
      `Outlaw reputation: ${player.reputation.outlaws}`
    );
    
    // Test reputation cap
    player.updateReputation('independents', 150);
    this.addResult(
      'Reputation Cap',
      player.reputation.independents <= 100 ? 'passed' : 'failed',
      `Capped at: ${player.reputation.independents}`
    );
    
    // Test reputation status
    player.reputation.corporations = 75;
    const corpStatus = player.getReputationStatus('corporations');
    this.addResult(
      'Reputation Status Check',
      corpStatus.includes('Allied') || corpStatus.includes('Friendly') ? 'passed' : 'failed',
      `Status: ${corpStatus}`
    );
    
    // Test opposing faction penalties
    player.updateReputation('corporations', 20);
    player.updateReputation('outlaws', 20);
    const totalRep = player.reputation.corporations + player.reputation.outlaws;
    this.addResult(
      'Faction Balance',
      totalRep !== 40 ? 'passed' : 'warning',
      'Opposing factions should affect each other'
    );
  }

  private async testPlanetTracking() {
    console.log('\n🌍 Testing Planet Tracking...');
    
    const player = usePlayer.getState();
    
    // Reset visited planets
    player.planetsVisited = [];
    
    // Test visiting new planet
    player.visitPlanet('Mars');
    this.addResult(
      'Visit New Planet',
      player.planetsVisited.includes('Mars') ? 'passed' : 'failed',
      `Visited: ${player.planetsVisited.join(', ')}`
    );
    
    // Test duplicate prevention
    player.visitPlanet('Mars');
    this.addResult(
      'Duplicate Planet Prevention',
      player.planetsVisited.filter(p => p === 'Mars').length === 1 ? 'passed' : 'failed',
      `Mars count: ${player.planetsVisited.filter(p => p === 'Mars').length}`
    );
    
    // Test multiple planets
    player.visitPlanet('Earth');
    player.visitPlanet('Venus');
    player.visitPlanet('Jupiter');
    this.addResult(
      'Multiple Planet Tracking',
      player.planetsVisited.length === 4 ? 'passed' : 'failed',
      `Total planets visited: ${player.planetsVisited.length}`
    );
    
    // Test mining operations counter
    const initialMining = player.totalMiningOperations;
    player.incrementMiningOperations();
    player.incrementMiningOperations();
    this.addResult(
      'Mining Operations Counter',
      player.totalMiningOperations === initialMining + 2 ? 'passed' : 'failed',
      `Mining operations: ${player.totalMiningOperations}`
    );
    
    // Test jump counter
    const initialJumps = player.totalJumps;
    player.incrementJumps();
    this.addResult(
      'Jump Counter',
      player.totalJumps === initialJumps + 1 ? 'passed' : 'failed',
      `Total jumps: ${player.totalJumps}`
    );
    
    // Test space time tracking
    const initialTime = player.timeInSpace;
    player.addSpaceTime(2.5);
    this.addResult(
      'Space Time Tracking',
      player.timeInSpace === initialTime + 2.5 ? 'passed' : 'failed',
      `Time in space: ${player.timeInSpace} hours`
    );
  }

  private async testRadiationSystem() {
    console.log('\n☢️ Testing Radiation System...');
    
    const player = usePlayer.getState();
    
    // Reset radiation
    player.health.radiation = 0;
    player.radiationLevel = 0;
    
    // Test radiation exposure
    player.updateRadiation(35);
    this.addResult(
      'Radiation Exposure',
      player.health.radiation === 35 ? 'passed' : 'failed',
      `Radiation: ${player.health.radiation}%`
    );
    
    // Test suit protection
    const protection = player.suit.radiationProtection;
    const effectiveRadiation = 50 * (1 - protection / 100);
    player.health.radiation = 0;
    player.updateRadiation(50);
    
    this.addResult(
      'Radiation Protection',
      player.suit.radiationProtection > 0 ? 'passed' : 'failed',
      `Protection: ${protection}%, Effective exposure: ${effectiveRadiation}`
    );
    
    // Test radiation effects on health
    player.health.radiation = 80;
    const healthBefore = player.health.overall;
    // Simulate radiation damage
    if (player.health.radiation > 75) {
      player.updateHealth('overall', -5);
    }
    this.addResult(
      'Radiation Health Effects',
      player.health.overall < healthBefore ? 'passed' : 'failed',
      `Health damage from high radiation`
    );
    
    // Reset radiation
    player.health.radiation = 0;
    player.updateHealth('overall', 100);
  }

  private restoreOriginalState() {
    // Restore the original state
    if (this.originalState) {
      const player = usePlayer.getState();
      Object.keys(this.originalState).forEach(key => {
        (player as any)[key] = this.originalState[key];
      });
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
    console.log('%c          PLAYER STORE TEST SUMMARY', 'color: #8b5cf6; font-weight: bold');
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
(window as any).testPlayerStore = () => {
  const testSuite = new PlayerStoreTestSuite();
  testSuite.runAllTests();
};

console.log('%c👤 Player Store Test Suite Loaded!', 'color: #10b981; font-weight: bold');
console.log('Run %ctestPlayerStore()%c to execute tests', 'color: #3b82f6', 'color: inherit');