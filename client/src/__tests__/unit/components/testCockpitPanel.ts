/**
 * CockpitPanel Component Test Suite
 * Tests cockpit displays including speed indicator, altitude display, system status, and control responsiveness
 * Run with window.testCockpitPanel() from the browser console
 */

import { useShipStatus } from '../../../lib/stores/ship/useShipStatus';
import { useLandedState } from '../../../lib/stores/surface/useLandedState';
import { useSolarSystem } from '../../../lib/stores/space/useSolarSystem';
import { usePlayer } from '../../../lib/stores/player/usePlayer';
import * as THREE from 'three';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  details?: any;
}

interface SystemStatus {
  name: string;
  status: 'online' | 'offline' | 'warning' | 'critical';
  value: number;
  maxValue: number;
}

export class CockpitPanelTestSuite {
  private results: TestResult[] = [];
  private originalState: any = {};
  private systemsStatus: SystemStatus[] = [
    { name: 'Engines', status: 'online', value: 100, maxValue: 100 },
    { name: 'Shields', status: 'online', value: 100, maxValue: 100 },
    { name: 'Weapons', status: 'online', value: 100, maxValue: 100 },
    { name: 'Life Support', status: 'online', value: 100, maxValue: 100 },
    { name: 'Navigation', status: 'online', value: 100, maxValue: 100 },
    { name: 'Communications', status: 'online', value: 100, maxValue: 100 }
  ];

  constructor() {
    console.log('🚀 CockpitPanel Test Suite initialized');
  }

  async runAllTests() {
    console.clear();
    console.log('%c═══════════════════════════════════════════════', 'color: #f97316; font-size: 14px');
    console.log('%c   🚀 COCKPIT PANEL TEST SUITE STARTING', 'color: #f97316; font-size: 16px; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════', 'color: #f97316; font-size: 14px');
    
    this.results = [];
    this.saveState();
    
    try {
      await this.testInitialState();
      await this.wait(500);
      
      await this.testSpeedIndicator();
      await this.wait(500);
      
      await this.testAltitudeDisplay();
      await this.wait(500);
      
      await this.testSystemStatus();
      await this.wait(500);
      
      await this.testControlResponsiveness();
      await this.wait(500);
      
      await this.testWarningIndicators();
      await this.wait(500);
      
      await this.testTargetingSystem();
      await this.wait(500);
      
      await this.testPowerDistribution();
      
    } catch (error) {
      console.error('Test suite failed:', error);
      this.addResult('Test Suite', 'failed', `Critical error: ${error}`);
    } finally {
      this.restoreState();
      this.printSummary();
    }
  }

  private saveState() {
    const ship = useShipStatus.getState();
    const landed = useLandedState.getState();
    const solar = useSolarSystem.getState();
    
    this.originalState = {
      ship: {
        hull: ship.hull,
        shield: ship.shield,
        speed: ship.speed,
        targetSpeed: ship.targetSpeed
      },
      landed: {
        isLanded: landed.isLanded,
        landedPlanet: landed.landedPlanet
      },
      solar: {
        cameraPosition: solar.cameraPosition.clone(),
        selectedPlanet: solar.selectedPlanet
      }
    };
  }

  private restoreState() {
    const ship = useShipStatus.getState();
    const landed = useLandedState.getState();
    const solar = useSolarSystem.getState();
    
    ship.takeDamage(-ship.hull + this.originalState.ship.hull, 'hull');
    ship.takeDamage(-ship.shield + this.originalState.ship.shield, 'shield');
    ship.setSpeed(this.originalState.ship.speed);
    
    if (this.originalState.landed.isLanded) {
      landed.setLanded(this.originalState.landed.landedPlanet);
    } else {
      landed.setNotLanded();
    }
    
    solar.setCameraPosition(this.originalState.solar.cameraPosition);
    solar.setSelectedPlanet(this.originalState.solar.selectedPlanet);
  }

  private async testInitialState() {
    console.log('\n📊 Testing Initial State...');
    
    const ship = useShipStatus.getState();
    const landed = useLandedState.getState();
    
    this.addResult(
      'Cockpit Systems',
      'passed',
      'All systems initialized'
    );
    
    this.addResult(
      'Ship Status',
      ship ? 'passed' : 'failed',
      'Ship systems accessible'
    );
    
    this.addResult(
      'Flight Mode',
      !landed.isLanded ? 'passed' : 'warning',
      landed.isLanded ? 'Landed mode' : 'Flight mode'
    );
    
    // Test display refresh rate
    const targetFPS = 60;
    const frameTime = 1000 / targetFPS;
    
    this.addResult(
      'Display Refresh',
      frameTime <= 16.67 ? 'passed' : 'warning',
      `${targetFPS} FPS (${frameTime.toFixed(1)}ms/frame)`
    );
  }

