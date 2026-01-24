import React, { createContext, useContext, useEffect, useState } from 'react';

type PlatformType = 'desktop' | 'mobile';

interface PlatformInfo {
  type: PlatformType;
  isTouchDevice: boolean;
  isWebGLSupported: boolean;
  viewportWidth: number;
  viewportHeight: number;
  pixelRatio: number;
}

interface PlatformContextValue {
  platform: PlatformInfo;
  isMobile: boolean;
  isDesktop: boolean;
  forceMobile: boolean;
  setForceMobile: (force: boolean) => void;
}

const defaultPlatform: PlatformInfo = {
  type: 'desktop',
  isTouchDevice: false,
  isWebGLSupported: true,
  viewportWidth: 1920,
  viewportHeight: 1080,
  pixelRatio: 1
};

const PlatformContext = createContext<PlatformContextValue>({
  platform: defaultPlatform,
  isMobile: false,
  isDesktop: true,
  forceMobile: false,
  setForceMobile: () => {}
});

function detectPlatform(): PlatformInfo {
  if (typeof window === 'undefined') return defaultPlatform;

  const width = window.innerWidth;
  const height = window.innerHeight;
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isMobileSize = width < 768 || (width < height && width < 1024);
  
  let isWebGLSupported = true;
  try {
    const canvas = document.createElement('canvas');
    isWebGLSupported = !!(canvas.getContext('webgl') || canvas.getContext('webgl2'));
  } catch {
    isWebGLSupported = false;
  }

  return {
    type: isMobileSize || isTouchDevice ? 'mobile' : 'desktop',
    isTouchDevice,
    isWebGLSupported,
    viewportWidth: width,
    viewportHeight: height,
    pixelRatio: window.devicePixelRatio || 1
  };
}

interface PlatformProviderProps {
  children: React.ReactNode;
}

export function PlatformProvider({ children }: PlatformProviderProps) {
  const [platform, setPlatform] = useState<PlatformInfo>(detectPlatform);
  const [forceMobile, setForceMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setPlatform(detectPlatform());
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const effectiveMobile = forceMobile || platform.type === 'mobile';

  return (
    <PlatformContext.Provider value={{
      platform,
      isMobile: effectiveMobile,
      isDesktop: !effectiveMobile,
      forceMobile,
      setForceMobile
    }}>
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatformInfo(): PlatformContextValue {
  return useContext(PlatformContext);
}
