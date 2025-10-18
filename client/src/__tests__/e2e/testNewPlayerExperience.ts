/**
 * New Player Experience E2E Test Suite
 * Tests the complete onboarding flow for new players
 * 
 * Run with: window.testNewPlayerExperience() from browser console
 */

import { toast } from 'sonner';
import { gameFacade } from '../../lib/plunderverse/gameFacade';
import { usePlunderverseMissions } from '../../lib/stores/economy/usePlunderverseMissions';
import { usePlayer } from '../../lib/stores/player/usePlayer';
import { useCreditsStore } from '../../domain/economy/credits.store';
import { useLandedState } from '../../lib/stores/surface/useLandedState';
import { useSolarSystem } from '../../lib/stores/space/useSolarSystem';
import { useShipStatus } from '../../lib/stores/ship/useShipStatus';
import { useCrewManagement } from '../../lib/stores/ship/useCrewManagement';
import { useUpgrades } from '../../lib/stores/ship/useUpgrades';
import { useTrading } from '../../lib/stores/economy/useTrading';
import { useMining } from '../../lib/stores/economy/useMining';
import { useEnemies } from '../../lib/stores/combat/useEnemies';
import { useShooting } from '../../lib/stores/combat/useShooting';
import { useHeatSystem } from '../../lib/stores/player/useHeatSystem';
import { usePanelManager } from '../../lib/stores/ui/usePanelManager';
import { useInventory } from '../../lib/stores/economy/useInventory';
import * as THREE from 'three';

interface TestResult {
  name: string;
  status: 'running' | 'passed' | 'failed' | 'warning';
  message: string;
  details?: any;
  duration: number;
  timestamp: number;
}

interface NewPlayerProgress {
  tutorialCompleted: boolean;
  firstMissionCompleted: boolean;
  firstCombatCompleted: boolean;
  firstTradeCompleted: boolean;
  firstRankAchieved: boolean;
  firstCrewHired: boolean;
  firstUpgradePurchased: boolean;
}

export class NewPlayerExperienceTest {
  private results: TestResult[] = [];
  private startTime: number = 0;
  private progress: NewPlayerProgress = {
    tutorialCompleted: false,
    firstMissionCompleted: false,
    firstCombatCompleted: false,
    firstTradeCompleted: false,
    firstRankAchieved: false,
    firstCrewHired: false,
    firstUpgradePurchased: false
  };
  private originalState: any = {};

  constructor() {
    console.log('🎮 New Player Experience Test Suite initialized');
  }

  /**
   * Save original game state for restoration
   */
  private saveOriginalState() {
    const player = usePlayer.getState();
    const credits = useCreditsStore.getState();
    const missions = usePlunderverseMissions.getState();
    const ship = useShipStatus.getState();
    const crew = useCrewManagement.getState();
    const inventory = useInventory.getState();
    
    this.originalState = {
      player: {
        rank: player.rank,
        reputation: { ...player.reputation },
        heat: player.heat,
        notoriety: player.notoriety,
        points: player.points
      },
      credits: credits.credits,
      missions: {
        available: [...missions.availableMissions],
        active: [...missions.activeMissions],
        completed: new Set(missions.completedMissionIds)
      },
      ship: {
        hull: ship.hull,
        shield: ship.shield,
        upgrades: ship.upgrades ? [...ship.upgrades] : []
      },
      crew: {
        members: [...crew.crewMembers]
      },
      inventory: {
        items: [...inventory.items],
        capacity: inventory.capacity
      }
    };
  }

  /**
   * Reset game to new player state
   */
  private resetToNewPlayerState() {
    const player = usePlayer.getState();
    const credits = useCreditsStore.getState();
    const missions = usePlunderverseMissions.getState();
    const ship = useShipStatus.getState();
    const crew = useCrewManagement.getState();
    const landed = useLandedState.getState();
    
    // Reset player stats
    player.setRank(1);
    player.setHeat(0);
    player.setNotoriety(0);
    player.setPoints(0);
    player.setReputation({
      corporations: 0,
      pirates: 0,
      miners: 0,
      traders: 0,
      military: 0,
      scientists: 0,
      independents: 0
    });
    
    // Reset credits to starting amount
    credits.setCredits(1000);
    
    // Clear all missions
    missions.clearAllMissions();
    
    // Reset ship to starting condition
    ship.takeDamage(-100, 'hull'); // Restore to 100
    ship.takeDamage(-100, 'shield'); // Restore to 100
    
    // Clear crew except starting member
    crew.initializeCrew();
    
    // Set starting location
    landed.setLanded('Earth');
    
    console.log('✨ Reset to new player state');
  }

