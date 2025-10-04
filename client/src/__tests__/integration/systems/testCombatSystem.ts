// Combat System Test Script
// Run this in the browser console to test the combat system

import { useEnemies } from '../../../lib/stores/combat/useEnemies';
import { useShooting } from '../../../lib/stores/combat/useShooting';
import { useSolarSystem } from '../../../lib/stores/space/useSolarSystem';
import { useHeatSystem } from '../../../lib/stores/player/useHeatSystem';
import { useShipStatus } from '../../../lib/stores/ship/useShipStatus';
import { usePlayer } from '../../../lib/stores/player/usePlayer';
import * as THREE from 'three';

export function testCombatSystem() {
  console.log('🎯 Starting Combat System Test...\n');
  
  const enemies = useEnemies.getState();
  const shooting = useShooting.getState();
  const solarSystem = useSolarSystem.getState();
  const heatSystem = useHeatSystem.getState();
  const shipStatus = useShipStatus.getState();
  const player = usePlayer.getState();
  
  // Get player position
  const playerPos = solarSystem.cameraPosition;
  
  console.log('📍 Player Position:', playerPos);
  console.log('🌡️ Current Heat Level:', heatSystem.currentHeat);
  console.log('⭐ Wanted Level:', heatSystem.wantedLevelInfo.name);
  console.log('\n--- Spawning Test Enemies ---\n');
  
  // Test 1: Spawn different enemy types
  const testPositions = [
    new THREE.Vector3(playerPos.x + 20, playerPos.y, playerPos.z),
    new THREE.Vector3(playerPos.x - 20, playerPos.y, playerPos.z),
    new THREE.Vector3(playerPos.x, playerPos.y, playerPos.z + 20),
    new THREE.Vector3(playerPos.x, playerPos.y, playerPos.z - 20)
  ];
  
  const factions = ['outlaws', 'corporations', 'military', 'bountyHunter'] as const;
  const shipTypes = ['fighter', 'patrol', 'bomber', 'elite'] as const;
  
  testPositions.forEach((pos, i) => {
    enemies.spawnEnemy(pos, factions[i], shipTypes[i]);
    console.log(`✅ Spawned ${factions[i]} ${shipTypes[i]} at`, pos);
  });
  
  console.log(`\n📊 Total enemies spawned: ${enemies.enemies.length}`);
  
  // Test 2: Test shooting
  console.log('\n--- Testing Player Shooting ---\n');
  const shootDirection = new THREE.Vector3(1, 0, 0);
  shooting.addProjectile(
    playerPos.clone(),
    shootDirection,
    60, // speed
    15, // damage
    'player',
    'player'
  );
  console.log('✅ Player projectile fired');
  
  // Test 3: Display enemy stats
  console.log('\n--- Enemy Stats ---');
  enemies.enemies.forEach((enemy, i) => {
    console.log(`
Enemy #${i + 1} (${enemy.faction} ${enemy.shipType}):
  - ID: ${enemy.id}
  - Hull: ${enemy.hull}/${enemy.maxHull}
  - Shield: ${enemy.shield}/${enemy.maxShield}
  - Behavior: ${enemy.behavior}
  - Weapon: ${enemy.weapon.damage} damage, ${enemy.weapon.fireRate} shots/sec
  - Rewards: ${enemy.creditReward} credits
  - Detection Range: ${enemy.detectionRange}
  - Attack Range: ${enemy.attackRange}
    `);
  });
  
  // Test 4: Apply heat and test spawning
  console.log('\n--- Testing Heat-Based Spawning ---\n');
  heatSystem.applyHeat('piracy', 2);
  console.log('🔥 Applied piracy heat');
  console.log('📈 New heat level:', heatSystem.currentHeat);
  console.log('⚠️ New wanted level:', heatSystem.wantedLevelInfo.name);
  
  // Test spawn based on heat
  enemies.spawnBasedOnHeat(playerPos);
  console.log('✅ Attempted heat-based enemy spawn');
  
  // Test 5: Damage an enemy
  if (enemies.enemies.length > 0) {
    console.log('\n--- Testing Damage System ---\n');
    const targetEnemy = enemies.enemies[0];
    console.log(`🎯 Damaging enemy ${targetEnemy.id}...`);
    console.log(`Before: Hull ${targetEnemy.hull}, Shield ${targetEnemy.shield}`);
    enemies.damageEnemy(targetEnemy.id, 25);
    console.log(`After: Hull ${targetEnemy.hull}, Shield ${targetEnemy.shield}`);
  }
  
  console.log('\n--- Player Stats ---');
  console.log('Ship Hull:', shipStatus.hull);
  console.log('Ship Shield:', shipStatus.shield);
  console.log('Credits:', player.points);
  console.log('Reputation:', player.reputation);
  
  console.log('\n✨ Combat System Test Complete!\n');
  console.log('💡 Tips:');
  console.log('- Enemies will pursue and attack when you get close');
  console.log('- Different factions have different behaviors');
  console.log('- Destroying enemies grants credits and affects reputation');
  console.log('- High heat levels spawn more aggressive enemies');
  
  return {
    enemies: enemies.enemies,
    projectiles: shooting.projectiles,
    heat: heatSystem.currentHeat,
    wantedLevel: heatSystem.wantedLevel
  };
}

// Helper function to clear all enemies
export function clearAllEnemies() {
  const enemies = useEnemies.getState();
  enemies.clearEnemies();
  console.log('🧹 All enemies cleared');
}

// Helper function to spawn a patrol
export function spawnPatrol(faction?: 'corporations' | 'military' | 'outlaws') {
  const enemies = useEnemies.getState();
  const solarSystem = useSolarSystem.getState();
  const selectedFaction = faction || 'corporations';
  
  enemies.spawnPatrol(solarSystem.cameraPosition, selectedFaction);
  console.log(`🚔 Spawned ${selectedFaction} patrol`);
}

// Helper function to spawn a bounty hunter
export function spawnBountyHunter() {
  const enemies = useEnemies.getState();
  const solarSystem = useSolarSystem.getState();
  
  enemies.spawnBountyHunter(solarSystem.cameraPosition);
  console.log('💰 Spawned bounty hunter!');
}

// Make functions available globally for browser console
if (typeof window !== 'undefined') {
  (window as any).testCombatSystem = testCombatSystem;
  (window as any).clearAllEnemies = clearAllEnemies;
  (window as any).spawnPatrol = spawnPatrol;
  (window as any).spawnBountyHunter = spawnBountyHunter;
  
  console.log('🎮 Combat System Test Functions Loaded!');
  console.log('Available commands:');
  console.log('  testCombatSystem() - Run full combat test');
  console.log('  clearAllEnemies() - Remove all enemies');
  console.log('  spawnPatrol(faction) - Spawn a patrol group');
  console.log('  spawnBountyHunter() - Spawn a bounty hunter');
}