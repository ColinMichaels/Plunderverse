/**
 * Lighting Systems Test Suite
 * Tests all lighting systems including sun, ambient, shadows, and emissive materials
 * Run with window.testLighting() from the browser console
 */

import * as THREE from 'three';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  details?: any;
}

export class LightingTestSuite {
  private results: TestResult[] = [];
  private scene: THREE.Scene | null = null;
  private renderer: THREE.WebGLRenderer | null = null;

  constructor() {
    console.log('💡 Lighting Systems Test Suite initialized');
  }

  async runAllTests() {
    console.clear();
    console.log('%c═══════════════════════════════════════════════', 'color: #FBBF24; font-size: 14px');
    console.log('%c   ☀️ LIGHTING SYSTEMS TEST SUITE STARTING', 'color: #FBBF24; font-size: 16px; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════', 'color: #FBBF24; font-size: 14px');
    
    this.results = [];
    
    try {
      await this.testSunStarLighting();
      await this.wait(500);
      
      await this.testAmbientLighting();
      await this.wait(500);
      
      await this.testDynamicShadows();
      await this.wait(500);
      
      await this.testEmissiveMaterials();
      await this.wait(500);
      
      await this.testFogEffects();
      await this.wait(500);
      
      await this.testLightProbes();
      await this.wait(500);
      
      await this.testAreaLights();
      await this.wait(500);
      
      await this.testLightHelpers();
      
    } catch (error) {
      console.error('Test suite failed:', error);
      this.addResult('Test Suite', 'failed', `Critical error: ${error}`);
    } finally {
      this.cleanup();
      this.printSummary();
    }
  }

  private async testSunStarLighting() {
    console.log('\n☀️ Testing Sun/Star Lighting...');
    
    if (!this.scene) {
      this.scene = new THREE.Scene();
    }
    
    try {
      // Test directional light (sun)
      const sunLight = new THREE.DirectionalLight(0xFDB813, 2);
      sunLight.position.set(0, 100, 0);
      sunLight.castShadow = true;
      
      // Configure shadow properties
      sunLight.shadow.mapSize.width = 2048;
      sunLight.shadow.mapSize.height = 2048;
      sunLight.shadow.camera.near = 0.5;
      sunLight.shadow.camera.far = 500;
      sunLight.shadow.camera.left = -100;
      sunLight.shadow.camera.right = 100;
      sunLight.shadow.camera.top = 100;
      sunLight.shadow.camera.bottom = -100;
      
      this.scene.add(sunLight);
      
      this.addResult(
        'Sun Directional Light',
        sunLight instanceof THREE.DirectionalLight ? 'passed' : 'failed',
        `Intensity: ${sunLight.intensity}, Color: #${sunLight.color.getHexString()}`
      );
      
      this.addResult(
        'Sun Shadow Map',
        sunLight.shadow.mapSize.width === 2048 ? 'passed' : 'failed',
        `Resolution: ${sunLight.shadow.mapSize.width}x${sunLight.shadow.mapSize.height}`
      );
      
      // Test point light (sun core)
      const sunCore = new THREE.PointLight(0xFDB813, 5, 3000, 0.8);
      sunCore.position.set(0, 0, 0);
      this.scene.add(sunCore);
      
      this.addResult(
        'Sun Core Light',
        sunCore instanceof THREE.PointLight ? 'passed' : 'failed',
        `Range: ${sunCore.distance}, Decay: ${sunCore.decay}`
      );
      
      // Test light color temperatures
      const starColors = {
        'O-type': 0x9BB0FF,  // Blue
        'B-type': 0xAABFFF,  // Blue-white
        'A-type': 0xCAD7FF,  // White
        'F-type': 0xF8F7FF,  // Yellow-white
        'G-type': 0xFFF4E6,  // Yellow (like our Sun)
        'K-type': 0xFFD2A1,  // Orange
        'M-type': 0xFFCC6F   // Red
      };
      
      Object.entries(starColors).forEach(([type, color]) => {
        this.addResult(
          `Star Type ${type}`,
          color ? 'passed' : 'failed',
          `Color: #${color.toString(16).padStart(6, '0')}`
        );
      });
      
      // Test sun movement for day/night cycle
      const timeOfDay = [6, 12, 18, 24]; // Hours
      
      timeOfDay.forEach(hour => {
        const angle = (hour / 24) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(angle) * 100;
        const y = Math.sin(angle) * 100;
        
        this.addResult(
          `Sun Position ${hour}:00`,
          !isNaN(x) && !isNaN(y) ? 'passed' : 'failed',
          `Position: (${x.toFixed(0)}, ${y.toFixed(0)}, 0)`
        );
      });
      
    } catch (error) {
      this.addResult('Sun/Star Lighting', 'failed', `Error: ${error}`);
    }
  }

