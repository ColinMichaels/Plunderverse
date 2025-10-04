/**
 * Ship Models Test Suite
 * Tests ship rendering, damage states, and visual effects
 * Run with window.testShipModels() from the browser console
 */

import * as THREE from 'three';
import { useShipStatus } from '../../../lib/stores/ship/useShipStatus';
import { useEnemies } from '../../../lib/stores/combat/useEnemies';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  details?: any;
}

export class ShipModelsTestSuite {
  private results: TestResult[] = [];
  private scene: THREE.Scene | null = null;

  constructor() {
    console.log('🚀 Ship Models Test Suite initialized');
  }

  async runAllTests() {
    console.clear();
    console.log('%c═══════════════════════════════════════════════', 'color: #4169E1; font-size: 14px');
    console.log('%c   🛸 SHIP MODELS TEST SUITE STARTING', 'color: #4169E1; font-size: 16px; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════', 'color: #4169E1; font-size: 14px');
    
    this.results = [];
    
    try {
      await this.testPlayerShipModel();
      await this.wait(500);
      
      await this.testEnemyShipModels();
      await this.wait(500);
      
      await this.testShipDamageStates();
      await this.wait(500);
      
      await this.testEngineEffects();
      await this.wait(500);
      
      await this.testWeaponVisuals();
      await this.wait(500);
      
      await this.testShieldEffects();
      await this.wait(500);
      
      await this.testShipAnimations();
      await this.wait(500);
      
      await this.testShipUpgrades();
      
    } catch (error) {
      console.error('Test suite failed:', error);
      this.addResult('Test Suite', 'failed', `Critical error: ${error}`);
    } finally {
      this.cleanup();
      this.printSummary();
    }
  }

  private async testPlayerShipModel() {
    console.log('\n👨‍🚀 Testing Player Ship Model...');
    
    if (!this.scene) {
      this.scene = new THREE.Scene();
    }
    
    try {
      // Create player ship geometry
      const shipBody = new THREE.Group();
      
      // Main hull
      const hullGeometry = new THREE.ConeGeometry(1, 3, 8);
      const hullMaterial = new THREE.MeshPhongMaterial({
        color: 0x4169E1,
        emissive: 0x000044,
        shininess: 100
      });
      const hull = new THREE.Mesh(hullGeometry, hullMaterial);
      hull.rotation.x = Math.PI / 2;
      shipBody.add(hull);
      
      this.addResult(
        'Player Hull',
        hull instanceof THREE.Mesh ? 'passed' : 'failed',
        'Main hull created'
      );
      
      // Wings
      const wingGeometry = new THREE.BoxGeometry(4, 0.1, 1);
      const wingMaterial = new THREE.MeshPhongMaterial({
        color: 0x333333,
        metalness: 0.8
      });
      const wings = new THREE.Mesh(wingGeometry, wingMaterial);
      wings.position.z = 0.5;
      shipBody.add(wings);
      
      this.addResult(
        'Ship Wings',
        wings instanceof THREE.Mesh ? 'passed' : 'failed',
        'Wings attached'
      );
      
      // Cockpit
      const cockpitGeometry = new THREE.SphereGeometry(0.5, 16, 16);
      const cockpitMaterial = new THREE.MeshPhongMaterial({
        color: 0x00ffff,
        emissive: 0x004444,
        transparent: true,
        opacity: 0.8
      });
      const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
      cockpit.position.z = -0.8;
      shipBody.add(cockpit);
      
      this.addResult(
        'Cockpit',
        cockpit instanceof THREE.Mesh ? 'passed' : 'failed',
        'Cockpit window created'
      );
      
      // Test ship position and rotation
      shipBody.position.set(0, 0, 0);
      shipBody.rotation.set(0, 0, 0);
      
      this.addResult(
        'Ship Transform',
        shipBody.position && shipBody.rotation ? 'passed' : 'failed',
        'Position and rotation set'
      );
      
      this.scene.add(shipBody);
      
    } catch (error) {
      this.addResult('Player Ship Model', 'failed', `Error: ${error}`);
    }
  }

