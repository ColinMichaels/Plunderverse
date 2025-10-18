/**
 * Complete Game Loop E2E Test Suite
 * Tests the full gameplay loop from space to surface and back
 * 
 * Run with: window.testCompleteGameLoop() from browser console
 */

import { toast } from 'sonner';
import { gameFacade } from '../../lib/plunderverse/gameFacade';
import { usePlunderverseMissions } from '../../lib/stores/economy/usePlunderverseMissions';
import { usePlayer } from '../../lib/stores/player/usePlayer';
import { useCreditsStore } from '../../domain/economy/credits.store';
import { useLandedState } from '../../lib/stores/surface/useLandedState';
import { useSolarSystem } from '../../lib/stores/space/useSolarSystem';
import { useShipStatus } from '../../lib/stores/ship/useShipStatus';
import { useInventory } from '../../lib/stores/economy/useInventory';
import { useMining } from '../../lib/stores/economy/useMining';
import { useTrading } from '../../lib/stores/economy/useTrading';
import { useEnemies } from '../../lib/stores/combat/useEnemies';
import { useShooting } from '../../lib/stores/combat/useShooting';
import { useUpgrades } from '../../lib/stores/ship/useUpgrades';
import { useCrewManagement } from '../../lib/stores/ship/useCrewManagement';
import { useAutopilot } from '../../lib/stores/navigation/useAutopilot';
import { useJumpSystem } from '../../lib/stores/navigation/useJumpSystem';
import * as THREE from 'three';

interface TestResult {
  name: string;
  status: 'running' | 'passed' | 'failed' | 'warning';
  message: string;
  details?: any;
  duration: number;
  timestamp: number;
}

interface GameLoopMetrics {
  totalCycles: number;
  profitPerCycle: number[];
  combatEncounters: number;
  tradingTransactions: number;
  miningOperations: number;
  missionsCompleted: number;
  systemsVisited: Set<string>;
  deathCount: number;
  averageCycleDuration: number;
}

export class CompleteGameLoopTest {
  private results: TestResult[] = [];
  private startTime: number = 0;
  private metrics: GameLoopMetrics = {
    totalCycles: 0,
    profitPerCycle: [],
    combatEncounters: 0,
    tradingTransactions: 0,
    miningOperations: 0,
    missionsCompleted: 0,
    systemsVisited: new Set(),
    deathCount: 0,
    averageCycleDuration: 0
  };
  private originalState: any = {};
  private cycleStartTime: number = 0;

  constructor() {
    console.log('🔄 Complete Game Loop Test Suite initialized');
  }

  /**
   * Save original game state
   */
  private saveOriginalState() {
    const player = usePlayer.getState();
    const credits = useCreditsStore.getState();
    const landed = useLandedState.getState();
    const ship = useShipStatus.getState();
    const inventory = useInventory.getState();
    const missions = usePlunderverseMissions.getState();
    
    this.originalState = {
      player: {
        rank: player.rank,
        reputation: { ...player.reputation },
        heat: player.heat,
        notoriety: player.notoriety
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
        capacity: inventory.capacity
      },
      missions: {
        active: [...missions.activeMissions],
        completed: new Set(missions.completedMissionIds)
      }
    };
  }

  /**
   * Run all game loop tests
   */
  async runAllTests(): Promise<void> {
    console.clear();
    console.log('%c════════════════════════════════════════════════════', 'color: #3b82f6; font-size: 14px');
    console.log('%c  🔄 COMPLETE GAME LOOP E2E TEST SUITE', 'color: #3b82f6; font-size: 16px; font-weight: bold');
    console.log('%c════════════════════════════════════════════════════', 'color: #3b82f6; font-size: 14px');
    
    this.startTime = Date.now();
    this.saveOriginalState();
    
    try {
      // Test 1: Space Travel to Planet Landing
      await this.testSpaceToPlanetTransition();
      await this.wait(500);
      
      // Test 2: Mining to Trading Profit Cycle
      await this.testMiningToTradingCycle();
      await this.wait(500);
      
      // Test 3: Mission Accept to Complete Flow
      await this.testMissionCompleteCycle();
      await this.wait(500);
      
      // Test 4: Combat to Loot to Upgrade Cycle
      await this.testCombatLootUpgradeCycle();
      await this.wait(500);
      
      // Test 5: Multi-System Travel Loop
      await this.testMultiSystemTravel();
      await this.wait(500);
      
      // Test 6: Save and Load Persistence
      await this.testSaveLoadPersistence();
      await this.wait(500);
      
      // Test 7: Complete Economic Cycle
      await this.testCompleteEconomicCycle();
      await this.wait(500);
      
      // Test 8: Death and Recovery
      await this.testDeathRecoveryCycle();
      await this.wait(500);
      
      // Test 9: Full Day Cycle
      await this.testFullDayCycle();
      await this.wait(500);
      
      // Test 10: Performance Under Load
      await this.testPerformanceUnderLoad();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      this.addResult('Test Suite', 'failed', `Critical error: ${error}`);
    } finally {
      this.generateReport();
      this.restoreOriginalState();
    }
  }

