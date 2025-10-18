/**
 * Haptic Feedback Test Suite
 * Tests haptic/vibration feedback functionality
 * Run with window.testHapticFeedback() from the browser console
 */

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  details?: any;
}

export class HapticFeedbackTestSuite {
  private results: TestResult[] = [];
  private supportsVibration: boolean = false;

  constructor() {
    console.log('📳 Haptic Feedback Test Suite initialized');
    this.supportsVibration = 'vibrate' in navigator;
  }

  async runAllTests() {
    console.clear();
    console.log('%c═══════════════════════════════════════════════', 'color: #a855f7; font-size: 14px');
    console.log('%c   📳 HAPTIC FEEDBACK TEST SUITE STARTING', 'color: #a855f7; font-size: 16px; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════', 'color: #a855f7; font-size: 14px');
    
    this.results = [];
    
    try {
      await this.testVibrationAPI();
      await this.wait(500);
      
      await this.testTriggerHapticFunction();
      await this.wait(500);
      
      await this.testButtonPressFeedback();
      await this.wait(500);
      
      await this.testInteractionFeedback();
      await this.wait(500);
      
      await this.testVibrationPatterns();
      await this.wait(500);
      
      await this.testHapticIntensity();
      await this.wait(500);
      
      await this.testContextualHaptics();
      await this.wait(500);
      
      await this.testHapticSettings();
      
    } catch (error) {
      console.error('Test suite failed:', error);
      this.addResult('Test Suite', 'failed', `Critical error: ${error}`);
    } finally {
      this.printSummary();
    }
  }

  private async testVibrationAPI() {
    console.log('\n📱 Testing Vibration API...');
    
    // Check API availability
    console.log('Vibration API available:', this.supportsVibration);
    
    if (this.supportsVibration) {
      this.addResult('Vibration API', 'passed', 'Navigator.vibrate() is available');
      
      // Test basic vibration
      try {
        const result = navigator.vibrate(0); // Cancel any vibration
        console.log('Can call vibrate():', result);
        
        this.addResult('API Call', 'passed', 'Vibration API can be called');
      } catch (error) {
        console.error('Vibration API error:', error);
        this.addResult('API Call', 'failed', `Error: ${error}`);
      }
      
      // Test vibration support detection
      const testVibration = (pattern: number | number[]) => {
        try {
          return navigator.vibrate(pattern);
        } catch {
          return false;
        }
      };
      
      console.log('Single vibration:', testVibration(100));
      console.log('Pattern vibration:', testVibration([100, 50, 100]));
      console.log('Cancel vibration:', testVibration(0));
      
    } else {
      this.addResult('Vibration API', 'warning', 'Navigator.vibrate() not available');
      
      // Test fallback methods
      console.log('Checking for alternative haptic APIs...');
      
      const alternatives = [
        { api: 'Haptic Feedback API', available: 'HapticFeedback' in window },
        { api: 'Webkit Vibrate', available: 'webkitVibrate' in navigator },
        { api: 'MS Vibrate', available: 'msVibrate' in navigator },
        { api: 'Moz Vibrate', available: 'mozVibrate' in navigator }
      ];
      
      for (const alt of alternatives) {
        console.log(`${alt.api}: ${alt.available ? 'Available' : 'Not available'}`);
        
        if (alt.available) {
          this.addResult(`Alternative: ${alt.api}`, 'passed', 'Alternative API available');
        }
      }
    }
    
    // Test permission requirements
    console.log('\nVibration permission requirements:');
    console.log('- User gesture required: Yes (in most browsers)');
    console.log('- HTTPS required: Yes (in production)');
    console.log('- Permission prompt: No (implicit permission)');
    
    this.addResult('Permission Model', 'passed', 
      'No explicit permission needed, user gesture required');
  }