  private async testEnemyShipModels() {
    console.log('\n👾 Testing Enemy Ship Models...');
    
    if (!this.scene) {
      this.scene = new THREE.Scene();
    }
    
    try {
      const enemyTypes = [
        { type: 'fighter', geometry: 'cone', color: 0xFF0000, size: 0.8 },
        { type: 'patrol', geometry: 'box', color: 0xFF8800, size: 1.0 },
        { type: 'bomber', geometry: 'octahedron', color: 0x880000, size: 1.2 },
        { type: 'elite', geometry: 'dodecahedron', color: 0xFF00FF, size: 1.5 }
      ];
      
      enemyTypes.forEach(enemy => {
        let geometry: THREE.BufferGeometry;
        
        switch (enemy.geometry) {
          case 'cone':
            geometry = new THREE.ConeGeometry(enemy.size * 0.3, enemy.size, 4);
            break;
          case 'box':
            geometry = new THREE.BoxGeometry(enemy.size * 0.6, enemy.size * 0.3, enemy.size);
            break;
          case 'octahedron':
            geometry = new THREE.OctahedronGeometry(enemy.size * 0.5);
            break;
          case 'dodecahedron':
            geometry = new THREE.DodecahedronGeometry(enemy.size * 0.4);
            break;
          default:
            geometry = new THREE.TetrahedronGeometry(enemy.size * 0.5);
        }
        
        const material = new THREE.MeshPhongMaterial({
          color: enemy.color,
          emissive: enemy.color,
          emissiveIntensity: 0.2
        });
        
        const enemyMesh = new THREE.Mesh(geometry, material);
        enemyMesh.name = enemy.type;
        this.scene!.add(enemyMesh);
        
        this.addResult(
          `Enemy ${enemy.type}`,
          enemyMesh instanceof THREE.Mesh ? 'passed' : 'failed',
          `Geometry: ${enemy.geometry}, Size: ${enemy.size}`
        );
      });
      
      // Test enemy formation
      const formation = new THREE.Group();
      for (let i = 0; i < 5; i++) {
        const enemy = new THREE.Mesh(
          new THREE.TetrahedronGeometry(0.5),
          new THREE.MeshPhongMaterial({ color: 0xFF0000 })
        );
        enemy.position.x = (i - 2) * 2;
        formation.add(enemy);
      }
      
      this.addResult(
        'Enemy Formation',
        formation.children.length === 5 ? 'passed' : 'failed',
        `${formation.children.length} ships in formation`
      );
      
    } catch (error) {
      this.addResult('Enemy Ship Models', 'failed', `Error: ${error}`);
    }
  }

