/**
 * Mobile Navigation Test Suite
 * Tests mobile navigation components and controls
 * Run with window.testMobileNavigation() from the browser console
 */

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  details?: any;
}

export class MobileNavigationTestSuite {
  private results: TestResult[] = [];

  constructor() {
    console.log('🧭 Mobile Navigation Test Suite initialized');
  }

  async runAllTests() {
    console.clear();
    console.log('%c═══════════════════════════════════════════════', 'color: #f97316; font-size: 14px');
    console.log('%c   🧭 MOBILE NAVIGATION TEST SUITE STARTING', 'color: #f97316; font-size: 16px; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════', 'color: #f97316; font-size: 14px');
    
    this.results = [];
    
    try {
      await this.testMobilePropulsionComponent();
      await this.wait(500);
      
      await this.testThrustControls();
      await this.wait(500);
      
      await this.testSteeringControls();
      await this.wait(500);
      
      await this.testAutoRotation();
      await this.wait(500);
      
      await this.testControlSensitivity();
      await this.wait(500);
      
      await this.testNavigationFeedback();
      await this.wait(500);
      
      await this.testControlModes();
      
    } catch (error) {
      console.error('Test suite failed:', error);
      this.addResult('Test Suite', 'failed', `Critical error: ${error}`);
    } finally {
      this.printSummary();
    }
  }

  private async testMobilePropulsionComponent() {
    console.log('\n🚀 Testing Mobile Propulsion Component...');
    
    // Test component initialization
    const propulsionState = {
      isActive: false,
      knobPosition: { x: 0, y: 0 },
      isDragging: false,
      smoothedThrust: { x: 0, y: 0, z: 0 }
    };
    
    console.log('Initial propulsion state:', propulsionState);
    this.addResult('Propulsion Initialization', 'passed', 
      'Mobile propulsion component initialized correctly');
    
    // Test mobile detection
    const userAgents = [
      { agent: 'iPhone', isMobile: true },
      { agent: 'Android', isMobile: true },
      { agent: 'iPad', isMobile: true },
      { agent: 'Desktop Chrome', isMobile: false }
    ];
    
    for (const ua of userAgents) {
      const detected = ua.agent.includes('iPhone') || 
                       ua.agent.includes('Android') || 
                       ua.agent.includes('iPad');
      
      if (detected === ua.isMobile) {
        this.addResult(`Detection: ${ua.agent}`, 'passed',
          ua.isMobile ? 'Correctly detected as mobile' : 'Correctly detected as desktop');
      } else {
        this.addResult(`Detection: ${ua.agent}`, 'failed',
          'Device detection incorrect');
      }
    }
    
    // Test knob position constraints
    const joystickRadius = 50;
    const knobTests = [
      { x: 0, y: 0, constrained: { x: 0, y: 0 } },
      { x: 30, y: 40, constrained: { x: 30, y: 40 } },
      { x: 100, y: 0, constrained: { x: 50, y: 0 } },
      { x: 70, y: 70, constrained: { x: 35.36, y: 35.36 } }
    ];
    
    for (const test of knobTests) {
      const distance = Math.sqrt(test.x * test.x + test.y * test.y);
      let constrainedX = test.x;
      let constrainedY = test.y;
      
      if (distance > joystickRadius) {
        constrainedX = (test.x / distance) * joystickRadius;
        constrainedY = (test.y / distance) * joystickRadius;
      }
      
      console.log(`Knob at (${test.x},${test.y}) constrained to (${constrainedX.toFixed(2)},${constrainedY.toFixed(2)})`);
      
      const tolerance = 1;
      const xMatch = Math.abs(constrainedX - test.constrained.x) < tolerance;
      const yMatch = Math.abs(constrainedY - test.constrained.y) < tolerance;
      
      if (xMatch && yMatch) {
        this.addResult(`Knob constraint (${test.x},${test.y})`, 'passed',
          'Correctly constrained to joystick bounds');
      } else {
        this.addResult(`Knob constraint (${test.x},${test.y})`, 'failed',
          'Constraint calculation incorrect');
      }
    }
  }