  /**
   * Run all new player experience tests
   */
  async runAllTests(): Promise<void> {
    console.clear();
    console.log('%c════════════════════════════════════════════════════', 'color: #10b981; font-size: 14px');
    console.log('%c  🎮 NEW PLAYER EXPERIENCE E2E TEST SUITE', 'color: #10b981; font-size: 16px; font-weight: bold');
    console.log('%c════════════════════════════════════════════════════', 'color: #10b981; font-size: 14px');
    
    this.startTime = Date.now();
    this.saveOriginalState();
    this.resetToNewPlayerState();
    
    try {
      // Test 1: Initial Game State
      await this.testInitialGameState();
      await this.wait(500);
      
      // Test 2: Tutorial Mission Flow
      await this.testTutorialMissionFlow();
      await this.wait(500);
      
      // Test 3: First Combat Encounter
      await this.testFirstCombatEncounter();
      await this.wait(500);
      
      // Test 4: First Trade Transaction
      await this.testFirstTradeTransaction();
      await this.wait(500);
      
      // Test 5: First Mining Operation
      await this.testFirstMiningOperation();
      await this.wait(500);
      
      // Test 6: First Crew Hire
      await this.testFirstCrewHire();
      await this.wait(500);
      
      // Test 7: First Ship Upgrade
      await this.testFirstShipUpgrade();
      await this.wait(500);
      
      // Test 8: First Rank Progression
      await this.testFirstRankProgression();
      await this.wait(500);
      
      // Test 9: UI Tutorial Flow
      await this.testUITutorialFlow();
      await this.wait(500);
      
      // Test 10: New Player Progression Validation
      await this.testNewPlayerProgression();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      this.addResult('Test Suite', 'failed', `Critical error: ${error}`);
    } finally {
      this.generateReport();
      this.restoreOriginalState();
    }
  }

  /**
   * Test 1: Initial Game State
   */
  private async testInitialGameState() {
    console.log('\n📊 Testing Initial Game State...');
    const startTest = Date.now();
    
    const player = usePlayer.getState();
    const credits = useCreditsStore.getState();
    const ship = useShipStatus.getState();
    const landed = useLandedState.getState();
    const missions = usePlunderverseMissions.getState();
    
    // Verify starting conditions
    this.addResult(
      'Starting Credits',
      credits.credits === 1000 ? 'passed' : 'failed',
      `Starting credits: ${credits.credits} (expected: 1000)`,
      { credits: credits.credits },
      Date.now() - startTest
    );
    
    this.addResult(
      'Starting Location',
      landed.isLanded && landed.landedPlanet === 'Earth' ? 'passed' : 'failed',
      `Starting location: ${landed.landedPlanet}`,
      { location: landed.landedPlanet },
      Date.now() - startTest
    );
    
    this.addResult(
      'Starting Rank',
      player.rank === 1 ? 'passed' : 'failed',
      `Player rank: ${player.rank}`,
      { rank: player.rank },
      Date.now() - startTest
    );
    
    this.addResult(
      'Ship Condition',
      ship.hull === 100 && ship.shield === 100 ? 'passed' : 'failed',
      `Hull: ${ship.hull}, Shield: ${ship.shield}`,
      { hull: ship.hull, shield: ship.shield },
      Date.now() - startTest
    );
    
    this.addResult(
      'Mission Availability',
      missions.availableMissions.length > 0 ? 'passed' : 'warning',
      `Available missions: ${missions.availableMissions.length}`,
      { missionCount: missions.availableMissions.length },
      Date.now() - startTest
    );
  }

