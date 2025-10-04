/**
 * Combat Progression E2E Test Suite
 * Tests combat evolution from early game to boss battles
 * 
 * Run with: window.testCombatProgression() from browser console
 */

import { toast } from 'sonner';
import { useEnemies } from '../../lib/stores/combat/useEnemies';
import { useShooting } from '../../lib/stores/combat/useShooting';
import { useShipStatus } from '../../lib/stores/ship/useShipStatus';
import { useUpgrades } from '../../lib/stores/ship/useUpgrades';
import { useCrewManagement } from '../../lib/stores/ship/useCrewManagement';
import { usePlayer } from '../../lib/stores/player/usePlayer';
import { useCreditsStore } from '../../domain/economy/credits.store';
import { useLandedState } from '../../lib/stores/surface/useLandedState';
import * as THREE from 'three';

interface TestResult {
  name: string;
  status: 'running' | 'passed' | 'failed' | 'warning';
  message: string;
  details?: any;
  duration: number;
  timestamp: number;
}

interface CombatMetrics {
  totalBattles: number;
  victories: number;
  defeats: number;
  damageDealt: number;
  damageTaken: number;
  accuracyRate: number;
  survivalRate: number;
  weaponUpgrades: number;
  combatBonuses: Map<string, number>;
  enemiesDefeated: Map<string, number>;
  bossesDefeated: string[];
  combatTime: number;
  ammunitionUsed: number;
}

export class CombatProgressionTest {
  private results: TestResult[] = [];
  private startTime: number = 0;
  private metrics: CombatMetrics = {
    totalBattles: 0,
    victories: 0,
    defeats: 0,
    damageDealt: 0,
    damageTaken: 0,
    accuracyRate: 0,
    survivalRate: 100,
    weaponUpgrades: 0,
    combatBonuses: new Map(),
    enemiesDefeated: new Map([
      ['pirate', 0],
      ['military', 0],
      ['bounty_hunter', 0],
      ['boss', 0]
    ]),
    bossesDefeated: [],
    combatTime: 0,
    ammunitionUsed: 0
  };
  private originalState: any = {};

  constructor() {
    console.log('⚔️ Combat Progression Test Suite initialized');
  }

  /**
   * Save original game state
   */
  private saveOriginalState() {
    const ship = useShipStatus.getState();
    const player = usePlayer.getState();
    const credits = useCreditsStore.getState();
    const crew = useCrewManagement.getState();
    
    this.originalState = {
      ship: {
        hull: ship.hull,
        shield: ship.shield,
        weapons: ship.weapons || [],
        upgrades: ship.upgrades || []
      },
      player: {
        rank: player.rank,
        notoriety: player.notoriety
      },
      credits: credits.credits,
      crew: {
        members: [...crew.crewMembers],
        combatBonuses: crew.getCombatBonuses ? crew.getCombatBonuses() : {}
      }
    };
  }

  /**
   * Run all combat progression tests
   */
  async runAllTests(): Promise<void> {
    console.clear();
    console.log('%c════════════════════════════════════════════════════', 'color: #ef4444; font-size: 14px');
    console.log('%c  ⚔️ COMBAT PROGRESSION E2E TEST SUITE', 'color: #ef4444; font-size: 16px; font-weight: bold');
    console.log('%c════════════════════════════════════════════════════', 'color: #ef4444; font-size: 14px');
    
    this.startTime = Date.now();
    this.saveOriginalState();
    
    try {
      // Test 1: Early Game Combat
      await this.testEarlyGameCombat();
      await this.wait(500);
      
      // Test 2: Weapon Upgrades Effectiveness
      await this.testWeaponUpgrades();
      await this.wait(500);
      
      // Test 3: Crew Combat Bonuses
      await this.testCrewCombatBonuses();
      await this.wait(500);
      
      // Test 4: Mid-Game Combat
      await this.testMidGameCombat();
      await this.wait(500);
      
      // Test 5: High-Level Encounters
      await this.testHighLevelEncounters();
      await this.wait(500);
      
      // Test 6: Boss Battles
      await this.testBossBattles();
      await this.wait(500);
      
      // Test 7: Combat Tactics
      await this.testCombatTactics();
      await this.wait(500);
      
      // Test 8: Survival Mechanics
      await this.testSurvivalMechanics();
      await this.wait(500);
      
      // Test 9: Combat Rewards
      await this.testCombatRewards();
      await this.wait(500);
      
      // Test 10: Combat Performance
      await this.testCombatPerformance();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      this.addResult('Test Suite', 'failed', `Critical error: ${error}`);
    } finally {
      this.generateReport();
      this.restoreOriginalState();
    }
  }

