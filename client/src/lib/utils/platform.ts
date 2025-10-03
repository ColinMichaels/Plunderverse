/**
 * Platform detection utilities for identifying device type and capabilities
 */

// Check if we're running in a browser environment
const isBrowser = typeof window !== 'undefined';

/**
 * Detect if the device has touch capabilities
 */
export const isTouch = (): boolean => {
  if (!isBrowser) return false;
  
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0 ||
    window.matchMedia('(pointer: coarse)').matches
  );
};

/**
 * Get the current viewport dimensions
 */
export const getViewportSize = (): { width: number; height: number } => {
  if (!isBrowser) return { width: 0, height: 0 };
  
  return {
    width: window.innerWidth || document.documentElement.clientWidth,
    height: window.innerHeight || document.documentElement.clientHeight
  };
};

/**
 * Check if the device is a mobile device based on multiple factors
 */
export const isMobile = (): boolean => {
  if (!isBrowser) return false;
  
  const viewport = getViewportSize();
  const hasTouch = isTouch();
  
  // Check viewport width (typical mobile breakpoint)
  const isMobileWidth = viewport.width < 768;
  
  // Check user agent for mobile devices
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  const isMobileUserAgent = mobileRegex.test(navigator.userAgent);
  
  // Check for mobile-specific features
  const hasMobileFeatures = 
    'orientation' in window ||
    'ondeviceorientation' in window;
  
  // Consider it mobile if:
  // 1. Has touch AND small viewport
  // 2. Mobile user agent
  // 3. Has mobile features AND small viewport
  return (hasTouch && isMobileWidth) || 
         isMobileUserAgent || 
         (hasMobileFeatures && isMobileWidth);
};

/**
 * Check if the device is a tablet
 */
export const isTablet = (): boolean => {
  if (!isBrowser) return false;
  
  const viewport = getViewportSize();
  const hasTouch = isTouch();
  
  // iPad detection
  const isIPad = /iPad/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && hasTouch);
  
  // Android tablet detection (larger screen with touch)
  const isAndroidTablet = /Android/i.test(navigator.userAgent) && 
    viewport.width >= 768 && hasTouch;
  
  return isIPad || isAndroidTablet;
};

/**
 * Check if the device is a desktop
 */
export const isDesktop = (): boolean => {
  return !isMobile() && !isTablet();
};

/**
 * Get the device orientation
 */
export const getOrientation = (): 'portrait' | 'landscape' | 'unknown' => {
  if (!isBrowser) return 'unknown';
  
  if ('orientation' in window) {
    return Math.abs((window as any).orientation) === 90 ? 'landscape' : 'portrait';
  }
  
  const viewport = getViewportSize();
  return viewport.width > viewport.height ? 'landscape' : 'portrait';
};

/**
 * Check if the device supports WebGL (for 3D rendering)
 */
export const supportsWebGL = (): boolean => {
  if (!isBrowser) return false;
  
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch (e) {
    return false;
  }
};

/**
 * Get device pixel ratio for high DPI displays
 */
export const getDevicePixelRatio = (): number => {
  if (!isBrowser) return 1;
  return window.devicePixelRatio || 1;
};

/**
 * Check if the device has a notch (iPhone X and later)
 */
export const hasNotch = (): boolean => {
  if (!isBrowser) return false;
  
  // Check for iOS devices with notch
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  if (!isIOS) return false;
  
  // Check safe area insets (notch detection)
  const hasInsets = CSS.supports('padding-top: env(safe-area-inset-top)');
  
  // iPhone X and later have specific screen dimensions
  const viewport = getViewportSize();
  const isIPhoneXDimensions = 
    (viewport.width === 375 && viewport.height === 812) || // iPhone X/XS/11 Pro
    (viewport.width === 414 && viewport.height === 896) || // iPhone XR/XS Max/11/11 Pro Max
    (viewport.width === 390 && viewport.height === 844) || // iPhone 12/13/14
    (viewport.width === 393 && viewport.height === 852) || // iPhone 14 Pro
    (viewport.width === 430 && viewport.height === 932);   // iPhone 14 Pro Max
  
  return hasInsets && isIPhoneXDimensions;
};

/**
 * Platform detection result interface
 */
export interface PlatformInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouch: boolean;
  hasWebGL: boolean;
  viewport: { width: number; height: number };
  orientation: 'portrait' | 'landscape' | 'unknown';
  devicePixelRatio: number;
  hasNotch: boolean;
  userAgent: string;
}

/**
 * Get comprehensive platform information
 */
export const getPlatformInfo = (): PlatformInfo => {
  return {
    isMobile: isMobile(),
    isTablet: isTablet(),
    isDesktop: isDesktop(),
    isTouch: isTouch(),
    hasWebGL: supportsWebGL(),
    viewport: getViewportSize(),
    orientation: getOrientation(),
    devicePixelRatio: getDevicePixelRatio(),
    hasNotch: hasNotch(),
    userAgent: isBrowser ? navigator.userAgent : ''
  };
};

/**
 * React hook for platform detection with SSR support
 */
export const usePlatform = () => {
  if (!isBrowser) {
    // Return default values for server-side rendering
    return {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isTouch: false,
      hasWebGL: true,
      viewport: { width: 1920, height: 1080 },
      orientation: 'landscape' as const,
      devicePixelRatio: 1,
      hasNotch: false,
      userAgent: ''
    };
  }
  
  return getPlatformInfo();
};