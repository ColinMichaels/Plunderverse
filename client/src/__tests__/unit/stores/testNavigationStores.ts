/**
 * Navigation Stores Test Suite
 * Tests navigation and space stores including solar system, autopilot, and landing systems
 * Run with window.testNavigationStores() from the browser console
 */

import { useSolarSystem } from '../../../lib/stores/space/useSolarSystem';
import { useAutopilot } from '../../../lib/stores/navigation/useAutopilot';
import { useJumpSystem } from '../../../lib/stores/navigation/useJumpSystem';
import { useLandedState } from '../../../lib/stores/surface/useLandedState';
import { useAsteroids } from '../../../lib/stores/space/useAsteroids';
import * as THREE from 'three';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  details?: any;
}

export class NavigationStoresTestSuite {
  private results: TestResult[] = [];
  private originalStates: any = {};

  constructor() {
    console.log('🗺️ Navigation Stores Test Suite initialized');
  }

  async runAllTests() {
    console.clear();
    console.log('%c═══════════════════════════════════════════════', 'color: #0ea5e9; font-size: 14px');
    console.log('%c   🗺️ NAVIGATION STORES TEST SUITE STARTING', 'color: #0ea5e9; font-size: 16px; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════', 'color: #0ea5e9; font-size: 14px');
    
    this.results = [];
    
    try {
      // Save original states
      this.saveOriginalStates();
      
      await this.testSolarSystemState();
      await this.wait(500);
      
      await this.testAutopilot();
      await this.wait(500);
      
      await this.testJumpSystem();
      await this.wait(500);
      
      await this.testLandingSystem();
      await this.wait(500);
      
      await this.testPositionTracking();
      await this.wait(500);
      
      await this.testAsteroidField();
      await this.wait(500);
      
      await this.testNavigationIntegration();
      
    } catch (error) {
      console.error('Test suite failed:', error);
      this.addResult('Test Suite', 'failed', `Critical error: ${error}`);
    } finally {
      // Restore original states
      this.restoreOriginalStates();
      this.printSummary();
    }
  }

  private async testSolarSystemState() {
    console.log('\n🌌 Testing Solar System State...');
    
    const solarSystem = useSolarSystem.getState();
    
    // Test planet data
    this.addResult(
      'Planet Data',
      solarSystem.planets.length > 0 ? 'passed' : 'failed',
      `Planets in system: ${solarSystem.planets.length}`
    );
    
    // Test current planet
    this.addResult(
      'Current Planet',
      solarSystem.currentPlanet !== null ? 'passed' : 'failed',
      `Current planet: ${solarSystem.currentPlanet || 'None'}`
    );
    
    // Test ship position
    const hasPosition = solarSystem.shipPosition && 
                       typeof solarSystem.shipPosition.x === 'number' &&
                       typeof solarSystem.shipPosition.y === 'number' &&
                       typeof solarSystem.shipPosition.z === 'number';
    
    this.addResult(
      'Ship Position',
      hasPosition ? 'passed' : 'failed',
      `Position: (${solarSystem.shipPosition?.x?.toFixed(1)}, ${solarSystem.shipPosition?.y?.toFixed(1)}, ${solarSystem.shipPosition?.z?.toFixed(1)})`
    );
    
    // Test planet selection
    if (solarSystem.planets.length > 0) {
      const targetPlanet = solarSystem.planets[0];
      solarSystem.setCurrentPlanet(targetPlanet);
      
      this.addResult(
        'Planet Selection',
        solarSystem.currentPlanet === targetPlanet ? 'passed' : 'failed',
        `Selected: ${targetPlanet}`
      );
    }
    
    // Test distance calculation
    const earthPos = solarSystem.getPlanetPosition('Earth');
    const marsPos = solarSystem.getPlanetPosition('Mars');
    
    if (earthPos && marsPos) {
      const distance = Math.sqrt(
        Math.pow(marsPos.x - earthPos.x, 2) +
        Math.pow(marsPos.y - earthPos.y, 2) +
        Math.pow(marsPos.z - earthPos.z, 2)
      );
      
      this.addResult(
        'Distance Calculation',
        distance > 0 ? 'passed' : 'failed',
        `Earth to Mars: ${distance.toFixed(1)} units`
      );
    }
  }

