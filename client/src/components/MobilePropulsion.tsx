import { useState } from "react";

interface MobilePropulsionProps {
  onThrust: (direction: { x: number; y: number; z: number }) => void;
}

export function MobilePropulsion({ onThrust }: MobilePropulsionProps) {
  const [isActive, setIsActive] = useState(false);

  // Detect if we're on mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (!isMobile) {
    return null;
  }

  const handleDirectionalThrust = (direction: { x: number; y: number; z: number }) => {
    const callbacks = (window as any).mobileControlCallbacks;
    if (callbacks && callbacks.onMove) {
      callbacks.onMove(direction);
    }
    onThrust(direction); // Also call the prop function
  };

  return (
    <div className="fixed bottom-4 right-4 pointer-events-auto z-40 mobile-propulsion">
      {/* Directional Control Pad */}
      <div className="relative w-32 h-32 bg-gray-900/80 border border-gray-600 rounded-full backdrop-blur-sm">
        {/* Center indicator */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-gray-600 rounded-full" />
        
        {/* Forward */}
        <button
          className="absolute top-2 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-cyan-600/80 hover:bg-cyan-500/80 text-white rounded-full text-xs flex items-center justify-center"
          onTouchStart={() => handleDirectionalThrust({ x: 0, y: 0, z: 1 })}
          onTouchEnd={() => handleDirectionalThrust({ x: 0, y: 0, z: 0 })}
          onMouseDown={() => handleDirectionalThrust({ x: 0, y: 0, z: 1 })}
          onMouseUp={() => handleDirectionalThrust({ x: 0, y: 0, z: 0 })}
        >
          ↑
        </button>

        {/* Backward */}
        <button
          className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-cyan-600/80 hover:bg-cyan-500/80 text-white rounded-full text-xs flex items-center justify-center"
          onTouchStart={() => handleDirectionalThrust({ x: 0, y: 0, z: -1 })}
          onTouchEnd={() => handleDirectionalThrust({ x: 0, y: 0, z: 0 })}
          onMouseDown={() => handleDirectionalThrust({ x: 0, y: 0, z: -1 })}
          onMouseUp={() => handleDirectionalThrust({ x: 0, y: 0, z: 0 })}
        >
          ↓
        </button>

        {/* Left */}
        <button
          className="absolute left-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-cyan-600/80 hover:bg-cyan-500/80 text-white rounded-full text-xs flex items-center justify-center"
          onTouchStart={() => handleDirectionalThrust({ x: -1, y: 0, z: 0 })}
          onTouchEnd={() => handleDirectionalThrust({ x: 0, y: 0, z: 0 })}
          onMouseDown={() => handleDirectionalThrust({ x: -1, y: 0, z: 0 })}
          onMouseUp={() => handleDirectionalThrust({ x: 0, y: 0, z: 0 })}
        >
          ←
        </button>

        {/* Right */}
        <button
          className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-cyan-600/80 hover:bg-cyan-500/80 text-white rounded-full text-xs flex items-center justify-center"
          onTouchStart={() => handleDirectionalThrust({ x: 1, y: 0, z: 0 })}
          onTouchEnd={() => handleDirectionalThrust({ x: 0, y: 0, z: 0 })}
          onMouseDown={() => handleDirectionalThrust({ x: 1, y: 0, z: 0 })}
          onMouseUp={() => handleDirectionalThrust({ x: 0, y: 0, z: 0 })}
        >
          →
        </button>

        {/* Up */}
        <button
          className="absolute top-6 right-6 w-6 h-6 bg-green-600/80 hover:bg-green-500/80 text-white rounded-full text-xs flex items-center justify-center"
          onTouchStart={() => handleDirectionalThrust({ x: 0, y: 1, z: 0 })}
          onTouchEnd={() => handleDirectionalThrust({ x: 0, y: 0, z: 0 })}
          onMouseDown={() => handleDirectionalThrust({ x: 0, y: 1, z: 0 })}
          onMouseUp={() => handleDirectionalThrust({ x: 0, y: 0, z: 0 })}
        >
          ↟
        </button>

        {/* Down */}
        <button
          className="absolute bottom-6 right-6 w-6 h-6 bg-orange-600/80 hover:bg-orange-500/80 text-white rounded-full text-xs flex items-center justify-center"
          onTouchStart={() => handleDirectionalThrust({ x: 0, y: -1, z: 0 })}
          onTouchEnd={() => handleDirectionalThrust({ x: 0, y: 0, z: 0 })}
          onMouseDown={() => handleDirectionalThrust({ x: 0, y: -1, z: 0 })}
          onMouseUp={() => handleDirectionalThrust({ x: 0, y: 0, z: 0 })}
        >
          ↡
        </button>
      </div>

      {/* Control Label */}
      <div className="text-center mt-2 text-xs text-gray-300">
        THRUST
      </div>
    </div>
  );
}