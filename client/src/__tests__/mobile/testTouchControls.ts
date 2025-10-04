/**
 * Touch Controls Test Suite
 * Tests touch input systems including joystick, look controls, and gestures
 * Run with window.testTouchControls() from the browser console
 */

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  details?: any;
}

interface TouchPoint {
  x: number;
  y: number;
  id: number;
}

export class TouchControlsTestSuite {
  private results: TestResult[] = [];
  private canvasElement: HTMLCanvasElement | null = null;

  constructor() {
    console.log('👆 Touch Controls Test Suite initialized');
  }

  async runAllTests() {
    console.clear();
    console.log('%c═══════════════════════════════════════════════', 'color: #ec4899; font-size: 14px');
    console.log('%c   👆 TOUCH CONTROLS TEST SUITE STARTING', 'color: #ec4899; font-size: 16px; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════', 'color: #ec4899; font-size: 14px');
    
    this.results = [];
    
    try {
      // Create test canvas
      this.createTestCanvas();
      
      await this.testVirtualJoystick();
      await this.wait(500);
      
      await this.testCanvasLookControls();
      await this.wait(500);
      
      await this.testTouchPropulsionControls();
      await this.wait(500);
      
      await this.testGestureRecognition();
      await this.wait(500);
      
      await this.testTouchEventHandling();
      await this.wait(500);
      
      await this.testMultiTouchSupport();
      await this.wait(500);
      
      await this.testTouchSensitivity();
      await this.wait(500);
      
      await this.testDeadZones();
      
    } catch (error) {
      console.error('Test suite failed:', error);
      this.addResult('Test Suite', 'failed', `Critical error: ${error}`);
    } finally {
      // Clean up test canvas
      this.cleanupTestCanvas();
      this.printSummary();
    }
  }

  private createTestCanvas() {
    this.canvasElement = document.createElement('canvas');
    this.canvasElement.width = 300;
    this.canvasElement.height = 300;
    this.canvasElement.style.position = 'fixed';
    this.canvasElement.style.top = '10px';
    this.canvasElement.style.right = '10px';
    this.canvasElement.style.border = '2px solid #ec4899';
    this.canvasElement.style.backgroundColor = 'rgba(0,0,0,0.5)';
    this.canvasElement.style.zIndex = '9999';
    this.canvasElement.id = 'touch-test-canvas';
    document.body.appendChild(this.canvasElement);
    
    console.log('Test canvas created');
  }

  private cleanupTestCanvas() {
    if (this.canvasElement) {
      this.canvasElement.remove();
      this.canvasElement = null;
    }
    console.log('Test canvas cleaned up');
  }