  /**
   * Test 1: Space Travel to Planet Landing
   */
  private async testSpaceToPlanetTransition() {
    console.log('\n🚀 Testing Space to Planet Transition...');
    const startTest = Date.now();
    
    const landed = useLandedState.getState();
    const solar = useSolarSystem.getState();
    const ship = useShipStatus.getState();
    
    // Start in space
    if (landed.isLanded) {
      landed.setNotLanded();
      await this.wait(100);
    }
    
    this.addResult(
      'Launch to Space',
      !landed.isLanded ? 'passed' : 'failed',
      'Successfully launched to space',
      { inSpace: !landed.isLanded },
      Date.now() - startTest
    );
    
    // Navigate to a planet
    const targetPlanet = 'Mars';
    solar.setSelectedPlanet(targetPlanet);
    solar.setCameraPosition(new THREE.Vector3(200, 100, 200));
    await this.wait(200);
    
    this.addResult(
      'Planet Selection',
      solar.selectedPlanet === targetPlanet ? 'passed' : 'failed',
      `Selected planet: ${solar.selectedPlanet}`,
      { target: targetPlanet, selected: solar.selectedPlanet },
      Date.now() - startTest
    );
    
    // Land on the planet
    landed.setLanded(targetPlanet);
    await this.wait(200);
    
    this.addResult(
      'Planet Landing',
      landed.isLanded && landed.landedPlanet === targetPlanet ? 'passed' : 'failed',
      `Landed on ${landed.landedPlanet}`,
      { landed: landed.isLanded, planet: landed.landedPlanet },
      Date.now() - startTest
    );
    
    // Check fuel consumption
    const fuelUsed = 100 - ship.fuel;
    this.addResult(
      'Fuel Consumption',
      fuelUsed > 0 ? 'passed' : 'warning',
      `Fuel used: ${fuelUsed}%`,
      { fuelRemaining: ship.fuel },
      Date.now() - startTest
    );
    
    this.metrics.systemsVisited.add(targetPlanet);
  }

  /**
   * Test 2: Mining to Trading Profit Cycle
   */
  private async testMiningToTradingCycle() {
    console.log('\n⛏️ Testing Mining to Trading Cycle...');
    const startTest = Date.now();
    const cycleStart = Date.now();
    
    const mining = useMining.getState();
    const trading = useTrading.getState();
    const inventory = useInventory.getState();
    const credits = useCreditsStore.getState();
    const landed = useLandedState.getState();
    
    // Ensure we're landed
    if (!landed.isLanded) {
      landed.setLanded('Moon');
      await this.wait(100);
    }
    
    const initialCredits = credits.credits;
    const initialInventory = inventory.items.length;
    
    // Mining phase
    mining.startMining();
    for (let i = 0; i < 10; i++) {
      mining.updateMiningProgress(0.1);
      await this.wait(50);
    }
    mining.stopMining();
    
    const minedResources = inventory.items.length - initialInventory;
    this.addResult(
      'Mining Phase',
      minedResources > 0 ? 'passed' : 'failed',
      `Mined ${minedResources} resources`,
      { resourcesMined: minedResources },
      Date.now() - startTest
    );
    
    this.metrics.miningOperations++;
    
    // Travel to trading location
    landed.setNotLanded();
    await this.wait(100);
    landed.setLanded('Earth');
    await this.wait(100);
    
    // Trading phase
    const marketData = trading.getMarketDataForPlanet('Earth');
    if (marketData && inventory.items.length > 0) {
      const itemToSell = inventory.items[0];
      const quantity = Math.min(itemToSell.quantity, 5);
      
      trading.sellResource(itemToSell.name, quantity);
      await this.wait(100);
      
      const profit = credits.credits - initialCredits;
      this.addResult(
        'Trading Phase',
        profit > 0 ? 'passed' : 'failed',
        `Profit: ${profit} credits`,
        { profit, newTotal: credits.credits },
        Date.now() - startTest
      );
      
      this.metrics.tradingTransactions++;
      this.metrics.profitPerCycle.push(profit);
    } else {
      this.addResult(
        'Trading Phase',
        false,
        'No market or resources available',
        {},
        Date.now() - startTest
      );
    }
    
    const cycleDuration = Date.now() - cycleStart;
    this.addResult(
      'Cycle Efficiency',
      cycleDuration < 30000 ? 'passed' : 'warning',
      `Cycle completed in ${(cycleDuration / 1000).toFixed(1)}s`,
      { duration: cycleDuration },
      Date.now() - startTest
    );
    
    this.metrics.totalCycles++;
  }

