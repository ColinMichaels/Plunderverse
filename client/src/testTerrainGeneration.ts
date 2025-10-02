import { terrainGenerator } from './lib/terrain/terrainGenerator';
import { PLANET_TERRAIN_CONFIGS } from './lib/terrain/terrainGeneration';

export function testTerrainGeneration() {
  console.log('====================================');
  console.log('🏔️ TERRAIN GENERATION TEST');
  console.log('====================================');
  
  const planetsToTest = ['Earth', 'Mars', 'Moon', 'Venus', 'Mercury'];
  
  planetsToTest.forEach((planetName) => {
    console.log(`\n📍 Testing terrain for ${planetName}...`);
    
    const startTime = performance.now();
    const terrainData = terrainGenerator.getTerrainData(planetName, 200, 200, 50, 50);
    const endTime = performance.now();
    
    console.log(`✅ ${planetName} terrain generated in ${(endTime - startTime).toFixed(2)}ms`);
    
    // Log terrain statistics
    console.log(`  Height range: ${terrainData.bounds.minHeight.toFixed(2)} to ${terrainData.bounds.maxHeight.toFixed(2)}`);
    console.log(`  Features:`);
    console.log(`    - Craters: ${terrainData.features.craters.length}`);
    console.log(`    - Ridges: ${terrainData.features.ridges.length}`);
    console.log(`    - Valleys: ${terrainData.features.valleys.length}`);
    console.log(`    - Plateaus: ${terrainData.features.plateaus.length}`);
    console.log(`    - Volcanoes: ${terrainData.features.volcanoes.length}`);
    
    // Test height sampling
    const samplePoints = [
      { x: 0, z: 0 },
      { x: 50, z: 50 },
      { x: -50, z: -50 }
    ];
    
    console.log(`  Sample heights:`);
    samplePoints.forEach(point => {
      const height = terrainGenerator.getHeightAt(point.x, point.z, planetName);
      console.log(`    At (${point.x}, ${point.z}): ${height.toFixed(2)}`);
    });
  });
  
  // Test caching
  console.log('\n📦 Testing terrain caching...');
  const startCache = performance.now();
  const cachedTerrain = terrainGenerator.getTerrainData('Earth', 200, 200, 50, 50);
  const endCache = performance.now();
  console.log(`✅ Cached terrain retrieved in ${(endCache - startCache).toFixed(2)}ms`);
  
  // Test configuration
  console.log('\n⚙️ Planet configurations:');
  Object.keys(PLANET_TERRAIN_CONFIGS).forEach(planet => {
    const config = PLANET_TERRAIN_CONFIGS[planet];
    console.log(`  ${planet}:`);
    console.log(`    - Base octaves: ${config.baseOctaves}`);
    console.log(`    - Base amplitude: ${config.baseAmplitude}`);
  });
  
  console.log('\n====================================');
  console.log('✅ TERRAIN TEST COMPLETE');
  console.log('====================================');
  
  return true;
}

// Make it available globally
(window as any).testTerrainGeneration = testTerrainGeneration;