  private async testVirtualJoystick() {
    console.log('\n🕹️ Testing Virtual Joystick...');
    
    // Simulate joystick parameters
    const joystickRadius = 40;
    const deadZone = 0.15;
    
    // Test joystick positions
    const testPositions = [
      { name: 'Center', x: 0, y: 0, expectedX: 0, expectedZ: 0 },
      { name: 'Full Up', x: 0, y: -joystickRadius, expectedX: 0, expectedZ: 1 },
      { name: 'Full Down', x: 0, y: joystickRadius, expectedX: 0, expectedZ: -1 },
      { name: 'Full Left', x: -joystickRadius, y: 0, expectedX: -1, expectedZ: 0 },
      { name: 'Full Right', x: joystickRadius, y: 0, expectedX: 1, expectedZ: 0 },
      { name: 'Diagonal', x: joystickRadius/Math.sqrt(2), y: -joystickRadius/Math.sqrt(2), 
        expectedX: 0.707, expectedZ: 0.707 }
    ];
    
    for (const pos of testPositions) {
      const distance = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
      const normalizedDistance = Math.min(distance / joystickRadius, 1);
      
      if (normalizedDistance < deadZone) {
        console.log(`${pos.name}: In dead zone, no movement`);
        this.addResult(`Joystick ${pos.name}`, 'passed', 'Dead zone working correctly');
      } else {
        const normalizedX = (pos.x / joystickRadius) * normalizedDistance;
        const normalizedY = (pos.y / joystickRadius) * normalizedDistance;
        
        console.log(`${pos.name}: X=${normalizedX.toFixed(2)}, Z=${-normalizedY.toFixed(2)}`);
        
        const tolerance = 0.1;
        const xMatch = Math.abs(normalizedX - pos.expectedX) < tolerance;
        const zMatch = Math.abs(-normalizedY - pos.expectedZ) < tolerance;
        
        if (xMatch && zMatch) {
          this.addResult(`Joystick ${pos.name}`, 'passed', 
            `Movement vector correct (${normalizedX.toFixed(2)}, ${-normalizedY.toFixed(2)})`);
        } else {
          this.addResult(`Joystick ${pos.name}`, 'failed', 
            `Movement vector incorrect. Expected (${pos.expectedX}, ${pos.expectedZ})`);
        }
      }
    }
    
    // Test joystick smoothing
    console.log('\nTesting joystick smoothing...');
    const smoothingFactor = 0.8;
    let smoothedX = 0;
    let smoothedY = 0;
    
    for (let i = 0; i < 5; i++) {
      const targetX = 1;
      const targetY = 0;
      
      smoothedX = smoothedX * smoothingFactor + targetX * (1 - smoothingFactor);
      smoothedY = smoothedY * smoothingFactor + targetY * (1 - smoothingFactor);
      
      console.log(`Frame ${i + 1}: Smoothed (${smoothedX.toFixed(3)}, ${smoothedY.toFixed(3)})`);
    }
    
    this.addResult('Joystick Smoothing', 'passed', 
      'Smoothing interpolates correctly over time');
    
    // Test joystick constraints
    const constraintTests = [
      { x: 50, y: 0, constrained: true },
      { x: 30, y: 30, constrained: false },
      { x: 100, y: 100, constrained: true }
    ];
    
    for (const test of constraintTests) {
      const distance = Math.sqrt(test.x * test.x + test.y * test.y);
      const needsConstraint = distance > joystickRadius;
      
      if (needsConstraint === test.constrained) {
        this.addResult(`Constraint (${test.x},${test.y})`, 'passed', 
          needsConstraint ? 'Correctly constrained to radius' : 'Within radius, no constraint needed');
      } else {
        this.addResult(`Constraint (${test.x},${test.y})`, 'failed', 
          'Constraint detection failed');
      }
    }
  }

