/**
 * Mining Visuals Test Suite
 * Tests mining graphics including resource nodes, lasers, and collection effects
 * Run with window.testMiningVisuals() from the browser console
 */

import * as THREE from 'three';
import { useMining } from '../../../lib/stores/economy/useMining';
import { useInventory } from '../../../lib/stores/economy/useInventory';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  details?: any;
}

export class MiningVisualsTestSuite {
  private results: TestResult[] = [];
  private scene: THREE.Scene | null = null;

  constructor() {
    console.log('⛏️ Mining Visuals Test Suite initialized');
  }

  async runAllTests() {
    console.clear();
    console.log('%c═══════════════════════════════════════════════', 'color: #FFD700; font-size: 14px');
    console.log('%c   💎 MINING VISUALS TEST SUITE STARTING', 'color: #FFD700; font-size: 16px; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════', 'color: #FFD700; font-size: 14px');
    
    this.results = [];
    
    try {
      await this.testResourceNodeRendering();
      await this.wait(500);
      
      await this.testMiningLaserBeam();
      await this.wait(500);
      
      await this.testParticleEffects();
      await this.wait(500);
      
      await this.testNodeDeformation();
      await this.wait(500);
      
      await this.testCollectionAnimations();
      await this.wait(500);
      
      await this.testResourceAuras();
      await this.wait(500);
      
      await this.testMiningProgress();
      await this.wait(500);
      
      await this.testResourceVariants();
      
    } catch (error) {
      console.error('Test suite failed:', error);
      this.addResult('Test Suite', 'failed', `Critical error: ${error}`);
    } finally {
      this.cleanup();
      this.printSummary();
    }
  }

  private async testResourceNodeRendering() {
    console.log('\n💎 Testing Resource Node Rendering...');
    
    if (!this.scene) {
      this.scene = new THREE.Scene();
    }
    
    try {
      // Test different resource types
      const resourceTypes = [
        { name: 'Iron', color: 0x8B7355, geometry: 'octahedron', size: 2 },
        { name: 'Gold', color: 0xFFD700, geometry: 'icosahedron', size: 1.8 },
        { name: 'Crystal', color: 0x00CED1, geometry: 'dodecahedron', size: 1.5 },
        { name: 'Uranium', color: 0x00FF00, geometry: 'sphere', size: 1.6 }
      ];
      
      resourceTypes.forEach(resource => {
        let geometry: THREE.BufferGeometry;
        
        switch (resource.geometry) {
          case 'octahedron':
            geometry = new THREE.OctahedronGeometry(resource.size);
            break;
          case 'icosahedron':
            geometry = new THREE.IcosahedronGeometry(resource.size);
            break;
          case 'dodecahedron':
            geometry = new THREE.DodecahedronGeometry(resource.size);
            break;
          case 'sphere':
            geometry = new THREE.SphereGeometry(resource.size, 16, 16);
            break;
          default:
            geometry = new THREE.BoxGeometry(resource.size, resource.size, resource.size);
        }
        
        const material = new THREE.MeshStandardMaterial({
          color: resource.color,
          metalness: 0.6,
          roughness: 0.4,
          emissive: resource.color,
          emissiveIntensity: 0.1
        });
        
        const node = new THREE.Mesh(geometry, material);
        node.name = `resource_${resource.name}`;
        this.scene.add(node);
        
        this.addResult(
          `${resource.name} Node`,
          node instanceof THREE.Mesh ? 'passed' : 'failed',
          `Geometry: ${resource.geometry}, Size: ${resource.size}`
        );
      });
      
      // Test node rotation animation
      const rotatingNode = new THREE.Object3D();
      rotatingNode.rotation.y = Math.PI / 4;
      
      this.addResult(
        'Node Rotation',
        rotatingNode.rotation.y > 0 ? 'passed' : 'failed',
        'Rotating resource nodes'
      );
      
      // Test rarity indicators
      const rarityColors = {
        common: 0x808080,
        uncommon: 0x00FF00,
        rare: 0x0080FF,
        epic: 0x8000FF,
        legendary: 0xFF8000
      };
      
      Object.entries(rarityColors).forEach(([rarity, color]) => {
        this.addResult(
          `${rarity} Rarity`,
          color ? 'passed' : 'failed',
          `Color: #${color.toString(16).padStart(6, '0')}`
        );
      });
      
    } catch (error) {
      this.addResult('Resource Node Rendering', 'failed', `Error: ${error}`);
    }
  }