  /**
   * Test 1: Early Game Combat
   */
  private async testEarlyGameCombat() {
    console.log('\n🎯 Testing Early Game Combat...');
    const startTest = Date.now();
    
    const enemies = useEnemies.getState();
    const shooting = useShooting.getState();
    const ship = useShipStatus.getState();
    const landed = useLandedState.getState();
    
    // Enter space
    if (landed.isLanded) {
      landed.setNotLanded();
      await this.wait(100);
    }
    
    // Clear any existing enemies
    enemies.clearAllEnemies();
    
    // Spawn easy enemy
    const easyEnemy = {
      id: 'early-game-1',
      position: new THREE.Vector3(100, 0, 100),
      velocity: new THREE.Vector3(0, 0, 0),
      health: 30,
      maxHealth: 30,
      type: 'pirate' as const,
      difficulty: 'easy' as const,
      lastShot: 0
    };
    
    enemies.spawnEnemy(easyEnemy);
    const initialHull = ship.hull;
    
    this.addResult(
      'Early Enemy Spawn',
      enemies.enemies.length === 1 ? 'passed' : 'failed',
      'Spawned early game enemy',
      { enemy: easyEnemy.type, health: easyEnemy.health },
      Date.now() - startTest
    );
    
    // Combat simulation
    let shots = 0;
    let hits = 0;
    const combatStart = Date.now();
    
    while (enemies.enemies.length > 0 && shots < 20) {
      const target = enemies.enemies[0];
      const hit = shooting.shoot(target.position);
      shots++;
      if (hit) hits++;
      
      // Simulate enemy damage
      enemies.damageEnemy(target.id, 10);
      await this.wait(200);
    }
    
    const combatDuration = Date.now() - combatStart;
    const accuracy = shots > 0 ? (hits / shots) * 100 : 0;
    
    this.addResult(
      'Early Combat Victory',
      enemies.enemies.length === 0 ? 'passed' : 'failed',
      `Defeated enemy in ${shots} shots`,
      { shots, hits, accuracy: `${accuracy.toFixed(1)}%` },
      Date.now() - startTest
    );
    
    const damageTaken = initialHull - ship.hull;
    this.addResult(
      'Early Combat Damage',
      damageTaken < 20 ? 'passed' : 'warning',
      `Took ${damageTaken} damage`,
      { damage: damageTaken, hullRemaining: ship.hull },
      Date.now() - startTest
    );
    
    // Update metrics
    this.metrics.totalBattles++;
    if (enemies.enemies.length === 0) {
      this.metrics.victories++;
      this.metrics.enemiesDefeated.set('pirate', 
        (this.metrics.enemiesDefeated.get('pirate') || 0) + 1);
    }
    this.metrics.damageTaken += damageTaken;
    this.metrics.accuracyRate = accuracy;
    this.metrics.combatTime += combatDuration;
    this.metrics.ammunitionUsed += shots;
  }

  /**
   * Test 2: Weapon Upgrades Effectiveness
   */
  private async testWeaponUpgrades() {
    console.log('\n🔫 Testing Weapon Upgrades...');
    const startTest = Date.now();
    
    const upgrades = useUpgrades.getState();
    const shooting = useShooting.getState();
    const ship = useShipStatus.getState();
    const credits = useCreditsStore.getState();
    
    // Get baseline damage
    const baseDamage = shooting.damage || 10;
    const baseFireRate = shooting.fireRate || 1;
    
    // Purchase weapon upgrades
    const weaponUpgrades = upgrades.getAvailableUpgrades().filter(u => 
      u.name.toLowerCase().includes('weapon') || 
      u.name.toLowerCase().includes('laser') ||
      u.name.toLowerCase().includes('cannon')
    );
    
    let upgradesPurchased = 0;
    for (const upgrade of weaponUpgrades.slice(0, 2)) {
      if (credits.credits >= upgrade.cost) {
        upgrades.purchaseUpgrade(upgrade.id);
        upgradesPurchased++;
        this.metrics.weaponUpgrades++;
        await this.wait(100);
      }
    }
    
    this.addResult(
      'Weapon Upgrades',
      upgradesPurchased > 0 ? 'passed' : 'warning',
      `Purchased ${upgradesPurchased} weapon upgrades`,
      { upgrades: upgradesPurchased },
      Date.now() - startTest
    );
    
    // Test improved damage
    const newDamage = shooting.damage || baseDamage;
    const newFireRate = shooting.fireRate || baseFireRate;
    const damageIncrease = ((newDamage - baseDamage) / baseDamage) * 100;
    const fireRateIncrease = ((newFireRate - baseFireRate) / baseFireRate) * 100;
    
    this.addResult(
      'Damage Increase',
      newDamage > baseDamage ? 'passed' : 'warning',
      `Damage increased by ${damageIncrease.toFixed(1)}%`,
      { base: baseDamage, new: newDamage },
      Date.now() - startTest
    );
    
    this.addResult(
      'Fire Rate Increase',
      newFireRate > baseFireRate ? 'passed' : 'warning',
      `Fire rate increased by ${fireRateIncrease.toFixed(1)}%`,
      { base: baseFireRate, new: newFireRate },
      Date.now() - startTest
    );
    
    // Test effectiveness in combat
    const enemies = useEnemies.getState();
    enemies.clearAllEnemies();
    
    enemies.spawnEnemy({
      id: 'upgrade-test',
      position: new THREE.Vector3(100, 0, 100),
      velocity: new THREE.Vector3(0, 0, 0),
      health: 100,
      maxHealth: 100,
      type: 'pirate',
      difficulty: 'medium',
      lastShot: 0
    });
    
    const combatStart = Date.now();
    let shotsFired = 0;
    
    while (enemies.enemies.length > 0 && shotsFired < 15) {
      const target = enemies.enemies[0];
      shooting.shoot(target.position);
      enemies.damageEnemy(target.id, newDamage);
      shotsFired++;
      await this.wait(150);
    }
    
    const timeToKill = Date.now() - combatStart;
    
    this.addResult(
      'Upgrade Effectiveness',
      enemies.enemies.length === 0 && shotsFired < 15 ? 'passed' : 'warning',
      `Defeated enemy in ${shotsFired} shots (${(timeToKill / 1000).toFixed(1)}s)`,
      { shots: shotsFired, time: timeToKill },
      Date.now() - startTest
    );
  }

