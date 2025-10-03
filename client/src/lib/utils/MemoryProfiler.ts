/**
 * MemoryProfiler - Comprehensive memory profiling utility for development
 * Tracks memory usage, provides formatted output, and monitors performance
 */

interface MemorySnapshot {
  timestamp: number;
  jsHeapSizeLimit?: number;
  totalJSHeapSize?: number;
  usedJSHeapSize?: number;
  label?: string;
  scene?: 'space' | 'planet-surface';
}

interface MemoryDelta {
  totalDelta: number;
  usedDelta: number;
  percentChange: number;
  improved: boolean;
}

interface MemoryTrend {
  current: number;
  peak: number;
  average: number;
  samples: number;
}

class MemoryProfiler {
  private static instance: MemoryProfiler;
  private snapshots: MemorySnapshot[] = [];
  private peakMemory: number = 0;
  private trends: Map<string, MemoryTrend> = new Map();
  private maxSnapshots: number = 100;
  private enabled: boolean = import.meta.env.DEV;
  private lastCleanupTime: number = 0;
  private cleanupCount: number = 0;

  private constructor() {
    if (this.enabled) {
      console.log('%c[MemoryProfiler] Initialized in development mode', 'color: #00ff00');
      this.checkMemoryAPISupport();
    }
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): MemoryProfiler {
    if (!MemoryProfiler.instance) {
      MemoryProfiler.instance = new MemoryProfiler();
    }
    return MemoryProfiler.instance;
  }

  /**
   * Check if performance.memory API is available
   */
  private checkMemoryAPISupport(): boolean {
    if (!performance || !(performance as any).memory) {
      console.warn('[MemoryProfiler] performance.memory API not available in this browser');
      return false;
    }
    return true;
  }

  /**
   * Get current memory info
   */
  private getMemoryInfo(): MemorySnapshot | null {
    if (!this.checkMemoryAPISupport()) return null;

    const memory = (performance as any).memory;
    return {
      timestamp: Date.now(),
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      totalJSHeapSize: memory.totalJSHeapSize,
      usedJSHeapSize: memory.usedJSHeapSize
    };
  }

  /**
   * Format bytes to MB
   */
  private formatBytes(bytes: number): string {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  }

  /**
   * Format percentage
   */
  private formatPercent(value: number): string {
    return (value * 100).toFixed(1) + '%';
  }

  /**
   * Take a memory snapshot with optional label
   */
  public takeSnapshot(label?: string, scene?: 'space' | 'planet-surface'): MemorySnapshot | null {
    if (!this.enabled) return null;

    const snapshot = this.getMemoryInfo();
    if (!snapshot) return null;

    snapshot.label = label;
    snapshot.scene = scene;

    // Add to snapshots array
    this.snapshots.push(snapshot);

    // Maintain max snapshots
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    // Update peak memory
    if (snapshot.usedJSHeapSize && snapshot.usedJSHeapSize > this.peakMemory) {
      this.peakMemory = snapshot.usedJSHeapSize;
    }

    // Update trends
    if (label) {
      this.updateTrend(label, snapshot.usedJSHeapSize || 0);
    }

    return snapshot;
  }

  /**
   * Update memory trend for a specific label
   */
  private updateTrend(label: string, currentMemory: number): void {
    const trend = this.trends.get(label) || {
      current: currentMemory,
      peak: currentMemory,
      average: currentMemory,
      samples: 0
    };

    trend.current = currentMemory;
    trend.peak = Math.max(trend.peak, currentMemory);
    trend.average = (trend.average * trend.samples + currentMemory) / (trend.samples + 1);
    trend.samples++;

    this.trends.set(label, trend);
  }

  /**
   * Calculate memory delta between two snapshots
   */
  public calculateDelta(before: MemorySnapshot, after: MemorySnapshot): MemoryDelta | null {
    if (!before.usedJSHeapSize || !after.usedJSHeapSize) return null;
    if (!before.totalJSHeapSize || !after.totalJSHeapSize) return null;

    const totalDelta = after.totalJSHeapSize - before.totalJSHeapSize;
    const usedDelta = after.usedJSHeapSize - before.usedJSHeapSize;
    const percentChange = usedDelta / before.usedJSHeapSize;

    return {
      totalDelta,
      usedDelta,
      percentChange,
      improved: usedDelta < 0
    };
  }

