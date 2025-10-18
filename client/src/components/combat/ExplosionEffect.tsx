import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface ExplosionEffectProps {
  position: THREE.Vector3;
  scale?: number;
  duration?: number;
  color?: string;
}

export function ExplosionEffect({ 
  position, 
  scale = 1, 
  duration = 0.5,
  color = "#ffff00" 
}: ExplosionEffectProps) {
  const sphereRef = useRef<THREE.Mesh>(null);
  const startTime = useRef(Date.now() / 1000);
  
  useFrame((state) => {
    if (!sphereRef.current) return;
    
    const elapsed = state.clock.elapsedTime - startTime.current;
    const progress = Math.min(elapsed / duration, 1);
    
    // Simple expanding sphere
    const sphereScale = scale * (1 + progress * 2);
    sphereRef.current.scale.setScalar(sphereScale);
    
    // Fade out
    const material = sphereRef.current.material as THREE.MeshBasicMaterial;
    material.opacity = Math.max(0, 1 - progress);
    
    // Remove after duration
    if (progress >= 1) {
      sphereRef.current.visible = false;
    }
  });
  
  return (
    <mesh ref={sphereRef} position={position}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={1}
      />
    </mesh>
  );
}