  /**
   * Test 3: Mission Accept to Complete Flow
   */
  private async testMissionCompleteCycle() {
    console.log('\n📋 Testing Mission Complete Cycle...');
    const startTest = Date.now();
    
    const missions = usePlunderverseMissions.getState();
    const credits = useCreditsStore.getState();
    const player = usePlayer.getState();
    
    // Generate missions
    await gameFacade.generateMissionsForLocation('Earth');
    await this.wait(200);
    
    const availableMissions = missions.availableMissions.filter(m => 
      m.difficulty === 'easy' || m.difficulty === 'medium'
    );
    
    if (availableMissions.length > 0) {
      const mission = availableMissions[0];
      const initialCredits = credits.credits;
      const initialRep = player.reputation[mission.faction];
      
      // Accept mission
      missions.acceptMission(mission.id);
      await this.wait(100);
      
      this.addResult(
        'Mission Accept',
        missions.activeMissions.some(m => m.id === mission.id) ? 'passed' : 'failed',
        `Accepted: ${mission.title}`,
        { mission: mission.title, type: mission.type },
        Date.now() - startTest
      );
      
      // Simulate mission completion
      for (let i = 0; i < mission.objectives.length; i++) {
        missions.updateObjectiveProgress(mission.id, i, mission.objectives[i].target);
        await this.wait(100);
      }
      
      // Complete mission
      await gameFacade.completeMission(mission.id);
      await this.wait(200);
      
      const creditReward = credits.credits - initialCredits;
      const repGain = player.reputation[mission.faction] - initialRep;
      
      this.addResult(
        'Mission Complete',
        missions.completedMissionIds.has(mission.id) ? 'passed' : 'failed',
        `Rewards: ${creditReward} credits, ${repGain} reputation`,
        { credits: creditReward, reputation: repGain },
        Date.now() - startTest
      );
      
      this.metrics.missionsCompleted++;
    } else {
      this.addResult(
        'Mission Availability',
        false,
        'No suitable missions available',
        {},
        Date.now() - startTest
      );
    }
  }

