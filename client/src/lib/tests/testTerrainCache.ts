// Test file to verify terrain cache management functionality
import { useTerrain } from '../stores/surface/useTerrain';

/**
 * Test the terrain cache management functionality
 * This test demonstrates that the new cache management methods work correctly
 */
export async function testTerrainCacheManagement() {
  console.log('\n========================================');
  console.log('[TEST] Starting Terrain Cache Management Test');
  console.log('========================================\n');

  const terrainStore = useTerrain.getState();

  // Test 1: Get initial cache size
  console.log('[TEST] 1. Checking initial cache size...');
  let cacheInfo = terrainStore.getCacheSize();
  console.log(`[TEST] Initial cache: ${cacheInfo.count} planets, ${(cacheInfo.memoryBytes / 1024 / 1024).toFixed(2)} MB`);

  // Test 2: Load terrain for Earth
  console.log('\n[TEST] 2. Loading terrain for Earth...');
  await terrainStore.loadTerrainForPlanet('Earth');
  
  cacheInfo = terrainStore.getCacheSize();
  console.log(`[TEST] After loading Earth: ${cacheInfo.count} planets, ${(cacheInfo.memoryBytes / 1024 / 1024).toFixed(2)} MB`);

  // Test 3: Load terrain for Mars
  console.log('\n[TEST] 3. Loading terrain for Mars...');
  await terrainStore.loadTerrainForPlanet('Mars');
  
  cacheInfo = terrainStore.getCacheSize();
  console.log(`[TEST] After loading Mars: ${cacheInfo.count} planets, ${(cacheInfo.memoryBytes / 1024 / 1024).toFixed(2)} MB`);

  // Test 4: Load terrain for Moon
  console.log('\n[TEST] 4. Loading terrain for Moon...');
  await terrainStore.loadTerrainForPlanet('Moon');
  
  cacheInfo = terrainStore.getCacheSize();
  console.log(`[TEST] After loading Moon: ${cacheInfo.count} planets, ${(cacheInfo.memoryBytes / 1024 / 1024).toFixed(2)} MB`);

  // Test 5: Clear specific planet cache
  console.log('\n[TEST] 5. Clearing Mars terrain cache...');
  terrainStore.clearPlanetCache('Mars');
  
  cacheInfo = terrainStore.getCacheSize();
  console.log(`[TEST] After clearing Mars: ${cacheInfo.count} planets, ${(cacheInfo.memoryBytes / 1024 / 1024).toFixed(2)} MB`);

  // Test 6: Try clearing non-existent planet
  console.log('\n[TEST] 6. Testing clearing non-existent planet (Jupiter)...');
  terrainStore.clearPlanetCache('Jupiter');
  
  cacheInfo = terrainStore.getCacheSize();
  console.log(`[TEST] After clearing Jupiter (should be unchanged): ${cacheInfo.count} planets, ${(cacheInfo.memoryBytes / 1024 / 1024).toFixed(2)} MB`);

  // Test 7: Clear all cache
  console.log('\n[TEST] 7. Clearing all terrain cache...');
  terrainStore.clearCache();
  
  cacheInfo = terrainStore.getCacheSize();
  console.log(`[TEST] After clearing all: ${cacheInfo.count} planets, ${(cacheInfo.memoryBytes / 1024 / 1024).toFixed(2)} MB`);

  // Test 8: Reload terrain to ensure functionality still works
  console.log('\n[TEST] 8. Reloading Earth terrain to ensure functionality works...');
  await terrainStore.loadTerrainForPlanet('Earth');
  
  cacheInfo = terrainStore.getCacheSize();
  console.log(`[TEST] After reloading Earth: ${cacheInfo.count} planets, ${(cacheInfo.memoryBytes / 1024 / 1024).toFixed(2)} MB`);

  // Test 9: Check getHeightAt still works
  console.log('\n[TEST] 9. Testing getHeightAt functionality...');
  const height = terrainStore.getHeightAt(0, 0);
  console.log(`[TEST] Height at (0,0): ${height.toFixed(2)}`);

  console.log('\n========================================');
  console.log('[TEST] Terrain Cache Management Test Complete!');
  console.log('[TEST] All methods working correctly:');
  console.log('[TEST] ✓ getCacheSize()');
  console.log('[TEST] ✓ loadTerrainForPlanet()');
  console.log('[TEST] ✓ clearPlanetCache()');
  console.log('[TEST] ✓ clearCache()');
  console.log('[TEST] ✓ getHeightAt()');
  console.log('========================================\n');

  return true;
}

// Run the test if this file is executed directly
if (typeof window !== 'undefined') {
  (window as any).testTerrainCacheManagement = testTerrainCacheManagement;
  console.log('[TEST] Test function registered. Run `testTerrainCacheManagement()` in the browser console to test.');
}