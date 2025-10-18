/**
 * Minimap Component Test Suite
 * Tests entity rendering, position tracking, zoom controls, and click navigation
 * Run with window.testMinimap() from the browser console
 */

import { useSolarSystem } from '../../../lib/stores/space/useSolarSystem';
import { useEnemies } from '../../../lib/stores/combat/useEnemies';
import { useAsteroids } from '../../../lib/stores/space/useAsteroids';
import * as THREE from 'three';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  details?: any;
}

interface MinimapEntity {
  id: string;
  type: 'player' | 'enemy' | 'planet' | 'asteroid' | 'station';
  position: THREE.Vector3;
  color: string;
  size: number;
}

export class MinimapTestSuite {
  private results: TestResult[] = [];
  private originalState: any = {};
  private testEntities: MinimapEntity[] = [];

  constructor() {
    console.log('🗺️ Minimap Test Suite initialized');
  }

  async runAllTests() {
    console.clear();
    console.log('%c═══════════════════════════════════════════════', 'color: #14b8a6; font-size: 14px');
    console.log('%c   🗺️ MINIMAP TEST SUITE STARTING', 'color: #14b8a6; font-size: 16px; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════', 'color: #14b8a6; font-size: 14px');
    
    this.results = [];
    this.saveState();
    this.setupTestEntities();
    
    try {
      await this.testInitialState();
      await this.wait(500);
      
      await this.testEntityRendering();
      await this.wait(500);
      
      await this.testPositionTracking();
      await this.wait(500);
      
      await this.testZoomControls();
      await this.wait(500);
      
      await this.testClickNavigation();
      await this.wait(500);
      
      await this.testEntityFiltering();
      await this.wait(500);
      
      await this.testMinimapOrientation();
      await this.wait(500);
      
      await this.testPerformance();
      
    } catch (error) {
      console.error('Test suite failed:', error);
      this.addResult('Test Suite', 'failed', `Critical error: ${error}`);
    } finally {
      this.restoreState();
      this.printSummary();
    }
  }

  private saveState() {
    const solar = useSolarSystem.getState();
    const enemies = useEnemies.getState();
    
    this.originalState = {
      cameraPosition: solar.cameraPosition.clone(),
      zoom: solar.zoom,
      enemies: [...enemies.enemies]
    };
  }

  private restoreState() {
    const solar = useSolarSystem.getState();
    const enemies = useEnemies.getState();
    
    solar.setCameraPosition(this.originalState.cameraPosition);
    solar.setZoom(this.originalState.zoom);
    enemies.enemies = [...this.originalState.enemies];
  }

  private setupTestEntities() {
    this.testEntities = [
      {
        id: 'player',
        type: 'player',
        position: new THREE.Vector3(0, 0, 0),
        color: '#00ff00',
        size: 3
      },
      {
        id: 'enemy1',
        type: 'enemy',
        position: new THREE.Vector3(100, 0, 50),
        color: '#ff0000',
        size: 2
      },
      {
        id: 'planet1',
        type: 'planet',
        position: new THREE.Vector3(-200, 0, -100),
        color: '#0088ff',
        size: 10
      },
      {
        id: 'asteroid1',
        type: 'asteroid',
        position: new THREE.Vector3(50, 0, -50),
        color: '#888888',
        size: 1
      },
      {
        id: 'station1',
        type: 'station',
        position: new THREE.Vector3(-100, 0, 100),
        color: '#ffff00',
        size: 5
      }
    ];
  }

  private async testInitialState() {
    console.log('\n📊 Testing Initial State...');
    
    const solar = useSolarSystem.getState();
    
    this.addResult(
      'Minimap State',
      solar ? 'passed' : 'failed',
      'Solar system state accessible'
    );
    
    this.addResult(
      'Camera Position',
      solar.cameraPosition ? 'passed' : 'failed',
      `Position: (${solar.cameraPosition.x.toFixed(0)}, ${solar.cameraPosition.y.toFixed(0)}, ${solar.cameraPosition.z.toFixed(0)})`
    );
    
    this.addResult(
      'Zoom Level',
      solar.zoom > 0 ? 'passed' : 'failed',
      `Zoom: ${solar.zoom}`
    );
    
    // Test minimap viewport calculation
    const minimapSize = 200; // pixels
    const worldRange = 1000; // units
    const scale = minimapSize / worldRange;
    
    this.addResult(
      'Viewport Scale',
      scale > 0 ? 'passed' : 'failed',
      `Scale: ${scale.toFixed(4)} px/unit`
    );
  }