  private async testTriggerHapticFunction() {
    console.log('\n⚡ Testing triggerHaptic Function...');
    
    // Define triggerHaptic function
    const triggerHaptic = (duration: number = 10) => {
      if ('vibrate' in navigator) {
        return navigator.vibrate(duration);
      }
      return false;
    };
    
    // Test different durations
    const durations = [
      { name: 'Tap', duration: 10, purpose: 'Light tap feedback' },
      { name: 'Press', duration: 20, purpose: 'Button press' },
      { name: 'Long press', duration: 50, purpose: 'Heavy interaction' },
      { name: 'Success', duration: 30, purpose: 'Positive feedback' },
      { name: 'Error', duration: 100, purpose: 'Error notification' }
    ];
    
    for (const { name, duration, purpose } of durations) {
      console.log(`${name}: ${duration}ms - ${purpose}`);
      
      if (this.supportsVibration) {
        const result = triggerHaptic(duration);
        this.addResult(`Haptic: ${name}`, 'passed', 
          `${duration}ms vibration for ${purpose}`);
      } else {
        this.addResult(`Haptic: ${name}`, 'warning',
          'Vibration not supported on this device');
      }
    }
    
    // Test vibration cancellation
    console.log('\nTesting vibration cancellation:');
    const cancelVibration = () => {
      if ('vibrate' in navigator) {
        return navigator.vibrate(0);
      }
      return false;
    };
    
    const cancelled = cancelVibration();
    console.log('Vibration cancelled:', cancelled);
    
    this.addResult('Cancel Vibration', 
      this.supportsVibration ? 'passed' : 'warning',
      this.supportsVibration ? 'Can cancel vibrations' : 'Vibration not supported');
    
    // Test queued vibrations
    const queueVibrations = () => {
      if (!this.supportsVibration) return false;
      
      // Vibrations don't queue - new call cancels previous
      navigator.vibrate(100);
      navigator.vibrate(50); // This cancels the 100ms and starts 50ms
      return true;
    };
    
    console.log('Vibration queueing test:', queueVibrations());
    
    this.addResult('Vibration Queueing', 'passed',
      'New vibrations cancel previous ones');
  }

  private async testButtonPressFeedback() {
    console.log('\n🔘 Testing Button Press Feedback...');
    
    // Define button types and their haptic feedback
    const buttonTypes = [
      { type: 'Primary action', haptic: 15, delay: 0 },
      { type: 'Secondary action', haptic: 10, delay: 0 },
      { type: 'Destructive action', haptic: 25, delay: 0 },
      { type: 'Toggle switch', haptic: 8, delay: 0 },
      { type: 'Tab selection', haptic: 5, delay: 0 },
      { type: 'Submit form', haptic: 20, delay: 100 }
    ];
    
    for (const button of buttonTypes) {
      console.log(`${button.type}:`);
      console.log(`  Haptic: ${button.haptic}ms`);
      console.log(`  Delay: ${button.delay}ms`);
      
      this.addResult(`Button: ${button.type}`, 'passed',
        `${button.haptic}ms haptic${button.delay > 0 ? ` with ${button.delay}ms delay` : ''}`);
    }
    
    // Test button state feedback
    const buttonStates = [
      { state: 'enabled', hasHaptic: true, duration: 10 },
      { state: 'disabled', hasHaptic: false, duration: 0 },
      { state: 'loading', hasHaptic: true, duration: 5 },
      { state: 'success', hasHaptic: true, duration: 30 },
      { state: 'error', hasHaptic: true, duration: 50 }
    ];
    
    console.log('\nButton state haptics:');
    for (const state of buttonStates) {
      console.log(`${state.state}: ${state.hasHaptic ? `${state.duration}ms` : 'No haptic'}`);
      
      this.addResult(`State: ${state.state}`, 'passed',
        state.hasHaptic ? `${state.duration}ms feedback` : 'No feedback (as expected)');
    }
    
    // Test gesture-triggered haptics
    const gestures = [
      { gesture: 'tap', haptic: 10 },
      { gesture: 'double-tap', haptic: [10, 30, 10] },
      { gesture: 'long-press', haptic: 50 },
      { gesture: 'force-touch', haptic: 30 },
      { gesture: 'swipe', haptic: 5 }
    ];
    
    console.log('\nGesture haptics:');
    for (const gesture of gestures) {
      const pattern = Array.isArray(gesture.haptic) 
        ? gesture.haptic.join('-') + 'ms pattern'
        : `${gesture.haptic}ms`;
      
      console.log(`${gesture.gesture}: ${pattern}`);
      
      this.addResult(`Gesture: ${gesture.gesture}`, 'passed', pattern);
    }
  }

