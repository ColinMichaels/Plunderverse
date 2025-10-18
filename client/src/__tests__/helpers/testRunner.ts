/**
 * Test Runner Utilities
 * Core test framework with performance measurement, state management, and reporting
 */

import { toast } from 'sonner';
import { usePlayer } from '../../lib/stores/player/usePlayer';
import { useCreditsStore } from '../../domain/economy/credits.store';
import { useInventory } from '../../lib/stores/economy/useInventory';
import { usePlunderverseMissions } from '../../lib/stores/economy/usePlunderverseMissions';
import { useShipStatus } from '../../lib/stores/ship/useShipStatus';
import { useCrewManagement } from '../../lib/stores/ship/useCrewManagement';
import { useUpgrades } from '../../lib/stores/ship/useUpgrades';
import { useLandedState } from '../../lib/stores/surface/useLandedState';
import { useSolarSystem } from '../../lib/stores/space/useSolarSystem';
import { useEnemies } from '../../lib/stores/combat/useEnemies';
import { useHeatSystem } from '../../lib/stores/player/useHeatSystem';

// Test result types
export interface TestResult {
  name: string;
  status: 'running' | 'passed' | 'failed' | 'warning' | 'skipped';
  message: string;
  duration: number;
  memory?: number;
  errors?: string[];
  warnings?: string[];
  assertions?: {
    passed: number;
    failed: number;
    total: number;
  };
}

export interface TestSuiteResult {
  name: string;
  timestamp: number;
  duration: number;
  tests: TestResult[];
  passed: number;
  failed: number;
  warnings: number;
  skipped: number;
  total: number;
  coverage?: number;
  performance: {
    avgDuration: number;
    maxDuration: number;
    minDuration: number;
    totalMemory: number;
    fps?: number;
  };
}

export interface TestOptions {
  verbose?: boolean;
  quiet?: boolean;
  profile?: boolean;
  timeout?: number;
  retries?: number;
  continueOnFailure?: boolean;
  skipGraphics?: boolean;
  breakOnFailure?: boolean;
}

/**
 * Base Test Runner Class
 */
export abstract class TestRunner {
  protected name: string;
  protected results: TestResult[] = [];
  protected startTime: number = 0;
  protected currentTest: TestResult | null = null;
  protected options: TestOptions = {};
  protected savedState: any = {};
  protected performanceMarks = new Map<string, number>();
  protected memorySnapshots = new Map<string, number>();
  protected assertionCount = { passed: 0, failed: 0, total: 0 };
  protected progressCallback?: (progress: number, message: string) => void;
  protected isRunning = false;

  constructor(name: string, options: TestOptions = {}) {
    this.name = name;
    this.options = {
      verbose: false,
      quiet: false,
      profile: false,
      timeout: 30000,
      retries: 0,
      continueOnFailure: true,
      skipGraphics: false,
      breakOnFailure: false,
      ...options
    };
  }

  /**
   * Start a new test
   */
  protected startTest(name: string, message?: string) {
    if (!this.isRunning) {
      this.startTime = performance.now();
      this.isRunning = true;
    }

    this.currentTest = {
      name,
      status: 'running',
      message: message || `Running ${name}...`,
      duration: 0
    };

    this.results.push(this.currentTest);
    this.performanceMarks.set(name, performance.now());

    if (this.options.profile) {
      this.captureMemory(name);
    }

    this.log(`⚡ ${name}`, 'info', message);
    this.updateProgress();
  }

  /**
   * Pass current test
   */
  protected passTest(name: string, message?: string) {
    const test = this.findTest(name);
    if (!test) return;

    test.status = 'passed';
    test.message = message || `${name} passed`;
    test.duration = this.getDuration(name);
    test.memory = this.getMemoryUsage(name);
    test.assertions = { ...this.assertionCount };

    this.log(`✅ ${name}`, 'success', message);
    this.updateProgress();
  }

  /**
   * Fail current test
   */
  protected failTest(name: string, error: string | Error, details?: any) {
    const test = this.findTest(name);
    if (!test) return;

    test.status = 'failed';
    test.message = error instanceof Error ? error.message : error;
    test.duration = this.getDuration(name);
    test.memory = this.getMemoryUsage(name);
    test.errors = [test.message];
    test.assertions = { ...this.assertionCount };

    this.log(`❌ ${name}`, 'error', test.message);

    if (details) {
      console.error('Test failure details:', details);
    }

    if (this.options.breakOnFailure) {
      debugger;
    }

    if (!this.options.continueOnFailure) {
      throw new Error(`Test failed: ${test.message}`);
    }

    this.updateProgress();
  }

  /**
   * Mark test as warning
   */
  protected warnTest(name: string, message: string) {
    const test = this.findTest(name);
    if (!test) return;

    test.status = 'warning';
    test.message = message;
    test.duration = this.getDuration(name);
    test.warnings = test.warnings || [];
    test.warnings.push(message);

    this.log(`⚠️ ${name}`, 'warning', message);
    this.updateProgress();
  }