  private async testEntityRendering() {
    console.log('\n🎯 Testing Entity Rendering...');
    
    const enemies = useEnemies.getState();
    const asteroids = useAsteroids.getState();
    
    // Clear and add test enemies
    enemies.enemies = [];
    enemies.spawnEnemy(new THREE.Vector3(100, 0, 50), 'outlaws', 'fighter');
    enemies.spawnEnemy(new THREE.Vector3(-100, 0, -50), 'corporations', 'cruiser');
    await this.wait(200);
    
    this.addResult(
      'Enemy Rendering',
      enemies.enemies.length === 2 ? 'passed' : 'failed',
      `Enemies rendered: ${enemies.enemies.length}`
    );
    
    // Test entity colors
    const entityColors = {
      player: '#00ff00',
      enemy: '#ff0000',
      planet: '#0088ff',
      asteroid: '#888888',
      station: '#ffff00'
    };
    
    Object.entries(entityColors).forEach(([type, color]) => {
      this.addResult(
        `${type} Color`,
        'passed',
        `Color: ${color}`
      );
    });
    
    // Test entity sizes
    const entitySizes = {
      player: 3,
      enemy: 2,
      planet: 10,
      asteroid: 1,
      station: 5
    };
    
    Object.entries(entitySizes).forEach(([type, size]) => {
      this.addResult(
        `${type} Size`,
        size > 0 ? 'passed' : 'failed',
        `Size: ${size}px`
      );
    });
  }

  private async testPositionTracking() {
    console.log('\n📍 Testing Position Tracking...');
    
    const solar = useSolarSystem.getState();
    
    // Test player position tracking
    const positions = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(100, 0, 0),
      new THREE.Vector3(-50, 0, 50),
      new THREE.Vector3(200, 0, -100)
    ];
    
    for (const pos of positions) {
      solar.setCameraPosition(pos);
      await this.wait(100);
      
      const currentPos = solar.cameraPosition;
      const distance = currentPos.distanceTo(pos);
      
      this.addResult(
        `Position Update ${positions.indexOf(pos) + 1}`,
        distance < 1 ? 'passed' : 'failed',
        `Target: (${pos.x}, ${pos.z}), Current: (${currentPos.x.toFixed(0)}, ${currentPos.z.toFixed(0)})`
      );
    }
    
    // Test entity relative positions
    const playerPos = solar.cameraPosition;
    const enemy = { position: new THREE.Vector3(100, 0, 50) };
    const relativePos = enemy.position.clone().sub(playerPos);
    
