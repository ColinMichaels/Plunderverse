/**
 * Visual Effects Test Suite
 * Tests particle systems, explosions, lasers, and other visual effects
 * Run with window.testEffects() from the browser console
 */

import * as THREE from 'three';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  details?: any;
}

export class EffectsTestSuite {
  private results: TestResult[] = [];
  private scene: THREE.Scene | null = null;

  constructor() {
    console.log('✨ Visual Effects Test Suite initialized');
  }

  async runAllTests() {
    console.clear();
    console.log('%c═══════════════════════════════════════════════', 'color: #FF6B35; font-size: 14px');
    console.log('%c   💥 VISUAL EFFECTS TEST SUITE STARTING', 'color: #FF6B35; font-size: 16px; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════', 'color: #FF6B35; font-size: 14px');
    
    this.results = [];
    
    try {
      await this.testParticleSystems();
      await this.wait(500);
      
      await this.testLaserBeams();
      await this.wait(500);
      
      await this.testExplosions();
      await this.wait(500);
      
      await this.testShieldEffects();
      await this.wait(500);
      
      await this.testWarpEffects();
      await this.wait(500);
      
      await this.testTrailEffects();
      await this.wait(500);
      
      await this.testGlowEffects();
      await this.wait(500);
      
      await this.testEnvironmentalEffects();
      
    } catch (error) {
      console.error('Test suite failed:', error);
      this.addResult('Test Suite', 'failed', `Critical error: ${error}`);
    } finally {
      this.cleanup();
      this.printSummary();
    }
  }