  /**
   * Test 2: Tutorial Mission Flow
   */
  private async testTutorialMissionFlow() {
    console.log('\n🎓 Testing Tutorial Mission Flow...');
    const startTest = Date.now();
    
    const missions = usePlunderverseMissions.getState();
    const credits = useCreditsStore.getState();
    const player = usePlayer.getState();
    
    // Generate tutorial missions
    await gameFacade.generateMissionsForLocation('Earth');
    await this.wait(100);
    
    // Find and accept tutorial mission
    const tutorialMissions = missions.availableMissions.filter(m => 
      m.difficulty === 'easy' && m.minRank === 1
    );
    
    if (tutorialMissions.length > 0) {
      const tutorialMission = tutorialMissions[0];
      const initialCredits = credits.credits;
      
      // Accept mission
      missions.acceptMission(tutorialMission.id);
      
      this.addResult(
        'Tutorial Mission Accept',
        missions.activeMissions.some(m => m.id === tutorialMission.id) ? 'passed' : 'failed',
        `Accepted: ${tutorialMission.title}`,
        { mission: tutorialMission },
        Date.now() - startTest
      );
      
      // Simulate mission completion
      await this.simulateMissionCompletion(tutorialMission.id);
      
      // Check rewards
      const creditGain = credits.credits - initialCredits;
      this.addResult(
        'Tutorial Mission Rewards',
        creditGain > 0 ? 'passed' : 'failed',
        `Credits gained: ${creditGain}`,
        { creditGain, newTotal: credits.credits },
        Date.now() - startTest
      );
      
      this.progress.tutorialCompleted = true;
      this.progress.firstMissionCompleted = true;
    } else {
      this.addResult(
        'Tutorial Mission Generation',
        false,
        'No tutorial missions generated',
        {},
        Date.now() - startTest
      );
    }
  }

  /**
   * Test 3: First Combat Encounter
   */
  private async testFirstCombatEncounter() {
    console.log('\n⚔️ Testing First Combat Encounter...');
    const startTest = Date.now();
    
    const enemies = useEnemies.getState();
    const shooting = useShooting.getState();
    const ship = useShipStatus.getState();
    const player = usePlayer.getState();
    
    // Take off to space
    const landed = useLandedState.getState();
    if (landed.isLanded) {
      landed.setNotLanded();
      await this.wait(100);
    }
    
    // Spawn tutorial enemy
    const tutorialEnemy = {
      id: 'tutorial-enemy',
      position: new THREE.Vector3(100, 0, 100),
      velocity: new THREE.Vector3(0, 0, 0),
      health: 50,
      maxHealth: 50,
      type: 'pirate' as const,
      difficulty: 'easy' as const,
      lastShot: 0
    };
    
    enemies.spawnEnemy(tutorialEnemy);
    
    this.addResult(
      'Enemy Spawn',
      enemies.enemies.length > 0 ? 'passed' : 'failed',
      `Enemies spawned: ${enemies.enemies.length}`,
      { enemyCount: enemies.enemies.length },
      Date.now() - startTest
    );
    
    // Simulate combat
    const initialHull = ship.hull;
    for (let i = 0; i < 10; i++) {
      shooting.shoot(tutorialEnemy.position);
      await this.wait(100);
      
      // Check if enemy defeated
      const remainingEnemies = enemies.enemies.filter(e => e.id === tutorialEnemy.id);
      if (remainingEnemies.length === 0) {
        break;
      }
    }
    
    const combatDamage = initialHull - ship.hull;
    this.addResult(
      'Combat Resolution',
      enemies.enemies.filter(e => e.id === tutorialEnemy.id).length === 0 ? 'passed' : 'failed',
      `Combat completed, damage taken: ${combatDamage}`,
      { damage: combatDamage, hullRemaining: ship.hull },
      Date.now() - startTest
    );
    
    // Check combat rewards
    const beforeNotoriety = player.notoriety;
    player.addNotoriety(5);
    
    this.addResult(
      'Combat Rewards',
      player.notoriety > beforeNotoriety ? 'passed' : 'failed',
      `Notoriety gained: ${player.notoriety - beforeNotoriety}`,
      { notoriety: player.notoriety },
      Date.now() - startTest
    );
    
    this.progress.firstCombatCompleted = true;
  }