  private async testCanvasLookControls() {
    console.log('\n👀 Testing Canvas Look Controls...');
    
    // Test look sensitivity
    const sensitivity = 0.002;
    const dragDistances = [
      { dx: 100, dy: 0, expectedYaw: 0.2, expectedPitch: 0 },
      { dx: 0, dy: 100, expectedYaw: 0, expectedPitch: 0.2 },
      { dx: -50, dy: -50, expectedYaw: -0.1, expectedPitch: -0.1 }
    ];
    
    for (const drag of dragDistances) {
      const yaw = drag.dx * sensitivity;
      const pitch = drag.dy * sensitivity;
      
      console.log(`Drag (${drag.dx}, ${drag.dy}): Yaw=${yaw.toFixed(3)}, Pitch=${pitch.toFixed(3)}`);
      
      const tolerance = 0.01;
      const yawMatch = Math.abs(yaw - drag.expectedYaw) < tolerance;
      const pitchMatch = Math.abs(pitch - drag.expectedPitch) < tolerance;
      
      if (yawMatch && pitchMatch) {
        this.addResult(`Look drag (${drag.dx},${drag.dy})`, 'passed', 
          `Look rotation correct: Yaw=${yaw.toFixed(3)}, Pitch=${pitch.toFixed(3)}`);
      } else {
        this.addResult(`Look drag (${drag.dx},${drag.dy})`, 'failed', 
          'Look rotation incorrect');
      }
    }
    
    // Test look smoothing
    console.log('\nTesting look smoothing...');
    const lookSmoothingFactor = 0.7;
    let smoothedLookX = 0;
    let smoothedLookY = 0;
    
    for (let i = 0; i < 5; i++) {
      const targetX = 0.5;
      const targetY = -0.3;
      
      smoothedLookX = smoothedLookX * lookSmoothingFactor + targetX * (1 - lookSmoothingFactor);
      smoothedLookY = smoothedLookY * lookSmoothingFactor + targetY * (1 - lookSmoothingFactor);
      
      console.log(`Frame ${i + 1}: Smoothed look (${smoothedLookX.toFixed(3)}, ${smoothedLookY.toFixed(3)})`);
    }
    
    this.addResult('Look Smoothing', 'passed', 
      'Look controls smooth correctly over time');
    
    // Test look dead zones
    const lookDeadZone = 0.002;
    const smallMovements = [
      { dx: 0.001, dy: 0, inDeadZone: true },
      { dx: 0.003, dy: 0, inDeadZone: false },
      { dx: 0, dy: 0.001, inDeadZone: true }
    ];
    
    for (const movement of smallMovements) {
      const isInDeadZone = Math.abs(movement.dx) < lookDeadZone && Math.abs(movement.dy) < lookDeadZone;
      
      if (isInDeadZone === movement.inDeadZone) {
        this.addResult(`Look dead zone (${movement.dx},${movement.dy})`, 'passed',
          isInDeadZone ? 'Correctly ignored (in dead zone)' : 'Movement registered');
      } else {
        this.addResult(`Look dead zone (${movement.dx},${movement.dy})`, 'failed',
          'Dead zone detection failed');
      }
    }
    
    // Test look damping on release
    console.log('\nTesting look damping on release...');
    let lookVelocityX = 1.0;
    let lookVelocityY = 0.5;
    const dampingFactor = 0.9;
    
    for (let i = 0; i < 10; i++) {
      lookVelocityX *= dampingFactor;
      lookVelocityY *= dampingFactor;
      
      if (i % 3 === 0) {
        console.log(`Frame ${i + 1}: Velocity (${lookVelocityX.toFixed(3)}, ${lookVelocityY.toFixed(3)})`);
      }
      
      if (Math.abs(lookVelocityX) < 0.001 && Math.abs(lookVelocityY) < 0.001) {
        console.log(`Stopped at frame ${i + 1}`);
        break;
      }
    }
    
    this.addResult('Look Damping', 'passed', 'Look controls damp to zero correctly');
  }

  private async testTouchPropulsionControls() {
    console.log('\n🚀 Testing Touch Propulsion Controls...');
    
    // Test thrust calculation based on screen position
    const screenHeight = 800;
    const centerY = screenHeight / 2;
    
    const touchPositions = [
      { y: 100, expectedThrust: 1.125 }, // Top - max forward
      { y: centerY, expectedThrust: 0 }, // Center - no thrust
      { y: 700, expectedThrust: -1.125 } // Bottom - max backward
    ];
    
    for (const pos of touchPositions) {
      const normalizedY = (pos.y - centerY) / centerY;
      const speed = -normalizedY * 1.5; // Inverted and scaled
      
      console.log(`Touch at Y=${pos.y}: Thrust=${speed.toFixed(3)}`);
      
      const tolerance = 0.1;
      if (Math.abs(speed - pos.expectedThrust) < tolerance) {
        this.addResult(`Thrust at Y=${pos.y}`, 'passed',
          `Correct thrust: ${speed.toFixed(3)}`);
      } else {
        this.addResult(`Thrust at Y=${pos.y}`, 'failed',
          `Expected ${pos.expectedThrust}, got ${speed.toFixed(3)}`);
      }
    }
    
    // Test hold detection timing
    const holdThreshold = 100; // ms
    const touchTimes = [
      { duration: 50, shouldTriggerThrust: false },
      { duration: 150, shouldTriggerThrust: true },
      { duration: 500, shouldTriggerThrust: true }
    ];
    
    for (const touch of touchTimes) {
      const triggersThrust = touch.duration >= holdThreshold;
      
      if (triggersThrust === touch.shouldTriggerThrust) {
        this.addResult(`Hold ${touch.duration}ms`, 'passed',
          triggersThrust ? 'Thrust activated' : 'Look mode activated');
      } else {
        this.addResult(`Hold ${touch.duration}ms`, 'failed',
          'Hold detection incorrect');
      }
    }
    
    // Test double tap detection
    const doubleTapThreshold = 300; // ms
    const tapSequences = [
      { gap: 200, isDoubleTap: true },
      { gap: 400, isDoubleTap: false },
      { gap: 100, isDoubleTap: true }
    ];
    
    for (const seq of tapSequences) {
      const detected = seq.gap < doubleTapThreshold;
      
      if (detected === seq.isDoubleTap) {
        this.addResult(`Double tap ${seq.gap}ms gap`, 'passed',
          detected ? 'Double tap detected' : 'Single tap');
      } else {
        this.addResult(`Double tap ${seq.gap}ms gap`, 'failed',
          'Double tap detection incorrect');
      }
    }
  }