  /**
   * Log memory profile with scene transition
   */
  public logSceneTransition(fromScene: string, toScene: string): void {
    if (!this.enabled) return;

    const before = this.takeSnapshot(`before-${fromScene}-to-${toScene}`);
    
    // Use setTimeout to capture memory after the transition
    setTimeout(() => {
      const after = this.takeSnapshot(`after-${fromScene}-to-${toScene}`);
      
      if (before && after) {
        const delta = this.calculateDelta(before, after);
        
        console.group(`%c[MEMORY-PROFILE] Scene Transition: ${fromScene} → ${toScene}`, 'color: #4a90e2; font-weight: bold');
        
        console.log('%cBefore:', 'color: #888');
        console.log(`  Used: ${this.formatBytes(before.usedJSHeapSize || 0)}`);
        console.log(`  Total: ${this.formatBytes(before.totalJSHeapSize || 0)}`);
        
        console.log('%cAfter:', 'color: #888');
        console.log(`  Used: ${this.formatBytes(after.usedJSHeapSize || 0)}`);
        console.log(`  Total: ${this.formatBytes(after.totalJSHeapSize || 0)}`);
        
        if (delta) {
          const color = delta.improved ? '#00ff00' : '#ff0000';
          const arrow = delta.improved ? '↓' : '↑';
          
          console.log(`%cDelta: ${arrow} ${this.formatBytes(Math.abs(delta.usedDelta))} (${this.formatPercent(Math.abs(delta.percentChange))})`, `color: ${color}; font-weight: bold`);
        }
        
        console.log(`%cPeak Memory: ${this.formatBytes(this.peakMemory)}`, 'color: #ffa500');
        console.groupEnd();
      }
    }, 100);
  }

  /**
   * Log current memory status
   */
  public logCurrentStatus(label?: string): void {
    if (!this.enabled) return;

    const snapshot = this.takeSnapshot(label);
    if (!snapshot) return;

    const heapUsage = snapshot.usedJSHeapSize! / snapshot.jsHeapSizeLimit!;
    const color = heapUsage > 0.9 ? '#ff0000' : heapUsage > 0.7 ? '#ffa500' : '#00ff00';

    console.group(`%c[MEMORY-PROFILE] ${label || 'Current Status'}`, `color: ${color}; font-weight: bold`);
    console.log(`Used: ${this.formatBytes(snapshot.usedJSHeapSize || 0)}`);
    console.log(`Total: ${this.formatBytes(snapshot.totalJSHeapSize || 0)}`);
    console.log(`Limit: ${this.formatBytes(snapshot.jsHeapSizeLimit || 0)}`);
    console.log(`Usage: ${this.formatPercent(heapUsage)}`);
    console.log(`Peak: ${this.formatBytes(this.peakMemory)}`);
    console.groupEnd();
  }