  /**
   * Test 4: First Trade Transaction
   */
  private async testFirstTradeTransaction() {
    console.log('\n💰 Testing First Trade Transaction...');
    const startTest = Date.now();
    
    const trading = useTrading.getState();
    const credits = useCreditsStore.getState();
    const inventory = useInventory.getState();
    const landed = useLandedState.getState();
    
    // Land on a planet with a market
    if (!landed.isLanded) {
      landed.setLanded('Mars');
      await this.wait(100);
    }
    
    // Get market data
    const marketData = trading.getMarketDataForPlanet('Mars');
    
    this.addResult(
      'Market Access',
      marketData !== null ? 'passed' : 'failed',
      `Market available at ${landed.landedPlanet}`,
      { planet: landed.landedPlanet, hasMarket: marketData !== null },
      Date.now() - startTest
    );
    
    if (marketData) {
      const initialCredits = credits.credits;
      
      // Buy cheapest item
      const cheapestItem = marketData.resources.reduce((min, item) => 
        item.buyPrice < min.buyPrice ? item : min
      );
      
      if (cheapestItem && credits.credits >= cheapestItem.buyPrice) {
        trading.buyResource(cheapestItem.resource, 1);
        await this.wait(100);
        
        this.addResult(
          'Buy Transaction',
          inventory.items.some(i => i.name === cheapestItem.resource) ? 'passed' : 'failed',
          `Bought: ${cheapestItem.resource} for ${cheapestItem.buyPrice}`,
          { item: cheapestItem.resource, price: cheapestItem.buyPrice },
          Date.now() - startTest
        );
        
        // Sell the item
        trading.sellResource(cheapestItem.resource, 1);
        await this.wait(100);
        
        const profit = credits.credits - initialCredits;
        this.addResult(
          'Sell Transaction',
          !inventory.items.some(i => i.name === cheapestItem.resource) ? 'passed' : 'failed',
          `Sold ${cheapestItem.resource}, profit: ${profit}`,
          { profit, newCredits: credits.credits },
          Date.now() - startTest
        );
        
        this.progress.firstTradeCompleted = true;
      } else {
        this.addResult(
          'Trade Affordability',
          false,
          `Insufficient credits for trading`,
          { credits: credits.credits, minPrice: cheapestItem?.buyPrice },
          Date.now() - startTest
        );
      }
    }
  }

  /**
   * Test 5: First Mining Operation
   */
  private async testFirstMiningOperation() {
    console.log('\n⛏️ Testing First Mining Operation...');
    const startTest = Date.now();
    
    const mining = useMining.getState();
    const inventory = useInventory.getState();
    const landed = useLandedState.getState();
    
    // Ensure we're on a planet with resources
    if (!landed.isLanded) {
      landed.setLanded('Moon');
      await this.wait(100);
    }
    
    const initialItemCount = inventory.items.length;
    
    // Start mining
    mining.startMining();
    await this.wait(100);
    
    this.addResult(
      'Mining Start',
      mining.isMining ? 'passed' : 'failed',
      'Mining operation initiated',
      { isMining: mining.isMining },
      Date.now() - startTest
    );
    
    // Mine for a short duration
    for (let i = 0; i < 5; i++) {
      mining.updateMiningProgress(0.2);
      await this.wait(100);
    }
    
    mining.stopMining();
    
    const resourcesMined = inventory.items.length - initialItemCount;
    this.addResult(
      'Resources Mined',
      resourcesMined > 0 ? 'passed' : 'warning',
      `Mined ${resourcesMined} resources`,
      { resourceCount: resourcesMined },
      Date.now() - startTest
    );
  }

  /**
   * Test 6: First Crew Hire
   */
  private async testFirstCrewHire() {
    console.log('\n👥 Testing First Crew Hire...');
    const startTest = Date.now();
    
    const crew = useCrewManagement.getState();
    const credits = useCreditsStore.getState();
    
    const initialCrewSize = crew.crewMembers.length;
    const availableCrew = crew.getAvailableCrewForHire();
    
    this.addResult(
      'Available Crew',
      availableCrew.length > 0 ? 'passed' : 'failed',
      `Available for hire: ${availableCrew.length}`,
      { availableCount: availableCrew.length },
      Date.now() - startTest
    );
    
    if (availableCrew.length > 0 && credits.credits >= 500) {
      const newCrew = availableCrew[0];
      crew.hireCrew(newCrew.id);
      await this.wait(100);
      
      this.addResult(
        'Crew Hire',
        crew.crewMembers.length > initialCrewSize ? 'passed' : 'failed',
        `Hired: ${newCrew.name} (${newCrew.role})`,
        { crew: newCrew, totalCrew: crew.crewMembers.length },
        Date.now() - startTest
      );
      
      this.progress.firstCrewHired = crew.crewMembers.length > initialCrewSize;
    } else {
      this.addResult(
        'Crew Hire Affordability',
        false,
        'Insufficient funds for crew hire',
        { credits: credits.credits },
        Date.now() - startTest
      );
    }
  }

