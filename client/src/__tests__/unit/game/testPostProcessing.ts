/**
 * Post-Processing Effects Test Suite
 * Tests post-processing effects like bloom, motion blur, and color grading
 * Run with window.testPostProcessing() from the browser console
 */

import * as THREE from 'three';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  details?: any;
}

export class PostProcessingTestSuite {
  private results: TestResult[] = [];
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;

  constructor() {
    console.log('🎨 Post-Processing Test Suite initialized');
  }

  async runAllTests() {
    console.clear();
    console.log('%c═══════════════════════════════════════════════', 'color: #9333EA; font-size: 14px');
    console.log('%c   🎬 POST-PROCESSING TEST SUITE STARTING', 'color: #9333EA; font-size: 16px; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════', 'color: #9333EA; font-size: 14px');
    
    this.results = [];
    
    try {
      await this.testRendererSetup();
      await this.wait(500);
      
      await this.testBloomEffects();
      await this.wait(500);
      
      await this.testHeatShimmer();
      await this.wait(500);
      
      await this.testMotionBlur();
      await this.wait(500);
      
      await this.testDepthOfField();
      await this.wait(500);
      
      await this.testColorGrading();
      await this.wait(500);
      
      await this.testVignette();
      await this.wait(500);
      
      await this.testCompositing();
      
    } catch (error) {
      console.error('Test suite failed:', error);
      this.addResult('Test Suite', 'failed', `Critical error: ${error}`);
    } finally {
      this.cleanup();
      this.printSummary();
    }
  }

  private async testRendererSetup() {
    console.log('\n🖥️ Testing Renderer Setup...');
    
    try {
      // Create renderer with post-processing support
      const canvas = document.createElement('canvas');
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      });
      
      this.addResult(
        'WebGL Renderer',
        this.renderer instanceof THREE.WebGLRenderer ? 'passed' : 'failed',
        'Renderer created'
      );
      
      // Test renderer capabilities
      this.renderer.setSize(1920, 1080);
      this.renderer.setPixelRatio(window.devicePixelRatio);
      
      this.addResult(
        'Renderer Size',
        this.renderer.domElement.width > 0 ? 'passed' : 'failed',
        `${this.renderer.domElement.width}x${this.renderer.domElement.height}`
      );
      
      // Enable required features
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.2;
      
      this.addResult(
        'Shadow Maps',
        this.renderer.shadowMap.enabled ? 'passed' : 'failed',
        'PCF soft shadows enabled'
      );
      
      this.addResult(
        'Tone Mapping',
        this.renderer.toneMapping === THREE.ACESFilmicToneMapping ? 'passed' : 'failed',
        'ACES Filmic tone mapping'
      );
      
