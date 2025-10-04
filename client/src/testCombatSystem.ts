// Combat System End-to-End Test
import { useEnemies } from './lib/stores/combat/useEnemies';
import { useShooting } from './lib/stores/combat/useShooting';
import { useShipStatus } from './lib/stores/ship/useShipStatus';
import { useAudio } from './lib/stores/ui/useAudio';
import { useHints } from './lib/stores/ui/useHints';
import * as THREE from 'three';

export function testCombatSystem() {
  console.log('\n' + '='.repeat(50));
  console.log('🎯 COMBAT SYSTEM END-TO-END TEST');
  console.log('='.repeat(50) + '\n');
  
  const results: any[] = [];
  
  // Test 1: Grace Period Check
  console.log('📌 TEST 1: Grace Period & Tutorial');
  console.log('-'.repeat(40));
  
  const enemyStore = useEnemies.getState();
  const hintStore = useHints.getState();
  const timeSinceStart = Date.now() - enemyStore.gameStartTime;
  const gracePeriodRemaining = Math.max(0, enemyStore.gracePeriodDuration - timeSinceStart);
  
  console.log(`⏰ Game Start Time: ${new Date(enemyStore.gameStartTime).toLocaleTimeString()}`);
  console.log(`⏱️ Time Since Start: ${Math.floor(timeSinceStart / 1000)}s`);
  console.log(`🛡️ Grace Period: ${enemyStore.gracePeriodDuration / 1000}s`);
  console.log(`⏳ Grace Period Remaining: ${Math.ceil(gracePeriodRemaining / 1000)}s`);
  console.log(`📖 Tutorial Hint Shown: ${hintStore.shownHints.has('combat-tutorial') ? '✅ Yes' : '❌ No'}`);
  console.log(`🎯 Current Hint: ${hintStore.currentHint || 'None'}`);
  
  results.push({
    test: 'Grace Period',
    status: gracePeriodRemaining > 0 ? 'ACTIVE' : 'EXPIRED',
    remaining: `${Math.ceil(gracePeriodRemaining / 1000)}s`
  });
  
  results.push({
    test: 'Tutorial Message',
    status: hintStore.shownHints.has('combat-tutorial') || hintStore.currentHint === 'combat-tutorial' ? 'SHOWN' : 'NOT SHOWN',
    details: `Current: ${hintStore.currentHint || 'None'}`
  });
  
  // Test 2: Shooting Mechanics
  console.log('\n📌 TEST 2: Shooting Mechanics');
  console.log('-'.repeat(40));
  
  const shootingStore = useShooting.getState();
  const shipStore = useShipStatus.getState();
  
  // Simulate shooting
  const testPosition = new THREE.Vector3(0, 0, 0);
  const testDirection = new THREE.Vector3(1, 0, 0);
  
  const projectilesBefore = shootingStore.projectiles.length;
  console.log(`🔫 Projectiles Before: ${projectilesBefore}`);
  
  // Fire a test projectile
  shootingStore.fireWeapon(testPosition, testDirection);
  const projectilesAfter = shootingStore.projectiles.length;
  console.log(`🔫 Projectiles After: ${projectilesAfter}`);
  console.log(`✨ New Projectile Created: ${projectilesAfter > projectilesBefore ? '✅ Yes' : '❌ No'}`);
  
  if (projectilesAfter > projectilesBefore) {
    const newProjectile = shootingStore.projectiles[shootingStore.projectiles.length - 1];
    console.log(`  - ID: ${newProjectile.id}`);
    console.log(`  - Damage: ${newProjectile.damage}`);
    console.log(`  - Speed: ${newProjectile.speed}`);
    console.log(`  - Owner: ${newProjectile.ownerType}`);
  }
  
  results.push({
    test: 'Shooting System',
    status: projectilesAfter > projectilesBefore ? 'WORKING' : 'FAILED',
    projectiles: projectilesAfter
  });
  
  // Test 3: Enemy Spawning
  console.log('\n📌 TEST 3: Enemy System');
  console.log('-'.repeat(40));
  
  console.log(`👾 Current Enemies: ${enemyStore.enemies.length}`);
  console.log(`🎯 Max Enemies: ${enemyStore.maxEnemies}`);
  console.log(`⏱️ Spawn Cooldown: ${enemyStore.spawnCooldown / 1000}s`);
  console.log(`📊 Total Destroyed: ${enemyStore.totalEnemiesDestroyed}`);
  
  // Check if should spawn enemy
  const shouldSpawn = enemyStore.shouldSpawnEnemy();
  console.log(`🔄 Should Spawn Enemy: ${shouldSpawn ? '✅ Yes' : '❌ No (Grace Period or Cooldown)'}`);
  
  if (enemyStore.enemies.length > 0) {
    console.log('\n👾 Enemy Details:');
    enemyStore.enemies.forEach((enemy, index) => {
      console.log(`  Enemy ${index + 1}:`);
      console.log(`    - Type: ${enemy.shipType}`);
      console.log(`    - Faction: ${enemy.faction}`);
      console.log(`    - Hull: ${enemy.hull}/${enemy.maxHull}`);
      console.log(`    - Shield: ${enemy.shield}/${enemy.maxShield}`);
      console.log(`    - Behavior: ${enemy.behavior}`);
    });
  }
  
  results.push({
    test: 'Enemy System',
    status: 'ACTIVE',
    enemyCount: enemyStore.enemies.length,
    canSpawn: shouldSpawn
  });
  
  // Test 4: Ship Status & Health
  console.log('\n📌 TEST 4: Ship Status');
  console.log('-'.repeat(40));
  
  console.log(`❤️ Hull: ${shipStore.hull}%`);
  console.log(`🛡️ Shield: ${shipStore.shield}%`);
  console.log(`⛽ Fuel: ${shipStore.fuel.toFixed(1)}%`);
  console.log(`🔋 Power: ${shipStore.power}%`);
  
  results.push({
    test: 'Ship Status',
    status: 'MONITORED',
    hull: `${shipStore.hull}%`,
    shield: `${shipStore.shield}%`
  });
  
  // Test 5: Audio System
  console.log('\n📌 TEST 5: Audio System');
  console.log('-'.repeat(40));
  
  const audioStore = useAudio.getState();
  console.log(`🔊 Audio Enabled: ${audioStore.soundEnabled ? '✅ Yes' : '❌ No'}`);
  console.log(`🎵 Music Volume: ${Math.round(audioStore.musicVolume * 100)}%`);
  console.log(`🔉 Effects Volume: ${Math.round(audioStore.effectsVolume * 100)}%`);
  
  results.push({
    test: 'Audio System',
    status: audioStore.soundEnabled ? 'ENABLED' : 'DISABLED',
    volumes: `Music: ${Math.round(audioStore.musicVolume * 100)}%, Effects: ${Math.round(audioStore.effectsVolume * 100)}%`
  });
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  
  const tableData = results.map(r => ({
    Test: r.test,
    Status: r.status,
    Details: r.details || r.remaining || r.projectiles || r.enemyCount || r.hull || r.volumes || '-'
  }));
  
  console.table(tableData);
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  
  if (gracePeriodRemaining > 0) {
    console.log(`⏳ Wait ${Math.ceil(gracePeriodRemaining / 1000)}s for grace period to end, then enemies will spawn`);
  } else {
    console.log('✅ Grace period ended - enemies should be spawning');
  }
  
  if (!hintStore.shownHints.has('combat-tutorial') && !hintStore.currentHint) {
    console.log('❗ Tutorial hint not shown - refresh the page to trigger it');
  }
  
  if (!audioStore.soundEnabled) {
    console.log('🔊 Enable sound to test audio feedback');
  }
  
  if (enemyStore.enemies.length === 0 && gracePeriodRemaining <= 0) {
    console.log('👾 No enemies present - they should spawn soon based on heat level');
  }
  
  console.log('\n✅ Combat system test complete!');
  console.log('Click in space to test shooting, wait for enemies to spawn after grace period.');
  
  return results;
}

// Make it available globally for console testing
(window as any).testCombatSystem = testCombatSystem;

// Auto-run after a short delay
setTimeout(() => {
  console.log('🚀 Running combat system test...');
  testCombatSystem();
}, 2000);