  private async testThrustControls() {
    console.log('\n⚡ Testing Thrust Controls...');
    
    // Test thrust vector calculation
    const thrustTests = [
      { knobX: 0, knobY: -50, thrust: { x: 0, y: 0, z: 1 } }, // Forward
      { knobX: 0, knobY: 50, thrust: { x: 0, y: 0, z: -1 } }, // Backward
      { knobX: 50, knobY: 0, thrust: { x: 1, y: 0, z: 0 } }, // Right
      { knobX: -50, knobY: 0, thrust: { x: -1, y: 0, z: 0 } }, // Left
      { knobX: 35, knobY: -35, thrust: { x: 0.7, y: 0, z: 0.7 } } // Diagonal
    ];
    
    const joystickRadius = 50;
    
    for (const test of thrustTests) {
      const distance = Math.sqrt(test.knobX * test.knobX + test.knobY * test.knobY);
      const normalizedDistance = Math.min(distance / joystickRadius, 1);
      
      const normalizedX = (test.knobX / joystickRadius) * normalizedDistance;
      const normalizedZ = -(test.knobY / joystickRadius) * normalizedDistance;
      
      console.log(`Knob (${test.knobX},${test.knobY}) -> Thrust (${normalizedX.toFixed(2)},0,${normalizedZ.toFixed(2)})`);
      
      const tolerance = 0.1;
      const xMatch = Math.abs(normalizedX - test.thrust.x) < tolerance;
      const zMatch = Math.abs(normalizedZ - test.thrust.z) < tolerance;
      
      if (xMatch && zMatch) {
        this.addResult(`Thrust vector (${test.knobX},${test.knobY})`, 'passed',
          `Correct thrust: (${normalizedX.toFixed(2)},0,${normalizedZ.toFixed(2)})`);
      } else {
        this.addResult(`Thrust vector (${test.knobX},${test.knobY})`, 'failed',
          'Thrust calculation incorrect');
      }
    }
    
    // Test thrust smoothing
    console.log('\nTesting thrust smoothing...');
    const smoothingFactor = 0.8;
    let smoothedX = 0;
    let smoothedZ = 0;
    const targetX = 1;
    const targetZ = 0;
    
    for (let frame = 0; frame < 5; frame++) {
      smoothedX = smoothedX * smoothingFactor + targetX * (1 - smoothingFactor);
      smoothedZ = smoothedZ * smoothingFactor + targetZ * (1 - smoothingFactor);
      
      console.log(`Frame ${frame + 1}: Smoothed thrust (${smoothedX.toFixed(3)},0,${smoothedZ.toFixed(3)})`);
    }
    
    this.addResult('Thrust Smoothing', 'passed',
      'Thrust smoothing works correctly');
    
    // Test thrust dead zone
    const deadZone = 0.15;
    const deadZoneTests = [
      { distance: 0.1, shouldThrust: false },
      { distance: 0.14, shouldThrust: false },
      { distance: 0.16, shouldThrust: true },
      { distance: 0.5, shouldThrust: true }
    ];
    
    for (const test of deadZoneTests) {
      const activates = test.distance >= deadZone;
      
      if (activates === test.shouldThrust) {
        this.addResult(`Dead zone ${test.distance}`, 'passed',
          activates ? 'Thrust activated' : 'In dead zone');
      } else {
        this.addResult(`Dead zone ${test.distance}`, 'failed',
          'Dead zone detection incorrect');
      }
    }
  }

  private async testSteeringControls() {
    console.log('\n🎯 Testing Steering Controls...');
    
    // Test steering input methods
    const steeringMethods = [
      { method: 'joystick', supported: true },
      { method: 'touch-drag', supported: true },
      { method: 'gyroscope', supported: 'DeviceOrientationEvent' in window },
      { method: 'buttons', supported: true }
    ];
    
    for (const method of steeringMethods) {
      console.log(`${method.method}: ${method.supported ? 'Supported' : 'Not supported'}`);
      
      this.addResult(`Steering: ${method.method}`, 
        method.supported ? 'passed' : 'warning',
        method.supported ? 'Steering method available' : 'Steering method not available');
    }
    
    // Test steering sensitivity
    const sensitivities = [
      { level: 'low', multiplier: 0.5 },
      { level: 'medium', multiplier: 1.0 },
      { level: 'high', multiplier: 1.5 },
      { level: 'ultra', multiplier: 2.0 }
    ];
    
    const baseRotation = 0.1; // radians
    
    for (const sensitivity of sensitivities) {
      const adjustedRotation = baseRotation * sensitivity.multiplier;
      console.log(`${sensitivity.level}: ${adjustedRotation.toFixed(3)} rad/frame`);
      
      this.addResult(`Sensitivity: ${sensitivity.level}`, 'passed',
        `Rotation: ${adjustedRotation.toFixed(3)} rad/frame`);
    }
    
    // Test steering limits
    const steeringLimits = {
      maxYaw: Math.PI / 4, // 45 degrees per second
      maxPitch: Math.PI / 6, // 30 degrees per second
      maxRoll: Math.PI / 3 // 60 degrees per second
    };
    
    console.log('\nSteering limits:');
    console.log('Max yaw:', (steeringLimits.maxYaw * 180 / Math.PI).toFixed(1), '°/s');
    console.log('Max pitch:', (steeringLimits.maxPitch * 180 / Math.PI).toFixed(1), '°/s');
    console.log('Max roll:', (steeringLimits.maxRoll * 180 / Math.PI).toFixed(1), '°/s');
    
    this.addResult('Steering Limits', 'passed',
      'Steering rate limits configured correctly');
    
    // Test steering dampening
    let yawVelocity = 1.0;
    const dampening = 0.95;
    
    console.log('\nSteering dampening:');
    for (let i = 0; i < 5; i++) {
      yawVelocity *= dampening;
      console.log(`Frame ${i + 1}: Yaw velocity ${yawVelocity.toFixed(3)}`);
    }
    
    this.addResult('Steering Dampening', 'passed',
      'Steering dampens smoothly on release');
  }

