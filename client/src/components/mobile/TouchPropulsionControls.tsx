import React, { useRef, useCallback, useEffect, useState } from 'react';
import { useInput } from '../../stores/useInput';
import { useMobileLayout } from '../../stores/useMobileLayout';

interface TouchPropulsionControlsProps {
  children: React.ReactNode;
}

export function TouchPropulsionControls({ children }: TouchPropulsionControlsProps) {
  const { move, look, isMobile, setDragging } = useInput();
  const { config } = useMobileLayout();
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Touch state management
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const currentTouchRef = useRef({ x: 0, y: 0 });
  const isThrusting = useRef(false);
  const isDraggingLook = useRef(false);
  const lastTouchTime = useRef(0);
  const thrustAnimationRef = useRef<number>();
  const [showInstructions, setShowInstructions] = useState(true);
  
  // Convert screen Y position to forward thrust speed
  const screenToThrustSpeed = useCallback((clientY: number) => {
    if (!canvasRef.current) return 0;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const centerY = rect.height / 2;
    
    // Convert Y position to thrust speed
    // Top of screen = max forward speed
    // Center = no thrust
    // Bottom = max backward speed
    const normalizedY = (clientY - rect.top - centerY) / centerY;
    
    // Invert Y so up = forward, down = backward
    const speed = -normalizedY;
    
    // Apply smaller deadzone in center for better responsiveness
    if (Math.abs(speed) < 0.1) return 0;
    
    // Increase thrust power
    return speed * 1.5;
  }, []);
  
  // Handle look controls (drag without thrust)
  const handleLookMove = useCallback((clientX: number, clientY: number) => {
    if (!isDraggingLook.current) return;
    
    const deltaX = (clientX - currentTouchRef.current.x) * 0.003;
    const deltaY = (clientY - currentTouchRef.current.y) * 0.003;
    
    currentTouchRef.current = { x: clientX, y: clientY };
    
    // Dead zone for tiny movements
    if (Math.abs(deltaX) < 0.003 && Math.abs(deltaY) < 0.003) return;
    
    // Apply look rotation - intuitive mapping
    look({ x: deltaY, y: deltaX });
  }, [look]);
  
  // Continuous thrust animation
  const updateThrust = useCallback(() => {
    if (!isThrusting.current) return;
    
    const speed = screenToThrustSpeed(currentTouchRef.current.y);
    // Always thrust forward (Z-axis), speed controlled by Y position
    const thrustVector = { x: 0, y: 0, z: speed };
    move(thrustVector);
    
    thrustAnimationRef.current = requestAnimationFrame(updateThrust);
  }, [move, screenToThrustSpeed]);
  
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isMobile) return;
    
    const target = e.target as Element;
    if (target.closest('[data-ui]')) return; // Skip UI elements
    
    // Hide instructions on first touch
    if (showInstructions) {
      setShowInstructions(false);
    }
    
    const currentTime = performance.now();
    const timeSinceLastTouch = currentTime - lastTouchTime.current;
    lastTouchTime.current = currentTime;
    
    touchStartRef.current = { x: e.clientX, y: e.clientY, time: currentTime };
    currentTouchRef.current = { x: e.clientX, y: e.clientY };
    
    // Check for double tap (within 300ms)
    if (timeSinceLastTouch < 300) {
      // Double tap: immediate forward thrust burst
      const speed = screenToThrustSpeed(e.clientY);
      const thrustVector = { x: 0, y: 0, z: speed };
      move(thrustVector);
      return;
    }
    
    // Single touch: start hold detection
    e.currentTarget.setPointerCapture(e.pointerId);
    
    // Start hold timer for thrust activation (100ms hold)
    setTimeout(() => {
      // Check if still touching in same general area
      const distanceMoved = Math.sqrt(
        Math.pow(currentTouchRef.current.x - touchStartRef.current.x, 2) +
        Math.pow(currentTouchRef.current.y - touchStartRef.current.y, 2)
      );
      
      if (distanceMoved < 30) { // Small movement tolerance
        // Activate thrust mode
        isThrusting.current = true;
        setDragging(true);
        
        updateThrust();
      } else {
        // Large movement = look mode
        isDraggingLook.current = true;
        setDragging(true);
      }
    }, 100);
  };
  
  const handlePointerMove = (e: React.PointerEvent) => {
    currentTouchRef.current = { x: e.clientX, y: e.clientY };
    
    if (isThrusting.current) {
      // Update thrust direction while holding
      // Thrust direction updates happen in updateThrust() animation loop
    } else if (isDraggingLook.current) {
      // Handle look movement
      handleLookMove(e.clientX, e.clientY);
    }
  };
  
  const handlePointerUp = () => {
    // Stop all touch interactions
    isThrusting.current = false;
    isDraggingLook.current = false;
    setDragging(false);
    
    // Stop thrust animation
    if (thrustAnimationRef.current) {
      cancelAnimationFrame(thrustAnimationRef.current);
      thrustAnimationRef.current = undefined;
    }
    
    // Stop movement
    move({ x: 0, y: 0, z: 0 });
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (thrustAnimationRef.current) {
        cancelAnimationFrame(thrustAnimationRef.current);
      }
    };
  }, []);
  
  // UI guard to prevent controls when clicking UI
  const handlePointerDownCapture = (e: React.PointerEvent) => {
    const target = e.target as Element;
    if (target.closest('[data-ui]')) {
      e.stopPropagation();
    }
  };
  
  if (!isMobile) {
    return <>{children}</>;
  }
  
  return (
    <div 
      ref={canvasRef}
      className="relative w-full h-full"
      style={{ touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerDownCapture={handlePointerDownCapture}
    >
      {children}
      
      {/* Visual feedback overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: config.zIndex.hud - 10 }}>
        {/* Touch instruction overlay - hides on first touch */}
        {showInstructions && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className={`${config.panel.bg} ${config.panel.border} ${config.panel.radius} px-4 py-2 ${config.text.label} opacity-70 transition-opacity duration-300`}>
              <div className="text-center text-sm">
                <div>Touch & hold to thrust forward</div>
                <div className="text-xs mt-1">Y position controls speed • Drag to rotate ship</div>
              </div>
            </div>
          </div>
        )}
        
        {/* Center crosshair for reference */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border border-white/30 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}