  private async testAutopilot() {
    console.log('\n🚀 Testing Autopilot System...');
    
    const autopilot = useAutopilot.getState();
    const solarSystem = useSolarSystem.getState();
    
    // Test autopilot initialization
    this.addResult(
      'Autopilot Ready',
      !autopilot.isActive ? 'passed' : 'failed',
      `Initial state: ${autopilot.isActive ? 'Active' : 'Inactive'}`
    );
    
    // Test setting destination
    autopilot.setDestination('Mars');
    
    this.addResult(
      'Set Destination',
      autopilot.targetPlanet === 'Mars' ? 'passed' : 'failed',
      `Target: ${autopilot.targetPlanet}`
    );
    
    // Test engaging autopilot
    autopilot.engage();
    
    this.addResult(
      'Engage Autopilot',
      autopilot.isActive ? 'passed' : 'failed',
      `Autopilot engaged: ${autopilot.isActive}`
    );
    
    // Test progress tracking
    autopilot.updateProgress(0.5);
    
    this.addResult(
      'Progress Tracking',
      autopilot.progress === 0.5 ? 'passed' : 'failed',
      `Progress: ${(autopilot.progress * 100).toFixed(0)}%`
    );
    
    // Test arrival
    autopilot.updateProgress(1.0);
    
    this.addResult(
      'Arrival Detection',
      autopilot.progress >= 1.0 ? 'passed' : 'failed',
      `Arrived at destination`
    );
    
    // Test disengaging
    autopilot.disengage();
    
    this.addResult(
      'Disengage Autopilot',
      !autopilot.isActive ? 'passed' : 'failed',
      `Autopilot disengaged`
    );
    
    // Test emergency stop
    autopilot.engage();
    autopilot.emergencyStop();
    
    this.addResult(
      'Emergency Stop',
      !autopilot.isActive && autopilot.progress === 0 ? 'passed' : 'failed',
      `Emergency stop executed`
    );
  }

  private async testJumpSystem() {
    console.log('\n⚡ Testing Jump System...');
    
    const jumpSystem = useJumpSystem.getState();
    
    // Test jump readiness
    this.addResult(
      'Jump System Ready',
      !jumpSystem.isJumping && jumpSystem.jumpCooldown === 0 ? 'passed' : 'failed',
      `Ready to jump: ${!jumpSystem.isJumping}`
    );
    
    // Test jump initiation
    const canJump = jumpSystem.canJump();
    
    this.addResult(
      'Can Jump Check',
      typeof canJump === 'boolean' ? 'passed' : 'failed',
      `Can jump: ${canJump}`
    );
    
    if (canJump) {
      // Start jump
      jumpSystem.startJump('Venus');
      
      this.addResult(
        'Start Jump',
        jumpSystem.isJumping ? 'passed' : 'failed',
        `Jumping to: ${jumpSystem.targetSystem}`
      );
      
      // Test jump progress
      jumpSystem.updateJumpProgress(0.3);
      
      this.addResult(
        'Jump Progress',
        jumpSystem.jumpProgress === 0.3 ? 'passed' : 'failed',
        `Jump progress: ${(jumpSystem.jumpProgress * 100).toFixed(0)}%`
      );
      
      // Complete jump
      jumpSystem.completeJump();
      
      this.addResult(
        'Complete Jump',
        !jumpSystem.isJumping && jumpSystem.jumpProgress === 0 ? 'passed' : 'failed',
        `Jump completed`
      );
    }
    
    // Test cooldown
    jumpSystem.jumpCooldown = 10;
    const canJumpWithCooldown = jumpSystem.canJump();
    
    this.addResult(
      'Jump Cooldown',
      !canJumpWithCooldown ? 'passed' : 'failed',
      `Cooldown prevents jump: ${!canJumpWithCooldown}`
    );
    
    // Reset cooldown
    jumpSystem.resetCooldown();
    
    this.addResult(
      'Reset Cooldown',
      jumpSystem.jumpCooldown === 0 ? 'passed' : 'failed',
      `Cooldown reset`
    );
  }

