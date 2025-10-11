import { InventoryItem, TransactionEvent } from './types';
import { ResourceData } from '../../lib/planetData';

// Debug configuration - can be controlled via environment or runtime flags
export interface DebugConfig {
  enabled: boolean;
  transactionLogging: boolean;
  stateAssertions: boolean;
  eventValidation: boolean;
  consistencyChecks: boolean;
  performanceTracking: boolean;
}

// Default configuration - enable debugging in development only
const getDefaultConfig = (): DebugConfig => {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    enabled: !isProduction, // Enable debugging only in development
    transactionLogging: !isProduction,
    stateAssertions: !isProduction,
    eventValidation: !isProduction,
    consistencyChecks: !isProduction,
    performanceTracking: false // Disable by default to avoid performance impact
  };
};

let debugConfig: DebugConfig = getDefaultConfig();

export const setDebugConfig = (config: Partial<DebugConfig>) => {
  debugConfig = { ...debugConfig, ...config };
};

export const getDebugConfig = (): DebugConfig => debugConfig;

// Consistent debug prefixes
export const DEBUG_PREFIXES = {
  TRANSACTION: '[ECONOMY-DEBUG]',
  SYNC_CHECK: '[SYNC-CHECK]',
  EVENT_DEBUG: '[EVENT-DEBUG]',
  ASSERTION: '[ASSERTION]',
  CONSISTENCY: '[CONSISTENCY]',
  PERFORMANCE: '[PERF-DEBUG]',
  CHECKPOINT: '[CHECKPOINT]'
} as const;

// Transaction context for tracking complex operations
export interface TransactionContext {
  id: string;
  type: string;
  startTime: number;
  userId?: string;
  operationData?: Record<string, any>;
}

// Global transaction tracking
const activeTransactions = new Map<string, TransactionContext>();
let transactionIdCounter = 0;

export const createTransactionContext = (type: string, operationData?: Record<string, any>): TransactionContext => {
  const context: TransactionContext = {
    id: `tx_${++transactionIdCounter}_${Date.now()}`,
    type,
    startTime: performance.now(),
    operationData
  };
  
  activeTransactions.set(context.id, context);
  
  if (debugConfig.enabled && debugConfig.transactionLogging) {
    console.log(`${DEBUG_PREFIXES.TRANSACTION} Started transaction ${context.id} (${type})`, operationData);
  }
  
  return context;
};

export const completeTransactionContext = (context: TransactionContext, success: boolean, result?: any) => {
  const duration = performance.now() - context.startTime;
  activeTransactions.delete(context.id);
  
  if (debugConfig.enabled && debugConfig.transactionLogging) {
    console.log(`${DEBUG_PREFIXES.TRANSACTION} Completed transaction ${context.id} in ${duration.toFixed(2)}ms`, {
      success,
      result,
      duration
    });
  }
  
  if (debugConfig.enabled && debugConfig.performanceTracking && duration > 100) {
    console.warn(`${DEBUG_PREFIXES.PERFORMANCE} Slow transaction detected: ${context.id} took ${duration.toFixed(2)}ms`);
  }
};

// State snapshot utilities
export interface EconomyStateSnapshot {
  timestamp: number;
  credits: number;
  inventoryItems: InventoryItem[];
  storageUsed: number;
  storageCapacity: number;
  totalInventoryValue: number;
  checksum: string;
}

export const createStateSnapshot = (
  credits: number,
  items: InventoryItem[],
  storageCapacity: number
): EconomyStateSnapshot => {
  const storageUsed = items.reduce((total, item) => total + item.quantity, 0);
  const totalInventoryValue = items.reduce((total, item) => total + (item.value * item.quantity), 0);
  
  // Create a simple checksum for state validation
  const checksum = btoa(JSON.stringify({
    credits,
    itemCount: items.length,
    storageUsed,
    totalValue: totalInventoryValue
  }));
  
  return {
    timestamp: Date.now(),
    credits,
    inventoryItems: [...items], // Deep copy
    storageUsed,
    storageCapacity,
    totalInventoryValue,
    checksum
  };
};

// Assertion utilities
export const assert = (condition: boolean, message: string, context?: any) => {
  if (!debugConfig.enabled || !debugConfig.stateAssertions) return;
  
  if (!condition) {
    console.error(`${DEBUG_PREFIXES.ASSERTION} ASSERTION FAILED: ${message}`, context);
    // In development, throw an error to catch issues early
    if (debugConfig.enabled) {
      throw new Error(`Economy Assertion Failed: ${message}`);
    }
  }
};

export const validateStorageConsistency = (
  items: InventoryItem[],
  expectedStorageUsed: number,
  context: string
) => {
  if (!debugConfig.enabled || !debugConfig.consistencyChecks) return;
  
  const actualStorageUsed = items.reduce((total, item) => total + item.quantity, 0);
  
  assert(
    actualStorageUsed === expectedStorageUsed,
    `Storage inconsistency in ${context}: expected ${expectedStorageUsed}, actual ${actualStorageUsed}`,
    { items, expectedStorageUsed, actualStorageUsed }
  );
  
  // Validate no negative quantities
  items.forEach(item => {
    assert(
      item.quantity >= 0,
      `Negative quantity detected in ${context}: ${item.type} has ${item.quantity}`,
      { item, context }
    );
  });
};

export const validateCreditsConsistency = (
  credits: number,
  context: string
) => {
  if (!debugConfig.enabled || !debugConfig.consistencyChecks) return;
  
  assert(
    credits >= 0,
    `Negative credits detected in ${context}: ${credits}`,
    { credits, context }
  );
  
  assert(
    Number.isFinite(credits),
    `Invalid credits value in ${context}: ${credits}`,
    { credits, context }
  );
};

