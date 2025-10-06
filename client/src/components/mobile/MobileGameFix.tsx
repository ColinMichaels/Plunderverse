import React, { useEffect } from 'react';

/**
 * Simple test component to verify mobile rendering
 */
export const MobileGameFix: React.FC = () => {
  // Force inject a test element into the DOM on mount
  useEffect(() => {
    console.error('🚨 [MobileGameFix] Mounting and injecting test element...');
    
    // Remove any existing test element
    const existing = document.getElementById('mobile-test-fix');
    if (existing) existing.remove();
    
    // Create and inject test element
    const testDiv = document.createElement('div');
    testDiv.id = 'mobile-test-fix';
    testDiv.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: linear-gradient(45deg, #00ff00, #00ffff) !important;
      color: black !important;
      font-size: 28px !important;
      font-weight: bold !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: center !important;
      align-items: center !important;
      z-index: 2147483647 !important;
      pointer-events: all !important;
      text-align: center !important;
    `;
    
    testDiv.innerHTML = `
      <h1 style="font-size: 40px; margin: 20px;">✅ MOBILE FIX WORKING!</h1>
      <p style="margin: 10px;">If you see this gradient screen, rendering is fixed!</p>
      <p style="font-size: 20px; margin: 10px;">Viewport: ${window.innerWidth}x${window.innerHeight}px</p>
      <p style="font-size: 16px; margin: 10px; color: #333;">Platform: Mobile detected</p>
      <button onclick="window.location.reload()" 
        style="margin-top: 20px; padding: 20px 40px; background-color: black; color: white; 
          border: none; border-radius: 10px; font-size: 20px; cursor: pointer;">
        Reload Page
      </button>
    `;
    
    document.body.appendChild(testDiv);
    console.error('🚨 [MobileGameFix] Test element injected into body!');
    
    return () => {
      const el = document.getElementById('mobile-test-fix');
      if (el) el.remove();
    };
  }, []);
  
  // Also return a visible component
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'cyan',
      color: 'black',
      fontSize: '24px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 999999
    }}>
      <h1>Mobile Component Rendered</h1>
    </div>
  );
};