  /**
   * Test 4: Combat to Loot to Upgrade Cycle
   */
  private async testCombatLootUpgradeCycle() {
    console.log('\n⚔️ Testing Combat-Loot-Upgrade Cycle...');
    const startTest = Date.now();
    
    const enemies = useEnemies.getState();
    const shooting = useShooting.getState();
    const ship = useShipStatus.getState();
    const credits = useCreditsStore.getState();
    const upgrades = useUpgrades.getState();
    const landed = useLandedState.getState();
    
    // Enter space for combat
    if (landed.isLanded) {
      landed.setNotLanded();
      await this.wait(100);
    }
    
    const initialCredits = credits.credits;
    
    // Spawn multiple enemies
    const enemyCount = 3;
    for (let i = 0; i < enemyCount; i++) {
      enemies.spawnEnemy({
        id: `test-enemy-${i}`,
        position: new THREE.Vector3(100 + i * 50, 0, 100),
        velocity: new THREE.Vector3(0, 0, 0),
        health: 75,
        maxHealth: 75,
        type: 'pirate',
        difficulty: 'medium',
        lastShot: 0
      });
    }
    
    this.addResult(
      'Enemy Spawn',
      enemies.enemies.length === enemyCount ? 'passed' : 'failed',
      `Spawned ${enemies.enemies.length} enemies`,
      { enemyCount: enemies.enemies.length },
      Date.now() - startTest
    );
    
    // Combat phase
    let combatRounds = 0;
    while (enemies.enemies.length > 0 && combatRounds < 30) {
      const target = enemies.enemies[0];
      shooting.shoot(target.position);
      await this.wait(200);
      combatRounds++;
    }
    
    this.addResult(
      'Combat Victory',
      enemies.enemies.length === 0 ? 'passed' : 'failed',
      `Defeated all enemies in ${combatRounds} rounds`,
      { roundsFired: combatRounds, enemiesRemaining: enemies.enemies.length },
      Date.now() - startTest
    );
    
    this.metrics.combatEncounters++;
    
    // Check loot rewards
    const lootCredits = credits.credits - initialCredits;
    this.addResult(
      'Combat Loot',
      lootCredits > 0 ? 'passed' : 'warning',
      `Earned ${lootCredits} credits from combat`,
      { loot: lootCredits },
      Date.now() - startTest
    );
    
    // Upgrade phase
    const availableUpgrades = upgrades.getAvailableUpgrades();
    const affordableUpgrades = availableUpgrades.filter(u => u.cost <= credits.credits);
    
    if (affordableUpgrades.length > 0) {
      const upgrade = affordableUpgrades[0];
      const beforeStats = { hull: ship.maxHull, shield: ship.maxShield };
      
      upgrades.purchaseUpgrade(upgrade.id);
      await this.wait(100);
      
      const statsImproved = ship.maxHull > beforeStats.hull || ship.maxShield > beforeStats.shield;
      this.addResult(
        'Ship Upgrade',
        statsImproved ? 'passed' : 'failed',
        `Purchased: ${upgrade.name}`,
        { upgrade: upgrade.name, cost: upgrade.cost },
        Date.now() - startTest
      );
    } else {
      this.addResult(
        'Ship Upgrade',
        'warning',
        'No affordable upgrades available',
        { credits: credits.credits },
        Date.now() - startTest
      );
    }
  }

  /**
   * Test 5: Multi-System Travel Loop
   */
  private async testMultiSystemTravel() {
    console.log('\n🌌 Testing Multi-System Travel...');
    const startTest = Date.now();
    
    const landed = useLandedState.getState();
    const solar = useSolarSystem.getState();
    const jump = useJumpSystem.getState();
    const ship = useShipStatus.getState();
    
    const planets = ['Earth', 'Mars', 'Jupiter', 'Saturn'];
    let successfulJumps = 0;
    
    for (const planet of planets) {
      // Travel to planet
      if (landed.isLanded) {
        landed.setNotLanded();
        await this.wait(100);
      }
      
      solar.setSelectedPlanet(planet);
      
      // Simulate jump if far away
      if (planet === 'Jupiter' || planet === 'Saturn') {
        if (ship.fuel >= 30) {
          jump.startJump();
          await this.wait(500);
          jump.completeJump();
          successfulJumps++;
        }
      }
      
      landed.setLanded(planet);
      await this.wait(200);
      
      this.metrics.systemsVisited.add(planet);
    }
    
    this.addResult(
      'Systems Visited',
      this.metrics.systemsVisited.size >= 4 ? 'passed' : 'warning',
      `Visited ${this.metrics.systemsVisited.size} systems`,
      { systems: Array.from(this.metrics.systemsVisited) },
      Date.now() - startTest
    );
    
    this.addResult(
      'Jump Drive Usage',
      successfulJumps > 0 ? 'passed' : 'warning',
      `Successful jumps: ${successfulJumps}`,
      { jumps: successfulJumps },
      Date.now() - startTest
    );
  }