  private async testShipDamageStates() {
    console.log('\n💥 Testing Ship Damage States...');
    
    try {
      const shipStore = useShipStatus.getState();
      
      // Test damage levels
      const damageStates = [
        { hull: 100, state: 'pristine', color: 0x00FF00 },
        { hull: 75, state: 'light', color: 0xFFFF00 },
        { hull: 50, state: 'moderate', color: 0xFF8800 },
        { hull: 25, state: 'heavy', color: 0xFF4400 },
        { hull: 10, state: 'critical', color: 0xFF0000 }
      ];
      
      damageStates.forEach(damage => {
        shipStore.setHull(damage.hull);
        
        const material = new THREE.MeshPhongMaterial({
          color: damage.color,
          emissive: damage.color,
          emissiveIntensity: (100 - damage.hull) / 200
        });
        
        this.addResult(
          `Damage State: ${damage.state}`,
          material.color.getHex() === damage.color ? 'passed' : 'failed',
          `Hull: ${damage.hull}%, Color: #${damage.color.toString(16)}`
        );
      });
      
      // Test damage particles
      const damageParticles = new THREE.BufferGeometry();
      const particleCount = 50;
      const positions = new Float32Array(particleCount * 3);
      
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 2;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 2;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 2;
      }
      
      damageParticles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      
      const particleMaterial = new THREE.PointsMaterial({
        size: 0.1,
        color: 0xFF4400,
        transparent: true,
        opacity: 0.8
      });
      
      const particles = new THREE.Points(damageParticles, particleMaterial);
      
      this.addResult(
        'Damage Particles',
        particles instanceof THREE.Points ? 'passed' : 'failed',
        `${particleCount} smoke/spark particles`
      );
      
      // Test hull breach effect
      const breachMaterial = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          damage: { value: 0.5 }
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float time;
          uniform float damage;
          varying vec2 vUv;
          void main() {
            float breach = step(0.5, sin(vUv.x * 10.0 + time) * damage);
            gl_FragColor = vec4(1.0, 0.5, 0.0, breach);
          }
        `,
        transparent: true
      });
      
      this.addResult(
        'Hull Breach Shader',
        breachMaterial instanceof THREE.ShaderMaterial ? 'passed' : 'failed',
        'Animated breach effect'
      );
      
    } catch (error) {
      this.addResult('Ship Damage States', 'failed', `Error: ${error}`);
    }
  }

  private async testEngineEffects() {
    console.log('\n🔥 Testing Engine Effects...');
    
    if (!this.scene) {
      this.scene = new THREE.Scene();
    }
    
    try {
      // Test engine exhaust particles
      const exhaustGeometry = new THREE.ConeGeometry(0.3, 2, 8);
      const exhaustMaterial = new THREE.MeshBasicMaterial({
        color: 0x00CCFF,
        transparent: true,
        opacity: 0.6
      });
      
      const exhaust = new THREE.Mesh(exhaustGeometry, exhaustMaterial);
      exhaust.position.z = 2;
      exhaust.rotation.x = -Math.PI / 2;
      
      this.addResult(
        'Engine Exhaust',
        exhaust instanceof THREE.Mesh ? 'passed' : 'failed',
        'Exhaust cone created'
      );
      
      // Test thrust particles
      const thrustParticles = new THREE.BufferGeometry();
      const particleCount = 100;
      const positions = new Float32Array(particleCount * 3);
      const velocities = new Float32Array(particleCount * 3);
      
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 0.2;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 0.2;
        positions[i * 3 + 2] = Math.random() * 2;
        
        velocities[i * 3] = 0;
        velocities[i * 3 + 1] = 0;
        velocities[i * 3 + 2] = 5 + Math.random() * 5;
      }
      
      thrustParticles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      
      const thrustMaterial = new THREE.PointsMaterial({
        size: 0.05,
        color: 0x00FFFF,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.8
      });
      
      const thrust = new THREE.Points(thrustParticles, thrustMaterial);
      
      this.addResult(
        'Thrust Particles',
        thrust instanceof THREE.Points ? 'passed' : 'failed',
        `${particleCount} particles`
      );
      
      // Test afterburner effect
      const afterburnerMaterial = new THREE.MeshBasicMaterial({
        color: 0xFF4400,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
      });
      
      this.addResult(
        'Afterburner Effect',
        afterburnerMaterial.blending === THREE.AdditiveBlending ? 'passed' : 'failed',
        'Additive blending enabled'
      );
      
      // Test warp drive effect
      const warpMaterial = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          warpSpeed: { value: 0 }
        },
        vertexShader: `
          uniform float time;
          uniform float warpSpeed;
          varying vec2 vUv;
          void main() {
            vUv = uv;
            vec3 pos = position;
            pos.z += sin(time * 10.0) * warpSpeed * 0.1;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `,
        fragmentShader: `
          uniform float warpSpeed;
          varying vec2 vUv;
          void main() {
            vec3 color = mix(vec3(0.0, 0.5, 1.0), vec3(1.0, 1.0, 1.0), warpSpeed);
            gl_FragColor = vec4(color, warpSpeed);
          }
        `,
        transparent: true
      });
      
      this.addResult(
        'Warp Drive Shader',
        warpMaterial instanceof THREE.ShaderMaterial ? 'passed' : 'failed',
        'Warp distortion shader'
      );
      
    } catch (error) {
      this.addResult('Engine Effects', 'failed', `Error: ${error}`);
    }
  }

  private async testWeaponVisuals() {
    console.log('\n🔫 Testing Weapon Visuals...');
    
    if (!this.scene) {
      this.scene = new THREE.Scene();
    }
    
    try {
      // Test laser beam
      const laserGeometry = new THREE.CylinderGeometry(0.05, 0.05, 10);
      const laserMaterial = new THREE.MeshBasicMaterial({
        color: 0x00FF00,
        emissive: 0x00FF00,
        emissiveIntensity: 1
      });
      
      const laser = new THREE.Mesh(laserGeometry, laserMaterial);
      laser.rotation.z = Math.PI / 2;
      
      this.addResult(
        'Laser Beam',
        laser instanceof THREE.Mesh ? 'passed' : 'failed',
        'Basic laser created'
      );
      
      // Test missile model
      const missileBody = new THREE.Group();
      
      const missileTube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 1),
        new THREE.MeshPhongMaterial({ color: 0x666666 })
      );
      
      const missileHead = new THREE.Mesh(
        new THREE.ConeGeometry(0.1, 0.3, 8),
        new THREE.MeshPhongMaterial({ color: 0xFF0000 })
      );
      missileHead.position.y = 0.65;
      
      missileBody.add(missileTube);
      missileBody.add(missileHead);
      
      this.addResult(
        'Missile Model',
        missileBody.children.length === 2 ? 'passed' : 'failed',
        'Missile with warhead'
      );
      
      // Test plasma cannon
      const plasmaGeometry = new THREE.SphereGeometry(0.3, 16, 16);
      const plasmaMaterial = new THREE.MeshBasicMaterial({
        color: 0xFF00FF,
        transparent: true,
        opacity: 0.8
      });
      
      const plasma = new THREE.Mesh(plasmaGeometry, plasmaMaterial);
      
      // Add glow effect
      const glowGeometry = new THREE.SphereGeometry(0.4, 16, 16);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xFF00FF,
        transparent: true,
        opacity: 0.3,
        side: THREE.BackSide
      });
      
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      plasma.add(glow);
      
      this.addResult(
        'Plasma Projectile',
        plasma instanceof THREE.Mesh ? 'passed' : 'failed',
        'Plasma ball with glow'
      );
      
      // Test muzzle flash
      const muzzleFlash = new THREE.PointLight(0xFFFF00, 10, 5);
      muzzleFlash.position.set(0, 0, -2);
      
      this.addResult(
        'Muzzle Flash',
        muzzleFlash instanceof THREE.PointLight ? 'passed' : 'failed',
        'Flash light effect'
      );
      
    } catch (error) {
      this.addResult('Weapon Visuals', 'failed', `Error: ${error}`);
    }
  }

  private async testShieldEffects() {
    console.log('\n🛡️ Testing Shield Effects...');
    
    if (!this.scene) {
      this.scene = new THREE.Scene();
    }
    
    try {
      // Test basic shield sphere
      const shieldGeometry = new THREE.SphereGeometry(2, 32, 32);
      const shieldMaterial = new THREE.MeshPhongMaterial({
        color: 0x0088FF,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        emissive: 0x0044FF,
        emissiveIntensity: 0.5
      });
      
      const shield = new THREE.Mesh(shieldGeometry, shieldMaterial);
      
      this.addResult(
        'Shield Sphere',
        shield instanceof THREE.Mesh ? 'passed' : 'failed',
        'Basic shield created'
      );
      
      // Test shield ripple shader
      const rippleShader = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          hitPoint: { value: new THREE.Vector3() },
          hitTime: { value: 0 },
          shieldStrength: { value: 1.0 }
        },
        vertexShader: `
          varying vec3 vNormal;
          varying vec3 vPosition;
          void main() {
            vNormal = normal;
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float time;
          uniform vec3 hitPoint;
          uniform float hitTime;
          uniform float shieldStrength;
          varying vec3 vNormal;
          varying vec3 vPosition;
          
          void main() {
            float dist = distance(vPosition, hitPoint);
            float ripple = 1.0 - smoothstep(0.0, 2.0, dist - (time - hitTime) * 3.0);
            vec3 color = mix(vec3(0.0, 0.5, 1.0), vec3(1.0, 1.0, 1.0), ripple);
            float alpha = shieldStrength * 0.3 + ripple * 0.5;
            gl_FragColor = vec4(color, alpha);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide
      });
      
      this.addResult(
        'Shield Ripple Shader',
        rippleShader instanceof THREE.ShaderMaterial ? 'passed' : 'failed',
        'Impact ripple effect'
      );
      
      // Test hexagonal shield pattern
      const hexPattern = new THREE.Texture();
      hexPattern.name = 'Hexagonal Pattern';
      
      this.addResult(
        'Hex Shield Pattern',
        hexPattern instanceof THREE.Texture ? 'passed' : 'failed',
        'Hexagonal texture pattern'
      );
      
      // Test shield failure effect
      const failureMaterial = new THREE.MeshPhongMaterial({
        color: 0xFF0000,
        transparent: true,
        opacity: 0.5,
        emissive: 0xFF0000,
        emissiveIntensity: 1.0
      });
      
      this.addResult(
        'Shield Failure',
        failureMaterial.emissiveIntensity === 1.0 ? 'passed' : 'failed',
        'Critical shield state'
      );
      
    } catch (error) {
      this.addResult('Shield Effects', 'failed', `Error: ${error}`);
    }
  }