  /**
   * Skip test
   */
  protected skipTest(name: string, reason?: string) {
    this.startTest(name);
    const test = this.findTest(name);
    if (!test) return;

    test.status = 'skipped';
    test.message = reason || `${name} skipped`;
    test.duration = 0;

    this.log(`⏭️ ${name}`, 'info', reason);
    this.updateProgress();
  }

  /**
   * Assertion helpers
   */
  protected assert(condition: boolean, message: string) {
    this.assertionCount.total++;
    if (condition) {
      this.assertionCount.passed++;
      if (this.options.verbose) {
        console.log('✓', message);
      }
    } else {
      this.assertionCount.failed++;
      if (this.currentTest) {
        this.currentTest.errors = this.currentTest.errors || [];
        this.currentTest.errors.push(`Assertion failed: ${message}`);
      }
      if (!this.options.continueOnFailure) {
        throw new Error(`Assertion failed: ${message}`);
      }
    }
    return condition;
  }

  protected assertEqual(actual: any, expected: any, message?: string) {
    const msg = message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`;
    return this.assert(actual === expected, msg);
  }

  protected assertExists(value: any, message?: string) {
    const msg = message || `Expected value to exist`;
    return this.assert(value != null, msg);
  }

  protected assertType(value: any, type: string, message?: string) {
    const msg = message || `Expected type ${type}, got ${typeof value}`;
    return this.assert(typeof value === type, msg);
  }

  protected async assertAsync(fn: () => Promise<any>, message?: string, timeout?: number) {
    const msg = message || 'Async assertion failed';
    const timeLimit = timeout || this.options.timeout || 5000;
    
    try {
      const result = await Promise.race([
        fn(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), timeLimit)
        )
      ]);
      this.assert(true, msg);
      return result;
    } catch (error) {
      this.assert(false, `${msg}: ${error}`);
      throw error;
    }
  }

  protected async assertRejects(fn: () => Promise<any>, message?: string) {
    const msg = message || 'Expected promise to reject';
    try {
      await fn();
      this.assert(false, `${msg}: Promise resolved instead of rejecting`);
      return false;
    } catch (error) {
      this.assert(true, msg);
      return true;
    }
  }

  protected assertPerformance(fn: () => void, maxMs: number, message?: string) {
    const msg = message || `Performance assertion: should complete within ${maxMs}ms`;
    const start = performance.now();
    fn();
    const duration = performance.now() - start;
    return this.assert(duration <= maxMs, `${msg} (took ${duration.toFixed(2)}ms)`);
  }

  protected assertMemory(fn: () => void, maxBytes: number, message?: string) {
    if (!(performance as any).memory) {
      console.warn('Memory profiling not available');
      return true;
    }
    
    const msg = message || `Memory assertion: should use less than ${maxBytes} bytes`;
    const before = (performance as any).memory.usedJSHeapSize;
    fn();
    const after = (performance as any).memory.usedJSHeapSize;
    const used = after - before;
    
    return this.assert(used <= maxBytes, `${msg} (used ${used} bytes)`);
  }

  /**
   * State management
   */
  protected saveState() {
    const stores = {
      player: usePlayer.getState(),
      credits: useCreditsStore.getState(),
      inventory: useInventory.getState(),
      missions: usePlunderverseMissions.getState(),
      ship: useShipStatus.getState(),
      crew: useCrewManagement.getState(),
      upgrades: useUpgrades.getState(),
      landed: useLandedState.getState(),
      solarSystem: useSolarSystem.getState(),
      enemies: useEnemies.getState(),
      heat: useHeatSystem.getState()
    };

    this.savedState = JSON.parse(JSON.stringify(stores));
    return this.savedState;
  }

  protected restoreState() {
    if (!this.savedState || Object.keys(this.savedState).length === 0) {
      console.warn('No saved state to restore');
      return;
    }

    try {
      if (this.savedState.player) {
        usePlayer.setState(this.savedState.player);
      }
      if (this.savedState.credits) {
        useCreditsStore.setState(this.savedState.credits);
      }
      if (this.savedState.inventory) {
        useInventory.setState(this.savedState.inventory);
      }
      if (this.savedState.missions) {
        usePlunderverseMissions.setState(this.savedState.missions);
      }
      if (this.savedState.ship) {
        useShipStatus.setState(this.savedState.ship);
      }
      if (this.savedState.crew) {
        useCrewManagement.setState(this.savedState.crew);
      }
      if (this.savedState.upgrades) {
        useUpgrades.setState(this.savedState.upgrades);
      }
      if (this.savedState.landed) {
        useLandedState.setState(this.savedState.landed);
      }
      if (this.savedState.solarSystem) {
        useSolarSystem.setState(this.savedState.solarSystem);
      }
      if (this.savedState.enemies) {
        useEnemies.setState(this.savedState.enemies);
      }
      if (this.savedState.heat) {
        useHeatSystem.setState(this.savedState.heat);
      }

      console.log('✅ State restored successfully');
    } catch (error) {
      console.error('Failed to restore state:', error);
    }
  }

  protected withCleanState<T>(fn: () => T): T {
    this.saveState();
    try {
      return fn();
    } finally {
      this.restoreState();
    }
  }

  /**
   * Mock data generators
   */
  protected generateMockPlayer() {
    return {
      id: `test-player-${Date.now()}`,
      name: 'Test Player',
      rank: 0,
      points: 0,
      reputation: {
        federation: 50,
        pirates: 50,
        traders: 50,
        scientists: 50
      },
      heat: 0,
      notoriety: 0,
      position: { x: 0, y: 0, z: 0 }
    };
  }

  protected generateMockMission() {
    return {
      id: `test-mission-${Date.now()}`,
      name: 'Test Mission',
      description: 'Test mission description',
      type: 'delivery',
      difficulty: 1,
      rewards: {
        credits: 1000,
        reputation: { federation: 10 },
        items: []
      },
      objectives: [
        {
          id: 'test-objective',
          type: 'location',
          description: 'Test objective',
          required: true,
          completed: false
        }
      ]
    };
  }

  protected generateMockItem() {
    return {
      id: `test-item-${Date.now()}`,
      name: 'Test Item',
      type: 'resource',
      baseValue: 100,
      weight: 1,
      rarity: 'common',
      stackable: true,
      maxStack: 100
    };
  }

  protected generateMockEnemy() {
    return {
      id: `test-enemy-${Date.now()}`,
      type: 'pirate',
      position: { x: 100, y: 0, z: 100 },
      rotation: { x: 0, y: 0, z: 0 },
      health: 100,
      maxHealth: 100,
      speed: 5,
      damage: 10,
      bounty: 500
    };
  }

  /**
   * Performance measurement
   */
  private captureMemory(name: string) {
    if ((performance as any).memory) {
      const memoryInfo = (performance as any).memory;
      this.memorySnapshots.set(name, memoryInfo.usedJSHeapSize);
    }
  }

  private getDuration(name: string): number {
    const start = this.performanceMarks.get(name);
    if (!start) return 0;
    return performance.now() - start;
  }

  private getMemoryUsage(name: string): number | undefined {
    return this.memorySnapshots.get(name);
  }

  /**
   * Progress tracking
   */
  protected setProgressCallback(callback: (progress: number, message: string) => void) {
    this.progressCallback = callback;
  }

  private updateProgress() {
    if (!this.progressCallback) return;
    
    const completed = this.results.filter(r => r.status !== 'running').length;
    const total = this.results.length;
    const progress = total > 0 ? (completed / total) * 100 : 0;
    const message = this.currentTest ? this.currentTest.message : 'Running tests...';
    
    this.progressCallback(progress, message);
  }

  /**
   * Utility methods
   */
  protected async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected async retry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === retries - 1) throw error;
        await this.wait(delay);
      }
    }
    throw new Error('Max retries exceeded');
  }

  protected measureFPS(duration = 1000): Promise<number> {
    return new Promise(resolve => {
      let frameCount = 0;
      let lastTime = performance.now();
      
      const measureFrame = () => {
        frameCount++;
        const currentTime = performance.now();
        const delta = currentTime - lastTime;
        
        if (delta >= duration) {
          const fps = Math.round((frameCount * 1000) / delta);
          resolve(fps);
        } else {
          requestAnimationFrame(measureFrame);
        }
      };
      
      requestAnimationFrame(measureFrame);
    });
  }

  private findTest(name: string): TestResult | null {
    return this.results.find(r => r.name === name) || null;
  }

  private log(message: string, level: 'info' | 'success' | 'warning' | 'error' = 'info', details?: string) {
    if (this.options.quiet && level !== 'error') return;
    
    const colors = {
      info: '#64748b',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444'
    };
    
    const style = `color: ${colors[level]}; font-weight: bold`;
    
    if (this.options.verbose || level === 'error') {
      console.log(`%c${message}`, style, details || '');
    } else if (!this.options.quiet) {
      console.log(`%c${message}`, style);
    }
    
    // Show toast for important events
    if (level === 'error') {
      toast.error(message);
    } else if (level === 'success' && !this.options.quiet) {
      toast.success(message);
    }
  }

  /**
   * Generate test report
   */
  public generateReport(): TestSuiteResult {
    const duration = this.isRunning ? performance.now() - this.startTime : 0;
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;
    const skipped = this.results.filter(r => r.status === 'skipped').length;
    
    const durations = this.results
      .filter(r => r.duration > 0)
      .map(r => r.duration);
    
    const performance = {
      avgDuration: durations.length > 0 
        ? durations.reduce((a, b) => a + b, 0) / durations.length 
        : 0,
      maxDuration: Math.max(...durations, 0),
      minDuration: Math.min(...durations, Infinity),
      totalMemory: Array.from(this.memorySnapshots.values())
        .reduce((a, b) => a + b, 0)
    };
    
    return {
      name: this.name,
      timestamp: Date.now(),
      duration,
      tests: this.results,
      passed,
      failed,
      warnings,
      skipped,
      total: this.results.length,
      performance
    };
  }

  /**
   * Abstract method - must be implemented by subclasses
   */
  abstract runAllTests(): Promise<TestSuiteResult>;
}