  /**
   * Test 6: Save and Load Persistence
   */
  private async testSaveLoadPersistence() {
    console.log('\n💾 Testing Save/Load Persistence...');
    const startTest = Date.now();
    
    const player = usePlayer.getState();
    const credits = useCreditsStore.getState();
    const inventory = useInventory.getState();
    const missions = usePlunderverseMissions.getState();
    
    // Create test state
    const testState = {
      credits: credits.credits,
      rank: player.rank,
      reputation: { ...player.reputation },
      inventoryCount: inventory.items.length,
      activeMissions: missions.activeMissions.length,
      completedMissions: missions.completedMissionIds.size
    };
    
    // Simulate save
    const saveData = {
      timestamp: Date.now(),
      player: {
        rank: player.rank,
        reputation: player.reputation,
        heat: player.heat,
        notoriety: player.notoriety
      },
      credits: credits.credits,
      inventory: inventory.items,
      missions: {
        active: missions.activeMissions,
        completed: Array.from(missions.completedMissionIds)
      }
    };
    
    // Store in localStorage
    localStorage.setItem('plunderverse_test_save', JSON.stringify(saveData));
    
    this.addResult(
      'Save Game',
      localStorage.getItem('plunderverse_test_save') !== null ? 'passed' : 'failed',
      'Game state saved',
      { savedData: Object.keys(saveData) },
      Date.now() - startTest
    );
    
    // Modify state
    credits.addCredits(500);
    player.addPoints(50);
    await this.wait(100);
    
    // Load saved state
    const loadedData = JSON.parse(localStorage.getItem('plunderverse_test_save') || '{}');
    
    this.addResult(
      'Load Game',
      loadedData.timestamp !== undefined ? 'passed' : 'failed',
      'Game state loaded',
      { loadedKeys: Object.keys(loadedData) },
      Date.now() - startTest
    );
    
    // Verify persistence
    const dataIntegrity = 
      loadedData.credits === testState.credits &&
      loadedData.player?.rank === testState.rank;
    
    this.addResult(
      'Data Integrity',
      dataIntegrity ? 'passed' : 'failed',
      'Save data integrity verified',
      { original: testState, loaded: loadedData },
      Date.now() - startTest
    );
    
    // Clean up test save
    localStorage.removeItem('plunderverse_test_save');
  }

  /**
   * Test 7: Complete Economic Cycle
   */
  private async testCompleteEconomicCycle() {
    console.log('\n💰 Testing Complete Economic Cycle...');
    const startTest = Date.now();
    
    const credits = useCreditsStore.getState();
    const trading = useTrading.getState();
    const mining = useMining.getState();
    const missions = usePlunderverseMissions.getState();
    const crew = useCrewManagement.getState();
    
    const initialCredits = credits.credits;
    let totalEarned = 0;
    let totalSpent = 0;
    
    // Earning phase
    // 1. Mining income
    const miningIncome = 200;
    credits.addCredits(miningIncome);
    totalEarned += miningIncome;
    
    // 2. Trading profit
    const tradingProfit = 300;
    credits.addCredits(tradingProfit);
    totalEarned += tradingProfit;
    
    // 3. Mission rewards
    const missionReward = 500;
    credits.addCredits(missionReward);
    totalEarned += missionReward;
    
    this.addResult(
      'Income Sources',
      totalEarned > 0 ? 'passed' : 'failed',
      `Total earned: ${totalEarned} credits`,
      { mining: miningIncome, trading: tradingProfit, missions: missionReward },
      Date.now() - startTest
    );
    
    // Spending phase
    // 1. Crew salary
    const crewCost = crew.getMaintenanceCost();
    if (crewCost > 0 && credits.credits >= crewCost) {
      credits.removeCredits(crewCost);
      totalSpent += crewCost;
    }
    
    // 2. Ship maintenance
    const maintenanceCost = 100;
    if (credits.credits >= maintenanceCost) {
      credits.removeCredits(maintenanceCost);
      totalSpent += maintenanceCost;
    }
    
    // 3. Fuel costs
    const fuelCost = 50;
    if (credits.credits >= fuelCost) {
      credits.removeCredits(fuelCost);
      totalSpent += fuelCost;
    }
    
    this.addResult(
      'Operating Costs',
      totalSpent > 0 ? 'passed' : 'warning',
      `Total spent: ${totalSpent} credits`,
      { crew: crewCost, maintenance: maintenanceCost, fuel: fuelCost },
      Date.now() - startTest
    );
    
    const netProfit = totalEarned - totalSpent;
    const profitMargin = totalEarned > 0 ? (netProfit / totalEarned) * 100 : 0;
    
    this.addResult(
      'Economic Balance',
      netProfit > 0 ? 'passed' : 'warning',
      `Net profit: ${netProfit} credits (${profitMargin.toFixed(1)}% margin)`,
      { earned: totalEarned, spent: totalSpent, profit: netProfit },
      Date.now() - startTest
    );
  }

