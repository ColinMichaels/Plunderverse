import React, { useEffect, useState } from 'react';
import { checkWebGLSupport, WebGLSupportStatus } from '../../utils/webglDetection';
import { WebGLFallback } from './WebGLFallback';
import { CanvasErrorBoundary } from './CanvasErrorBoundary';

interface WebGLCheckWrapperProps {
  children: React.ReactNode;
  fallbackMessage?: string;
  showNavigation?: boolean;
}

/**
 * Wrapper component that checks for WebGL support before rendering children
 * Combines WebGL detection with error boundary for comprehensive fallback handling
 */
export const WebGLCheckWrapper: React.FC<WebGLCheckWrapperProps> = ({ 
  children, 
  fallbackMessage,
  showNavigation = true 
}) => {
  const [webGLStatus, setWebGLStatus] = useState<WebGLSupportStatus | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  
  useEffect(() => {
    // Check WebGL support on mount
    const checkSupport = () => {
      try {
        const status = checkWebGLSupport();
        console.log('[WebGLCheckWrapper] WebGL support check:', status);
        setWebGLStatus(status);
      } catch (error) {
        console.error('[WebGLCheckWrapper] Error checking WebGL support:', error);
        setWebGLStatus({
          supported: false,
          version: 'none',
          error: 'Failed to detect WebGL support',
          suggestions: [
            'Try refreshing the page',
            'Check browser console for errors',
            'Try a different browser'
          ]
        });
      } finally {
        setIsChecking(false);
      }
    };
    
    checkSupport();
  }, []);
  
  // Show loading state while checking
  if (isChecking) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Initializing 3D renderer...</p>
        </div>
      </div>
    );
  }
  
  // If WebGL is not supported, show the fallback UI
  if (webGLStatus && !webGLStatus.supported) {
    console.log('[WebGLCheckWrapper] WebGL not supported, showing fallback');
    return <WebGLFallback status={webGLStatus} showNavigation={showNavigation} />;
  }
  
  // If WebGL is supported, wrap children in error boundary for runtime protection
  return (
    <CanvasErrorBoundary fallbackMessage={fallbackMessage}>
      {children}
    </CanvasErrorBoundary>
  );
};