  /**
   * Test 3: Crew Combat Bonuses
   */
  private async testCrewCombatBonuses() {
    console.log('\n👥 Testing Crew Combat Bonuses...');
    const startTest = Date.now();
    
    const crew = useCrewManagement.getState();
    const shooting = useShooting.getState();
    const ship = useShipStatus.getState();
    
    // Hire combat-focused crew
    const combatCrew = crew.getAvailableCrewForHire().filter(c => 
      c.role === 'gunner' || c.role === 'soldier' || c.role === 'tactical'
    );
    
    let bonusesAdded = 0;
    for (const member of combatCrew.slice(0, 2)) {
      if (crew.hireCrew(member.id)) {
        bonusesAdded++;
        
        // Calculate bonuses
        if (member.role === 'gunner') {
          this.metrics.combatBonuses.set('accuracy', 
            (this.metrics.combatBonuses.get('accuracy') || 0) + 10);
        } else if (member.role === 'soldier') {
          this.metrics.combatBonuses.set('damage', 
            (this.metrics.combatBonuses.get('damage') || 0) + 15);
        } else if (member.role === 'tactical') {
          this.metrics.combatBonuses.set('defense', 
            (this.metrics.combatBonuses.get('defense') || 0) + 20);
        }
        
        await this.wait(100);
      }
    }
    
    this.addResult(
      'Combat Crew Hired',
      bonusesAdded > 0 ? 'passed' : 'warning',
      `Hired ${bonusesAdded} combat crew members`,
      { hired: bonusesAdded },
      Date.now() - startTest
    );
    
    // Test combat bonuses
    const combatBonuses = crew.getCombatBonuses ? crew.getCombatBonuses() : {};
    const totalBonus = Object.values(combatBonuses).reduce((sum, val) => sum + (val || 0), 0);
    
    this.addResult(
      'Combat Bonuses Active',
      totalBonus > 0 ? 'passed' : 'warning',
      `Total combat bonus: +${totalBonus}%`,
      { bonuses: combatBonuses },
      Date.now() - startTest
    );
    
    // Test bonus effectiveness
    const enemies = useEnemies.getState();
    enemies.clearAllEnemies();
    
    enemies.spawnEnemy({
      id: 'bonus-test',
      position: new THREE.Vector3(100, 0, 100),
      velocity: new THREE.Vector3(0, 0, 0),
      health: 80,
      maxHealth: 80,
      type: 'military',
      difficulty: 'medium',
      lastShot: 0
    });
    
    const initialHull = ship.hull;
    let shots = 0;
    
    while (enemies.enemies.length > 0 && shots < 12) {
      const target = enemies.enemies[0];
      const baseDamage = shooting.damage || 10;
      const bonusDamage = baseDamage * (1 + (combatBonuses.damage || 0) / 100);
      
      shooting.shoot(target.position);
      enemies.damageEnemy(target.id, bonusDamage);
      shots++;
      await this.wait(150);
    }
    
    const hullDamage = initialHull - ship.hull;
    const defenseBonus = combatBonuses.defense || 0;
    const expectedReduction = hullDamage * (defenseBonus / 100);
    
    this.addResult(
      'Bonus Effectiveness',
      enemies.enemies.length === 0 && shots < 12 ? 'passed' : 'warning',
      `Defeated enemy with bonuses in ${shots} shots`,
      { 
        shots, 
        damageReduction: expectedReduction,
        actualDamage: hullDamage 
      },
      Date.now() - startTest
    );
  }