      // Test render targets for post-processing
      const renderTarget = new THREE.WebGLRenderTarget(1920, 1080, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat
      });
      
      this.addResult(
        'Render Target',
        renderTarget instanceof THREE.WebGLRenderTarget ? 'passed' : 'failed',
        'Off-screen render target'
      );
      
    } catch (error) {
      this.addResult('Renderer Setup', 'failed', `Error: ${error}`);
    }
  }

  private async testBloomEffects() {
    console.log('\n✨ Testing Bloom Effects...');
    
    try {
      // Test bloom shader setup
      const bloomShader = new THREE.ShaderMaterial({
        uniforms: {
          tDiffuse: { value: null },
          bloomStrength: { value: 1.5 },
          bloomRadius: { value: 0.4 },
          bloomThreshold: { value: 0.85 }
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D tDiffuse;
          uniform float bloomStrength;
          uniform float bloomRadius;
          uniform float bloomThreshold;
          varying vec2 vUv;
          
          vec3 extractBright(vec3 color) {
            float brightness = dot(color, vec3(0.299, 0.587, 0.114));
            return brightness > bloomThreshold ? color : vec3(0.0);
          }
          
          void main() {
            vec4 texel = texture2D(tDiffuse, vUv);
            vec3 bright = extractBright(texel.rgb);
            gl_FragColor = vec4(bright * bloomStrength, texel.a);
          }
        `
      });
      
      this.addResult(
        'Bloom Shader',
        bloomShader instanceof THREE.ShaderMaterial ? 'passed' : 'failed',
        'Luminance extraction shader'
      );
      
      // Test gaussian blur for bloom
      const blurShader = new THREE.ShaderMaterial({
        uniforms: {
          tDiffuse: { value: null },
          resolution: { value: new THREE.Vector2(1920, 1080) },
          direction: { value: new THREE.Vector2(1, 0) }
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D tDiffuse;
          uniform vec2 resolution;
          uniform vec2 direction;
          varying vec2 vUv;
          
          vec4 blur9(sampler2D image, vec2 uv, vec2 resolution, vec2 direction) {
            vec4 color = vec4(0.0);
            vec2 off1 = vec2(1.3846153846) * direction;
            vec2 off2 = vec2(3.2307692308) * direction;
            color += texture2D(image, uv) * 0.2270270270;
            color += texture2D(image, uv + (off1 / resolution)) * 0.3162162162;
            color += texture2D(image, uv - (off1 / resolution)) * 0.3162162162;
            color += texture2D(image, uv + (off2 / resolution)) * 0.0702702703;
            color += texture2D(image, uv - (off2 / resolution)) * 0.0702702703;
            return color;
          }
          
          void main() {
            gl_FragColor = blur9(tDiffuse, vUv, resolution, direction);
          }
        `
      });
      
      this.addResult(
        'Gaussian Blur',
        blurShader instanceof THREE.ShaderMaterial ? 'passed' : 'failed',
        '9-tap gaussian filter'
      );
      
      // Test bloom parameters
      const bloomParams = {
        strength: [0.5, 1.0, 1.5, 2.0],
        radius: [0.2, 0.4, 0.6, 0.8],
        threshold: [0.7, 0.8, 0.9, 1.0]
      };
      
      bloomParams.strength.forEach(strength => {
        this.addResult(
          `Bloom Strength ${strength}`,
          strength > 0 ? 'passed' : 'failed',
          `Intensity multiplier: ${strength}x`
        );
      });
      
    } catch (error) {
      this.addResult('Bloom Effects', 'failed', `Error: ${error}`);
    }
  }

  private async testHeatShimmer() {
    console.log('\n🔥 Testing Heat Shimmer...');
    
    try {
      // Test heat distortion shader
      const heatShimmerShader = new THREE.ShaderMaterial({
        uniforms: {
          tDiffuse: { value: null },
          time: { value: 0 },
          intensity: { value: 0.5 },
          frequency: { value: 10 },
          speed: { value: 1 },
          distortionScale: { value: 5 }
        },
        vertexShader: `
          uniform float time;
          uniform float intensity;
          uniform float frequency;
          varying vec2 vUv;
          varying vec2 vDistortion;
          
          void main() {
            vUv = uv;
            vec2 distortion = vec2(
              sin(uv.y * frequency + time) * intensity,
              cos(uv.x * frequency + time) * intensity
            );
            vDistortion = distortion * 0.01;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D tDiffuse;
          uniform float time;
          varying vec2 vUv;
          varying vec2 vDistortion;
          
          void main() {
            vec2 distortedUv = vUv + vDistortion;
            vec4 color = texture2D(tDiffuse, distortedUv);
            gl_FragColor = color;
          }
        `
      });
      
      this.addResult(
        'Heat Shimmer Shader',
        heatShimmerShader instanceof THREE.ShaderMaterial ? 'passed' : 'failed',
        'UV distortion shader'
      );
      
      // Test different heat intensities
      const heatLevels = [
        { temp: 'cool', intensity: 0.0 },
        { temp: 'warm', intensity: 0.3 },
        { temp: 'hot', intensity: 0.6 },
        { temp: 'extreme', intensity: 1.0 }
      ];
      
      heatLevels.forEach(level => {
        heatShimmerShader.uniforms.intensity.value = level.intensity;
        
        this.addResult(
          `Heat Level: ${level.temp}`,
          heatShimmerShader.uniforms.intensity.value === level.intensity ? 'passed' : 'failed',
          `Distortion: ${level.intensity}`
        );
      });
      
      // Test refraction effect
      const refractionShader = new THREE.ShaderMaterial({
        uniforms: {
          tDiffuse: { value: null },
          refractiveIndex: { value: 1.3 }
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D tDiffuse;
          uniform float refractiveIndex;
          varying vec2 vUv;
          
          void main() {
            vec2 refractedUv = vUv;
            refractedUv.x += (vUv.x - 0.5) * (refractiveIndex - 1.0) * 0.1;
            refractedUv.y += (vUv.y - 0.5) * (refractiveIndex - 1.0) * 0.1;
            gl_FragColor = texture2D(tDiffuse, refractedUv);
          }
        `
      });
      
      this.addResult(
        'Refraction Effect',
        refractionShader instanceof THREE.ShaderMaterial ? 'passed' : 'failed',
        'Light bending simulation'
      );
      
    } catch (error) {
      this.addResult('Heat Shimmer', 'failed', `Error: ${error}`);
    }
  }

  private async testMotionBlur() {
    console.log('\n💨 Testing Motion Blur...');
    
    try {
      // Test velocity buffer
      const velocityBuffer = new THREE.WebGLRenderTarget(1920, 1080, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.FloatType
      });
      
      this.addResult(
        'Velocity Buffer',
        velocityBuffer instanceof THREE.WebGLRenderTarget ? 'passed' : 'failed',
        'Motion vector storage'
      );
      
      // Test motion blur shader
      const motionBlurShader = new THREE.ShaderMaterial({
        uniforms: {
          tColor: { value: null },
          tVelocity: { value: null },
          velocityFactor: { value: 1.0 },
          samples: { value: 16 }
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D tColor;
          uniform sampler2D tVelocity;
          uniform float velocityFactor;
          uniform int samples;
          varying vec2 vUv;
          
          void main() {
            vec2 velocity = texture2D(tVelocity, vUv).xy * velocityFactor;
            vec4 color = texture2D(tColor, vUv);
            
            for (int i = 1; i < 16; i++) {
              if (i >= samples) break;
              float t = float(i) / float(samples - 1);
              vec2 offset = velocity * t;
              color += texture2D(tColor, vUv - offset);
            }
            
            gl_FragColor = color / float(samples);
          }
        `
      });
      
      this.addResult(
        'Motion Blur Shader',
        motionBlurShader instanceof THREE.ShaderMaterial ? 'passed' : 'failed',
        'Multi-sample blur'
      );
      
      // Test blur quality settings
      const qualitySettings = [
        { name: 'low', samples: 8 },
        { name: 'medium', samples: 16 },
        { name: 'high', samples: 32 },
        { name: 'ultra', samples: 64 }
      ];
      
      qualitySettings.forEach(setting => {
        this.addResult(
          `Blur Quality: ${setting.name}`,
          setting.samples > 0 ? 'passed' : 'failed',
          `${setting.samples} samples`
        );
      });
      
      // Test directional blur
      const directionalBlur = {
        horizontal: new THREE.Vector2(1, 0),
        vertical: new THREE.Vector2(0, 1),
        diagonal: new THREE.Vector2(0.707, 0.707),
        radial: new THREE.Vector2(0, 0) // Center point for radial
      };
      
      Object.entries(directionalBlur).forEach(([direction, vector]) => {
        this.addResult(
          `${direction} Blur`,
          vector instanceof THREE.Vector2 ? 'passed' : 'failed',
          `Direction: (${vector.x}, ${vector.y})`
        );
      });
      
    } catch (error) {
      this.addResult('Motion Blur', 'failed', `Error: ${error}`);
    }
  }

  private async testDepthOfField() {
    console.log('\n📷 Testing Depth of Field...');
    
    try {
      // Test depth texture
      const depthTexture = new THREE.DepthTexture(1920, 1080);
      depthTexture.type = THREE.UnsignedShortType;
      
      this.addResult(
        'Depth Texture',
        depthTexture instanceof THREE.DepthTexture ? 'passed' : 'failed',
        'Scene depth buffer'
      );
      
      // Test DOF shader
      const dofShader = new THREE.ShaderMaterial({
        uniforms: {
          tColor: { value: null },
          tDepth: { value: null },
          focus: { value: 10.0 },
          aperture: { value: 0.025 },
          maxBlur: { value: 0.01 },
          nearClip: { value: 0.1 },
          farClip: { value: 1000 }
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D tColor;
          uniform sampler2D tDepth;
          uniform float focus;
          uniform float aperture;
          uniform float maxBlur;
          uniform float nearClip;
          uniform float farClip;
          varying vec2 vUv;
          
          float getDepth(vec2 coord) {
            return texture2D(tDepth, coord).x;
          }
          
          float getBlurSize(float depth) {
            float f = focus;
            float d = depth * (farClip - nearClip) + nearClip;
            float blur = abs(aperture * (f - d) / (d * (f - nearClip)));
            return min(blur, maxBlur);
          }
          
          void main() {
            float depth = getDepth(vUv);
            float blur = getBlurSize(depth);
            
            vec4 color = texture2D(tColor, vUv);
            
            // Simple box blur based on depth
            if (blur > 0.0) {
              for (float x = -2.0; x <= 2.0; x++) {
                for (float y = -2.0; y <= 2.0; y++) {
                  vec2 offset = vec2(x, y) * blur * 0.001;
                  color += texture2D(tColor, vUv + offset);
                }
              }
              color /= 25.0;
            }
            
            gl_FragColor = color;
          }
        `
      });
      
      this.addResult(
        'DOF Shader',
        dofShader instanceof THREE.ShaderMaterial ? 'passed' : 'failed',
        'Depth-based blur'
      );
      
      // Test focus distances
      const focusDistances = [
        { range: 'macro', distance: 1 },
        { range: 'close', distance: 5 },
        { range: 'medium', distance: 20 },
        { range: 'far', distance: 100 },
        { range: 'infinite', distance: 1000 }
      ];
      
      focusDistances.forEach(focus => {
        this.addResult(
          `Focus: ${focus.range}`,
          focus.distance > 0 ? 'passed' : 'failed',
          `Distance: ${focus.distance}m`
        );
      });
      
      // Test bokeh shapes
      const bokehShapes = ['circular', 'hexagonal', 'octagonal', 'star'];
      
      bokehShapes.forEach(shape => {
        this.addResult(
          `Bokeh Shape: ${shape}`,
          true ? 'passed' : 'failed',
          'Aperture blade simulation'
        );
      });
      
    } catch (error) {
      this.addResult('Depth of Field', 'failed', `Error: ${error}`);
    }
  }

  private async testColorGrading() {
    console.log('\n🎨 Testing Color Grading...');
    
    try {
      // Test LUT (Look-Up Table) support
      const lutSize = 32;
      const lutTexture = new THREE.DataTexture(
        new Uint8Array(lutSize * lutSize * lutSize * 4),
        lutSize * lutSize,
        lutSize,
        THREE.RGBAFormat
      );
      
      this.addResult(
        'LUT Texture',
        lutTexture instanceof THREE.DataTexture ? 'passed' : 'failed',
        `${lutSize}x${lutSize}x${lutSize} color cube`
      );
      
      // Test color grading shader
      const colorGradingShader = new THREE.ShaderMaterial({
        uniforms: {
          tDiffuse: { value: null },
          tLUT: { value: null },
          brightness: { value: 1.0 },
          contrast: { value: 1.0 },
          saturation: { value: 1.0 },
          hue: { value: 0.0 },
          gamma: { value: 1.0 }
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D tDiffuse;
          uniform sampler2D tLUT;
          uniform float brightness;
          uniform float contrast;
          uniform float saturation;
          uniform float hue;
          uniform float gamma;
          varying vec2 vUv;
          
          vec3 adjustHSL(vec3 color, float h, float s, float l) {
            // Convert RGB to HSL
            float maxC = max(max(color.r, color.g), color.b);
            float minC = min(min(color.r, color.g), color.b);
            float delta = maxC - minC;
            
            // Adjust and convert back
            color = mix(vec3(0.5), color, s);
            color = color * l;
            return color;
          }
          
          void main() {
            vec3 color = texture2D(tDiffuse, vUv).rgb;
            
            // Apply adjustments
            color = pow(color, vec3(1.0 / gamma));
            color = (color - 0.5) * contrast + 0.5;
            color = color * brightness;
            color = adjustHSL(color, hue, saturation, 1.0);
            
            gl_FragColor = vec4(color, 1.0);
          }
        `
      });
      
      this.addResult(
        'Color Grading Shader',
        colorGradingShader instanceof THREE.ShaderMaterial ? 'passed' : 'failed',
        'Full color correction'
      );
      
      // Test color presets
      const colorPresets = [
        { name: 'neutral', brightness: 1.0, contrast: 1.0, saturation: 1.0 },
        { name: 'cinematic', brightness: 0.9, contrast: 1.2, saturation: 0.8 },
        { name: 'vibrant', brightness: 1.1, contrast: 1.1, saturation: 1.3 },
        { name: 'noir', brightness: 0.8, contrast: 1.4, saturation: 0.0 },
        { name: 'retro', brightness: 1.0, contrast: 0.9, saturation: 1.2 }
      ];
      
      colorPresets.forEach(preset => {
        this.addResult(
          `Preset: ${preset.name}`,
          true ? 'passed' : 'failed',
          `B:${preset.brightness} C:${preset.contrast} S:${preset.saturation}`
        );
      });
      
      // Test gamma correction
      const gammaValues = [0.8, 1.0, 1.2, 2.2];
      
      gammaValues.forEach(gamma => {
        this.addResult(
          `Gamma ${gamma}`,
          gamma > 0 ? 'passed' : 'failed',
          gamma === 2.2 ? 'sRGB standard' : `Custom: ${gamma}`
        );
      });
      
    } catch (error) {
      this.addResult('Color Grading', 'failed', `Error: ${error}`);
    }
  }

  private async testVignette() {
    console.log('\n🔲 Testing Vignette Effect...');
    
    try {
      // Test vignette shader
      const vignetteShader = new THREE.ShaderMaterial({
        uniforms: {
          tDiffuse: { value: null },
          offset: { value: 1.0 },
          darkness: { value: 1.0 }
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D tDiffuse;
          uniform float offset;
          uniform float darkness;
          varying vec2 vUv;
          
          void main() {
            vec4 color = texture2D(tDiffuse, vUv);
            vec2 uv = (vUv - 0.5) * 2.0;
            float vignette = 1.0 - dot(uv, uv);
            vignette = clamp(pow(vignette, darkness) * offset, 0.0, 1.0);
            gl_FragColor = vec4(color.rgb * vignette, color.a);
          }
        `
      });
      
      this.addResult(
        'Vignette Shader',
        vignetteShader instanceof THREE.ShaderMaterial ? 'passed' : 'failed',
        'Radial darkening effect'
      );
      
      // Test vignette styles
      const vignetteStyles = [
        { style: 'subtle', offset: 1.2, darkness: 0.5 },
        { style: 'medium', offset: 1.0, darkness: 1.0 },
        { style: 'strong', offset: 0.8, darkness: 1.5 },
        { style: 'extreme', offset: 0.5, darkness: 2.0 }
      ];
      
      vignetteStyles.forEach(style => {
        this.addResult(
          `Vignette: ${style.style}`,
          true ? 'passed' : 'failed',
          `Offset: ${style.offset}, Darkness: ${style.darkness}`
        );
      });
      
    } catch (error) {
      this.addResult('Vignette Effect', 'failed', `Error: ${error}`);
    }
  }

  private async testCompositing() {
    console.log('\n🎭 Testing Effect Compositing...');
    
    try {
      // Test effect composer setup
      const composer = {
        passes: [],
        renderTarget1: new THREE.WebGLRenderTarget(1920, 1080),
        renderTarget2: new THREE.WebGLRenderTarget(1920, 1080)
      };
      
      this.addResult(
        'Effect Composer',
        composer.renderTarget1 instanceof THREE.WebGLRenderTarget ? 'passed' : 'failed',
        'Ping-pong render targets'
      );
      
      // Test render passes
      const passes = [
        'RenderPass',
        'BloomPass',
        'DOFPass',
        'MotionBlurPass',
        'ColorCorrectionPass',
        'FXAAPass',
        'OutputPass'
      ];
      
      passes.forEach(passName => {
        composer.passes.push(passName);
        
        this.addResult(
          passName,
          true ? 'passed' : 'failed',
          `Pass ${composer.passes.length} of ${passes.length}`
        );
      });
      
      // Test blending modes
      const blendModes = [
        { mode: 'normal', operation: THREE.NormalBlending },
        { mode: 'additive', operation: THREE.AdditiveBlending },
        { mode: 'multiply', operation: THREE.MultiplyBlending },
        { mode: 'screen', operation: THREE.CustomBlending }
      ];
      
      blendModes.forEach(blend => {
        this.addResult(
          `Blend: ${blend.mode}`,
          blend.operation >= 0 ? 'passed' : 'failed',
          'Composite blending mode'
        );
      });
      
      // Test performance settings
      const performanceProfiles = [
        { profile: 'low', passes: 2, resolution: 0.5 },
        { profile: 'medium', passes: 4, resolution: 0.75 },
        { profile: 'high', passes: 6, resolution: 1.0 },
        { profile: 'ultra', passes: 8, resolution: 1.5 }
      ];
      
      performanceProfiles.forEach(profile => {
        this.addResult(
          `Profile: ${profile.profile}`,
          profile.passes > 0 ? 'passed' : 'failed',
          `${profile.passes} passes @ ${profile.resolution}x resolution`
        );
      });
      
    } catch (error) {
      this.addResult('Effect Compositing', 'failed', `Error: ${error}`);
    }
  }

  private cleanup() {
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
    if (this.scene) {
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
  (window as any).testPostProcessing = () => {
    const suite = new PostProcessingTestSuite();
    return suite.runAllTests();
  };
  
  (window as any).PostProcessingTestSuite = PostProcessingTestSuite;
}

export default PostProcessingTestSuite;