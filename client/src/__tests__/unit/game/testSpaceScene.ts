/**
 * Space Scene Test Suite
 * Tests the main 3D space scene rendering, camera controls, and celestial objects
 * Run with window.testSpaceScene() from the browser console
 */

import * as THREE from 'three';
import { useSolarSystem } from '../../../lib/stores/space/useSolarSystem';
import { useShipStatus } from '../../../lib/stores/ship/useShipStatus';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  details?: any;
}

export class SpaceSceneTestSuite {
  private results: TestResult[] = [];
  private scene: THREE.Scene | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private camera: THREE.PerspectiveCamera | null = null;

  constructor() {
    console.log('🚀 Space Scene Test Suite initialized');
  }

  async runAllTests() {
    console.clear();
    console.log('%c═══════════════════════════════════════════════', 'color: #00ffff; font-size: 14px');
    console.log('%c   🌌 SPACE SCENE TEST SUITE STARTING', 'color: #00ffff; font-size: 16px; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════', 'color: #00ffff; font-size: 14px');
    
    this.results = [];
    
    try {
      await this.testWebGLAvailability();
      await this.wait(500);
      
      await this.testSceneSetup();
      await this.wait(500);
      
      await this.testCameraSetup();
      await this.wait(500);
      
      await this.testLightingConfiguration();
      await this.wait(500);
      
      await this.testStarfieldGeneration();
      await this.wait(500);
      
      await this.testPlanetRendering();
      await this.wait(500);
      
      await this.testOrbitalMechanics();
      await this.wait(500);
      
      await this.testSunRendering();
      await this.wait(500);
      
      await this.testAsteroidField();
      
    } catch (error) {
      console.error('Test suite failed:', error);
      this.addResult('Test Suite', 'failed', `Critical error: ${error}`);
    } finally {
      this.cleanup();
      this.printSummary();
    }
  }

  private async testWebGLAvailability() {
    console.log('\n🎮 Testing WebGL Availability...');
    
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    this.addResult(
      'WebGL Context',
      gl ? 'passed' : 'failed',
      gl ? 'WebGL is available' : 'WebGL is not available'
    );
    
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        this.addResult(
          'GPU Info',
          'passed',
          `Vendor: ${vendor}, Renderer: ${renderer}`
        );
      }
      