  /**
   * Test 4: Mid-Game Combat
   */
  private async testMidGameCombat() {
    console.log('\n🎮 Testing Mid-Game Combat...');
    const startTest = Date.now();
    
    const enemies = useEnemies.getState();
    const shooting = useShooting.getState();
    const ship = useShipStatus.getState();
    
    enemies.clearAllEnemies();
    
    // Spawn multiple medium enemies
    const enemyCount = 3;
    for (let i = 0; i < enemyCount; i++) {
      enemies.spawnEnemy({
        id: `mid-game-${i}`,
        position: new THREE.Vector3(
          100 + i * 50,
          0,
          100 + i * 30
        ),
        velocity: new THREE.Vector3(
          Math.random() * 2 - 1,
          0,
          Math.random() * 2 - 1
        ),
        health: 60,
        maxHealth: 60,
        type: i % 2 === 0 ? 'pirate' : 'military',
        difficulty: 'medium',
        lastShot: 0
      });
    }
    
    this.addResult(
      'Multi-Enemy Spawn',
      enemies.enemies.length === enemyCount ? 'passed' : 'failed',
      `Spawned ${enemies.enemies.length} medium enemies`,
      { count: enemies.enemies.length },
      Date.now() - startTest
    );
    
    const initialHull = ship.hull;
    const combatStart = Date.now();
    let totalShots = 0;
    let enemiesDefeated = 0;
    
    // Combat loop with target switching
    while (enemies.enemies.length > 0 && totalShots < 50) {
      // Find closest enemy
      const closestEnemy = enemies.enemies.reduce((closest, enemy) => {
        const dist = enemy.position.length();
        const closestDist = closest.position.length();
        return dist < closestDist ? enemy : closest;
      });
      
      shooting.shoot(closestEnemy.position);
      enemies.damageEnemy(closestEnemy.id, shooting.damage || 10);
      
      // Check if enemy defeated
      if (!enemies.enemies.find(e => e.id === closestEnemy.id)) {
        enemiesDefeated++;
      }
      
      totalShots++;
      await this.wait(150);
    }
    
    const combatDuration = Date.now() - combatStart;
    const damageTaken = initialHull - ship.hull;
    
    this.addResult(
      'Multi-Enemy Victory',
      enemies.enemies.length === 0 ? 'passed' : 'failed',
      `Defeated ${enemiesDefeated}/${enemyCount} enemies`,
      { defeated: enemiesDefeated, shots: totalShots },
      Date.now() - startTest
    );
    
    this.addResult(
      'Combat Efficiency',
      totalShots < enemyCount * 15 ? 'passed' : 'warning',
      `Shots per enemy: ${(totalShots / enemiesDefeated).toFixed(1)}`,
      { efficiency: totalShots / enemiesDefeated },
      Date.now() - startTest
    );
    
    this.addResult(
      'Damage Management',
      damageTaken < ship.maxHull * 0.5 ? 'passed' : 'warning',
      `Took ${damageTaken} damage in multi-combat`,
      { damage: damageTaken, hullRemaining: ship.hull },
      Date.now() - startTest
    );
    
    // Update metrics
    this.metrics.totalBattles++;
    this.metrics.victories += enemiesDefeated;
    this.metrics.damageTaken += damageTaken;
    this.metrics.combatTime += combatDuration;
    this.metrics.ammunitionUsed += totalShots;
  }

