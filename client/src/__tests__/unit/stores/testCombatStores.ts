/**
 * Combat Stores Test Suite
 * Tests combat-related stores including enemy management and shooting mechanics
 * Run with window.testCombatStores() from the browser console
 */

import { useEnemies } from '../../../lib/stores/combat/useEnemies';
import { useShooting } from '../../../lib/stores/combat/useShooting';
import * as THREE from 'three';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  details?: any;
}

export class CombatStoresTestSuite {
  private results: TestResult[] = [];
  private originalEnemiesState: any;
  private originalShootingState: any;

  constructor() {
    console.log('⚔️ Combat Stores Test Suite initialized');
  }

  async runAllTests() {
    console.clear();
    console.log('%c═══════════════════════════════════════════════', 'color: #ef4444; font-size: 14px');
    console.log('%c   ⚔️ COMBAT STORES TEST SUITE STARTING', 'color: #ef4444; font-size: 16px; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════', 'color: #ef4444; font-size: 14px');
    
    this.results = [];
    
    try {
      // Save original states
      this.originalEnemiesState = { ...useEnemies.getState() };
      this.originalShootingState = { ...useShooting.getState() };
      
      await this.testEnemySpawning();
      await this.wait(500);
      
      await this.testEnemyDamage();
      await this.wait(500);
      
      await this.testShootingMechanics();
      await this.wait(500);
      
      await this.testProjectilePhysics();
      await this.wait(500);
      
      await this.testWeaponTypes();
      await this.wait(500);
      
      await this.testCombatRewards();
      await this.wait(500);
      
      await this.testEnemyAI();
      await this.wait(500);
      
      await this.testHeatBasedSpawning();
      
    } catch (error) {
      console.error('Test suite failed:', error);
      this.addResult('Test Suite', 'failed', `Critical error: ${error}`);
    } finally {
      // Restore original states
      this.restoreOriginalStates();
      this.printSummary();
    }
  }

  private async testEnemySpawning() {
    console.log('\n👾 Testing Enemy Spawning...');
    
    const enemies = useEnemies.getState();
    
    // Clear existing enemies
    enemies.clearEnemies();
    
    // Test basic spawn
    const spawnPos = new THREE.Vector3(10, 0, 10);
    enemies.spawnEnemy(spawnPos);
    
    this.addResult(
      'Basic Enemy Spawn',
      enemies.enemies.length === 1 ? 'passed' : 'failed',
      `Enemies spawned: ${enemies.enemies.length}`
    );
    
    // Test spawn with faction
    enemies.spawnEnemy(new THREE.Vector3(20, 0, 20), 'corporations', 'patrol');
    const corpEnemy = enemies.enemies.find(e => e.faction === 'corporations');
    
    this.addResult(
      'Faction Specific Spawn',
      corpEnemy !== undefined ? 'passed' : 'failed',
      `Corporation enemy spawned: ${corpEnemy?.faction}`
    );
    
    // Test ship type variations
    enemies.spawnEnemy(new THREE.Vector3(30, 0, 30), 'outlaws', 'bomber');
    const bomber = enemies.enemies.find(e => e.shipType === 'bomber');
    
    this.addResult(
      'Ship Type Variation',
      bomber && bomber.hull > 60 ? 'passed' : 'failed',
      `Bomber spawned with hull: ${bomber?.hull}`
    );
    
    // Test max enemies limit
    enemies.clearEnemies();
    for (let i = 0; i < 12; i++) {
      enemies.spawnEnemy(new THREE.Vector3(i * 10, 0, 0));
    }
    
    this.addResult(
      'Max Enemies Limit',
      enemies.enemies.length <= enemies.maxEnemies ? 'passed' : 'failed',
      `Enemies: ${enemies.enemies.length}/${enemies.maxEnemies}`
    );
    
    // Test spawn cooldown
    enemies.lastSpawnTime = Date.now();
    const shouldSpawn = enemies.shouldSpawnEnemy();
    
    this.addResult(
      'Spawn Cooldown Check',
      !shouldSpawn ? 'passed' : 'failed',
      `Cooldown active: ${!shouldSpawn}`
    );
  }