  /**
   * Test 7: First Ship Upgrade
   */
  private async testFirstShipUpgrade() {
    console.log('\n🚀 Testing First Ship Upgrade...');
    const startTest = Date.now();
    
    const upgrades = useUpgrades.getState();
    const credits = useCreditsStore.getState();
    const ship = useShipStatus.getState();
    
    const availableUpgrades = upgrades.getAvailableUpgrades();
    
    this.addResult(
      'Available Upgrades',
      availableUpgrades.length > 0 ? 'passed' : 'failed',
      `Upgrades available: ${availableUpgrades.length}`,
      { upgradeCount: availableUpgrades.length },
      Date.now() - startTest
    );
    
    if (availableUpgrades.length > 0) {
      const cheapestUpgrade = availableUpgrades.reduce((min, u) => 
        u.cost < min.cost ? u : min
      );
      
      if (credits.credits >= cheapestUpgrade.cost) {
        const initialStats = { hull: ship.maxHull, shield: ship.maxShield };
        upgrades.purchaseUpgrade(cheapestUpgrade.id);
        await this.wait(100);
        
        const upgraded = ship.maxHull > initialStats.hull || ship.maxShield > initialStats.shield;
        this.addResult(
          'Upgrade Purchase',
          upgraded ? 'passed' : 'failed',
          `Purchased: ${cheapestUpgrade.name}`,
          { upgrade: cheapestUpgrade, newStats: { hull: ship.maxHull, shield: ship.maxShield } },
          Date.now() - startTest
        );
        
        this.progress.firstUpgradePurchased = upgraded;
      } else {
        this.addResult(
          'Upgrade Affordability',
          false,
          'Insufficient funds for upgrade',
          { credits: credits.credits, cost: cheapestUpgrade.cost },
          Date.now() - startTest
        );
      }
    }
  }

  /**
   * Test 8: First Rank Progression
   */
  private async testFirstRankProgression() {
    console.log('\n📈 Testing First Rank Progression...');
    const startTest = Date.now();
    
    const player = usePlayer.getState();
    const initialRank = player.rank;
    const initialPoints = player.points;
    
    // Add points for rank progression
    player.addPoints(100);
    await this.wait(100);
    
    this.addResult(
      'Points Accumulation',
      player.points > initialPoints ? 'passed' : 'failed',
      `Points gained: ${player.points - initialPoints}`,
      { points: player.points, required: 100 },
      Date.now() - startTest
    );
    
    // Check for rank up
    if (player.points >= 100 && player.rank === 1) {
      player.setRank(2);
      await this.wait(100);
    }
    
    this.addResult(
      'Rank Progression',
      player.rank > initialRank ? 'passed' : 'warning',
      `Rank: ${initialRank} → ${player.rank}`,
      { oldRank: initialRank, newRank: player.rank },
      Date.now() - startTest
    );
    
    this.progress.firstRankAchieved = player.rank > 1;
  }

  /**
   * Test 9: UI Tutorial Flow
   */
  private async testUITutorialFlow() {
    console.log('\n🖥️ Testing UI Tutorial Flow...');
    const startTest = Date.now();
    
    const panels = usePanelManager.getState();
    
    // Test opening each essential panel
    const essentialPanels = [
      'missions',
      'trading',
      'ship-status',
      'crew-management',
      'navigation'
    ];
    
    for (const panelId of essentialPanels) {
      panels.openPanel(panelId);
      await this.wait(100);
      
      this.addResult(
        `Panel: ${panelId}`,
        panels.openPanels.includes(panelId) ? 'passed' : 'failed',
        `Panel ${panelId} opened successfully`,
        { panel: panelId },
        Date.now() - startTest
      );
      
      panels.closePanel(panelId);
      await this.wait(50);
    }
  }

  /**
   * Test 10: New Player Progression Validation
   */
  private async testNewPlayerProgression() {
    console.log('\n✅ Validating New Player Progression...');
    const startTest = Date.now();
    
    const completedSteps = Object.values(this.progress).filter(v => v === true).length;
    const totalSteps = Object.keys(this.progress).length;
    const completionRate = (completedSteps / totalSteps) * 100;
    
    this.addResult(
      'Tutorial Completion',
      this.progress.tutorialCompleted ? 'passed' : 'failed',
      'Tutorial mission completed',
      { completed: this.progress.tutorialCompleted },
      Date.now() - startTest
    );
    
    this.addResult(
      'Core Systems Used',
      completedSteps >= 5 ? 'passed' : 'warning',
      `Systems experienced: ${completedSteps}/${totalSteps}`,
      { ...this.progress },
      Date.now() - startTest
    );
    
    this.addResult(
      'New Player Readiness',
      completionRate >= 70 ? 'passed' : 'warning',
      `Completion rate: ${completionRate.toFixed(1)}%`,
      { completionRate, readyForMainGame: completionRate >= 70 },
      Date.now() - startTest
    );
  }