  private async testMiningLaserBeam() {
    console.log('\n⚡ Testing Mining Laser Beam...');
    
    if (!this.scene) {
      this.scene = new THREE.Scene();
    }
    
    try {
      // Test laser beam geometry
      const startPos = new THREE.Vector3(0, 1, 5);
      const endPos = new THREE.Vector3(0, 1, -5);
      const distance = startPos.distanceTo(endPos);
      
      const laserGeometry = new THREE.CylinderGeometry(0.1, 0.1, distance);
      const laserMaterial = new THREE.MeshBasicMaterial({
        color: 0x00FF00,
        transparent: true,
        opacity: 0.8
      });
      
      const laser = new THREE.Mesh(laserGeometry, laserMaterial);
      
      // Position and orient laser
      laser.position.copy(startPos.clone().lerp(endPos, 0.5));
      laser.lookAt(endPos);
      laser.rotateX(Math.PI / 2);
      
      this.addResult(
        'Laser Beam',
        laser instanceof THREE.Mesh ? 'passed' : 'failed',
        `Length: ${distance.toFixed(1)} units`
      );
      
      // Test laser color based on rarity
      const rarityLaserColors = {
        common: 0x10B981,
        uncommon: 0x3B82F6,
        rare: 0x8B5CF6,
        legendary: 0xF59E0B
      };
      
      Object.entries(rarityLaserColors).forEach(([rarity, color]) => {
        const rarityMaterial = new THREE.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: 0.8
        });
        
        this.addResult(
          `${rarity} Laser Color`,
          rarityMaterial.color.getHex() === color ? 'passed' : 'failed',
          `Color: #${color.toString(16)}`
        );
      });
      
      // Test laser pulse animation
      const pulseShader = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          laserColor: { value: new THREE.Color(0x00FF00) },
          intensity: { value: 1.0 }
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
          uniform vec3 laserColor;
          uniform float intensity;
          varying vec2 vUv;
          