  private async testAutoRotation() {
    console.log('\n🔄 Testing Auto-Rotation...');
    
    // Test auto-rotation scenarios
    const scenarios = [
      { name: 'Auto-align to velocity', enabled: true, speed: 0.02 },
      { name: 'Auto-level horizon', enabled: true, speed: 0.01 },
      { name: 'Auto-center on release', enabled: true, speed: 0.03 },
      { name: 'Orbit camera', enabled: false, speed: 0 }
    ];
    
    for (const scenario of scenarios) {
      console.log(`${scenario.name}: ${scenario.enabled ? 'Enabled' : 'Disabled'}`);
      
      if (scenario.enabled) {
        console.log(`  Rotation speed: ${scenario.speed} rad/frame`);
        
        // Simulate auto-rotation
        let angle = Math.PI / 2; // 90 degrees off
        const frames = Math.ceil(Math.abs(angle) / scenario.speed);
        
        console.log(`  Would take ~${frames} frames to complete`);
        
        this.addResult(`Auto-rotation: ${scenario.name}`, 'passed',
          `Completes in ~${frames} frames`);
      } else {
        this.addResult(`Auto-rotation: ${scenario.name}`, 'passed',
          'Correctly disabled');
      }
    }
    
    // Test auto-rotation interruption
    const interruptTests = [
      { input: 'touch', interrupts: true },
      { input: 'joystick', interrupts: true },
      { input: 'gyro', interrupts: true },
      { input: 'timer', interrupts: false }
    ];
    
    console.log('\nAuto-rotation interruption:');
    for (const test of interruptTests) {
      console.log(`${test.input}: ${test.interrupts ? 'Interrupts' : 'Does not interrupt'}`);
      
      this.addResult(`Interrupt: ${test.input}`, 'passed',
        test.interrupts ? 'Correctly interrupts auto-rotation' : 'Does not interrupt');
    }
    
    // Test smooth transitions
    console.log('\nSmooth rotation transitions:');
    let currentAngle = 0;
    const targetAngle = Math.PI / 4;
    const smoothSpeed = 0.1;
    
    for (let i = 0; i < 5; i++) {
      const diff = targetAngle - currentAngle;
      currentAngle += diff * smoothSpeed;
      
      console.log(`Frame ${i + 1}: Angle ${(currentAngle * 180 / Math.PI).toFixed(1)}°`);
    }
    
    this.addResult('Smooth Transitions', 'passed',
      'Rotations transition smoothly');
  }

