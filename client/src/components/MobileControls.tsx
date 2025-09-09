import { useRef, useEffect, useState } from "react";

export function MobileControls() {
  const [isGyroEnabled, setIsGyroEnabled] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isShooting, setIsShooting] = useState(false);
  const gyroDataRef = useRef({ alpha: 0, beta: 0, gamma: 0 });
  const lastGyroRef = useRef({ alpha: 0, beta: 0, gamma: 0 });

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

  // Touch shooting
  const handleTouchStart = () => {
    setIsShooting(true);
    const callbacks = (window as any).mobileControlCallbacks;
    if (callbacks && callbacks.onShoot) {
      callbacks.onShoot();
    }
  };

  const handleTouchEnd = () => {
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

      {/* Mobile UI elements */}
      {permissionGranted && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Gyro toggle button */}
          <button 
            className="absolute top-16 left-4 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-600 rounded-xl p-2 text-xs text-white pointer-events-auto transition-colors"
            onClick={() => setIsGyroEnabled(!isGyroEnabled)}
          >
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isGyroEnabled ? 'bg-cyan-400' : 'bg-red-400'}`} />
              <span>Gyro {isGyroEnabled ? 'ON' : 'OFF'}</span>
            </div>
          </button>

          {/* Fire Button - Bottom Center */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 pointer-events-auto">
            <button
              className={`w-16 h-16 rounded-full border-2 backdrop-blur-sm transition-all ${
                isShooting 
                  ? 'bg-red-600/80 border-red-400 text-white scale-95' 
                  : 'bg-slate-800/80 border-slate-600 text-slate-300 hover:border-red-400 hover:text-red-400'
              }`}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onMouseDown={handleTouchStart}
              onMouseUp={handleTouchEnd}
            >
              <div className="text-xl">🔥</div>
            </button>
            <div className="text-center mt-1 text-xs text-slate-400">FIRE</div>
          </div>

          {/* Controls indicator - Only show briefly on first load */}
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-slate-800/80 border border-slate-600 rounded-xl p-2 text-center text-white pointer-events-none opacity-0 md:opacity-100">
            <div className="text-xs text-slate-400">Tilt phone to look around</div>
          </div>
        </div>
      )}
    </div>
  );
}