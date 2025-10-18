import { useRef, useCallback, useEffect } from 'react';
import { useInput } from '../../stores/useInput';

interface CanvasLookControlsProps {
  children: React.ReactNode;
}

export function CanvasLookControls({ children }: CanvasLookControlsProps) {
  const { look, isGyroEnabled, isMobile, setDragging } = useInput();
  const canvasRef = useRef<HTMLDivElement>(null);
  const lastTouchRef = useRef({ x: 0, y: 0 });
  const smoothedLookRef = useRef({ x: 0, y: 0 });
  const lookAnimationRef = useRef<number>();
  const isDraggingRef = useRef(false);

  const handleLookMove = useCallback((clientX: number, clientY: number) => {
    if (!isDraggingRef.current) return;
    
    const deltaX = (clientX - lastTouchRef.current.x) * 0.002;
    const deltaY = (clientY - lastTouchRef.current.y) * 0.002;
    
    // Always update position to prevent coordinate accumulation
    lastTouchRef.current = { x: clientX, y: clientY };
    
    // Dead zone for tiny movements
    if (Math.abs(deltaX) < 0.002 && Math.abs(deltaY) < 0.002) {
      look({ x: 0, y: 0 });
      return;
    }
    
    // Smooth interpolation - Fix orientation to be intuitive
    const smoothingFactor = 0.7;
    // Drag up = look up (positive pitch), Drag down = look down (negative pitch)
    smoothedLookRef.current.x = smoothedLookRef.current.x * smoothingFactor + deltaY * (1 - smoothingFactor);
    // Drag right = look right (positive yaw), Drag left = look left (negative yaw)  
    smoothedLookRef.current.y = smoothedLookRef.current.y * smoothingFactor + deltaX * (1 - smoothingFactor);
    
    look(smoothedLookRef.current);
  }, [look]);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only handle if gyro is disabled and this is not a UI element
    if (isGyroEnabled || !isMobile) return;
    
    const target = e.target as Element;
    if (target.closest('[data-ui]')) return; // Skip if clicking on UI
    
    isDraggingRef.current = true;
    setDragging(true);
    lastTouchRef.current = { x: e.clientX, y: e.clientY };
    
    // Cancel any active look animation
    if (lookAnimationRef.current) {
      cancelAnimationFrame(lookAnimationRef.current);
      lookAnimationRef.current = undefined;
    }
    
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    handleLookMove(e.clientX, e.clientY);
  };

  const handlePointerUp = () => {
    if (!isDraggingRef.current) return;
    
    isDraggingRef.current = false;
    setDragging(false);
    
    // Gradually reduce the smoothed look values to zero
    const dampLook = () => {
      smoothedLookRef.current.x *= 0.9;
      smoothedLookRef.current.y *= 0.9;
      
      if (Math.abs(smoothedLookRef.current.x) > 0.001 || Math.abs(smoothedLookRef.current.y) > 0.001) {
        look(smoothedLookRef.current);
        lookAnimationRef.current = requestAnimationFrame(dampLook);
      } else {
        smoothedLookRef.current = { x: 0, y: 0 };
        look({ x: 0, y: 0 });
      }
    };
    
    if (lookAnimationRef.current) {
      cancelAnimationFrame(lookAnimationRef.current);
    }
    lookAnimationRef.current = requestAnimationFrame(dampLook);
  };

  // No longer needed - using element-level listeners with pointer capture

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (lookAnimationRef.current) {
        cancelAnimationFrame(lookAnimationRef.current);
      }
    };
  }, []);

  // UI guard to prevent look controls when clicking UI
  const handlePointerDownCapture = (e: React.PointerEvent) => {
    const target = e.target as Element;
    if (target.closest('[data-ui]')) {
      e.stopPropagation();
    }
  };

  return (
    <div 
      ref={canvasRef}
      className="relative w-full h-full"
      style={{ touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerDownCapture={handlePointerDownCapture}
    >
      {children}
    </div>
  );
}