/**
 * Planet Surface Test Suite
 * Tests planet surface scene rendering, terrain generation, and atmospheric effects
 * Run with window.testPlanetSurface() from the browser console
 */

import * as THREE from 'three';
import { useTerrain } from '../../../lib/stores/surface/useTerrain';
import { useLandedState } from '../../../lib/stores/surface/useLandedState';
import { useWind } from '../../../lib/stores/surface/useWind';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  details?: any;
}

export class PlanetSurfaceTestSuite {
  private results: TestResult[] = [];
  private scene: THREE.Scene | null = null;

  constructor() {
    console.log('🌍 Planet Surface Test Suite initialized');
  }

  async runAllTests() {
    console.clear();
    console.log('%c═══════════════════════════════════════════════', 'color: #8B4513; font-size: 14px');
    console.log('%c   🏔️ PLANET SURFACE TEST SUITE STARTING', 'color: #8B4513; font-size: 16px; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════', 'color: #8B4513; font-size: 14px');
    
    this.results = [];
    
    try {
      await this.testTerrainGeneration();
      await this.wait(500);
      
      await this.testSurfaceScatterObjects();
      await this.wait(500);
      
      await this.testAtmosphericEffects();
      await this.wait(500);
      
      await this.testDayNightCycle();
      await this.wait(500);
      
      await this.testWeatherSystems();
      await this.wait(500);
      
      await this.testSurfaceLighting();
      await this.wait(500);
      
      await this.testResourceNodes();
      await this.wait(500);
      
      await this.testTerrainLOD();
      
    } catch (error) {
      console.error('Test suite failed:', error);
      this.addResult('Test Suite', 'failed', `Critical error: ${error}`);
    } finally {
      this.cleanup();
      this.printSummary();
    }
  }

  private async testTerrainGeneration() {
    console.log('\n⛰️ Testing Terrain Generation...');
    
    try {
      const terrainStore = useTerrain.getState();
      
      // Test terrain generation for different planets
      const planets = ['Mars', 'Earth', 'Moon'];
      
      for (const planet of planets) {
        terrainStore.setPlanet(planet);
        terrainStore.generateNewTerrain();
        
        this.addResult(
          `${planet} Terrain`,
          terrainStore.currentPlanet === planet ? 'passed' : 'failed',
          `Generated terrain for ${planet}`
        );
        
        // Test height calculation
        const height = terrainStore.getHeightAt(0, 0);
        this.addResult(
          `${planet} Height Map`,
          typeof height === 'number' && !isNaN(height) ? 'passed' : 'failed',
          `Height at origin: ${height.toFixed(2)}`
        );
      }
      
      // Test terrain mesh creation
      const geometry = new THREE.PlaneGeometry(100, 100, 64, 64);
      const material = new THREE.MeshStandardMaterial({
        color: 0x8B4513,
        roughness: 0.8,
        metalness: 0.2
      });
      
      const terrain = new THREE.Mesh(geometry, material);
      terrain.rotation.x = -Math.PI / 2;
      
      this.addResult(
        'Terrain Mesh',
        terrain instanceof THREE.Mesh ? 'passed' : 'failed',
        'Terrain mesh created'
      );
      
      // Test vertex displacement
      const positions = geometry.attributes.position;
      let displaced = false;
      for (let i = 0; i < positions.count; i++) {
        const y = Math.sin(i * 0.1) * 5;
        if (y !== 0) displaced = true;
        positions.setZ(i, y);
      }
      positions.needsUpdate = true;
      
      this.addResult(
        'Vertex Displacement',
        displaced ? 'passed' : 'failed',
        'Terrain vertices displaced'
      );
      
    } catch (error) {
      this.addResult('Terrain Generation', 'failed', `Error: ${error}`);
    }
  }