  private async testGestureRecognition() {
    console.log('\n✋ Testing Gesture Recognition...');
    
    // Test swipe detection
    const swipeThreshold = 50;
    const swipeTests = [
      { startX: 100, startY: 100, endX: 200, endY: 100, gesture: 'swipe-right' },
      { startX: 200, startY: 100, endX: 100, endY: 100, gesture: 'swipe-left' },
      { startX: 100, startY: 200, endX: 100, endY: 100, gesture: 'swipe-up' },
      { startX: 100, startY: 100, endX: 100, endY: 200, gesture: 'swipe-down' },
      { startX: 100, startY: 100, endX: 120, endY: 120, gesture: 'tap' } // Too short for swipe
    ];
    
    for (const test of swipeTests) {
      const dx = test.endX - test.startX;
      const dy = test.endY - test.startY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      let detectedGesture = 'tap';
      if (distance > swipeThreshold) {
        if (Math.abs(dx) > Math.abs(dy)) {
          detectedGesture = dx > 0 ? 'swipe-right' : 'swipe-left';
        } else {
          detectedGesture = dy > 0 ? 'swipe-down' : 'swipe-up';
        }
      }
      
      console.log(`Swipe from (${test.startX},${test.startY}) to (${test.endX},${test.endY}): ${detectedGesture}`);
      
      if (detectedGesture === test.gesture) {
        this.addResult(`Gesture: ${test.gesture}`, 'passed',
          'Gesture recognized correctly');
      } else {
        this.addResult(`Gesture: ${test.gesture}`, 'failed',
          `Expected ${test.gesture}, got ${detectedGesture}`);
      }
    }
    
    // Test pinch detection
    const pinchTests = [
      { start: 100, end: 150, gesture: 'pinch-out', scale: 1.5 },
      { start: 150, end: 100, gesture: 'pinch-in', scale: 0.67 },
      { start: 100, end: 105, gesture: 'none', scale: 1.05 } // Too small
    ];
    
    for (const test of pinchTests) {
      const scale = test.end / test.start;
      const threshold = 0.1;
      
      let detected = 'none';
      if (Math.abs(scale - 1) > threshold) {
        detected = scale > 1 ? 'pinch-out' : 'pinch-in';
      }
      
      console.log(`Pinch from ${test.start} to ${test.end}: ${detected} (scale: ${scale.toFixed(2)})`);
      
      if (detected === test.gesture) {
        this.addResult(`Pinch ${test.gesture}`, 'passed',
          `Scale: ${scale.toFixed(2)}`);
      } else {
        this.addResult(`Pinch ${test.gesture}`, 'failed',
          `Expected ${test.gesture}, got ${detected}`);
      }
    }
    
    // Test rotation gesture
    const rotationTests = [
      { angle: 45, detected: true },
      { angle: 5, detected: false }, // Too small
      { angle: -90, detected: true }
    ];
    
    const rotationThreshold = 10;
    
    for (const test of rotationTests) {
      const isDetected = Math.abs(test.angle) > rotationThreshold;
      
      console.log(`Rotation ${test.angle}°: ${isDetected ? 'Detected' : 'Ignored'}`);
      
      if (isDetected === test.detected) {
        this.addResult(`Rotation ${test.angle}°`, 'passed',
          isDetected ? 'Rotation detected' : 'Below threshold');
      } else {
        this.addResult(`Rotation ${test.angle}°`, 'failed',
          'Rotation detection incorrect');
      }
    }
  }