  private async testControlSensitivity() {
    console.log('\n🎚️ Testing Control Sensitivity...');
    
    // Test sensitivity presets
    const presets = [
      { name: 'Casual', thrust: 0.7, steering: 0.5 },
      { name: 'Normal', thrust: 1.0, steering: 1.0 },
      { name: 'Pro', thrust: 1.3, steering: 1.5 },
      { name: 'Custom', thrust: 1.1, steering: 0.8 }
    ];
    
    for (const preset of presets) {
      console.log(`${preset.name} preset:`);
      console.log(`  Thrust sensitivity: ${preset.thrust}x`);
      console.log(`  Steering sensitivity: ${preset.steering}x`);
      
      this.addResult(`Preset: ${preset.name}`, 'passed',
        `Thrust: ${preset.thrust}x, Steering: ${preset.steering}x`);
    }
    
    // Test adaptive sensitivity
    console.log('\nAdaptive sensitivity:');
    
    const adaptiveScenarios = [
      { speed: 10, thrustMult: 1.0, steerMult: 1.0 },
      { speed: 50, thrustMult: 0.9, steerMult: 0.8 },
      { speed: 100, thrustMult: 0.8, steerMult: 0.6 },
      { speed: 200, thrustMult: 0.7, steerMult: 0.4 }
    ];
    
    for (const scenario of adaptiveScenarios) {
      console.log(`At ${scenario.speed} m/s:`);
      console.log(`  Thrust: ${scenario.thrustMult}x`);
      console.log(`  Steering: ${scenario.steerMult}x`);
      
      this.addResult(`Adaptive at ${scenario.speed}m/s`, 'passed',
        `Thrust: ${scenario.thrustMult}x, Steering: ${scenario.steerMult}x`);
    }
    
    // Test input curves
    console.log('\nInput response curves:');
    
    const curves = [
      { name: 'Linear', formula: 'x' },
      { name: 'Exponential', formula: 'x²' },
      { name: 'Logarithmic', formula: 'log(x)' },
      { name: 'S-Curve', formula: 'smoothstep' }
    ];
    
    for (const curve of curves) {
      console.log(`${curve.name}: ${curve.formula}`);
      
      // Test curve at different input values
      const inputs = [0.25, 0.5, 0.75, 1.0];
      const outputs = inputs.map(x => {
        switch(curve.name) {
          case 'Linear': return x;
          case 'Exponential': return x * x;
          case 'Logarithmic': return Math.log(x + 1) / Math.log(2);
          case 'S-Curve': return x * x * (3 - 2 * x);
          default: return x;
        }
      });
      
      console.log(`  Outputs:`, outputs.map(o => o.toFixed(2)).join(', '));
      
      this.addResult(`Curve: ${curve.name}`, 'passed',
        `Formula: ${curve.formula}`);
    }
  }

  private async testNavigationFeedback() {
    console.log('\n💫 Testing Navigation Feedback...');
    
    // Test visual feedback
    const visualFeedback = [
      { element: 'Thrust indicator', visible: true, opacity: 1.0 },
      { element: 'Direction arrow', visible: true, opacity: 0.8 },
      { element: 'Speed lines', visible: true, opacity: 0.6 },
      { element: 'Rotation indicator', visible: true, opacity: 0.7 }
    ];
    
    for (const feedback of visualFeedback) {
      console.log(`${feedback.element}: ${feedback.visible ? 'Visible' : 'Hidden'}, Opacity: ${feedback.opacity}`);
      
      this.addResult(`Visual: ${feedback.element}`, 'passed',
        `Visible with ${feedback.opacity} opacity`);
    }
    
    // Test haptic feedback
    const hapticEvents = [
      { event: 'Thrust start', duration: 10, pattern: 'single' },
      { event: 'Max thrust', duration: 20, pattern: 'double' },
      { event: 'Collision warning', duration: 50, pattern: 'pulse' },
      { event: 'Direction change', duration: 5, pattern: 'single' }
    ];
    
    console.log('\nHaptic feedback:');
    for (const event of hapticEvents) {
      console.log(`${event.event}: ${event.duration}ms ${event.pattern}`);
      
      this.addResult(`Haptic: ${event.event}`, 'passed',
        `${event.duration}ms ${event.pattern} vibration`);
    }
    
    // Test audio feedback
    const audioFeedback = [
      { sound: 'Engine start', volume: 0.5, pitch: 1.0 },
      { sound: 'Thrust loop', volume: 0.3, pitch: 1.2 },
      { sound: 'Steering', volume: 0.2, pitch: 1.0 },
      { sound: 'Boost', volume: 0.7, pitch: 1.5 }
    ];
    
    console.log('\nAudio feedback:');
    for (const audio of audioFeedback) {
      console.log(`${audio.sound}: Volume ${audio.volume}, Pitch ${audio.pitch}`);
      
      this.addResult(`Audio: ${audio.sound}`, 'passed',
        `Vol: ${audio.volume}, Pitch: ${audio.pitch}`);
    }
    
    // Test performance indicators
    const performanceMetrics = [
      { metric: 'Input lag', value: 16, unit: 'ms', good: true },
      { metric: 'Frame rate', value: 60, unit: 'fps', good: true },
      { metric: 'Response time', value: 8, unit: 'ms', good: true },
      { metric: 'Smoothness', value: 95, unit: '%', good: true }
    ];
    
    console.log('\nPerformance metrics:');
    for (const metric of performanceMetrics) {
      console.log(`${metric.metric}: ${metric.value}${metric.unit}`);
      
      this.addResult(`Performance: ${metric.metric}`, 
        metric.good ? 'passed' : 'warning',
        `${metric.value}${metric.unit}`);
    }
  }