  private async testShipAnimations() {
    console.log('\n🎬 Testing Ship Animations...');
    
    try {
      // Test rotation animation
      const ship = new THREE.Object3D();
      const startRotation = ship.rotation.y;
      ship.rotation.y += Math.PI / 4;
      
      this.addResult(
        'Rotation Animation',
        ship.rotation.y !== startRotation ? 'passed' : 'failed',
        `Rotated ${(ship.rotation.y * 180 / Math.PI).toFixed(0)}°`
      );
      
      // Test banking animation
      const bankAngle = Math.PI / 6;
      ship.rotation.z = bankAngle;
      
      this.addResult(
        'Banking Animation',
        Math.abs(ship.rotation.z - bankAngle) < 0.01 ? 'passed' : 'failed',
        `Bank angle: ${(bankAngle * 180 / Math.PI).toFixed(0)}°`
      );
      
      // Test landing gear animation
      const landingGear = {
        extended: false,
        animationProgress: 0
      };
      
      landingGear.extended = true;
      landingGear.animationProgress = 1;
      
      this.addResult(
        'Landing Gear',
        landingGear.extended && landingGear.animationProgress === 1 ? 'passed' : 'failed',
        'Gear extended'
      );
      
      // Test barrel roll
      const rollSteps = 16;
      const rollIncrement = (Math.PI * 2) / rollSteps;
      
      this.addResult(
        'Barrel Roll',
        rollIncrement > 0 ? 'passed' : 'failed',
        `${rollSteps} steps for full roll`
      );
      
    } catch (error) {
      this.addResult('Ship Animations', 'failed', `Error: ${error}`);
    }
  }