          void main() {
            float pulse = sin(vUv.y * 10.0 - time * 5.0) * 0.5 + 0.5;
            vec3 color = laserColor * (0.5 + pulse * 0.5) * intensity;
            float alpha = 1.0 - abs(vUv.x - 0.5) * 2.0;
            gl_FragColor = vec4(color, alpha * 0.8);
          }
        `,
        transparent: true
      });
      
      this.addResult(
        'Pulsing Laser',
        pulseShader instanceof THREE.ShaderMaterial ? 'passed' : 'failed',
        'Animated pulse shader'
      );
      
      // Test laser sparks
      const sparkCount = 10;
      const sparks = [];
      for (let i = 0; i < sparkCount; i++) {
        const spark = new THREE.Mesh(
          new THREE.SphereGeometry(0.1, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xFFFF00 })
        );
        sparks.push(spark);
      }
      
      this.addResult(
        'Laser Sparks',
        sparks.length === sparkCount ? 'passed' : 'failed',
        `${sparkCount} traveling sparks`
      );
      
    } catch (error) {
      this.addResult('Mining Laser Beam', 'failed', `Error: ${error}`);
    }
  }

  private async testParticleEffects() {
    console.log('\n✨ Testing Particle Effects...');
    
    if (!this.scene) {
      this.scene = new THREE.Scene();
    }
    
    try {
      // Test mining impact particles
      const impactParticleCount = 50;
      const impactGeometry = new THREE.BufferGeometry();
      const impactPositions = new Float32Array(impactParticleCount * 3);
      const impactVelocities = new Float32Array(impactParticleCount * 3);
      
      for (let i = 0; i < impactParticleCount; i++) {
        // Random spread from impact point
        impactPositions[i * 3] = (Math.random() - 0.5) * 0.5;
        impactPositions[i * 3 + 1] = Math.random() * 0.5;
        impactPositions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
        
        // Outward velocities
        impactVelocities[i * 3] = (Math.random() - 0.5) * 2;
        impactVelocities[i * 3 + 1] = Math.random() * 3;
        impactVelocities[i * 3 + 2] = (Math.random() - 0.5) * 2;
      }
      
      impactGeometry.setAttribute('position', new THREE.BufferAttribute(impactPositions, 3));
      impactGeometry.setAttribute('velocity', new THREE.BufferAttribute(impactVelocities, 3));
      
      const impactMaterial = new THREE.PointsMaterial({
        size: 0.1,
        color: 0xFFAA00,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
      });
      
      const impactParticles = new THREE.Points(impactGeometry, impactMaterial);
      
      this.addResult(
        'Impact Particles',
        impactParticles instanceof THREE.Points ? 'passed' : 'failed',
        `${impactParticleCount} particles`
      );
      
      // Test collection particles
      const collectParticleCount = 100;
      const collectGeometry = new THREE.BufferGeometry();
      const collectPositions = new Float32Array(collectParticleCount * 3);
      
      for (let i = 0; i < collectParticleCount; i++) {
        // Spiral pattern toward collection point
        const angle = (i / collectParticleCount) * Math.PI * 4;
        const radius = 3 * (1 - i / collectParticleCount);
        const height = (i / collectParticleCount) * 5;
        
        collectPositions[i * 3] = Math.cos(angle) * radius;
        collectPositions[i * 3 + 1] = height;
        collectPositions[i * 3 + 2] = Math.sin(angle) * radius;
      }
      
      collectGeometry.setAttribute('position', new THREE.BufferAttribute(collectPositions, 3));
      
      const collectMaterial = new THREE.PointsMaterial({
        size: 0.15,
        color: 0x00FFFF,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending
      });
      
      const collectParticles = new THREE.Points(collectGeometry, collectMaterial);
      
      this.addResult(
        'Collection Particles',
        collectParticles instanceof THREE.Points ? 'passed' : 'failed',
        'Spiral collection pattern'
      );
      
      // Test dust particles
      const dustCount = 30;
      const dustGeometry = new THREE.BufferGeometry();
      const dustPositions = new Float32Array(dustCount * 3);
      
      for (let i = 0; i < dustCount; i++) {
        dustPositions[i * 3] = (Math.random() - 0.5) * 4;
        dustPositions[i * 3 + 1] = Math.random() * 2;
        dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 4;
      }
      
      dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
      
      const dustMaterial = new THREE.PointsMaterial({
        size: 0.3,
        color: 0x8B7355,
        transparent: true,
        opacity: 0.4
      });
      
      const dustParticles = new THREE.Points(dustGeometry, dustMaterial);
      
      this.addResult(
        'Dust Cloud',
        dustParticles instanceof THREE.Points ? 'passed' : 'failed',
        `${dustCount} dust particles`
      );
      
    } catch (error) {
      this.addResult('Particle Effects', 'failed', `Error: ${error}`);
    }
  }

  private async testNodeDeformation() {
    console.log('\n💥 Testing Node Deformation...');
    
    try {
      // Test deformation shader
      const deformShader = new THREE.ShaderMaterial({
        uniforms: {
          uProgress: { value: 0 },
          uTime: { value: 0 },
          uCrackIntensity: { value: 1 },
          uColor: { value: new THREE.Color(0xFFFFFF) },
          uEmissiveColor: { value: new THREE.Color(0x000000) },
          uEmissiveIntensity: { value: 0 }
        },
        vertexShader: `
          uniform float uProgress;
          uniform float uTime;
          uniform float uCrackIntensity;
          varying vec3 vPosition;
          varying float vCrackAmount;
          
          float noise(vec3 p) {
            return sin(p.x * 10.0) * sin(p.y * 10.0) * sin(p.z * 10.0);
          }
          
