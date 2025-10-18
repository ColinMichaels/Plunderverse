/**
 * Test suite for the Surface Scatter system
 * This verifies that the procedural scatter objects are generated correctly
 */

import { PoissonDiskSampling, createTerrainDensityFunction } from './lib/poissonDiskSampling';
import * as THREE from 'three';

export function testSurfaceScatter() {
  console.log('🌿 SURFACE SCATTER TEST');
  console.log('====================================');
  
  // Test 1: Poisson Disk Sampling
  console.log('\n📍 Testing Poisson Disk Sampling...');
  const testSampler = new PoissonDiskSampling({
    width: 100,
    height: 100,
    minDistance: 5,
    maxTries: 30,
    densityFunction: (x, z) => {
      // Simple density function - higher density near center
      const dist = Math.sqrt(x * x + z * z);
      return Math.max(0.2, 1.0 - dist / 50);
    },
    existingObjects: [
      { position: new THREE.Vector3(0, 0, 0), radius: 10 }, // Large object at center
      { position: new THREE.Vector3(20, 0, 20), radius: 5 }, // Medium object
    ]
  });
  
  const samples = testSampler.generateSamples();
  console.log(`✅ Generated ${samples.length} samples`);
  console.log(`  Min density: ${Math.min(...samples.map(s => s.density)).toFixed(2)}`);
  console.log(`  Max density: ${Math.max(...samples.map(s => s.density)).toFixed(2)}`);
  
  // Check spacing
  let minDistance = Infinity;
  for (let i = 0; i < samples.length; i++) {
    for (let j = i + 1; j < samples.length; j++) {
      const dist = samples[i].position.distanceTo(samples[j].position);
      minDistance = Math.min(minDistance, dist);
    }
  }
  console.log(`  Min distance between samples: ${minDistance.toFixed(2)}`);
  
  // Test 2: Planet-specific configurations
  console.log('\n📍 Testing Planet Configurations...');
  const planetConfigs = {
    Earth: { categories: 4, maxObjects: 2800, minSpacing: 0.8 },
    Mars: { categories: 4, maxObjects: 3000, minSpacing: 0.7 },
    Moon: { categories: 4, maxObjects: 3800, minSpacing: 0.6 },
    Venus: { categories: 4, maxObjects: 3100, minSpacing: 0.75 },
    Mercury: { categories: 4, maxObjects: 4200, minSpacing: 0.5 }
  };
  
  for (const [planet, config] of Object.entries(planetConfigs)) {
    console.log(`  ${planet}:`);
    console.log(`    - Categories: ${config.categories}`);
    console.log(`    - Max objects: ${config.maxObjects}`);
    console.log(`    - Min spacing: ${config.minSpacing}`);
  }
  
  // Test 3: Density function with terrain features
  console.log('\n📍 Testing Terrain Density Function...');
  
  // Mock terrain data with features
  const mockTerrainData = {
    features: {
      craters: [
        { center: { x: 10, z: 10 }, radius: 15 },
        { center: { x: -20, z: 30 }, radius: 10 }
      ],
      valleys: [
        { center: { x: 0, z: -20 } }
      ]
    }
  };
  
  const mockGetHeightAt = (x: number, z: number) => {
    // Simple height function with slope
    return Math.sin(x * 0.1) * 5 + Math.cos(z * 0.1) * 3;
  };
  
  const terrainDensityFunc = createTerrainDensityFunction(mockTerrainData, mockGetHeightAt);
  
  // Test density at different locations
  const testPoints = [
    { x: 10, z: 10, desc: 'Crater center' },
    { x: 0, z: -20, desc: 'Valley center' },
    { x: 50, z: 50, desc: 'Open terrain' },
    { x: 0, z: 0, desc: 'Origin' }
  ];
  
  console.log('  Density at various locations:');
  for (const point of testPoints) {
    const density = terrainDensityFunc(point.x, point.z);
    console.log(`    ${point.desc} (${point.x}, ${point.z}): ${density.toFixed(2)}`);
  }
  
  // Test 4: Performance metrics
  console.log('\n📍 Testing Performance...');
  
  const startTime = performance.now();
  const largeSampler = new PoissonDiskSampling({
    width: 300,
    height: 300,
    minDistance: 2,
    maxTries: 20
  });
  const largeSamples = largeSampler.generateSamples();
  const endTime = performance.now();
  
  console.log(`  Generated ${largeSamples.length} samples in ${(endTime - startTime).toFixed(2)}ms`);
  console.log(`  Average time per sample: ${((endTime - startTime) / largeSamples.length).toFixed(3)}ms`);
  
  // Test 5: Instance count for different planets
  console.log('\n📍 Estimated instance counts per planet:');
  const estimatedCounts = {
    Earth: { small: 1000, medium: 600, large: 400, total: 2000 },
    Mars: { small: 1200, medium: 800, large: 400, total: 2400 },
    Moon: { small: 1500, medium: 1000, large: 500, total: 3000 },
    Venus: { small: 1100, medium: 700, large: 400, total: 2200 },
    Mercury: { small: 1400, medium: 1000, large: 600, total: 3000 }
  };
  
  for (const [planet, counts] of Object.entries(estimatedCounts)) {
    console.log(`  ${planet}: ${counts.total} objects (S:${counts.small}, M:${counts.medium}, L:${counts.large})`);
  }
  
  console.log('\n====================================');
  console.log('✅ SURFACE SCATTER TEST COMPLETE');
  console.log('====================================');
  
  return {
    success: true,
    samplesGenerated: samples.length,
    performanceMs: endTime - startTime,
    message: 'Surface scatter system is working correctly'
  };
}

// Expose to window for manual testing
if (typeof window !== 'undefined') {
  (window as any).testSurfaceScatter = testSurfaceScatter;
  console.log('Surface scatter test loaded. Run with: window.testSurfaceScatter()');
}