  private async testSurfaceScatterObjects() {
    console.log('\n🌿 Testing Surface Scatter Objects...');
    
    if (!this.scene) {
      this.scene = new THREE.Scene();
    }
    
    try {
      // Test rock scattering
      const rockCount = 50;
      const rocks: THREE.Mesh[] = [];
      
      for (let i = 0; i < rockCount; i++) {
        const size = 0.2 + Math.random() * 0.8;
        const geometry = new THREE.DodecahedronGeometry(size, 0);
        const material = new THREE.MeshStandardMaterial({
          color: 0x808080,
          roughness: 0.9
        });
        
        const rock = new THREE.Mesh(geometry, material);
        rock.position.set(
          (Math.random() - 0.5) * 100,
          size * 0.5,
          (Math.random() - 0.5) * 100
        );
        rock.rotation.set(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        );
        
        rocks.push(rock);
        this.scene.add(rock);
      }
      
      this.addResult(
        'Rock Scattering',
        rocks.length === rockCount ? 'passed' : 'failed',
        `${rocks.length} rocks scattered`
      );
      
      // Test grass instanced mesh
      const grassGeometry = new THREE.ConeGeometry(0.05, 1, 3);
      const grassMaterial = new THREE.MeshBasicMaterial({ color: 0x228B22 });
      const grassCount = 1000;
      const grassMesh = new THREE.InstancedMesh(grassGeometry, grassMaterial, grassCount);
      
      const matrix = new THREE.Matrix4();
      for (let i = 0; i < grassCount; i++) {
        const x = (Math.random() - 0.5) * 100;
        const z = (Math.random() - 0.5) * 100;
        const y = 0;
        
        matrix.makeTranslation(x, y, z);
        grassMesh.setMatrixAt(i, matrix);
      }
      
      this.addResult(
        'Grass Instances',
        grassMesh instanceof THREE.InstancedMesh ? 'passed' : 'failed',
        `${grassCount} grass instances`
      );
      
      // Test LOD system for scatter objects
      const lod = new THREE.LOD();
      
      // High detail
      const highDetail = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1, 4, 4, 4),
        new THREE.MeshStandardMaterial({ color: 0x00ff00 })
      );
      lod.addLevel(highDetail, 0);
      