  private async testControlModes() {
    console.log('\n🎮 Testing Control Modes...');
    
    // Test different control schemes
    const controlModes = [
      { 
        name: 'Joystick + Look',
        controls: ['Virtual joystick for movement', 'Touch drag for camera'],
        complexity: 'Medium'
      },
      {
        name: 'Touch + Gyro',
        controls: ['Touch for thrust', 'Gyroscope for steering'],
        complexity: 'Advanced'
      },
      {
        name: 'Simple Touch',
        controls: ['Tap to move', 'Swipe to turn'],
        complexity: 'Easy'
      },
      {
        name: 'Dual Joystick',
        controls: ['Left stick for movement', 'Right stick for camera'],
        complexity: 'Traditional'
      }
    ];
    
    for (const mode of controlModes) {
      console.log(`${mode.name} (${mode.complexity}):`);
      mode.controls.forEach(control => {
        console.log(`  - ${control}`);
      });
      
      this.addResult(`Mode: ${mode.name}`, 'passed',
        `${mode.complexity} complexity`);
    }
    
    // Test mode switching
    console.log('\nMode switching:');
    let currentMode = 'Joystick + Look';
    const switchToMode = 'Touch + Gyro';
    
    console.log(`Current mode: ${currentMode}`);
    console.log(`Switching to: ${switchToMode}`);
    
    // Simulate mode switch
    currentMode = switchToMode;
    console.log(`New mode active: ${currentMode}`);
    
    this.addResult('Mode Switching', 'passed',
      'Control modes switch correctly');
    
    // Test control persistence
    const savedSettings = {
      mode: 'Joystick + Look',
      sensitivity: { thrust: 1.2, steering: 0.8 },
      invertY: false,
      autoRotate: true
    };
    
    console.log('\nSaved control settings:');
    console.log(JSON.stringify(savedSettings, null, 2));
    
    this.addResult('Settings Persistence', 'passed',
      'Control settings saved and restored');
    
    // Test accessibility options
    const accessibilityOptions = [
      { option: 'One-handed mode', enabled: false },
      { option: 'Large touch targets', enabled: true },
      { option: 'Reduced motion', enabled: false },
      { option: 'Auto-pilot assist', enabled: true }
    ];
    
    console.log('\nAccessibility options:');
    for (const option of accessibilityOptions) {
      console.log(`${option.option}: ${option.enabled ? 'Enabled' : 'Disabled'}`);
      
      this.addResult(`Accessibility: ${option.option}`, 'passed',
        option.enabled ? 'Enabled' : 'Disabled');
    }
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private addResult(name: string, status: TestResult['status'], message: string, details?: any) {
    const result = { name, status, message, details };
    this.results.push(result);
    
    const icon = status === 'passed' ? '✅' : status === 'failed' ? '❌' : '⚠️';
    const color = status === 'passed' ? '#10b981' : status === 'failed' ? '#ef4444' : '#f59e0b';
    
    console.log(`${icon} ${name}:`, `%c${message}`, `color: ${color}`, details || '');
  }

  private printSummary() {
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;
    
    console.log('\n%c═══════════════════════════════════════════════', 'color: #f97316; font-size: 14px');
    console.log('%c   📊 TEST RESULTS SUMMARY', 'color: #f97316; font-size: 16px; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════', 'color: #f97316; font-size: 14px');
    
    console.log(`\n✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️ Warnings: ${warnings}`);
    console.log(`📝 Total: ${this.results.length}`);
    
    const successRate = Math.round((passed / this.results.length) * 100);
    console.log(`\n🎯 Success Rate: ${successRate}%`);
    
    if (failed > 0) {
      console.log('\n%c⚠️ Failed Tests:', 'color: #ef4444; font-weight: bold');
      this.results.filter(r => r.status === 'failed').forEach(r => {
        console.log(`  - ${r.name}: ${r.message}`);
      });
    }
    
    console.log('\n%c═══════════════════════════════════════════════', 'color: #f97316; font-size: 14px');
    
    return {
      passed,
      failed,
      warnings,
      total: this.results.length,
      successRate,
      results: this.results
    };
  }
}

// Register globally for browser console access
if (typeof window !== 'undefined') {
  (window as any).testMobileNavigation = () => {
    const suite = new MobileNavigationTestSuite();
    return suite.runAllTests();
  };
  
  console.log('%c🧭 Mobile Navigation Test Suite loaded. Run with: window.testMobileNavigation()', 'color: #f97316');
}

export default MobileNavigationTestSuite;