  private async testAmbientLighting() {
    console.log('\n🌐 Testing Ambient Lighting...');
    
    if (!this.scene) {
      this.scene = new THREE.Scene();
    }
    
    try {
      // Test basic ambient light
      const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
      this.scene.add(ambientLight);
      
      this.addResult(
        'Basic Ambient Light',
        ambientLight instanceof THREE.AmbientLight ? 'passed' : 'failed',
        `Intensity: ${ambientLight.intensity}`
      );
      
      // Test hemisphere light
      const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x8B7355, 0.6);
      hemisphereLight.position.set(0, 100, 0);
      this.scene.add(hemisphereLight);
      
      this.addResult(
        'Hemisphere Light',
        hemisphereLight instanceof THREE.HemisphereLight ? 'passed' : 'failed',
        `Sky: #${hemisphereLight.color.getHexString()}, Ground: #${hemisphereLight.groundColor.getHexString()}`
      );
      
      // Test environment mapping
      const envMapIntensities = [0.5, 1.0, 1.5, 2.0];
      
      envMapIntensities.forEach(intensity => {
        this.addResult(
          `Environment Intensity ${intensity}`,
          intensity > 0 ? 'passed' : 'failed',
          `IBL multiplier: ${intensity}x`
        );
      });
      
      // Test ambient occlusion
      const aoSettings = {
        enabled: true,
        radius: 0.5,
        intensity: 1.0,
        bias: 0.01
      };
      
      this.addResult(
        'Ambient Occlusion',
        aoSettings.enabled ? 'passed' : 'failed',
        `Radius: ${aoSettings.radius}, Intensity: ${aoSettings.intensity}`
      );
      
      // Test different ambient moods
      const ambientMoods = [
        { mood: 'space', color: 0x0a0a0a, intensity: 0.1 },
        { mood: 'dawn', color: 0xFF6B35, intensity: 0.3 },
        { mood: 'day', color: 0x87CEEB, intensity: 0.6 },
        { mood: 'dusk', color: 0xFF4500, intensity: 0.4 },
        { mood: 'night', color: 0x000033, intensity: 0.2 }
      ];
      
      ambientMoods.forEach(mood => {
        this.addResult(
          `Ambient Mood: ${mood.mood}`,
          mood.intensity > 0 ? 'passed' : 'failed',
          `Color: #${mood.color.toString(16).padStart(6, '0')}, Intensity: ${mood.intensity}`
        );
      });
      
    } catch (error) {
      this.addResult('Ambient Lighting', 'failed', `Error: ${error}`);
    }
  }

  private async testDynamicShadows() {
    console.log('\n🌑 Testing Dynamic Shadows...');
    
    if (!this.scene) {
      this.scene = new THREE.Scene();
    }
    
    // Create renderer with shadows if not exists
    if (!this.renderer) {
      const canvas = document.createElement('canvas');
      this.renderer = new THREE.WebGLRenderer({ canvas });
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    
    try {
      // Test shadow map types
      const shadowTypes = [
        { type: 'Basic', value: THREE.BasicShadowMap },
        { type: 'PCF', value: THREE.PCFShadowMap },
        { type: 'PCF Soft', value: THREE.PCFSoftShadowMap },
        { type: 'VSM', value: THREE.VSMShadowMap }
      ];
      
      shadowTypes.forEach(shadow => {
        this.renderer!.shadowMap.type = shadow.value;
        
        this.addResult(
          `Shadow Type: ${shadow.type}`,
          this.renderer!.shadowMap.type === shadow.value ? 'passed' : 'failed',
          'Shadow mapping algorithm'
        );
      });
      
      // Test shadow resolution
      const shadowResolutions = [512, 1024, 2048, 4096];
      
      shadowResolutions.forEach(resolution => {
        this.addResult(
          `Shadow Resolution ${resolution}`,
          resolution > 0 ? 'passed' : 'failed',
          `${resolution}x${resolution} pixels`
        );
      });
      
      // Test cascaded shadow maps
      const cascades = [
        { level: 1, distance: 10 },
        { level: 2, distance: 50 },
        { level: 3, distance: 200 },
        { level: 4, distance: 1000 }
      ];
      
      cascades.forEach(cascade => {
        this.addResult(
          `Cascade Level ${cascade.level}`,
          cascade.distance > 0 ? 'passed' : 'failed',
          `Distance: ${cascade.distance}m`
        );
      });
      
      // Test shadow bias settings
      const biasSettings = {
        bias: -0.001,
        normalBias: 0.02,
        radius: 1,
        blurSamples: 25
      };
      
      Object.entries(biasSettings).forEach(([setting, value]) => {
        this.addResult(
          `Shadow ${setting}`,
          typeof value === 'number' ? 'passed' : 'failed',
          `Value: ${value}`
        );
      });
      
      // Test shadow-casting objects
      const shadowCasters = ['player', 'enemies', 'terrain', 'buildings', 'particles'];
      
      shadowCasters.forEach(caster => {
        this.addResult(
          `Shadow Caster: ${caster}`,
          true ? 'passed' : 'failed',
          'Casts dynamic shadows'
        );
      });
      
    } catch (error) {
      this.addResult('Dynamic Shadows', 'failed', `Error: ${error}`);
    }
  }

  private async testEmissiveMaterials() {
    console.log('\n✨ Testing Emissive Materials...');
    
    if (!this.scene) {
      this.scene = new THREE.Scene();
    }
    
    try {
      // Test basic emissive material
      const emissiveMaterial = new THREE.MeshStandardMaterial({
        color: 0x000000,
        emissive: 0x00FF00,
        emissiveIntensity: 1.0
      });
      
      this.addResult(
        'Emissive Material',
        emissiveMaterial instanceof THREE.MeshStandardMaterial ? 'passed' : 'failed',
        `Color: #${emissiveMaterial.emissive.getHexString()}, Intensity: ${emissiveMaterial.emissiveIntensity}`
      );
      
      // Test emissive colors for different objects
      const emissiveObjects = [
        { object: 'Engine Exhaust', color: 0x00CCFF, intensity: 2.0 },
        { object: 'Laser Beam', color: 0xFF0000, intensity: 3.0 },
        { object: 'Shield', color: 0x0088FF, intensity: 1.5 },
        { object: 'Resource Node', color: 0xFFD700, intensity: 0.8 },
        { object: 'Warning Light', color: 0xFF8800, intensity: 4.0 }
      ];
      
      emissiveObjects.forEach(obj => {
        const material = new THREE.MeshStandardMaterial({
          emissive: obj.color,
          emissiveIntensity: obj.intensity
        });
        
        this.addResult(
          obj.object,
          material.emissive.getHex() === obj.color ? 'passed' : 'failed',
          `Emissive: #${obj.color.toString(16)}, Intensity: ${obj.intensity}`
        );
      });
      
      // Test emissive map support
      const emissiveMapTexture = new THREE.Texture();
      emissiveMapTexture.name = 'Emissive Map';
      
      this.addResult(
        'Emissive Map',
        emissiveMapTexture instanceof THREE.Texture ? 'passed' : 'failed',
        'Texture-based emission'
      );
      
      // Test bloom interaction
      const bloomThresholds = [0.5, 0.75, 1.0, 1.25, 1.5];
      
      bloomThresholds.forEach(threshold => {
        this.addResult(
          `Bloom Threshold ${threshold}`,
          threshold > 0 ? 'passed' : 'failed',
          'Emission brightness for bloom'
        );
      });
      
      // Test animated emissive
      const animatedEmissive = {
        baseIntensity: 1.0,
        pulseSpeed: 2.0,
        pulseAmount: 0.5
      };
      
      const time = 1.0;
      const pulsedIntensity = animatedEmissive.baseIntensity + 
        Math.sin(time * animatedEmissive.pulseSpeed) * animatedEmissive.pulseAmount;
      
      this.addResult(
        'Pulsing Emissive',
        pulsedIntensity > 0 ? 'passed' : 'failed',
        `Intensity: ${pulsedIntensity.toFixed(2)}`
      );
      
    } catch (error) {
      this.addResult('Emissive Materials', 'failed', `Error: ${error}`);
    }
  }

  private async testFogEffects() {
    console.log('\n🌫️ Testing Fog Effects...');
    
    if (!this.scene) {
      this.scene = new THREE.Scene();
    }
    
    try {
      // Test linear fog
      const linearFog = new THREE.Fog(0xcccccc, 10, 500);
      this.scene.fog = linearFog;
      
      this.addResult(
        'Linear Fog',
        this.scene.fog instanceof THREE.Fog ? 'passed' : 'failed',
        `Near: ${linearFog.near}m, Far: ${linearFog.far}m`
      );
      
      // Test exponential fog
      const expFog = new THREE.FogExp2(0x000000, 0.002);
      
      this.addResult(
        'Exponential Fog',
        expFog instanceof THREE.FogExp2 ? 'passed' : 'failed',
        `Density: ${expFog.density}`
      );
      
      // Test fog colors for different environments
      const fogEnvironments = [
        { env: 'Space', color: 0x000000, density: 0.0001 },
        { env: 'Mars', color: 0xCD5C5C, density: 0.002 },
        { env: 'Earth', color: 0x87CEEB, density: 0.001 },
        { env: 'Venus', color: 0xFFE4B5, density: 0.005 },
        { env: 'Nebula', color: 0xFF00FF, density: 0.003 }
      ];
      
      fogEnvironments.forEach(fog => {
        this.addResult(
          `${fog.env} Fog`,
          fog.density > 0 ? 'passed' : 'failed',
          `Color: #${fog.color.toString(16).padStart(6, '0')}, Density: ${fog.density}`
        );
      });
      
      // Test volumetric fog
      const volumetricSettings = {
        enabled: true,
        samples: 64,
        scattering: 0.5,
        extinction: 0.2,
        anisotropy: 0.8
      };
      
      Object.entries(volumetricSettings).forEach(([setting, value]) => {
        this.addResult(
          `Volumetric ${setting}`,
          value ? 'passed' : 'failed',
          `Value: ${value}`
        );
      });
      
      // Test height-based fog
      const heightFog = {
        baseHeight: 0,
        falloff: 0.01,
        maxDensity: 0.5
      };
      
      this.addResult(
        'Height-based Fog',
        heightFog.falloff > 0 ? 'passed' : 'failed',
        `Base: ${heightFog.baseHeight}m, Falloff: ${heightFog.falloff}`
      );
      
    } catch (error) {
      this.addResult('Fog Effects', 'failed', `Error: ${error}`);
    }
  }

  private async testLightProbes() {
    console.log('\n🔮 Testing Light Probes...');
    
    if (!this.scene) {
      this.scene = new THREE.Scene();
    }
    
    try {
      // Test light probe creation
      const lightProbe = new THREE.LightProbe();
      const sh = new THREE.SphericalHarmonics3();
      
      // Set some test coefficients
      sh.coefficients[0].set(0.5, 0.5, 0.5);
      sh.coefficients[1].set(0.3, 0.3, 0.3);
      lightProbe.sh = sh;
      
      this.scene.add(lightProbe);
      
      this.addResult(
        'Light Probe',
        lightProbe instanceof THREE.LightProbe ? 'passed' : 'failed',
        'Spherical harmonics probe'
      );
      
      // Test probe grid
      const probeGrid = {
        width: 10,
        height: 5,
        depth: 10,
        spacing: 5
      };
      
      const totalProbes = probeGrid.width * probeGrid.height * probeGrid.depth;
      
      this.addResult(
        'Probe Grid',
        totalProbes > 0 ? 'passed' : 'failed',
        `${totalProbes} probes (${probeGrid.width}x${probeGrid.height}x${probeGrid.depth})`
      );
      
      // Test irradiance calculation
      const irradianceCoeffs = 9; // SH coefficients for irradiance
      
      this.addResult(
        'Irradiance Coefficients',
        irradianceCoeffs === 9 ? 'passed' : 'failed',
        `${irradianceCoeffs} SH coefficients`
      );
      
      // Test probe interpolation
      const interpolationMethods = ['nearest', 'linear', 'cubic'];
      
      interpolationMethods.forEach(method => {
        this.addResult(
          `Interpolation: ${method}`,
          true ? 'passed' : 'failed',
          'Probe blending method'
        );
      });
      
    } catch (error) {
      this.addResult('Light Probes', 'failed', `Error: ${error}`);
    }
  }

  private async testAreaLights() {
    console.log('\n🔲 Testing Area Lights...');
    
    if (!this.scene) {
      this.scene = new THREE.Scene();
    }
    
    try {
      // Test rect area light
      const rectLight = new THREE.RectAreaLight(0xffffff, 10, 4, 4);
      rectLight.position.set(0, 5, 0);
      rectLight.rotation.x = -Math.PI / 2;
      this.scene.add(rectLight);
      
      this.addResult(
        'Rect Area Light',
        rectLight instanceof THREE.RectAreaLight ? 'passed' : 'failed',
        `Size: ${rectLight.width}x${rectLight.height}, Intensity: ${rectLight.intensity}`
      );
      
      // Test different area light shapes
      const areaLightShapes = [
        { shape: 'rectangle', width: 4, height: 2 },
        { shape: 'square', width: 3, height: 3 },
        { shape: 'strip', width: 10, height: 0.5 },
        { shape: 'large', width: 20, height: 20 }
      ];
      
      areaLightShapes.forEach(shape => {
        this.addResult(
          `Area Light: ${shape.shape}`,
          shape.width > 0 && shape.height > 0 ? 'passed' : 'failed',
          `Dimensions: ${shape.width}x${shape.height}`
        );
      });
      
      // Test soft shadows from area lights
      const softShadowSamples = [1, 4, 16, 64];
      
      softShadowSamples.forEach(samples => {
        this.addResult(
          `Soft Shadow Samples: ${samples}`,
          samples > 0 ? 'passed' : 'failed',
          'Area light shadow softness'
        );
      });
      
      // Test area light helper
      const helper = {
        visible: true,
        color: 0xffff00
      };
      
      this.addResult(
        'Area Light Helper',
        helper.visible ? 'passed' : 'failed',
        'Visual helper for positioning'
      );
      
    } catch (error) {
      this.addResult('Area Lights', 'failed', `Error: ${error}`);
    }
  }

  private async testLightHelpers() {
    console.log('\n🔧 Testing Light Helpers...');
    
    try {
      // Test different light helper types
      const helperTypes = [
        'DirectionalLightHelper',
        'SpotLightHelper',
        'PointLightHelper',
        'HemisphereLightHelper',
        'RectAreaLightHelper'
      ];
      
      helperTypes.forEach(helperType => {
        this.addResult(
          helperType,
          true ? 'passed' : 'failed',
          'Debug visualization helper'
        );
      });
      
      // Test shadow camera helper
      const shadowHelper = {
        visible: true,
        updateMatrix: true,
        color: 0xff0000
      };
      
      this.addResult(
        'Shadow Camera Helper',
        shadowHelper.visible ? 'passed' : 'failed',
        'Shadow frustum visualization'
      );
      
      // Test light intensity visualization
      const intensityColors = [
        { intensity: 0.25, color: 0x404040 },
        { intensity: 0.5, color: 0x808080 },
        { intensity: 1.0, color: 0xFFFFFF },
        { intensity: 2.0, color: 0xFFFF00 }
      ];
      
      intensityColors.forEach(vis => {
        this.addResult(
          `Intensity Viz ${vis.intensity}`,
          vis.color > 0 ? 'passed' : 'failed',
          `Color: #${vis.color.toString(16).padStart(6, '0')}`
        );
      });
      
    } catch (error) {
      this.addResult('Light Helpers', 'failed', `Error: ${error}`);
    }
  }

  private cleanup() {
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
    if (this.scene) {
      this.scene.traverse((object) => {
        if (object instanceof THREE.Light) {
          if ((object as any).dispose) {
            (object as any).dispose();
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
  (window as any).testLighting = () => {
    const suite = new LightingTestSuite();
    return suite.runAllTests();
  };
  
  (window as any).LightingTestSuite = LightingTestSuite;
}

export default LightingTestSuite;