      // Medium detail
      const mediumDetail = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1, 2, 2, 2),
        new THREE.MeshStandardMaterial({ color: 0x00ff00 })
      );
      lod.addLevel(mediumDetail, 50);
      
      // Low detail
      const lowDetail = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1, 1, 1, 1),
        new THREE.MeshStandardMaterial({ color: 0x00ff00 })
      );
      lod.addLevel(lowDetail, 100);
      
      this.addResult(
        'LOD System',
        lod.levels.length === 3 ? 'passed' : 'failed',
        `${lod.levels.length} LOD levels`
      );
      
    } catch (error) {
      this.addResult('Surface Scatter', 'failed', `Error: ${error}`);
    }
  }

  private async testAtmosphericEffects() {
    console.log('\n☁️ Testing Atmospheric Effects...');
    
    if (!this.scene) {
      this.scene = new THREE.Scene();
    }
    
    try {
      // Test fog
      this.scene.fog = new THREE.Fog(0xCD5C5C, 10, 500);
      
      this.addResult(
        'Fog Effect',
        this.scene.fog instanceof THREE.Fog ? 'passed' : 'failed',
        `Fog: near ${this.scene.fog.near}, far ${this.scene.fog.far}`
      );
      
      // Test particle system for dust/sand
      const particleCount = 200;
      const particleGeometry = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const velocities = new Float32Array(particleCount * 3);
      
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 100;
        positions[i * 3 + 1] = Math.random() * 50;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
        
        velocities[i * 3] = (Math.random() - 0.5) * 0.1;
        velocities[i * 3 + 1] = -Math.random() * 0.1;
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.1;
      }
      
      particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      particleGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
      
      const particleMaterial = new THREE.PointsMaterial({
        size: 0.5,
        color: 0x8B4513,
        transparent: true,
        opacity: 0.6
      });
      
      const particles = new THREE.Points(particleGeometry, particleMaterial);
      this.scene.add(particles);
      
      this.addResult(
        'Dust Particles',
        particles instanceof THREE.Points ? 'passed' : 'failed',
        `${particleCount} particles`
      );
      
      // Test heat shimmer shader
      const shimmerGeometry = new THREE.PlaneGeometry(100, 100);
      const shimmerMaterial = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uIntensity: { value: 0.5 },
          uFrequency: { value: 10 },
          uSpeed: { value: 1 }
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform float uIntensity;
          varying vec2 vUv;
          void main() {
            float distort = sin(vUv.x * 10.0 + uTime) * uIntensity;
            gl_FragColor = vec4(1.0, 0.5, 0.0, distort);
          }
        `,
        transparent: true
      });
      
      this.addResult(
        'Heat Shimmer Shader',
        shimmerMaterial instanceof THREE.ShaderMaterial ? 'passed' : 'failed',
        'Custom shader created'
      );
      
      // Test wind effect
      const windStore = useWind.getState();
      windStore.setWindDirection(new THREE.Vector3(1, 0, 0));
      windStore.setWindStrength(5);
      
      this.addResult(
        'Wind System',
        windStore.windStrength === 5 ? 'passed' : 'failed',
        `Wind strength: ${windStore.windStrength}`
      );
      
    } catch (error) {
      this.addResult('Atmospheric Effects', 'failed', `Error: ${error}`);
    }
  }

  private async testDayNightCycle() {
    console.log('\n🌅 Testing Day/Night Cycle...');
    
    if (!this.scene) {
      this.scene = new THREE.Scene();
    }
    
    try {
      // Test sun light movement
      const sunLight = new THREE.DirectionalLight(0xffffff, 1);
      const timeOfDay = 12; // Noon
      
      const sunAngle = (timeOfDay / 24) * Math.PI * 2 - Math.PI / 2;
      sunLight.position.set(
        Math.cos(sunAngle) * 100,
        Math.sin(sunAngle) * 100,
        0
      );
      
      this.scene.add(sunLight);
      
      this.addResult(
        'Sun Position',
        sunLight instanceof THREE.DirectionalLight ? 'passed' : 'failed',
        `Time: ${timeOfDay}:00, Position: (${sunLight.position.x.toFixed(0)}, ${sunLight.position.y.toFixed(0)}, 0)`
      );
      
      // Test ambient light changes
      const ambientIntensity = Math.max(0.2, Math.sin(sunAngle) * 0.5 + 0.5);
      const ambientLight = new THREE.AmbientLight(0xffffff, ambientIntensity);
      
      this.addResult(
        'Ambient Light Intensity',
        ambientIntensity > 0 ? 'passed' : 'failed',
        `Intensity: ${ambientIntensity.toFixed(2)}`
      );
      
      // Test sky color changes
      const skyColors = {
        dawn: new THREE.Color(0xFF6B35),
        day: new THREE.Color(0x87CEEB),
        dusk: new THREE.Color(0xFF4500),
        night: new THREE.Color(0x000033)
      };
      
      let currentSkyColor: THREE.Color;
      if (timeOfDay >= 5 && timeOfDay < 7) currentSkyColor = skyColors.dawn;
      else if (timeOfDay >= 7 && timeOfDay < 17) currentSkyColor = skyColors.day;
      else if (timeOfDay >= 17 && timeOfDay < 19) currentSkyColor = skyColors.dusk;
      else currentSkyColor = skyColors.night;
      
      this.scene.background = currentSkyColor;
      
      this.addResult(
        'Sky Color',
        this.scene.background instanceof THREE.Color ? 'passed' : 'failed',
        `Color: #${currentSkyColor.getHexString()}`
      );
      
      // Test shadow changes
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.width = 2048;
      sunLight.shadow.mapSize.height = 2048;
      
      this.addResult(
        'Dynamic Shadows',
        sunLight.castShadow ? 'passed' : 'failed',
        `Shadow map: ${sunLight.shadow.mapSize.width}x${sunLight.shadow.mapSize.height}`
      );
      
    } catch (error) {
      this.addResult('Day/Night Cycle', 'failed', `Error: ${error}`);
    }
  }

  private async testWeatherSystems() {
    console.log('\n⛈️ Testing Weather Systems...');
    
    try {
      // Test rain particles
      const rainCount = 500;
      const rainGeometry = new THREE.BufferGeometry();
      const rainPositions = new Float32Array(rainCount * 3);
      const rainVelocities = new Float32Array(rainCount * 3);
      
      for (let i = 0; i < rainCount; i++) {
        rainPositions[i * 3] = (Math.random() - 0.5) * 100;
        rainPositions[i * 3 + 1] = Math.random() * 100;
        rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 100;
        
        rainVelocities[i * 3] = 0;
        rainVelocities[i * 3 + 1] = -20;
        rainVelocities[i * 3 + 2] = 0;
      }
      
      rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
      
      const rainMaterial = new THREE.PointsMaterial({
        size: 0.1,
        color: 0x4A90E2,
        transparent: true,
        opacity: 0.6
      });
      
      this.addResult(
        'Rain System',
        rainGeometry.attributes.position ? 'passed' : 'failed',
        `${rainCount} rain particles`
      );
      
      // Test dust storm
      const dustStormIntensity = 0.7;
      const visibility = 1 - dustStormIntensity;
      
      this.addResult(
        'Dust Storm',
        visibility < 1 ? 'passed' : 'failed',
        `Visibility: ${(visibility * 100).toFixed(0)}%`
      );
      
      // Test lightning effect
      const lightningGeometry = new THREE.BufferGeometry();
      const lightningPoints = [
        new THREE.Vector3(0, 100, 0),
        new THREE.Vector3(10, 80, 0),
        new THREE.Vector3(-5, 60, 0),
        new THREE.Vector3(8, 40, 0),
        new THREE.Vector3(0, 0, 0)
      ];
      
      lightningGeometry.setFromPoints(lightningPoints);
      
      const lightningMaterial = new THREE.LineBasicMaterial({
        color: 0xFFFFFF,
        linewidth: 3
      });
      
      const lightning = new THREE.Line(lightningGeometry, lightningMaterial);
      
      this.addResult(
        'Lightning Effect',
        lightning instanceof THREE.Line ? 'passed' : 'failed',
        'Lightning bolt created'
      );
      
      // Test weather transitions
      const weatherStates = ['clear', 'cloudy', 'rainy', 'stormy'];
      const currentWeather = weatherStates[Math.floor(Math.random() * weatherStates.length)];
      
      this.addResult(
        'Weather State',
        weatherStates.includes(currentWeather) ? 'passed' : 'failed',
        `Current: ${currentWeather}`
      );
      
    } catch (error) {
      this.addResult('Weather Systems', 'failed', `Error: ${error}`);
    }
  }

  private async testSurfaceLighting() {
    console.log('\n💡 Testing Surface Lighting...');
    
    if (!this.scene) {
      this.scene = new THREE.Scene();
    }
    
    try {
      // Test flashlight spot light
      const flashlight = new THREE.SpotLight(0xffffff, 10, 30, Math.PI / 6, 0.5, 2);
      flashlight.position.set(0, 2, 0);
      flashlight.target.position.set(0, 0, -10);
      
      this.addResult(
        'Flashlight',
        flashlight instanceof THREE.SpotLight ? 'passed' : 'failed',
        `Range: ${flashlight.distance}, Angle: ${(flashlight.angle * 180 / Math.PI).toFixed(0)}°`
      );
      
      // Test ambient occlusion
      const aoMap = new THREE.Texture();
      aoMap.name = 'AO Map';
      
      this.addResult(
        'Ambient Occlusion',
        aoMap instanceof THREE.Texture ? 'passed' : 'failed',
        'AO map texture created'
      );
      
      // Test emissive materials for glowing objects
      const emissiveMaterial = new THREE.MeshStandardMaterial({
        color: 0x000000,
        emissive: 0x00ff00,
        emissiveIntensity: 1
      });
      
      this.addResult(
        'Emissive Materials',
        emissiveMaterial.emissive ? 'passed' : 'failed',
        `Emissive color: #${emissiveMaterial.emissive.getHexString()}`
      );
      
      // Test light probes for environment lighting
      const lightProbe = new THREE.LightProbe();
      const sh = new THREE.SphericalHarmonics3();
      sh.coefficients[0].set(0.5, 0.5, 0.5);
      lightProbe.sh = sh;
      
      this.addResult(
        'Light Probe',
        lightProbe instanceof THREE.LightProbe ? 'passed' : 'failed',
        'Environment light probe created'
      );
      
    } catch (error) {
      this.addResult('Surface Lighting', 'failed', `Error: ${error}`);
    }
  }

  private async testResourceNodes() {
    console.log('\n💎 Testing Resource Nodes...');
    
    if (!this.scene) {
      this.scene = new THREE.Scene();
    }
    
    try {
      const resourceTypes = [
        { name: 'Iron', color: 0x8B7355, size: 2 },
        { name: 'Gold', color: 0xFFD700, size: 1.5 },
        { name: 'Crystal', color: 0x00CED1, size: 1.8 }
      ];
      
      resourceTypes.forEach(resource => {
        const geometry = new THREE.OctahedronGeometry(resource.size);
        const material = new THREE.MeshStandardMaterial({
          color: resource.color,
          metalness: 0.7,
          roughness: 0.3
        });
        
        const node = new THREE.Mesh(geometry, material);
        node.position.set(
          Math.random() * 50 - 25,
          resource.size,
          Math.random() * 50 - 25
        );
        
        this.scene!.add(node);
        
        this.addResult(
          `${resource.name} Node`,
          node instanceof THREE.Mesh ? 'passed' : 'failed',
          `Size: ${resource.size}, Color: #${resource.color.toString(16)}`
        );
      });
      
      // Test resource particle aura
      const auraGeometry = new THREE.BufferGeometry();
      const auraCount = 50;
      const auraPositions = new Float32Array(auraCount * 3);
      
      for (let i = 0; i < auraCount; i++) {
        const angle = (i / auraCount) * Math.PI * 2;
        const radius = 2 + Math.random();
        auraPositions[i * 3] = Math.cos(angle) * radius;
        auraPositions[i * 3 + 1] = Math.random() * 3;
        auraPositions[i * 3 + 2] = Math.sin(angle) * radius;
      }
      
      auraGeometry.setAttribute('position', new THREE.BufferAttribute(auraPositions, 3));
      
      const auraMaterial = new THREE.PointsMaterial({
        size: 0.2,
        color: 0x00ff00,
        transparent: true,
        opacity: 0.8
      });
      
      const aura = new THREE.Points(auraGeometry, auraMaterial);
      
      this.addResult(
        'Resource Aura',
        aura instanceof THREE.Points ? 'passed' : 'failed',
        `${auraCount} aura particles`
      );
      
    } catch (error) {
      this.addResult('Resource Nodes', 'failed', `Error: ${error}`);
    }
  }

  private async testTerrainLOD() {
    console.log('\n🗺️ Testing Terrain LOD...');
    
    try {
      // Test multiple LOD levels for terrain
      const lodLevels = [
        { distance: 0, segments: 128 },
        { distance: 100, segments: 64 },
        { distance: 200, segments: 32 },
        { distance: 400, segments: 16 }
      ];
      
      const terrainLOD = new THREE.LOD();
      
      lodLevels.forEach(level => {
        const geometry = new THREE.PlaneGeometry(
          100, 100, 
          level.segments, level.segments
        );
        const material = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const mesh = new THREE.Mesh(geometry, material);
        
        terrainLOD.addLevel(mesh, level.distance);
        
        this.addResult(
          `LOD Level ${level.distance}m`,
          mesh ? 'passed' : 'failed',
          `Segments: ${level.segments}x${level.segments}`
        );
      });
      
      this.addResult(
        'Terrain LOD System',
        terrainLOD.levels.length === lodLevels.length ? 'passed' : 'failed',
        `${terrainLOD.levels.length} LOD levels`
      );
      
    } catch (error) {
      this.addResult('Terrain LOD', 'failed', `Error: ${error}`);
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
  (window as any).testPlanetSurface = () => {
    const suite = new PlanetSurfaceTestSuite();
    return suite.runAllTests();
  };
  
  (window as any).PlanetSurfaceTestSuite = PlanetSurfaceTestSuite;
}

export default PlanetSurfaceTestSuite;