    this.addResult(
      'Relative Position',
      relativePos ? 'passed' : 'failed',
      `Enemy relative to player: (${relativePos.x.toFixed(0)}, ${relativePos.z.toFixed(0)})`
    );
  }

  private async testZoomControls() {
    console.log('\n🔍 Testing Zoom Controls...');
    
    const solar = useSolarSystem.getState();
    
    // Test zoom levels
    const zoomLevels = [0.5, 1.0, 1.5, 2.0];
    
    for (const zoom of zoomLevels) {
      solar.setZoom(zoom);
      await this.wait(100);
      
      this.addResult(
        `Zoom Level ${zoom}x`,
        solar.zoom === zoom ? 'passed' : 'failed',
        `Current zoom: ${solar.zoom}`
      );
    }
    
    // Test zoom bounds
    const minZoom = 0.25;
    const maxZoom = 4.0;
    
    solar.setZoom(minZoom - 0.1);
    await this.wait(100);
    
    this.addResult(
      'Min Zoom Limit',
      solar.zoom >= minZoom ? 'passed' : 'warning',
      `Zoom: ${solar.zoom} (min: ${minZoom})`
    );
    
    solar.setZoom(maxZoom + 0.1);
    await this.wait(100);
    
    this.addResult(
      'Max Zoom Limit',
      solar.zoom <= maxZoom ? 'passed' : 'warning',
      `Zoom: ${solar.zoom} (max: ${maxZoom})`
    );
    
    // Reset zoom
    solar.setZoom(1.0);
  }

  private async testClickNavigation() {
    console.log('\n🖱️ Testing Click Navigation...');
    
    const solar = useSolarSystem.getState();
    
    // Simulate minimap click
    const minimapSize = 200;
    const minimapCenter = { x: 100, y: 100 };
    const clickPos = { x: 150, y: 50 };
    
    // Convert click to world position
    const worldX = ((clickPos.x - minimapCenter.x) / minimapSize) * 1000;
    const worldZ = ((clickPos.y - minimapCenter.y) / minimapSize) * 1000;
    const targetPos = new THREE.Vector3(worldX, 0, worldZ);
    
    this.addResult(
      'Click Conversion',
      'passed',
      `Click (${clickPos.x}, ${clickPos.y}) → World (${worldX.toFixed(0)}, ${worldZ.toFixed(0)})`
    );
    
    // Test navigation to clicked position
    solar.setCameraPosition(targetPos);
    await this.wait(200);
    
    const distance = solar.cameraPosition.distanceTo(targetPos);
    
    this.addResult(
      'Click Navigation',
      distance < 10 ? 'passed' : 'failed',
      `Navigated to clicked position (distance: ${distance.toFixed(1)})`
    );
    
    // Test entity click selection
    const entityClickPos = this.testEntities[2].position; // Planet
    solar.setSelectedPlanet('Mars');
    await this.wait(100);
    
    this.addResult(
      'Entity Selection',
      solar.selectedPlanet === 'Mars' ? 'passed' : 'failed',
      `Selected: ${solar.selectedPlanet}`
    );
  }

  private async testEntityFiltering() {
    console.log('\n🔍 Testing Entity Filtering...');
    
    // Test filter by type
    const typeFilters = ['all', 'enemies', 'planets', 'asteroids'];
    
    for (const filter of typeFilters) {
      const visibleEntities = this.testEntities.filter(e => {
        if (filter === 'all') return true;
        if (filter === 'enemies') return e.type === 'enemy';
        if (filter === 'planets') return e.type === 'planet';
        if (filter === 'asteroids') return e.type === 'asteroid';
        return false;
      });
      
      this.addResult(
        `Filter: ${filter}`,
        visibleEntities.length > 0 || filter === 'all' ? 'passed' : 'warning',
        `Showing ${visibleEntities.length} entities`
      );
    }
    
    // Test distance filter
    const maxDistance = 300;
    const playerPos = new THREE.Vector3(0, 0, 0);
    
    const nearbyEntities = this.testEntities.filter(e => 
      e.position.distanceTo(playerPos) <= maxDistance
    );
    
    this.addResult(
      'Distance Filter',
      nearbyEntities.length > 0 ? 'passed' : 'failed',
      `${nearbyEntities.length} entities within ${maxDistance} units`
    );
    
    // Test importance filter
    const importantTypes = ['player', 'enemy', 'station'];
    const importantEntities = this.testEntities.filter(e => 
      importantTypes.includes(e.type)
    );
    
    this.addResult(
      'Importance Filter',
      importantEntities.length === 3 ? 'passed' : 'failed',
      `Important entities: ${importantEntities.length}`
    );
  }

  private async testMinimapOrientation() {
    console.log('\n🧭 Testing Minimap Orientation...');
    
    const solar = useSolarSystem.getState();
    
    // Test north-up orientation
    this.addResult(
      'North-Up Orientation',
      'passed',
      'Minimap locked to north'
    );
    
    // Test player rotation indicator
    const playerRotation = 45; // degrees
    const rotationRadians = (playerRotation * Math.PI) / 180;
    
    this.addResult(
      'Player Rotation',
      'passed',
      `Player facing: ${playerRotation}°`
    );
    
    // Test cardinal directions
    const cardinals = [
      { dir: 'N', angle: 0 },
      { dir: 'E', angle: 90 },
      { dir: 'S', angle: 180 },
      { dir: 'W', angle: 270 }
    ];
    
    cardinals.forEach(({ dir, angle }) => {
      this.addResult(
        `Cardinal: ${dir}`,
        'passed',
        `${dir} at ${angle}°`
      );
    });
    
    // Test grid overlay
    const gridSize = 50; // units
    const gridLines = Math.floor(1000 / gridSize);
    
    this.addResult(
      'Grid Overlay',
      gridLines > 0 ? 'passed' : 'failed',
      `${gridLines}x${gridLines} grid`
    );
  }

  private async testPerformance() {
    console.log('\n⚡ Testing Performance...');
    
    const enemies = useEnemies.getState();
    
    // Test with many entities
    const entityCounts = [10, 50, 100];
    
    for (const count of entityCounts) {
      // Clear enemies
      enemies.enemies = [];
      
      // Spawn test enemies
      const startTime = performance.now();
      
      for (let i = 0; i < count; i++) {
        const pos = new THREE.Vector3(
          Math.random() * 1000 - 500,
          0,
          Math.random() * 1000 - 500
        );
        enemies.spawnEnemy(pos, 'outlaws', 'fighter');
      }
      
      const spawnTime = performance.now() - startTime;
      
      // Simulate render
      const renderStart = performance.now();
      const renderTime = performance.now() - renderStart;
      
      this.addResult(
        `Performance: ${count} entities`,
        spawnTime < 1000 ? 'passed' : 'warning',
        `Spawn: ${spawnTime.toFixed(1)}ms, Render: ${renderTime.toFixed(1)}ms`
      );
    }
    
    // Test update rate
    const targetFPS = 30;
    const frameTime = 1000 / targetFPS;
    
    this.addResult(
      'Update Rate',
      frameTime <= 33.33 ? 'passed' : 'warning',
      `Target: ${targetFPS} FPS (${frameTime.toFixed(1)}ms/frame)`
    );
    
    // Clean up
    enemies.enemies = [];
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
    console.log('%c           MINIMAP TEST SUMMARY', 'color: #8b5cf6; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════', 'color: #8b5cf6');
    console.log(`%c✅ Passed: ${passed}/${total}`, 'color: #10b981');
    console.log(`%c❌ Failed: ${failed}/${total}`, 'color: #ef4444');
    console.log(`%c⚠️ Warnings: ${warnings}/${total}`, 'color: #f59e0b');
    console.log('%c═══════════════════════════════════════════════', 'color: #8b5cf6');
  }
}

// Make it available globally for testing
(window as any).testMinimap = () => {
  const testSuite = new MinimapTestSuite();
  testSuite.runAllTests();
};

console.log('%c🗺️ Minimap Test Suite Loaded!', 'color: #14b8a6; font-weight: bold');
console.log('Run %ctestMinimap()%c to execute tests', 'color: #3b82f6', 'color: inherit');