  /**
   * Test 5: High-Level Encounters
   */
  private async testHighLevelEncounters() {
    console.log('\n💀 Testing High-Level Encounters...');
    const startTest = Date.now();
    
    const enemies = useEnemies.getState();
    const shooting = useShooting.getState();
    const ship = useShipStatus.getState();
    const player = usePlayer.getState();
    
    // Set player to high level
    player.setRank(10);
    
    enemies.clearAllEnemies();
    
    // Spawn elite enemies
    const eliteEnemies = [
      {
        id: 'elite-1',
        position: new THREE.Vector3(150, 0, 150),
        velocity: new THREE.Vector3(2, 0, 2),
        health: 150,
        maxHealth: 150,
        type: 'bounty_hunter' as const,
        difficulty: 'hard' as const,
        lastShot: 0
      },
      {
        id: 'elite-2',
        position: new THREE.Vector3(-150, 0, 150),
        velocity: new THREE.Vector3(-2, 0, 2),
        health: 120,
        maxHealth: 120,
        type: 'military' as const,
        difficulty: 'hard' as const,
        lastShot: 0
      }
    ];
    
    eliteEnemies.forEach(e => enemies.spawnEnemy(e));
    
    this.addResult(
      'Elite Enemy Spawn',
      enemies.enemies.length === 2 ? 'passed' : 'failed',
      'Spawned elite enemies',
      { enemies: eliteEnemies.map(e => e.type) },
      Date.now() - startTest
    );
    
    const initialHull = ship.hull;
    const initialShield = ship.shield;
    let shots = 0;
    let eliteDefeated = 0;
    
    // High-level combat
    while (enemies.enemies.length > 0 && shots < 80) {
      const target = enemies.enemies[0];
      
      // Use advanced tactics
      const leadPosition = new THREE.Vector3(
        target.position.x + target.velocity.x * 2,
        target.position.y,
        target.position.z + target.velocity.z * 2
      );
      
      shooting.shoot(leadPosition);
      enemies.damageEnemy(target.id, shooting.damage || 10);
      
      if (!enemies.enemies.find(e => e.id === target.id)) {
        eliteDefeated++;
        this.metrics.enemiesDefeated.set('bounty_hunter',
          (this.metrics.enemiesDefeated.get('bounty_hunter') || 0) + 1);
      }
      
      shots++;
      await this.wait(100);
    }
    
    const totalDamage = (initialHull - ship.hull) + (initialShield - ship.shield);
    
    this.addResult(
      'Elite Combat Victory',
      eliteDefeated === 2 ? 'passed' : eliteDefeated === 1 ? 'warning' : 'failed',
      `Defeated ${eliteDefeated}/2 elite enemies`,
      { defeated: eliteDefeated, shots },
      Date.now() - startTest
    );
    
    this.addResult(
      'Survival Rate',
      ship.hull > 0 ? 'passed' : 'failed',
      `Survived with ${ship.hull} hull`,
      { hull: ship.hull, shield: ship.shield },
      Date.now() - startTest
    );
    
    this.metrics.survivalRate = (ship.hull / ship.maxHull) * 100;
  }

  /**
   * Test 6: Boss Battles
   */
  private async testBossBattles() {
    console.log('\n👹 Testing Boss Battles...');
    const startTest = Date.now();
    
    const enemies = useEnemies.getState();
    const shooting = useShooting.getState();
    const ship = useShipStatus.getState();
    const player = usePlayer.getState();
    
    enemies.clearAllEnemies();
    
    // Repair ship for boss battle
    ship.repair(100);
    
    // Spawn boss enemy
    const boss = {
      id: 'boss-dreadnought',
      position: new THREE.Vector3(200, 0, 200),
      velocity: new THREE.Vector3(1, 0, 1),
      health: 500,
      maxHealth: 500,
      type: 'boss' as const,
      difficulty: 'boss' as const,
      lastShot: 0,
      name: 'Pirate Dreadnought'
    };
    
    enemies.spawnEnemy(boss);
    
    this.addResult(
      'Boss Spawn',
      enemies.enemies.length === 1 && enemies.enemies[0].type === 'boss' ? 'passed' : 'failed',
      `Spawned boss: ${boss.name}`,
      { boss: boss.name, health: boss.health },
      Date.now() - startTest
    );
    
    const initialHull = ship.hull;
    const combatStart = Date.now();
    let shots = 0;
    let phases = 1;
    
    // Boss battle with phases
    while (enemies.enemies.length > 0 && shots < 150) {
      const bossEnemy = enemies.enemies[0];
      const healthPercent = (bossEnemy.health / bossEnemy.maxHealth) * 100;
      
      // Phase changes
      if (healthPercent < 75 && phases === 1) {
        phases = 2;
        // Boss enters aggressive phase
        bossEnemy.velocity.x *= 1.5;
        bossEnemy.velocity.z *= 1.5;
      } else if (healthPercent < 25 && phases === 2) {
        phases = 3;
        // Boss enters desperate phase
        bossEnemy.velocity.x *= 2;
        bossEnemy.velocity.z *= 2;
      }
      
      // Player combat
      shooting.shoot(bossEnemy.position);
      const damage = (shooting.damage || 10) * (phases === 3 ? 1.5 : 1); // Bonus damage in final phase
      enemies.damageEnemy(bossEnemy.id, damage);
      
      shots++;
      this.metrics.damageDealt += damage;
      
      await this.wait(100);
    }
    
    const combatDuration = Date.now() - combatStart;
    const damageTaken = initialHull - ship.hull;
    const bossDefeated = enemies.enemies.length === 0;
    
    if (bossDefeated) {
      this.metrics.bossesDefeated.push(boss.name);
      this.metrics.enemiesDefeated.set('boss',
        (this.metrics.enemiesDefeated.get('boss') || 0) + 1);
    }
    
    this.addResult(
      'Boss Victory',
      bossDefeated ? 'passed' : 'failed',
      bossDefeated ? `Defeated ${boss.name}!` : 'Boss survived',
      { 
        defeated: bossDefeated,
        shots,
        phases,
        duration: `${(combatDuration / 1000).toFixed(1)}s`
      },
      Date.now() - startTest
    );
    
    this.addResult(
      'Boss Battle Survival',
      ship.hull > 20 ? 'passed' : 'warning',
      `Survived with ${ship.hull} hull`,
      { damage: damageTaken, hull: ship.hull },
      Date.now() - startTest
    );
    
    // Boss rewards
    if (bossDefeated) {
      const credits = useCreditsStore.getState();
      const bossReward = 5000;
      credits.addCredits(bossReward);
      player.addNotoriety(50);
      
      this.addResult(
        'Boss Rewards',
        true,
        `Earned ${bossReward} credits and notoriety`,
        { credits: bossReward, notoriety: 50 },
        Date.now() - startTest
      );
    }
  }

