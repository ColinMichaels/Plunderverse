import { useState, useRef, useCallback, useEffect } from "react";

interface MobilePropulsionProps {
  onThrust: (direction: { x: number; y: number; z: number }) => void;
}

export function MobilePropulsion({ onThrust }: MobilePropulsionProps) {
  const [isActive, setIsActive] = useState(false);
  const [knobPosition, setKnobPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const joystickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();

  // Detect if we're on mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (!isMobile) {
    return null;
  }

  const handleDirectionalThrust = useCallback((direction: { x: number; y: number; z: number }) => {
    const callbacks = (window as any).mobileControlCallbacks;
    if (callbacks && callbacks.onMove) {
      callbacks.onMove(direction);
    }
    onThrust(direction); // Also call the prop function
  }, [onThrust]);

  // Calculate joystick input from knob position
  const updateThrustFromPosition = useCallback((x: number, y: number) => {
    const joystickRadius = 50; // Half of the 100px radius
    const distance = Math.sqrt(x * x + y * y);
    const normalizedDistance = Math.min(distance / joystickRadius, 1);
    
    if (normalizedDistance < 0.1) {
      // Dead zone - no movement
      handleDirectionalThrust({ x: 0, y: 0, z: 0 });
      return;
    }

    // Convert to normalized direction with magnitude
    const normalizedX = (x / joystickRadius) * normalizedDistance;
    const normalizedY = (y / joystickRadius) * normalizedDistance;
    
    // Map to 3D movement: x = strafe, y = vertical, -y = forward/backward
    handleDirectionalThrust({ 
      x: normalizedX, 
      y: 0, // We'll handle vertical separately
      z: -normalizedY  // Negative because up on screen = forward in 3D
    });
  }, [handleDirectionalThrust]);

  // Handle touch/mouse start
  const handleStart = useCallback((clientX: number, clientY: number) => {
    if (!joystickRef.current) return;
    
    setIsDragging(true);
    setIsActive(true);
    
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const x = clientX - centerX;
    const y = clientY - centerY;
    
    // Constrain to joystick bounds
    const joystickRadius = 50;
    const distance = Math.sqrt(x * x + y * y);
    const constrainedX = distance > joystickRadius ? (x / distance) * joystickRadius : x;
    const constrainedY = distance > joystickRadius ? (y / distance) * joystickRadius : y;
    
    setKnobPosition({ x: constrainedX, y: constrainedY });
    updateThrustFromPosition(constrainedX, constrainedY);
  }, [updateThrustFromPosition]);

  // Handle touch/mouse move
  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging || !joystickRef.current) return;
    
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const x = clientX - centerX;
    const y = clientY - centerY;
    
    // Constrain to joystick bounds
    const joystickRadius = 50;
    const distance = Math.sqrt(x * x + y * y);
    const constrainedX = distance > joystickRadius ? (x / distance) * joystickRadius : x;
    const constrainedY = distance > joystickRadius ? (y / distance) * joystickRadius : y;
    
    setKnobPosition({ x: constrainedX, y: constrainedY });
    updateThrustFromPosition(constrainedX, constrainedY);
  }, [isDragging, updateThrustFromPosition]);

  // Handle touch/mouse end
  const handleEnd = useCallback(() => {
    setIsDragging(false);
    setIsActive(false);
    
    // Smoothly return to center
    const animateReturn = () => {
      setKnobPosition(prev => {
        const newX = prev.x * 0.8;
        const newY = prev.y * 0.8;
        
        if (Math.abs(newX) < 1 && Math.abs(newY) < 1) {
          handleDirectionalThrust({ x: 0, y: 0, z: 0 });
          return { x: 0, y: 0 };
        }
        
        updateThrustFromPosition(newX, newY);
        animationFrameRef.current = requestAnimationFrame(animateReturn);
        return { x: newX, y: newY };
      });
    };
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(animateReturn);
  }, [handleDirectionalThrust, updateThrustFromPosition]);

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    handleEnd();
  };

  // Mouse event handlers for desktop testing
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX, e.clientY);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    handleMove(e.clientX, e.clientY);
  }, [handleMove]);

  const handleMouseUp = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

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

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 pointer-events-auto z-40 mobile-propulsion">
      {/* Virtual Joystick */}
      <div 
        ref={joystickRef}
        className={`relative w-24 h-24 bg-slate-800/80 border border-slate-600 rounded-full backdrop-blur-sm transition-all duration-200 ${
          isActive ? 'bg-slate-700/90 border-cyan-500' : ''
        }`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        {/* Joystick Base Ring */}
        <div className="absolute inset-2 border border-slate-500/50 rounded-full" />
        
        {/* Draggable Knob */}
        <div 
          ref={knobRef}
          className={`absolute w-6 h-6 rounded-full transition-all duration-100 ${
            isDragging 
              ? 'bg-cyan-400 shadow-lg shadow-cyan-400/50' 
              : isActive 
                ? 'bg-cyan-500' 
                : 'bg-slate-500'
          }`}
          style={{
            left: `calc(50% + ${knobPosition.x}px - 12px)`,
            top: `calc(50% + ${knobPosition.y}px - 12px)`,
            transform: isDragging ? 'scale(1.2)' : 'scale(1)',
          }}
        />
        
        {/* Center Dot */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-slate-400 rounded-full opacity-50" />
        
        {/* Direction Indicators */}
        {isActive && (
          <>
            <div className="absolute top-1 left-1/2 transform -translate-x-1/2 text-xs text-slate-400">↑</div>
            <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 text-xs text-slate-400">↓</div>
            <div className="absolute left-1 top-1/2 transform -translate-y-1/2 text-xs text-slate-400">←</div>
            <div className="absolute right-1 top-1/2 transform -translate-y-1/2 text-xs text-slate-400">→</div>
          </>
        )}
      </div>

      {/* Vertical Controls */}
      <div className="flex flex-col space-y-1 mt-2">
        <button
          className="w-8 h-6 bg-green-500/80 hover:bg-green-400/80 text-slate-900 rounded text-xs flex items-center justify-center transition-colors"
          onTouchStart={() => handleDirectionalThrust({ x: 0, y: 1, z: 0 })}
          onTouchEnd={() => handleDirectionalThrust({ x: 0, y: 0, z: 0 })}
          onMouseDown={() => handleDirectionalThrust({ x: 0, y: 1, z: 0 })}
          onMouseUp={() => handleDirectionalThrust({ x: 0, y: 0, z: 0 })}
        >
          ↟
        </button>
        <button
          className="w-8 h-6 bg-orange-500/80 hover:bg-orange-400/80 text-slate-900 rounded text-xs flex items-center justify-center transition-colors"
          onTouchStart={() => handleDirectionalThrust({ x: 0, y: -1, z: 0 })}
          onTouchEnd={() => handleDirectionalThrust({ x: 0, y: 0, z: 0 })}
          onMouseDown={() => handleDirectionalThrust({ x: 0, y: -1, z: 0 })}
          onMouseUp={() => handleDirectionalThrust({ x: 0, y: 0, z: 0 })}
        >
          ↡
        </button>
      </div>

      {/* Control Label */}
      <div className="text-center mt-1 text-xs text-slate-300">
        {isDragging ? "🚀" : "🎮"}
      </div>
    </div>
  );
}