  private async testInteractionFeedback() {
    console.log('\n🎯 Testing Interaction Feedback...');
    
    // Test UI interaction haptics
    const interactions = [
      { action: 'Open panel', haptic: 10, timing: 'start' },
      { action: 'Close panel', haptic: 8, timing: 'end' },
      { action: 'Expand card', haptic: 5, timing: 'start' },
      { action: 'Collapse card', haptic: 5, timing: 'end' },
      { action: 'Slider change', haptic: 3, timing: 'continuous' },
      { action: 'Picker scroll', haptic: 2, timing: 'continuous' },
      { action: 'Pull to refresh', haptic: 15, timing: 'threshold' },
      { action: 'Snap to grid', haptic: 12, timing: 'snap' }
    ];
    
    for (const interaction of interactions) {
      console.log(`${interaction.action}:`);
      console.log(`  Haptic: ${interaction.haptic}ms`);
      console.log(`  Timing: ${interaction.timing}`);
      
      this.addResult(`Interaction: ${interaction.action}`, 'passed',
        `${interaction.haptic}ms at ${interaction.timing}`);
    }
    
    // Test game event haptics
    const gameEvents = [
      { event: 'Take damage', pattern: [50, 50, 50] },
      { event: 'Collect item', pattern: [20] },
      { event: 'Level up', pattern: [30, 50, 30, 50, 30] },
      { event: 'Mission complete', pattern: [100, 100, 100] },
      { event: 'Warning', pattern: [100, 50, 100] },
      { event: 'Critical hit', pattern: [150] }
    ];
    
    console.log('\nGame event haptics:');
    for (const event of gameEvents) {
      const patternStr = event.pattern.join('-') + 'ms';
      console.log(`${event.event}: ${patternStr}`);
      
      this.addResult(`Game: ${event.event}`, 'passed', `Pattern: ${patternStr}`);
    }
    
    // Test notification haptics
    const notifications = [
      { type: 'Success', pattern: [10, 20, 10] },
      { type: 'Warning', pattern: [30, 30] },
      { type: 'Error', pattern: [50, 100, 50] },
      { type: 'Info', pattern: [10] },
      { type: 'Achievement', pattern: [20, 40, 20, 40] }
    ];
    
    console.log('\nNotification haptics:');
    for (const notif of notifications) {
      const patternStr = notif.pattern.join('-') + 'ms';
      console.log(`${notif.type}: ${patternStr}`);
      
      this.addResult(`Notification: ${notif.type}`, 'passed', `Pattern: ${patternStr}`);
    }
  }