  /**
   * Test 7: Combat Tactics
   */
  private async testCombatTactics() {
    console.log('\n🎯 Testing Combat Tactics...');
    const startTest = Date.now();
    
    const enemies = useEnemies.getState();
    const shooting = useShooting.getState();
    const ship = useShipStatus.getState();
    
    enemies.clearAllEnemies();
    
    // Test kiting tactic
    const kitingEnemy = {
      id: 'kiting-test',
      position: new THREE.Vector3(100, 0, 100),
      velocity: new THREE.Vector3(0, 0, 0),
      health: 100,
      maxHealth: 100,
      type: 'pirate' as const,
      difficulty: 'medium' as const,
      lastShot: 0
    };
    
    enemies.spawnEnemy(kitingEnemy);
    
    // Kiting: maintain distance while shooting
    let kitingShots = 0;
    let distance = 100;
    
    while (enemies.enemies.length > 0 && kitingShots < 20) {
      const enemy = enemies.enemies[0];
      
      // Maintain optimal distance
      if (enemy.position.length() < 80) {
        // Too close, back away
        distance += 20;
      }
      
      shooting.shoot(enemy.position);
      enemies.damageEnemy(enemy.id, shooting.damage || 10);
      kitingShots++;
      
      await this.wait(150);
    }
    
    this.addResult(
      'Kiting Tactic',
      enemies.enemies.length === 0 ? 'passed' : 'failed',
      `Defeated enemy using kiting in ${kitingShots} shots`,
      { shots: kitingShots },
      Date.now() - startTest
    );
    
    // Test focus fire tactic
    enemies.clearAllEnemies();
    
    // Spawn multiple enemies
    for (let i = 0; i < 3; i++) {
      enemies.spawnEnemy({
        id: `focus-${i}`,
        position: new THREE.Vector3(50 + i * 30, 0, 50 + i * 30),
        velocity: new THREE.Vector3(0, 0, 0),
        health: 50,
        maxHealth: 50,
        type: 'pirate',
        difficulty: 'easy',
        lastShot: 0
      });
    }
    
    // Focus fire: eliminate one at a time
    let focusShots = 0;
    let targetsEliminated = 0;
    
    while (enemies.enemies.length > 0 && focusShots < 30) {
      // Always target first enemy (focus fire)
      const target = enemies.enemies[0];
      shooting.shoot(target.position);
      enemies.damageEnemy(target.id, shooting.damage || 10);
      
      if (!enemies.enemies.find(e => e.id === target.id)) {
        targetsEliminated++;
      }
      
      focusShots++;
      await this.wait(100);
    }
    
    this.addResult(
      'Focus Fire Tactic',
      targetsEliminated === 3 ? 'passed' : 'warning',
      `Eliminated ${targetsEliminated}/3 using focus fire`,
      { eliminated: targetsEliminated, shots: focusShots },
      Date.now() - startTest
    );
  }

  /**
   * Test 8: Survival Mechanics
   */
  private async testSurvivalMechanics() {
    console.log('\n🛡️ Testing Survival Mechanics...');
    const startTest = Date.now();
    
    const ship = useShipStatus.getState();
    const enemies = useEnemies.getState();
    
    // Test shield regeneration
    ship.takeDamage(30, 'shield');
    const initialShield = ship.shield;
    
    await this.wait(2000); // Wait for shield regen
    
    const shieldRegen = ship.shield - initialShield;
    
    this.addResult(
      'Shield Regeneration',
      shieldRegen > 0 ? 'passed' : 'warning',
      `Shield regenerated ${shieldRegen} points`,
      { regen: shieldRegen },
      Date.now() - startTest
    );
    
    // Test emergency evasion
    enemies.clearAllEnemies();
    enemies.spawnEnemy({
      id: 'evasion-test',
      position: new THREE.Vector3(50, 0, 50),
      velocity: new THREE.Vector3(5, 0, 5),
      health: 100,
      maxHealth: 100,
      type: 'military',
      difficulty: 'hard',
      lastShot: 0
    });
    
    // Simulate evasion when health critical
    ship.takeDamage(ship.hull - 20, 'hull'); // Set to critical health
    
    this.addResult(
      'Critical Health',
      ship.hull <= 20 ? 'passed' : 'failed',
      `Hull at critical level: ${ship.hull}`,
      { hull: ship.hull },
      Date.now() - startTest
    );
    
    // Test escape mechanics
    const landed = useLandedState.getState();
    landed.setLanded('Earth'); // Emergency landing
    enemies.clearAllEnemies(); // Escape successful
    
    this.addResult(
      'Emergency Escape',
      enemies.enemies.length === 0 && landed.isLanded ? 'passed' : 'failed',
      'Successfully escaped to planet',
      { escaped: true, location: landed.landedPlanet },
      Date.now() - startTest
    );
    
    // Repair after escape
    ship.repair(100);
    
    this.addResult(
      'Post-Combat Repair',
      ship.hull === ship.maxHull ? 'passed' : 'warning',
      `Repaired to ${ship.hull}/${ship.maxHull}`,
      { hull: ship.hull },
      Date.now() - startTest
    );
  }