  /**
   * Log memory trend over time
   */
  public logTrend(): void {
    if (!this.enabled) return;
    if (this.snapshots.length === 0) {
      console.log('[MEMORY-PROFILE] No snapshots available');
      return;
    }

    console.group('%c[MEMORY-PROFILE] Memory Trend', 'color: #4a90e2; font-weight: bold');
    
    // Calculate trend statistics
    const recentSnapshots = this.snapshots.slice(-10); // Last 10 snapshots
    const memoryValues = recentSnapshots.map(s => s.usedJSHeapSize || 0);
    const avgMemory = memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length;
    const minMemory = Math.min(...memoryValues);
    const maxMemory = Math.max(...memoryValues);

    console.log(`Samples: ${this.snapshots.length}`);
    console.log(`Recent Average: ${this.formatBytes(avgMemory)}`);
    console.log(`Recent Min: ${this.formatBytes(minMemory)}`);
    console.log(`Recent Max: ${this.formatBytes(maxMemory)}`);
    console.log(`All-time Peak: ${this.formatBytes(this.peakMemory)}`);

    // Show trend by label
    if (this.trends.size > 0) {
      console.log('\n%cTrends by Operation:', 'color: #888');
      this.trends.forEach((trend, label) => {
        console.log(`  ${label}:`);
        console.log(`    Current: ${this.formatBytes(trend.current)}`);
        console.log(`    Average: ${this.formatBytes(trend.average)}`);
        console.log(`    Peak: ${this.formatBytes(trend.peak)}`);
        console.log(`    Samples: ${trend.samples}`);
      });
    }

    // Simple ASCII chart of recent memory usage
    console.log('\n%cRecent Memory Usage:', 'color: #888');
    const chartHeight = 10;
    const normalizedValues = memoryValues.map(v => (v - minMemory) / (maxMemory - minMemory));
    
    for (let row = chartHeight; row >= 0; row--) {
      const threshold = row / chartHeight;
      let line = '';
      
      normalizedValues.forEach(value => {
        line += value >= threshold ? '█' : ' ';
      });
      
      if (row === chartHeight) {
        console.log(`${this.formatBytes(maxMemory).padStart(10)} | ${line}`);
      } else if (row === 0) {
        console.log(`${this.formatBytes(minMemory).padStart(10)} | ${line}`);
      } else {
        console.log(`${' '.repeat(10)} | ${line}`);
      }
    }
    
    console.groupEnd();
  }

  /**
   * Record cleanup operation
   */
  public recordCleanup(resourcesDisposed: number): void {
    if (!this.enabled) return;

    this.lastCleanupTime = Date.now();
    this.cleanupCount++;

    const snapshot = this.takeSnapshot('cleanup');
    
    console.group('%c[MEMORY-PROFILE] Cleanup Operation', 'color: #00ff00; font-weight: bold');
    console.log(`Resources Disposed: ${resourcesDisposed}`);
    console.log(`Total Cleanups: ${this.cleanupCount}`);
    if (snapshot) {
      console.log(`Current Memory: ${this.formatBytes(snapshot.usedJSHeapSize || 0)}`);
    }
    console.groupEnd();
  }

  /**
   * Get stats for overlay display
   */
  public getStats(): {
    current: number;
    peak: number;
    limit: number;
    usage: number;
    lastCleanup: number;
    cleanupCount: number;
    snapshotCount: number;
  } {
    const current = this.getMemoryInfo();
    
    return {
      current: current?.usedJSHeapSize || 0,
      peak: this.peakMemory,
      limit: current?.jsHeapSizeLimit || 0,
      usage: (current?.usedJSHeapSize || 0) / (current?.jsHeapSizeLimit || 1),
      lastCleanup: this.lastCleanupTime,
      cleanupCount: this.cleanupCount,
      snapshotCount: this.snapshots.length
    };
  }

  /**
   * Clear all snapshots
   */
  public clearSnapshots(): void {
    this.snapshots = [];
    console.log('[MemoryProfiler] Cleared all snapshots');
  }

  /**
   * Clear all snapshots and reset stats
   */
  public reset(): void {
    this.snapshots = [];
    this.peakMemory = 0;
    this.trends.clear();
    this.lastCleanupTime = 0;
    this.cleanupCount = 0;
    
    console.log('[MEMORY-PROFILE] Reset all memory profiling data');
  }

  /**
   * Export data for analysis
   */
  public exportData(): {
    snapshots: MemorySnapshot[];
    trends: Record<string, MemoryTrend>;
    stats: ReturnType<MemoryProfiler['getStats']>;
  } {
    return {
      snapshots: [...this.snapshots],
      trends: Object.fromEntries(this.trends),
      stats: this.getStats()
    };
  }
}

// Export singleton instance
export const memoryProfiler = MemoryProfiler.getInstance();

// Export types
export type { MemorySnapshot, MemoryDelta, MemoryTrend };
export { MemoryProfiler };