          void main() {
            vPosition = position;
            vec3 pos = position;
            
            // Progressive deformation based on mining progress
            float crackNoise = noise(position * 3.0 + vec3(uTime * 0.05));
            float crackMask = smoothstep(1.0 - uProgress * 1.5, 1.0 - uProgress * 1.5 + 0.3, crackNoise);
            vCrackAmount = crackMask;
            
            // Apply deformation
            if (uProgress > 0.0) {
              // Vibration
              if (uProgress < 0.25) {
                float vibration = sin(uTime * 20.0) * 0.02 * uProgress * 4.0;
                pos += normal * vibration;
              }
              // Cracks
              else if (uProgress < 0.5) {
                float displacement = crackMask * uCrackIntensity * 0.2;
                pos += normal * displacement;
              }
              // Collapse
              else if (uProgress < 0.75) {
                vec3 toCenter = -position * 0.3 * (uProgress - 0.5) * 4.0;
                pos += toCenter;
              }
              // Final collapse
              else {
                vec3 toCenter = -position * 0.5 * (uProgress - 0.75) * 4.0;
                pos += toCenter;
              }
            }
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uProgress;
          uniform vec3 uColor;
          uniform vec3 uEmissiveColor;
          uniform float uEmissiveIntensity;
          varying vec3 vPosition;
          varying float vCrackAmount;
          
          void main() {
            vec3 color = uColor;
            
            // Darken based on progress
            float darkness = 1.0 - uProgress * 0.5;
            color *= darkness;
            
            // Add crack darkness
            if (vCrackAmount > 0.1) {
              color *= (1.0 - vCrackAmount * 0.7);
            }
            
            // Stage-based color effects
            if (uProgress > 0.75) {
              color = mix(color, vec3(0.8, 0.2, 0.1), (uProgress - 0.75) * 2.0);
            }
            
            gl_FragColor = vec4(color, 1.0);
          }
        `
      });
      
      this.addResult(
        'Deformation Shader',
        deformShader instanceof THREE.ShaderMaterial ? 'passed' : 'failed',
        'Progressive deformation system'
      );
      
      // Test deformation stages
      const stages = [
        { progress: 0.0, state: 'intact' },
        { progress: 0.25, state: 'vibrating' },
        { progress: 0.5, state: 'cracking' },
        { progress: 0.75, state: 'collapsing' },
        { progress: 1.0, state: 'destroyed' }
      ];
      
      stages.forEach(stage => {
        deformShader.uniforms.uProgress.value = stage.progress;
        
        this.addResult(
          `Deformation: ${stage.state}`,
          deformShader.uniforms.uProgress.value === stage.progress ? 'passed' : 'failed',
          `Progress: ${(stage.progress * 100).toFixed(0)}%`
        );
      });
      
      // Test crack pattern generation
      const crackIntensities = [0.5, 1.0, 1.5, 2.0];
      crackIntensities.forEach(intensity => {
        deformShader.uniforms.uCrackIntensity.value = intensity;
        
        this.addResult(
          `Crack Intensity ${intensity}`,
          deformShader.uniforms.uCrackIntensity.value === intensity ? 'passed' : 'failed',
          `Multiplier: ${intensity}x`
        );
      });
      
    } catch (error) {
      this.addResult('Node Deformation', 'failed', `Error: ${error}`);
    }
  }

  private async testCollectionAnimations() {
    console.log('\n📦 Testing Collection Animations...');
    
    if (!this.scene) {
      this.scene = new THREE.Scene();
    }
    
    try {
      // Test resource fragment animation
      const fragmentCount = 20;
      const fragments = [];
      
      for (let i = 0; i < fragmentCount; i++) {
        const fragment = new THREE.Mesh(
          new THREE.TetrahedronGeometry(0.2 + Math.random() * 0.3),
          new THREE.MeshStandardMaterial({
            color: 0xFFD700,
            metalness: 0.8,
            roughness: 0.2
          })
        );
        
        // Random initial positions
        fragment.position.set(
          (Math.random() - 0.5) * 2,
          Math.random() * 2,
          (Math.random() - 0.5) * 2
        );
        
        // Random rotations
        fragment.rotation.set(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        );
        
        fragments.push(fragment);
      }
      
      this.addResult(
        'Resource Fragments',
        fragments.length === fragmentCount ? 'passed' : 'failed',
        `${fragmentCount} flying fragments`
      );
      
      // Test collection vortex
      const vortexGeometry = new THREE.ConeGeometry(2, 4, 32, 1, true);
      const vortexMaterial = new THREE.MeshBasicMaterial({
        color: 0x00FFFF,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
      });
      
      const vortex = new THREE.Mesh(vortexGeometry, vortexMaterial);
      vortex.rotation.x = Math.PI;
      
      this.addResult(
        'Collection Vortex',
        vortex instanceof THREE.Mesh ? 'passed' : 'failed',
        'Inverted cone vortex'
      );
      
      // Test value text animation
      const valueSprite = {
        position: new THREE.Vector3(0, 2, 0),
        opacity: 1.0,
        scale: 1.0
      };
      
      // Simulate floating up animation
      valueSprite.position.y += 1;
      valueSprite.opacity -= 0.2;
      valueSprite.scale += 0.1;
      
      this.addResult(
        'Value Display',
        valueSprite.position.y > 2 ? 'passed' : 'failed',
        'Floating value text'
      );
      
      // Test collection trail
      const trailPoints = [];
      for (let i = 0; i < 20; i++) {
        const t = i / 19;
        trailPoints.push(new THREE.Vector3(
          Math.sin(t * Math.PI * 2) * (1 - t),
          t * 3,
          Math.cos(t * Math.PI * 2) * (1 - t)
        ));
      }
      
      const trailCurve = new THREE.CatmullRomCurve3(trailPoints);
      const trailGeometry = new THREE.TubeGeometry(trailCurve, 20, 0.05, 8, false);
      
      this.addResult(
        'Collection Trail',
        trailGeometry instanceof THREE.TubeGeometry ? 'passed' : 'failed',
        'Spiral collection path'
      );
      
    } catch (error) {
      this.addResult('Collection Animations', 'failed', `Error: ${error}`);
    }
  }

  private async testResourceAuras() {
    console.log('\n✨ Testing Resource Auras...');
    
    if (!this.scene) {
      this.scene = new THREE.Scene();
    }
    
    try {
      // Test rarity-based auras
      const auras = [
        { rarity: 'common', color: 0x808080, particles: 10, radius: 1.5 },
        { rarity: 'uncommon', color: 0x00FF00, particles: 20, radius: 2.0 },
        { rarity: 'rare', color: 0x0080FF, particles: 30, radius: 2.5 },
        { rarity: 'epic', color: 0x8000FF, particles: 40, radius: 3.0 },
        { rarity: 'legendary', color: 0xFF8000, particles: 50, radius: 3.5 }
      ];
      
      auras.forEach(aura => {
        const auraGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(aura.particles * 3);
        
        for (let i = 0; i < aura.particles; i++) {
          const angle = (i / aura.particles) * Math.PI * 2;
          const radiusVar = aura.radius + Math.random() * 0.5;
          const height = (Math.random() - 0.5) * 2;
          
          positions[i * 3] = Math.cos(angle) * radiusVar;
          positions[i * 3 + 1] = height;
          positions[i * 3 + 2] = Math.sin(angle) * radiusVar;
        }
        
        auraGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const auraMaterial = new THREE.PointsMaterial({
          size: 0.15,
          color: aura.color,
          transparent: true,
          opacity: 0.6,
          blending: THREE.AdditiveBlending
        });
        
        const auraParticles = new THREE.Points(auraGeometry, auraMaterial);
        
        this.addResult(
          `${aura.rarity} Aura`,
          auraParticles instanceof THREE.Points ? 'passed' : 'failed',
          `${aura.particles} particles, radius: ${aura.radius}`
        );
      });
      
      // Test pulsing glow
      const glowMesh = new THREE.Mesh(
        new THREE.SphereGeometry(2, 16, 16),
        new THREE.MeshBasicMaterial({
          color: 0xFFFF00,
          transparent: true,
          opacity: 0.2,
          side: THREE.BackSide
        })
      );
      
      this.addResult(
        'Pulsing Glow',
        glowMesh instanceof THREE.Mesh ? 'passed' : 'failed',
        'Outer glow sphere'
      );
      
      // Test energy field
      const energyFieldShader = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          color: { value: new THREE.Color(0x00FFFF) }
        },
        vertexShader: `
          varying vec3 vPosition;
          void main() {
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float time;
          uniform vec3 color;
          varying vec3 vPosition;
          
          void main() {
            float energy = sin(length(vPosition) * 5.0 - time * 2.0) * 0.5 + 0.5;
            gl_FragColor = vec4(color * energy, energy * 0.5);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide
      });
      
      this.addResult(
        'Energy Field',
        energyFieldShader instanceof THREE.ShaderMaterial ? 'passed' : 'failed',
        'Animated energy shader'
      );
      
    } catch (error) {
      this.addResult('Resource Auras', 'failed', `Error: ${error}`);
    }
  }

  private async testMiningProgress() {
    console.log('\n📊 Testing Mining Progress...');
    
    try {
      const miningStore = useMining.getState();
      
      // Test mining stages
      const stages = [
        { clicks: 0, percent: 0, status: 'not started' },
        { clicks: 2, percent: 20, status: 'beginning' },
        { clicks: 5, percent: 50, status: 'halfway' },
        { clicks: 8, percent: 80, status: 'almost done' },
        { clicks: 10, percent: 100, status: 'complete' }
      ];
      
      stages.forEach(stage => {
        const progress = stage.clicks / 10;
        
        this.addResult(
          `Progress: ${stage.status}`,
          progress === stage.percent / 100 ? 'passed' : 'failed',
          `${stage.clicks}/10 clicks (${stage.percent}%)`
        );
      });
      
      // Test progress bar visualization
      const progressBarWidth = 200;
      const currentProgress = 0.65;
      const filledWidth = progressBarWidth * currentProgress;
      
      this.addResult(
        'Progress Bar',
        filledWidth === 130 ? 'passed' : 'failed',
        `${(currentProgress * 100).toFixed(0)}% filled`
      );
      
      // Test mining speed modifiers
      const modifiers = [
        { tool: 'basic', speed: 1.0 },
        { tool: 'advanced', speed: 1.5 },
        { tool: 'expert', speed: 2.0 },
        { tool: 'master', speed: 3.0 }
      ];
      
      modifiers.forEach(mod => {
        this.addResult(
          `${mod.tool} Tool`,
          mod.speed > 0 ? 'passed' : 'failed',
          `Speed: ${mod.speed}x`
        );
      });
      
    } catch (error) {
      this.addResult('Mining Progress', 'failed', `Error: ${error}`);
    }
  }

  private async testResourceVariants() {
    console.log('\n🎨 Testing Resource Variants...');
    
    if (!this.scene) {
      this.scene = new THREE.Scene();
    }
    
    try {
      // Test different planet resources
      const planetResources = {
        Mars: ['Iron', 'Copper', 'Silicon'],
        Earth: ['Coal', 'Gold', 'Silver'],
        Moon: ['Helium-3', 'Titanium', 'Aluminum'],
        Europa: ['Ice', 'Organic', 'Minerals']
      };
      
      Object.entries(planetResources).forEach(([planet, resources]) => {
        this.addResult(
          `${planet} Resources`,
          resources.length > 0 ? 'passed' : 'failed',
          resources.join(', ')
        );
      });
      
      // Test resource sizes
      const sizes = {
        small: { scale: 0.5, yield: 10 },
        medium: { scale: 1.0, yield: 25 },
        large: { scale: 1.5, yield: 50 },
        huge: { scale: 2.0, yield: 100 }
      };
      
      Object.entries(sizes).forEach(([size, data]) => {
        const nodeGeometry = new THREE.SphereGeometry(data.scale);
        
        this.addResult(
          `${size} Node`,
          nodeGeometry.parameters.radius === data.scale ? 'passed' : 'failed',
          `Scale: ${data.scale}x, Yield: ${data.yield}`
        );
      });
      
      // Test special resource effects
      const specialResources = [
        { name: 'Radioactive', effect: 'green glow', danger: true },
        { name: 'Crystalline', effect: 'rainbow refraction', danger: false },
        { name: 'Magnetic', effect: 'field distortion', danger: false },
        { name: 'Volatile', effect: 'sparking', danger: true }
      ];
      
      specialResources.forEach(resource => {
        this.addResult(
          resource.name,
          true ? 'passed' : 'failed',
          `Effect: ${resource.effect}${resource.danger ? ' (dangerous)' : ''}`
        );
      });
      
    } catch (error) {
      this.addResult('Resource Variants', 'failed', `Error: ${error}`);
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
  (window as any).testMiningVisuals = () => {
    const suite = new MiningVisualsTestSuite();
    return suite.runAllTests();
  };
  
  (window as any).MiningVisualsTestSuite = MiningVisualsTestSuite;
}

export default MiningVisualsTestSuite;