// Event tracking
const recentEvents: TransactionEvent[] = [];
const MAX_EVENT_HISTORY = 50;

export const trackEvent = (event: TransactionEvent) => {
  if (!debugConfig.enabled || !debugConfig.eventValidation) return;
  
  recentEvents.push(event);
  if (recentEvents.length > MAX_EVENT_HISTORY) {
    recentEvents.shift();
  }
  
  console.log(`${DEBUG_PREFIXES.EVENT_DEBUG} Event emitted:`, event);
};

export const validateEventSequence = (expectedEvents: string[], context: string) => {
  if (!debugConfig.enabled || !debugConfig.eventValidation) return;
  
  const recentEventTypes = recentEvents.slice(-expectedEvents.length).map(e => e.type);
  
  assert(
    JSON.stringify(recentEventTypes) === JSON.stringify(expectedEvents),
    `Event sequence mismatch in ${context}: expected ${expectedEvents.join(', ')}, got ${recentEventTypes.join(', ')}`,
    { expectedEvents, recentEventTypes, recentEvents }
  );
};

// Performance utilities
const performanceMarks = new Map<string, number>();

export const markPerformanceStart = (operation: string) => {
  if (!debugConfig.enabled || !debugConfig.performanceTracking) return;
  
  performanceMarks.set(operation, performance.now());
};

export const markPerformanceEnd = (operation: string, threshold = 50) => {
  if (!debugConfig.enabled || !debugConfig.performanceTracking) return;
  
  const startTime = performanceMarks.get(operation);
  if (startTime) {
    const duration = performance.now() - startTime;
    performanceMarks.delete(operation);
    
    if (duration > threshold) {
      console.warn(`${DEBUG_PREFIXES.PERFORMANCE} Slow operation: ${operation} took ${duration.toFixed(2)}ms`);
    } else {
      console.log(`${DEBUG_PREFIXES.PERFORMANCE} ${operation} completed in ${duration.toFixed(2)}ms`);
    }
    
    return duration;
  }
  
  return 0;
};

// Checkpoint logging for integration points
export const checkpoint = (name: string, data?: any) => {
  if (!debugConfig.enabled) return;
  
  console.log(`${DEBUG_PREFIXES.CHECKPOINT} ${name}`, data);
};

// State diff utilities for before/after logging
export const logStateDiff = (
  before: EconomyStateSnapshot,
  after: EconomyStateSnapshot,
  operation: string
) => {
  if (!debugConfig.enabled || !debugConfig.transactionLogging) return;
  
  const creditsDiff = after.credits - before.credits;
  const storageDiff = after.storageUsed - before.storageUsed;
  const valueDiff = after.totalInventoryValue - before.totalInventoryValue;
  
  console.log(`${DEBUG_PREFIXES.TRANSACTION} State diff for ${operation}:`, {
    credits: { before: before.credits, after: after.credits, diff: creditsDiff },
    storage: { before: before.storageUsed, after: after.storageUsed, diff: storageDiff },
    inventoryValue: { before: before.totalInventoryValue, after: after.totalInventoryValue, diff: valueDiff },
    itemChanges: {
      before: before.inventoryItems.length,
      after: after.inventoryItems.length
    }
  });
};

// Comprehensive economy state validation
export const validateEconomyState = (
  credits: number,
  items: InventoryItem[],
  storageCapacity: number,
  context: string
) => {
  if (!debugConfig.enabled || !debugConfig.consistencyChecks) return;
  
  console.log(`${DEBUG_PREFIXES.SYNC_CHECK} Validating economy state: ${context}`);
  
  // Validate credits
  validateCreditsConsistency(credits, context);
  
  // Validate storage
  const calculatedStorageUsed = items.reduce((total, item) => total + item.quantity, 0);
  validateStorageConsistency(items, calculatedStorageUsed, context);
  
  // Validate storage capacity
  assert(
    calculatedStorageUsed <= storageCapacity,
    `Storage overflow in ${context}: used ${calculatedStorageUsed}, capacity ${storageCapacity}`,
    { calculatedStorageUsed, storageCapacity, items }
  );
  
  // Validate inventory value calculation
  const calculatedValue = items.reduce((total, item) => total + (item.value * item.quantity), 0);
  assert(
    calculatedValue >= 0,
    `Negative inventory value in ${context}: ${calculatedValue}`,
    { items, calculatedValue }
  );
  
  console.log(`${DEBUG_PREFIXES.SYNC_CHECK} State validation passed: ${context}`);
};

// Debug statistics
export const getDebugStats = () => {
  return {
    config: debugConfig,
    activeTransactions: activeTransactions.size,
    recentEventsCount: recentEvents.length,
    performanceMarks: performanceMarks.size
  };
};

// Reset debug state (useful for testing)
export const resetDebugState = () => {
  activeTransactions.clear();
  recentEvents.length = 0;
  performanceMarks.clear();
  transactionIdCounter = 0;
};

export default {
  setDebugConfig,
  getDebugConfig,
  createTransactionContext,
  completeTransactionContext,
  createStateSnapshot,
  assert,
  validateStorageConsistency,
  validateCreditsConsistency,
  trackEvent,
  validateEventSequence,
  markPerformanceStart,
  markPerformanceEnd,
  checkpoint,
  logStateDiff,
  validateEconomyState,
  getDebugStats,
  resetDebugState
};