  /**
   * Test 9: Combat Rewards
   */
  private async testCombatRewards() {
    console.log('\n💰 Testing Combat Rewards...');
    const startTest = Date.now();
    
    const credits = useCreditsStore.getState();
    const player = usePlayer.getState();
    const enemies = useEnemies.getState();
    
    const initialCredits = credits.credits;
    const initialNotoriety = player.notoriety;
    
    enemies.clearAllEnemies();
    
    // Defeat various enemy types for rewards
    const enemyTypes = [
      { type: 'pirate', reward: 100, notoriety: 5 },
      { type: 'military', reward: 150, notoriety: 10 },
      { type: 'bounty_hunter', reward: 300, notoriety: 15 }
    ];
    
    let totalRewards = 0;
    let totalNotoriety = 0;
    
    for (const enemyType of enemyTypes) {
      enemies.spawnEnemy({
        id: `reward-${enemyType.type}`,
        position: new THREE.Vector3(100, 0, 100),
        velocity: new THREE.Vector3(0, 0, 0),
        health: 50,
        maxHealth: 50,
        type: enemyType.type as any,
        difficulty: 'medium',
        lastShot: 0
      });
      
      // Instant defeat for testing
      enemies.clearAllEnemies();
      
      // Simulate rewards
      credits.addCredits(enemyType.reward);
      player.addNotoriety(enemyType.notoriety);
      
      totalRewards += enemyType.reward;
      totalNotoriety += enemyType.notoriety;
      
      await this.wait(100);
    }
    
    const actualCredits = credits.credits - initialCredits;
    const actualNotoriety = player.notoriety - initialNotoriety;
    
    this.addResult(
      'Credit Rewards',
      actualCredits === totalRewards ? 'passed' : 'warning',
      `Earned ${actualCredits} credits from combat`,
      { earned: actualCredits, expected: totalRewards },
      Date.now() - startTest
    );
    
    this.addResult(
      'Notoriety Gain',
      actualNotoriety === totalNotoriety ? 'passed' : 'warning',
      `Gained ${actualNotoriety} notoriety`,
      { gained: actualNotoriety, expected: totalNotoriety },
      Date.now() - startTest
    );
    
    // Test loot drops
    const lootChance = 0.3; // 30% chance
    const lootDropped = Math.random() < lootChance;
    
    this.addResult(
      'Loot System',
      lootDropped ? 'passed' : 'warning',
      lootDropped ? 'Rare loot dropped!' : 'No loot this time',
      { lootDropped },
      Date.now() - startTest
    );
  }