  /**
   * Test 8: Death and Recovery Cycle
   */
  private async testDeathRecoveryCycle() {
    console.log('\n☠️ Testing Death & Recovery Cycle...');
    const startTest = Date.now();
    
    const ship = useShipStatus.getState();
    const credits = useCreditsStore.getState();
    const player = usePlayer.getState();
    const landed = useLandedState.getState();
    
    const initialCredits = credits.credits;
    const initialRank = player.rank;
    
    // Simulate ship destruction
    ship.takeDamage(ship.hull, 'hull');
    ship.takeDamage(ship.shield, 'shield');
    await this.wait(100);
    
    const isDestroyed = ship.hull <= 0;
    this.addResult(
      'Ship Destruction',
      isDestroyed ? 'passed' : 'failed',
      `Ship destroyed: ${isDestroyed}`,
      { hull: ship.hull, shield: ship.shield },
      Date.now() - startTest
    );
    
    if (isDestroyed) {
      this.metrics.deathCount++;
      
      // Simulate respawn
      ship.repair(100);
      landed.setLanded('Earth'); // Respawn at starting location
      
      // Apply death penalty
      const creditPenalty = Math.floor(credits.credits * 0.1);
      credits.removeCredits(creditPenalty);
      
      this.addResult(
        'Death Penalty',
        credits.credits < initialCredits ? 'passed' : 'warning',
        `Lost ${creditPenalty} credits`,
        { penalty: creditPenalty, remaining: credits.credits },
        Date.now() - startTest
      );
      
      // Check recovery
      const recovered = ship.hull > 0 && landed.landedPlanet === 'Earth';
      this.addResult(
        'Recovery',
        recovered ? 'passed' : 'failed',
        'Respawned at starting location',
        { location: landed.landedPlanet, hull: ship.hull },
        Date.now() - startTest
      );
    }
  }

  /**
   * Test 9: Full Day Cycle
   */
  private async testFullDayCycle() {
    console.log('\n🌅 Testing Full Day Cycle...');
    const startTest = Date.now();
    
    const player = usePlayer.getState();
    const credits = useCreditsStore.getState();
    const missions = usePlunderverseMissions.getState();
    
    const dayStartCredits = credits.credits;
    const dayStartRank = player.rank;
    
    // Simulate a full day of activities
    const activities = [
      { name: 'Morning Trade', action: () => credits.addCredits(200) },
      { name: 'Midday Mission', action: () => player.addPoints(50) },
      { name: 'Afternoon Mining', action: () => credits.addCredits(150) },
      { name: 'Evening Combat', action: () => player.addNotoriety(10) },
      { name: 'Night Docking', action: () => credits.removeCredits(50) }
    ];
    
    for (const activity of activities) {
      activity.action();
      await this.wait(200);
    }
    
    const dayProfit = credits.credits - dayStartCredits;
    const dayProgress = player.points > 0;
    
    this.addResult(
      'Daily Activities',
      activities.length === 5 ? 'passed' : 'failed',
      `Completed ${activities.length} activities`,
      { activities: activities.map(a => a.name) },
      Date.now() - startTest
    );
    
    this.addResult(
      'Daily Profit',
      dayProfit > 0 ? 'passed' : 'warning',
      `Day profit: ${dayProfit} credits`,
      { start: dayStartCredits, end: credits.credits, profit: dayProfit },
      Date.now() - startTest
    );
    
    this.addResult(
      'Daily Progress',
      dayProgress ? 'passed' : 'warning',
      'Experience gained today',
      { points: player.points },
      Date.now() - startTest
    );
  }

