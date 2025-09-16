import { useState, useRef, useCallback, useEffect } from 'react';
import { useInput } from '../../stores/useInput';
import { useMobileLayout } from '../../stores/useMobileLayout';

interface VirtualJoystickProps {
  className?: string;
}

export function VirtualJoystick({ className = '' }: VirtualJoystickProps) {
  const { move, isMobile } = useInput();
  const { config } = useMobileLayout();
  
  const [knobPosition, setKnobPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const joystickRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const smoothedThrustRef = useRef({ x: 0, y: 0, z: 0 });

  if (!isMobile) return null;

  const JOYSTICK_RADIUS = 40; // Reduced for cleaner UI
  const DEAD_ZONE = 0.15;

  const updateThrustFromPosition = useCallback((x: number, y: number) => {
    const distance = Math.sqrt(x * x + y * y);
    const normalizedDistance = Math.min(distance / JOYSTICK_RADIUS, 1);
    
    if (normalizedDistance < DEAD_ZONE) {
      smoothedThrustRef.current = { x: 0, y: 0, z: 0 };
      move({ x: 0, y: 0, z: 0 });
      return;
    }

    const normalizedX = (x / JOYSTICK_RADIUS) * normalizedDistance;
    const normalizedY = (y / JOYSTICK_RADIUS) * normalizedDistance;
    
    // Smooth interpolation
    const smoothingFactor = 0.8;
    const targetThrust = { 
      x: normalizedX, 
      y: 0, 
      z: -normalizedY 
    };
    
    smoothedThrustRef.current.x = smoothedThrustRef.current.x * smoothingFactor + targetThrust.x * (1 - smoothingFactor);
    smoothedThrustRef.current.z = smoothedThrustRef.current.z * smoothingFactor + targetThrust.z * (1 - smoothingFactor);
    
    move(smoothedThrustRef.current);
  }, [move]);

  const handleStart = useCallback((clientX: number, clientY: number) => {
    if (!joystickRef.current) return;
    
    setIsDragging(true);
    
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const x = clientX - centerX;
    const y = clientY - centerY;
    
    const distance = Math.sqrt(x * x + y * y);
    const constrainedX = distance > JOYSTICK_RADIUS ? (x / distance) * JOYSTICK_RADIUS : x;
    const constrainedY = distance > JOYSTICK_RADIUS ? (y / distance) * JOYSTICK_RADIUS : y;
    
    setKnobPosition({ x: constrainedX, y: constrainedY });
    updateThrustFromPosition(constrainedX, constrainedY);
  }, [updateThrustFromPosition]);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging || !joystickRef.current) return;
    
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const x = clientX - centerX;
    const y = clientY - centerY;
    
    const distance = Math.sqrt(x * x + y * y);
    const constrainedX = distance > JOYSTICK_RADIUS ? (x / distance) * JOYSTICK_RADIUS : x;
    const constrainedY = distance > JOYSTICK_RADIUS ? (y / distance) * JOYSTICK_RADIUS : y;
    
    setKnobPosition({ x: constrainedX, y: constrainedY });
    updateThrustFromPosition(constrainedX, constrainedY);
  }, [isDragging, updateThrustFromPosition]);

  const handleEnd = useCallback(() => {
    setIsDragging(false);
    
    const animateReturn = () => {
      setKnobPosition(prev => {
        const newX = prev.x * 0.8;
        const newY = prev.y * 0.8;
        
        if (Math.abs(newX) < 1 && Math.abs(newY) < 1) {
          smoothedThrustRef.current = { x: 0, y: 0, z: 0 };
          move({ x: 0, y: 0, z: 0 });
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
  }, [move, updateThrustFromPosition]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    handleStart(e.clientX, e.clientY);
  };

  const handlePointerMove = useCallback((e: PointerEvent) => {
    handleMove(e.clientX, e.clientY);
  }, [handleMove]);

  const handlePointerUp = useCallback((e: PointerEvent) => {
    handleEnd();
  }, [handleEnd]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('pointerup', handlePointerUp);
      return () => {
        document.removeEventListener('pointermove', handlePointerMove);
        document.removeEventListener('pointerup', handlePointerUp);
      };
    }
  }, [isDragging, handlePointerMove, handlePointerUp]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div className={`flex flex-col items-center space-y-2 ${className}`} data-ui>
      {/* Virtual Joystick */}
      <div 
        ref={joystickRef}
        className={`relative w-20 h-20 ${config.panel.bg} ${config.panel.border} rounded-full ${config.panel.backdrop} transition-all duration-200 ${
          isDragging ? 'bg-slate-700/90 border-cyan-500' : ''
        }`}
        onPointerDown={handlePointerDown}
        style={{ touchAction: 'none' }}
      >
        {/* Base Ring */}
        <div className="absolute inset-2 border border-slate-500/30 rounded-full" />
        
        {/* Draggable Knob */}
        <div 
          className={`absolute w-5 h-5 rounded-full transition-all duration-100 ${
            isDragging 
              ? 'bg-cyan-400 shadow-lg shadow-cyan-400/50' 
              : 'bg-slate-500'
          }`}
          style={{
            left: `calc(50% + ${knobPosition.x}px - 10px)`,
            top: `calc(50% + ${knobPosition.y}px - 10px)`,
            transform: isDragging ? 'scale(1.2)' : 'scale(1)',
          }}
        />
        
        {/* Center Dot */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-slate-400 rounded-full opacity-50" />
      </div>

      {/* Label */}
      <div className={config.text.label}>
        {isDragging ? "🚀" : "🎮"}
      </div>
    </div>
  );
}