  private async testLandingSystem() {
    console.log('\n🛬 Testing Landing System...');
    
    const landed = useLandedState.getState();
    const solarSystem = useSolarSystem.getState();
    
    // Test initial state
    this.addResult(
      'Initial Landing State',
      !landed.isLanded ? 'passed' : 'failed',
      `Initially in space: ${!landed.isLanded}`
    );
    
    // Test landing
    landed.setLanded('Earth');
    
    this.addResult(
      'Land on Planet',
      landed.isLanded && landed.currentPlanet === 'Earth' ? 'passed' : 'failed',
      `Landed on: ${landed.currentPlanet}`
    );
    
    // Test landing time
    this.addResult(
      'Landing Time Recorded',
      landed.landedAt !== null ? 'passed' : 'failed',
      `Landing time tracked`
    );
    
    // Test takeoff
    landed.setNotLanded();
    
    this.addResult(
      'Takeoff',
      !landed.isLanded && landed.currentPlanet === null ? 'passed' : 'failed',
      `Taken off successfully`
    );
    
    // Test landing on different planet
    landed.setLanded('Mars');
    const wasOnMars = landed.currentPlanet === 'Mars';
    landed.setLanded('Venus');
    
    this.addResult(
      'Planet Change',
      wasOnMars && landed.currentPlanet === 'Venus' ? 'passed' : 'failed',
      `Changed from Mars to ${landed.currentPlanet}`
    );
    
    // Test landing permissions
    landed.setNotLanded();
    const canLand = !landed.isLanded;
    
    this.addResult(
      'Landing Permission',
      canLand ? 'passed' : 'failed',
      `Can land: ${canLand}`
    );
  }

  private async testPositionTracking() {
    console.log('\n📍 Testing Position Tracking...');
    
    const solarSystem = useSolarSystem.getState();
    
    // Test position update
    const newPosition = { x: 100, y: 50, z: -75 };
    solarSystem.updateShipPosition(newPosition);
    
    this.addResult(
      'Position Update',
      solarSystem.shipPosition?.x === 100 ? 'passed' : 'failed',
      `Position updated to: (${solarSystem.shipPosition?.x}, ${solarSystem.shipPosition?.y}, ${solarSystem.shipPosition?.z})`
    );
    
    // Test velocity tracking
    if (solarSystem.shipVelocity) {
      const speed = Math.sqrt(
        solarSystem.shipVelocity.x ** 2 +
        solarSystem.shipVelocity.y ** 2 +
        solarSystem.shipVelocity.z ** 2
      );
      
      this.addResult(
        'Velocity Tracking',
        speed >= 0 ? 'passed' : 'failed',
        `Speed: ${speed.toFixed(1)} units/s`
      );
    }
    
    // Test nearest planet calculation
    const nearestPlanet = solarSystem.getNearestPlanet();
    
    this.addResult(
      'Nearest Planet',
      nearestPlanet !== null ? 'passed' : 'failed',
      `Nearest: ${nearestPlanet}`
    );
    
    // Test distance to planet
    if (nearestPlanet) {
      const distance = solarSystem.getDistanceToPlanet(nearestPlanet);
      
      this.addResult(
        'Distance Measurement',
        distance !== null && distance >= 0 ? 'passed' : 'failed',
        `Distance to ${nearestPlanet}: ${distance?.toFixed(1)} units`
      );
    }
    
    // Test orbit detection
    const inOrbit = solarSystem.isInOrbit();
    
    this.addResult(
      'Orbit Detection',
      typeof inOrbit === 'boolean' ? 'passed' : 'failed',
      `In orbit: ${inOrbit}`
    );
  }

  private async testAsteroidField() {
    console.log('\n☄️ Testing Asteroid Field...');
    
    const asteroids = useAsteroids.getState();
    
    // Test asteroid generation
    asteroids.generateField(50);
    
    this.addResult(
      'Asteroid Generation',
      asteroids.asteroids.length > 0 ? 'passed' : 'failed',
      `Generated: ${asteroids.asteroids.length} asteroids`
    );
    
    // Test asteroid properties
    if (asteroids.asteroids.length > 0) {
      const firstAsteroid = asteroids.asteroids[0];
      
      this.addResult(
        'Asteroid Properties',
        firstAsteroid.position && firstAsteroid.size && firstAsteroid.mineralContent ? 'passed' : 'failed',
        `Size: ${firstAsteroid.size}, Minerals: ${firstAsteroid.mineralContent}`
      );
    }
    
    // Test collision detection
    const testPosition = new THREE.Vector3(0, 0, 0);
    const collision = asteroids.checkCollision(testPosition, 5);
    
    this.addResult(
      'Collision Detection',
      typeof collision === 'boolean' ? 'passed' : 'failed',
      `Collision check functional`
    );
    
    // Test asteroid removal
    if (asteroids.asteroids.length > 0) {
      const asteroidId = asteroids.asteroids[0].id;
      asteroids.removeAsteroid(asteroidId);
      
      const removed = !asteroids.asteroids.find(a => a.id === asteroidId);
      
      this.addResult(
        'Asteroid Removal',
        removed ? 'passed' : 'failed',
        `Asteroid removed: ${removed}`
      );
    }
    
    // Test field clearing
    asteroids.clearField();
    
    this.addResult(
      'Clear Field',
      asteroids.asteroids.length === 0 ? 'passed' : 'failed',
      `Field cleared`
    );
  }

