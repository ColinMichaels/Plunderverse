/**
 * Test HUD Visibility Implementation
 * Tests that HUD overlay is contextual based on planet selection and combat state
 */

import { useSolarSystem } from '../lib/stores/space/useSolarSystem';
import { useEnemies } from '../lib/stores/combat/useEnemies';
import { useHUDContext } from '../lib/stores/ui/useHUDContext';
import { useWeaponSystems } from '../lib/stores/combat/useWeaponSystems';
import * as THREE from 'three';

export function testHUDVisibility() {
  console.log('🎯 Testing HUD Visibility and Target Lock System...\n');
  
  const solarSystem = useSolarSystem.getState();
  const enemies = useEnemies.getState();
  const hudContext = useHUDContext.getState();
  const weaponSystems = useWeaponSystems.getState();
  
  const results: { test: string; status: string; details?: string }[] = [];
  
  // Test 1: HUD hidden when no planet selected and no combat
  console.log('Test 1: HUD should be hidden with no planet selected and no combat');
  solarSystem.setSelectedPlanet(null);
  enemies.clearEnemies();
  hudContext.detectContext();
  
  const shouldShowTest1 = solarSystem.selectedPlanet || hudContext.isInCombat || enemies.enemies.length > 0;
  results.push({
    test: 'HUD hidden in normal flight',
    status: !shouldShowTest1 ? '✅ PASS' : '❌ FAIL',
    details: `Planet: ${solarSystem.selectedPlanet}, Combat: ${hudContext.isInCombat}, Enemies: ${enemies.enemies.length}`
  });
  
  // Test 2: HUD visible when planet selected
  console.log('\nTest 2: HUD should be visible when planet is selected');
  solarSystem.setSelectedPlanet('Earth');
  
  const shouldShowTest2 = solarSystem.selectedPlanet || hudContext.isInCombat || enemies.enemies.length > 0;
  results.push({
    test: 'HUD visible with planet selected',
    status: shouldShowTest2 ? '✅ PASS' : '❌ FAIL',
    details: `Selected planet: ${solarSystem.selectedPlanet}`
  });
  
  // Test 3: HUD visible when enemies present
  console.log('\nTest 3: HUD should be visible when enemies are present');
  solarSystem.setSelectedPlanet(null);
  enemies.spawnEnemy(new THREE.Vector3(100, 0, 0), 'outlaws', 'fighter');
  
  const shouldShowTest3 = solarSystem.selectedPlanet || hudContext.isInCombat || enemies.enemies.length > 0;
  results.push({
    test: 'HUD visible with enemies',
    status: shouldShowTest3 ? '✅ PASS' : '❌ FAIL',
    details: `Enemy count: ${enemies.enemies.length}`
  });
  
  // Test 4: Target lock notification system
  console.log('\nTest 4: Testing target lock notification system');
  
  // Start locking
  const cameraPosition = new THREE.Vector3(0, 0, 0);
  const cameraDirection = new THREE.Vector3(1, 0, 0).normalize();
  
  // Clear any existing lock
  weaponSystems.cancelLocking();
  
  // Start a new lock
  weaponSystems.startLocking(cameraPosition, cameraDirection);
  
  results.push({
    test: 'Target lock system starts',
    status: weaponSystems.isLocking ? '✅ PASS' : '❌ FAIL',
    details: `Is locking: ${weaponSystems.isLocking}, Target: ${weaponSystems.currentTarget ? 'Acquired' : 'None'}`
  });
  
  // Test 5: Lock progress updates
  console.log('\nTest 5: Testing lock progress updates');
  
  if (weaponSystems.currentTarget) {
    // Simulate lock progress
    for (let i = 0; i < 10; i++) {
      weaponSystems.updateLocking(0.3, cameraPosition, cameraDirection);
    }
    
    const lockProgress = weaponSystems.currentTarget?.lockProgress || 0;
    results.push({
      test: 'Lock progress updates',
      status: lockProgress > 0 ? '✅ PASS' : '❌ FAIL',
      details: `Lock progress: ${Math.round((lockProgress || 0) * 100)}%`
    });
  } else {
    results.push({
      test: 'Lock progress updates',
      status: '⚠️ SKIP',
      details: 'No target available'
    });
  }
  
  // Test 6: Combat context detection
  console.log('\nTest 6: Testing combat context detection');
  hudContext.registerShot();
  hudContext.detectContext();
  
  results.push({
    test: 'Combat context detection',
    status: hudContext.isInCombat ? '✅ PASS' : '❌ FAIL',
    details: `Combat state: ${hudContext.isInCombat}`
  });
  
  // Summary
  console.log('\n📊 TEST SUMMARY:');
  console.log('================');
  results.forEach(result => {
    console.log(`${result.status} ${result.test}`);
    if (result.details) {
      console.log(`    └─ ${result.details}`);
    }
  });
  
  const passCount = results.filter(r => r.status.includes('PASS')).length;
  const failCount = results.filter(r => r.status.includes('FAIL')).length;
  const skipCount = results.filter(r => r.status.includes('SKIP')).length;
  
  console.log('\n📈 RESULTS:');
  console.log(`✅ Passed: ${passCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`⚠️ Skipped: ${skipCount}`);
  console.log(`Total: ${results.length}`);
  
  // Cleanup
  enemies.clearEnemies();
  solarSystem.setSelectedPlanet(null);
  weaponSystems.cancelLocking();
  
  return {
    passed: passCount,
    failed: failCount,
    skipped: skipCount,
    total: results.length,
    results
  };
}

// Run the test when imported
if (typeof window !== 'undefined') {
  (window as any).testHUDVisibility = testHUDVisibility;
  console.log('HUD Visibility Test loaded. Run `testHUDVisibility()` in console to test.');
}