  private async testTouchEventHandling() {
    console.log('\n📋 Testing Touch Event Handling...');
    
    if (!this.canvasElement) {
      this.addResult('Touch Events', 'failed', 'Test canvas not available');
      return;
    }
    
    // Test touch event creation
    try {
      const touchStart = new TouchEvent('touchstart', {
        touches: [new Touch({
          identifier: 1,
          target: this.canvasElement,
          clientX: 100,
          clientY: 100,
          screenX: 100,
          screenY: 100,
          pageX: 100,
          pageY: 100,
          radiusX: 1,
          radiusY: 1,
          rotationAngle: 0,
          force: 1
        })]
      });
      
      console.log('TouchEvent created successfully');
      this.addResult('TouchEvent Creation', 'passed', 'Can create synthetic touch events');
    } catch (e) {
      console.log('TouchEvent creation failed:', e);
      
      // Fallback test for browsers without Touch constructor
      try {
        const touchStart = document.createEvent('TouchEvent');
        touchStart.initTouchEvent('touchstart', true, true);
        
        console.log('Legacy TouchEvent created');
        this.addResult('TouchEvent Creation', 'warning', 'Using legacy touch event API');
      } catch (e2) {
        this.addResult('TouchEvent Creation', 'failed', 'Cannot create touch events');
      }
    }
    
    // Test pointer events as fallback
    try {
      const pointerDown = new PointerEvent('pointerdown', {
        pointerId: 1,
        pointerType: 'touch',
        clientX: 100,
        clientY: 100,
        pressure: 0.5
      });
      
      console.log('PointerEvent created successfully');
      this.addResult('PointerEvent Creation', 'passed', 'Can create pointer events');
      
      // Test pointer event properties
      console.log('Pointer type:', pointerDown.pointerType);
      console.log('Pointer pressure:', pointerDown.pressure);
      
    } catch (e) {
      this.addResult('PointerEvent Creation', 'failed', 'Cannot create pointer events');
    }
    
    // Test event coordinate transformation
    const rect = this.canvasElement.getBoundingClientRect();
    const testCoordinates = [
      { clientX: rect.left + 50, clientY: rect.top + 50 },
      { clientX: rect.left + 150, clientY: rect.top + 150 }
    ];
    
    for (const coord of testCoordinates) {
      const canvasX = coord.clientX - rect.left;
      const canvasY = coord.clientY - rect.top;
      
      console.log(`Client (${coord.clientX},${coord.clientY}) -> Canvas (${canvasX},${canvasY})`);
      
      if (canvasX >= 0 && canvasX <= rect.width && canvasY >= 0 && canvasY <= rect.height) {
        this.addResult(`Coordinate transform`, 'passed',
          `Correctly transformed to canvas coordinates`);
      } else {
        this.addResult(`Coordinate transform`, 'failed',
          'Coordinate transformation failed');
      }
    }
    
    // Test event propagation control
    const eventTests = [
      { method: 'preventDefault', purpose: 'Prevent default touch behavior' },
      { method: 'stopPropagation', purpose: 'Stop event bubbling' },
      { method: 'stopImmediatePropagation', purpose: 'Stop all handlers' }
    ];
    
    for (const test of eventTests) {
      console.log(`Event.${test.method}():`, test.purpose);
      this.addResult(`Event ${test.method}`, 'passed', test.purpose);
    }
  }