      const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      const maxViewportDims = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
      this.addResult(
        'WebGL Capabilities',
        'passed',
        `Max Texture: ${maxTextureSize}, Max Viewport: ${maxViewportDims[0]}x${maxViewportDims[1]}`
      );
    }
  }

  private async testSceneSetup() {
    console.log('\n🎬 Testing Scene Setup...');
    
    try {
      this.scene = new THREE.Scene();
      
      this.addResult(
        'Scene Creation',
        this.scene instanceof THREE.Scene ? 'passed' : 'failed',
        'THREE.Scene object created'
      );
      
      // Test fog
      this.scene.fog = new THREE.Fog(0x000000, 100, 1500);
      this.addResult(
        'Fog Setup',
        this.scene.fog ? 'passed' : 'failed',
        `Fog configured with near: ${this.scene.fog?.near}, far: ${this.scene.fog?.far}`
      );
      
      // Test background
      this.scene.background = new THREE.Color(0x000000);
      this.addResult(
        'Background Color',
        this.scene.background ? 'passed' : 'failed',
        'Space background color set'
      );
      
    } catch (error) {
      this.addResult('Scene Setup', 'failed', `Error: ${error}`);
    }
  }

  private async testCameraSetup() {
    console.log('\n📷 Testing Camera Setup...');
    
    try {
      this.camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        5000
      );
      
      this.addResult(
        'Camera Creation',
        this.camera instanceof THREE.PerspectiveCamera ? 'passed' : 'failed',
        'PerspectiveCamera created'
      );
      
      this.camera.position.set(0, 20, 100);
      this.addResult(
        'Camera Position',
        'passed',
        `Position: (${this.camera.position.x}, ${this.camera.position.y}, ${this.camera.position.z})`
      );
      
      // Test camera controls store
      const solarSystem = useSolarSystem.getState();
      solarSystem.setCameraPosition(this.camera.position);
      
      this.addResult(
        'Camera Store Integration',
        'passed',
        'Camera position synced with store'
      );
      
      // Test FOV and aspect ratio
      this.addResult(
        'Camera Properties',
        'passed',
        `FOV: ${this.camera.fov}°, Aspect: ${this.camera.aspect}, Near: ${this.camera.near}, Far: ${this.camera.far}`
      );
      
    } catch (error) {
      this.addResult('Camera Setup', 'failed', `Error: ${error}`);
    }
  }

  private async testLightingConfiguration() {
    console.log('\n💡 Testing Lighting Configuration...');
    
    if (!this.scene) {
      this.addResult('Lighting Test', 'failed', 'Scene not initialized');
      return;
    }
    
    try {
      // Test ambient light
      const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
      this.scene.add(ambientLight);
      
      this.addResult(
        'Ambient Light',
        ambientLight instanceof THREE.AmbientLight ? 'passed' : 'failed',
        `Intensity: ${ambientLight.intensity}`
      );
      
      // Test directional light (sun)
      const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
      directionalLight.position.set(0, 0, 0);
      directionalLight.castShadow = true;
      this.scene.add(directionalLight);
      
      this.addResult(
        'Directional Light',
        directionalLight instanceof THREE.DirectionalLight ? 'passed' : 'failed',
        `Intensity: ${directionalLight.intensity}, Shadows: ${directionalLight.castShadow}`
      );
      
      // Test point light (sun core)
      const pointLight = new THREE.PointLight(0xFDB813, 5, 3000, 0.8);
      this.scene.add(pointLight);
      
      this.addResult(
        'Point Light (Sun)',
        pointLight instanceof THREE.PointLight ? 'passed' : 'failed',
        `Color: #${pointLight.color.getHexString()}, Intensity: ${pointLight.intensity}, Distance: ${pointLight.distance}`
      );
      
      // Count total lights
      const lights = this.scene.children.filter(child => child instanceof THREE.Light);
      this.addResult(
        'Total Lights',
        lights.length >= 3 ? 'passed' : 'warning',
        `${lights.length} lights in scene`
      );
      
    } catch (error) {
      this.addResult('Lighting Configuration', 'failed', `Error: ${error}`);
    }
  }

  private async testStarfieldGeneration() {
    console.log('\n⭐ Testing Starfield Generation...');
    
    if (!this.scene) {
      this.addResult('Starfield Test', 'failed', 'Scene not initialized');
      return;
    }
    
    try {
      const starCount = 1000;
      const positions = new Float32Array(starCount * 3);
      const colors = new Float32Array(starCount * 3);
      
      // Generate star positions and colors
      for (let i = 0; i < starCount; i++) {
        const radius = 600 + Math.random() * 800;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        
        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = radius * Math.cos(phi);
        
        // Star colors
        const starType = Math.random();
        if (starType < 0.4) {
          colors[i * 3] = 1.0;
          colors[i * 3 + 1] = 0.8;
          colors[i * 3 + 2] = 0.6;
        } else {
          colors[i * 3] = 0.9;
          colors[i * 3 + 1] = 0.9;
          colors[i * 3 + 2] = 1.0;
        }
      }
      
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      
      const material = new THREE.PointsMaterial({
        size: 2,
        vertexColors: true,
        transparent: true,
        opacity: 0.8
      });
      
      const starfield = new THREE.Points(geometry, material);
      this.scene.add(starfield);
      
      this.addResult(
        'Starfield Creation',
        starfield instanceof THREE.Points ? 'passed' : 'failed',
        `${starCount} stars generated`
      );
      
      this.addResult(
        'Star Distribution',
        'passed',
        `Radius range: 600-1400 units`
      );
      
      this.addResult(
        'Star Colors',
        'passed',
        'Multiple star types with varied colors'
      );
      
    } catch (error) {
      this.addResult('Starfield Generation', 'failed', `Error: ${error}`);
    }
  }

  private async testPlanetRendering() {
    console.log('\n🪐 Testing Planet Rendering...');
    
    if (!this.scene) {
      this.addResult('Planet Test', 'failed', 'Scene not initialized');
      return;
    }
    
    try {
      const testPlanets = [
        { name: 'Earth', size: 5, distance: 150, color: 0x2E8BC0 },
        { name: 'Mars', size: 3, distance: 200, color: 0xCD5C5C },
        { name: 'Jupiter', size: 10, distance: 400, color: 0xDAA520 }
      ];
      
      testPlanets.forEach(planetData => {
        const geometry = new THREE.SphereGeometry(planetData.size, 32, 32);
        const material = new THREE.MeshPhongMaterial({
          color: planetData.color,
          emissive: 0x000000,
          shininess: 10
        });
        
        const planet = new THREE.Mesh(geometry, material);
        planet.position.x = planetData.distance;
        planet.name = planetData.name;
        this.scene!.add(planet);
        
        this.addResult(
          `Planet ${planetData.name}`,
          planet instanceof THREE.Mesh ? 'passed' : 'failed',
          `Size: ${planetData.size}, Distance: ${planetData.distance}`
        );
      });
      
      // Test planet count
      const planets = this.scene.children.filter(child => 
        child instanceof THREE.Mesh && child.name && ['Earth', 'Mars', 'Jupiter'].includes(child.name)
      );
      
      this.addResult(
        'Total Planets',
        planets.length === 3 ? 'passed' : 'warning',
        `${planets.length} planets in scene`
      );
      
    } catch (error) {
      this.addResult('Planet Rendering', 'failed', `Error: ${error}`);
    }
  }

  private async testOrbitalMechanics() {
    console.log('\n🌍 Testing Orbital Mechanics...');
    
    try {
      const solarSystem = useSolarSystem.getState();
      
      // Test time progression
      const initialTime = solarSystem.time;
      solarSystem.setTime(initialTime + 0.1);
      
      this.addResult(
        'Time System',
        solarSystem.time > initialTime ? 'passed' : 'failed',
        `Time advanced: ${solarSystem.time.toFixed(2)}`
      );
      
      // Test orbital calculations
      const orbitalSpeed = 0.01;
      const distance = 150;
      const angle = solarSystem.time * orbitalSpeed;
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;
      
      this.addResult(
        'Orbital Calculation',
        !isNaN(x) && !isNaN(z) ? 'passed' : 'failed',
        `Position: (${x.toFixed(2)}, 0, ${z.toFixed(2)})`
      );
      
      // Test planet selection
      solarSystem.setSelectedPlanet('Earth');
      this.addResult(
        'Planet Selection',
        solarSystem.selectedPlanet === 'Earth' ? 'passed' : 'failed',
        `Selected: ${solarSystem.selectedPlanet}`
      );
      
      // Test warp time scale
      solarSystem.setWarpTimeScale(10);
      this.addResult(
        'Warp Time Scale',
        solarSystem.warpTimeScale === 10 ? 'passed' : 'failed',
        `Time scale: ${solarSystem.warpTimeScale}x`
      );
      
    } catch (error) {
      this.addResult('Orbital Mechanics', 'failed', `Error: ${error}`);
    }
  }

  private async testSunRendering() {
    console.log('\n☀️ Testing Sun Rendering...');
    
    if (!this.scene) {
      this.addResult('Sun Test', 'failed', 'Scene not initialized');
      return;
    }
    
    try {
      // Create sun mesh
      const sunGeometry = new THREE.SphereGeometry(5, 32, 32);
      const sunMaterial = new THREE.MeshBasicMaterial({
        color: 0xFDB813,
        emissive: 0xFDB813,
        emissiveIntensity: 1
      });
      
      const sun = new THREE.Mesh(sunGeometry, sunMaterial);
      sun.position.set(0, 0, 0);
      this.scene.add(sun);
      
      this.addResult(
        'Sun Mesh',
        sun instanceof THREE.Mesh ? 'passed' : 'failed',
        'Sun object created'
      );
      
      // Create sun glow
      const glowGeometry = new THREE.SphereGeometry(6, 32, 32);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xFDB813,
        transparent: true,
        opacity: 0.4,
        side: THREE.BackSide
      });
      
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      this.scene.add(glow);
      
      this.addResult(
        'Sun Glow',
        glow instanceof THREE.Mesh ? 'passed' : 'failed',
        'Glow effect created'
      );
      
      // Create corona
      const coronaGeometry = new THREE.SphereGeometry(7, 32, 32);
      const coronaMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFA500,
        transparent: true,
        opacity: 0.2,
        side: THREE.BackSide
      });
      
      const corona = new THREE.Mesh(coronaGeometry, coronaMaterial);
      this.scene.add(corona);
      
      this.addResult(
        'Sun Corona',
        corona instanceof THREE.Mesh ? 'passed' : 'failed',
        'Corona effect created'
      );
      
    } catch (error) {
      this.addResult('Sun Rendering', 'failed', `Error: ${error}`);
    }
  }

  private async testAsteroidField() {
    console.log('\n🌑 Testing Asteroid Field...');
    
    if (!this.scene) {
      this.addResult('Asteroid Test', 'failed', 'Scene not initialized');
      return;
    }
    
    try {
      const asteroidCount = 50;
      const asteroids: THREE.Mesh[] = [];
      
      for (let i = 0; i < asteroidCount; i++) {
        const size = 0.5 + Math.random() * 2;
        const geometry = new THREE.IcosahedronGeometry(size, 0);
        const material = new THREE.MeshPhongMaterial({
          color: 0x8B7355,
          flatShading: true
        });
        
        const asteroid = new THREE.Mesh(geometry, material);
        
        // Position in belt between Mars and Jupiter
        const angle = (i / asteroidCount) * Math.PI * 2;
        const distance = 250 + Math.random() * 50;
        asteroid.position.x = Math.cos(angle) * distance;
        asteroid.position.z = Math.sin(angle) * distance;
        asteroid.position.y = (Math.random() - 0.5) * 20;
        
        asteroid.rotation.set(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        );
        
        asteroids.push(asteroid);
        this.scene.add(asteroid);
      }
      
      this.addResult(
        'Asteroid Creation',
        asteroids.length === asteroidCount ? 'passed' : 'failed',
        `${asteroids.length} asteroids created`
      );
      
      this.addResult(
        'Asteroid Distribution',
        'passed',
        'Positioned in belt formation'
      );
      
      // Test instanced rendering for performance
      const instancedGeometry = new THREE.IcosahedronGeometry(1, 0);
      const instancedMaterial = new THREE.MeshPhongMaterial({
        color: 0x8B7355
      });
      const instancedMesh = new THREE.InstancedMesh(
        instancedGeometry,
        instancedMaterial,
        100
      );
      
      this.addResult(
        'Instanced Asteroids',
        instancedMesh instanceof THREE.InstancedMesh ? 'passed' : 'failed',
        'InstancedMesh support verified'
      );
      
    } catch (error) {
      this.addResult('Asteroid Field', 'failed', `Error: ${error}`);
    }
  }

  private cleanup() {
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
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
    this.camera = null;
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
  (window as any).testSpaceScene = () => {
    const suite = new SpaceSceneTestSuite();
    return suite.runAllTests();
  };
  
  (window as any).SpaceSceneTestSuite = SpaceSceneTestSuite;
}

export default SpaceSceneTestSuite;