const IS_DEV = import.meta.env.DEV;
const DEBUG_ENABLED = IS_DEV && localStorage.getItem('plunderverse_debug') !== 'false';

type LogLevel = 'log' | 'warn' | 'error' | 'debug' | 'info';

interface DebugConfig {
  enabledCategories: Set<string>;
  verboseMode: boolean;
}

const config: DebugConfig = {
  enabledCategories: new Set(['error', 'critical']),
  verboseMode: false
};

export function setDebugCategory(category: string, enabled: boolean): void {
  if (enabled) {
    config.enabledCategories.add(category);
  } else {
    config.enabledCategories.delete(category);
  }
}

export function setVerboseMode(enabled: boolean): void {
  config.verboseMode = enabled;
}

export function debugLog(category: string, message: string, ...args: unknown[]): void {
  if (!DEBUG_ENABLED) return;
  if (!config.verboseMode && !config.enabledCategories.has(category)) return;
  
  console.log(`[${category.toUpperCase()}]`, message, ...args);
}

export function debugWarn(category: string, message: string, ...args: unknown[]): void {
  if (!DEBUG_ENABLED) return;
  console.warn(`[${category.toUpperCase()}]`, message, ...args);
}

export function debugError(category: string, message: string, ...args: unknown[]): void {
  console.error(`[${category.toUpperCase()}]`, message, ...args);
}

export function debugGroup(category: string, label: string): void {
  if (!DEBUG_ENABLED) return;
  if (!config.verboseMode && !config.enabledCategories.has(category)) return;
  console.group(label);
}

export function debugGroupEnd(): void {
  if (!DEBUG_ENABLED) return;
  console.groupEnd();
}

export function once(key: string, fn: () => void): void {
  const storageKey = `plunderverse_warned_${key}`;
  if (sessionStorage.getItem(storageKey)) return;
  sessionStorage.setItem(storageKey, 'true');
  fn();
}

export function warnOnce(category: string, message: string, ...args: unknown[]): void {
  once(`${category}_${message}`, () => {
    debugWarn(category, message, ...args);
  });
}

if (IS_DEV && typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).setDebugCategory = setDebugCategory;
  (window as unknown as Record<string, unknown>).setVerboseMode = setVerboseMode;
}