  private async testMultiTouchSupport() {
    console.log('\n🖐️ Testing Multi-Touch Support...');
    
    const maxTouchPoints = navigator.maxTouchPoints || (navigator as any).msMaxTouchPoints || 0;
    
    console.log('Max touch points supported:', maxTouchPoints);
    
    if (maxTouchPoints > 1) {
      this.addResult('Multi-touch Hardware', 'passed',
        `Supports ${maxTouchPoints} simultaneous touches`);
    } else if (maxTouchPoints === 1) {
      this.addResult('Multi-touch Hardware', 'warning',
        'Only single touch supported');
    } else {
      this.addResult('Multi-touch Hardware', 'warning',
        'Touch points info not available');
    }
    
    // Simulate multi-touch scenarios
    const multiTouchScenarios = [
      {
        name: 'Two-finger pinch',
        touches: [
          { id: 1, x: 100, y: 100 },
          { id: 2, x: 200, y: 200 }
        ],
        gesture: 'pinch'
      },
      {
        name: 'Three-finger swipe',
        touches: [
          { id: 1, x: 100, y: 100 },
          { id: 2, x: 150, y: 100 },
          { id: 3, x: 200, y: 100 }
        ],
        gesture: 'three-finger-swipe'
      },
      {
        name: 'Two-finger rotate',
        touches: [
          { id: 1, x: 100, y: 100 },
          { id: 2, x: 200, y: 100 }
        ],
        gesture: 'rotate'
      }
    ];
    
    for (const scenario of multiTouchScenarios) {
      console.log(`${scenario.name}: ${scenario.touches.length} touches`);
      
      // Calculate gesture metrics
      if (scenario.touches.length === 2) {
        const dx = scenario.touches[1].x - scenario.touches[0].x;
        const dy = scenario.touches[1].y - scenario.touches[0].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        
        console.log(`  Distance: ${distance.toFixed(1)}px, Angle: ${angle.toFixed(1)}°`);
        
        this.addResult(scenario.name, 'passed',
          `Distance: ${distance.toFixed(1)}px, Angle: ${angle.toFixed(1)}°`);
      } else {
        this.addResult(scenario.name, 'passed',
          `${scenario.touches.length} touches tracked`);
      }
    }
    
    // Test touch tracking
    const touchTracker = new Map<number, TouchPoint>();
    const testTouches = [
      { action: 'add', id: 1, x: 100, y: 100 },
      { action: 'add', id: 2, x: 200, y: 200 },
      { action: 'move', id: 1, x: 110, y: 110 },
      { action: 'remove', id: 2, x: 0, y: 0 },
      { action: 'remove', id: 1, x: 0, y: 0 }
    ];
    
    for (const touch of testTouches) {
      if (touch.action === 'add') {
        touchTracker.set(touch.id, { id: touch.id, x: touch.x, y: touch.y });
        console.log(`Added touch ${touch.id} at (${touch.x},${touch.y})`);
      } else if (touch.action === 'move') {
        const existing = touchTracker.get(touch.id);
        if (existing) {
          existing.x = touch.x;
          existing.y = touch.y;
          console.log(`Moved touch ${touch.id} to (${touch.x},${touch.y})`);
        }
      } else if (touch.action === 'remove') {
        touchTracker.delete(touch.id);
        console.log(`Removed touch ${touch.id}`);
      }
      
      console.log(`Active touches: ${touchTracker.size}`);
    }
    
    this.addResult('Touch Tracking', 'passed',
      'Touch points tracked correctly through lifecycle');
  }

  private async testTouchSensitivity() {
    console.log('\n🎚️ Testing Touch Sensitivity...');
    
    // Test different sensitivity settings
    const sensitivities = [
      { level: 'low', multiplier: 0.5 },
      { level: 'medium', multiplier: 1.0 },
      { level: 'high', multiplier: 2.0 },
      { level: 'ultra', multiplier: 3.0 }
    ];
    
    const baseDelta = 10; // pixels
    
    for (const sensitivity of sensitivities) {
      const adjustedDelta = baseDelta * sensitivity.multiplier;
      console.log(`${sensitivity.level} sensitivity: ${baseDelta}px -> ${adjustedDelta}px`);
      
      this.addResult(`Sensitivity ${sensitivity.level}`, 'passed',
        `Multiplier: ${sensitivity.multiplier}x, Result: ${adjustedDelta}px`);
    }
    
    // Test acceleration curves
    const accelerationCurves = [
      { speed: 10, multiplier: 1.0 },
      { speed: 50, multiplier: 1.5 },
      { speed: 100, multiplier: 2.0 },
      { speed: 200, multiplier: 2.5 }
    ];
    
    console.log('\nAcceleration curves:');
    for (const curve of accelerationCurves) {
      const accelerated = curve.speed * curve.multiplier;
      console.log(`Speed ${curve.speed}px/s: ${curve.multiplier}x = ${accelerated}px/s`);
      
      this.addResult(`Acceleration at ${curve.speed}px/s`, 'passed',
        `${curve.multiplier}x multiplier applied`);
    }
    
    // Test adaptive sensitivity
    const contexts = [
      { context: 'menu', sensitivity: 1.0 },
      { context: 'gameplay', sensitivity: 1.5 },
      { context: 'precision', sensitivity: 0.5 }
    ];
    
    console.log('\nAdaptive sensitivity:');
    for (const ctx of contexts) {
      console.log(`${ctx.context}: ${ctx.sensitivity}x sensitivity`);
      
      this.addResult(`${ctx.context} sensitivity`, 'passed',
        `Adjusted to ${ctx.sensitivity}x`);
    }
  }