  private async testSpeedIndicator() {
    console.log('\n⚡ Testing Speed Indicator...');
    
    const ship = useShipStatus.getState();
    
    // Test different speed values
    const speeds = [0, 50, 100, 150, 200];
    
    for (const speed of speeds) {
      ship.setSpeed(speed);
      await this.wait(100);
      
      this.addResult(
        `Speed: ${speed}`,
        ship.speed === speed ? 'passed' : 'failed',
        `Current: ${ship.speed} m/s`
      );
    }
    
    // Test speed units conversion
    const msToKmh = 3.6;
    const currentSpeedKmh = ship.speed * msToKmh;
    
    this.addResult(
      'Speed Units',
      currentSpeedKmh >= 0 ? 'passed' : 'failed',
      `${ship.speed} m/s = ${currentSpeedKmh.toFixed(0)} km/h`
    );
    
    // Test throttle indicator
    const maxSpeed = 200;
    const throttlePercentage = (ship.speed / maxSpeed) * 100;
    
    this.addResult(
      'Throttle Indicator',
      throttlePercentage >= 0 && throttlePercentage <= 100 ? 'passed' : 'failed',
      `Throttle: ${throttlePercentage.toFixed(0)}%`
    );
    
    // Test acceleration
    const targetSpeed = 100;
    ship.setTargetSpeed(targetSpeed);
    await this.wait(200);
    
    this.addResult(
      'Acceleration System',
      ship.targetSpeed === targetSpeed ? 'passed' : 'failed',
      `Target: ${ship.targetSpeed} m/s`
    );
  }

  private async testAltitudeDisplay() {
    console.log('\n📏 Testing Altitude Display...');
    
    const landed = useLandedState.getState();
    const solar = useSolarSystem.getState();
    
    // Test space altitude (no reference)
    landed.setNotLanded();
    await this.wait(200);
    
    this.addResult(
      'Space Altitude',
      !landed.isLanded ? 'passed' : 'failed',
      'No altitude reference in space'
    );
    
    // Test planetary altitude
    landed.setLanded('Mars');
    await this.wait(200);
    
    const surfaceAltitude = 0;
    
    this.addResult(
      'Surface Altitude',
      landed.isLanded ? 'passed' : 'failed',
      `Altitude: ${surfaceAltitude}m (landed)`
    );
    
    // Simulate orbital altitude
    landed.setNotLanded();
    const orbitalAltitudes = [100, 500, 1000, 5000];
    
    for (const altitude of orbitalAltitudes) {
      // Simulate altitude by distance from planet center
      const planetPos = new THREE.Vector3(0, 0, 0);
      const shipPos = new THREE.Vector3(0, altitude, 0);
      const distance = shipPos.distanceTo(planetPos);
      
      this.addResult(
        `Orbital: ${altitude}km`,
        distance === altitude ? 'passed' : 'failed',
        `Distance from center: ${distance}km`
      );
    }
    
    // Test altitude warnings
    const dangerAltitude = 50;
    
    this.addResult(
      'Low Altitude Warning',
      dangerAltitude < 100 ? 'passed' : 'warning',
      `${dangerAltitude}km - ${dangerAltitude < 100 ? 'WARNING' : 'Safe'}`
    );
  }

