import { Html } from "@react-three/drei";
import { useEffect, useState } from "react";
import * as THREE from "three";

interface DamageNumberProps {
  position: THREE.Vector3;
  damage: number;
  onComplete: () => void;
}

export function DamageNumber({ position, damage, onComplete }: DamageNumberProps) {
  const [offset, setOffset] = useState(0);
  const [opacity, setOpacity] = useState(1);
  
  useEffect(() => {
    const startTime = Date.now();
    const duration = 1000; // 1 second animation
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Float upward
      setOffset(progress * 2);
      // Fade out
      setOpacity(1 - progress);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        onComplete();
      }
    };
    
    animate();
  }, [onComplete]);
  
  return (
    <Html
      position={[position.x, position.y + offset, position.z]}
      center
      distanceFactor={10}
      style={{
        pointerEvents: 'none',
        userSelect: 'none',
        opacity
      }}
    >
      <div 
        className="text-2xl font-bold text-yellow-400"
        style={{
          textShadow: '0 0 6px rgba(255, 200, 0, 0.8), 2px 2px 3px rgba(0,0,0,0.9)',
          transform: `scale(${1 + offset * 0.2})`
        }}
      >
        -{damage}
      </div>
    </Html>
  );
}