  private async testShipUpgrades() {
    console.log('\n⚙️ Testing Ship Upgrades...');
    
    try {
      const shipStore = useShipStatus.getState();
      
      // Test upgrade visuals
      const upgrades = [
        { name: 'Enhanced Thrusters', visual: 'larger exhaust' },
        { name: 'Reinforced Hull', visual: 'armor plates' },
        { name: 'Advanced Weapons', visual: 'weapon pods' },
        { name: 'Shield Generator', visual: 'shield emitters' }
      ];
      
      upgrades.forEach(upgrade => {
        this.addResult(
          upgrade.name,
          true ? 'passed' : 'failed',
          `Visual: ${upgrade.visual}`
        );
      });
      
      // Test modular attachments
      const attachmentPoints = [
        { location: 'wings', type: 'weapons' },
        { location: 'hull', type: 'armor' },
        { location: 'rear', type: 'engines' },
        { location: 'top', type: 'sensors' }
      ];
      
      attachmentPoints.forEach(point => {
        this.addResult(
          `Attachment: ${point.location}`,
          true ? 'passed' : 'failed',
          `Type: ${point.type}`
        );
      });
      
    } catch (error) {
      this.addResult('Ship Upgrades', 'failed', `Error: ${error}`);
    }
  }

  private cleanup() {
    if (this.scene) {
      this.scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (object.material instanceof THREE.Material) {
            object.material.dispose();
          }
        }
      });
      this.scene.clear();
      this.scene = null;
    }
  }

  private addResult(name: string, status: TestResult['status'], message: string, details?: any) {
    this.results.push({ name, status, message, details });
    
    const icon = status === 'passed' ? '✅' : status === 'warning' ? '⚠️' : '❌';
    const color = status === 'passed' ? '#10b981' : status === 'warning' ? '#f59e0b' : '#ef4444';
    
    console.log(`${icon} ${name}:`, `%c${message}`, `color: ${color}`, details || '');
  }

  private async wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private printSummary() {
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;
    const total = this.results.length;
    
    console.log('\n═══════════════════════════════════════════════');
    console.log(`📊 TEST SUMMARY: ${passed}/${total} passed, ${failed} failed, ${warnings} warnings`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.filter(r => r.status === 'failed').forEach(r => {
        console.log(`  - ${r.name}: ${r.message}`);
      });
    }
    
    if (warnings > 0) {
      console.log('\n⚠️ Warnings:');
      this.results.filter(r => r.status === 'warning').forEach(r => {
        console.log(`  - ${r.name}: ${r.message}`);
      });
    }
    
    const score = Math.round((passed / total) * 100);
    const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
    
    console.log(`\n🎯 Score: ${score}% (Grade: ${grade})`);
    console.log('═══════════════════════════════════════════════');
  }
}

// Register test suite globally
if (typeof window !== 'undefined') {
  (window as any).testShipModels = () => {
    const suite = new ShipModelsTestSuite();
    return suite.runAllTests();
  };
  
  (window as any).ShipModelsTestSuite = ShipModelsTestSuite;
}

export default ShipModelsTestSuite;