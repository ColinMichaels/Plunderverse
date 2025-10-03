import { useRef, useEffect, useState, useCallback } from "react";

export function MobileControls() {
  const [isGyroEnabled, setIsGyroEnabled] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isShooting, setIsShooting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const gyroDataRef = useRef({ alpha: 0, beta: 0, gamma: 0 });
  const lastGyroRef = useRef({ alpha: 0, beta: 0, gamma: 0 });
  const lastTouchRef = useRef({ x: 0, y: 0 });
  const touchAreaRef = useRef<HTMLDivElement>(null);
  const smoothedLookRef = useRef({ x: 0, y: 0 });
  const lookAnimationRef = useRef<number>();

  // Request device orientation permission
  const requestPermission = async () => {
    if (typeof DeviceOrientationEvent !== 'undefined' && 'requestPermission' in DeviceOrientationEvent) {
      // iOS 13+ permission request
      const permission = await (DeviceOrientationEvent as any).requestPermission();
      if (permission === 'granted') {
        setPermissionGranted(true);
        // Gyro will be enabled by useEffect when permission is granted
      }
    } else if ('DeviceOrientationEvent' in window) {
      // Android and older iOS
      setPermissionGranted(true);
      // Gyro will be enabled by useEffect when permission is granted
    }
  };

  // Gyro control effect
  useEffect(() => {
    if (!permissionGranted || !isGyroEnabled) {
      return;
    }
    
    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (event.alpha !== null && event.beta !== null && event.gamma !== null) {
        gyroDataRef.current = {
          alpha: event.alpha,
          beta: event.beta,
          gamma: event.gamma
        };

        // Calculate rotation deltas with reduced sensitivity
        const deltaX = (event.beta! - lastGyroRef.current.beta) * 0.003; // Much less sensitive
        const deltaY = (event.alpha! - lastGyroRef.current.alpha) * 0.003;

        // Send rotation changes via global callback
        const callbacks = (window as any).mobileControlCallbacks;
        if (callbacks && callbacks.onLook) {
          callbacks.onLook({ x: deltaX, y: deltaY });
        }

        lastGyroRef.current = {
          alpha: event.alpha,
          beta: event.beta,
          gamma: event.gamma
        };
      }
    };

    console.log("Gyro listener added");
    window.addEventListener('deviceorientation', handleOrientation, true);
    
    return () => {
      console.log("Gyro listener removed");
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, [permissionGranted, isGyroEnabled]);

  // Touch drag for camera look around
  const handleTouchDragStart = useCallback((clientX: number, clientY: number) => {
    setIsDragging(true);
    lastTouchRef.current = { x: clientX, y: clientY };
    
    // Cancel any active look animation to avoid conflicts
    if (lookAnimationRef.current) {
      cancelAnimationFrame(lookAnimationRef.current);
      lookAnimationRef.current = undefined;
    }
  }, []);

  const handleTouchDragMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging) return;
    
    const deltaX = (clientX - lastTouchRef.current.x) * 0.002; // Reduced sensitivity for smoother control
    const deltaY = (clientY - lastTouchRef.current.y) * 0.002;
    
    // Always update lastTouchRef to prevent coordinate accumulation
    lastTouchRef.current = { x: clientX, y: clientY };
    
    // Dead zone for tiny movements - increased threshold for real devices
    if (Math.abs(deltaX) < 0.002 && Math.abs(deltaY) < 0.002) {
      // Send zeros but don't return early to avoid coordinate accumulation
      const callbacks = (window as any).mobileControlCallbacks;
      if (callbacks && callbacks.onLook) {
        callbacks.onLook({ x: 0, y: 0 });
      }
      return;
    }
    
    // Smooth interpolation
    const smoothingFactor = 0.7;
    smoothedLookRef.current.x = smoothedLookRef.current.x * smoothingFactor + (-deltaY) * (1 - smoothingFactor);
    smoothedLookRef.current.y = smoothedLookRef.current.y * smoothingFactor + deltaX * (1 - smoothingFactor);
    
    // Send smoothed rotation changes via global callback
    const callbacks = (window as any).mobileControlCallbacks;
    if (callbacks && callbacks.onLook) {
      callbacks.onLook({ 
        x: smoothedLookRef.current.x, 
        y: smoothedLookRef.current.y 
      });
    }
  }, [isDragging]);

  const handleTouchDragEnd = useCallback(() => {
    setIsDragging(false);
    
    // Gradually reduce the smoothed look values to zero
    const dampLook = () => {
      smoothedLookRef.current.x *= 0.9;
      smoothedLookRef.current.y *= 0.9;
      
      if (Math.abs(smoothedLookRef.current.x) > 0.001 || Math.abs(smoothedLookRef.current.y) > 0.001) {
        const callbacks = (window as any).mobileControlCallbacks;
        if (callbacks && callbacks.onLook) {
          callbacks.onLook({ 
            x: smoothedLookRef.current.x, 
            y: smoothedLookRef.current.y 
          });
        }
        lookAnimationRef.current = requestAnimationFrame(dampLook);
      } else {
        smoothedLookRef.current = { x: 0, y: 0 };
        // Send final zero to ensure movement stops completely
        const callbacks = (window as any).mobileControlCallbacks;
        if (callbacks && callbacks.onLook) {
          callbacks.onLook({ x: 0, y: 0 });
        }
      }
    };
    
    if (lookAnimationRef.current) {
      cancelAnimationFrame(lookAnimationRef.current);
    }
    lookAnimationRef.current = requestAnimationFrame(dampLook);
  }, []);

  // Touch event handlers for the touch area
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleTouchDragStart(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault(); // Prevent scrolling
    const touch = e.touches[0];
    handleTouchDragMove(touch.clientX, touch.clientY);
  };

  const handleTouchEnd = () => {
    handleTouchDragEnd();
  };

  // Mouse handlers for desktop testing
  const handleMouseDown = (e: React.MouseEvent) => {
    handleTouchDragStart(e.clientX, e.clientY);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    handleTouchDragMove(e.clientX, e.clientY);
  }, [handleTouchDragMove]);

  const handleMouseUp = useCallback(() => {
    handleTouchDragEnd();
  }, [handleTouchDragEnd]);

  // Set up global mouse listeners when dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Cleanup look animation frame on unmount and clear global callbacks
  useEffect(() => {
    return () => {
      if (lookAnimationRef.current) {
        cancelAnimationFrame(lookAnimationRef.current);
        lookAnimationRef.current = undefined;
      }
      // Clear global callbacks to prevent memory leaks
      if ((window as any).mobileControlCallbacks) {
        (window as any).mobileControlCallbacks = null;
      }
      // Clear all refs
      smoothedLookRef.current = { x: 0, y: 0 };
      lastTouchRef.current = { x: 0, y: 0 };
      gyroDataRef.current = { alpha: 0, beta: 0, gamma: 0 };
      lastGyroRef.current = { alpha: 0, beta: 0, gamma: 0 };
    };
  }, []);

  // Touch shooting for action buttons
  const handleShootTouchStart = () => {
    setIsShooting(true);
    const callbacks = (window as any).mobileControlCallbacks;
    if (callbacks && callbacks.onShoot) {
      callbacks.onShoot();
    }
  };

  const handleShootTouchEnd = () => {
    setIsShooting(false);
  };

  // Detect if we're on mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (!isMobile) {
    return null; // Don't show mobile controls on desktop
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {/* Permission request overlay */}
      {!permissionGranted && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-auto">
          <div className="bg-slate-800 border border-slate-600 rounded-xl p-6 text-center max-w-sm mx-4">
            <h3 className="text-cyan-400 text-lg mb-4">Enable Gyro Controls</h3>
            <p className="text-slate-300 text-sm mb-4">
              Allow device orientation access to control your ship with phone movement
            </p>
            <button
              onClick={requestPermission}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 px-6 py-2 rounded-lg transition-colors"
            >
              Enable Gyro
            </button>
          </div>
        </div>
      )}

      {/* Mobile UI elements - always available */}
      <div className="absolute inset-0 pointer-events-none">
          {/* Control toggle buttons */}
          <div className="absolute top-16 left-4 space-y-2 z-30">
            {/* Gyro toggle - only show if permission granted */}
            {permissionGranted && (
              <button 
                className="block bg-slate-800/80 hover:bg-slate-700/80 border border-slate-600 rounded-xl p-2 text-xs text-white pointer-events-auto transition-colors"
                onClick={() => setIsGyroEnabled(!isGyroEnabled)}
              >
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${isGyroEnabled ? 'bg-cyan-400' : 'bg-red-400'}`} />
                  <span>Gyro {isGyroEnabled ? 'ON' : 'OFF'}</span>
                </div>
              </button>
            )}
            
            {/* Touch Look button - always available */}
            <button 
              className="block bg-slate-800/80 hover:bg-slate-700/80 border border-slate-600 rounded-xl p-2 text-xs text-white pointer-events-auto transition-colors"
              onClick={() => setIsGyroEnabled(false)}
            >
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${!isGyroEnabled ? 'bg-cyan-400' : 'bg-red-400'}`} />
                <span>Touch Look</span>
              </div>
            </button>
          </div>

          {/* Mobile Action Buttons - Bottom with higher z-index */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 pointer-events-auto flex space-x-4 z-20">
            {/* Fire Button */}
            <div className="text-center">
              <button
                className={`w-12 h-12 rounded-full border-2 backdrop-blur-sm transition-all ${
                  isShooting 
                    ? 'bg-red-600/80 border-red-400 text-white scale-95' 
                    : 'bg-slate-800/80 border-slate-600 text-slate-300 hover:border-red-400 hover:text-red-400'
                }`}
                onTouchStart={() => handleShootTouchStart()}
                onTouchEnd={() => handleShootTouchEnd()}
                onMouseDown={() => handleShootTouchStart()}
                onMouseUp={() => handleShootTouchEnd()}
              >
                <div className="text-lg">🔥</div>
              </button>
              <div className="text-xs text-slate-400 mt-1">FIRE</div>
            </div>

            {/* Landing Button */}
            <div className="text-center">
              <button
                className="w-12 h-12 rounded-full border-2 bg-slate-800/80 border-slate-600 text-slate-300 hover:border-orange-400 hover:text-orange-400 backdrop-blur-sm transition-all"
                onTouchStart={() => {
                  const callbacks = (window as any).mobileControlCallbacks;
                  if (callbacks && callbacks.onLand) {
                    callbacks.onLand();
                  }
                }}
              >
                <div className="text-lg">🛬</div>
              </button>
              <div className="text-xs text-slate-400 mt-1">LAND</div>
            </div>
          </div>

          {/* Touch Drag Areas for Camera Control - specific safe zones that don't block UI */}
          {!isGyroEnabled && (
            <>
              {/* Central top area - safe for camera look */}
              <div 
                ref={touchAreaRef}
                className="absolute top-20 left-20 right-20 bottom-40 pointer-events-auto z-5"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleMouseDown}
                style={{ touchAction: 'none' }}
              >
                {/* Touch indicator */}
                {isDragging && (
                  <div className="absolute top-4 right-4 bg-cyan-500/80 text-white text-xs px-2 py-1 rounded pointer-events-none">
                    👆 Look Around
                  </div>
                )}
              </div>
              
              {/* Additional touch zones - left and right edges for easier access */}
              <div 
                className="absolute top-32 left-0 w-16 bottom-40 pointer-events-auto z-5"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{ touchAction: 'none' }}
              />
              <div 
                className="absolute top-32 right-0 w-16 bottom-40 pointer-events-auto z-5"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{ touchAction: 'none' }}
              />
            </>
          )}

          {/* Controls indicator */}
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-slate-800/80 border border-slate-600 rounded-xl p-2 text-center text-white pointer-events-none opacity-90">
            <div className="text-xs text-slate-400">
              {isGyroEnabled ? "Tilt phone to look around" : "Drag anywhere to look around"}
            </div>
          </div>
      </div>
    </div>
  );
}