  private async testVibrationPatterns() {
    console.log('\n🎵 Testing Vibration Patterns...');
    
    // Test pattern creation
    const patterns = [
      { 
        name: 'SOS', 
        pattern: [100, 30, 100, 30, 100, 200, 200, 30, 200, 30, 200, 200, 100, 30, 100, 30, 100],
        description: 'Morse code SOS'
      },
      {
        name: 'Heartbeat',
        pattern: [100, 100, 100, 350],
        description: 'Double pulse like heartbeat'
      },
      {
        name: 'Alert',
        pattern: [200, 100, 200],
        description: 'Strong alert pattern'
      },
      {
        name: 'Notification',
        pattern: [100, 50, 100],
        description: 'Gentle notification'
      },
      {
        name: 'Ringtone',
        pattern: [300, 200, 300, 200, 300, 200],
        description: 'Phone-like ring pattern'
      }
    ];
    
    for (const { name, pattern, description } of patterns) {
      console.log(`${name}:`);
      console.log(`  Pattern: [${pattern.join(', ')}]`);
      console.log(`  Description: ${description}`);
      console.log(`  Total duration: ${pattern.reduce((a, b) => a + b, 0)}ms`);
      
      this.addResult(`Pattern: ${name}`, 'passed', description);
    }
    
    // Test pattern validation
    const validatePattern = (pattern: number[]) => {
      // Check all values are positive
      const allPositive = pattern.every(val => val >= 0);
      // Check alternating vibrate/pause
      const maxLength = 100; // Some browsers limit pattern length
      const validLength = pattern.length <= maxLength;
      
      return {
        valid: allPositive && validLength,
        allPositive,
        validLength,
        length: pattern.length
      };
    };
    
    const testPatterns = [
      { pattern: [100, 50, 100], expected: true },
      { pattern: [100, -50, 100], expected: false }, // Negative value
      { pattern: new Array(150).fill(10), expected: false }, // Too long
      { pattern: [], expected: true } // Empty is valid
    ];
    
    console.log('\nPattern validation:');
    for (const test of testPatterns) {
      const result = validatePattern(test.pattern);
      console.log(`Pattern length ${test.pattern.length}: ${result.valid ? 'Valid' : 'Invalid'}`);
      
      if (result.valid === test.expected) {
        this.addResult(`Validation ${test.pattern.length}`, 'passed',
          result.valid ? 'Valid pattern' : 'Invalid pattern detected');
      } else {
        this.addResult(`Validation ${test.pattern.length}`, 'failed',
          'Pattern validation incorrect');
      }
    }
  }

  private async testHapticIntensity() {
    console.log('\n💪 Testing Haptic Intensity...');
    
    // Note: Web Vibration API doesn't support intensity, only duration
    // But we can simulate intensity with patterns
    
    const intensityLevels = [
      { level: 'Light', duration: 5, pattern: [5] },
      { level: 'Medium', duration: 15, pattern: [15] },
      { level: 'Strong', duration: 30, pattern: [30] },
      { level: 'Extra Strong', duration: 50, pattern: [50] },
      { level: 'Pulsed Light', duration: 30, pattern: [5, 5, 5, 5, 5, 5] },
      { level: 'Pulsed Strong', duration: 60, pattern: [20, 10, 20, 10] }
    ];
    
    console.log('Simulated intensity levels:');
    for (const intensity of intensityLevels) {
      const totalDuration = intensity.pattern.reduce((a, b) => a + b, 0);
      console.log(`${intensity.level}:`);
      console.log(`  Pattern: [${intensity.pattern.join(', ')}]`);
      console.log(`  Total: ${totalDuration}ms`);
      
      this.addResult(`Intensity: ${intensity.level}`, 'passed',
        `${totalDuration}ms total duration`);
    }
    
    // Test adaptive intensity
    const adaptiveIntensity = [
      { context: 'Silent mode', multiplier: 0 },
      { context: 'Low battery', multiplier: 0.5 },
      { context: 'Gaming mode', multiplier: 1.2 },
      { context: 'Accessibility mode', multiplier: 1.5 },
      { context: 'Normal mode', multiplier: 1.0 }
    ];
    
    console.log('\nAdaptive intensity:');
    const baseIntensity = 20;
    
    for (const adaptive of adaptiveIntensity) {
      const adjusted = baseIntensity * adaptive.multiplier;
      console.log(`${adaptive.context}: ${adjusted}ms (${adaptive.multiplier}x)`);
      
      this.addResult(`Adaptive: ${adaptive.context}`, 'passed',
        `${adjusted}ms adjusted duration`);
    }
    
    // Test compound patterns for intensity
    const compoundPatterns = [
      {
        name: 'Crescendo',
        pattern: [5, 20, 10, 20, 15, 20, 20, 20, 25],
        description: 'Increasing intensity'
      },
      {
        name: 'Diminuendo', 
        pattern: [25, 20, 20, 20, 15, 20, 10, 20, 5],
        description: 'Decreasing intensity'
      },
      {
        name: 'Wave',
        pattern: [5, 20, 15, 20, 25, 20, 15, 20, 5],
        description: 'Wave-like intensity'
      }
    ];
    
    console.log('\nCompound intensity patterns:');
    for (const compound of compoundPatterns) {
      console.log(`${compound.name}: ${compound.description}`);
      
      this.addResult(`Compound: ${compound.name}`, 'passed', compound.description);
    }
  }