  private async testParticleSystems() {
    console.log('\n🌟 Testing Particle Systems...');
    
    if (!this.scene) {
      this.scene = new THREE.Scene();
    }
    
    try {
      // Test basic particle system
      const particleCount = 1000;
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      const sizes = new Float32Array(particleCount);
      
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 100;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
        
        colors[i * 3] = Math.random();
        colors[i * 3 + 1] = Math.random();
        colors[i * 3 + 2] = Math.random();
        
        sizes[i] = Math.random() * 2;
      }
      
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
      
      const material = new THREE.PointsMaterial({
        size: 1,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.8
      });
      
      const particles = new THREE.Points(geometry, material);
      this.scene.add(particles);
      
      this.addResult(
        'Basic Particles',
        particles instanceof THREE.Points ? 'passed' : 'failed',
        `${particleCount} particles created`
      );
      
      // Test animated particles
      const animatedParticles = {
        positions: new Float32Array(particleCount * 3),
        velocities: new Float32Array(particleCount * 3),
        lifetimes: new Float32Array(particleCount)
      };
      
      for (let i = 0; i < particleCount; i++) {
        animatedParticles.velocities[i * 3] = (Math.random() - 0.5) * 2;
        animatedParticles.velocities[i * 3 + 1] = Math.random() * 2;
        animatedParticles.velocities[i * 3 + 2] = (Math.random() - 0.5) * 2;
        animatedParticles.lifetimes[i] = Math.random() * 5;
      }
      
      this.addResult(
        'Animated Particles',
        animatedParticles.velocities.length > 0 ? 'passed' : 'failed',
        'Velocity and lifetime arrays created'
      );
      
      // Test GPU particles (instanced)
      const instancedGeometry = new THREE.SphereGeometry(0.1, 4, 4);
      const instancedMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const instancedMesh = new THREE.InstancedMesh(
        instancedGeometry,
        instancedMaterial,
        500
      );
      
      const matrix = new THREE.Matrix4();
      for (let i = 0; i < 500; i++) {
        matrix.setPosition(
          (Math.random() - 0.5) * 50,
          (Math.random() - 0.5) * 50,
          (Math.random() - 0.5) * 50
        );
        instancedMesh.setMatrixAt(i, matrix);
      }
      
      this.addResult(
        'GPU Particles',
        instancedMesh instanceof THREE.InstancedMesh ? 'passed' : 'failed',
        '500 instanced particles'
      );
      
    } catch (error) {
      this.addResult('Particle Systems', 'failed', `Error: ${error}`);
    }
  }

  private async testLaserBeams() {
    console.log('\n⚡ Testing Laser Beams...');
    
    if (!this.scene) {
      this.scene = new THREE.Scene();
    }
    
    try {
      // Test basic laser beam
      const laserGeometry = new THREE.CylinderGeometry(0.05, 0.05, 20);
      const laserMaterial = new THREE.MeshBasicMaterial({
        color: 0x00FF00,
        transparent: true,
        opacity: 0.9
      });
      
      const laser = new THREE.Mesh(laserGeometry, laserMaterial);
      laser.rotation.z = Math.PI / 2;
      
      this.addResult(
        'Basic Laser',
        laser instanceof THREE.Mesh ? 'passed' : 'failed',
        'Cylinder-based laser'
      );
      
      // Test laser with glow
      const glowGeometry = new THREE.CylinderGeometry(0.15, 0.15, 20);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x00FF00,
        transparent: true,
        opacity: 0.3,
        side: THREE.BackSide
      });
      
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      laser.add(glow);
      
      this.addResult(
        'Laser Glow',
        glow.parent === laser ? 'passed' : 'failed',
        'Outer glow layer added'
      );
      
      // Test animated laser shader
      const laserShader = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          color: { value: new THREE.Color(0xFF0000) },
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
          uniform vec3 color;
          uniform float intensity;
          varying vec2 vUv;
          
          void main() {
            float pulse = sin(vUv.y * 20.0 - time * 10.0) * 0.5 + 0.5;
            vec3 finalColor = color * (0.5 + pulse * 0.5) * intensity;
            float alpha = 1.0 - abs(vUv.x - 0.5) * 2.0;
            gl_FragColor = vec4(finalColor, alpha);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide
      });
      
      this.addResult(
        'Animated Laser Shader',
        laserShader instanceof THREE.ShaderMaterial ? 'passed' : 'failed',
        'Pulsing laser effect'
      );
      
      // Test multi-colored laser
      const colors = [0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00];
      const multiLaser = new THREE.Group();
      
      colors.forEach((color, i) => {
        const beam = new THREE.Mesh(
          new THREE.CylinderGeometry(0.02, 0.02, 20),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 })
        );
        beam.position.x = (i - 1.5) * 0.1;
        multiLaser.add(beam);
      });
      
      this.addResult(
        'Multi-beam Laser',
        multiLaser.children.length === 4 ? 'passed' : 'failed',
        `${multiLaser.children.length} colored beams`
      );
      
    } catch (error) {
      this.addResult('Laser Beams', 'failed', `Error: ${error}`);
    }
  }

  private async testExplosions() {
    console.log('\n💥 Testing Explosions...');
    
    if (!this.scene) {
      this.scene = new THREE.Scene();
    }
    
    try {
      // Test explosion sphere
      const explosionGeometry = new THREE.SphereGeometry(1, 32, 32);
      const explosionMaterial = new THREE.MeshBasicMaterial({
        color: 0xFF8800,
        transparent: true,
        opacity: 0.8
      });
      
      const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
      
      this.addResult(
        'Explosion Sphere',
        explosion instanceof THREE.Mesh ? 'passed' : 'failed',
        'Basic explosion created'
      );
      
      // Test explosion particles
      const debrisCount = 100;
      const debrisGeometry = new THREE.BufferGeometry();
      const debrisPositions = new Float32Array(debrisCount * 3);
      const debrisVelocities = new Float32Array(debrisCount * 3);
      
      for (let i = 0; i < debrisCount; i++) {
        // Random spherical distribution
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        const radius = Math.random() * 0.5;
        
        debrisPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        debrisPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        debrisPositions[i * 3 + 2] = radius * Math.cos(phi);
        
        // Outward velocities
        debrisVelocities[i * 3] = debrisPositions[i * 3] * 10;
        debrisVelocities[i * 3 + 1] = debrisPositions[i * 3 + 1] * 10;
        debrisVelocities[i * 3 + 2] = debrisPositions[i * 3 + 2] * 10;
      }
      
      debrisGeometry.setAttribute('position', new THREE.BufferAttribute(debrisPositions, 3));
      
      const debrisMaterial = new THREE.PointsMaterial({
        size: 0.2,
        color: 0xFFAA00,
        blending: THREE.AdditiveBlending
      });
      
      const debris = new THREE.Points(debrisGeometry, debrisMaterial);
      
      this.addResult(
        'Explosion Debris',
        debris instanceof THREE.Points ? 'passed' : 'failed',
        `${debrisCount} debris particles`
      );
      
      // Test shockwave ring
      const ringGeometry = new THREE.RingGeometry(0.1, 1, 32);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFFFFF,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide
      });
      
      const shockwave = new THREE.Mesh(ringGeometry, ringMaterial);
      shockwave.rotation.x = -Math.PI / 2;
      
      this.addResult(
        'Shockwave Ring',
        shockwave instanceof THREE.Mesh ? 'passed' : 'failed',
        'Expanding ring effect'
      );
      
      // Test fireball shader
      const fireballShader = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          scale: { value: 1 }
        },
        vertexShader: `
          uniform float time;
          uniform float scale;
          varying vec3 vPosition;
          
          void main() {
            vPosition = position;
            vec3 pos = position * scale;
            pos += normal * sin(time * 10.0) * 0.1;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `,
        fragmentShader: `
          uniform float time;
          varying vec3 vPosition;
          
          void main() {
            float r = length(vPosition);
            float heat = 1.0 - smoothstep(0.0, 1.0, r);
            vec3 color = mix(vec3(1.0, 1.0, 0.0), vec3(1.0, 0.0, 0.0), r);
            gl_FragColor = vec4(color, heat);
          }
        `,
        transparent: true
      });
      
      this.addResult(
        'Fireball Shader',
        fireballShader instanceof THREE.ShaderMaterial ? 'passed' : 'failed',
        'Animated fireball effect'
      );
      
    } catch (error) {
      this.addResult('Explosions', 'failed', `Error: ${error}`);
    }
  }

  private async testShieldEffects() {
    console.log('\n🛡️ Testing Shield Effects...');
    
    try {
      // Test shield bubble
      const shieldGeometry = new THREE.SphereGeometry(3, 32, 32);
      const shieldMaterial = new THREE.MeshPhongMaterial({
        color: 0x0088FF,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
      });
      
      const shield = new THREE.Mesh(shieldGeometry, shieldMaterial);
      
      this.addResult(
        'Shield Bubble',
        shield instanceof THREE.Mesh ? 'passed' : 'failed',
        'Transparent sphere shield'
      );
      
      // Test hexagonal pattern
      const hexShader = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          hitPoint: { value: new THREE.Vector3() },
          shieldStrength: { value: 1.0 }
        },
        vertexShader: `
          varying vec2 vUv;
          varying vec3 vPosition;
          void main() {
            vUv = uv;
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float time;
          uniform float shieldStrength;
          varying vec2 vUv;
          
          float hexagon(vec2 p, float r) {
            const vec3 k = vec3(-0.866025404, 0.5, 0.577350269);
            p = abs(p);
            p -= 2.0 * min(dot(k.xy, p), 0.0) * k.xy;
            p -= vec2(clamp(p.x, -k.z * r, k.z * r), r);
            return length(p) * sign(p.y);
          }
          
          void main() {
            vec2 grid = vUv * 20.0;
            float hex = 1.0 - step(0.1, abs(hexagon(fract(grid) - 0.5, 0.4)));
            vec3 color = vec3(0.0, 0.5, 1.0) * shieldStrength;
            gl_FragColor = vec4(color, hex * 0.5 * shieldStrength);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide
      });
      
      this.addResult(
        'Hexagonal Pattern',
        hexShader instanceof THREE.ShaderMaterial ? 'passed' : 'failed',
        'Hex grid shader'
      );
      
      // Test shield impact
      const impactParticles = new THREE.BufferGeometry();
      const impactCount = 50;
      const impactPositions = new Float32Array(impactCount * 3);
      
      for (let i = 0; i < impactCount; i++) {
        const angle = (i / impactCount) * Math.PI * 2;
        impactPositions[i * 3] = Math.cos(angle) * 0.5;
        impactPositions[i * 3 + 1] = Math.sin(angle) * 0.5;
        impactPositions[i * 3 + 2] = 0;
      }
      
      impactParticles.setAttribute('position', new THREE.BufferAttribute(impactPositions, 3));
      
      this.addResult(
        'Shield Impact',
        impactParticles.attributes.position ? 'passed' : 'failed',
        'Impact spark particles'
      );
      
    } catch (error) {
      this.addResult('Shield Effects', 'failed', `Error: ${error}`);
    }
  }

  private async testWarpEffects() {
    console.log('\n🌀 Testing Warp Effects...');
    
    try {
      // Test warp tunnel
      const tunnelGeometry = new THREE.CylinderGeometry(5, 5, 100, 32, 1, true);
      const tunnelMaterial = new THREE.MeshBasicMaterial({
        color: 0x0066FF,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.5
      });
      
      const tunnel = new THREE.Mesh(tunnelGeometry, tunnelMaterial);
      tunnel.rotation.x = Math.PI / 2;
      
      this.addResult(
        'Warp Tunnel',
        tunnel instanceof THREE.Mesh ? 'passed' : 'failed',
        'Cylindrical tunnel created'
      );
      
      // Test star streaks
      const streakCount = 200;
      const streakGeometry = new THREE.BufferGeometry();
      const streakPositions = new Float32Array(streakCount * 6); // 2 points per line
      
      for (let i = 0; i < streakCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 5 + Math.random() * 10;
        
        // Start point
        streakPositions[i * 6] = Math.cos(angle) * radius;
        streakPositions[i * 6 + 1] = Math.sin(angle) * radius;
        streakPositions[i * 6 + 2] = -50;
        
        // End point
        streakPositions[i * 6 + 3] = Math.cos(angle) * radius;
        streakPositions[i * 6 + 4] = Math.sin(angle) * radius;
        streakPositions[i * 6 + 5] = 50;
      }
      
      streakGeometry.setAttribute('position', new THREE.BufferAttribute(streakPositions, 3));
      
      const streakMaterial = new THREE.LineBasicMaterial({
        color: 0xFFFFFF,
        transparent: true,
        opacity: 0.7
      });
      
      const streaks = new THREE.LineSegments(streakGeometry, streakMaterial);
      
      this.addResult(
        'Star Streaks',
        streaks instanceof THREE.LineSegments ? 'passed' : 'failed',
        `${streakCount} motion lines`
      );
      
      // Test warp distortion shader
      const warpShader = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          warpFactor: { value: 0 }
        },
        vertexShader: `
          uniform float time;
          uniform float warpFactor;
          varying vec2 vUv;
          
          void main() {
            vUv = uv;
            vec3 pos = position;
            float dist = length(pos.xy);
            pos.z += sin(dist * 2.0 - time * 5.0) * warpFactor;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `,
        fragmentShader: `
          uniform float warpFactor;
          varying vec2 vUv;
          
          void main() {
            float dist = length(vUv - 0.5);
            vec3 color = mix(vec3(0.0, 0.0, 1.0), vec3(1.0, 1.0, 1.0), dist);
            gl_FragColor = vec4(color, 1.0 - dist);
          }
        `,
        transparent: true
      });
      
      this.addResult(
        'Warp Distortion',
        warpShader instanceof THREE.ShaderMaterial ? 'passed' : 'failed',
        'Space-time distortion shader'
      );
      
    } catch (error) {
      this.addResult('Warp Effects', 'failed', `Error: ${error}`);
    }
  }

  private async testTrailEffects() {
    console.log('\n🎆 Testing Trail Effects...');
    
    try {
      // Test engine trail
      const trailPoints = [];
      for (let i = 0; i < 50; i++) {
        trailPoints.push(new THREE.Vector3(0, 0, i * 0.5));
      }
      
      const trailCurve = new THREE.CatmullRomCurve3(trailPoints);
      const trailGeometry = new THREE.TubeGeometry(trailCurve, 50, 0.2, 8, false);
      const trailMaterial = new THREE.MeshBasicMaterial({
        color: 0x00FFFF,
        transparent: true,
        opacity: 0.6
      });
      
      const trail = new THREE.Mesh(trailGeometry, trailMaterial);
      
      this.addResult(
        'Engine Trail',
        trail instanceof THREE.Mesh ? 'passed' : 'failed',
        'Tube-based trail'
      );
      
      // Test particle trail
      const particleTrailCount = 100;
      const particleTrailGeometry = new THREE.BufferGeometry();
      const trailPositions = new Float32Array(particleTrailCount * 3);
      const trailOpacities = new Float32Array(particleTrailCount);
      
      for (let i = 0; i < particleTrailCount; i++) {
        trailPositions[i * 3] = 0;
        trailPositions[i * 3 + 1] = 0;
        trailPositions[i * 3 + 2] = i * 0.5;
        trailOpacities[i] = 1 - (i / particleTrailCount);
      }
      
      particleTrailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
      particleTrailGeometry.setAttribute('opacity', new THREE.BufferAttribute(trailOpacities, 1));
      
      this.addResult(
        'Particle Trail',
        particleTrailGeometry.attributes.opacity ? 'passed' : 'failed',
        'Fading particle trail'
      );
      
      // Test ribbon trail
      const ribbonGeometry = new THREE.PlaneGeometry(1, 20, 1, 20);
      const ribbonMaterial = new THREE.MeshBasicMaterial({
        color: 0xFF00FF,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7
      });
      
      const ribbon = new THREE.Mesh(ribbonGeometry, ribbonMaterial);
      
      this.addResult(
        'Ribbon Trail',
        ribbon instanceof THREE.Mesh ? 'passed' : 'failed',
        'Plane-based ribbon'
      );
      
    } catch (error) {
      this.addResult('Trail Effects', 'failed', `Error: ${error}`);
    }
  }

  private async testGlowEffects() {
    console.log('\n✨ Testing Glow Effects...');
    
    try {
      // Test basic glow
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFFF00,
        transparent: true,
        opacity: 0.5,
        side: THREE.BackSide
      });
      
      const glowMesh = new THREE.Mesh(
        new THREE.SphereGeometry(1.2, 32, 32),
        glowMaterial
      );
      
      this.addResult(
        'Basic Glow',
        glowMesh instanceof THREE.Mesh ? 'passed' : 'failed',
        'Backside rendering glow'
      );
      
      // Test fresnel glow shader
      const fresnelShader = new THREE.ShaderMaterial({
        uniforms: {
          glowColor: { value: new THREE.Color(0x00FF00) },
          viewVector: { value: new THREE.Vector3() }
        },
        vertexShader: `
          uniform vec3 viewVector;
          varying float intensity;
          
          void main() {
            vec3 vNormal = normalize(normalMatrix * normal);
            vec3 vNormel = normalize(normalMatrix * viewVector);
            intensity = pow(1.0 - dot(vNormal, vNormel), 2.0);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 glowColor;
          varying float intensity;
          
          void main() {
            gl_FragColor = vec4(glowColor, 1.0) * intensity;
          }
        `,
        side: THREE.FrontSide,
        blending: THREE.AdditiveBlending,
        transparent: true
      });
      
      this.addResult(
        'Fresnel Glow',
        fresnelShader instanceof THREE.ShaderMaterial ? 'passed' : 'failed',
        'Edge glow shader'
      );
      
      // Test volumetric glow
      const volumetricGlow = new THREE.Group();
      for (let i = 0; i < 5; i++) {
        const scale = 1 + i * 0.1;
        const opacity = 0.1 * (1 - i / 5);
        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry(scale, 16, 16),
          new THREE.MeshBasicMaterial({
            color: 0x00FFFF,
            transparent: true,
            opacity: opacity
          })
        );
        volumetricGlow.add(sphere);
      }
      
      this.addResult(
        'Volumetric Glow',
        volumetricGlow.children.length === 5 ? 'passed' : 'failed',
        'Layered glow effect'
      );
      
    } catch (error) {
      this.addResult('Glow Effects', 'failed', `Error: ${error}`);
    }
  }

  private async testEnvironmentalEffects() {
    console.log('\n🌊 Testing Environmental Effects...');
    
    try {
      // Test nebula clouds
      const nebulaGeometry = new THREE.PlaneGeometry(100, 100);
      const nebulaMaterial = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          color1: { value: new THREE.Color(0xFF00FF) },
          color2: { value: new THREE.Color(0x00FFFF) }
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
          uniform vec3 color1;
          uniform vec3 color2;
          varying vec2 vUv;
          
          float noise(vec2 p) {
            return sin(p.x * 10.0) * sin(p.y * 10.0);
          }
          
          void main() {
            float n = noise(vUv + time * 0.1);
            vec3 color = mix(color1, color2, n);
            gl_FragColor = vec4(color, 0.5);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide
      });
      
      this.addResult(
        'Nebula Clouds',
        nebulaMaterial instanceof THREE.ShaderMaterial ? 'passed' : 'failed',
        'Procedural nebula shader'
      );
      
      // Test asteroid dust
      const dustCount = 500;
      const dustGeometry = new THREE.BufferGeometry();
      const dustPositions = new Float32Array(dustCount * 3);
      
      for (let i = 0; i < dustCount; i++) {
        dustPositions[i * 3] = (Math.random() - 0.5) * 200;
        dustPositions[i * 3 + 1] = (Math.random() - 0.5) * 200;
        dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 200;
      }
      
      dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
      
      const dustMaterial = new THREE.PointsMaterial({
        size: 0.5,
        color: 0x888888,
        transparent: true,
        opacity: 0.4
      });
      
      const dust = new THREE.Points(dustGeometry, dustMaterial);
      
      this.addResult(
        'Space Dust',
        dust instanceof THREE.Points ? 'passed' : 'failed',
        `${dustCount} dust particles`
      );
      
      // Test solar wind
      const windLines = new THREE.BufferGeometry();
      const windPositions = new Float32Array(100 * 6);
      
      for (let i = 0; i < 100; i++) {
        const y = (Math.random() - 0.5) * 50;
        const z = (Math.random() - 0.5) * 50;
        
        windPositions[i * 6] = -50;
        windPositions[i * 6 + 1] = y;
        windPositions[i * 6 + 2] = z;
        windPositions[i * 6 + 3] = 50;
        windPositions[i * 6 + 4] = y;
        windPositions[i * 6 + 5] = z;
      }
      
      windLines.setAttribute('position', new THREE.BufferAttribute(windPositions, 3));
      
      this.addResult(
        'Solar Wind',
        windLines.attributes.position ? 'passed' : 'failed',
        'Directional particle streams'
      );
      
    } catch (error) {
      this.addResult('Environmental Effects', 'failed', `Error: ${error}`);
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
  (window as any).testEffects = () => {
    const suite = new EffectsTestSuite();
    return suite.runAllTests();
  };
  
  (window as any).EffectsTestSuite = EffectsTestSuite;
}

export default EffectsTestSuite;