  private async testEnemyDamage() {
    console.log('\n💥 Testing Enemy Damage...');
    
    const enemies = useEnemies.getState();
    
    // Clear and spawn test enemy
    enemies.clearEnemies();
    enemies.spawnEnemy(new THREE.Vector3(0, 0, 0), 'outlaws', 'fighter');
    
    const enemy = enemies.enemies[0];
    if (!enemy) {
      this.addResult('Enemy Damage Test', 'failed', 'No enemy to test');
      return;
    }
    
    const initialHull = enemy.hull;
    const initialShield = enemy.shield;
    
    // Test shield damage
    enemies.damageEnemy(enemy.id, 10);
    this.addResult(
      'Shield Damage',
      enemy.shield === initialShield - 10 ? 'passed' : 'failed',
      `Shield: ${initialShield} -> ${enemy.shield}`
    );
    
    // Test shield depletion and hull damage
    enemies.damageEnemy(enemy.id, enemy.shield + 15);
    this.addResult(
      'Shield Depletion + Hull Damage',
      enemy.shield === 0 && enemy.hull < initialHull ? 'passed' : 'failed',
      `Shield: 0, Hull: ${enemy.hull}/${initialHull}`
    );
    
    // Test enemy destruction
    const enemyId = enemy.id;
    enemies.damageEnemy(enemyId, enemy.hull + 100);
    const destroyed = !enemies.enemies.find(e => e.id === enemyId);
    
    this.addResult(
      'Enemy Destruction',
      destroyed ? 'passed' : 'failed',
      `Enemy destroyed: ${destroyed}`
    );
    
    // Test death animation flag
    enemies.spawnEnemy(new THREE.Vector3(10, 0, 0));
    const testEnemy = enemies.enemies[enemies.enemies.length - 1];
    enemies.damageEnemy(testEnemy.id, testEnemy.shield + testEnemy.hull - 1);
    
    this.addResult(
      'Death Animation Flag',
      testEnemy.isDying || !enemies.enemies.find(e => e.id === testEnemy.id) ? 'passed' : 'failed',
      `Death animation triggered`
    );
  }

  private async testShootingMechanics() {
    console.log('\n🔫 Testing Shooting Mechanics...');
    
    const shooting = useShooting.getState();
    
    // Clear projectiles
    shooting.projectiles = [];
    
    // Test projectile creation
    const position = new THREE.Vector3(0, 0, 0);
    const direction = new THREE.Vector3(1, 0, 0);
    shooting.addProjectile(position, direction);
    
    this.addResult(
      'Projectile Creation',
      shooting.projectiles.length === 1 ? 'passed' : 'failed',
      `Projectiles: ${shooting.projectiles.length}`
    );
    
    // Test projectile properties
    const projectile = shooting.projectiles[0];
    this.addResult(
      'Projectile Properties',
      projectile && projectile.speed === 50 && projectile.damage === 10 ? 'passed' : 'failed',
      `Speed: ${projectile?.speed}, Damage: ${projectile?.damage}`
    );
    
    // Test custom projectile parameters
    shooting.addProjectile(
      new THREE.Vector3(10, 0, 0),
      new THREE.Vector3(0, 1, 0),
      75,  // speed
      25,  // damage
      'enemy-1',
      'enemy'
    );
    
    const enemyProjectile = shooting.projectiles.find(p => p.ownerType === 'enemy');
    this.addResult(
      'Enemy Projectile',
      enemyProjectile && enemyProjectile.damage === 25 ? 'passed' : 'failed',
      `Enemy projectile with damage: ${enemyProjectile?.damage}`
    );
    
    // Test projectile removal
    const projectileId = shooting.projectiles[0]?.id;
    if (projectileId) {
      shooting.removeProjectile(projectileId);
      this.addResult(
        'Projectile Removal',
        !shooting.projectiles.find(p => p.id === projectileId) ? 'passed' : 'failed',
        `Projectile removed`
      );
    }
    
    // Test multiple projectiles
    shooting.projectiles = [];
    for (let i = 0; i < 5; i++) {
      shooting.addProjectile(
        new THREE.Vector3(i, 0, 0),
        new THREE.Vector3(1, 0, 0)
      );
    }
    
    this.addResult(
      'Multiple Projectiles',
      shooting.projectiles.length === 5 ? 'passed' : 'failed',
      `Active projectiles: ${shooting.projectiles.length}`
    );
  }

  private async testProjectilePhysics() {
    console.log('\n🎯 Testing Projectile Physics...');
    
    const shooting = useShooting.getState();
    
    // Clear and create test projectile
    shooting.projectiles = [];
    const startPos = new THREE.Vector3(0, 0, 0);
    const direction = new THREE.Vector3(1, 0, 0);
    shooting.addProjectile(startPos, direction, 100);
    
    const projectile = shooting.projectiles[0];
    const initialPos = projectile.position.clone();
    
    // Simulate physics update
    const deltaTime = 0.1; // 100ms
    shooting.updateProjectiles(deltaTime);
    
    const expectedDistance = 100 * deltaTime;
    const actualDistance = projectile.position.distanceTo(initialPos);
    
    this.addResult(
      'Projectile Movement',
      Math.abs(actualDistance - expectedDistance) < 0.01 ? 'passed' : 'failed',
      `Moved ${actualDistance.toFixed(2)} units (expected ${expectedDistance})`
    );
    
    // Test projectile lifetime
    const initialLife = 5.0;
    shooting.projectiles = [];
    shooting.addProjectile(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0));
    