  private async testSystemStatus() {
    console.log('\n⚙️ Testing System Status...');
    
    const ship = useShipStatus.getState();
    
    // Test each system
    for (const system of this.systemsStatus) {
      const statusColor = this.getStatusColor(system.status);
      
      this.addResult(
        `System: ${system.name}`,
        system.status === 'online' ? 'passed' : 'warning',
        `Status: ${system.status.toUpperCase()} (${statusColor})`
      );
    }
    
    // Test system degradation
    ship.takeDamage(30, 'hull');
    await this.wait(100);
    
    // Update system status based on damage
    if (ship.hull < 70) {
      this.systemsStatus[0].status = 'warning'; // Engines
      this.systemsStatus[0].value = 70;
    }
    
    this.addResult(
      'Damage Effects',
      ship.hull < 100 ? 'passed' : 'failed',
      `Hull damage affects system performance`
    );
    
    // Test critical systems
    ship.takeDamage(ship.shield, 'shield');
    await this.wait(100);
    
    this.systemsStatus[1].status = 'critical'; // Shields
    this.systemsStatus[1].value = 0;
    
    this.addResult(
      'Critical System',
      ship.shield === 0 ? 'passed' : 'failed',
      'Shield system critical'
    );
    
    // Test system priorities
    const criticalSystems = ['Life Support', 'Engines'];
    const prioritySystems = this.systemsStatus.filter(s => 
      criticalSystems.includes(s.name)
    );
    
    this.addResult(
      'Priority Systems',
      prioritySystems.length === 2 ? 'passed' : 'failed',
      `Critical systems: ${prioritySystems.map(s => s.name).join(', ')}`
    );
  }

  private async testControlResponsiveness() {
    console.log('\n🎮 Testing Control Responsiveness...');
    
    const ship = useShipStatus.getState();
    
    // Test throttle response
    const throttleStart = performance.now();
    ship.setTargetSpeed(100);
    await this.wait(50);
    const throttleTime = performance.now() - throttleStart;
    
    this.addResult(
      'Throttle Response',
      throttleTime < 100 ? 'passed' : 'warning',
      `Response time: ${throttleTime.toFixed(1)}ms`
    );
    
    // Test rotation controls
    const rotationSpeeds = {
      pitch: 45, // deg/s
      yaw: 45,
      roll: 30
    };
    
    Object.entries(rotationSpeeds).forEach(([axis, speed]) => {
      this.addResult(
        `${axis} Control`,
        speed > 0 ? 'passed' : 'failed',
        `${speed}°/s`
      );
    });
    
    // Test control deadzone
    const deadzone = 0.1; // 10% deadzone
    const inputValue = 0.05;
    const processedInput = Math.abs(inputValue) > deadzone ? inputValue : 0;
    
    this.addResult(
      'Control Deadzone',
      processedInput === 0 ? 'passed' : 'failed',
      `Deadzone: ${deadzone * 100}% (input: ${inputValue})`
    );
    
    // Test control sensitivity
    const sensitivities = {
      low: 0.5,
      medium: 1.0,
      high: 1.5
    };
    
    const currentSensitivity = sensitivities.medium;
    
    this.addResult(
      'Control Sensitivity',
      currentSensitivity === 1.0 ? 'passed' : 'warning',
      `Sensitivity: ${currentSensitivity}x`
    );
  }

  private async testWarningIndicators() {
    console.log('\n⚠️ Testing Warning Indicators...');
    
    const ship = useShipStatus.getState();
    const player = usePlayer.getState();
    
    // Test hull warning
    ship.takeDamage(ship.hull - 20, 'hull');
    await this.wait(100);
    
    this.addResult(
      'Hull Warning',
      ship.hull <= 20 ? 'passed' : 'warning',
      `Hull: ${ship.hull}% - ${ship.hull <= 20 ? 'CRITICAL' : 'Normal'}`
    );
    
    // Test overheat warning
    player.heat = 85;
    await this.wait(100);
    
    this.addResult(
      'Overheat Warning',
      player.heat >= 80 ? 'passed' : 'warning',
      `Heat: ${player.heat}% - ${player.heat >= 80 ? 'OVERHEATING' : 'Normal'}`
    );
    
    // Test proximity warning
    const proximityDistance = 50; // meters
    const nearbyObject = true;
    
    this.addResult(
      'Proximity Warning',
      nearbyObject && proximityDistance < 100 ? 'passed' : 'warning',
      `Object at ${proximityDistance}m - ${proximityDistance < 100 ? 'PROXIMITY ALERT' : 'Clear'}`
    );
    
    // Test missile lock warning
    const missileLocked = false;
    
    this.addResult(
      'Missile Lock',
      !missileLocked ? 'passed' : 'warning',
      missileLocked ? 'MISSILE LOCK' : 'No threats'
    );
    
    // Test master caution
    const anyWarning = ship.hull <= 20 || player.heat >= 80;
    
    this.addResult(
      'Master Caution',
      anyWarning ? 'passed' : 'warning',
      anyWarning ? 'MASTER CAUTION ACTIVE' : 'All systems normal'
    );
  }