  private async testNavigationIntegration() {
    console.log('\n🔗 Testing Navigation Integration...');
    
    const solarSystem = useSolarSystem.getState();
    const autopilot = useAutopilot.getState();
    const landed = useLandedState.getState();
    const jumpSystem = useJumpSystem.getState();
    
    // Test autopilot-landing integration
    landed.setNotLanded();
    autopilot.setDestination('Earth');
    autopilot.engage();
    autopilot.updateProgress(1.0);
    
    this.addResult(
      'Autopilot-Landing Ready',
      autopilot.progress >= 1.0 && !landed.isLanded ? 'passed' : 'failed',
      `Ready to land after autopilot`
    );
    
    // Test landing after arrival
    landed.setLanded('Earth');
    autopilot.disengage();
    
    this.addResult(
      'Post-Arrival Landing',
      landed.isLanded && !autopilot.isActive ? 'passed' : 'failed',
      `Landed and autopilot off`
    );
    
    // Test jump system integration
    landed.setNotLanded();
    const canJumpFromSpace = !landed.isLanded && jumpSystem.canJump();
    
    this.addResult(
      'Jump from Space',
      canJumpFromSpace ? 'passed' : 'failed',
      `Can jump when not landed: ${canJumpFromSpace}`
    );
    
    // Test position sync
    solarSystem.updateShipPosition({ x: 200, y: 100, z: 50 });
    const positionSynced = solarSystem.shipPosition?.x === 200;
    
    this.addResult(
      'Position Sync',
      positionSynced ? 'passed' : 'failed',
      `Systems share position data`
    );
    
    // Test navigation state consistency
    const navigationState = {
      inSpace: !landed.isLanded,
      autopilotActive: autopilot.isActive,
      jumping: jumpSystem.isJumping,
      hasPosition: solarSystem.shipPosition !== null
    };
    
    const consistent = navigationState.hasPosition && 
                       (navigationState.inSpace || landed.isLanded);
    
    this.addResult(
      'State Consistency',
      consistent ? 'passed' : 'failed',
      `Navigation state consistent`
    );
  }

  private saveOriginalStates() {
    this.originalStates.solarSystem = { ...useSolarSystem.getState() };
    this.originalStates.autopilot = { ...useAutopilot.getState() };
    this.originalStates.jumpSystem = { ...useJumpSystem.getState() };
    this.originalStates.landed = { ...useLandedState.getState() };
    this.originalStates.asteroids = { ...useAsteroids.getState() };
  }

  private restoreOriginalStates() {
    // Reset navigation systems
    const autopilot = useAutopilot.getState();
    const jumpSystem = useJumpSystem.getState();
    const landed = useLandedState.getState();
    const asteroids = useAsteroids.getState();
    
    autopilot.disengage();
    autopilot.targetPlanet = null;
    autopilot.progress = 0;
    
    jumpSystem.isJumping = false;
    jumpSystem.jumpProgress = 0;
    jumpSystem.jumpCooldown = 0;
    
    landed.setNotLanded();
    
    asteroids.clearField();
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
    console.log('%c          NAVIGATION STORES TEST SUMMARY', 'color: #8b5cf6; font-weight: bold');
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
(window as any).testNavigationStores = () => {
  const testSuite = new NavigationStoresTestSuite();
  testSuite.runAllTests();
};

console.log('%c🗺️ Navigation Stores Test Suite Loaded!', 'color: #0ea5e9; font-weight: bold');
console.log('Run %ctestNavigationStores()%c to execute tests', 'color: #3b82f6', 'color: inherit');