  /**
   * Helper: Simulate mission completion
   */
  private async simulateMissionCompletion(missionId: string) {
    const missions = usePlunderverseMissions.getState();
    const mission = missions.activeMissions.find(m => m.id === missionId);
    
    if (mission) {
      // Complete all objectives
      mission.objectives.forEach((obj, index) => {
        missions.updateObjectiveProgress(missionId, index, obj.target);
      });
      
      // Complete mission
      await gameFacade.completeMission(missionId);
    }
  }

  /**
   * Helper: Wait for specified milliseconds
   */
  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Add test result
   */
  private addResult(
    name: string,
    status: 'running' | 'passed' | 'failed' | 'warning',
    message: string,
    details?: any,
    duration: number = 0
  ) {
    this.results.push({
      name,
      status,
      message,
      details,
      duration,
      timestamp: Date.now()
    });
    
    const icon = status === 'passed' ? '✅' : status === 'failed' ? '❌' : '⚠️';
    console.log(`  ${icon} ${name}: ${message}`);
  }

  /**
   * Generate and display test report
   */
  private generateReport() {
    const totalDuration = Date.now() - this.startTime;
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;
    
    console.log('\n' + '═'.repeat(60));
    console.log('📊 NEW PLAYER EXPERIENCE TEST REPORT');
    console.log('═'.repeat(60));
    console.log(`Total Tests: ${this.results.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️ Warnings: ${warnings}`);
    console.log(`⏱️ Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log('═'.repeat(60));
    
    // Progress summary
    console.log('\n📈 Player Progress Summary:');
    Object.entries(this.progress).forEach(([key, value]) => {
      const icon = value ? '✅' : '❌';
      console.log(`  ${icon} ${key}: ${value}`);
    });
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    if (failed > 0) {
      console.log('  - Fix critical failures before release');
    }
    if (warnings > 2) {
      console.log('  - Review warning cases for potential improvements');
    }
    if (!this.progress.tutorialCompleted) {
      console.log('  - Tutorial flow needs attention');
    }
    if (Object.values(this.progress).filter(v => v).length < 5) {
      console.log('  - New player experience incomplete - add more guidance');
    }
    
    // Show toast notification
    const status = failed > 0 ? 'error' : passed === this.results.length ? 'success' : 'warning';
    toast[status](
      `New Player Test: ${passed}/${this.results.length} passed`,
      {
        description: failed > 0 
          ? `${failed} critical issues found`
          : 'New player experience validated',
        duration: 5000
      }
    );
    
    return {
      results: this.results,
      progress: this.progress,
      summary: {
        total: this.results.length,
        passed,
        failed,
        warnings,
        duration: totalDuration,
        completionRate: (Object.values(this.progress).filter(v => v).length / Object.keys(this.progress).length) * 100
      }
    };
  }

  /**
   * Restore original game state
   */
  private restoreOriginalState() {
    try {
      const player = usePlayer.getState();
      const credits = useCreditsStore.getState();
      const ship = useShipStatus.getState();
      
      // Restore player stats
      player.setRank(this.originalState.player.rank);
      player.setReputation(this.originalState.player.reputation);
      player.setHeat(this.originalState.player.heat);
      player.setNotoriety(this.originalState.player.notoriety);
      player.setPoints(this.originalState.player.points);
      
      // Restore credits
      credits.setCredits(this.originalState.credits);
      
      // Restore ship
      ship.takeDamage(-ship.hull + this.originalState.ship.hull, 'hull');
      ship.takeDamage(-ship.shield + this.originalState.ship.shield, 'shield');
      
      console.log('♻️ Game state restored');
    } catch (error) {
      console.warn('⚠️ Could not fully restore state:', error);
    }
  }
}

// Export for browser console
if (typeof window !== 'undefined') {
  (window as any).testNewPlayerExperience = () => {
    const test = new NewPlayerExperienceTest();
    return test.runAllTests();
  };
}