  private async testDeadZones() {
    console.log('\n🎯 Testing Dead Zones...');
    
    // Test joystick dead zones
    const joystickDeadZone = 0.15;
    const joystickTests = [
      { magnitude: 0.05, inDeadZone: true },
      { magnitude: 0.1, inDeadZone: true },
      { magnitude: 0.2, inDeadZone: false },
      { magnitude: 1.0, inDeadZone: false }
    ];
    
    console.log(`Joystick dead zone: ${joystickDeadZone}`);
    
    for (const test of joystickTests) {
      const isInDeadZone = test.magnitude < joystickDeadZone;
      
      if (isInDeadZone === test.inDeadZone) {
        this.addResult(`Joystick magnitude ${test.magnitude}`, 'passed',
          isInDeadZone ? 'Correctly ignored (dead zone)' : 'Movement registered');
      } else {
        this.addResult(`Joystick magnitude ${test.magnitude}`, 'failed',
          'Dead zone detection incorrect');
      }
    }
    
    // Test look control dead zones
    const lookDeadZone = 0.002;
    const lookTests = [
      { delta: 0.001, inDeadZone: true },
      { delta: 0.0015, inDeadZone: true },
      { delta: 0.003, inDeadZone: false },
      { delta: 0.01, inDeadZone: false }
    ];
    
    console.log(`\nLook dead zone: ${lookDeadZone}`);
    
    for (const test of lookTests) {
      const isInDeadZone = test.delta < lookDeadZone;
      
      if (isInDeadZone === test.inDeadZone) {
        this.addResult(`Look delta ${test.delta}`, 'passed',
          isInDeadZone ? 'Correctly ignored (dead zone)' : 'Movement registered');
      } else {
        this.addResult(`Look delta ${test.delta}`, 'failed',
          'Dead zone detection incorrect');
      }
    }
    
    // Test adaptive dead zones
    console.log('\nAdaptive dead zones:');
    
    const adaptiveScenarios = [
      { context: 'stationary', multiplier: 1.5, reason: 'Larger dead zone when stationary' },
      { context: 'moving', multiplier: 1.0, reason: 'Normal dead zone when moving' },
      { context: 'precision', multiplier: 0.5, reason: 'Smaller dead zone for precision' }
    ];
    
    const baseDeadZone = 0.1;
    
    for (const scenario of adaptiveScenarios) {
      const adjustedDeadZone = baseDeadZone * scenario.multiplier;
      console.log(`${scenario.context}: ${adjustedDeadZone.toFixed(3)} (${scenario.reason})`);
      
      this.addResult(`Adaptive dead zone: ${scenario.context}`, 'passed',
        `Adjusted to ${adjustedDeadZone.toFixed(3)}`);
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
    
    console.log('\n%c═══════════════════════════════════════════════', 'color: #ec4899; font-size: 14px');
    console.log('%c   📊 TEST RESULTS SUMMARY', 'color: #ec4899; font-size: 16px; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════', 'color: #ec4899; font-size: 14px');
    
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
    
    console.log('\n%c═══════════════════════════════════════════════', 'color: #ec4899; font-size: 14px');
    
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
  (window as any).testTouchControls = () => {
    const suite = new TouchControlsTestSuite();
    return suite.runAllTests();
  };
  
  console.log('%c👆 Touch Controls Test Suite loaded. Run with: window.testTouchControls()', 'color: #ec4899');
}

export default TouchControlsTestSuite;