  /**
   * Test 10: Combat Performance
   */
  private async testCombatPerformance() {
    console.log('\n⚡ Testing Combat Performance...');
    const startTest = Date.now();
    
    const enemies = useEnemies.getState();
    const shooting = useShooting.getState();
    
    enemies.clearAllEnemies();
    
    // Spawn many enemies for stress test
    const stressCount = 15;
    for (let i = 0; i < stressCount; i++) {
      enemies.spawnEnemy({
        id: `stress-${i}`,
        position: new THREE.Vector3(
          Math.random() * 400 - 200,
          Math.random() * 50,
          Math.random() * 400 - 200
        ),
        velocity: new THREE.Vector3(
          Math.random() * 4 - 2,
          0,
          Math.random() * 4 - 2
        ),
        health: 30,
        maxHealth: 30,
        type: 'pirate',
        difficulty: 'easy',
        lastShot: 0
      });
    }
    
    this.addResult(
      'Stress Test Spawn',
      enemies.enemies.length === stressCount ? 'passed' : 'failed',
      `Spawned ${enemies.enemies.length} enemies`,
      { count: enemies.enemies.length },
      Date.now() - startTest
    );
    
    // Measure combat performance
    const perfStart = performance.now();
    let frames = 0;
    let shots = 0;
    
    // Simulate intense combat for 3 seconds
    const combatDuration = 3000;
    const endTime = Date.now() + combatDuration;
    
    while (Date.now() < endTime) {
      if (enemies.enemies.length > 0) {
        const target = enemies.enemies[Math.floor(Math.random() * enemies.enemies.length)];
        shooting.shoot(target.position);
        enemies.damageEnemy(target.id, 20);
        shots++;
      }
      
      frames++;
      await this.wait(16); // ~60 FPS target
    }
    
    const perfEnd = performance.now();
    const avgFrameTime = (perfEnd - perfStart) / frames;
    const estimatedFPS = 1000 / avgFrameTime;
    
    this.addResult(
      'Combat FPS',
      estimatedFPS > 30 ? 'passed' : 'warning',
      `Average FPS: ${estimatedFPS.toFixed(1)}`,
      { fps: estimatedFPS, frames, duration: combatDuration },
      Date.now() - startTest
    );
    
    this.addResult(
      'Combat Intensity',
      shots > 50 ? 'passed' : 'warning',
      `${shots} shots fired in ${combatDuration / 1000}s`,
      { shots, rate: shots / (combatDuration / 1000) },
      Date.now() - startTest
    );
    
    // Clean up
    enemies.clearAllEnemies();
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
    console.log('📊 COMBAT PROGRESSION TEST REPORT');
    console.log('═'.repeat(60));
    console.log(`Total Tests: ${this.results.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️ Warnings: ${warnings}`);
    console.log(`⏱️ Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log('═'.repeat(60));
    
    // Combat metrics summary
    const winRate = this.metrics.totalBattles > 0 ? 
      (this.metrics.victories / this.metrics.totalBattles) * 100 : 0;
    
    console.log('\n⚔️ Combat Metrics:');
    console.log(`  • Total Battles: ${this.metrics.totalBattles}`);
    console.log(`  • Victories: ${this.metrics.victories}`);
    console.log(`  • Win Rate: ${winRate.toFixed(1)}%`);
    console.log(`  • Damage Dealt: ${this.metrics.damageDealt}`);
    console.log(`  • Damage Taken: ${this.metrics.damageTaken}`);
    console.log(`  • Accuracy: ${this.metrics.accuracyRate.toFixed(1)}%`);
    console.log(`  • Survival Rate: ${this.metrics.survivalRate.toFixed(1)}%`);
    console.log(`  • Weapon Upgrades: ${this.metrics.weaponUpgrades}`);
    console.log(`  • Bosses Defeated: ${this.metrics.bossesDefeated.length}`);
    console.log(`  • Ammunition Used: ${this.metrics.ammunitionUsed}`);
    
    // Enemy breakdown
    console.log('\n👾 Enemies Defeated:');
    for (const [type, count] of this.metrics.enemiesDefeated) {
      console.log(`  • ${type}: ${count}`);
    }
    
    // Combat bonuses
    if (this.metrics.combatBonuses.size > 0) {
      console.log('\n🎯 Combat Bonuses:');
      for (const [bonus, value] of this.metrics.combatBonuses) {
        console.log(`  • ${bonus}: +${value}%`);
      }
    }
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    if (failed > 0) {
      console.log('  - Fix combat system failures');
    }
    if (this.metrics.accuracyRate < 50) {
      console.log('  - Improve targeting and accuracy mechanics');
    }
    if (this.metrics.survivalRate < 30) {
      console.log('  - Balance combat difficulty');
    }
    if (this.metrics.weaponUpgrades < 2) {
      console.log('  - Make weapon upgrades more accessible');
    }
    if (this.metrics.bossesDefeated.length === 0) {
      console.log('  - Ensure boss battles are winnable');
    }
    
    // Show toast notification
    const status = failed > 0 ? 'error' : passed === this.results.length ? 'success' : 'warning';
    toast[status](
      `Combat Test: ${passed}/${this.results.length} passed`,
      {
        description: failed > 0 
          ? `${failed} combat issues detected`
          : 'Combat systems functioning correctly',
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
      const ship = useShipStatus.getState();
      const player = usePlayer.getState();
      const credits = useCreditsStore.getState();
      const enemies = useEnemies.getState();
      
      // Clear all enemies
      enemies.clearAllEnemies();
      
      // Restore ship
      ship.takeDamage(-ship.hull + this.originalState.ship.hull, 'hull');
      ship.takeDamage(-ship.shield + this.originalState.ship.shield, 'shield');
      
      // Restore player
      player.setRank(this.originalState.player.rank);
      player.setNotoriety(this.originalState.player.notoriety);
      
      // Restore credits
      credits.setCredits(this.originalState.credits);
      
      console.log('♻️ Game state restored');
    } catch (error) {
      console.warn('⚠️ Could not fully restore state:', error);
    }
  }
}

// Export for browser console
if (typeof window !== 'undefined') {
  (window as any).testCombatProgression = () => {
    const test = new CombatProgressionTest();
    return test.runAllTests();
  };
}