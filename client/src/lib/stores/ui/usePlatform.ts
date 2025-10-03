import { create } from 'zustand';
import { getPlatformInfo, PlatformInfo } from '../../utils/platform';

interface PlatformState extends PlatformInfo {
  // Platform type for easy routing
  platformType: 'mobile' | 'desktop';
  
  // Actions
  updatePlatform: () => void;
  setPlatformType: (type: 'mobile' | 'desktop') => void;
}

export const usePlatform = create<PlatformState>((set, get) => {
  // Get initial platform info
  const initialInfo = getPlatformInfo();
  
  return {
    // Initial platform info
    ...initialInfo,
    platformType: initialInfo.isMobile || initialInfo.isTablet ? 'mobile' : 'desktop',
    
    // Actions
    updatePlatform: () => {
      const newInfo = getPlatformInfo();
      const platformType = newInfo.isMobile || newInfo.isTablet ? 'mobile' : 'desktop';
      
      set({
        ...newInfo,
        platformType
      });
      
      console.log('[PLATFORM] Platform info updated:', {
        type: platformType,
        viewport: newInfo.viewport,
        touch: newInfo.isTouch,
        webgl: newInfo.hasWebGL
      });
    },
    
    setPlatformType: (type) => {
      set({ platformType: type });
      console.log('[PLATFORM] Platform type manually set to:', type);
    }
  };
});

// Listen for viewport changes
if (typeof window !== 'undefined') {
  let resizeTimeout: NodeJS.Timeout;
  
  const handleResize = () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      usePlatform.getState().updatePlatform();
    }, 250); // Debounce resize events
  };
  
  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', handleResize);
  
  // Update platform info on load
  window.addEventListener('load', () => {
    usePlatform.getState().updatePlatform();
  });
}

// Export a hook to use platform detection in components
export const usePlatformDetection = () => {
  const platform = usePlatform();
  
  return {
    isMobile: platform.platformType === 'mobile',
    isDesktop: platform.platformType === 'desktop',
    platformType: platform.platformType,
    viewport: platform.viewport,
    isTouch: platform.isTouch,
    hasWebGL: platform.hasWebGL,
    orientation: platform.orientation
  };
};