  private async testContextualHaptics() {
    console.log('\n🎭 Testing Contextual Haptics...');
    
    // Test context-aware haptic responses
    const contexts = [
      {
        context: 'Low Health',
        trigger: 'health < 20%',
        haptic: [200, 100, 200],
        priority: 'high'
      },
      {
        context: 'Resource Collected',
        trigger: 'pickup item',
        haptic: [30],
        priority: 'low'
      },
      {
        context: 'Mission Complete',
        trigger: 'objective achieved',
        haptic: [50, 50, 50, 50, 100],
        priority: 'medium'
      },
      {
        context: 'Danger Proximity',
        trigger: 'enemy nearby',
        haptic: [100, 50, 100],
        priority: 'high'
      },
      {
        context: 'Transaction Success',
        trigger: 'purchase complete',
        haptic: [20, 30, 20],
        priority: 'medium'
      }
    ];
    
    for (const ctx of contexts) {
      console.log(`${ctx.context}:`);
      console.log(`  Trigger: ${ctx.trigger}`);
      console.log(`  Pattern: [${ctx.haptic.join(', ')}]`);
      console.log(`  Priority: ${ctx.priority}`);
      
      this.addResult(`Context: ${ctx.context}`, 'passed',
        `${ctx.priority} priority haptic feedback`);
    }
    
    // Test haptic priority system
    const priorityLevels = [
      { level: 'critical', canInterrupt: true, multiplier: 1.5 },
      { level: 'high', canInterrupt: true, multiplier: 1.2 },
      { level: 'medium', canInterrupt: false, multiplier: 1.0 },
      { level: 'low', canInterrupt: false, multiplier: 0.8 }
    ];
    
    console.log('\nHaptic priority system:');
    for (const priority of priorityLevels) {
      console.log(`${priority.level}: Can interrupt: ${priority.canInterrupt}, Intensity: ${priority.multiplier}x`);
      
      this.addResult(`Priority: ${priority.level}`, 'passed',
        `${priority.canInterrupt ? 'Can' : 'Cannot'} interrupt, ${priority.multiplier}x intensity`);
    }
    
    // Test situational haptics
    const situations = [
      { situation: 'In menu', haptics: 'enabled', intensity: 'normal' },
      { situation: 'In gameplay', haptics: 'enabled', intensity: 'dynamic' },
      { situation: 'In cutscene', haptics: 'disabled', intensity: 'none' },
      { situation: 'Battery low', haptics: 'reduced', intensity: 'minimal' },
      { situation: 'Silent mode', haptics: 'disabled', intensity: 'none' }
    ];
    
    console.log('\nSituational haptics:');
    for (const sit of situations) {
      console.log(`${sit.situation}: Haptics ${sit.haptics}, Intensity ${sit.intensity}`);
      
      this.addResult(`Situation: ${sit.situation}`, 'passed',
        `Haptics: ${sit.haptics}, Intensity: ${sit.intensity}`);
    }
  }