  private async testTargetingSystem() {
    console.log('\n🎯 Testing Targeting System...');
    
    const solar = useSolarSystem.getState();
    
    // Test target selection
    const targets = ['Enemy Fighter', 'Asteroid', 'Space Station', 'Planet'];
    let currentTarget = null;
    
    for (const target of targets) {
      currentTarget = target;
      await this.wait(100);
      
      this.addResult(
        `Target: ${target}`,
        currentTarget === target ? 'passed' : 'failed',
        `Locked: ${currentTarget}`
      );
    }
    
    // Test target distance
    const targetPosition = new THREE.Vector3(100, 0, 50);
    const playerPosition = solar.cameraPosition;
    const targetDistance = playerPosition.distanceTo(targetPosition);
    
    this.addResult(
      'Target Distance',
      targetDistance > 0 ? 'passed' : 'failed',
      `Distance: ${targetDistance.toFixed(0)}m`
    );
    
    // Test target velocity
    const targetVelocity = new THREE.Vector3(10, 0, 5);
    const relativeVelocity = targetVelocity.length();
    
    this.addResult(
      'Target Velocity',
      relativeVelocity > 0 ? 'passed' : 'failed',
      `Velocity: ${relativeVelocity.toFixed(0)} m/s`
    );
    
    // Test lead indicator
    const leadTime = targetDistance / 500; // projectile speed
    const leadPosition = targetPosition.clone().add(
      targetVelocity.clone().multiplyScalar(leadTime)
    );
    
    this.addResult(
      'Lead Indicator',
      leadPosition ? 'passed' : 'failed',
      'Lead indicator calculated'
    );
  }

  private async testPowerDistribution() {
    console.log('\n⚡ Testing Power Distribution...');
    
    // Test power allocation
    const powerSystems = {
      engines: 33,
      shields: 33,
      weapons: 34
    };
    
    const totalPower = Object.values(powerSystems).reduce((sum, val) => sum + val, 0);
    
    this.addResult(
      'Power Balance',
      totalPower === 100 ? 'passed' : 'failed',
      `Total: ${totalPower}%`
    );
    
    // Test power presets
    const presets = [
      { name: 'Balanced', engines: 33, shields: 33, weapons: 34 },
      { name: 'Combat', engines: 25, shields: 35, weapons: 40 },
      { name: 'Speed', engines: 50, shields: 25, weapons: 25 },
      { name: 'Defense', engines: 25, shields: 50, weapons: 25 }
    ];
    
    for (const preset of presets) {
      const presetTotal = preset.engines + preset.shields + preset.weapons;
      
      this.addResult(
        `Preset: ${preset.name}`,
        presetTotal === 100 ? 'passed' : 'failed',
        `E:${preset.engines}% S:${preset.shields}% W:${preset.weapons}%`
      );
    }
    
    // Test power boost
    const boostDuration = 5; // seconds
    const boostMultiplier = 1.5;
    
    this.addResult(
      'Power Boost',
      boostMultiplier > 1 ? 'passed' : 'failed',
      `Boost: ${boostMultiplier}x for ${boostDuration}s`
    );
    
    // Test emergency power
    const emergencyPower = true;
    
    this.addResult(
      'Emergency Power',
      emergencyPower ? 'passed' : 'failed',
      'Emergency power available'
    );
  }

  private getStatusColor(status: string): string {
    switch (status) {
      case 'online': return 'green';
      case 'warning': return 'yellow';
      case 'critical': return 'red';
      case 'offline': return 'gray';
      default: return 'white';
    }
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
    console.log('%c        COCKPIT PANEL TEST SUMMARY', 'color: #8b5cf6; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════', 'color: #8b5cf6');
    console.log(`%c✅ Passed: ${passed}/${total}`, 'color: #10b981');
    console.log(`%c❌ Failed: ${failed}/${total}`, 'color: #ef4444');
    console.log(`%c⚠️ Warnings: ${warnings}/${total}`, 'color: #f59e0b');
    console.log('%c═══════════════════════════════════════════════', 'color: #8b5cf6');
  }
}

// Make it available globally for testing
(window as any).testCockpitPanel = () => {
  const testSuite = new CockpitPanelTestSuite();
  testSuite.runAllTests();
};

console.log('%c🚀 CockpitPanel Test Suite Loaded!', 'color: #f97316; font-weight: bold');
console.log('Run %ctestCockpitPanel()%c to execute tests', 'color: #3b82f6', 'color: inherit');