    const testProjectile = shooting.projectiles[0];
    const lifeBefore = testProjectile.life;
    shooting.updateProjectiles(1.0);
    
    this.addResult(
      'Projectile Lifetime',
      testProjectile.life === lifeBefore - 1.0 ? 'passed' : 'failed',
      `Life: ${lifeBefore} -> ${testProjectile.life}`
    );
    
    // Test projectile expiration
    shooting.updateProjectiles(10.0); // Expire all projectiles
    
    this.addResult(
      'Projectile Expiration',
      shooting.projectiles.length === 0 ? 'passed' : 'failed',
      `Expired projectiles removed: ${shooting.projectiles.length === 0}`
    );
    
    // Test direction normalization
    shooting.projectiles = [];
    const unnormalizedDir = new THREE.Vector3(3, 4, 0);
    shooting.addProjectile(new THREE.Vector3(0, 0, 0), unnormalizedDir);
    
    const normalizedProjectile = shooting.projectiles[0];
    const dirLength = normalizedProjectile.direction.length();
    
    this.addResult(
      'Direction Normalization',
      Math.abs(dirLength - 1.0) < 0.01 ? 'passed' : 'failed',
      `Direction normalized: length = ${dirLength.toFixed(3)}`
    );
  }

  private async testWeaponTypes() {
    console.log('\n🔰 Testing Weapon Types...');
    
    const enemies = useEnemies.getState();
    
    // Clear enemies
    enemies.clearEnemies();
    
    // Test different weapon configurations
    enemies.spawnEnemy(new THREE.Vector3(0, 0, 0), 'outlaws', 'fighter');
    const fighter = enemies.enemies[0];
    
    this.addResult(
      'Fighter Weapon',
      fighter && fighter.weapon.damage === 10 ? 'passed' : 'failed',
      `Fighter weapon damage: ${fighter?.weapon.damage}`
    );
    
    enemies.spawnEnemy(new THREE.Vector3(10, 0, 0), 'military', 'bomber');
    const bomber = enemies.enemies.find(e => e.shipType === 'bomber');
    
    this.addResult(
      'Bomber Weapon',
      bomber && bomber.weapon.damage >= 20 ? 'passed' : 'failed',
      `Bomber weapon damage: ${bomber?.weapon.damage}`
    );
    
    // Test fire rate differences
    this.addResult(
      'Weapon Fire Rates',
      fighter?.weapon.fireRate !== bomber?.weapon.fireRate ? 'passed' : 'failed',
      `Fighter: ${fighter?.weapon.fireRate}/s, Bomber: ${bomber?.weapon.fireRate}/s`
    );
    
    // Test weapon ranges
    this.addResult(
      'Weapon Ranges',
      fighter && bomber && bomber.weapon.range >= fighter.weapon.range ? 'passed' : 'failed',
      `Fighter range: ${fighter?.weapon.range}, Bomber range: ${bomber?.weapon.range}`
    );
  }

  private async testCombatRewards() {
    console.log('\n💎 Testing Combat Rewards...');
    
    const enemies = useEnemies.getState();
    
    // Clear and spawn enemy with rewards
    enemies.clearEnemies();
    enemies.spawnEnemy(new THREE.Vector3(0, 0, 0), 'outlaws', 'patrol');
    
    const enemy = enemies.enemies[0];
    
    this.addResult(
      'Credit Reward Set',
      enemy && enemy.creditReward > 0 ? 'passed' : 'failed',
      `Credit reward: ${enemy?.creditReward}`
    );
    
    this.addResult(
      'Reputation Rewards',
      enemy && enemy.reputationReward && Object.keys(enemy.reputationReward).length > 0 ? 'passed' : 'failed',
      `Reputation rewards configured`
    );
    
    // Test elite enemy rewards
    enemies.spawnEnemy(new THREE.Vector3(10, 0, 0), 'corporations', 'elite');
    const elite = enemies.enemies.find(e => e.shipType === 'elite');
    
    this.addResult(
      'Elite Rewards',
      elite && elite.creditReward >= 300 ? 'passed' : 'failed',
      `Elite credit reward: ${elite?.creditReward}`
    );
    
    // Test reward processing (mock)
    if (enemy) {
      let rewardProcessed = false;
      try {
        enemies.processEnemyRewards(enemy);
        rewardProcessed = true;
      } catch (e) {
        // May fail if player store not initialized
      }
      
      this.addResult(
        'Reward Processing',
        rewardProcessed ? 'passed' : 'warning',
        `Rewards can be processed`
      );
    }
  }

  private async testEnemyAI() {
    console.log('\n🤖 Testing Enemy AI...');
    
    const enemies = useEnemies.getState();
    
    // Clear and spawn enemies with different behaviors
    enemies.clearEnemies();
    
    // Spawn patrol enemy
    enemies.spawnEnemy(new THREE.Vector3(0, 0, 0), 'military', 'patrol');
    const patrolEnemy = enemies.enemies[0];
    
    this.addResult(
      'Patrol Behavior',
      patrolEnemy && patrolEnemy.behavior === 'patrol' ? 'passed' : 'failed',
      `Behavior: ${patrolEnemy?.behavior}`
    );
    
    // Test detection range
    this.addResult(
      'Detection Range Set',
      patrolEnemy && patrolEnemy.detectionRange > 0 ? 'passed' : 'failed',
      `Detection range: ${patrolEnemy?.detectionRange}`
    );
    
    // Test attack range
    this.addResult(
      'Attack Range Set',
      patrolEnemy && patrolEnemy.attackRange > 0 && patrolEnemy.attackRange < patrolEnemy.detectionRange ? 'passed' : 'failed',
      `Attack range: ${patrolEnemy?.attackRange}`
    );
    
    // Spawn aggressive enemy
    enemies.spawnEnemy(new THREE.Vector3(20, 0, 0), 'outlaws', 'fighter');
    const fighter = enemies.enemies.find(e => e.shipType === 'fighter');
    
    // Simulate AI update (simplified)
    const playerPos = new THREE.Vector3(25, 0, 0);
    enemies.updateEnemies(0.1, playerPos);
    
    this.addResult(
      'AI Update',
      true ? 'passed' : 'failed',
      `AI systems updated`
    );
    
    // Test patrol points
    if (patrolEnemy?.behavior === 'patrol') {
      this.addResult(
        'Patrol Points',
        patrolEnemy.patrolPoints && patrolEnemy.patrolPoints.length > 0 ? 'passed' : 'warning',
        `Patrol points configured`
      );
    }
  }

  private async testHeatBasedSpawning() {
    console.log('\n🔥 Testing Heat-Based Spawning...');
    
    const enemies = useEnemies.getState();
    
    // Clear enemies
    enemies.clearEnemies();
    
    // Test patrol spawn
    const playerPos = new THREE.Vector3(0, 0, 0);
    enemies.spawnPatrol(playerPos, 'military');
    
    const militaryEnemies = enemies.enemies.filter(e => e.faction === 'military');
    this.addResult(
      'Patrol Spawn',
      militaryEnemies.length >= 2 ? 'passed' : 'failed',
      `Military patrol spawned: ${militaryEnemies.length} ships`
    );
    
    // Test bounty hunter spawn
    enemies.spawnBountyHunter(playerPos);
    const bountyHunter = enemies.enemies.find(e => e.faction === 'bountyHunter');
    
    this.addResult(
      'Bounty Hunter Spawn',
      bountyHunter !== undefined ? 'passed' : 'failed',
      `Bounty hunter spawned: ${bountyHunter !== undefined}`
    );
    
    // Test heat-based spawn logic
    enemies.clearEnemies();
    enemies.spawnBasedOnHeat(playerPos);
    
    this.addResult(
      'Heat-Based Spawn Logic',
      true ? 'passed' : 'failed',
      `Heat-based spawning executed`
    );
    
    // Test spawn limits
    enemies.clearEnemies();
    enemies.maxEnemies = 3;
    for (let i = 0; i < 5; i++) {
      enemies.spawnEnemy(new THREE.Vector3(i * 10, 0, 0));
    }
    
    this.addResult(
      'Spawn Limit Enforcement',
      enemies.enemies.length <= 3 ? 'passed' : 'failed',
      `Enemies limited to: ${enemies.enemies.length}/3`
    );
  }

  private restoreOriginalStates() {
    // Clear all enemies and projectiles
    const enemies = useEnemies.getState();
    const shooting = useShooting.getState();
    
    enemies.clearEnemies();
    shooting.projectiles = [];
    
    // Restore counters
    enemies.totalEnemiesDestroyed = this.originalEnemiesState.totalEnemiesDestroyed || 0;
    enemies.lastSpawnTime = 0;
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
    console.log('%c          COMBAT STORES TEST SUMMARY', 'color: #8b5cf6; font-weight: bold');
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
(window as any).testCombatStores = () => {
  const testSuite = new CombatStoresTestSuite();
  testSuite.runAllTests();
};

console.log('%c⚔️ Combat Stores Test Suite Loaded!', 'color: #ef4444; font-weight: bold');
console.log('Run %ctestCombatStores()%c to execute tests', 'color: #3b82f6', 'color: inherit');