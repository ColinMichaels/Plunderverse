/**
 * WebGL Detection Utilities
 * Detects WebGL support and provides fallback handling
 */

export interface WebGLSupportStatus {
  supported: boolean;
  version: 'webgl2' | 'webgl' | 'none';
  error?: string;
  suggestions?: string[];
}

/**
 * Check if WebGL is supported in the current browser
 */
export function checkWebGLSupport(): WebGLSupportStatus {
  try {
    // Create a test canvas
    const canvas = document.createElement('canvas');
    
    // Try WebGL 2 first (preferred)
    const gl2 = canvas.getContext('webgl2') || canvas.getContext('experimental-webgl2');
    if (gl2 && gl2 instanceof WebGL2RenderingContext) {
      return {
        supported: true,
        version: 'webgl2'
      };
    }
    
    // Fall back to WebGL 1
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl && gl instanceof WebGLRenderingContext) {
      return {
        supported: true,
        version: 'webgl'
      };
    }
    
    // No WebGL support
    return {
      supported: false,
      version: 'none',
      error: 'WebGL is not supported in your browser or is disabled.',
      suggestions: [
        'Enable hardware acceleration in your browser settings',
        'Update your graphics drivers',
        'Try using a different browser (Chrome, Firefox, Edge)',
        'Check if your GPU is blacklisted in your browser',
        'Disable browser extensions that might interfere with WebGL'
      ]
    };
  } catch (error) {
    console.error('[WebGL Detection] Error checking WebGL support:', error);
    return {
      supported: false,
      version: 'none',
      error: error instanceof Error ? error.message : 'Failed to detect WebGL support',
      suggestions: [
        'Enable hardware acceleration in your browser settings',
        'Update your browser to the latest version',
        'Check browser console for more details'
      ]
    };
  }
}

/**
 * Check if the browser is in a headless mode (commonly used for testing)
 */
export function isHeadlessBrowser(): boolean {
  const navigator = window.navigator;
  
  // Check for common headless browser indicators
  if (navigator.webdriver) return true;
  if (navigator.userAgent.includes('HeadlessChrome')) return true;
  if (navigator.userAgent.includes('PhantomJS')) return true;
  
  // Check for missing features common in headless browsers
  if (!window.chrome && navigator.vendor === 'Google Inc.') return true;
  
  return false;
}

/**
 * Get a user-friendly error message based on the WebGL status
 */
export function getWebGLErrorMessage(status: WebGLSupportStatus): string {
  if (status.supported) return '';
  
  if (isHeadlessBrowser()) {
    return 'WebGL is not available in headless browser mode. Please use a standard browser to play the game.';
  }
  
  return status.error || 'WebGL is required to play this game but is not available.';
}

/**
 * Detect if running in a limited environment (like Replit without GPU)
 */
export function isLimitedEnvironment(): boolean {
  // Check for Replit environment
  if (window.location.hostname.includes('repl.it') || 
      window.location.hostname.includes('replit.com') ||
      window.location.hostname.includes('replit.app')) {
    // In Replit, check if running in the webview (which might not have GPU)
    if (window.parent !== window) {
      return true;
    }
  }
  
  // Check for other indicators of limited environments
  if (isHeadlessBrowser()) return true;
  
  return false;
}