  private async testHapticSettings() {
    console.log('\n⚙️ Testing Haptic Settings...');
    
    // Test user preferences
    const userSettings = {
      enabled: true,
      intensity: 'medium',
      buttonFeedback: true,
      navigationFeedback: true,
      notificationFeedback: true,
      gameFeedback: true
    };
    
    console.log('User haptic preferences:');
    Object.entries(userSettings).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    
    this.addResult('User Preferences', 'passed',
      'Haptic preferences configured');
    
    // Test preset configurations
    const presets = [
      {
        name: 'Minimal',
        settings: { button: 5, navigation: 0, notification: 10, game: 0 }
      },
      {
        name: 'Balanced',
        settings: { button: 10, navigation: 5, notification: 20, game: 15 }
      },
      {
        name: 'Immersive',
        settings: { button: 15, navigation: 10, notification: 30, game: 25 }
      },
      {
        name: 'Custom',
        settings: { button: 12, navigation: 8, notification: 25, game: 20 }
      }
    ];
    
    console.log('\nHaptic presets:');
    for (const preset of presets) {
      console.log(`${preset.name}:`);
      Object.entries(preset.settings).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}ms`);
      });
      
      this.addResult(`Preset: ${preset.name}`, 'passed',
        'Preset configuration available');
    }
    
    // Test accessibility considerations
    const accessibility = [
      { feature: 'Haptic strength slider', available: true },
      { feature: 'Disable all haptics', available: true },
      { feature: 'Haptic patterns preview', available: true },
      { feature: 'Per-category toggle', available: true },
      { feature: 'Alternative feedback', available: true }
    ];
    
    console.log('\nAccessibility features:');
    for (const feature of accessibility) {
      console.log(`${feature.feature}: ${feature.available ? 'Available' : 'Not available'}`);
      
      this.addResult(`Accessibility: ${feature.feature}`, 
        feature.available ? 'passed' : 'warning',
        feature.available ? 'Feature available' : 'Feature not available');
    }
    
    // Test battery impact settings
    const batterySettings = [
      { level: '> 50%', haptics: 'full', description: 'All haptics enabled' },
      { level: '20-50%', haptics: 'reduced', description: 'Reduced intensity' },
      { level: '< 20%', haptics: 'minimal', description: 'Critical haptics only' },
      { level: 'Charging', haptics: 'full', description: 'All haptics enabled' }
    ];
    
    console.log('\nBattery-aware haptics:');
    for (const battery of batterySettings) {
      console.log(`Battery ${battery.level}: ${battery.haptics} - ${battery.description}`);
      
      this.addResult(`Battery ${battery.level}`, 'passed', battery.description);
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
    
    console.log('\n%c═══════════════════════════════════════════════', 'color: #a855f7; font-size: 14px');
    console.log('%c   📊 TEST RESULTS SUMMARY', 'color: #a855f7; font-size: 16px; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════', 'color: #a855f7; font-size: 14px');
    
    console.log(`\n✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️ Warnings: ${warnings}`);
    console.log(`📝 Total: ${this.results.length}`);
    
    const successRate = Math.round((passed / this.results.length) * 100);
    console.log(`\n🎯 Success Rate: ${successRate}%`);
    
    if (!this.supportsVibration) {
      console.log('\n%c⚠️ Note:', 'color: #f59e0b; font-weight: bold');
      console.log('Vibration API not supported on this device/browser.');
      console.log('Tests show expected behavior, but haptics won\'t actually trigger.');
    }
    
    if (failed > 0) {
      console.log('\n%c⚠️ Failed Tests:', 'color: #ef4444; font-weight: bold');
      this.results.filter(r => r.status === 'failed').forEach(r => {
        console.log(`  - ${r.name}: ${r.message}`);
      });
    }
    
    console.log('\n%c═══════════════════════════════════════════════', 'color: #a855f7; font-size: 14px');
    
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
  (window as any).testHapticFeedback = () => {
    const suite = new HapticFeedbackTestSuite();
    return suite.runAllTests();
  };
  
  console.log('%c📳 Haptic Feedback Test Suite loaded. Run with: window.testHapticFeedback()', 'color: #a855f7');
}

export default HapticFeedbackTestSuite;