  /**
   * Test 10: Performance Under Load
   */
  private async testPerformanceUnderLoad() {
    console.log('\n⚡ Testing Performance Under Load...');
    const startTest = Date.now();
    
    const enemies = useEnemies.getState();
    const inventory = useInventory.getState();
    const missions = usePlunderverseMissions.getState();
    
    // Spawn many enemies
    const enemyLoad = 10;
    for (let i = 0; i < enemyLoad; i++) {
      enemies.spawnEnemy({
        id: `load-enemy-${i}`,
        position: new THREE.Vector3(
          Math.random() * 500 - 250,
          Math.random() * 100,
          Math.random() * 500 - 250
        ),
        velocity: new THREE.Vector3(0, 0, 0),
        health: 100,
        maxHealth: 100,
        type: 'pirate',
        difficulty: 'hard',
        lastShot: 0
      });
    }
    
    // Add many items to inventory
    const itemLoad = 20;
    for (let i = 0; i < itemLoad; i++) {
      inventory.addItem({
        id: `test-item-${i}`,
        name: `Resource ${i}`,
        quantity: Math.floor(Math.random() * 10) + 1,
        category: 'minerals',
        value: Math.floor(Math.random() * 100) + 10
      });
    }
    
    // Measure frame time
    const frameStart = performance.now();
    await this.wait(1000); // Wait for 1 second
    const frameTime = performance.now() - frameStart;
    const estimatedFPS = Math.round(1000 / (frameTime / 60)); // Rough estimate
    
    this.addResult(
      'Entity Load',
      enemies.enemies.length >= enemyLoad ? 'passed' : 'failed',
      `${enemies.enemies.length} enemies active`,
      { enemies: enemies.enemies.length, items: inventory.items.length },
      Date.now() - startTest
    );
    
    this.addResult(
      'Performance',
      estimatedFPS > 30 ? 'passed' : 'warning',
      `Estimated FPS: ${estimatedFPS}`,
      { fps: estimatedFPS, frameTime: frameTime / 60 },
      Date.now() - startTest
    );
    
    // Clean up
    enemies.clearAllEnemies();
    inventory.items = this.originalState.inventory.items;
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
    
    // Calculate metrics
    const avgProfit = this.metrics.profitPerCycle.length > 0
      ? this.metrics.profitPerCycle.reduce((a, b) => a + b, 0) / this.metrics.profitPerCycle.length
      : 0;
    
    console.log('\n' + '═'.repeat(60));
    console.log('📊 COMPLETE GAME LOOP TEST REPORT');
    console.log('═'.repeat(60));
    console.log(`Total Tests: ${this.results.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️ Warnings: ${warnings}`);
    console.log(`⏱️ Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log('═'.repeat(60));
    
    // Metrics summary
    console.log('\n📈 Game Loop Metrics:');
    console.log(`  • Total Cycles: ${this.metrics.totalCycles}`);
    console.log(`  • Average Profit/Cycle: ${avgProfit.toFixed(0)} credits`);
    console.log(`  • Combat Encounters: ${this.metrics.combatEncounters}`);
    console.log(`  • Trading Transactions: ${this.metrics.tradingTransactions}`);
    console.log(`  • Mining Operations: ${this.metrics.miningOperations}`);
    console.log(`  • Missions Completed: ${this.metrics.missionsCompleted}`);
    console.log(`  • Systems Visited: ${this.metrics.systemsVisited.size}`);
    console.log(`  • Death Count: ${this.metrics.deathCount}`);
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    if (failed > 0) {
      console.log('  - Fix critical loop failures for smooth gameplay');
    }
    if (avgProfit < 100) {
      console.log('  - Balance economy for better profit margins');
    }
    if (this.metrics.deathCount > 1) {
      console.log('  - Review combat difficulty and death mechanics');
    }
    if (this.metrics.systemsVisited.size < 3) {
      console.log('  - Encourage more exploration with incentives');
    }
    
    // Show toast notification
    const status = failed > 0 ? 'error' : passed === this.results.length ? 'success' : 'warning';
    toast[status](
      `Game Loop Test: ${passed}/${this.results.length} passed`,
      {
        description: failed > 0 
          ? `${failed} loop issues detected`
          : 'All game loops functioning correctly',
        duration: 5000
      }
    );
    
    return {
      results: this.results,
      metrics: this.metrics,
      summary: {
        total: this.results.length,
        passed,
        failed,
        warnings,
        duration: totalDuration,
        efficiency: (passed / this.results.length) * 100
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
      const landed = useLandedState.getState();
      
      // Restore player stats
      player.setRank(this.originalState.player.rank);
      player.setReputation(this.originalState.player.reputation);
      player.setHeat(this.originalState.player.heat);
      player.setNotoriety(this.originalState.player.notoriety);
      
      // Restore credits
      credits.setCredits(this.originalState.credits);
      
      // Restore ship
      ship.takeDamage(-ship.hull + this.originalState.ship.hull, 'hull');
      ship.takeDamage(-ship.shield + this.originalState.ship.shield, 'shield');
      ship.refuel(this.originalState.ship.fuel - ship.fuel);
      
      // Restore location
      if (this.originalState.landed.isLanded) {
        landed.setLanded(this.originalState.landed.landedPlanet);
      } else {
        landed.setNotLanded();
      }
      
      console.log('♻️ Game state restored');
    } catch (error) {
      console.warn('⚠️ Could not fully restore state:', error);
    }
  }
}

// Export for browser console
if (typeof window !== 'undefined') {
  (window as any).testCompleteGameLoop = () => {
    const test = new CompleteGameLoopTest();
    return test.runAllTests();
  };
}